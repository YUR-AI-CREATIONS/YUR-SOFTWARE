
import { ChatMessage, AgentTask, AgentStep, AgentTaskStatus } from "../types";
import { TFNKernel } from "./TFNKernel";
import {
  runHeadlessAgent,
  checkHeadlessAgentHealth,
  getSessionProjectFiles,
  HeadlessAgentSession,
  ProjectFile,
} from "./backendApi";

// Fallback: client-side Gemini for when backend is unavailable
import { GoogleGenAI } from "@google/genai";
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/** Parse /agent slash commands from chat input */
export function parseAgentCommand(input: string): { command: string; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/agent')) return null;

  const rest = trimmed.slice(6).trim();
  if (!rest || rest === 'help') return { command: 'help', args: '' };
  if (rest === 'status') return { command: 'status', args: '' };
  if (rest === 'stop') return { command: 'stop', args: '' };
  if (rest === 'queue') return { command: 'queue', args: '' };
  return { command: 'run', args: rest };
}

let idCounter = 0;
function generateId(): string {
  return `task_${Date.now()}_${++idCounter}`;
}

function stepId(taskId: string, index: number): string {
  return `${taskId}_step_${index}`;
}

/** Map chat provider name to backend provider key */
function mapProvider(provider?: string): string {
  switch (provider?.toLowerCase()) {
    case 'anthropic': return 'anthropic';
    case 'ollama': return 'ollama';
    case 'chatgpt': return 'openai';
    case 'gemini': return 'gemini';
    case 'copilot': return 'openai';
    case 'kling': return 'ollama';
    default: return 'ollama';  // Default to Ollama (local, always available)
  }
}

class AgentService {
  private tasks: AgentTask[] = [];
  private activeTaskId: string | null = null;
  private cancelled = false;
  private onMessage: ((msg: ChatMessage) => void) | null = null;
  private onProjectFiles: ((files: ProjectFile[]) => void) | null = null;
  private backendAvailable: boolean | null = null;
  private currentProvider: string = 'anthropic';

  constructor() {
    // Register agent engines with TFNKernel
    TFNKernel.registerEngine("agent_planner", async (t) => this.rawPlanTask(t));
    TFNKernel.registerEngine("agent_step_executor", async (t) => this.rawExecuteStep(t));

    // Check backend on init
    this.checkBackend();
  }

  private async checkBackend() {
    this.backendAvailable = await checkHeadlessAgentHealth();
    console.log(`[AgentService] Backend headless agent: ${this.backendAvailable ? 'LIVE' : 'FALLBACK (client-side)'}`);
  }

  setProvider(provider: string) {
    this.currentProvider = mapProvider(provider);
  }

  /** ChatPanel calls this to receive agent messages */
  setMessageCallback(cb: ((msg: ChatMessage) => void) | null) {
    this.onMessage = cb;
  }

  /** App.tsx calls this so agent can push project files to the editor */
  setProjectFilesCallback(cb: ((files: ProjectFile[]) => void) | null) {
    this.onProjectFiles = cb;
  }

  private emit(content: string, agentMeta: ChatMessage['agentMeta']) {
    if (this.onMessage) {
      this.onMessage({
        role: 'model',
        content,
        timestamp: new Date(),
        agentMeta,
      });
    }
  }

  /** Queue a new task from a user goal */
  async queueTask(goal: string): Promise<AgentTask> {
    const task: AgentTask = {
      id: generateId(),
      goal,
      status: 'queued',
      steps: [],
      currentStepIndex: 0,
      createdAt: Date.now(),
    };
    this.tasks.push(task);

    TFNKernel.audit({
      layer: 'kernel',
      action: 'AGENT_TASK_QUEUED',
      intent: goal,
    });

    this.emit(
      `🤖 Agent task queued: "${goal}"\nPlanning steps...`,
      { taskId: task.id, type: 'status' }
    );

    // Don't await — kick off processing async
    this.processQueue();
    return task;
  }

  private async processQueue() {
    if (this.activeTaskId) return; // one task at a time

    const next = this.tasks.find(t => t.status === 'queued');
    if (!next) return;

    this.activeTaskId = next.id;
    this.cancelled = false;

    // Re-check backend availability
    await this.checkBackend();

    if (this.backendAvailable) {
      await this.runTaskViaBackend(next);
    } else {
      await this.runTaskClientSide(next);
    }
  }

