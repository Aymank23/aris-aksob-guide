import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

interface PageTourProps {
  steps: TourStep[];
  storageKey: string;
  label: string;
}

const PageTour = ({ steps, storageKey, label }: PageTourProps) => {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const currentStep = steps[step];

  const positionTooltip = useCallback(() => {
    if (!active || !currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [active, currentStep]);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setActive(true);
      localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  useEffect(() => {
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [positionTooltip]);

  const close = () => { setActive(false); setStep(0); };
  const next = () => step < steps.length - 1 ? setStep(step + 1) : close();
  const prev = () => step > 0 && setStep(step - 1);
  const startTour = () => { setStep(0); setActive(true); };

  if (!active || !rect) {
    return (
      <Button variant="outline" size="sm" onClick={startTour} className="gap-1.5">
        <HelpCircle className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  const maskId = `tour-mask-${storageKey}`;

  const tooltipStyle = (): React.CSSProperties => {
    const pad = 12;
    const base: React.CSSProperties = { position: 'fixed', zIndex: 100, maxWidth: 340 };
    switch (currentStep.placement) {
      case 'bottom':
        return { ...base, top: rect.bottom + pad, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
      case 'top':
        return { ...base, bottom: window.innerHeight - rect.top + pad, left: rect.left + rect.width / 2, transform: 'translateX(-50%)' };
      case 'right':
        return { ...base, top: rect.top + rect.height / 2, left: rect.right + pad, transform: 'translateY(-50%)' };
      case 'left':
        return { ...base, top: rect.top + rect.height / 2, right: window.innerWidth - rect.left + pad, transform: 'translateY(-50%)' };
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={close}>
        <svg className="w-full h-full">
          <defs>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - 6} y={rect.top - 6}
                width={rect.width + 12} height={rect.height + 12}
                rx={8} fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="hsl(167 50% 10% / 0.5)" mask={`url(#${maskId})`} />
        </svg>
      </div>

      <div
        className="fixed z-[95] rounded-lg ring-2 ring-primary pointer-events-none"
        style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
      />

      <div
        style={tooltipStyle()}
        className="z-[100] bg-card border border-border rounded-lg shadow-lg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-semibold text-foreground">{currentStep.title}</h4>
          <button onClick={close} className="text-muted-foreground hover:text-foreground -mt-1 -mr-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{currentStep.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{step + 1} / {steps.length}</span>
          <div className="flex gap-1.5">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={prev} className="h-7 px-2 text-xs">
                <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-7 px-3 text-xs">
              {step === steps.length - 1 ? 'Finish' : 'Next'} {step < steps.length - 1 && <ChevronRight className="h-3 w-3 ml-0.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PageTour;
