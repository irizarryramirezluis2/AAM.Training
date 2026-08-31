import { base44 } from '@/api/base44Client';

export const TEMPLATE_TYPES = [
  { key: 'level1_approval', labelKey: 'tmpl.level1_approval' },
  { key: 'level2_approval', labelKey: 'tmpl.level2_approval' },
  { key: 'level3_approval', labelKey: 'tmpl.level3_approval' },
  { key: 'exercise_approval', labelKey: 'tmpl.exercise_approval' },
  { key: 'certification', labelKey: 'tmpl.certification' },
  { key: 'account_suspended', labelKey: 'tmpl.account_suspended' },
  { key: 'account_reactivated', labelKey: 'tmpl.account_reactivated' },
  { key: 'account_reset', labelKey: 'tmpl.account_reset' },
];

export const DEFAULT_TEMPLATES = {
  level1_approval: { subject: 'Level 1 Approved — {{member_name}}', body: 'Great news! {{member_name}} has completed Level 1: Graphic Design. They can now proceed to Level 2.' },
  level2_approval: { subject: 'Level 2 Approved — {{member_name}}', body: 'Great news! {{member_name}} has completed Level 2: Canva Essentials. They can now proceed to Level 3.' },
  level3_approval: { subject: 'Level 3 Approved — {{member_name}}', body: 'Great news! {{member_name}} has completed Level 3: AI Use. They can now proceed to the final Exercise.' },
  exercise_approval: { subject: 'Exercise Approved — {{member_name}}', body: 'Great news! {{member_name}} has passed the final exercise and is ready for certification.' },
  certification: { subject: 'Certified! — {{member_name}}', body: 'Congratulations! {{member_name}} has completed all training requirements and is now a certified designer.' },
  account_suspended: { subject: 'Account Suspended — {{member_name}}', body: '{{member_name}} has been suspended by an administrator.' },
  account_reactivated: { subject: 'Account Reactivated — {{member_name}}', body: '{{member_name}} has been reactivated and can access the platform again.' },
  account_reset: { subject: 'Progress Reset — {{member_name}}', body: '{{member_name}} has had their training progress reset by an administrator.' },
};

export async function loadTemplates() {
  try {
    const templates = await base44.entities.EmailTemplate.list('-updated_date', 100);
    const map = {};
    templates.forEach(tl => { map[tl.template_type] = tl; });
    return map;
  } catch {
    return {};
  }
}

export function fillTemplate(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

export async function generateImageWithName(imageUrl, name, xPct, yPct, fontSize, color) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const x = (xPct / 100) * img.naturalWidth;
        const y = (yPct / 100) * img.naturalHeight;
        const scaledSize = Math.max(12, fontSize * (img.naturalWidth / 800));
        ctx.font = `bold ${scaledSize}px "DM Sans", "Arial", sans-serif`;
        ctx.fillStyle = color || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name || '', x, y);
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          const file = new File([blob], 'generated.png', { type: 'image/png' });
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            resolve(file_url);
          } catch (e) { reject(e); }
        }, 'image/png');
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageUrl;
  });
}

export async function sendTemplateEmail(templateType, vars, allMembers, t) {
  const templates = await loadTemplates();
  const template = templates[templateType];
  const defaults = DEFAULT_TEMPLATES[templateType] || { subject: '', body: '' };
  const subject = fillTemplate(template?.subject || defaults.subject, vars);
  const body = fillTemplate(template?.body || defaults.body, vars);

  let generatedImageUrl = null;
  if (template?.use_image && template.image_url) {
    try {
      generatedImageUrl = await generateImageWithName(
        template.image_url,
        vars.member_name || '',
        template.name_x ?? 50,
        template.name_y ?? 50,
        template.name_font_size || 48,
        template.name_color || '#1a2a3a'
      );
    } catch {}
  }

  const emailBody = generatedImageUrl
    ? `<div style="text-align:center;font-family:'DM Sans',sans-serif;"><img src="${generatedImageUrl}" style="max-width:100%;border-radius:12px;" /><p style="margin-top:16px;font-size:15px;line-height:1.6;color:#334155;">${body}</p></div>`
    : `<div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">${body}</div>`;

  const emails = allMembers.filter(m => m.email && m.account_active !== false).map(m => m.email);
  for (const email of emails) {
    try { await base44.integrations.Core.SendEmail({ to: email, subject, body: emailBody }); } catch {}
  }
  return generatedImageUrl;
}