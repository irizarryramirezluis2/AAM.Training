import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { getAdminLevel } from '@/lib/trainingConfig';
import { Send } from 'lucide-react';

export default function QA({ member, questions, onRefresh, t }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [replies, setReplies] = useState({});
  const isAdmin = getAdminLevel(member) >= 1;

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      await base44.entities.Question.create({
        question_text: text.trim(),
        question_author: member.member_name,
        question_date: new Date().toISOString()
      });
      setText('');
      toast({ title: t("msg.question_posted") });
      onRefresh();
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setPosting(false);
  };

  const handleReply = async (qId) => {
    const reply = replies[qId]?.trim();
    if (!reply) return;
    try {
      await base44.entities.Question.update(qId, {
        answer_text: reply,
        answer_author: member.member_name,
        answer_date: new Date().toISOString()
      });
      setReplies(prev => ({ ...prev, [qId]: '' }));
      toast({ title: t("msg.saved") });
      onRefresh();
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
  };

  return (
    <div className="glass-card p-6 md:p-8 animate-rise">
      <h2 className="heading-font text-2xl" style={{ color: 'var(--training-ink)' }}>{t("qa.title")}</h2>
      <p className="mt-3" style={{ color: 'var(--training-muted)' }}>{t("qa.desc")}</p>
      <form onSubmit={handlePost} className="glass-card p-5 mt-6">
        <label className="font-bold text-sm" style={{ color: 'var(--training-ink)' }}>{t("qa.ask")}</label>
        <textarea value={text} onChange={e => setText(e.target.value)} className="input-field mt-2 min-h-[110px]" placeholder={t("qa.placeholder")} />
        <button type="submit" disabled={posting} className="btn-primary mt-3 flex items-center gap-2">
          <Send className="w-4 h-4" /> {t("qa.post")}
        </button>
      </form>
      <div className="mt-6 space-y-4">
        {questions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--training-muted)' }}>{t("qa.no_questions")}</p>
        ) : questions.map(q => (
          <article key={q.id} className="glass-card p-5">
            <div className="flex justify-between gap-3 items-start">
              <span className="font-bold text-sm" style={{ color: 'var(--training-ink)' }}>{q.question_author}</span>
              <span className="text-xs" style={{ color: 'var(--training-muted)' }}>{q.question_date ? new Date(q.question_date).toLocaleDateString() : ''}</span>
            </div>
            <p className="mt-3" style={{ color: 'var(--training-ink)' }}>{q.question_text}</p>
            {q.answer_text ? (
              <div className="mt-4 pl-4 text-sm" style={{ borderLeft: '2px solid var(--training-gold)' }}>
                <p className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--training-gold)' }}>{t("qa.reply")}</p>
                <p className="mt-1" style={{ color: 'var(--training-muted)' }}>{q.answer_text}</p>
              </div>
            ) : isAdmin ? (
              <div className="mt-4 flex gap-2">
                <input value={replies[q.id] || ''} onChange={e => setReplies(prev => ({ ...prev, [q.id]: e.target.value }))} className="input-field" placeholder={`${t("qa.reply")}...`} />
                <button onClick={() => handleReply(q.id)} className="btn-soft shrink-0">{t("qa.post")}</button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}