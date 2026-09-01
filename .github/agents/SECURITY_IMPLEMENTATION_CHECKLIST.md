# AAM.Training Security Audit - Implementation Checklist

## Overview
This document tracks the implementation of security fixes for the AAM.Training application.

**Audit Date:** 2026-08-29  
**Target Completion:** 3 weeks  
**Status:** Not Started

---

## Phase 1: CRITICAL (Week 1 - Deploy ASAP)

### ✋ FIX #1: Remove Hard-coded Admin Credentials

**Files to Modify:**
- [ ] `Src/api/lib/trainingConfig.js` - Remove SUPER_ADMIN_NAME and ADMIN_CODE constants
- [ ] `Src/api/Components/training/AuthGate.jsx` - Update admin login flow

**Files to Create:**
- [ ] `base44/functions/verifyAdminAccess.ts` - Backend admin verification
- [ ] `.env.local` - Store admin credentials (NEVER commit)

**Implementation Checklist:**
- [ ] Remove hardcoded "1357441" from trainingConfig.js
- [ ] Remove hardcoded "aa admin 1357441" from trainingConfig.js
- [ ] Create backend function verifyAdminAccess.ts with rate limiting
- [ ] Move credentials to .env.local
- [ ] Update AuthGate handleAdmin() to call backend function
- [ ] Add admin_code password input field
- [ ] Implement rate limiting (max 5 attempts, 15-minute lockout)
- [ ] Log failed and successful admin attempts to AuditLog

**Testing:**
- [ ] ✓ Verify no hardcoded credentials in Src/api directory
- [ ] ✓ Verify no credentials in dist/ bundle after build
- [ ] ✓ Test admin login with correct code → Success
- [ ] ✓ Test admin login with wrong code → Failure + rate limiting
- [ ] ✓ Test 6 failed attempts → Account locked for 15 minutes
- [ ] ✓ Check AuditLog entity has entries for attempts

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

### ✋ FIX #2: Implement Backend Authorization Validation

**Files to Modify:**
- [ ] `Src/api/Components/training/Admindashboard.jsx` - Replace direct API calls with backend functions
- [ ] `Src/api/lib/trainingConfig.js` - Keep can() function for frontend UX only

**Files to Create:**
- [ ] `base44/middleware/adminAuth.ts` - Authorization middleware
- [ ] `base44/functions/member-operations.ts` - All admin operations
  - [ ] approveMemberLevel()
  - [ ] revokeMemberCertificate()
  - [ ] deleteMemberProfile()
  - [ ] suspendMemberAccount()
  - [ ] reactivateMemberAccount()
  - [ ] resetMemberProgress()
  - [ ] setMemberRole()
  - [ ] publishAnnouncement()

**Implementation Checklist:**
- [ ] Create adminAuth middleware with permission checks
- [ ] Create backend functions for each admin operation
- [ ] Each function validates admin_level before operation
- [ ] Each function logs to AuditLog with actor, action, target, IP, timestamp
- [ ] Prevent same-level or lower-level users from modifying each other
- [ ] Only super admin (level 4) can assign roles
- [ ] Update Admindashboard.jsx to call backend functions instead of direct API
- [ ] Add error handling for permission denied responses
- [ ] Update all toast messages to show permission errors

**Testing:**
- [ ] ✓ Login as admin_level 0 → Cannot call admin functions
- [ ] ✓ Login as admin_level 1 → Can announce, review only
- [ ] ✓ Login as admin_level 2 → Can approve levels, revoke certs, reset
- [ ] ✓ Login as admin_level 3 → Can manage access
- [ ] ✓ Login as admin_level 4 → Can do everything
- [ ] ✓ Check AuditLog for all operations
- [ ] ✓ Verify level 1 cannot delete members
- [ ] ✓ Verify level 2 cannot assign roles
- [ ] ✓ Verify API calls rejected if no middleware auth

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

### ✋ FIX #4: Validate File Uploads

**Files to Modify:**
- [ ] `Src/api/Components/training/Excersise.jsx` - Use backend validation
- [ ] `Src/api/Components/training/Settings.jsx` - Use backend validation

**Files to Create:**
- [ ] `base44/functions/validateAndUploadFile.ts` - File validation and upload

**Implementation Checklist:**
- [ ] Create validateAndUploadFile() backend function
- [ ] Validate MIME type against whitelist (jpeg, png, webp, mp4, pdf)
- [ ] Validate file size (images: 5MB, videos: 100MB)
- [ ] Check magic bytes to verify file content
- [ ] Sanitize filenames (remove path traversal, special chars)
- [ ] Reject suspicious extensions (.exe, .bat, .js, .zip, etc)
- [ ] Generate unique filename to prevent overwrites
- [ ] Log all uploads to AuditLog with filename, size, type
- [ ] Update Exercise.jsx to read file as base64, call backend
- [ ] Update Settings.jsx to read file as base64, call backend
- [ ] Add client-side UX validation (before backend call)
- [ ] Show file size/type errors to user

