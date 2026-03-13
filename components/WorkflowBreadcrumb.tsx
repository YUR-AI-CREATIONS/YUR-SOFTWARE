import React from 'react';
import { Upload, CheckCircle, GitBranch, FolderTree, Boxes, Code, Rocket, Award, ChevronRight } from 'lucide-react';
import type { WorkflowStep } from '../types';

interface WorkflowBreadcrumbProps {
  activeStep: number;
  onStepChange: (step: number) => void;
}

const steps: { id: WorkflowStep; label: string; icon: React.FC<any> }[] = [
  { id: 'upload', label: 'Upload & Analyze', icon: Upload },
  { id: 'verify', label: 'Verify Understanding', icon: CheckCircle },
  { id: 'workflow', label: 'Build Workflow', icon: GitBranch },
  { id: 'filestructure', label: 'File Structure', icon: FolderTree },
  { id: 'architecture', label: 'Architecture', icon: Boxes },
  { id: 'implementation', label: 'Implementation', icon: Code },
  { id: 'deployment', label: 'Deployment', icon: Rocket },
  { id: 'certification', label: 'Certification', icon: Award },
];

const WorkflowBreadcrumb: React.FC<WorkflowBreadcrumbProps> = ({ activeStep, onStepChange }) => {
  return (
    <div className="relative z-10 flex items-center gap-0.5 px-3 py-2 bg-[#172018]/50 backdrop-blur-lg border-b border-emerald-400/15 overflow-x-auto no-scrollbar">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === activeStep;
        const isPast = i < activeStep;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepChange(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-space tracking-wide whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-sm shadow-emerald-500/10'
                  : isPast
                  ? 'text-emerald-300/70 hover:text-emerald-200 hover:bg-emerald-500/10'
                  : 'text-emerald-400/50 hover:text-emerald-300/70 hover:bg-emerald-500/10'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-emerald-400' : ''} />
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight size={12} className="text-emerald-500/40 flex-shrink-0 mx-0.5" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WorkflowBreadcrumb;
