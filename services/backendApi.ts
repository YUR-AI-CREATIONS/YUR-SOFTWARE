/**
 * Backend API client — talks to the FastAPI server at /api/*
 * Proxied through Vite dev server → http://localhost:8001
 */

const API_BASE = '/api';

async function apiFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return res.json();
}

// ============ Health / Status ============

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

// ============ Trust Vault ============

export interface ConnectorStatus {
  name: string;
  status: string;
  connected: boolean;
  last_checked: string;
  tokens_used?: number;
  tokens_total?: number;
  queries?: number;
  error_message?: string;
}

export async function getTrustVaultStatus(): Promise<{ connectors: ConnectorStatus[]; checked_at: string }> {
  return apiFetch('/trust-vault/status');
}

// ============ Terminal ============

export interface TerminalResponse {
  success: boolean;
  output: string;
  error?: string;
  exit_code: number;
  terminal_type: string;
  working_dir: string;
  executed_at: string;
}

export async function executeTerminalCommand(
  command: string,
  terminalType: string = 'bash',
  sessionId: string = 'default'
): Promise<TerminalResponse> {
  return apiFetch('/terminal/execute', {
    method: 'POST',
    body: JSON.stringify({
      command,
      terminal_type: terminalType,
      session_id: sessionId,
    }),
  });
}

// ============ Key Rotation ============

export async function getKeyRotationStatus(): Promise<any> {
  return apiFetch('/key-rotation/status');
}

export async function rotateKey(provider: string): Promise<any> {
  return apiFetch('/key-rotation/rotate', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

// ============ LLM Provider ============

export async function getLLMStatus(): Promise<any> {
  return apiFetch('/llm/status');
}

export async function switchLLMMode(mode: string, localModel?: string): Promise<any> {
  return apiFetch('/llm/config', {
    method: 'POST',
    body: JSON.stringify({ mode, local_model: localModel }),
  });
}

export async function testLLM(prompt: string, preferLocal: boolean = false): Promise<any> {
  return apiFetch('/llm/test', {
    method: 'POST',
    body: JSON.stringify({ prompt, prefer_local: preferLocal }),
  });
}

// ============ Chat / Franklin ============

export async function chatWithFranklin(message: string, sessionId?: string): Promise<any> {
  return apiFetch('/franklin/chat', {
    method: 'POST',
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

// ============ Upload / Analyze ============

export async function uploadFiles(files: File[]): Promise<any> {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const res = await fetch(`${API_BASE}/upload/files`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function analyzeProject(sessionId: string): Promise<any> {
  return apiFetch('/analyze/project', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// ============ Workflow Pipeline ============

export async function generateWorkflow(sessionId: string): Promise<any> {
  return apiFetch('/workflow/generate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function generateFileStructure(sessionId: string): Promise<any> {
  return apiFetch('/file-structure/generate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function generateArchitecture(sessionId: string): Promise<any> {
  return apiFetch('/architecture/generate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// ============ Deployment ============

export async function getDeploymentConfig(): Promise<any> {
  return apiFetch('/deployment-config/status');
}

export async function deploy(projectId: string): Promise<any> {
  return apiFetch('/deploy/start', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId }),
  });
}

// ============ Env Config ============

export async function getEnvConfig(): Promise<any> {
  return apiFetch('/env-config/status');
}

// ============ Uptime / Domain ============

export async function getUptimeStatus(): Promise<any> {
  return apiFetch('/uptime/status');
}

export async function getDomainStatus(): Promise<any> {
  return apiFetch('/domain/status');
}

// ============ Headless Agent ============

export interface HeadlessAgentStep {
  index: number;
  description: string;
  prompt: string;
  type: 'llm' | 'terminal' | 'hybrid';
  command?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface HeadlessAgentSession {
  session_id: string;
  goal: string;
  provider: string;
  status: 'planning' | 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: HeadlessAgentStep[];
  results: string[];
  current_step: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  logs: { event: string; message: string; ts: string }[];
  project_dir?: string;
  files_created?: string[];
}

export interface ProjectFile {
  path: string;
  content: string;
  size: number;
}

export async function runHeadlessAgent(goal: string, provider: string = 'anthropic', autoExecute: boolean = true): Promise<HeadlessAgentSession> {
  return apiFetch('/headless-agent/run', {
    method: 'POST',
    body: JSON.stringify({ goal, provider, auto_execute: autoExecute }),
  });
}

export async function planHeadlessAgent(goal: string, provider: string = 'anthropic'): Promise<HeadlessAgentSession> {
  return apiFetch('/headless-agent/plan', {
    method: 'POST',
    body: JSON.stringify({ goal, provider }),
  });
}

export async function executeHeadlessSession(sessionId: string): Promise<HeadlessAgentSession> {
  return apiFetch(`/headless-agent/execute/${sessionId}`, { method: 'POST' });
}

export async function getHeadlessSession(sessionId: string): Promise<HeadlessAgentSession> {
  return apiFetch(`/headless-agent/session/${sessionId}`);
}

export async function listHeadlessSessions(): Promise<{ sessions: any[] }> {
  return apiFetch('/headless-agent/sessions');
}

export async function cancelHeadlessSession(sessionId: string): Promise<HeadlessAgentSession> {
  return apiFetch(`/headless-agent/cancel/${sessionId}`, { method: 'POST' });
}

export async function getHeadlessProviders(): Promise<{ providers: Record<string, boolean> }> {
  return apiFetch('/headless-agent/providers');
}

/** Fetch all project files with content from a completed session */
export async function getSessionProjectFiles(sessionId: string): Promise<ProjectFile[]> {
  const listing = await apiFetch<{ project_dir: string; files: { path: string; size: number }[] }>(
    `/headless-agent/session/${sessionId}/files`
  );
  // Fetch content for each non-huge file (skip node_modules, skip files >100KB)
  const files: ProjectFile[] = [];
  for (const f of listing.files) {
    if (f.path.includes('node_modules') || f.path.includes('.git') || f.size > 100000) continue;
    if (f.path.endsWith('.lock') || f.path.endsWith('.png') || f.path.endsWith('.ico')) continue;
    try {
      const fileData = await apiFetch<{ path: string; content: string; size: number }>(
        `/headless-agent/session/${sessionId}/file/${f.path}`
      );
      files.push(fileData);
    } catch {
      // skip unreadable files
    }
  }
  return files;
}

export async function checkHeadlessAgentHealth(): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/headless-agent/health`, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}
