import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Upload, User } from 'lucide-react';

export default function Settings({ member, onUpdate, t }) {
  const { toast } = useToast();
  const [name, setName] = useState(member.member_name || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handlePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdate({ profile_picture: file_url });
      toast({ title: t("msg.saved") });
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setUploading(false);
  };

  const handleSaveName = async () => {
    const ok = await onUpdate({ member_name: name.trim() });
    if (ok) toast({ title: t("msg.name_saved") });
  };

  const handleReset = async () => {
    const ok = await onUpdate({
      level1_complete: false, level2_complete: false, level3_complete: false,
      level1_cert_submitted: false, level2_cert_submitted: false, level2_cert2_submitted: false, level3_cert_submitted: false,
      level1_cert_url: '', level2_cert1_url: '', level2_cert2_url: '', level3_cert_url: '',
      assigned_scenario: 0, submission_link: '', submission_status: '', admin_feedback: '',
      certified: false, certified_seen: false, completed_at: '', certificate_url: '', certificate_seen: false
    });
    if (ok) toast({ title: t("msg.reset") });
  };

  const toggle = (key, val) => onUpdate({ [key]: val });

  return (
    <div className="glass-card p-6 md:p-8 animate-rise">
      <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{t("set.title")}</h2>
      <p className="mt-3" style={{ color: 'var(--training-muted)' }}>{t("set.desc")}</p>
      <div className="grid md:grid-cols-2 gap-5 mt-7">
        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("set.profile")}</h3>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0" style={{ background: 'var(--training-glass)' }}>
              {member.profile_picture ? <img src={member.profile_picture} className="w-full h-full object-cover" alt="" /> : <User className="w-full h-full p-3" style={{ color: 'var(--training-muted)' }} />}
            </div>
            <label className="btn-soft flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> {uploading ? t("common.loading") : t("set.upload")}
              <input type="file" accept="image/*" onChange={handlePicture} disabled={uploading} className="hidden" />
            </label>
          </div>
          <label className="block text-sm mt-4 mb-2" style={{ color: 'var(--training-ink)' }}>{t("set.username")}</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input-field" />
          <button onClick={handleSaveName} className="btn-primary mt-3">{t("set.save")}</button>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("set.accessibility")}</h3>
          <label className="block text-sm mt-4 mb-2" style={{ color: 'var(--training-ink)' }}>{t("set.text_size")}</label>
          <input type="range" min="1" max="10" value={member.text_size || 5} onChange={e => toggle('text_size', Number(e.target.value))} className="w-full accent-amber-400" />
          <div className="grid gap-3 mt-5">
            <ToggleRow label={t("set.dyslexia")} checked={!!member.dyslexia_mode} onChange={v => toggle('dyslexia_mode', v)} />
            <ToggleRow label={t("set.contrast")} checked={!!member.high_contrast} onChange={v => toggle('high_contrast', v)} />
            <ToggleRow label={t("set.invert")} checked={!!member.color_inversion} onChange={v => toggle('color_inversion', v)} />
            <ToggleRow label={t("set.reduce_motion")} checked={!!member.reduce_motion} onChange={v => toggle('reduce_motion', v)} />
          </div>
          <button onClick={() => toggle('theme', member.theme === 'dark' ? 'light' : 'dark')} className="btn-ghost mt-5 w-full">
            {t("set.theme")}
          </button>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("set.language")}</h3>
          <div className="flex gap-2 mt-4">
            {['en', 'es'].map(l => (
              <button key={l} onClick={() => toggle('language', l)} className="btn-ghost flex-1"
                style={member.language === l ? { background: 'linear-gradient(135deg, var(--training-gold), var(--training-gold-deep))', color: '#152033' } : {}}>
                {l === 'en' ? 'English' : 'Español'}
              </button>
            ))}
          </div>
          <h3 className="font-bold mt-6" style={{ color: 'var(--training-ink)' }}>{t("set.achievement_popups")}</h3>
          <ToggleRow label={t("set.show_popup")} checked={!member.badge_popup_disabled} onChange={v => toggle('badge_popup_disabled', !v)} />
          <h3 className="font-bold mt-6" style={{ color: 'var(--training-ink)' }}>{t("set.welcome_tour")}</h3>
          <ToggleRow label={t("set.tour_toggle")} checked={!member.tour_disabled} onChange={v => toggle('tour_disabled', !v)} />
        </div>

        <div className="glass-card p-5">
          <h3 className="font-bold" style={{ color: 'var(--training-ink)' }}>{t("set.reset")}</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--training-muted)' }}>{t("set.reset_desc")}</p>
          <button onClick={handleReset} className="btn-danger mt-4">{t("set.reset_btn")}</button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex gap-3 items-center cursor-pointer">
      <button type="button" onClick={() => onChange(!checked)} className="relative w-11 h-6 rounded-full transition" style={{ background: checked ? 'var(--training-gold)' : 'rgba(255,255,255,0.15)' }}>
        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: checked ? '22px' : '2px' }} />
      </button>
      <span className="text-sm" style={{ color: 'var(--training-ink)' }}>{label}</span>
    </label>
  );
}