**Testing:**
- [ ] ✓ Upload valid JPEG (2MB) → Success
- [ ] ✓ Upload valid PNG (1MB) → Success
- [ ] ✓ Upload valid MP4 (50MB) → Success
- [ ] ✓ Upload .exe file → Rejected (magic bytes)
- [ ] ✓ Upload .exe renamed to .jpg → Rejected (content mismatch)
- [ ] ✓ Upload 150MB video → Rejected (exceeds limit)
- [ ] ✓ Upload filename with ../ → Sanitized
- [ ] ✓ Upload SVG with JavaScript → Rejected
- [ ] ✓ Check AuditLog for all uploads

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

## Phase 2: HIGH (Week 2)

### ✋ FIX #3: Hash Access Codes

**Files to Modify:**
- [ ] `BASE/enitity/Member.jsonc` - Add access_code_hash field
- [ ] `Src/api/Components/training/AuthGate.jsx` - Use backend verification

**Files to Create:**
- [ ] `base44/functions/verifyAccessCode.ts` - Code verification with bcrypt
- [ ] `base44/functions/createMember.ts` - Create member with hashed code
- [ ] `base44/functions/hashAccessCode.ts` - Utility for hashing (if needed)

**Implementation Checklist:**
- [ ] Update Member entity with access_code_hash field
- [ ] Create verifyAccessCode() function with bcrypt compare
- [ ] Create createMember() function that hashes access codes
- [ ] Log failed authentication attempts to AuditLog
- [ ] Log successful authentication to AuditLog
- [ ] Update AuthGate handleSignIn() to call backend verification
- [ ] Update AuthGate handleCreate() to call backend member creation
- [ ] Remove direct plaintext code comparison from frontend
- [ ] Add rate limiting to code verification (prevent brute force)

**Database Migration:**
- [ ] [ ] Create migration script to hash existing access codes
- [ ] [ ] Verify no plaintext codes remain in database

**Testing:**
- [ ] ✓ Create new member with code "123456"
- [ ] ✓ Check Member.access_code_hash is bcrypt hash (~60 chars, starts with $2a$)
- [ ] ✓ Check database has NO plaintext "123456" anywhere
- [ ] ✓ Sign in with "123456" → Success
- [ ] ✓ Sign in with "123457" → Failure
- [ ] ✓ Check AuditLog for auth attempts
- [ ] ✓ Attempt brute force → Rate limited after 5 attempts

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Database migration applied: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

### ✋ FIX #5: Validate Certificate URLs

**Files to Modify:**
- [ ] `Src/api/Components/training/TemplateEditing.jsx` - Add URL validation
- [ ] `Src/api/Components/training/Admindashboard.jsx` - Validate before use

**Files to Create:**
- [ ] `base44/functions/validateCertificateUrl.ts` - URL validation

**Configuration:**
- [ ] Update .env.local with approved domains for certificates

**Implementation Checklist:**
- [ ] Create validateCertificateUrl() function
- [ ] Check URL format validity
- [ ] Require HTTPS protocol only
- [ ] Whitelist approved domains (base44.com, media.base44.com)
- [ ] Prevent parameter injection (no ?redirect=, ?callback=)
- [ ] Fetch URL headers to verify accessibility
- [ ] Check Content-Type header matches file type
- [ ] Check Content-Length doesn't exceed 50MB
- [ ] Update TemplateEditor to validate URLs before saving
- [ ] Disable manual URL input in templates (upload only)
- [ ] Display URL in read-only format

**Testing:**
- [ ] ✓ Upload from approved domain → Success
- [ ] ✓ Try entering phishing.com URL → Rejected
- [ ] ✓ Try HTTP URL → Rejected (HTTPS required)
- [ ] ✓ Try URL with ?redirect= parameter → Rejected
- [ ] ✓ Try unreachable URL → Rejected
- [ ] ✓ Try URL with wrong Content-Type → Rejected
- [ ] ✓ Check that manual URL input is disabled

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

### ✋ FIX #8: Add Security Headers

**Files to Modify:**
- [ ] `vite.config.js` - Add server headers config
- [ ] `index.html` - Add CSP meta tags

**Files to Create:**
- [ ] `base44/middleware/securityHeaders.ts` - Headers middleware (optional)

**Implementation Checklist:**
- [ ] Add X-Frame-Options: DENY header
- [ ] Add X-Content-Type-Options: nosniff header
- [ ] Add X-XSS-Protection: 1; mode=block header
- [ ] Add Referrer-Policy: strict-origin-when-cross-origin header
- [ ] Add Permissions-Policy: camera=(), microphone=(), geolocation=() header
- [ ] Add Content-Security-Policy header in index.html meta tag
- [ ] Add HSTS header for production
- [ ] Test headers with curl/browser

