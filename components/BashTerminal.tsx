import React, { useState, useRef, useEffect } from 'react';
import { Terminal, RotateCw, Maximize2, Minus, Wifi, WifiOff } from 'lucide-react';
import type { TerminalEntry } from '../types';
import { executeTerminalCommand, checkBackendHealth } from '../services/backendApi';
import { geminiService } from '../services/geminiService';

const BashTerminal: React.FC = () => {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    { type: 'system', content: 'Terminal ready. Type commands below.', timestamp: new Date() },
    { type: 'system', content: 'Try: ls, pwd, git status, echo "hello"', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  // Check backend connectivity
  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    const interval = setInterval(() => {
      checkBackendHealth().then(setBackendOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = async () => {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;

    const inputEntry: TerminalEntry = { type: 'input', content: cmd, timestamp: new Date() };
    setEntries(prev => [...prev, inputEntry]);
    setInput('');
    setIsProcessing(true);

    try {
      if (cmd === 'clear') {
        setEntries([{ type: 'system', content: 'Terminal cleared.', timestamp: new Date() }]);
        setIsProcessing(false);
        return;
      }

      // Try real backend terminal first
      if (backendOnline) {
        try {
          const result = await executeTerminalCommand(cmd, 'bash');
          const entryType = result.success ? 'output' : 'error';
          const content = result.success ? result.output : (result.error || result.output);
          setEntries(prev => [...prev, {
            type: entryType as any,
            content: content || '(no output)',
            timestamp: new Date()
          }]);
          return;
        } catch (err: any) {
          // Backend call failed — fall through to simulation
          setEntries(prev => [...prev, {
            type: 'system',
            content: `[Backend unreachable — using simulation]`,
            timestamp: new Date()
          }]);
          setBackendOnline(false);
        }
      }

      // Fallback: simulate common commands locally
      let output = '';
      if (cmd === 'pwd') {
        output = '/home/franklin/workspace';
      } else if (cmd === 'whoami') {
        output = 'franklin';
      } else if (cmd === 'ls') {
        output = 'App.tsx\ncomponents/\nservices/\ntypes.ts\nvite.config.ts\npackage.json\nindex.html\n.env.local';
      } else if (cmd.startsWith('echo ')) {
        output = cmd.slice(5).replace(/^["']|["']$/g, '');
      } else if (cmd === 'git status') {
        output = 'On branch main\nnothing to commit, working tree clean';
      } else if (cmd === 'node -v') {
        output = 'v22.19.0';
      } else if (cmd === 'date') {
        output = new Date().toString();
      } else {
        // Send to Gemini for simulated response
        try {
          const contract = await geminiService.chatWithContract(
            [{ role: 'user', content: `Simulate a bash terminal response for this command. Only return the terminal output, no explanation:\n${cmd}`, timestamp: new Date() }],
            true,
            'Gemini'
          );
          output = contract.output.result;
        } catch {
          output = `bash: ${cmd.split(' ')[0]}: command not found`;
        }
      }

      setEntries(prev => [...prev, { type: 'output', content: output, timestamp: new Date() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full" onClick={() => inputRef.current?.focus()}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-emerald-400/15 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-emerald-400/50" />
          <span className="text-[10px] font-space font-bold tracking-widest text-emerald-100 uppercase">Bash Terminal</span>
          {backendOnline ? (
            <span className="text-[9px] font-mono text-emerald-400/70 ml-2 px-1.5 py-0.5 rounded border border-emerald-400/20 flex items-center gap-1">
              <Wifi size={8} /> LIVE
            </span>
          ) : (
            <span className="text-[9px] font-mono text-amber-400/50 ml-2 px-1.5 py-0.5 rounded border border-amber-400/15 flex items-center gap-1">
              <WifiOff size={8} /> SIM
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button className="p-1 hover:bg-emerald-500/10 rounded transition-colors">
            <RotateCw size={10} className="text-emerald-400/50" />
          </button>
          <button className="p-1 hover:bg-emerald-500/10 rounded transition-colors">
            <Minus size={10} className="text-emerald-400/50" />
          </button>
          <button className="p-1 hover:bg-emerald-500/10 rounded transition-colors">
            <Maximize2 size={10} className="text-emerald-400/50" />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] custom-scrollbar min-h-0">
        {entries.map((entry, i) => (
          <div key={i} className="mb-1">
            {entry.type === 'system' && (
              <span className="text-emerald-300/70">{entry.content}</span>
            )}
            {entry.type === 'input' && (
              <div>
                <span className="text-emerald-400/50">$ </span>
                <span className="text-emerald-100">{entry.content}</span>
              </div>
            )}
            {entry.type === 'output' && (
              <div className="text-emerald-100/80 whitespace-pre-wrap pl-2">{entry.content}</div>
            )}
            {entry.type === 'error' && (
              <div className="text-red-400/60 whitespace-pre-wrap pl-2">{entry.content}</div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="text-emerald-400/50 animate-pulse">Processing...</div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-emerald-400/15 flex items-center gap-2 flex-shrink-0">
        <span className="text-emerald-400/40 text-[11px] font-mono">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
          placeholder="Enter bash command..."
          className="flex-1 bg-transparent text-[11px] font-mono text-emerald-100 outline-none placeholder:text-emerald-400/30"
        />
      </div>
    </div>
  );
};

export default BashTerminal;
