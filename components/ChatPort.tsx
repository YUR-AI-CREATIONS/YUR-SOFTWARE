
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Zap, Cpu as AIIcon, Sparkles, MessageCircle, ChevronDown, Binary, BrainCircuit, ShieldCheck, Fingerprint, Activity } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { ChatMessage, ExecutionContract, ChatProvider } from '../types';

interface Props {
  themeColor: string;
  isCore?: boolean;
  provider?: ChatProvider;
  onProviderChange?: (provider: ChatProvider) => void;
}

// Fixed: Explicitly cast the default provider value to ChatProvider to ensure correct type inference within the component.
const ChatPort: React.FC<Props> = ({ themeColor, isCore = false, provider = 'Gemini' as ChatProvider, onProviderChange }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const [persona, setPersona] = useState<'Standard' | 'Creative' | 'Technical'>('Technical');
  const scrollRef = useRef<HTMLDivElement>(null);

  const providers: ChatProvider[] = ['Copilot', 'ChatGPT', 'Gemini', 'Anthropic', 'Kling'];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Fixed: The 'provider' variable is now correctly treated as ChatProvider by the TypeScript compiler.
      const contract = await geminiService.chatWithContract([...messages, userMessage], isFast, provider);
      
      const botMessage: ChatMessage = { 
        role: 'model', 
        content: contract.output.result, 
        timestamp: new Date(),
        contract 
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-transparent ${isCore ? 'max-h-full' : ''} relative`}>
      {/* Neural Engine Selector Strip */}
      <div className="px-6 py-4 bg-black/80 border-b border-white/10 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-3xl z-30 shadow-2xl">
         <div className="flex items-center gap-3 shrink-0 mr-4">
            <div className="p-2 tactile-3d-node rounded-xs text-purple-400">
               <BrainCircuit size={16} className="glow-accent" />
            </div>
            <span className="text-[10px] font-mono uppercase font-black opacity-30 tracking-widest glow-accent">Engine:</span>
         </div>
         <div className="flex gap-3">
           {providers.map((p) => (
             <button 
               key={p} 
               onClick={() => onProviderChange?.(p)}
               className={`px-5 py-2.5 rounded-xs tactile-3d-node text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${provider === p ? 'active border-yellow-500 text-white glow-accent bg-yellow-500/10' : 'opacity-40 hover:opacity-100 border-transparent text-white/50'}`}
             >
               {p}
             </button>
           ))}
         </div>
      </div>

      {/* Model & Persona Selection Bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center gap-8 shrink-0 overflow-x-auto no-scrollbar backdrop-blur-md">
         <div className="flex items-center gap-3 shrink-0">
            <span className="text-[9px] font-mono uppercase font-black opacity-30 tracking-widest glow-accent">Persona:</span>
         </div>
         {['Standard', 'Creative', 'Technical'].map((p: any) => (
           <button 
             key={p} 
             onClick={() => setPersona(p)}
             className={`text-[9px] font-black uppercase tracking-[0.2em] transition-all px-4 py-2 border-b-2 shrink-0 ${persona === p ? 'text-white border-yellow-500 bg-yellow-500/5 glow-accent' : 'text-white/10 border-transparent hover:text-white/40'}`}
           >
             {p}
           </button>
         ))}
         <div className="ml-auto flex items-center gap-6 shrink-0">
            <button 
              onClick={() => setIsFast(!isFast)}
              className={`text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all p-3 tactile-3d-node rounded-xs ${isFast ? 'text-amber-500 border-amber-500/20' : 'text-yellow-400 border-yellow-500/20 glow-accent'}`}
            >
               {isFast ? <Zap size={10} /> : <Sparkles size={10} />}
               {isFast ? 'FAST_CORE' : 'PRO_CORE'}
            </button>
         </div>
      </div>

      {/* Dynamic Header Equalizer/Stats */}
      <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/5 shrink-0 shadow-inner">
        {isLoading ? (
          <div className="col-span-4 flex items-end justify-center h-28 gap-1 py-4 bg-black/30">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-yellow-500 rounded-full animate-[equalizer_1.5s_infinite_ease-in-out]" 
                style={{ 
                  height: `${20 + Math.random() * 80}%`, 
                  animationDelay: `${i * 0.05}s`,
                  boxShadow: `0 0 10px var(--neon-accent)` // Use CSS var for dynamic color
                }}
              ></div>
            ))}
            <span className="absolute bottom-4 text-[10px] font-mono opacity-30 uppercase tracking-[0.8em] font-black glow-accent animate-pulse">Processing Neural Query...</span>
          </div>
        ) : (
          <>
            {[
              { l: 'Flow', v: '32.1 Gb/s' },
              { l: 'Core', v: 'NEO_V3' },
              { l: 'Link', v: provider },
              { l: 'Ping', v: '0.01 ms' }
            ].map((stat, idx) => (
              <div key={idx} className="p-10 bg-black/30 group hover:bg-black/50 transition-all border-r border-white/5">
                <p className="text-[9px] opacity-20 uppercase font-black tracking-widest">{stat.l}</p>
                <p className="text-2xl font-black text-white glow-accent">{stat.v}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Message History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar bg-black/20 relative">
        {isLoading && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 z-0">
             <div className="flex items-end gap-1 h-32">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-yellow-500 rounded-full animate-[equalizer_1.5s_infinite_ease-in-out]" 
                    style={{ 
                      height: `${20 + Math.random() * 80}%`, 
                      animationDelay: `${i * 0.05}s`,
                      boxShadow: `0 0 10px var(--neon-accent)`
                    }}
                  ></div>
                ))}
             </div>
          </div>
        )}

        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
            <div className="relative mb-12">
               <div className="absolute -inset-24 bg-yellow-500/5 rounded-full blur-[100px] animate-pulse"></div>
               <Bot size={80} strokeWidth={0.5} className="text-yellow-500 relative glow-accent" />
            </div>
            <p className="text-[14px] font-black uppercase tracking-[1em] text-white glow-accent">Nexus_Initialized</p>
            <p className="text-[10px] mt-8 max-w-[400px] leading-relaxed font-mono tracking-widest opacity-60">
              [SYSTEM_STATE: <span className="glow-green">LISTENING</span>]<br/>
              Awaiting tactical directives for {provider} synthesis.
            </p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ${m.role === 'model' ? 'flex-row' : 'flex-row-reverse'}`}>
            <div className={`mt-2 p-3 tactile-3d-node rounded-xs h-fit border shrink-0 transition-all duration-1000 ${m.role === 'model' ? 'border-yellow-500/40 text-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.2)] glow-accent bg-yellow-500/5' : 'border-white/10 text-white/20 bg-white/5'}`}>
              {m.role === 'model' ? <AIIcon size={18} strokeWidth={1} /> : <User size={18} strokeWidth={1}/>}
            </div>
            
            <div className={`flex flex-col max-w-[85%] ${m.role === 'model' ? 'items-start' : 'items-end'} relative`}>
              <div className={`p-8 rounded-sm text-[14px] leading-relaxed border transition-all duration-500 relative group overflow-hidden ${m.role === 'model' ? 'beveled-node bg-black/80 border-yellow-500/20 text-yellow-50 shadow-2xl' : 'bg-yellow-900/10 border-yellow-500/30 text-white'}`}>
                {m.role === 'model' && (
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Fingerprint size={12} />
                  </div>
                )}
                <div className="whitespace-pre-wrap font-space font-medium tracking-wide">{m.content}</div>
                
                {m.contract && (
                  <div className="mt-10 pt-8 border-t border-white/5 flex flex-col gap-5 animate-in fade-in slide-in-from-top-4 duration-1000">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <ShieldCheck size={14} className="text-emerald-500 glow-green" />
                           <span className="text-[9px] font-mono uppercase font-black tracking-widest text-emerald-500/60 glow-green">Governance_Verified</span>
                        </div>
                        <span className="text-[8px] font-mono opacity-20 uppercase tracking-[0.4em] glow-accent">{m.contract.output.signature}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="beveled-node bg-white/[0.01] p-4 rounded-xs border border-white/5 shadow-inner">
                           <p className="text-[7px] font-mono opacity-20 uppercase mb-2 tracking-[0.2em]">Confidence_Score</p>
                           <p className="text-[12px] font-black text-white/80 glow-accent">{(m.contract.output.confidence * 100).toFixed(2)}%</p>
                        </div>
                        <div className="beveled-node bg-white/[0.01] p-4 rounded-xs border border-white/5 shadow-inner">
                           <p className="text-[7px] font-mono opacity-20 uppercase mb-2 tracking-[0.2em]">Efficiency_Metric</p>
                           <p className="text-[12px] font-black text-white/80 glow-accent">{(m.contract.output.quality * 100).toFixed(1)}/100</p>
                        </div>
                     </div>
                     <p className="text-[8px] font-mono opacity-30 uppercase leading-relaxed italic border-l-2 border-yellow-500/20 pl-4 py-1">
                        Justification: {m.contract.output.justification}
                     </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-3 px-2">
                 <span className="text-[8px] font-mono opacity-10 uppercase tracking-[0.5em] font-black glow-accent">{m.role === 'model' ? `FRANKLIN_${provider.toUpperCase()}_LINK` : 'AUTHORIZED_NODE_ENTRY'}</span>
                 <div className="w-1 h-1 rounded-full bg-white/5"></div>
                 <span className="text-[8px] font-mono opacity-10 tracking-[0.2em]">{m.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-8 items-center animate-in fade-in slide-in-from-left-4 duration-1000 relative z-10">
             <div className="p-3 rounded-xs tactile-3d-node border border-yellow-500/40 text-yellow-400 glow-accent bg-yellow-500/10">
                <Activity size={18} className="animate-pulse" />
             </div>
             <div className="flex gap-3 items-center">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce delay-100 shadow-[0_0_10px_var(--neon-accent)]"></div>
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce delay-300 shadow-[0_0_10px_var(--neon-accent)]"></div>
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce delay-500 shadow-[0_0_10px_var(--neon-accent)]"></div>
                <span className="text-[10px] font-mono opacity-30 uppercase tracking-[0.8em] ml-6 font-black glow-accent animate-pulse">{provider} Thinking...</span>
             </div>
          </div>
        )}
      </div>

      <div className="p-10 border-t border-white/5 bg-black/60 shrink-0 backdrop-blur-3xl">
        <div className="relative flex items-end gap-6 max-w-5xl mx-auto">
          <div className="flex-1 relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity rounded-sm pointer-events-none"></div>
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={`Relay tactical directives to ${provider}...`}
              className="w-full bg-black/40 border border-white/10 rounded-xs px-8 py-6 text-[14px] outline-none text-white min-h-[90px] max-h-80 resize-none transition-all focus:border-yellow-500/40 placeholder:text-white/5 font-space font-medium tracking-wide shadow-inner"
            />
            <div className="absolute bottom-4 right-8 flex items-center gap-6 pointer-events-none opacity-20">
               <Fingerprint size={14} className="glow-accent" />
               <span className="text-[8px] font-mono uppercase tracking-[0.4em] font-black">Secure_Entry_Link</span>
            </div>
          </div>
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className="group relative w-20 h-20 tactile-3d-node rounded-xs flex items-center justify-center bg-yellow-600 hover:bg-yellow-500 text-white transition-all disabled:opacity-20 disabled:grayscale shrink-0 overflow-hidden shadow-2xl active:scale-95"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Send size={28} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes equalizer {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

export default ChatPort;