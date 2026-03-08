import { Info } from 'lucide-react';

interface ToolInstructionsProps {
  title?: string;
  steps: string[];
}

export function ToolInstructions({ title = "How to use", steps }: ToolInstructionsProps) {
  return (
    <div className="w-full bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 md:p-6 mb-8 mt-4 transition-all hover:bg-blue-500/10">
      <div className="flex items-center gap-2 mb-4 text-blue-400">
        <Info className="w-5 h-5" />
        <h3 className="font-semibold text-sm tracking-wide uppercase">{title}</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-sm border border-blue-500/30 shadow-sm shadow-blue-500/10">
              {index + 1}
            </div>
            <p className="text-gray-400 text-sm leading-relaxed pt-1">
              {step}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
