
import React from 'react';
import { Step } from '../types';

interface StepWizardProps {
  currentStep: Step;
}

export const StepWizard: React.FC<StepWizardProps> = ({ currentStep }) => {
  const steps = [
    { id: Step.BasicInfo, label: "Profile" },
    { id: Step.Symptoms, label: "Assessment" },
    { id: Step.Review, label: "Confirm" },
    { id: Step.Result, label: "Guidance" }
  ];

  if (currentStep === Step.Intro) return null;

  return (
    <div className="mb-12 max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-100 z-0"></div>
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          const isResultStep = currentStep === Step.Result;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-3 relative z-10 group">
                <div 
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-premium ${
                    isActive ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-110" : 
                    isPast ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-100 text-slate-300"
                  }`}
                >
                  {isPast ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : index + 1}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive ? "text-indigo-600" : "text-slate-400"}`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
