
import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Loader2, Download, Maximize2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

const ImageGenPort: React.FC<{ themeColor: string }> = ({ themeColor }) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<"1K" | "2K" | "4K">("1K");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const url = await geminiService.generateImage(prompt, size);
      setResult(url);
    } catch (e) {
      alert("Neural core failed to visualize prompt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col h-full space-y-4">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Creative Prompt</label>
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe high-end graphic design assets..."
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] h-24 resize-none focus:border-yellow-500/50 outline-none text-white"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["1K", "2K", "4K"] as const).map(s => (
            <button 
              key={s} 
              onClick={() => setSize(s)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${size === s ? 'bg-yellow-500 border-yellow-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button 
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          Visualize
        </button>
      </div>

      <div className="flex-1 min-h-[200px] rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden group">
        {result ? (
          <>
            <img src={result} className="w-full h-full object-contain" alt="Generated asset" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <a href={result} download="yur-asset.png" className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all text-white"><Download size={20}/></a>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center opacity-20">
            <ImageIcon size={48} />
            <span className="text-[10px] mt-4 uppercase font-bold tracking-widest">Awaiting Neural Projection</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenPort;