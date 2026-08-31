import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { TEMPLATE_TYPES, DEFAULT_TEMPLATES, loadTemplates } from '@/lib/emailTemplates';
import { Upload, Save } from 'lucide-react';

export default function TemplateEditor({ member, onAudit, t }) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState({});
  const [currentType, setCurrentType] = useState('level1_approval');
  const [form, setForm] = useState({ subject: '', body: '', use_image: false, image_url: '', name_x: 50, name_y: 50, name_font_size: 48, name_color: '#1a2a3a' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(400);
  const containerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const loaded = await loadTemplates();
      setTemplates(loaded);
      loadForm(currentType, loaded);
    })();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => { setPreviewWidth(entries[0].contentRect.width); });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [form.image_url]);

  const loadForm = (type, loaded) => {
    const tmpl = loaded[type];
    const defaults = DEFAULT_TEMPLATES[type] || { subject: '', body: '' };
    setForm({
      subject: tmpl?.subject || defaults.subject,
      body: tmpl?.body || defaults.body,
      use_image: tmpl?.use_image || false,
      image_url: tmpl?.image_url || '',
      name_x: tmpl?.name_x ?? 50,
      name_y: tmpl?.name_y ?? 50,
      name_font_size: tmpl?.name_font_size || 48,
      name_color: tmpl?.name_color || '#1a2a3a',
    });
  };

  const switchType = (type) => { setCurrentType(type); loadForm(type, templates); };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(prev => ({ ...prev, image_url: file_url }));
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setUploading(false);
  };

  const updatePosition = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setForm(prev => ({ ...prev, name_x: x, name_y: y }));
  };

  const handlePointerDown = (e) => { e.preventDefault(); setDragging(true); updatePosition(e); };
  const handlePointerMove = (e) => { if (dragging) updatePosition(e); };

  const save = async () => {
    setSaving(true);
    try {
      const existing = templates[currentType];
      if (existing) {
        await base44.entities.EmailTemplate.update(existing.id, { ...form, updated_by: member.member_name });
        setTemplates(prev => ({ ...prev, [currentType]: { ...prev[currentType], ...form } }));
      } else {
        const created = await base44.entities.EmailTemplate.create({ ...form, template_type: currentType, updated_by: member.member_name });
        setTemplates(prev => ({ ...prev, [currentType]: created }));
      }
      toast({ title: t("tmpl.saved") });
      onAudit('updated email template', t(`tmpl.${currentType}`));
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setSaving(false);
  };

  const previewFont = form.name_font_size * (previewWidth / 800);

  return (
    <div className="glass-card p-5">
      <h3 className="heading-font text-xl" style={{ color: 'var(--training-ink)' }}>{t("tmpl.title")}</h3>
      <p className="text-sm mt-2" style={{ color: 'var(--training-muted)' }}>{t("tmpl.desc")}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--training-gold)' }}>{t("tmpl.placeholders")}</p>

      <div className="flex flex-wrap gap-2 mt-4">
        {TEMPLATE_TYPES.map(tType => (
          <button key={tType.key} onClick={() => switchType(tType.key)} className="btn-ghost text-xs"
            style={currentType === tType.key ? { borderColor: 'var(--training-gold)', boxShadow: '0 0 0 2px var(--training-gold)' } : {}}>
            {t(tType.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--training-ink)' }}>{t("tmpl.subject")}</label>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--training-ink)' }}>{t("tmpl.body")}</label>
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="input-field min-h-[100px]" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.use_image} onChange={e => setForm({ ...form, use_image: e.target.checked })} className="w-4 h-4" />
          <span className="text-sm" style={{ color: 'var(--training-ink)' }}>{t("tmpl.use_image")}</span>
        </label>

        {currentType === 'certification' && form.use_image && (
          <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(245,201,87,0.1)', color: 'var(--training-gold)' }}>{t("tmpl.cert_note")}</p>
        )}

        {form.use_image && (
          <div className="space-y-3">
            <label className="btn-soft flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> {uploading ? '...' : t("tmpl.upload_image")}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>

            {form.image_url ? (
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--training-muted)' }}>{t("tmpl.image_preview")}</p>
                <div
                  ref={containerRef}
                  className="relative rounded-xl overflow-hidden cursor-crosshair select-none"
                  style={{ border: '1px solid var(--training-line)' }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={() => setDragging(false)}
                  onMouseLeave={() => setDragging(false)}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={() => setDragging(false)}
                >
                  <img src={form.image_url} alt="Template" className="w-full block pointer-events-none" draggable={false} />
                  <div className="absolute font-bold pointer-events-none" style={{ left: `${form.name_x}%`, top: `${form.name_y}%`, transform: 'translate(-50%, -50%)', fontSize: `${previewFont}px`, color: form.name_color, textShadow: '0 1px 3px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                    {member.member_name}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--training-muted)' }}>{t("tmpl.font_size")}</label>
                    <input type="range" min="12" max="120" value={form.name_font_size} onChange={e => setForm({ ...form, name_font_size: Number(e.target.value) })} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--training-muted)' }}>{t("tmpl.name_color")}</label>
                    <input type="color" value={form.name_color} onChange={e => setForm({ ...form, name_color: e.target.value })} className="w-full h-10 rounded-lg cursor-pointer" />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--training-muted)' }}>{t("tmpl.no_image")}</p>
            )}
          </div>
        )}

        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {t("common.save")}
        </button>
      </div>
    </div>
  );
}