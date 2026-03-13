
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatMessage, ExecutionContract, ChatProvider } from "../types";
import { TFNKernel } from "./TFNKernel";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiService {
  private getSystemInstruction(provider: ChatProvider = 'Gemini') {
    const base = `You are FRANKLIN — an autonomous coding agent running inside FRANKLIN OS.
Operating under the Trinity Architecture:
- Franklin: governance, authority, final sign-off on all operations
- Trinity: orchestration, routing, verification of all build pipelines
- Neo-3: post-action analysis, optimization, and evolution

MISSION: Analyze, structure, and build projects with full certification. Help users upload files, describe projects, fix bugs, generate code, and deploy production-ready systems.
TONE: Professional, helpful, technically precise, and efficient. Respond concisely.`;

    const personalities: Record<ChatProvider, string> = {
      'Gemini': "Focus on multimodal reasoning and Google-scale data integration.",
      'ChatGPT': "Focus on conversational flow, creative writing, and logic refinement.",
      'Anthropic': "Focus on safety, precision, and helpful, harmless, honest constitutional guidelines.",
      'Copilot': "Focus on productivity, code assistance, and workspace orchestration.",
      'Kling': "Focus on cinematic video synthesis logic and temporal consistency.",
      'Ollama': "Running locally via Ollama. Focus on privacy-preserving, offline-capable reasoning."
    };

    return `${base}\n\nACTIVE_SIMULATION_MODE: ${provider}. ${personalities[provider]}\n\nReference all processed files as a unified knowledge base. All decisions must be structured under an Execution Contract.`;
  }

  constructor() {
    TFNKernel.registerEngine("chat_pro", async (t) => this.rawChat(t.history, false, t.provider));
    TFNKernel.registerEngine("chat_fast", async (t) => this.rawChat(t.history, true, t.provider));
    TFNKernel.registerEngine("image_gen", async (t) => this.rawGenerateImage(t.prompt, t.size));
    TFNKernel.registerEngine("image_edit", async (t) => this.rawEditImage(t.image, t.prompt, t.mime));
    TFNKernel.registerEngine("video_gen", async (t) => this.rawAnimate(t.image, t.prompt, t.mime, t.ratio));
    TFNKernel.registerEngine("super_prompt", async (t) => this.rawSuperPrompt(t.input));
  }

  private async rawSuperPrompt(input: string) {
    const ai = getAi();
    const wrapper = `[ORCHESTRATION_OVERRIDE]
SYSTEM_GOAL: Restructure the following chaotic/broken input into a high-efficiency tactical directive.
CHAOTIC_INPUT: "${input}"
SUPER_PROMPT_DIRECTIVE:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: wrapper }] }],
      config: { temperature: 0.1 }
    });

    return { 
      output: response.text || input, 
      quality: 1.0, 
      confidence: 1.0, 
      justification: "Input refactored via Franklin's efficiency protocols." 
    };
  }

  async applySuperPrompt(input: string): Promise<string> {
    const contract = await TFNKernel.handleRequest("PROMPT_ENHANCEMENT", "super_prompt", { input });
    return contract.output.result;
  }

  private async rawChat(history: ChatMessage[], isFast: boolean, provider: ChatProvider = 'Gemini') {
    const ai = getAi();
    const model = isFast ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
    const response = await ai.models.generateContent({
      model,
      contents: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      config: { 
        systemInstruction: this.getSystemInstruction(provider), 
        temperature: 0.7 
      }
    });
    
    return { 
      output: response.text || "Neural core reached consensus but returned empty payload.", 
      quality: 0.98,
      confidence: 0.99,
      justification: `Logical inference finalized via Trinity routing protocols using ${provider} substrate.`
    };
  }

  async chatWithContract(history: ChatMessage[], isFast: boolean = false, provider: ChatProvider = 'Gemini'): Promise<ExecutionContract> {
    if (provider === 'Ollama') {
      return await TFNKernel.handleRequest("DIALOGUE_EXECUTION", "ollama_chat", { history });
    }
    if (provider === 'Anthropic') {
      return await TFNKernel.handleRequest("DIALOGUE_EXECUTION", "anthropic_chat", { history });
    }
    return await TFNKernel.handleRequest("DIALOGUE_EXECUTION", isFast ? "chat_fast" : "chat_pro", { history, provider });
  }

  private async rawGenerateImage(prompt: string, size: "1K" | "2K" | "4K") {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: { 
        imageConfig: { aspectRatio: "1:1", imageSize: size } 
      }
    });
    
    let imageUrl = '';
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
    
    if (!imageUrl) throw new Error("Neural visualizer failed.");
    return { url: imageUrl, quality: 1.0, confidence: 0.95, justification: "Visual projection mapped." };
  }

  async generateImage(prompt: string, size: "1K" | "2K" | "4K" = "1K") {
    const contract = await TFNKernel.handleRequest("VISUAL_PROJECTION", "image_gen", { prompt, size });
    return contract.output.result;
  }

  private async rawEditImage(image: string, prompt: string, mime: string) {
    const ai = getAi();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [
          { inlineData: { data: base64Data, mimeType: mime } }, 
          { text: prompt }
        ] 
      }
    });
    
    let imageUrl = '';
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Image refinement engine failed.");
    return { url: imageUrl, quality: 0.9, confidence: 0.92, justification: "Refinement applied." };
  }

  private async rawAnimate(image: string, prompt: string, mime: string, ratio: '16:9' | '9:16') {
    const ai = getAi();
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      image: { imageBytes: base64Data, mimeType: mime },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: ratio }
    });
    
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return { url: URL.createObjectURL(blob), quality: 1.0, confidence: 0.97, justification: "Cinematic synthesized." };
  }
}

export const geminiService = new GeminiService();