**Testing:**
- [ ] ✓ curl response includes all security headers
- [ ] ✓ X-Frame-Options header set to DENY
- [ ] ✓ CSP headers present and correct
- [ ] ✓ HSTS enabled (production only)
- [ ] ✓ Referrer-Policy set to strict-origin-when-cross-origin
- [ ] ✓ Try embedding in iframe → Browser blocks
- [ ] ✓ Upload .txt as .jpg → Browser doesn't execute

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

## Phase 3: MEDIUM (Week 3)

### ✋ FIX #6: Escape Email Template Variables

**Files to Modify:**
- [ ] `Src/api/lib/emailTemplates.js` - Add HTML escaping
- [ ] `Src/api/Components/training/TemplateEditing.jsx` - Add validation

**Files to Create:**
- [ ] `base44/functions/validateEmailTemplate.ts` - Template validation

**Implementation Checklist:**
- [ ] Add escapeHtml() function to emailTemplates.js
- [ ] Update fillTemplate() to escape variables
- [ ] Create validateEmailTemplate() backend function
- [ ] Reject templates with <script>, javascript:, event handlers
- [ ] Validate placeholder names (only {{member_name}} allowed)
- [ ] Update TemplateEditor to call backend validation
- [ ] Show validation errors to user

**Testing:**
- [ ] ✓ Create template: "Hi {{member_name}}" → Success
- [ ] ✓ Try: "<script>alert('xss')</script>" → Rejected
- [ ] ✓ Try: "javascript:alert()" → Rejected
- [ ] ✓ Try: "<img onload=...>" → Rejected
- [ ] ✓ Create member with name: John <script>
- [ ] ✓ Send email with {{member_name}}
- [ ] ✓ Email received with: John &lt;script&gt;
- [ ] ✓ Verify script tags don't execute

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

### ✋ FIX #7: Improve OAuth Token Handling

**Files to Modify:**
- [ ] `Src/api/lib/app-params.js` - Use sessionStorage for tokens
- [ ] `Src/api/Pages/OauthConsent.jsx` - Avoid token in URLs
- [ ] `Src/api/Base44Client.js` - Ensure token in headers
- [ ] `vite.config.js` - Add Referrer-Policy header

**Implementation Checklist:**
- [ ] Mark access_token as sensitive in app-params.js
- [ ] Store tokens in sessionStorage only (not localStorage)
- [ ] Prevent token from appearing in browser history
- [ ] Use Authorization header instead of URL parameters
- [ ] Remove token from returnTo URLs in OAuth flow
- [ ] Add Referrer-Policy: strict-origin-when-cross-origin
- [ ] Test token lifecycle (cleared on tab close)

**Testing:**
- [ ] ✓ OAuth login flow
- [ ] ✓ Check browser history → No access_token in URL
- [ ] ✓ Check DevTools Network → Token in Authorization header
- [ ] ✓ Check sessionStorage → Token present
- [ ] ✓ Check localStorage → No token stored
- [ ] ✓ Close tab and reopen app → Requires re-login
- [ ] ✓ Click link to external site
- [ ] ✓ Check Referer header → No token included

**Code Review:**
- [ ] PR reviewed by: _______________
- [ ] Security team approved: _______________
- [ ] Staging tested: _______________

**Deploy to Production:**
- [ ] Date: _______________
- [ ] Deployed by: _______________
- [ ] Production tested: _______________

---

## Post-Deployment

### Final Security Validation
- [ ] All 8 fixes implemented
- [ ] All tests passing
- [ ] Audit logs complete
- [ ] No security warnings in npm audit
- [ ] Penetration testing passed
- [ ] OWASP Top 10 compliance verified

### Ongoing Maintenance
- [ ] Set up weekly vulnerability scanning
- [ ] Configure monthly dependency updates
- [ ] Schedule quarterly security audits
- [ ] Train team on secure coding practices

### Documentation
- [ ] Update security.md or docs/security section
- [ ] Document new security controls
- [ ] Create runbook for security incidents
- [ ] Add security checklist to deployment process

---

## Sign-Off

**Audit Completion Date:** 2026-08-29  
**Implementation Start Date:** _______________  
**Phase 1 Completion Date:** _______________  
**Phase 2 Completion Date:** _______________  
**Phase 3 Completion Date:** _______________  

**Project Lead Approval:** _______________  
**Security Lead Approval:** _______________  
**CTO/VP Engineering Approval:** _______________  

---

## Notes

Use this section to track any issues, delays, or changes to the implementation plan.

```
[Add notes here]
```

---

**Last Updated:** 2026-08-29  
**Next Review:** After Phase 1 completion
