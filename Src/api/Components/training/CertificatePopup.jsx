import { X, Download, Award } from 'lucide-react';

export default function CertificatePopup({ certificateUrl, memberName, onDismiss, t }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.64)', backdropFilter: 'blur(12px)' }}>
      <div className="glass-strong w-full max-w-lg rounded-3xl p-6 text-center animate-rise">
        <button onClick={onDismiss} className="btn-ghost p-2 rounded-lg absolute top-4 right-4"><X className="w-4 h-4" /></button>
        <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--training-gold), var(--training-gold-deep))' }}>
          <Award className="w-10 h-10" style={{ color: '#152033' }} />
        </div>
        <h2 className="heading-font text-2xl mt-4" style={{ color: 'var(--training-ink)' }}>{t("popup.cert_title")}</h2>
        <p className="mt-2" style={{ color: 'var(--training-muted)' }}>{t("popup.cert_desc")}</p>
        {certificateUrl && (
          <img src={certificateUrl} className="w-full rounded-xl mt-4 max-h-72 object-contain" style={{ background: 'rgba(255,255,255,0.05)' }} alt="Certificate" />
        )}
        <a href={certificateUrl} download className="btn-primary mt-5 w-full inline-flex items-center justify-center gap-2 no-underline">
          <Download className="w-5 h-5" /> {t("popup.download")}
        </a>
        <button onClick={onDismiss} className="btn-ghost mt-2 w-full">{t("popup.dismiss")}</button>
      </div>
    </div>
  );
}