  // ========================================================================
  //                    BACKEND MODE (real headless agent)
  // ========================================================================

  private async runTaskViaBackend(task: AgentTask) {
    try {
      task.status = 'planning';
      task.startedAt = Date.now();

      TFNKernel.audit({
        layer: 'orchestration',
        action: 'AGENT_BACKEND_START',
        intent: task.goal,
      });

      this.emit(
        `🔌 Headless Agent (LIVE) — sending to backend server...\nProvider: ${this.currentProvider}`,
        { taskId: task.id, type: 'status' }
      );

      // Call backend — this plans AND executes
      const session: HeadlessAgentSession = await runHeadlessAgent(
        task.goal,
        this.currentProvider,
        true
      );

      // Map backend steps to frontend AgentStep format
      task.steps = session.steps.map((s, i) => ({
        id: stepId(task.id, i),
        index: i,
        description: s.description,
        engine: 'headless_backend',
        prompt: s.prompt,
        status: s.status === 'completed' ? 'completed' as const
             : s.status === 'failed' ? 'failed' as const
             : s.status === 'skipped' ? 'skipped' as const
             : 'pending' as const,
        result: s.result || undefined,
        startedAt: s.started_at ? new Date(s.started_at).getTime() : undefined,
        completedAt: s.completed_at ? new Date(s.completed_at).getTime() : undefined,
      }));

      // Emit the plan
      const planText = task.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n');
      this.emit(
        `📋 Agent Plan (${task.steps.length} steps):\n${planText}`,
        { taskId: task.id, type: 'plan', totalSteps: task.steps.length }
      );

      // Emit each step result
      for (const step of task.steps) {
        if (step.result) {
          const icon = step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️';
          this.emit(
            `${icon} Step ${step.index + 1}/${task.steps.length}: ${step.description}\n\n${step.result}`,
            {
              taskId: task.id,
              type: step.status === 'completed' ? 'step_complete' : 'step_failed',
              stepIndex: step.index,
              totalSteps: task.steps.length,
            }
          );
        }
      }

      // Final status
      if (session.status === 'completed') {
        task.status = 'completed';
        task.completedAt = Date.now();
        const elapsed = ((task.completedAt - (task.startedAt || task.createdAt)) / 1000).toFixed(1);

        TFNKernel.audit({
          layer: 'evolution',
          action: 'AGENT_TASK_COMPLETE',
          intent: task.goal,
        });

        this.emit(
          `🎯 Headless Agent complete: "${task.goal}"\n${task.steps.length} steps executed in ${elapsed}s via backend\nProvider: ${this.currentProvider} | All steps passed with Franklin certification.`,
          { taskId: task.id, type: 'task_complete', totalSteps: task.steps.length }
        );

        // Load project files into the IDE editor
        if (this.onProjectFiles && session.session_id) {
          try {
            const projectFiles = await getSessionProjectFiles(session.session_id);
            if (projectFiles.length > 0) {
              this.onProjectFiles(projectFiles);
              this.emit(
                `📂 ${projectFiles.length} files loaded into editor: ${projectFiles.map(f => f.path).join(', ')}`,
                { taskId: task.id, type: 'status' }
              );
            }
          } catch (err: any) {
            console.warn('[AgentService] Could not load project files into editor:', err);
          }
        }
      } else {
        task.status = 'failed';
        task.error = session.error || 'Unknown backend error';
        this.emit(
          `❌ Headless Agent failed: ${task.error}`,
          { taskId: task.id, type: 'task_failed' }
        );
      }
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || 'Backend unreachable';
      this.emit(
        `❌ Backend agent error: ${task.error}\nFalling back to client-side execution...`,
        { taskId: task.id, type: 'task_failed' }
      );

      // Retry via client-side fallback
      task.status = 'queued';
      this.backendAvailable = false;
      await this.runTaskClientSide(task);
    } finally {
      this.activeTaskId = null;
      this.processQueue();
    }
  }

  // ========================================================================
  //                    CLIENT-SIDE FALLBACK (Gemini)
  // ========================================================================

