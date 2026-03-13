import React, { useState, useEffect } from 'react';
import { ChevronDown, Download, ArrowLeft, Circle } from 'lucide-react';
import { ChatProvider } from '../types';
import { ollamaService } from '../services/ollamaService';
import { anthropicService } from '../services/anthropicService';

interface HeaderBarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  currentProvider: ChatProvider;
  onProviderChange: (provider: ChatProvider) => void;
}

const languages = ['Python', 'JavaScript', 'TypeScript', 'Rust', 'Go', 'C++'];
const providers: { id: ChatProvider; label: string }[] = [
  { id: 'Gemini', label: 'Gemini' },
  { id: 'Ollama', label: 'Ollama' },
  { id: 'ChatGPT', label: 'ChatGPT' },
  { id: 'Anthropic', label: 'Anthropic' },
  { id: 'Copilot', label: 'Copilot' },
  { id: 'Kling', label: 'Kling' },
];

const HeaderBar: React.FC<HeaderBarProps> = ({ language, onLanguageChange, currentProvider, onProviderChange }) => {
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [anthropicOnline, setAnthropicOnline] = useState(false);

  useEffect(() => {
    ollamaService.checkAvailability().then(({ online, models }) => {
      setOllamaOnline(online);
      setOllamaModels(models);
    });
    anthropicService.checkAvailability().then(setAnthropicOnline);
    const interval = setInterval(() => {
      ollamaService.checkAvailability().then(({ online, models }) => {
        setOllamaOnline(online);
        setOllamaModels(models);
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-10 flex items-center justify-between px-4 py-2.5 bg-[#182420]/70 backdrop-blur-xl border-b border-emerald-400/20">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button className="w-7 h-7 rounded-full border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/10 transition-colors">
          <ArrowLeft size={14} className="text-emerald-400/60" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-400/70 font-space tracking-widest">YUR-AI</span>
          <span className="text-sm font-space font-bold tracking-[0.3em] text-white">
            F R A N K L I N &nbsp;&nbsp;O S
          </span>
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[10px] text-emerald-400 font-mono tracking-wider">ONLINE</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Provider dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowProviderDropdown(!showProviderDropdown); setShowLangDropdown(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
          >
            {(currentProvider === 'Ollama' || currentProvider === 'Anthropic') && (
              <Circle size={6} className={
                (currentProvider === 'Ollama' ? ollamaOnline : anthropicOnline)
                  ? 'text-emerald-400 fill-emerald-400' : 'text-red-400 fill-red-400'
              } />
            )}
            <span className="text-xs font-mono text-emerald-100">{currentProvider}</span>
            <ChevronDown size={12} className="text-emerald-300" />
          </button>
          {showProviderDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a2a1e] border border-emerald-500/20 rounded shadow-xl z-50 min-w-[160px]">
              {providers.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onProviderChange(p.id); setShowProviderDropdown(false); }}
                  className={`flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-emerald-500/10 transition-colors ${
                    p.id === currentProvider ? 'text-emerald-400' : 'text-emerald-200/50'
                  }`}
                >
                  {(p.id === 'Ollama' || p.id === 'Anthropic') && (
                    <Circle size={5} className={
                      (p.id === 'Ollama' ? ollamaOnline : anthropicOnline)
                        ? 'text-emerald-400 fill-emerald-400' : 'text-red-400 fill-red-400'
                    } />
                  )}
                  <span>{p.label}</span>
                  {p.id === 'Ollama' && !ollamaOnline && (
                    <span className="text-[9px] text-red-400/60 ml-auto">offline</span>
                  )}
                  {p.id === 'Ollama' && ollamaOnline && (
                    <span className="text-[9px] text-emerald-400/50 ml-auto">{ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''}</span>
                  )}
                  {p.id === 'Anthropic' && anthropicOnline && (
                    <span className="text-[9px] text-emerald-400/50 ml-auto">Claude</span>
                  )}
                  {p.id === 'Anthropic' && !anthropicOnline && (
                    <span className="text-[9px] text-red-400/60 ml-auto">no key</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Language dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowLangDropdown(!showLangDropdown); setShowProviderDropdown(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-emerald-500/15 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
          >
            <span className="text-xs font-mono text-emerald-100">{language}</span>
            <ChevronDown size={12} className="text-emerald-300" />
          </button>
          {showLangDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a2a1e] border border-emerald-500/20 rounded shadow-xl z-50 min-w-[140px]">
              {languages.map(lang => (
                <button
                  key={lang}
                  onClick={() => { onLanguageChange(lang); setShowLangDropdown(false); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-emerald-500/10 transition-colors ${
                    lang === language ? 'text-emerald-400' : 'text-emerald-200/50'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Download button */}
        <button className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-emerald-600/80 hover:bg-emerald-500/80 text-white text-xs font-space font-bold tracking-wider transition-colors">
          <Download size={12} />
          DOWNLOAD
        </button>
      </div>
    </div>
  );
};

export default HeaderBar;
