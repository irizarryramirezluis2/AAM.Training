import { Award, MessagesSquare, Settings, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { isUnlocked, getAdminLevel } from '@/lib/trainingConfig';

export default function Dashboard({ member, onNavigate, t }) {
  const steps = [
    { key: 'level1', done: member.level1_complete, label: t("nav.level1") },
    { key: 'level2', done: member.level2_complete, label: t("nav.level2") },
    { key: 'level3', done: member.level3_complete, label: t("nav.level3") },
    { key: 'exercise', done: member.submission_status === 'approved', label: t("nav.exercise") },
  ];
  const doneCount = steps.filter(s => s.done).length;

  return (
    <div className="space-y-6 animate-rise">
      <div className="glass-card p-6 md:p-9">
        <p className="text-xs tracking-[.18em] uppercase font-bold" style={{ color: 'var(--training-gold)' }}>{t("dash.pathway")}</p>
        <h2 className="heading-font text-2xl md:text-3xl mt-2" style={{ color: 'var(--training-ink)' }}>{t("dash.heading")}</h2>
        <p className="mt-4 leading-relaxed" style={{ color: 'var(--training-muted)' }}>{t("dash.body")}</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-7">
          <button onClick={() => onNavigate('achievements')} className="btn-ghost text-left">
            <Award className="w-5 h-5 mb-2" style={{ color: 'var(--training-gold)' }} />
            <strong className="block">{t("dash.achievements")}</strong>
            <span className="block text-xs mt-1" style={{ color: 'var(--training-muted)' }}>{t("dash.achievements_desc")}</span>
          </button>
          <button onClick={() => onNavigate('qa')} className="btn-ghost text-left">
            <MessagesSquare className="w-5 h-5 mb-2" style={{ color: 'var(--training-gold)' }} />
            <strong className="block">{t("dash.qa")}</strong>
            <span className="block text-xs mt-1" style={{ color: 'var(--training-muted)' }}>{t("dash.qa_desc")}</span>
          </button>
          <button onClick={() => onNavigate('settings')} className="btn-ghost text-left">
            <Settings className="w-5 h-5 mb-2" style={{ color: 'var(--training-gold)' }} />
            <strong className="block">{t("dash.settings")}</strong>
            <span className="block text-xs mt-1" style={{ color: 'var(--training-muted)' }}>{t("dash.settings_desc")}</span>
          </button>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--training-ink)' }}>{t("dash.pathway")}</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((s, i) => {
            const unlocked = isUnlocked(s.key, member);
            return (
              <button key={s.key} onClick={() => onNavigate(s.key)} disabled={!unlocked}
                className={`glass-card p-4 text-left transition ${!unlocked ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--training-gold)' }}>STEP {i + 1}</span>
                  {s.done ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--training-ok)' }} /> : !unlocked ? <Lock className="w-4 h-4" style={{ color: 'var(--training-muted)' }} /> : <ArrowRight className="w-4 h-4" style={{ color: 'var(--training-muted)' }} />}
                </div>
                <p className="font-bold text-sm" style={{ color: 'var(--training-ink)' }}>{s.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--training-muted)' }}>{s.done ? t("level.complete") : unlocked ? t("level.ready") : t("level.locked")}</p>
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--training-muted)' }}>
            <span>{doneCount} / {steps.length} {t("popup.achievements_unlocked")}</span>
            <span>{Math.round((doneCount / steps.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${(doneCount / steps.length) * 100}%`, background: 'linear-gradient(90deg, var(--training-gold), var(--training-gold-deep))' }} />
          </div>
        </div>
      </div>
    </div>
  );
}