import { useState } from 'react';
import { getAdminLevel, isSuperAdmin, can } from '@/lib/trainingConfig';
import { Search, CheckCircle2, Circle, Award, ShieldCheck } from 'lucide-react';

export default function MemberManagement({ member, allMembers, onApproveLevel, onCertify, onToggleStatus, onReset, onDelete, deleteArmed, t }) {
  const [search, setSearch] = useState('');
  const level = getAdminLevel(member);
  const eligible = allMembers.filter(m => isSuperAdmin(member) || Number(m.admin_level || 0) < level);
  const filtered = eligible.filter(m => `${m.member_name} ${m.certified ? 'certified' : ''} ${m.account_active === false ? 'suspended' : 'active'}`.toLowerCase().includes(search.toLowerCase()));

  const ProgressPill = ({ label, done }) => (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: done ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.06)', color: done ? 'var(--training-ok)' : 'var(--training-muted)' }}>
      {done ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />} {label}
    </span>
  );

  return (
    <div className="glass-card p-5">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--training-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" placeholder={t("admin.search")} />
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? <p style={{ color: 'var(--training-muted)' }}>{t("admin.no_members")}</p> : filtered.map(m => {
          const l1Submitted = m.level1_cert_submitted;
          const l2Submitted = m.level2_cert_submitted && m.level2_cert2_submitted;
          const l3Submitted = m.level3_cert_submitted;
          const canCertify = m.level1_complete && m.level2_complete && m.level3_complete && m.submission_status === 'approved';
          return (
            <div key={m.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--training-line)' }}>
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold" style={{ color: 'var(--training-ink)' }}>{m.member_name}</p>
                    {Number(m.admin_level || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,201,87,0.16)', color: 'var(--training-gold)' }}>
                        <ShieldCheck className="w-3 h-3" /> {t("admin.admin_level")} {m.admin_level}
                      </span>
                    )}
                    {m.certified && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(245,201,87,0.2), rgba(199,145,39,0.2))', color: 'var(--training-gold)' }}>
                        <Award className="w-3 h-3" /> {t("ach.certified")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <ProgressPill label="L1" done={m.level1_complete} />
                    <ProgressPill label="L2" done={m.level2_complete} />
                    <ProgressPill label="L3" done={m.level3_complete} />
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{
                      background: m.submission_status === 'approved' ? 'rgba(74,222,128,0.16)' : m.submission_status === 'pending' ? 'rgba(245,201,87,0.16)' : 'rgba(255,255,255,0.06)',
                      color: m.submission_status === 'approved' ? 'var(--training-ok)' : m.submission_status === 'pending' ? 'var(--training-gold)' : 'var(--training-muted)'
                    }}>
                      {t("nav.exercise")}: {m.submission_status === 'approved' ? t("level.complete") : m.submission_status === 'pending' ? t("admin.pending_review") : t("admin.not_started")}
                    </span>
                  </div>
                </div>
                <span className="status-pill shrink-0" style={m.account_active === false ? { background: 'rgba(190,18,60,0.16)', color: '#fb7185' } : { background: 'rgba(74,222,128,0.16)', color: 'var(--training-ok)' }}>
                  {m.account_active === false ? t("admin.suspended") : t("admin.active")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {can("review", member) && !m.level1_complete && l1Submitted && <button onClick={() => onApproveLevel(m, 1)} className="btn-soft text-xs">Approve L1</button>}
                {can("review", member) && !m.level2_complete && l2Submitted && <button onClick={() => onApproveLevel(m, 2)} className="btn-soft text-xs">Approve L2</button>}
                {can("review", member) && !m.level3_complete && l3Submitted && <button onClick={() => onApproveLevel(m, 3)} className="btn-soft text-xs">Approve L3</button>}
                {can("review", member) && canCertify && !m.certified && <button onClick={() => onCertify(m)} className="btn-primary text-xs">{t("admin.certify")}</button>}
                {can("access", member) && <button onClick={() => onToggleStatus(m)} className={m.account_active === false ? "btn-primary text-xs" : "btn-danger text-xs"}>{m.account_active === false ? t("admin.reactivate") : t("admin.suspend")}</button>}
                {can("reset", member) && <button onClick={() => onReset(m)} className="btn-soft text-xs">{t("admin.reset")}</button>}
                {can("deleteProfile", member) && <button onClick={() => onDelete(m)} className="btn-danger text-xs">{deleteArmed.has(m.id) ? `⚠ ${t("admin.delete")}` : t("admin.delete")}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}