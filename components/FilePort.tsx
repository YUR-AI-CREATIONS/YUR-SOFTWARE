
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, File, X, Database, CheckCircle, Loader2,
  Archive, FileArchive, Layers, ChevronRight, PlayCircle, Sparkles, Wand2,
  FolderOpen, Terminal, Activity, FileSearch, Binary, Cpu, ShieldAlert,
  FileText, ImageIcon, Eye, Maximize2, ZoomIn, Search, FileSignature
} from 'lucide-react';
import { FileMetadata } from '../types';
import { TFNKernel } from '../services/TFNKernel';

interface ProcessedFile extends FileMetadata {
  status: 'uploading' | 'analyzing' | 'extracting' | 'indexing' | 'ready' | 'error';
  progress: number;
  isExpanded?: boolean;
  extractedFiles?: { name: string; size: string; type: string; status: string }[];
  sectors?: boolean[];
}

interface Props {
  themeColor: string;
  onFileAdded?: (file: FileMetadata) => void;
}

const FilePort: React.FC<Props> = ({ themeColor, onFileAdded }) => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateForensics = (fileId: string, isZip: boolean) => {
    let progress = 0;
    const phases: ProcessedFile['status'][] = isZip 
      ? ['uploading', 'analyzing', 'extracting', 'indexing', 'ready']
      : ['uploading', 'analyzing', 'ready'];
    
    let currentPhaseIdx = 0;

    const interval = setInterval(() => {
      progress += Math.random() * (isZip ? 2 : 10);
      
      if (progress >= 100) {
        progress = 0;
        currentPhaseIdx++;
        
        if (currentPhaseIdx >= phases.length) {
          clearInterval(interval);
          setFiles(prev => prev.map(f => {
            if (f.id === fileId) {
              const extracted = isZip ? [
                { name: 'config_manifest.json', size: '2.4KB', type: 'json', status: 'verified' },
                { name: 'asset_sub_core_01.png', size: '4.8MB', type: 'image', status: 'verified' },
                { name: 'neural_weights_alpha.bin', size: '128MB', type: 'binary', status: 'active' },
                { name: 'README_LEGAL.md', size: '12KB', type: 'document', status: 'indexed' },
                { name: 'training_data_sector_0.dat', size: '1.2GB', type: 'large_data', status: 'reconstructing' }
              ] : undefined;
              
              TFNKernel.audit({ 
                layer: 'orchestration', 
                action: isZip ? 'LARGE_ZIP_FORENSICS_COMPLETE' : 'ARTIFACT_MOUNTED', 
                task: { fileId, name: f.name } 
              });
              
              return { 
                ...f, 
                status: 'ready', 
                progress: 100, 
                extractedFiles: extracted,
                sectors: Array(48).fill(true)
              };
            }
            return f;
          }));
        } else {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: phases[currentPhaseIdx], progress: 0 } : f));
        }
      } else {
        setFiles(prev => prev.map(f => {
          if (f.id === fileId) {
            const newSectors = Array(48).fill(false).map((_, i) => i < (progress / 100) * 48);
            return { ...f, progress, sectors: newSectors };
          }
          return f;
        }));
      }
    }, 120);
  };

  const handleFiles = async (inputFiles: FileList | null) => {
    if (!inputFiles) return;
    const fileList = Array.from(inputFiles);
    
    const newProcessedFiles: ProcessedFile[] = fileList.map(f => {
      const fileId = `NODE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const isZip = f.name.endsWith('.zip');
      const isImage = f.type.startsWith('image/');
      const isPDF = f.type === 'application/pdf';
      
      let previewUrl = undefined;
      if (isImage || isPDF) {
        previewUrl = URL.createObjectURL(f);
      }

      simulateForensics(fileId, isZip);
      
      return {
        id: fileId,
        name: f.name,
        size: f.size,
        type: isZip ? 'zip' : (f.name.split('.').pop()?.toLowerCase() || 'raw'),
        path: `vault/${f.name}`,
        status: 'uploading',
        progress: 0,
        isExpanded: false,
        sectors: Array(48).fill(false),
        previewUrl
      };
    });

    setFiles(prev => [...newProcessedFiles, ...prev]);
  };

  const toggleExpand = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f));
  };

  return (
    <div className="flex flex-col h-full bg-black/40">
      <div 
        className={`p-10 border-b border-white/5 transition-all duration-700 ${isDragging ? 'bg-yellow-500/10 scale-[0.99]' : 'bg-transparent'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-xs bg-white/[0.01] cursor-pointer hover:bg-white/[0.03] hover:border-yellow-500/40 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 translate-y-[-100%] animate-scan-slow opacity-30 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 p-8 rounded-full bg-black/60 border border-white/5 text-white/10 group-hover:text-yellow-400 group-hover:border-yellow-500/40 group-hover:shadow-[0_0_40px_rgba(var(--neon-accent-rgb),0.3)] transition-all">
              <Upload size={40} strokeWidth={1} className="group-hover:glow-accent" />
            </div>
            <h4 className="text-[14px] font-space font-black uppercase tracking-[0.8em] text-white/40 group-hover:text-white transition-colors glow-accent">Neural_Ingestion_Core</h4>
            <p className="text-[9px] font-mono mt-4 opacity-20 uppercase tracking-[0.4em]">Mount local artifacts to the vault for decomposition</p>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            className="hidden" 
            onChange={(e) => handleFiles(e.target.files)} 
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-8 no-scrollbar">
        {files.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-[0.05] select-none">
            <Archive size={100} strokeWidth={0.5} className="animate-pulse" />
            <span className="text-[14px] uppercase mt-8 font-black tracking-[1.2em] glow-accent">Vault_Standby</span>
          </div>
        )}
        
        {files.map(file => (
          <div key={file.id} className="relative bg-black/60 glass-panel rounded-xs overflow-hidden group/file transition-all hover:bg-black/80">
            {file.status !== 'ready' && (
              <div 
                className="absolute top-0 left-0 h-[2px] bg-yellow-500 shadow-[0_0_20px_var(--neon-accent)] transition-all duration-300 z-20" 
                style={{ width: `${file.progress}%` }}
              ></div>
            )}

            <div 
              className="flex items-start gap-10 p-8 cursor-pointer"
              onClick={() => toggleExpand(file.id)}
            >
              {/* Tactical Thumbnail */}
              <div className={`w-28 h-28 rounded-xs tactile-3d-node flex items-center justify-center shrink-0 transition-all group-hover/file:scale-105 overflow-hidden ${file.type === 'zip' ? 'bg-amber-500/5 border-amber-500/20 text-amber-500/40' : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400/40'}`}>
                {file.status === 'ready' && file.previewUrl ? (
                  file.type === 'pdf' ? (
                    <div className="w-full h-full bg-red-900/10 flex flex-col items-center justify-center relative p-3 text-center">
                       <FileText size={32} className="text-red-500/40 mb-2" />
                       <span className="text-[7px] font-mono opacity-40 uppercase tracking-widest">PDF_BLOB</span>
                       <div className="absolute inset-x-0 bottom-0 h-6 bg-black/80 flex items-center justify-center border-t border-white/5">
                          <Eye size={12} className="text-white opacity-40" />
                       </div>
                    </div>
                  ) : (
                    <img src={file.previewUrl} className="w-full h-full object-cover opacity-80 group-hover/file:opacity-100 transition-opacity" alt="Preview" />
                  )
                ) : (
                  file.type === 'zip' ? <FileArchive size={40} /> : <File size={40} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-[16px] font-space font-black text-white truncate tracking-widest glow-accent">{file.name}</span>
                    <span className="text-[7px] font-mono opacity-20 uppercase tracking-[0.5em] mt-2">LINK_ID: <span className="glow-accent">{file.id}</span></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleExpand(file.id); }}
                      className={`p-3 tactile-3d-node rounded-xs text-white/40 hover:text-white transition-all ${file.isExpanded ? 'active' : ''}`}
                    >
                      <Maximize2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter(f => f.id !== file.id)); }} 
                      className="p-3 tactile-3d-node rounded-xs text-white/10 hover:text-red-400 transition-all"
                    >
                      <X size={16}/>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mt-5 mb-5">
                  {file.sectors?.map((active, i) => (
                    <div 
                      key={i} 
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 ${active ? 'bg-yellow-500/50 scale-100 shadow-[0_0_8px_rgba(255,215,0,0.4)] glow-accent' : 'bg-white/[0.04] scale-75'}`}
                    ></div>
                  ))}
                </div>

                <div className="flex items-center gap-8">
                  <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">SIZE_METRIC: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  <div className="w-[1px] h-3 bg-white/10"></div>
                  <span className={`text-[9px] font-mono font-black uppercase tracking-[0.3em] ${file.status === 'error' ? 'text-red-400' : 'text-yellow-400 glow-accent'}`}>
                    {file.status} <span className="opacity-40">{file.status !== 'ready' && `[${Math.floor(file.progress)}%]`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* EXPANDABLE LARGE PREVIEW AREA */}
            {file.status === 'ready' && file.isExpanded && (file.previewUrl || file.type === 'zip') && (
              <div className="px-8 pb-8 animate-in zoom-in-95 duration-700">
                <div className="tactile-3d-node bg-black/90 border border-white/10 rounded-xs p-8 space-y-6 relative overflow-hidden">
                   {/* Scanning Line Effect for Active Previews */}
                   <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 translate-y-[-100%] animate-scan-slow opacity-20 pointer-events-none z-10"></div>

                   {/* Preview Content */}
                   {(file.type === 'png' || file.type === 'jpg' || file.type === 'jpeg' || file.type === 'webp') && file.previewUrl ? (
                     <div className="relative group/preview rounded-xs border border-white/5 overflow-hidden bg-black/50 aspect-video flex items-center justify-center">
                        <img src={file.previewUrl} className="w-full h-full object-contain relative z-0" alt="Expanded view" />
                        <div className="absolute bottom-6 left-6 flex flex-col gap-2 z-20">
                           <div className="flex items-center gap-4 bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10 rounded-xs">
                              <ImageIcon size={14} className="text-yellow-400 glow-accent" />
                              <span className="text-[9px] font-mono uppercase tracking-widest text-white/60">Pixel_Buffer_Rendered</span>
                           </div>
                        </div>
                     </div>
                   ) : file.type === 'pdf' && file.previewUrl ? (
                     <div className="relative rounded-xs border border-white/10 overflow-hidden bg-white/5 h-[600px] flex flex-col shadow-2xl">
                        <div className="h-12 bg-black/80 border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-20">
                           <div className="flex items-center gap-4">
                              <FileSignature size={16} className="text-red-400 glow-accent" />
                              <span className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/80">PDF_Forensics_Stream</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <button className="text-[8px] font-mono opacity-40 hover:opacity-100 uppercase tracking-widest">Download_Copy</button>
                           </div>
                        </div>
                        <iframe 
                          src={`${file.previewUrl}#toolbar=0&view=FitH`} 
                          className="w-full h-full border-none relative z-10 invert-[0.85] hue-rotate-180 contrast-125" 
                        />
                        <div className="absolute inset-0 pointer-events-none border-[12px] border-black/40 z-20"></div>
                     </div>
                   ) : file.type === 'zip' ? (
                     <div className="space-y-6">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.5em] opacity-30 border-b border-white/10 pb-4">
                           <div className="flex items-center gap-4"><Binary size={16} className="text-yellow-500 glow-accent"/> ARCHIVE_NEST_HIERARCHY</div>
                           <span>STRUCTURED_NODES: {file.extractedFiles?.length}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {file.extractedFiles?.map((ef, idx) => (
                            <div key={idx} className="flex items-center justify-between p-5 bg-white/[0.02] tactile-3d-node rounded-xs hover:border-yellow-500/40 transition-all group/ef">
                               <div className="flex items-center gap-6 min-w-0">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500/20 group-hover/ef:bg-yellow-500 transition-colors shadow-[0_0_10px_rgba(var(--neon-accent-rgb),0.3)]"></div>
                                  <span className="text-[12px] font-mono text-white/50 truncate group-hover/ef:text-white transition-colors tracking-tight">{ef.name}</span>
                               </div>
                               <div className="flex items-center gap-6 shrink-0">
                                  <span className="text-[9px] font-mono opacity-20 uppercase tracking-widest">{ef.size}</span>
                                  <div className={`w-1.5 h-1.5 rounded-full ${ef.status === 'reconstructing' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500/40 shadow-[0_0_8px_#10b981]'}`}></div>
                                  <span className={`text-[10px] font-mono uppercase font-black tracking-widest ${ef.status === 'reconstructing' ? 'text-amber-500/60' : 'text-emerald-500/60 glow-green'}`}>{ef.status}</span>
                               </div>
                            </div>
                          ))}
                        </div>
                     </div>
                   ) : (
                     <div className="p-20 text-center opacity-20 flex flex-col items-center gap-6">
                        <FileSearch size={64} strokeWidth={0.5} />
                        <p className="text-[10px] font-mono uppercase tracking-[0.6em]">No visual projection available for raw data</p>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-6 pt-4 relative z-20">
                      <button className="py-4 tactile-3d-node border-yellow-500/30 bg-yellow-500/10 text-[11px] font-black uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-4 group glow-accent">
                         <FolderOpen size={16} className="opacity-40 group-hover:opacity-100" /> MOUNT_DIRECTIVE
                      </button>
                      <button className="py-4 tactile-3d-node border-white/10 bg-white/[0.04] text-[11px] font-black uppercase tracking-[0.6em] transition-all flex items-center justify-center gap-4 group">
                         <Cpu size={16} className="opacity-40 group-hover:opacity-100" /> NEURAL_PROCESS
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-8 border-t border-white/5 bg-black/95 flex items-center justify-between text-[10px] font-mono opacity-40 uppercase tracking-[0.8em] font-black">
         <div className="flex items-center gap-12">
            <span className="flex items-center gap-4 text-emerald-500 glow-green"><Activity size={14} /> KERNEL_SYMMETRY_VERIFIED</span>
            <span className="flex items-center gap-4"><Database size={14} /> VAULT_INDEX: {files.length}_NODES</span>
         </div>
         <div className="flex items-center gap-4">
            <ShieldAlert size={14} className="text-amber-500/40" />
            <span>ENCRYPT_NODE: <span className="glow-accent">{Math.floor(Math.random()*10000)}</span></span>
         </div>
      </div>
      
      <style>{`
        @keyframes scan-slow {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .animate-scan-slow {
          animation: scan-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default FilePort;