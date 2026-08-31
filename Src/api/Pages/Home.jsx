import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getT } from '@/lib/i18n';
import { isUnlocked, LEVELS } from '@/lib/trainingConfig';
import AuthGate from '@/components/training/AuthGate';
import Sidebar from '@/components/training/Sidebar';
import Dashboard from '@/components/training/Dashboard';
import LevelPage from '@/components/training/LevelPage';
import Exercise from '@/components/training/Exercise';
import Achievements from '@/components/training/Achievements';
import QA from '@/components/training/QA';
import Settings from '@/components/training/Settings';
import AdminDashboard from '@/components/training/AdminDashboard';
import AnnouncementPopup from '@/components/training/AnnouncementPopup';
import CertificatePopup from '@/components/training/CertificatePopup';
import WelcomeTour from '@/components/training/WelcomeTour';

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('dashboard');
  const [allMembers, setAllMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingAnnouncement, setPendingAnnouncement] = useState(null);
  const [showCertPopup, setShowCertPopup] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const t = getT(member?.language || 'en');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      try {
        const existing = await base44.entities.Member.filter({ created_by_id: user.id });
        if (existing.length > 0) setMember(existing[0]);
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!member) return;
    document.body.classList.add('training-app');
    document.body.classList.toggle('reduce-motion', !!member.reduce_motion);
    document.documentElement.style.setProperty('--text-scale', String(0.8 + ((member.text_size || 5) - 1) * 0.07));
    document.body.classList.toggle('dyslexia-mode', !!member.dyslexia_mode);
    document.body.classList.toggle('color-inversion', !!member.color_inversion);
    document.body.classList.toggle('high-contrast', !!member.high_contrast);
    document.body.classList.toggle('light-theme', member.theme === 'light');
  }, [member]);

  const loadAllData = async () => {
    try {
      const [members, qs, anns, logs] = await Promise.all([
        base44.entities.Member.list('-created_date', 500),
        base44.entities.Question.list('-question_date', 100),
        base44.entities.Announcement.list('-created_date', 50),
        base44.entities.AuditLog.list('-action_date', 50),
      ]);
      const now = new Date().toISOString();
      const toPublish = anns.filter(a => !a.published && a.publish_at && a.publish_at <= now);
      for (const ann of toPublish) {
        try { await base44.entities.Announcement.update(ann.id, { published: true }); } catch {}
      }
      setAllMembers(members);
      setQuestions(qs);
      setAnnouncements(toPublish.length > 0 ? anns.map(a => toPublish.find(p => p.id === a.id) ? { ...a, published: true } : a) : anns);
      setAuditLogs(logs);
    } catch {}
  };

  useEffect(() => {
    if (!member) return;
    loadAllData();
  }, [member?.id]);

  useEffect(() => {
    if (!member) return;
    if (member.certificate_url && !member.certificate_seen) setShowCertPopup(true);
    if (!member.welcome_seen && !member.tour_disabled) setShowTour(true);
  }, [member?.id]);

  useEffect(() => {
    if (!member || announcements.length === 0) return;
    const relevant = announcements.filter(a => {
      if (!a.published) return false;
      if (a.target_audience === 'new' && member.welcome_seen) return false;
      if (a.target_audience === 'uncertified' && member.certified) return false;
      return true;
    });
    if (relevant.length > 0) {
      const latest = relevant[0];
      const seenKey = `ann_seen_${member.id}`;
      if (localStorage.getItem(seenKey) !== latest.id) {
        setPendingAnnouncement(latest);
        localStorage.setItem(seenKey, latest.id);
      }
    }
  }, [member?.id, announcements]);

  const updateMember = async (patch) => {
    try {
      await base44.entities.Member.update(member.id, patch);
      setMember(prev => ({ ...prev, ...patch }));
      return true;
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); return false; }
  };

  const updateMemberById = async (id, patch) => {
    try {
      await base44.entities.Member.update(id, patch);
      setAllMembers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
      return true;
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); return false; }
  };

  const logAudit = async (action, target) => {
    try {
      const log = await base44.entities.AuditLog.create({ action, admin_name: member.member_name, target_name: target, action_date: new Date().toISOString() });
      setAuditLogs(prev => [log, ...prev]);
    } catch {}
  };

  const handleNavigate = (s) => {
    if (!isUnlocked(s, member)) { toast({ title: t("msg.level_locked"), variant: "destructive" }); return; }
    setSection(s);
  };

  const handleDismissCert = async () => { setShowCertPopup(false); await updateMember({ certificate_seen: true }); };
  const handleFinishTour = async () => { setShowTour(false); await updateMember({ welcome_seen: true }); };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#07101f' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(203,213,225,0.2)', borderTopColor: '#f5c957' }} />
      </div>
    );
  }

  if (!member) return <AuthGate user={user} onProfileLoaded={(m) => setMember(m)} />;

  return (
    <div className="min-h-screen" style={{ background: 'var(--training-bg)', color: 'var(--training-ink)' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[430px] h-[430px] rounded-full opacity-40 blur-[70px]" style={{ background: '#165d90' }} />
        <div className="absolute -bottom-40 -right-40 w-[460px] h-[460px] rounded-full opacity-40 blur-[70px]" style={{ background: '#744b94' }} />
      </div>
      <Sidebar member={member} section={section} onNavigate={handleNavigate}
        onLogout={() => { setMember(null); setSection('dashboard'); }}
        onOpenAdmin={() => setShowAdmin(true)} t={t} />
      <main className="lg:ml-64 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
        {section === 'dashboard' && <Dashboard member={member} onNavigate={handleNavigate} t={t} />}
        {section === 'level1' && <LevelPage level={LEVELS[0]} member={member} onUpdate={updateMember} t={t} />}
        {section === 'level2' && <LevelPage level={LEVELS[1]} member={member} onUpdate={updateMember} t={t} />}
        {section === 'level3' && <LevelPage level={LEVELS[2]} member={member} onUpdate={updateMember} t={t} />}
        {section === 'exercise' && <Exercise member={member} onUpdate={updateMember} t={t} />}
        {section === 'achievements' && <Achievements member={member} t={t} />}
        {section === 'qa' && <QA member={member} questions={questions} onRefresh={loadAllData} t={t} />}
        {section === 'settings' && <Settings member={member} onUpdate={updateMember} t={t} />}
      </main>
      {showAdmin && (
        <AdminDashboard member={member} allMembers={allMembers} auditLogs={auditLogs}
          onUpdateMember={updateMemberById} onAudit={logAudit} onRefresh={loadAllData}
          onClose={() => setShowAdmin(false)} t={t} />
      )}
      {pendingAnnouncement && <AnnouncementPopup announcement={pendingAnnouncement} onDismiss={() => setPendingAnnouncement(null)} t={t} />}
      {showCertPopup && <CertificatePopup certificateUrl={member.certificate_url} onDismiss={handleDismissCert} t={t} />}
      {showTour && <WelcomeTour onFinish={handleFinishTour} onSkip={handleFinishTour} t={t} />}
    </div>
  );
}