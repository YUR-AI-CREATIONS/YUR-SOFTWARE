import React, { useState, useEffect } from 'react';
import type { EditorTab } from '../types';
import type { ProjectFile } from '../services/backendApi';
import FilePort from './FilePort';
import BrowserPanel from './BrowserPanel';

interface Props {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  projectFiles?: ProjectFile[];
}

const tabs: { id: EditorTab; label: string }[] = [
  { id: 'code', label: 'CODE' },
  { id: 'files', label: 'FILES' },
  { id: 'verification', label: 'VERIFICATION' },
  { id: 'workflow', label: 'WORKFLOW' },
  { id: 'architecture', label: 'ARCHITECTURE' },
  { id: 'deployment', label: 'DEPLOYMENT' },
  { id: 'env', label: 'ENV' },
  { id: 'certification', label: 'CERTIFICATION' },
  { id: 'browser', label: 'BROWSER' },
];

const CodeEditorPanel: React.FC<Props> = ({ activeTab, onTabChange, projectFiles }) => {
  const [code, setCode] = useState('// Welcome to FRANKLIN OS\n// Upload files or describe your project to begin');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [envVars, setEnvVars] = useState([
    { key: 'GEMINI_API_KEY', value: '••••••••••••••••' },
    { key: 'NODE_ENV', value: 'development' },
    { key: 'PORT', value: '3000' },
  ]);

  // When project files arrive, show the first one and switch to CODE tab
  useEffect(() => {
    if (projectFiles && projectFiles.length > 0) {
      setActiveFileIndex(0);
      setCode(projectFiles[0].content);
      onTabChange('code');
    }
  }, [projectFiles]);

  // When switching file tabs, update the code
  const switchToFile = (index: number) => {
    if (projectFiles && projectFiles[index]) {
      setActiveFileIndex(index);
      setCode(projectFiles[index].content);
    }
  };

  const lines = code.split('\n');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'code':
        return (
          <div className="flex flex-col h-full">
            {/* File tabs — only show when project files exist */}
            {projectFiles && projectFiles.length > 0 && (
              <div className="flex items-center gap-0 border-b border-emerald-400/10 overflow-x-auto no-scrollbar flex-shrink-0 bg-[#0d1610]">
                {projectFiles.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => switchToFile(i)}
                    className={`px-3 py-1.5 text-[10px] font-mono whitespace-nowrap transition-all border-r border-emerald-400/10 ${
                      i === activeFileIndex
                        ? 'text-emerald-200 bg-emerald-500/15 border-b-2 border-b-emerald-400'
                        : 'text-emerald-400/40 hover:text-emerald-300 hover:bg-emerald-500/5'
                    }`}
                  >
                    {f.path}
                  </button>
                ))}
              </div>
            )}
            {/* Editor area */}
            <div className="flex flex-1 font-mono text-sm min-h-0 overflow-auto">
              {/* Line numbers */}
              <div className="py-4 px-3 text-right select-none border-r border-emerald-400/15 flex-shrink-0 min-w-[40px]">
                {lines.map((_, i) => (
                  <div key={i} className="text-[11px] leading-6 text-emerald-400/40">{i + 1}</div>
                ))}
              </div>
              {/* Code area */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent p-4 text-[12px] leading-6 text-emerald-100 outline-none resize-none font-mono"
                style={{ tabSize: 2 }}
              />
            </div>
          </div>
        );

      case 'files':
        return (
          <div className="h-full overflow-auto">
            {projectFiles && projectFiles.length > 0 ? (
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                  <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">
                    Project Files ({projectFiles.length})
                  </span>
                </div>
                {projectFiles.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => { switchToFile(i); onTabChange('code'); }}
                    className="w-full text-left border border-emerald-400/15 rounded-md p-3 hover:bg-emerald-500/10 transition-colors group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-mono text-emerald-200/90 group-hover:text-emerald-100">
                        {f.path}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400/50">
                        {f.size > 1000 ? `${(f.size / 1000).toFixed(1)}KB` : `${f.size}B`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <FilePort themeColor="#00FF88" />
            )}
          </div>
        );

      case 'verification':
        return (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
              <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Verification Engine</span>
            </div>
            <div className="border border-emerald-400/15 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-emerald-200/80">Type Safety</span>
                <span className="text-[10px] font-mono text-emerald-400">PASS</span>
              </div>
              <div className="w-full h-1 bg-emerald-500/10 rounded-full">
                <div className="h-full w-full bg-emerald-500/40 rounded-full" />
              </div>
            </div>
            <div className="border border-emerald-400/15 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-emerald-200/80">Lint Check</span>
                <span className="text-[10px] font-mono text-emerald-400">PASS</span>
              </div>
              <div className="w-full h-1 bg-emerald-500/10 rounded-full">
                <div className="h-full w-full bg-emerald-500/40 rounded-full" />
              </div>
            </div>
            <div className="border border-emerald-400/15 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-mono text-emerald-200/80">Security Audit</span>
                <span className="text-[10px] font-mono text-emerald-400">PASS</span>
              </div>
              <div className="w-full h-1 bg-emerald-500/10 rounded-full">
                <div className="h-full w-full bg-emerald-500/40 rounded-full" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-400/50 font-mono mt-4">All checks passed. Project ready for next stage.</p>
          </div>
        );

      case 'workflow':
        return (
          <div className="p-6 space-y-4">
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Active Directives</span>
            {[
              { name: 'Viral Content Engine', progress: 78 },
              { name: 'Affiliate Branding Bot', progress: 45 },
              { name: 'Music Production Sync', progress: 92 },
            ].map((d, i) => (
              <div key={i} className="border border-emerald-400/15 rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] text-emerald-200/90 font-mono">{d.name}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{d.progress}%</span>
                </div>
                <div className="w-full h-1 bg-emerald-500/10 rounded-full">
                  <div className="h-full bg-emerald-500/40 rounded-full transition-all" style={{ width: `${d.progress}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-4 border border-emerald-400/15 rounded-md p-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-emerald-200/70 font-mono">Trinity Orchestration</span>
                <span className="text-[10px] font-mono text-emerald-400">88%</span>
              </div>
            </div>
          </div>
        );

      case 'architecture':
        return (
          <div className="p-6 space-y-3">
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">System Architecture</span>
            <div className="font-mono text-[11px] text-emerald-200/70 leading-6 whitespace-pre">{`
┌─────────────────────────────────────┐
│         FRANKLIN OS v3.0            │
├─────────────┬───────────────────────┤
│  Governance │  TFN Kernel           │
│  (Franklin) │  ├── Auth Layer       │
│             │  ├── Engine Registry   │
│  Authority  │  └── Audit Pipeline   │
├─────────────┼───────────────────────┤
│  Orchestr.  │  Service Mesh         │
│  (Trinity)  │  ├── Gemini Pro       │
│             │  ├── Gemini Flash     │
│  Routing    │  ├── Image Gen        │
│             │  └── Video Synth      │
├─────────────┼───────────────────────┤
│  Evolution  │  Data Layer           │
│  (Neo-3)    │  ├── MongoDB          │
│             │  ├── Supabase         │
│  Optimize   │  └── Trust Vault      │
└─────────────┴───────────────────────┘`}
            </div>
          </div>
        );

      case 'deployment':
        return (
          <div className="p-6 space-y-3">
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Deployment Config</span>
            <div className="border border-emerald-400/15 rounded-md p-4 space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-emerald-200/70">Target</span>
                <span className="text-emerald-200">Vercel Edge</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-emerald-200/70">Region</span>
                <span className="text-emerald-200">US-East-1</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-emerald-200/70">Build</span>
                <span className="text-emerald-400">Ready</span>
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-emerald-200/70">SSL</span>
                <span className="text-emerald-400">Active</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2 rounded-md bg-emerald-600/40 hover:bg-emerald-500/40 text-xs font-mono text-emerald-200 transition-colors tracking-wider">
              DEPLOY NOW
            </button>
          </div>
        );

      case 'env':
        return (
          <div className="p-6 space-y-3">
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Environment Variables</span>
            {envVars.map((v, i) => (
              <div key={i} className="flex items-center gap-2 border border-emerald-400/15 rounded-md p-2">
                <span className="text-[11px] font-mono text-emerald-300/50 min-w-[140px]">{v.key}</span>
                <span className="text-[11px] font-mono text-emerald-200/30 flex-1">{v.value}</span>
              </div>
            ))}
            <button className="mt-2 text-[10px] font-mono text-emerald-500/40 hover:text-emerald-400/60 transition-colors">
              + Add Variable
            </button>
          </div>
        );

      case 'certification':
        return (
          <div className="p-6 space-y-3">
            <span className="text-xs font-mono text-emerald-300 uppercase tracking-wider">Certification Status</span>
            <div className="border border-emerald-400/15 rounded-md p-4 text-center">
              <div className="text-3xl mb-3">🛡️</div>
              <p className="text-xs font-mono text-emerald-200/80 mb-1">FRANKLIN_CERTIFIED</p>
              <p className="text-[10px] text-emerald-400/50 font-mono">All governance checks passed</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['Auth', 'Audit', 'Integrity'].map(c => (
                  <div key={c} className="py-1 rounded bg-emerald-500/10 text-[9px] font-mono text-emerald-400/60 text-center">{c} ✓</div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'browser':
        return <BrowserPanel />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-emerald-400/15 overflow-x-auto no-scrollbar flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2.5 text-[10px] font-mono tracking-wider whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-emerald-200 border-emerald-400 bg-emerald-500/10'
                : 'text-emerald-400/50 border-transparent hover:text-emerald-300 hover:bg-emerald-500/8'
            }`}
          >
            {tab.label}
            {tab.id === 'files' && projectFiles && projectFiles.length > 0 && (
              <span className="ml-1 px-1 py-0.5 bg-emerald-500/30 rounded text-[8px] text-emerald-300">{projectFiles.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto min-h-0 bg-[#121b14]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default CodeEditorPanel;
