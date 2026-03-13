import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Upload, Activity, Circle, Cpu, CheckCircle, XCircle, ListChecks } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { agentService, parseAgentCommand } from '../services/AgentService';
import { webAgentService, parseBrowseCommand } from '../services/WebAgentService';
import { ChatMessage, ChatProvider, KernelAudit } from '../types';
import { TFNKernel } from '../services/TFNKernel';

interface Props {
  provider?: ChatProvider;
}

const ChatPanel: React.FC<Props> = ({ provider = 'Gemini' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<KernelAudit[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Register agent + web agent message callbacks
  useEffect(() => {
    const pushMsg = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);
    agentService.setMessageCallback(pushMsg);
    webAgentService.setMessageCallback(pushMsg);
    return () => {
      agentService.setMessageCallback(null);
      webAgentService.setMessageCallback(null);
    };
  }, []);

  // Poll audit log
  useEffect(() => {
    const initial: KernelAudit[] = [
      { ts: Date.now() - 2000, layer: 'kernel', action: 'FRANKLIN OS v3.0 initialized' },
      { ts: Date.now() - 1000, layer: 'governance', action: 'Trust Vault: SECURED' },
    ];
    setAuditLog(initial);

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setAuditLog(prev => [...prev, detail].slice(-20));
      }
    };
    window.addEventListener('tfn:audit', handler);
    return () => window.removeEventListener('tfn:audit', handler);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    // Check for agent slash commands
    const agentCmd = parseAgentCommand(currentInput);
    if (agentCmd) {
      switch (agentCmd.command) {
        case 'run':
          agentService.setProvider(provider);
          await agentService.queueTask(agentCmd.args);
          return;
        case 'status': {
          const statusMsg = agentService.getQueueSummary();
          setMessages(prev => [...prev, {
            role: 'model', content: statusMsg, timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
        }
        case 'stop': {
          const cancelled = agentService.cancelCurrentTask();
          setMessages(prev => [...prev, {
            role: 'model',
            content: cancelled ? 'Agent task cancellation requested.' : 'No active agent task to cancel.',
            timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
        }
        case 'queue': {
          const summary = agentService.getQueueSummary();
          setMessages(prev => [...prev, {
            role: 'model', content: summary, timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
        }
        case 'help':
        default:
          setMessages(prev => [...prev, {
            role: 'model',
            content: '🤖 Agent Commands:\n\n/agent <goal>  — Queue an autonomous task\n/agent status  — Show task statuses\n/agent stop    — Cancel current task\n/agent queue   — List all queued tasks\n\nExample: /agent build a REST API with user auth',
            timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
      }
    }

    // Check for browse slash commands
    const browseCmd = parseBrowseCommand(currentInput);
    if (browseCmd) {
      switch (browseCmd.command) {
        case 'browse':
          webAgentService.browse(browseCmd.args);
          return;
        case 'session': {
          const summary = webAgentService.getSessionSummary();
          setMessages(prev => [...prev, {
            role: 'model', content: summary, timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
        }
        case 'help':
        default:
          setMessages(prev => [...prev, {
            role: 'model',
            content: '🌐 Web Agent Commands:\n\n/browse <goal>    — Start autonomous web browsing\n/browse session   — Show current session status\n\nExample: /browse find the best React state management library in 2026',
            timestamp: new Date(),
            agentMeta: { taskId: '', type: 'status' }
          }]);
          return;
      }
    }

    // Normal chat flow
    setIsLoading(true);
    try {
      const contract = await geminiService.chatWithContract([...messages, userMessage], false, provider);
      const botMessage: ChatMessage = {
        role: 'model',
        content: contract.output.result,
        timestamp: new Date(),
        contract
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      console.error(e);
      const errMsg: ChatMessage = {
        role: 'model',
        content: 'Connection error. Please check your API key and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setAuditLog(prev => [...prev, {
        ts: Date.now(),
        layer: 'kernel',
        action: `File received: ${files.map(f => f.name).join(', ')}`
      }]);
    }
  };

  /** Get the icon for an agent message type */
  const getAgentIcon = (type?: string) => {
    switch (type) {
      case 'step_complete':
      case 'task_complete':
        return <CheckCircle size={12} className="text-amber-400" />;
      case 'step_failed':
      case 'task_failed':
        return <XCircle size={12} className="text-red-400" />;
      case 'plan':
        return <ListChecks size={12} className="text-amber-400" />;
      default:
        return <Cpu size={12} className="text-amber-400" />;
    }
  };

  /** Check if a message is an agent message */
  const isAgentMessage = (m: ChatMessage) => !!m.agentMeta;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-400/15">
        <div className="flex items-center gap-2">
          <Circle size={8} className="text-emerald-400 fill-emerald-400" />
          <span className="text-xs font-space font-bold tracking-widest text-white uppercase">Chat with Franklin</span>
        </div>
        <p className="text-[10px] text-emerald-300/50 mt-0.5 ml-5">Ask me to build or fix anything &middot; Try <span className="text-amber-400/60">/agent</span> for autonomous mode</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-wider">FRANKLIN</span>
            </div>
            <div className="bg-emerald-500/8 border border-emerald-400/15 rounded-md p-3 max-w-[95%]">
              <p className="text-xs text-emerald-50/90 leading-relaxed">
                Welcome to FRANKLIN OS. I am your autonomous coding agent. Upload your files (up to 500MB) or describe your project, and I will analyze, structure, and build it with full certification.
              </p>
              <div className="mt-2 pt-2 border-t border-emerald-400/10">
                <p className="text-[10px] text-amber-400/60 font-mono">
                  TIP: Use <span className="text-amber-300/80">/agent &lt;goal&gt;</span> for autonomous multi-step execution
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isAgent = isAgentMessage(m);

          return (
            <div key={i} className={`flex gap-2 animate-fade-in ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* Avatar for model/agent messages */}
              {m.role === 'model' && (
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  isAgent ? 'bg-amber-500/10' : 'bg-emerald-500/10'
                }`}>
                  {isAgent ? getAgentIcon(m.agentMeta?.type) : <Bot size={12} className="text-emerald-400" />}
                </div>
              )}

              {/* Message bubble */}
              <div className={`max-w-[85%] px-3 py-2 rounded-md text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-600/20 border border-emerald-400/20 text-white/90'
                  : isAgent
                    ? 'bg-amber-500/8 border border-amber-400/20 text-amber-50/90'
                    : 'bg-emerald-500/8 border border-emerald-400/15 text-emerald-50/90'
              }`}>
                {/* Agent badge */}
                {isAgent && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[8px] font-mono font-bold tracking-widest text-amber-400/80 bg-amber-500/15 px-1.5 py-0.5 rounded uppercase">Agent</span>
                    {m.agentMeta?.type === 'step_start' && (
                      <span className="text-[9px] font-mono text-amber-400/50">
                        Step {(m.agentMeta.stepIndex ?? 0) + 1}/{m.agentMeta.totalSteps}
                      </span>
                    )}
                    {m.agentMeta?.type === 'step_complete' && (
                      <span className="text-[9px] font-mono text-emerald-400/70">DONE</span>
                    )}
                    {m.agentMeta?.type === 'step_failed' && (
                      <span className="text-[9px] font-mono text-red-400/70">FAILED</span>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Progress bar for step_start */}
                {isAgent && m.agentMeta?.type === 'step_start' && m.agentMeta.totalSteps && (
                  <div className="mt-2 w-full h-1 bg-amber-500/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500/50 rounded-full transition-all duration-700"
                      style={{ width: `${(((m.agentMeta.stepIndex ?? 0) + 1) / m.agentMeta.totalSteps) * 100}%` }}
                    />
                  </div>
                )}

                {/* Contract info for regular chat */}
                {m.contract && !isAgent && (
                  <div className="mt-2 pt-2 border-t border-emerald-400/15 flex items-center gap-2 text-[9px] text-emerald-400/60 font-mono">
                    <span>Confidence: {(m.contract.output.confidence * 100).toFixed(0)}%</span>
                    <span>|</span>
                    <span>Quality: {(m.contract.output.quality * 100).toFixed(0)}/100</span>
                  </div>
                )}
              </div>

              {/* Avatar for user messages */}
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User size={12} className="text-emerald-200/40" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-2 items-center animate-fade-in">
            <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Activity size={12} className="text-emerald-400 animate-pulse" />
            </div>
            <div className="flex gap-1.5 items-center px-3 py-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="border-t border-emerald-400/15 px-4 py-2 max-h-[100px] overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Circle size={5} className="text-emerald-400/50 fill-emerald-400/50" />
          <span className="text-[9px] font-mono text-emerald-400/50 uppercase tracking-wider">Activity Log</span>
        </div>
        {auditLog.slice(-5).map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 py-0.5">
            <span className="text-emerald-400 text-[9px]">+</span>
            <span className="text-[10px] text-emerald-300/70 font-mono">{entry.action || entry.intent || entry.signal || 'System event'}</span>
          </div>
        ))}
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`mx-3 mb-2 border-2 border-dashed rounded-md py-3 flex flex-col items-center gap-1 transition-colors ${
          isDragOver ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-emerald-400/20'
        }`}
      >
        <Upload size={16} className="text-emerald-400/40" />
        <span className="text-[10px] text-emerald-400/40">Drop files (up to 500MB)</span>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-emerald-400/15">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder='/agent build a REST API — or ask Franklin anything'
            className={`flex-1 bg-white/[0.03] border rounded-md px-3 py-2 text-xs outline-none placeholder:text-emerald-400/30 focus:border-emerald-400/40 transition-colors font-mono ${
              input.startsWith('/agent') || input.startsWith('/browse')
                ? 'border-amber-400/30 text-amber-50'
                : 'border-emerald-400/20 text-emerald-50'
            }`}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors disabled:opacity-20 ${
              input.startsWith('/agent') || input.startsWith('/browse')
                ? 'bg-amber-600/60 hover:bg-amber-500/60'
                : 'bg-emerald-600/60 hover:bg-emerald-500/60'
            }`}
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
