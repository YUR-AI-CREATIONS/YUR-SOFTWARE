
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, WebSearchResult, WebPage, BrowseSession } from "../types";
import { TFNKernel } from "./TFNKernel";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
const CORS_PROXY = "https://api.allorigins.win/get?url=";
const BACKEND_PROXY = "/api/web-proxy";

/** Parse /browse slash commands */
export function parseBrowseCommand(input: string): { command: string; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/browse')) return null;
  const rest = trimmed.slice(7).trim();
  if (!rest || rest === 'help') return { command: 'help', args: '' };
  if (rest === 'session') return { command: 'session', args: '' };
  return { command: 'browse', args: rest };
}

let sessionCounter = 0;

class WebAgentService {
  private session: BrowseSession | null = null;
  private onMessage: ((msg: ChatMessage) => void) | null = null;
  private onSessionUpdate: ((session: BrowseSession) => void) | null = null;

  constructor() {
    TFNKernel.registerEngine("web_search", async (t) => this.rawSearch(t));
    TFNKernel.registerEngine("web_fetch", async (t) => this.rawFetch(t));
    TFNKernel.registerEngine("web_analyze", async (t) => this.rawAnalyze(t));
  }

  setMessageCallback(cb: ((msg: ChatMessage) => void) | null) {
    this.onMessage = cb;
  }

  setSessionCallback(cb: ((session: BrowseSession) => void) | null) {
    this.onSessionUpdate = cb;
  }

  getSession(): BrowseSession | null {
    return this.session;
  }

  private emit(content: string, type: string = 'status') {
    if (this.onMessage) {
      this.onMessage({
        role: 'model',
        content,
        timestamp: new Date(),
        agentMeta: { taskId: this.session?.id || '', type: type as any },
      });
    }
  }

  private updateSession(updates: Partial<BrowseSession>) {
    if (this.session) {
      Object.assign(this.session, updates);
      if (this.onSessionUpdate) {
        this.onSessionUpdate({ ...this.session });
      }
    }
  }

