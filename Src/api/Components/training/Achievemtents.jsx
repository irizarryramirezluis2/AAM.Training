import { Palette, LayoutTemplate, Sparkles, Award } from 'lucide-react';

export default function Achievements({ member, t }) {
  const badges = [
    { id: 'l1', icon: Palette, label: t("ach.l1"), unlocked: member.level1_complete },
    { id: 'l2', icon: LayoutTemplate, label: t("ach.l2"), unlocked: member.level2_complete },
    { id: 'l3', icon: Sparkles, label: t("ach.l3"), unlocked: member.level3_complete },
    { id: 'cert', icon: Award, label: t("ach.certified"), unlocked: member.certified },
  ];
  return (
    <div className="glass-card p-6 md:p-8 text-center animate-rise">
      <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{t("ach.title")}</h2>
      <p className="mt-3" style={{ color: 'var(--training-muted)' }}>{t("ach.desc")}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        {badges.map(b => {
          const Icon = b.icon;
          return (
            <article key={b.id} className="glass-card p-5 transition" style={{ opacity: b.unlocked ? 1 : 0.35 }}>
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center" style={{ background: b.unlocked ? 'linear-gradient(135deg, var(--training-gold), var(--training-gold-deep))' : 'var(--training-glass)' }}>
                <Icon className="w-8 h-8" style={{ color: b.unlocked ? '#152033' : 'var(--training-muted)' }} />
              </div>
              <h3 className="font-bold mt-4" style={{ color: 'var(--training-ink)' }}>{b.label}</h3>
              <p className="text-xs mt-1" style={{ color: b.unlocked ? 'var(--training-ok)' : 'var(--training-muted)' }}>
                {b.unlocked ? t("level.complete") : t("level.locked")}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}