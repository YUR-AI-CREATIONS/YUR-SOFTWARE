
import { ChatMessage } from "../types";
import { TFNKernel } from "./TFNKernel";

const OLLAMA_BASE = "http://localhost:11434";

class OllamaService {
  private availableModels: string[] = [];
  private defaultModel = "llama3.2:1b";
  private isOnline = false;

  constructor() {
    TFNKernel.registerEngine("ollama_chat", async (t) => this.rawChat(t.history, t.model));
    // Check availability on startup
    this.checkAvailability().catch(() => {});
  }

  /** Check if Ollama is running and get available models */
  async checkAvailability(): Promise<{ online: boolean; models: string[] }> {
    try {
      const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error("Not reachable");
      const data = await res.json();
      this.availableModels = (data.models || []).map((m: any) => m.name);
      this.isOnline = true;
      if (this.availableModels.length > 0 && !this.availableModels.includes(this.defaultModel)) {
        this.defaultModel = this.availableModels[0];
      }
      TFNKernel.audit({ layer: 'kernel', action: `OLLAMA_ONLINE: ${this.availableModels.length} models` });
      return { online: true, models: this.availableModels };
    } catch {
      this.isOnline = false;
      this.availableModels = [];
      return { online: false, models: [] };
    }
  }

  getStatus() {
    return { online: this.isOnline, models: this.availableModels, defaultModel: this.defaultModel };
  }

  setModel(model: string) {
    this.defaultModel = model;
  }

  private async rawChat(history: ChatMessage[], model?: string) {
    const targetModel = model || this.defaultModel;

    // Convert messages: Ollama uses 'assistant' instead of 'model'
    const messages = [
      {
        role: 'system',
        content: `You are FRANKLIN — an autonomous coding agent running inside FRANKLIN OS via Ollama (${targetModel}).
Operating locally for maximum privacy and speed.
MISSION: Analyze, structure, and build projects with full certification. Be concise and technically precise.`
      },
      ...history.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
      })),
    ];

    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Ollama error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.message?.content || 'Ollama returned an empty response.';

    return {
      output: content,
      quality: 0.95,
      confidence: 0.90,
      justification: `Local inference via Ollama (${targetModel}).`,
    };
  }
}

export const ollamaService = new OllamaService();
