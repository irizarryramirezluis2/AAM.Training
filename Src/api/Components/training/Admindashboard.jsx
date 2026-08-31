import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { getAdminLevel, can, isSuperAdmin, SCENARIOS } from '@/lib/trainingConfig';
import { X, ClipboardCheck, Users, UserX, Megaphone, ShieldCheck, BarChart3, ScrollText, Upload, Search, ExternalLink, Mail } from 'lucide-react';
import { sendTemplateEmail, loadTemplates, generateImageWithName } from '@/lib/emailTemplates';
import TemplateEditor from '@/components/training/TemplateEditor';
import MemberManagement from '@/components/training/MemberManagement';

export default function AdminDashboard({ member, allMembers, auditLogs, onUpdateMember, onAudit, onRefresh, onClose, t }) {
  const { toast } = useToast();
  const [tool, setTool] = useState(null);
  const [search, setSearch] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(new Set());
  const [certModal, setCertModal] = useState(null);
  const [scenarioModal, setScenarioModal] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(1);
  const [annForm, setAnnForm] = useState({ title: '', body: '', target: 'all', type: 'none', url: '', schedule: '' });
  const level = getAdminLevel(member);

  const eligibleMembers = allMembers.filter(m => isSuperAdmin(member) || Number(m.admin_level || 0) < level);

  const tools = [];
  if (level >= 1) tools.push({ key: 'members', icon: Users, label: t("admin.members"), desc: t("admin.members_desc") });
  if (level === 4) tools.push({ key: 'roles', icon: ShieldCheck, label: t("admin.roles"), desc: t("admin.roles_desc") });
  if (level >= 1) tools.push({ key: 'submissions', icon: ClipboardCheck, label: t("admin.submissions"), desc: t("admin.submissions_desc") });
  if (level >= 2) tools.push({ key: 'communication', icon: Megaphone, label: t("admin.communication"), desc: t("admin.communication_desc") });
  if (level >= 2) tools.push({ key: 'templates', icon: Mail, label: t("admin.templates"), desc: t("admin.templates_desc") });
  if (level >= 3) tools.push({ key: 'users', icon: UserX, label: t("admin.users"), desc: t("admin.users_desc") });
  tools.push({ key: 'analytics', icon: BarChart3, label: t("admin.analytics"), desc: t("admin.analytics_desc") });
  tools.push({ key: 'audit', icon: ScrollText, label: t("admin.audit"), desc: t("admin.audit_desc") });

  const approveLevel = async (m, l) => {
    if (level !== 4 && l > level) { toast({ title: `${t("admin.role_label")} ${level} ${t("admin.cannot_approve")} ${l}.`, variant: "destructive" }); return; }
    const submitted = l === 1 ? m.level1_cert_submitted : l === 2 ? (m.level2_cert_submitted && m.level2_cert2_submitted) : m.level3_cert_submitted;
    if (!submitted) { toast({ title: t("admin.not_submitted"), variant: "destructive" }); return; }
    const patch = l === 1 ? { level1_complete: true } : l === 2 ? { level2_complete: true } : { level3_complete: true, assigned_scenario: m.assigned_scenario || Math.floor(Math.random() * SCENARIOS.length) + 1 };
    const ok = await onUpdateMember(m.id, patch);
    if (ok) { toast({ title: t("msg.approved") }); onAudit(`approved L${l}`, m.member_name); await sendTemplateEmail(`level${l}_approval`, { member_name: m.member_name }, allMembers, t); onRefresh(); }
  };

  const revokeLevel = async (m, l) => {
    if (!can("review", member)) { toast({ title: t("admin.no_permission"), variant: "destructive" }); return; }
    const ok = await onUpdateMember(m.id, { [`level${l}_complete`]: false });
    if (ok) { toast({ title: t("msg.revoked") }); onAudit(`revoked L${l}`, m.member_name); onRefresh(); }
  };

  const approveExercise = async (m) => {
    const ok = await onUpdateMember(m.id, { submission_status: 'approved' });
    if (ok) { toast({ title: t("msg.approved") }); onAudit('approved exercise', m.member_name); await sendTemplateEmail('exercise_approval', { member_name: m.member_name }, allMembers, t); onRefresh(); }
  };

  const handleCertify = async (m) => {
    if (!(m.level1_complete && m.level2_complete && m.level3_complete && m.submission_status === 'approved')) { toast({ title: t("admin.all_required"), variant: "destructive" }); return; }
    const templates = await loadTemplates();
    const certTemplate = templates.certification;
    if (certTemplate?.use_image && certTemplate.image_url) {
      try {
        const certUrl = await generateImageWithName(certTemplate.image_url, m.member_name, certTemplate.name_x ?? 50, certTemplate.name_y ?? 50, certTemplate.name_font_size || 48, certTemplate.name_color || '#1a2a3a');
        const ok = await onUpdateMember(m.id, { certified: true, completed_at: new Date().toISOString(), certificate_url: certUrl, certificate_seen: false });
        if (ok) { toast({ title: t("admin.cert_uploaded") }); onAudit('certified', m.member_name); await sendTemplateEmail('certification', { member_name: m.member_name }, allMembers, t); onRefresh(); }
      } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    } else {
      setCertModal(m);
    }
  };

  const handleCertUpload = async (e, m) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const ok = await onUpdateMember(m.id, { certified: true, completed_at: new Date().toISOString(), certificate_url: file_url, certificate_seen: false });
      if (ok) { toast({ title: t("admin.cert_uploaded") }); onAudit('certified', m.member_name); await sendTemplateEmail('certification', { member_name: m.member_name }, allMembers, t); onRefresh(); setCertModal(null); }
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
  };

  const toggleUserStatus = async (m) => {
    if (!can("access", member)) { toast({ title: t("admin.no_permission"), variant: "destructive" }); return; }
    const newActive = m.account_active === false;
    const ok = await onUpdateMember(m.id, { account_active: newActive, account_status: newActive ? '' : 'Suspended' });
    if (ok) { toast({ title: newActive ? t("msg.reactivated") : t("msg.suspended") }); onAudit(newActive ? 'reactivated' : 'suspended', m.member_name); await sendTemplateEmail(newActive ? 'account_reactivated' : 'account_suspended', { member_name: m.member_name }, allMembers, t); onRefresh(); }
  };

  const resetMember = async (m) => {
    if (!can("reset", member)) { toast({ title: t("admin.no_permission"), variant: "destructive" }); return; }
    const ok = await onUpdateMember(m.id, { level1_complete: false, level2_complete: false, level3_complete: false, level1_cert_submitted: false, level2_cert_submitted: false, level2_cert2_submitted: false, level3_cert_submitted: false, level1_cert_url: '', level2_cert1_url: '', level2_cert2_url: '', level3_cert_url: '', assigned_scenario: 0, submission_link: '', submission_status: '', admin_feedback: '', certified: false, completed_at: '', certificate_url: '', certificate_seen: false });
    if (ok) { toast({ title: t("msg.reset") }); onAudit('reset progress', m.member_name); await sendTemplateEmail('account_reset', { member_name: m.member_name }, allMembers, t); onRefresh(); }
  };

  const deleteMember = async (m) => {
    if (!can("deleteProfile", member)) { toast({ title: t("admin.no_permission"), variant: "destructive" }); return; }
    if (!deleteArmed.has(m.id)) { setDeleteArmed(prev => new Set(prev).add(m.id)); toast({ title: `${t("admin.confirm_delete")} ${m.member_name}.`, variant: "destructive" }); return; }
    try { await base44.entities.Member.delete(m.id); toast({ title: t("msg.deleted") }); onAudit('deleted profile', m.member_name); onRefresh(); }
    catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
  };

  const setRole = async (m, lvl) => {
    if (level !== 4) { toast({ title: t("admin.no_permission"), variant: "destructive" }); return; }
    const ok = await onUpdateMember(m.id, { admin_level: lvl, account_active: true, account_status: '' });
    if (ok) { toast({ title: t("msg.saved") }); onAudit(`set admin level ${lvl}`, m.member_name); onRefresh(); }
  };

  const publishAnn = async (e) => {
    e.preventDefault();
    if (!annForm.title || !annForm.body) return;
    const scheduled = annForm.schedule && new Date(annForm.schedule) > new Date();
    try {
      await base44.entities.Announcement.create({ title: annForm.title, body: annForm.body, media_type: annForm.type, media_url: annForm.url, target_audience: annForm.target, publish_at: scheduled ? new Date(annForm.schedule).toISOString() : new Date().toISOString(), published: !scheduled, author: member.member_name });
      toast({ title: t("msg.ann_published") }); onAudit('posted announcement', annForm.title);
      setAnnForm({ title: '', body: '', target: 'all', type: 'none', url: '', schedule: '' }); onRefresh();
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
  };

  const CertLink = ({ label, url }) => url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold mr-2" style={{ color: 'var(--training-blue)' }}>{label} <ExternalLink className="w-3 h-3" /></a> : null;

  const stats = {
    total: allMembers.length,
    certified: allMembers.filter(m => m.certified).length,
    active: allMembers.filter(m => m.account_active !== false).length,
    pending: allMembers.filter(m => m.submission_status === 'pending').length,
    l1: allMembers.filter(m => m.level1_complete).length,
    l2: allMembers.filter(m => m.level2_complete).length,
    l3: allMembers.filter(m => m.level3_complete).length,
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.64)', backdropFilter: 'blur(12px)' }}>
      <div className="glass-strong w-full max-w-5xl max-h-[90vh] overflow-auto rounded-3xl p-6">
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--training-gold)' }}>{t("admin.control")}</p>
            <h2 className="heading-font text-2xl mt-1" style={{ color: 'var(--training-ink)' }}>{t("admin.title")}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--training-muted)' }}>{level === 4 ? t("admin.role_label_sa") : `${t("admin.role_label")} ${level}`}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {tools.map(tl => {
            const Icon = tl.icon;
            return (
              <button key={tl.key} onClick={() => setTool(tl.key)} className="btn-ghost text-left" style={tool === tl.key ? { borderColor: 'var(--training-gold)', boxShadow: '0 0 0 2px var(--training-gold)' } : {}}>
                <Icon className="w-5 h-5 mb-2" style={{ color: 'var(--training-gold)' }} />
                <strong className="block text-sm">{tl.label}</strong>
                <span className="block text-xs mt-1" style={{ color: 'var(--training-muted)' }}>{tl.desc}</span>
              </button>
            );
          })}
        </div>

        {tool === 'submissions' && (
          <div className="glass-card p-5">
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field mb-4" placeholder={t("admin.search")} />
            <div className="space-y-3">
              {eligibleMembers.length === 0 ? <p style={{ color: 'var(--training-muted)' }}>{t("admin.no_members")}</p> : eligibleMembers.filter(m => `${m.member_name} ${m.submission_status || ''} ${m.certified ? 'certified' : ''}`.toLowerCase().includes(search.toLowerCase())).map(m => (
                <div key={m.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--training-line)' }}>
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <p className="font-bold" style={{ color: 'var(--training-ink)' }}>{m.member_name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <CertLink label="L1" url={m.level1_cert_url} />
                        <CertLink label="L2-A" url={m.level2_cert1_url} />
                        <CertLink label="L2-B" url={m.level2_cert2_url} />
                        <CertLink label="L3" url={m.level3_cert_url} />
                        <CertLink label="Exercise" url={m.submission_link} />
                      </div>
                    </div>
                    <span className={`status-pill ${m.certified ? 'status-approved' : ''}`}>{m.certified ? t("ach.certified") : t("admin.active")}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {can("review", member) && <>
                      <button onClick={() => approveLevel(m, 1)} className="btn-soft text-xs">Approve L1</button>
                      <button onClick={() => approveLevel(m, 2)} className="btn-soft text-xs">Approve L2</button>
                      <button onClick={() => approveLevel(m, 3)} className="btn-soft text-xs">Approve L3</button>
                    </>}
                    {m.level1_complete && <button onClick={() => revokeLevel(m, 1)} className="btn-ghost text-xs">Revoke L1</button>}
                    {m.level2_complete && <button onClick={() => revokeLevel(m, 2)} className="btn-ghost text-xs">Revoke L2</button>}
                    {m.level3_complete && <button onClick={() => revokeLevel(m, 3)} className="btn-ghost text-xs">Revoke L3</button>}
                    {can("review", member) && <>
                      <button onClick={() => { setScenarioModal(m); setSelectedScenario(m.assigned_scenario || 1); }} className="btn-ghost text-xs">{t("admin.assign")}</button>
                      <button onClick={() => approveExercise(m)} className="btn-soft text-xs">{t("admin.approve_ex")}</button>
                      <button onClick={() => handleCertify(m)} className="btn-primary text-xs">{t("admin.certify")}</button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tool === 'users' && (
          <div className="glass-card p-5">
            <div className="space-y-3">
              {eligibleMembers.map(m => (
                <div key={m.id} className="rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--training-line)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--training-ink)' }}>{m.member_name}</p>
                    <p className="text-xs" style={{ color: 'var(--training-muted)' }}>{m.account_active === false ? t("admin.suspended") : t("admin.active")} · {Number(m.admin_level || 0) ? `${t("admin.admin_level")} ${m.admin_level}` : t("admin.member")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {can("access", member) && <button onClick={() => toggleUserStatus(m)} className={m.account_active === false ? "btn-primary text-xs" : "btn-danger text-xs"}>{m.account_active === false ? t("admin.reactivate") : t("admin.suspend")}</button>}
                    {can("reset", member) && <button onClick={() => resetMember(m)} className="btn-soft text-xs">{t("admin.reset")}</button>}
                    {can("deleteProfile", member) && <button onClick={() => deleteMember(m)} className="btn-danger text-xs">{t("admin.delete")}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tool === 'communication' && (
          <form onSubmit={publishAnn} className="glass-card p-5 space-y-3">
            <input value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} className="input-field" placeholder={t("admin.ann_title")} required />
            <textarea value={annForm.body} onChange={e => setAnnForm({ ...annForm, body: e.target.value })} className="input-field min-h-[100px]" placeholder={t("admin.ann_body")} required />
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={annForm.target} onChange={e => setAnnForm({ ...annForm, target: e.target.value })} className="input-field">
                <option value="all">{t("admin.ann_target_all")}</option>
                <option value="new">{t("admin.ann_target_new")}</option>
                <option value="uncertified">{t("admin.ann_target_uncertified")}</option>
              </select>
              <select value={annForm.type} onChange={e => setAnnForm({ ...annForm, type: e.target.value })} className="input-field">
                <option value="none">{t("admin.ann_type_none")}</option>
                <option value="link">{t("admin.ann_type_link")}</option>
                <option value="image">{t("admin.ann_type_image")}</option>
                <option value="video">{t("admin.ann_type_video")}</option>
              </select>
            </div>
            {annForm.type !== 'none' && <input value={annForm.url} onChange={e => setAnnForm({ ...annForm, url: e.target.value })} className="input-field" placeholder={t("admin.ann_url")} />}
            <input type="datetime-local" value={annForm.schedule} onChange={e => setAnnForm({ ...annForm, schedule: e.target.value })} className="input-field" />
            <p className="text-xs" style={{ color: 'var(--training-muted)' }}>{t("admin.ann_schedule")}</p>
            <button type="submit" className="btn-primary">{t("admin.ann_publish")}</button>
          </form>
        )}

        {tool === 'roles' && level === 4 && (
          <div className="glass-card p-5">
            <div className="space-y-3">
              {allMembers.filter(m => !isSuperAdmin(m)).map(m => (
                <div key={m.id} className="rounded-xl p-4 flex justify-between items-center gap-3 flex-wrap" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--training-line)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--training-ink)' }}>{m.member_name}</p>
                    <p className="text-xs" style={{ color: 'var(--training-muted)' }}>{Number(m.admin_level || 0) ? `${t("admin.admin_level")} ${m.admin_level}` : t("admin.no_access")}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setRole(m, 1)} className="btn-soft text-xs">L1</button>
                    <button onClick={() => setRole(m, 2)} className="btn-soft text-xs">L2</button>
                    <button onClick={() => setRole(m, 3)} className="btn-soft text-xs">L3</button>
                    <button onClick={() => setRole(m, 0)} className="btn-danger text-xs">{t("admin.revoke_role")}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tool === 'analytics' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: t("admin.total_members"), value: stats.total },
              { label: t("admin.completion_rate"), value: `${stats.total ? Math.round((stats.certified / stats.total) * 100) : 0}%` },
              { label: t("admin.active_users"), value: stats.active },
              { label: t("admin.avg_review"), value: stats.pending },
              { label: t("admin.l1_approved"), value: stats.l1 },
              { label: t("admin.l2_approved"), value: stats.l2 },
              { label: t("admin.l3_approved"), value: stats.l3 },
              { label: t("admin.certified_count"), value: stats.certified },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--training-muted)' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'var(--training-gold)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {tool === 'audit' && (
          <div className="glass-card p-5 space-y-2 max-h-96 overflow-auto">
            {auditLogs.length === 0 ? <p style={{ color: 'var(--training-muted)' }}>—</p> : auditLogs.map(log => (
              <div key={log.id} className="flex justify-between gap-3 py-2 text-sm" style={{ borderBottom: '1px solid var(--training-line)' }}>
                <span style={{ color: 'var(--training-ink)' }}><strong>{log.admin_name}</strong> {log.action} <span style={{ color: 'var(--training-muted)' }}>{log.target_name}</span></span>
                <span className="text-xs shrink-0" style={{ color: 'var(--training-muted)' }}>{log.action_date ? new Date(log.action_date).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        )}
        {tool === 'templates' && (
          <TemplateEditor member={member} onAudit={onAudit} t={t} />
        )}
        {tool === 'members' && (
          <MemberManagement member={member} allMembers={allMembers} onApproveLevel={approveLevel} onCertify={handleCertify} onToggleStatus={toggleUserStatus} onReset={resetMember} onDelete={deleteMember} deleteArmed={deleteArmed} t={t} />
        )}
      </div>

      {certModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.7)' }}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg" style={{ color: 'var(--training-ink)' }}>{t("admin.upload_cert")} — {certModal.member_name}</h3>
            <p className="text-sm mt-2 mb-4" style={{ color: 'var(--training-muted)' }}>{t("admin.cert_uploaded")}</p>
            <label className="btn-primary flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" /> {t("admin.upload_cert")}
              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleCertUpload(e, certModal)} className="hidden" />
            </label>
            <button onClick={() => setCertModal(null)} className="btn-ghost mt-2 w-full">{t("common.cancel")}</button>
          </div>
        </div>
      )}

      {scenarioModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ background: 'rgba(1,6,16,0.7)' }}>
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg" style={{ color: 'var(--training-ink)' }}>{t("admin.assign")} — {scenarioModal.member_name}</h3>
            <select value={selectedScenario} onChange={e => setSelectedScenario(Number(e.target.value))} className="input-field mt-4">
              {SCENARIOS.map((s, i) => <option key={i} value={i + 1}>{s}</option>)}
            </select>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { onUpdateMember(scenarioModal.id, { assigned_scenario: selectedScenario }); toast({ title: t("msg.saved") }); onAudit('assigned exercise', scenarioModal.member_name); setScenarioModal(null); }} className="btn-primary flex-1">{t("admin.assign")}</button>
              <button onClick={() => setScenarioModal(null)} className="btn-ghost flex-1">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}