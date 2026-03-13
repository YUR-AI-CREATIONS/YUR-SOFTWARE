
import React from 'react';
import { X, GripHorizontal, Box, Cpu, ShieldCheck, Maximize2, Crosshair, Minus, Layers } from 'lucide-react';

interface PortWindowProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  themeColor: string;
  className?: string;
  headerAction?: React.ReactNode;
  onCollapse?: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  neonGlow?: boolean;
}

const PortWindow: React.FC<PortWindowProps> = ({ 
  title, 
  children, 
  icon, 
  themeColor, 
  className = "", 
  headerAction, 
  onCollapse,
  onDragStart,
  neonGlow = false
}) => {
  const windowId = React.useMemo(() => Math.random().toString(36).substr(2, 6).toUpperCase(), []);

  return (
    <div className={`relative flex flex-col group h-full transition-all duration-1000 ${className}`}>
      {/* Supernatural Ghost Corners */}
      <div className="absolute -top-2 -left-2 w-10 h-10 border-t-2 border-l-2 opacity-100 pointer-events-none z-30 transition-all duration-1000" style={{ borderColor: themeColor, filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>
      <div className="absolute -top-2 -right-2 w-10 h-10 border-t-2 border-r-2 opacity-100 pointer-events-none z-30 transition-all duration-1000" style={{ borderColor: themeColor, filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>
      <div className="absolute -bottom-2 -left-2 w-10 h-10 border-b-2 border-l-2 opacity-100 pointer-events-none z-30 transition-all duration-1000" style={{ borderColor: themeColor, filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>
      <div className="absolute -bottom-2 -right-2 w-10 h-10 border-b-2 border-r-2 opacity-100 pointer-events-none z-30 transition-all duration-1000" style={{ borderColor: themeColor, filter: `drop-shadow(0 0 10px ${themeColor})` }}></div>

      <div 
        className={`relative h-full flex flex-col bg-black/60 backdrop-blur-[60px] rounded-xs overflow-hidden border transition-all duration-1000 shadow-[0_30px_100px_rgba(0,0,0,1)]`}
        style={{ 
          borderColor: neonGlow ? `${themeColor}66` : 'rgba(255,255,255,0.05)',
          boxShadow: neonGlow ? `0 0 80px -20px ${themeColor}33, inset 0 0 40px ${themeColor}05` : 'none'
        }}
      >
        {/* Sub-pixel Grid substrate */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ 
          backgroundImage: `linear-gradient(${themeColor} 0.5px, transparent 0.5px), linear-gradient(90deg, ${themeColor} 0.5px, transparent 0.5px)`,
          backgroundSize: '32px 32px'
        }}></div>

        {/* Cinematic Header */}
        <div 
          className="flex items-center justify-between px-8 py-5 border-b select-none bg-white/[0.02] hover:bg-white/[0.04] transition-all"
          style={{ borderBottomColor: 'rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-6">
            <div className={`p-2.5 beveled-node rounded-xs ${neonGlow ? 'text-white glow-accent' : 'text-white/20'}`}>
              {icon || <Box size={20} strokeWidth={1} />}
            </div>
            <div className="flex flex-col">
              <h3 className={`text-[13px] font-space font-black tracking-[0.5em] uppercase transition-all ${neonGlow ? 'text-white glow-accent' : 'text-white/60 group-hover:text-white'}`}>
                {title}
              </h3>
              <span className="text-[7px] font-mono tracking-[1em] mt-1 opacity-20 uppercase">AUTH_TOKEN: {windowId}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {headerAction}
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onCollapse && onCollapse(); }}
                className="w-10 h-10 tactile-3d-node rounded-xs text-white/40 hover:text-white flex items-center justify-center transition-all group/collapse"
                title="Collapse Module"
              >
                <Minus size={18} strokeWidth={3} className="group-hover/collapse:glow-accent" />
              </button>
            </div>
          </div>
        </div>

        {/* Logical Context Strip */}
        <div className="flex items-center gap-8 px-8 py-3 bg-black/30 border-b border-white/5 text-[8px] font-mono uppercase tracking-[0.4em] overflow-hidden whitespace-nowrap opacity-30">
           <span className="flex items-center gap-3"><Layers size={10} style={{color: themeColor}} /> Layer_7_Encapsulation</span>
           <div className="w-1 h-1 rounded-full bg-white/10"></div>
           <span className="flex items-center gap-3"><ShieldCheck size={10} className="text-emerald-500" /> Kernel_Validated</span>
           <div className="w-1 h-1 rounded-full bg-white/10"></div>
           <span className="flex items-center gap-3"><Cpu size={10} /> Core_Optimized</span>
        </div>

        {/* Content Reservoir */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {children}
        </div>

        {/* Engineering Footer */}
        <div className="h-10 border-t border-white/5 flex items-center justify-between px-8 bg-black/60 shrink-0">
           <div className="flex items-center gap-4 opacity-10">
              <span className="text-[8px] font-mono tracking-[1em] uppercase">SYSTEM_STATE_ACTIVE_NODE_LINK</span>
           </div>
           <div className="flex items-center gap-4 opacity-10">
              <Crosshair size={14} />
              <GripHorizontal size={14} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default PortWindow;