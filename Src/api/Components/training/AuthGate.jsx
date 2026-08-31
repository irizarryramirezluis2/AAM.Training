import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { LOGO_URL, SUPER_ADMIN_NAME, ADMIN_CODE, NAME_REGEX, CODE_REGEX } from '@/lib/trainingConfig';
import { getT } from '@/lib/i18n';

export default function AuthGate({ user, onProfileLoaded }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = getT('en');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!NAME_REGEX.test(name)) return setError(t("auth.name_error"));
    if (!CODE_REGEX.test(code)) return setError(t("auth.code_error"));
    setLoading(true);
    try {
      const found = await base44.entities.Member.filter({ member_name: name });
      if (found.length === 0) return setError(t("auth.name_error"));
      if (found[0].access_code !== code) return setError(t("auth.code_error"));
      if (found[0].account_active === false) return setError(t("auth.suspended"));
      onProfileLoaded(found[0]);
    } catch { setError(t("auth.create_error")); }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!NAME_REGEX.test(name)) return setError(t("auth.name_error"));
    if (!CODE_REGEX.test(code)) return setError(t("auth.code_error"));
    if (name.toLowerCase().includes('admin')) return setError(t("auth.name_error"));
    setLoading(true);
    try {
      const existing = await base44.entities.Member.filter({ member_name: name });
      if (existing.length > 0) { setLoading(false); return setError(t("auth.name_taken")); }
      const created = await base44.entities.Member.create({
        member_name: name, access_code: code, email: user?.email || '',
        admin_level: 0, language: 'en', theme: 'dark', text_size: 5,
        account_active: true, welcome_seen: false
      });
      toast({ title: t("msg.profile_created") });
      onProfileLoaded(created);
    } catch { setError(t("auth.create_error")); }
    setLoading(false);
  };

  const handleAdmin = async (e) => {
    e.preventDefault();
    setError('');
    if (code !== ADMIN_CODE) return setError(t("auth.admin_error"));
    setLoading(true);
    try {
      const existing = await base44.entities.Member.filter({ member_name: SUPER_ADMIN_NAME });
      if (existing.length > 0) {
        if (existing[0].account_active === false) return setError(t("auth.suspended"));
        onProfileLoaded(existing[0]);
      } else {
        const created = await base44.entities.Member.create({
          member_name: SUPER_ADMIN_NAME, access_code: ADMIN_CODE, email: user?.email || '',
          admin_level: 4, language: 'en', theme: 'dark', text_size: 5,
          account_active: true, welcome_seen: true
        });
        toast({ title: t("msg.profile_created") });
        onProfileLoaded(created);
      }
    } catch { setError(t("auth.create_error")); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--training-bg)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[430px] h-[430px] rounded-full opacity-40 blur-[70px]" style={{ background: '#165d90' }} />
        <div className="absolute -bottom-40 -right-40 w-[460px] h-[460px] rounded-full opacity-40 blur-[70px]" style={{ background: '#744b94' }} />
      </div>
      <div className="glass-strong w-full max-w-md p-8 rounded-3xl animate-rise">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="APOSENTO ALTO" className="w-28 h-28 mx-auto rounded-2xl object-cover mb-4 shadow-lg" />
          <h1 className="heading-font text-3xl" style={{ color: 'var(--training-ink)' }}>APOSENTO ALTO</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--training-muted)' }}>Chicago · Canva Training</p>
        </div>
        <div className="flex gap-1 mb-6 p-1 glass-card rounded-xl">
          {['signin', 'create', 'admin'].map(tb => (
            <button key={tb} onClick={() => { setTab(tb); setError(''); }}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition ${tab === tb ? 'text-[#152033]' : ''}`}
              style={tab === tb ? { background: 'linear-gradient(135deg, var(--training-gold), var(--training-gold-deep))' } : { color: 'var(--training-muted)' }}>
              {t(`auth.${tb}`)}
            </button>
          ))}
        </div>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.username")}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="John D" />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.password")}</label>
              <input type="password" value={code} onChange={e => setCode(e.target.value)} className="input-field" placeholder="123456" maxLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{t("auth.enter")}</button>
          </form>
        )}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.username")}</label>
              <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="John D" />
              <p className="text-xs mt-1" style={{ color: 'var(--training-muted)' }}>One first name + one uppercase last initial (e.g. Maria R)</p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.password")}</label>
              <input type="password" value={code} onChange={e => setCode(e.target.value)} className="input-field" placeholder="123456" maxLength={6} />
              <p className="text-xs mt-1" style={{ color: 'var(--training-muted)' }}>Must be exactly 6 digits (0–9)</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{t("auth.create_btn")}</button>
          </form>
        )}
        {tab === 'admin' && (
          <form onSubmit={handleAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.admin_code")}</label>
              <input type="password" value={code} onChange={e => setCode(e.target.value)} className="input-field" placeholder="7 digits" maxLength={7} />
              <p className="text-xs mt-1" style={{ color: 'var(--training-muted)' }}>Super Admin access code (7 digits)</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{t("auth.admin_btn")}</button>
          </form>
        )}
      </div>
    </div>
  );
}