  /** Main autonomous browsing loop */
  async browse(goal: string) {
    this.session = {
      id: `browse_${Date.now()}_${++sessionCounter}`,
      goal,
      currentUrl: null,
      pages: [],
      searchResults: [],
      status: 'idle',
      summary: undefined,
    };

    // Notify browser tab
    window.dispatchEvent(new CustomEvent('tfn:browse-started'));

    TFNKernel.audit({ layer: 'kernel', action: 'WEB_BROWSE_START', intent: goal });
    this.emit(`🌐 Web Agent started: "${goal}"\nGenerating search queries...`, 'step_start');

    try {
      // Step 1: Ask AI to generate search queries
      const ai = getAi();
      const queryResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Generate 2-3 concise web search queries for this goal. Return ONLY a JSON array of strings, no markdown.\n\nGoal: ${goal}` }] }],
        config: { temperature: 0.3 },
      });

      let queries: string[];
      try {
        const text = queryResponse.text || '[]';
        queries = this.parseJsonArray(text);
      } catch {
        queries = [goal]; // Fallback: use the goal itself
      }

      this.emit(`🔍 Searching: ${queries.join(' | ')}`, 'step_start');
      this.updateSession({ status: 'searching' });

      // Step 2: Search for each query
      let allResults: WebSearchResult[] = [];
      for (const query of queries.slice(0, 3)) {
        try {
          const contract = await TFNKernel.handleRequest('WEB_SEARCH', 'web_search', { query });
          const results = contract.output.result as WebSearchResult[];
          allResults = [...allResults, ...results];
        } catch (err: any) {
          this.emit(`⚠️ Search failed for "${query}": ${err.message}`, 'step_failed');
        }
      }

      // Deduplicate results by URL
      const seen = new Set<string>();
      allResults = allResults.filter(r => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

      this.updateSession({ searchResults: allResults });
      this.emit(`📋 Found ${allResults.length} results. AI selecting best pages to visit...`, 'step_start');

      if (allResults.length === 0) {
        this.updateSession({ status: 'error' });
        this.emit(`❌ No search results found. Try rephrasing your goal.`, 'task_failed');
        return;
      }

      // Step 3: Ask AI which results to visit
      const resultList = allResults.slice(0, 10).map((r, i) => `${i + 1}. ${r.title} - ${r.url}\n   ${r.snippet}`).join('\n');
      const pickResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `Given these search results, pick the 2-3 most relevant for the goal: "${goal}"\n\nResults:\n${resultList}\n\nReturn ONLY a JSON array of numbers (1-indexed). Example: [1, 3, 5]` }] }],
        config: { temperature: 0.2 },
      });

      let picks: number[];
      try {
        picks = this.parseJsonArray(pickResponse.text || '[]') as number[];
      } catch {
        picks = [1, 2]; // Fallback: first two results
      }

      const selectedResults = picks
        .map(i => allResults[i - 1])
        .filter(Boolean)
        .slice(0, 3);

      // Step 4: Fetch and analyze each selected page
      this.updateSession({ status: 'fetching' });
      const pageAnalyses: string[] = [];

      for (let i = 0; i < selectedResults.length; i++) {
        const result = selectedResults[i];
        this.emit(`📄 Fetching (${i + 1}/${selectedResults.length}): ${result.title}`, 'step_start');
        this.updateSession({ currentUrl: result.url });

        try {
          const fetchContract = await TFNKernel.handleRequest('WEB_FETCH', 'web_fetch', { url: result.url });
          const page = fetchContract.output.result as WebPage;
          this.updateSession({ pages: [...(this.session?.pages || []), page] });

          // Step 5: Analyze the page
          this.updateSession({ status: 'analyzing' });
          this.emit(`🧠 Analyzing: ${result.title}...`, 'step_start');

          const analyzeContract = await TFNKernel.handleRequest('WEB_ANALYZE', 'web_analyze', {
            content: page.content,
            task: goal,
            url: result.url,
            title: result.title,
          });

          const analysis = analyzeContract.output.result as string;
          pageAnalyses.push(`[${result.title}](${result.url}):\n${analysis}`);

          this.emit(`✅ Analyzed: ${result.title}`, 'step_complete');

          // Small delay between fetches
          await new Promise(r => setTimeout(r, 1000));
        } catch (err: any) {
          this.emit(`⚠️ Failed to fetch ${result.url}: ${err.message}`, 'step_failed');
        }
      }

      // Step 6: Generate final summary
      this.emit(`📝 Generating summary...`, 'step_start');
      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: `You browsed the web for: "${goal}"\n\nHere are the analyses from ${pageAnalyses.length} pages:\n\n${pageAnalyses.join('\n\n---\n\n')}\n\nProvide a comprehensive, well-organized summary that answers the original goal. Include key findings, recommendations, and source attributions.` }] }],
        config: { temperature: 0.4 },
      });

      const summary = summaryResponse.text || 'Unable to generate summary.';
      this.updateSession({ status: 'complete', summary });

      TFNKernel.audit({ layer: 'evolution', action: 'WEB_BROWSE_COMPLETE', intent: goal });
      this.emit(`🎯 Web Agent Complete: "${goal}"\n\n${summary}`, 'task_complete');

    } catch (err: any) {
      this.updateSession({ status: 'error' });
      TFNKernel.audit({ layer: 'kernel', action: 'WEB_BROWSE_ERROR', intent: err.message });
      this.emit(`❌ Web Agent error: ${err.message}`, 'task_failed');
    }
  }

  /** Navigate to a specific URL */
  async fetchPage(url: string): Promise<WebPage | null> {
    try {
      const contract = await TFNKernel.handleRequest('WEB_FETCH', 'web_fetch', { url });
      const page = contract.output.result as WebPage;
      if (this.session) {
        this.updateSession({
          currentUrl: url,
          pages: [...(this.session.pages || []), page],
        });
      }
      return page;
    } catch {
      return null;
    }
  }

  getSessionSummary(): string {
    if (!this.session) return 'No active browse session.';
    const s = this.session;
    return `🌐 Browse Session: "${s.goal}"\nStatus: ${s.status.toUpperCase()}\nPages visited: ${s.pages.length}\nSearch results: ${s.searchResults.length}${s.currentUrl ? `\nCurrent URL: ${s.currentUrl}` : ''}`;
  }

  // === Engine Handlers ===

  private async rawSearch(data: { query: string }) {
    let html = '';

    // Try backend proxy first, fall back to CORS proxy
    try {
      const res = await fetch(`${BACKEND_PROXY}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: data.query }),
      });
      if (res.ok) {
        const json = await res.json();
        html = json.contents || '';
      } else {
        throw new Error(`Backend proxy error: ${res.status}`);
      }
    } catch {
      // Fallback to CORS proxy
      const encodedUrl = encodeURIComponent(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(data.query)}`);
      const res = await fetch(`${CORS_PROXY}${encodedUrl}`);
      if (!res.ok) throw new Error(`Search proxy error: ${res.status}`);
      const json = await res.json();
      html = json.contents || '';
    }

    // Parse DuckDuckGo HTML results
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const results: WebSearchResult[] = [];

    const resultElements = doc.querySelectorAll('.result');
    resultElements.forEach((el) => {
      const titleEl = el.querySelector('.result__title a, .result__a');
      const snippetEl = el.querySelector('.result__snippet');

      if (titleEl) {
        let url = titleEl.getAttribute('href') || '';
        // DuckDuckGo wraps URLs in redirect links
        if (url.includes('uddg=')) {
          try {
            const match = url.match(/uddg=([^&]+)/);
            if (match) url = decodeURIComponent(match[1]);
          } catch {}
        }

        results.push({
          title: (titleEl.textContent || '').trim(),
          url: url,
          snippet: (snippetEl?.textContent || '').trim(),
        });
      }
    });

    return {
      output: results.slice(0, 10),
      quality: 0.85,
      confidence: 0.80,
      justification: `Web search returned ${results.length} results.`,
    };
  }

  private async rawFetch(data: { url: string }) {
    let rawHtml = '';

    // Try backend proxy first, fall back to CORS proxy
    try {
      const res = await fetch(`${BACKEND_PROXY}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url }),
      });
      if (res.ok) {
        const json = await res.json();
        rawHtml = json.contents || '';
      } else {
        throw new Error(`Backend proxy error: ${res.status}`);
      }
    } catch {
      // Fallback to CORS proxy
      const encodedUrl = encodeURIComponent(data.url);
      const res = await fetch(`${CORS_PROXY}${encodedUrl}`);
      if (!res.ok) throw new Error(`Fetch proxy error: ${res.status}`);
      const json = await res.json();
      rawHtml = json.contents || '';
    }

    // Extract text content from HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove scripts, styles, nav, footer
    doc.querySelectorAll('script, style, nav, footer, header, aside, .sidebar, .ad, .advertisement, [role="navigation"]')
      .forEach(el => el.remove());

    // Extract text, preserving some structure
    const extractText = (node: Element): string => {
      const blocks: string[] = [];
      const headings = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(h => {
        const level = parseInt(h.tagName[1]);
        blocks.push(`${'#'.repeat(level)} ${(h.textContent || '').trim()}`);
      });

      // Get main content
      const main = node.querySelector('main, article, .content, #content, .post, .entry') || node.querySelector('body') || node;
      const text = (main.textContent || '').replace(/\s+/g, ' ').trim();
      return text;
    };

    let content = extractText(doc);
    // Truncate to 15000 chars
    if (content.length > 15000) {
      content = content.substring(0, 15000) + '\n...[truncated]';
    }

    const title = doc.querySelector('title')?.textContent?.trim() || data.url;

    const page: WebPage = {
      url: data.url,
      title,
      content,
      rawHtml: rawHtml.substring(0, 50000), // Keep first 50K of HTML for iframe
      fetchedAt: Date.now(),
    };

    return {
      output: page,
      quality: 0.90,
      confidence: 0.85,
      justification: `Fetched ${content.length} chars from ${data.url}`,
    };
  }

  private async rawAnalyze(data: { content: string; task: string; url: string; title: string }) {
    const ai = getAi();

    const prompt = `Analyze this web page for the following goal: "${data.task}"

Page: ${data.title} (${data.url})

Content:
${data.content.substring(0, 12000)}

Provide a concise analysis focusing on:
1. Key information relevant to the goal
2. Important facts, data points, or recommendations
3. Whether this page adequately addresses the goal

Be specific and cite concrete details from the page.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.3 },
    });

    return {
      output: response.text || 'Analysis returned empty.',
      quality: 0.92,
      confidence: 0.88,
      justification: 'Page analyzed by Franklin web intelligence.',
    };
  }

  /** Parse JSON array from text that may contain markdown */
  private parseJsonArray(text: string): any[] {
    try {
      return JSON.parse(text);
    } catch {}

    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      try { return JSON.parse(fenceMatch[1]); } catch {}
    }

    const bracketMatch = text.match(/\[[\s\S]*?\]/);
    if (bracketMatch) {
      try { return JSON.parse(bracketMatch[0]); } catch {}
    }

    return [];
  }
}

export const webAgentService = new WebAgentService();
