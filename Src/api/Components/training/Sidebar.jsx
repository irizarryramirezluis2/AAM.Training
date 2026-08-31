import { LayoutDashboard, Palette, LayoutTemplate, Sparkles, PenTool, Award, MessagesSquare, Settings, ShieldCheck, Lock, LogOut, User } from 'lucide-react';
import { LOGO_URL, isUnlocked, getAdminLevel } from '@/lib/trainingConfig';

export default function Sidebar({ member, section, onNavigate, onLogout, onOpenAdmin, t }) {
  const items = [
    { key: 'dashboard', icon: LayoutDashboard },
    { key: 'level1', icon: Palette },
    { key: 'level2', icon: LayoutTemplate },
    { key: 'level3', icon: Sparkles },
    { key: 'exercise', icon: PenTool },
    { key: 'achievements', icon: Award },
    { key: 'qa', icon: MessagesSquare },
    { key: 'settings', icon: Settings },
  ];

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col glass-strong border-r p-4 z-20" style={{ borderColor: 'var(--training-line)' }}>
        <div className="flex items-center gap-3 mb-6 px-2">
          <img src={LOGO_URL} className="w-12 h-12 rounded-xl object-cover" alt="Logo" />
          <div className="min-w-0">
            <h1 className="heading-font text-lg leading-none" style={{ color: 'var(--training-ink)' }}>APOSENTO ALTO</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--training-muted)' }}>Chicago</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map(item => {
            const locked = !isUnlocked(item.key, member);
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition ${locked ? 'opacity-50' : ''}`}
                style={active ? { background: 'linear-gradient(135deg, var(--training-gold), var(--training-gold-deep))', color: '#152033' } : { color: 'var(--training-muted)' }}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="flex-1 text-left">{t(`nav.${item.key}`)}</span>
                {locked && <Lock className="w-3 h-3" />}
              </button>
            );
          })}
          {getAdminLevel(member) >= 1 && (
            <button onClick={onOpenAdmin}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition mt-2"
              style={{ color: 'var(--training-gold)', border: '1px solid var(--training-line)' }}>
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">{t("nav.admin")}</span>
            </button>
          )}
        </nav>
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--training-line)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--training-glass)' }}>
              {member.profile_picture ? <img src={member.profile_picture} className="w-full h-full object-cover" alt="" /> : <User className="w-full h-full p-2" style={{ color: 'var(--training-muted)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--training-ink)' }}>{member.member_name}</p>
              {member.certified && <span className="text-xs font-black" style={{ color: 'var(--training-gold)' }}>CERTIFIED</span>}
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition" style={{ color: 'var(--training-muted)', border: '1px solid var(--training-line)' }}>
            <LogOut className="w-4 h-4" /> {t("common.logout")}
          </button>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-strong border-t z-30" style={{ borderColor: 'var(--training-line)' }}>
        <div className="flex justify-around py-2 px-1">
          {items.slice(0, 5).map(item => {
            const locked = !isUnlocked(item.key, member);
            const Icon = item.icon;
            const active = section === item.key;
            return (
              <button key={item.key} onClick={() => onNavigate(item.key)}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold ${locked ? 'opacity-40' : ''}`}
                style={{ color: active ? 'var(--training-gold)' : 'var(--training-muted)' }}>
                <Icon className="w-5 h-5" />
                <span className="truncate max-w-[60px]">{t(`nav.${item.key}`)}</span>
              </button>
            );
          })}
          <button onClick={onOpenAdmin} className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg text-[10px] font-bold" style={{ color: 'var(--training-gold)' }}>
            <ShieldCheck className="w-5 h-5" /><span>Admin</span>
          </button>
        </div>
      </nav>
    </>
  );
}