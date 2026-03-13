
import { ChatMessage } from "../types";
import { TFNKernel } from "./TFNKernel";

const ANTHROPIC_PROXY = "/anthropic-api";

class AnthropicService {
  private model = "claude-sonnet-4-20250514";
  private isOnline = false;

  constructor() {
    TFNKernel.registerEngine("anthropic_chat", async (t) => this.rawChat(t.history));
    this.checkAvailability().catch(() => {});
  }

  async checkAvailability(): Promise<boolean> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key || key === 'undefined') {
      this.isOnline = false;
      return false;
    }
    this.isOnline = true;
    TFNKernel.audit({ layer: 'kernel', action: 'ANTHROPIC_READY' });
    return true;
  }

  getStatus() {
    return { online: this.isOnline, model: this.model };
  }

  setModel(model: string) {
    this.model = model;
  }

  private async rawChat(history: ChatMessage[]) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("ANTHROPIC_API_KEY not configured in .env.local");
    }

    // Convert messages: Anthropic uses 'assistant' instead of 'model'
    const messages = history.map(m => ({
      role: m.role === 'model' ? 'assistant' as const : 'user' as const,
      content: m.content,
    }));

    const systemPrompt = `You are FRANKLIN — an autonomous coding agent running inside FRANKLIN OS, powered by Claude (${this.model}).
Operating under the Trinity Architecture:
- Franklin: governance, authority, final sign-off
- Trinity: orchestration, routing, verification
- Neo-3: post-action analysis, optimization, evolution

MISSION: Analyze, structure, and build projects with full certification.
Focus on safety, precision, and helpful, harmless, honest constitutional guidelines.
Be concise and technically precise.`;

    const res = await fetch(`${ANTHROPIC_PROXY}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic error (${res.status}): ${errText}`);
    }

    const data = await res.json();

    // Extract text from content blocks
    let content = '';
    if (data.content && Array.isArray(data.content)) {
      content = data.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n');
    }

    if (!content) content = 'Claude returned an empty response.';

    return {
      output: content,
      quality: 0.99,
      confidence: 0.98,
      justification: `Inference via Anthropic Claude (${this.model}).`,
    };
  }
}

export const anthropicService = new AnthropicService();
