
import React from 'react';
import { 
  Shield, Zap, Radio, Target, Share2, 
  ExternalLink, BarChart3, Globe, Compass 
} from 'lucide-react';

interface Props {
  themeColor: string;
}

const MissionControlPort: React.FC<Props> = ({ themeColor }) => {
  return (
    <div className="p-6 h-full flex flex-col space-y-8 bg-black/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
              <Shield className="w-6 h-6 text-yellow-400 glow-accent" />
           </div>
           <div>
              <h2 className="text-[12px] font-black uppercase tracking-[0.4em] glow-accent">Governance: Franklin</h2>
              <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">TFN_KERNEL_PROTOCOL_V1.0.0</p>
           </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse glow-green"></div>
           <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 glow-green">Stable</span>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest opacity-30 glow-accent">Active Directives</label>
          <span className="text-[8px] font-mono opacity-10 uppercase tracking-widest">3 Nodes Active</span>
        </div>
        <div className="space-y-4">
           <DirectiveItem label="Viral Content Engine" status="Optimizing" progress={82} themeColor={themeColor} />
           <DirectiveItem label="Affiliate Branding Bot" status="Indexing" progress={45} themeColor={themeColor} />
           <DirectiveItem label="Music Production Sync" status="Standby" progress={0} themeColor={themeColor} />
        </div>
      </div>

      <div className="p-6 border border-white/5 bg-white/[0.01] rounded-xs flex flex-col gap-4">
         <p className="text-[10px] font-black uppercase tracking-widest opacity-30 glow-accent">Trinity Orchestration Status</p>
         <div className="flex gap-4">
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="h-full bg-yellow-500/60 w-[88%] glow-accent"></div>
            </div>
            <span className="text-[9px] font-mono opacity-40">88%</span>
         </div>
         <p className="text-[8px] font-mono opacity-20 leading-relaxed italic">
            "Sovereignty is maintained through precise routing of visual and tactical assets across the cloud fabric."
         </p>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
         <button className="w-full py-4 rounded-xs border-2 border-yellow-500/40 bg-yellow-500/5 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-yellow-500 hover:text-white transition-all glow-accent">
            Execute Global Export
         </button>
      </div>
    </div>
  );
};

const DirectiveItem = ({ label, status, progress, themeColor }: any) => (
  <div className="p-4 rounded-xs bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all">
     <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-black uppercase tracking-widest glow-accent">{label}</span>
        <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'Standby' ? 'opacity-20' : 'text-yellow-400 glow-accent'}`}>{status}</span>
     </div>
     <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-500 transition-all duration-1000 shadow-[0_0_10px_rgba(255,215,0,0.4)]" style={{ width: `${progress}%`, backgroundColor: themeColor }}></div>
     </div>
  </div>
);

export default MissionControlPort;