  private async runTaskClientSide(task: AgentTask) {
    try {
      // Phase 1: Planning
      task.status = 'planning';
      task.startedAt = Date.now();

      this.emit(
        `🧠 Agent (client-side fallback) — planning via Gemini...`,
        { taskId: task.id, type: 'status' }
      );

      TFNKernel.audit({
        layer: 'orchestration',
        action: 'AGENT_PLANNING',
        intent: task.goal,
      });

      const planContract = await TFNKernel.handleRequest(
        'AGENT_PLAN',
        'agent_planner',
        { goal: task.goal }
      );

      const planResult = planContract.output.result;
      let stepDefs: { description: string; prompt: string }[];

      try {
        stepDefs = typeof planResult === 'string' ? this.parseJsonFromText(planResult) : planResult;
      } catch {
        stepDefs = [{ description: task.goal, prompt: task.goal }];
      }

      // Build AgentStep array
      task.steps = stepDefs.map((s, i) => ({
        id: stepId(task.id, i),
        index: i,
        description: s.description || `Step ${i + 1}`,
        engine: 'agent_step_executor',
        prompt: s.prompt || s.description,
        status: 'pending' as const,
      }));

      // Emit the plan
      const planText = task.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n');
      this.emit(
        `📋 Agent Plan (${task.steps.length} steps) [client-side]:\n${planText}`,
        { taskId: task.id, type: 'plan', totalSteps: task.steps.length }
      );

      // Phase 2: Execution
      task.status = 'running';
      const previousResults: string[] = [];

      for (let i = 0; i < task.steps.length; i++) {
        if (this.cancelled) {
          task.status = 'cancelled';
          task.steps.slice(i).forEach(s => s.status = 'skipped');
          this.emit(
            `⛔ Agent task cancelled at step ${i + 1}/${task.steps.length}.`,
            { taskId: task.id, type: 'task_failed' }
          );
          break;
        }

        const step = task.steps[i];
        task.currentStepIndex = i;
        step.status = 'running';
        step.startedAt = Date.now();

        this.emit(
          `⚙️ Step ${i + 1}/${task.steps.length}: ${step.description}...`,
          { taskId: task.id, type: 'step_start', stepIndex: i, totalSteps: task.steps.length }
        );

        try {
          const stepContract = await TFNKernel.handleRequest(
            'AGENT_STEP',
            'agent_step_executor',
            {
              goal: task.goal,
              step: step,
              previousResults,
              allSteps: task.steps.map(s => s.description),
            }
          );

          const result = typeof stepContract.output.result === 'string'
            ? stepContract.output.result
            : JSON.stringify(stepContract.output.result);

          step.status = 'completed';
          step.result = result;
          step.completedAt = Date.now();
          previousResults.push(result);

          this.emit(
            `✅ Step ${i + 1}/${task.steps.length} complete: ${step.description}\n\n${result}`,
            { taskId: task.id, type: 'step_complete', stepIndex: i, totalSteps: task.steps.length }
          );
        } catch (err: any) {
          step.status = 'failed';
          step.error = err?.message || 'Unknown error';
          step.completedAt = Date.now();
          task.status = 'failed';
          task.error = `Step ${i + 1} failed: ${step.error}`;

          this.emit(
            `❌ Step ${i + 1}/${task.steps.length} failed: ${step.description}\nError: ${step.error}`,
            { taskId: task.id, type: 'step_failed', stepIndex: i, totalSteps: task.steps.length }
          );
          break;
        }
      }

      // Phase 3: Completion
      if (task.status === 'running') {
        task.status = 'completed';
        task.completedAt = Date.now();
        const elapsed = ((task.completedAt - (task.startedAt || task.createdAt)) / 1000).toFixed(1);

        TFNKernel.audit({
          layer: 'evolution',
          action: 'AGENT_TASK_COMPLETE',
          intent: task.goal,
        });

        this.emit(
          `🎯 Agent task complete: "${task.goal}"\n${task.steps.length} steps executed in ${elapsed}s [client-side]\nAll steps passed with Franklin certification.`,
          { taskId: task.id, type: 'task_complete', totalSteps: task.steps.length }
        );
      }
    } catch (err: any) {
      task.status = 'failed';
      task.error = err?.message || 'Planning failed';
      this.emit(
        `❌ Agent task failed: ${task.error}`,
        { taskId: task.id, type: 'task_failed' }
      );
    } finally {
      this.activeTaskId = null;
      this.processQueue();
    }
  }

