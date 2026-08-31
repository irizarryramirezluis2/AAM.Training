import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ExternalLink } from 'lucide-react';

export default function LevelPage({ level, member, onUpdate, t }) {
  const { toast } = useToast();
  const [urls, setUrls] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const init = {};
    level.certFields.forEach(f => { init[f.id] = member[f.id] || ''; });
    setUrls(init);
  }, [level.id, member]);

  const handleSubmit = async () => {
    for (const f of level.certFields) {
      if (!urls[f.id]?.trim()) {
        toast({ title: level.certFields.length > 1 ? t("level.add_both") : t("level.add_link"), variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    const patch = {};
    level.certFields.forEach(f => { patch[f.id] = urls[f.id].trim(); });
    patch[`level${level.id}_cert_submitted`] = true;
    if (level.id === 2) patch.level2_cert2_submitted = true;
    const ok = await onUpdate(patch);
    if (ok) toast({ title: t("msg.submitted") });
    setSubmitting(false);
  };

  const complete = member[`level${level.id}_complete`];
  const submitted = level.id === 2
    ? member.level2_cert_submitted && member.level2_cert2_submitted
    : member[`level${level.id}_cert_submitted`];
  const status = complete ? t("level.status_approved") : submitted ? t("level.status_submitted") : t("level.status_not_submitted");

  return (
    <div className="glass-card p-6 md:p-8 animate-rise">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--training-gold)' }}>Level {level.id}</p>
      <h2 className="heading-font text-2xl mt-2" style={{ color: 'var(--training-ink)' }}>{t(level.titleKey)}</h2>
      <p className="mt-3 leading-relaxed" style={{ color: 'var(--training-muted)' }}>{t(level.descKey)}</p>
      <div className="grid lg:grid-cols-2 gap-6 mt-7">
        <div className="glass-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--training-gold)' }}>{t("level.course")}</p>
          <h3 className="font-bold mt-2" style={{ color: 'var(--training-ink)' }}>{level.certFields.length > 1 ? t("level.submit_certs") : t("level.submit_cert")}</h3>
          {level.certFields.map(f => (
            <div key={f.id}>
              <label className="block text-sm mt-4 mb-2" style={{ color: 'var(--training-ink)' }}>{t(f.labelKey)}</label>
              <input value={urls[f.id] || ''} onChange={e => setUrls(prev => ({ ...prev, [f.id]: e.target.value }))} className="input-field" placeholder="https://canva.com/certificates/..." />
            </div>
          ))}
          <button onClick={handleSubmit} disabled={submitting || complete} className="btn-primary mt-4">
            {complete ? t("level.status_approved") : t("level.submit_btn")}
          </button>
          <p className="text-sm mt-3" style={{ color: complete ? 'var(--training-ok)' : 'var(--training-muted)' }}>{status}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--training-gold)' }}>{t("level.resources")}</p>
          <h3 className="font-bold mt-2" style={{ color: 'var(--training-ink)' }}>{t("level.resources_heading")}</h3>
          {level.resources.map(r => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 py-3 border-b last:border-0 transition hover:opacity-80"
              style={{ borderColor: 'var(--training-line)', color: 'var(--training-blue)' }}>
              <span className="font-bold text-sm">{r.label}</span>
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}