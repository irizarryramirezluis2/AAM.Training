import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { SCENARIOS } from '@/lib/trainingConfig';
import { Upload, Link as LinkIcon } from 'lucide-react';

export default function Exercise({ member, onUpdate, t }) {
  const { toast } = useToast();
  const [link, setLink] = useState(member.submission_link || '');
  const [mediaType, setMediaType] = useState(member.submission_media_type || 'link');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLink(file_url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      toast({ title: t("msg.saved") });
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!member.level3_complete) { toast({ title: t("ex.ai_first"), variant: "destructive" }); return; }
    if (!link.trim()) { toast({ title: t("ex.add_link"), variant: "destructive" }); return; }
    setSubmitting(true);
    const ok = await onUpdate({ submission_link: link, submission_media_type: mediaType, submission_status: 'pending' });
    if (ok) toast({ title: t("msg.exercise_submitted") });
    setSubmitting(false);
  };

  return (
    <div className="glass-card p-6 md:p-8 animate-rise">
      <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{t("ex.title")}</h2>
      <p className="mt-3 leading-relaxed" style={{ color: 'var(--training-muted)' }}>{t("ex.desc")}</p>
      <div className="grid lg:grid-cols-2 gap-6 mt-7">
        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("ex.current")}</h3>
          <p className="text-sm mt-3" style={{ color: 'var(--training-muted)' }}>
            {member.submission_status ? `${t("ex.status_prefix")}${member.submission_status}` : t("ex.no_submission")}
          </p>
          {member.admin_feedback && (
            <div className="mt-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--training-ink)', borderLeft: '2px solid var(--training-gold)' }}>
              {t("ex.feedback_prefix")}{member.admin_feedback}
            </div>
          )}
          <label className="block text-sm mt-5 mb-2" style={{ color: 'var(--training-ink)' }}>{t("ex.link_label")}</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--training-muted)' }} />
            <input value={link} onChange={e => { setLink(e.target.value); setMediaType('link'); }} className="input-field pl-10" placeholder="https://canva.com/design/..." />
          </div>
          <label className="block text-sm mt-4 mb-2" style={{ color: 'var(--training-ink)' }}>{t("ex.upload_label")}</label>
          <label className="btn-soft flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? t("common.loading") : t("set.upload")}
            <input type="file" accept="image/*,video/*" onChange={handleFile} disabled={uploading} className="hidden" />
          </label>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary mt-4 w-full">{t("ex.submit")}</button>
        </div>
        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("ex.scenarios")}</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--training-muted)' }}>{t("ex.scenarios_desc")}</p>
          <div className="mt-5">
            {member.assigned_scenario ? (
              <div className="p-4 rounded-xl" style={{ background: 'rgba(245,201,87,0.1)', border: '1px solid rgba(245,201,87,0.3)' }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--training-gold)' }}>{t("ex.assigned_scenario")}</p>
                <p className="font-bold" style={{ color: 'var(--training-ink)' }}>{SCENARIOS[member.assigned_scenario - 1]}</p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--training-muted)' }}>{t("ex.no_scenario")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}