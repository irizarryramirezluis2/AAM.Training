export const LOGO_URL = "https://media.base44.com/images/public/6a9100b52d46fa50fea553b4/cc532f063_Gemini_Generated_Image_ulgbb3ulgbb3ulgb.png";

export const SUPER_ADMIN_NAME = "aa admin 1357441";
export const ADMIN_CODE = "1357441";
export const NAME_REGEX = /^[A-Za-z]+ [A-Z]$/;
export const CODE_REGEX = /^\d{6}$/;

export const SCENARIOS = [
  "Men Ministry Father-Son Breakfast — Flyer",
  "Women Ministry Annual Reflection Tea — Program",
  "Kids Society VBS — Bilingual Announcement",
  "Missions Society Global Outreach — Flyer",
  "Youth Society Friday Night Encounter — Announcement",
  "Church Homecoming Sunday — Bilingual Program"
];

export const LEVELS = [
  {
    id: 1,
    key: "level1",
    titleKey: "level1.title",
    descKey: "level1.desc",
    certFields: [{ id: "level1_cert_url", labelKey: "level.cert_label" }],
    resources: [
      { label: "Graphic Design Essentials", url: "https://www.canva.com/design-school/courses/graphic-design-essentials" },
      { label: "Canva Colors", url: "https://www.canva.com/colors/" },
      { label: "Design elements and principles", url: "https://www.canva.com/learn/design-elements-principles/" },
      { label: "Flux Academy — Design Playlist", url: "https://www.youtube.com/watch?v=SnxFkHqN1RA&list=PLC_3PF-n6vQJ0yzsHrSlyWrDyHKL0HhbV" },
      { label: "Typography Basics", url: "https://www.youtube.com/watch?v=SnxFkHqN1RA&list=PLC_3PF-n6vQJ0yzsHrSlyWrDyHKL0HhbV" },
      { label: "Google Fonts Guide", url: "https://www.youtube.com/watch?v=SnxFkHqN1RA&list=PLC_3PF-n6vQJ0yzsHrSlyWrDyHKL0HhbV" }
    ]
  },
  {
    id: 2,
    key: "level2",
    titleKey: "level2.title",
    descKey: "level2.desc",
    certFields: [
      { id: "level2_cert1_url", labelKey: "level2.cert1_label" },
      { id: "level2_cert2_url", labelKey: "level2.cert2_label" }
    ],
    resources: [
      { label: "Visual Suite Guide", url: "https://www.canva.com/design-school/courses/meet-the-visual-suite" },
      { label: "Canva Design Essential Guide", url: "https://www.canva.com/design-school/courses/canva-essentials" }
    ]
  },
  {
    id: 3,
    key: "level3",
    titleKey: "level3.title",
    descKey: "level3.desc",
    certFields: [{ id: "level3_cert_url", labelKey: "level.cert_label" }],
    resources: [
      { label: "Canva AI use", url: "https://www.canva.com/design-school/courses/work-smarter-with-ai" },
      { label: "AI Essentials", url: "https://www.canva.com/design-school/lessons/use-ai-to-learn-more-effectively" },
      { label: "Use of Google Gemini", url: "https://youtu.be/nlfqUdJX6cA?si=U7QeEtPIiMWpZYqQ" }
    ]
  }
];

export function isSuperAdmin(member) {
  return String(member?.member_name || "").trim().toLowerCase() === SUPER_ADMIN_NAME.toLowerCase();
}

export function getAdminLevel(member) {
  if (isSuperAdmin(member)) return 4;
  return Number(member?.admin_level || 0);
}

export function can(action, member) {
  const lvl = getAdminLevel(member);
  switch (action) {
    case "review":
    case "announce": return lvl >= 1;
    case "reset":
    case "deleteProfile":
    case "revokeCert": return lvl >= 2;
    case "access": return lvl >= 3;
    case "roles": return lvl === 4;
    default: return false;
  }
}

export function isUnlocked(section, member) {
  if (!member) return false;
  if (getAdminLevel(member) >= 1) return true;
  switch (section) {
    case "dashboard":
    case "level1":
    case "achievements":
    case "qa":
    case "settings": return true;
    case "level2": return !!member.level1_complete;
    case "level3": return !!member.level2_complete;
    case "exercise": return !!member.level3_complete;
    default: return false;
  }
}

export function statusText(member, level, t) {
  const complete = member[`level${level}_complete`];
  const submitted = level === 2
    ? member.level2_cert_submitted && member.level2_cert2_submitted
    : member[`level${level}_cert_submitted`];
  if (complete) return t("level.status_approved");
  if (submitted) return t("level.status_submitted");
  return t("level.status_not_submitted");
}