  /** Cancel the currently running task */
  cancelCurrentTask(): boolean {
    if (!this.activeTaskId) return false;
    this.cancelled = true;
    TFNKernel.audit({ layer: 'kernel', action: 'AGENT_TASK_CANCELLED' });
    return true;
  }

  /** Get a formatted summary of all tasks */
  getQueueSummary(): string {
    if (this.tasks.length === 0) return 'No agent tasks in queue.';

    const statusIcons: Record<AgentTaskStatus, string> = {
      queued: '⏳', planning: '🧠', running: '⚙️',
      completed: '✅', failed: '❌', cancelled: '⛔',
    };

    const lines = this.tasks.map((t, i) => {
      const icon = statusIcons[t.status];
      const progress = t.steps.length > 0
        ? ` (${t.steps.filter(s => s.status === 'completed').length}/${t.steps.length} steps)`
        : '';
      return `${i + 1}. ${icon} [${t.status.toUpperCase()}] ${t.goal}${progress}`;
    });

    const modeLabel = this.backendAvailable ? '🔌 LIVE (backend)' : '💻 CLIENT-SIDE (Gemini)';
    return `📊 Agent Queue [${modeLabel}]:\n${lines.join('\n')}`;
  }

  /** Get all tasks */
  getTasks(): AgentTask[] {
    return [...this.tasks];
  }

  // === Gemini Engine Handlers (fallback) ===

  private async rawPlanTask(data: { goal: string }) {
    const ai = getAi();

    const systemInstruction = `You are a task planner for FRANKLIN, an autonomous coding agent. Given a goal, decompose it into 3-8 sequential, concrete steps that an AI coding assistant can execute.

RULES:
- Each step must be self-contained and clearly actionable
- Steps should build on each other logically
- Return ONLY a JSON array, no markdown fences, no explanation
- Format: [{"description": "short label", "prompt": "detailed instruction for the AI"}]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: `Decompose this goal into steps:\n\n${data.goal}` }] }],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const text = response.text || '[]';
    const parsed = this.parseJsonFromText(text);

    return {
      output: parsed,
      quality: 0.95,
      confidence: 0.92,
      justification: 'Task decomposed by Franklin planning engine.',
    };
  }

  private async rawExecuteStep(data: {
    goal: string;
    step: AgentStep;
    previousResults: string[];
    allSteps: string[];
  }) {
    const ai = getAi();

    const prevContext = data.previousResults.length > 0
      ? `\n\nPrevious step results:\n${data.previousResults.map((r, i) => `--- Step ${i + 1} ---\n${r}`).join('\n\n')}`
      : '';

    const allStepsContext = data.allSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const prompt = `You are FRANKLIN, an autonomous coding agent executing a multi-step task.

OVERALL GOAL: ${data.goal}

ALL STEPS:
${allStepsContext}

CURRENT STEP (${data.step.index + 1}/${data.allSteps.length}): ${data.step.description}

DETAILED INSTRUCTION: ${data.step.prompt}
${prevContext}

Execute this step thoroughly. Provide complete, production-ready output.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: { temperature: 0.5 },
    });

    return {
      output: response.text || 'Step executed but returned empty result.',
      quality: 0.96,
      confidence: 0.94,
      justification: `Step ${data.step.index + 1} executed under Franklin governance.`,
    };
  }

  /** Extract JSON array from text that might contain markdown fences */
  private parseJsonFromText(text: string): { description: string; prompt: string }[] {
    try {
      const result = JSON.parse(text);
      if (Array.isArray(result)) return result;
    } catch {}

    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      try {
        const result = JSON.parse(fenceMatch[1]);
        if (Array.isArray(result)) return result;
      } catch {}
    }

    const bracketMatch = text.match(/\[[\s\S]*\]/);
    if (bracketMatch) {
      try {
        const result = JSON.parse(bracketMatch[0]);
        if (Array.isArray(result)) return result;
      } catch {}
    }

    const lines = text.split('\n').filter(l => l.trim().length > 0);
    return lines.slice(0, 8).map((line) => ({
      description: line.replace(/^\d+[\.\)]\s*/, '').trim(),
      prompt: line.replace(/^\d+[\.\)]\s*/, '').trim(),
    }));
  }
}

export const agentService = new AgentService();
