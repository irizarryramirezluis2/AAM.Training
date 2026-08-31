import { X, ExternalLink } from 'lucide-react';

export default function AnnouncementPopup({ announcement, onDismiss, t }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.64)', backdropFilter: 'blur(12px)' }}>
      <div className="glass-strong w-full max-w-lg rounded-3xl p-6 animate-rise">
        <div className="flex justify-between items-start gap-3 mb-3">
          <span className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--training-gold)' }}>{t("popup.ann_title")}</span>
          <button onClick={onDismiss} className="btn-ghost p-2 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{announcement.title}</h2>
        <p className="mt-3 leading-relaxed" style={{ color: 'var(--training-muted)' }}>{announcement.body}</p>
        {announcement.media_type === 'image' && announcement.media_url && (
          <img src={announcement.media_url} className="w-full rounded-xl mt-4 max-h-64 object-cover" alt="" />
        )}
        {announcement.media_type === 'video' && announcement.media_url && (
          <video src={announcement.media_url} controls className="w-full rounded-xl mt-4 max-h-64" />
        )}
        {announcement.media_type === 'link' && announcement.media_url && (
          <a href={announcement.media_url} target="_blank" rel="noopener noreferrer" className="btn-soft mt-4 inline-flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> {announcement.media_url}
          </a>
        )}
        <button onClick={onDismiss} className="btn-primary mt-5 w-full">{t("popup.dismiss")}</button>
      </div>
    </div>
  );
}