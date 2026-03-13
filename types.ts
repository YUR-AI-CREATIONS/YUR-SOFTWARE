
export type AIModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview' | 'veo-3.1-fast-generate-preview';

export type ChatProvider = 'Copilot' | 'ChatGPT' | 'Gemini' | 'Anthropic' | 'Kling' | 'Ollama';

export type WorkflowStep =
  'upload' | 'verify' | 'workflow' | 'filestructure' |
  'architecture' | 'implementation' | 'deployment' | 'certification';

export type EditorTab =
  'code' | 'files' | 'verification' | 'workflow' |
  'architecture' | 'deployment' | 'env' | 'certification' | 'browser';

export interface ConnectedService {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  metricLabel: string;
  metricValue: string;
}

export interface TerminalEntry {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  content?: string;
  isOpen?: boolean;
  previewUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  contract?: ExecutionContract;
  agentMeta?: {
    taskId: string;
    type: 'plan' | 'step_start' | 'step_complete' | 'step_failed' | 'task_complete' | 'task_failed' | 'status';
    stepIndex?: number;
    totalSteps?: number;
  };
}

export interface ExecutionContract {
  input: {
    intent: string;
    engine: string;
    data: any;
  };
  output: {
    result: any;
    confidence: number;
    quality: number;
    signed_by: "FRANKLIN";
    justification: string;
    signature?: string;
  };
}

// === Agent Types ===

export type AgentTaskStatus = 'queued' | 'planning' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentStep {
  id: string;
  index: number;
  description: string;
  engine: string;
  prompt: string;
  status: AgentStepStatus;
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentTask {
  id: string;
  goal: string;
  status: AgentTaskStatus;
  steps: AgentStep[];
  currentStepIndex: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// === Web Agent Types ===

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebPage {
  url: string;
  title: string;
  content: string;
  rawHtml?: string;
  fetchedAt: number;
  error?: string;
}

export type BrowseSessionStatus = 'idle' | 'searching' | 'fetching' | 'analyzing' | 'complete' | 'error';

export interface BrowseSession {
  id: string;
  goal: string;
  currentUrl: string | null;
  pages: WebPage[];
  searchResults: WebSearchResult[];
  status: BrowseSessionStatus;
  summary?: string;
}

export interface KernelAudit {
  ts: number;
  layer: 'governance' | 'orchestration' | 'evolution' | 'kernel';
  actor?: string;
  intent?: string;
  action?: string;
  decision?: string;
  engine?: string;
  signal?: string;
  task?: any;
  contract?: ExecutionContract;
}
