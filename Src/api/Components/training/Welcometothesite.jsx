import { useState } from 'react';
import { X, ArrowRight, Check } from 'lucide-react';

export default function WelcomeTour({ onFinish, onSkip, t }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: t("tour.welcome"), desc: t("tour.step1") },
    { title: t("nav.level1") + " → " + t("nav.level3"), desc: t("tour.step2") },
    { title: t("nav.exercise"), desc: t("tour.step3") },
    { title: t("nav.qa"), desc: t("tour.step4") },
    { title: t("nav.settings"), desc: t("tour.step5") },
  ];
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center animate-rise">
        <button onClick={onSkip} className="btn-ghost p-2 rounded-lg absolute top-4 right-4"><X className="w-4 h-4" /></button>
        <div className="flex gap-1.5 justify-center mb-6">
          {steps.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? '24px' : '8px', background: i <= step ? 'var(--training-gold)' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
        <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--training-gold)' }}>Step {step + 1} / {steps.length}</p>
        <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{current.title}</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--training-muted)' }}>{current.desc}</p>
        <div className="flex gap-2 mt-6">
          <button onClick={onSkip} className="btn-ghost flex-1">{t("tour.skip")}</button>
          {isLast ? (
            <button onClick={onFinish} className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {t("tour.finish")}
            </button>
          ) : (
            <button onClick={() => setStep(step + 1)} className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
              {t("tour.next")} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}