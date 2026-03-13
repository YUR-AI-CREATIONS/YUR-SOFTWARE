
import React, { useState, useEffect } from 'react';
import { TFNKernel } from './services/TFNKernel';
import { geminiService } from './services/geminiService';
import './services/AgentService'; // Initialize agent engines on startup
import './services/ollamaService'; // Initialize Ollama engine
import './services/WebAgentService'; // Initialize web browsing engines
import './services/anthropicService'; // Initialize Anthropic/Claude engine
import { ChatProvider, EditorTab } from './types';
import { agentService } from './services/AgentService';
import type { ProjectFile } from './services/backendApi';

import ParticleBackground from './components/ParticleBackground';
import HeaderBar from './components/HeaderBar';
import WorkflowBreadcrumb from './components/WorkflowBreadcrumb';
import ChatPanel from './components/ChatPanel';
import CodeEditorPanel from './components/CodeEditorPanel';
import BashTerminal from './components/BashTerminal';
import TrustVault from './components/TrustVault';

const App: React.FC = () => {
  const [language, setLanguage] = useState('Python');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('code');
  const [currentProvider, setCurrentProvider] = useState<ChatProvider>('Gemini');
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);

  useEffect(() => {
    TFNKernel.audit({ layer: 'kernel', action: 'FRANKLIN_OS_v3.0_LOADED' });
    // Connect agent service to push project files to the editor
    agentService.setProjectFilesCallback((files) => {
      setProjectFiles(files);
      setActiveEditorTab('code');
    });
    return () => agentService.setProjectFilesCallback(null);
  }, []);

  // Auto-switch to browser tab when browse starts
  useEffect(() => {
    const handler = () => setActiveEditorTab('browser');
    window.addEventListener('tfn:browse-started', handler);
    return () => window.removeEventListener('tfn:browse-started', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#141e16] text-emerald-100 overflow-hidden relative">
      {/* Background */}
      <ParticleBackground />

      {/* Header */}
      <HeaderBar
        language={language}
        onLanguageChange={setLanguage}
        currentProvider={currentProvider}
        onProviderChange={setCurrentProvider}
      />

      {/* Workflow Breadcrumb */}
      <WorkflowBreadcrumb activeStep={activeWorkflowStep} onStepChange={setActiveWorkflowStep} />

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Left Column - Chat (25%) */}
        <div className="w-[25%] border-r border-emerald-400/15 flex flex-col min-w-[280px] glass-column">
          <ChatPanel provider={currentProvider} />
        </div>

        {/* Center Column - Code Editor (45%) */}
        <div className="w-[45%] border-r border-emerald-400/15 flex flex-col glass-column">
          <CodeEditorPanel activeTab={activeEditorTab} onTabChange={setActiveEditorTab} projectFiles={projectFiles} />
        </div>

        {/* Right Column - Terminal + Trust Vault (30%) */}
        <div className="w-[30%] flex flex-col min-w-[260px] glass-column">
          {/* Bash Terminal - Top Half */}
          <div className="flex-1 border-b border-emerald-400/15 min-h-0">
            <BashTerminal />
          </div>
          {/* Trust Vault - Bottom Half */}
          <div className="flex-1 min-h-0">
            <TrustVault />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
