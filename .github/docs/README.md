# 🎯 AAM.Training - Admin Audit Reporting System

## 📋 Welcome to the Admin Audit Reporting Infrastructure

This directory contains a **complete, production-ready system** for managing tiered admin access to ethics and compliance audit reports.

---

## ✨ What You Get

### Access Control System
- **Level 3 (Admin)**: Access to reports every 2 weeks
- **Level 4 (Super Admin)**: Access to reports every 3 days + manual generation + access logs

### 6 Automated Report Types
1. **Ethics Violations** - Hardcoded secrets, privacy issues
2. **Security Incidents** - Vulnerabilities and patches
3. **Compliance Summary** - GDPR, CCPA, COPPA status
4. **Data Access** - Who accessed what data, when
5. **Consent Status** - User consent preferences
6. **Agent Actions** - All agent operations audit trail

### Complete Infrastructure
- ✅ PostgreSQL database schema (4 tables, immutable audit trails)
- ✅ Express.js API (8 endpoints with access control)
- ✅ Node.js scheduler (automatic report generation)
- ✅ React dashboard (4 tabs with full UI)
- ✅ Comprehensive documentation (5 guides + checklist)

---

## 🚀 Quick Start

### For the Impatient (2 hours)
👉 **Go to**: [ADMIN_SETUP_CHECKLIST.md](ADMIN_SETUP_CHECKLIST.md)

It's a 7-phase checklist that gets you from zero to working admin reports.

### For Understanding (30 minutes)
👉 **Go to**: [ADMIN_REPORTING_SUMMARY.md](ADMIN_REPORTING_SUMMARY.md)

High-level overview of what was built and why.

### For Full Reference
👉 **Go to**: [ADMIN_REPORTING_GUIDE.md](ADMIN_REPORTING_GUIDE.md)

Complete setup guide with configuration options, monitoring, and troubleshooting.

### For Finding Things
👉 **Go to**: [FILE_INDEX.md](FILE_INDEX.md)

Navigation guide for all files in this system.

---

## 📁 Files in This System

```
.github/docs/
├── 📖 FILE_INDEX.md                          ← START HERE FOR NAVIGATION
├── ⭐ ADMIN_SETUP_CHECKLIST.md               ← START HERE FOR QUICK SETUP
├── 📋 ADMIN_REPORTING_GUIDE.md               ← Full reference guide
├── 📊 ADMIN_REPORTING_SUMMARY.md             ← System overview
├── 🗄️  ADMIN_REPORTING_SCHEMA.md             ← Database schema
├── 🔌 ADMIN_REPORT_API.js                    ← Backend API (copy to src/routes/)
├── ⏰ report-scheduler.js                    ← Report generator (copy to src/services/)
└── ✅ README.md                              ← This file

Src/Components/
└── 🎨 AdminAuditDashboard.jsx                ← Dashboard UI (copy to src/Components/)
```

---

## 🎯 Common Tasks

### I want to get this working ASAP
```
1. Open: .github/docs/ADMIN_SETUP_CHECKLIST.md
2. Follow the 7-phase checklist (~2 hours)
3. Done! Reports will be generated automatically
```

### I want to understand how it works
```
1. Open: ADMIN_REPORTING_SUMMARY.md
2. Read the "Report Generation Flow" section
3. Check individual files for implementation details
```

### I need to modify something
```
1. Find the file: Use FILE_INDEX.md or grep for keywords
2. Read the implementation file: It has extensive comments
3. Consult the guide: ADMIN_REPORTING_GUIDE.md has config options
```

### I need to troubleshoot something
```
1. Check: ADMIN_SETUP_CHECKLIST.md#-troubleshooting
2. Or: ADMIN_REPORTING_GUIDE.md#troubleshooting
3. Monitor database: See section "Monitoring & Maintenance"
```

---

## 📊 System Architecture

### Database Layer
```
admin_audit_reports          - Stores generated reports
admin_report_access_logs     - Audit trail of access
report_schedules             - Scheduling configuration
report_generation_audit      - Generation tracking
```

### API Layer
```
GET  /api/admin/reports              - List reports
GET  /api/admin/reports/:id          - View report
POST /api/admin/reports/generate     - Manual generation (L4+)
GET  /api/admin/reports/:id/download - Download JSON
POST /api/admin/reports/:id/email    - Email report
GET  /api/admin/summary              - Dashboard data
GET  /api/admin/schedule             - Generation schedule
GET  /api/admin/access-logs          - Access audit (L4+)
```

### Service Layer
```
report-scheduler.js
├─ Loads schedules from database
├─ Creates cron tasks
├─ Generates reports on schedule
├─ Handles errors and retries
└─ Logs generation events
```

### UI Layer
```
AdminAuditDashboard.jsx
├─ Overview tab (summary, metrics)
├─ Reports tab (list, view, download, email)
├─ Schedule tab (generation times)
└─ Access Logs tab (L4 only - who accessed what)
```

---

## 🔐 Access Control

### How It Works

1. **Database**: Reports have `min_admin_level` field
2. **API**: All endpoints check `user.admin_level` via middleware
3. **Frontend**: Component checks admin level and shows/hides UI
4. **Logging**: All access logged to immutable audit trail

### Admin Levels

| Level | Role | Access | Frequency |
|-------|------|--------|-----------|
| 0-2 | User/Staff | None | N/A |
| 3 | Admin | Reports | Every 2 weeks |
| 4 | Super Admin | Reports + Logs | Every 3 days |

---

## 📈 Reports Included

### Ethics Violations
Detects and reports on:
- Hardcoded secrets (API keys, passwords)
- Plaintext passwords in code
- Unauthorized tracking code
- Sensitive data logging
- PII exposure
- Missing input validation
- Authentication bypasses

### Security Incidents
Reports on:
- Detected vulnerabilities
- Applied patches
- Security updates
- Incident response status

### Compliance Summary
Tracks:
- GDPR compliance status
- CCPA compliance status
- COPPA compliance status
- Violations resolved
- Compliance score

### Data Access
Monitors:
- Who accessed what data
- Access timestamps
- Sensitive data access patterns
- Unusual access

### Consent Status
Shows:
- Users with granted consent
- Users with denied consent
- Users with pending consent
- Consent rate trends

### Agent Actions
Audits:
- Code Rewriter operations
- Security Agent actions
- Test & Debug Agent runs
- Ethics Agent auto-fixes

---

## ⏰ Automatic Report Generation

Reports are automatically generated on schedule:

### Level 3 Admins
- Generation: Every 2 weeks
- Time: Midnight UTC (configurable)
- Notification: Email (when integrated)

### Level 4 Super Admins
- Generation: Every 3 days
- Time: Midnight UTC (configurable)
- Notification: Email (when integrated)
- Manual: Can generate any time

**First reports** will be generated automatically according to schedule after setup.

**Or trigger manually** via API (Level 4 only):
```bash
curl -X POST -H "Authorization: Bearer TOKEN" \
  -d '{"report_type":"ethics_violations","period_days":7}' \
  http://localhost:3000/api/admin/reports/generate
```

---

## 📖 Documentation Structure

```
Quick Start
    ↓
Choose one based on your needs:

Option A: Just make it work
    → ADMIN_SETUP_CHECKLIST.md
    → 7 phases, ~2 hours
    
Option B: Understand first
    → ADMIN_REPORTING_SUMMARY.md
    → Then ADMIN_SETUP_CHECKLIST.md
    
Option C: Deep dive
    → ADMIN_REPORTING_GUIDE.md
    → Then individual files
    
Option D: Find specific info
    → FILE_INDEX.md
    → Links to exact sections
```

---

## 🛠️ Integration Steps

### Phase 1: Database (15 min)
```bash
psql -d your_db < .github/docs/ADMIN_REPORTING_SCHEMA.md
```

### Phase 2: User Setup (5 min)
```sql
UPDATE users SET admin_level = 3 WHERE email = 'admin@example.com';
UPDATE users SET admin_level = 4 WHERE email = 'superadmin@example.com';
```

### Phase 3: Dependencies (2 min)
```bash
npm install node-cron
```

### Phase 4: Backend (30 min)
- Copy `report-scheduler.js` to `src/services/`
- Copy `ADMIN_REPORT_API.js` to `src/routes/`
- Register in your Express app
- Start scheduler on server startup

### Phase 5: Frontend (15 min)
- Copy `AdminAuditDashboard.jsx` to `src/Components/`
- Add route to `src/routes.jsx`
- Add navigation link (for Level 3+ users)

### Phase 6: Testing (30 min)
- Verify scheduler starts
- Test API endpoints
- Test dashboard UI
- Generate test report

**Total**: ~2 hours

For detailed steps, see: **[ADMIN_SETUP_CHECKLIST.md](ADMIN_SETUP_CHECKLIST.md)**

---

## ✅ Verification

After setup, verify:

✅ Scheduler shows in logs: "Report Scheduler started"  
✅ Level 3 users can access `/admin/audit`  
✅ Level 4 users see Access Logs tab  
✅ Test report generates via API  
✅ Reports appear in dashboard  
✅ Accesses logged in audit trail  

See: **[ADMIN_SETUP_CHECKLIST.md#-verification-checklist](ADMIN_SETUP_CHECKLIST.md#-verification-checklist)**

---

## 🔍 Monitoring

### Check Scheduler Status
```bash
# In server logs, look for:
# ✅ Report Scheduler started successfully
# ⏰ Scheduling ethics_violations_3 - Frequency: 2_weeks
```

### View Generated Reports
```sql
SELECT * FROM admin_audit_reports ORDER BY generated_at DESC;
```

### View Access Logs
```sql
SELECT aral.*, ar.report_type 
FROM admin_report_access_logs aral
JOIN admin_audit_reports ar ON aral.report_id = ar.id
ORDER BY aral.accessed_at DESC;
```

### Monitor Generation History
```sql
SELECT * FROM report_generation_audit ORDER BY triggered_at DESC;
```

More: **[ADMIN_REPORTING_GUIDE.md#monitoring--maintenance](ADMIN_REPORTING_GUIDE.md#monitoring--maintenance)**

---

## 🚨 Troubleshooting Quick Guide

| Problem | Fix | Details |
|---------|-----|---------|
| Scheduler won't start | `npm install node-cron` | See ADMIN_SETUP_CHECKLIST.md |
| 403 Forbidden error | Check admin_level | Must be 3+ |
| Reports not showing | Generate test report | See ADMIN_SETUP_CHECKLIST.md Phase 6c |
| Dashboard won't load | Check route registration | See ADMIN_SETUP_CHECKLIST.md Phase 5 |

More: **[ADMIN_SETUP_CHECKLIST.md#-troubleshooting](ADMIN_SETUP_CHECKLIST.md#-troubleshooting)**

---

## 📞 Support & Resources

### Need Help?
1. **Can't get it working?** → [ADMIN_SETUP_CHECKLIST.md#-troubleshooting](ADMIN_SETUP_CHECKLIST.md#-troubleshooting)
2. **Want to configure?** → [ADMIN_REPORTING_GUIDE.md#configuration](ADMIN_REPORTING_GUIDE.md#configuration)
3. **Need to modify code?** → Look in [FILE_INDEX.md](FILE_INDEX.md)
4. **Lost?** → Start at [FILE_INDEX.md](FILE_INDEX.md#-how-to-use-this-index)

### Key Files

| File | Purpose | Read Time |
|------|---------|-----------|
| ADMIN_SETUP_CHECKLIST.md | Get it working | 15 min |
| ADMIN_REPORTING_GUIDE.md | Complete reference | 30 min |
| ADMIN_REPORTING_SUMMARY.md | Understand the system | 10 min |
| FILE_INDEX.md | Find what you need | 5 min |

---

## 🎓 Learning Path

```
New to this system?

Step 1: Read this README (you are here) - 5 min
Step 2: Go to ADMIN_SETUP_CHECKLIST.md - 15 min reading
Step 3: Follow the checklist - 2 hours setup
Step 4: Monitor first report generation - 5 min
Step 5: Reference ADMIN_REPORTING_GUIDE.md as needed
```

---

## 🌟 Key Features

✨ **Tiered Access Control**
- Different report frequencies per admin level
- All access logged and auditable
- Level-based UI customization

✨ **Automatic Report Generation**
- Scheduled on cron basis
- Level 3: Every 2 weeks
- Level 4: Every 3 days
- Manual generation for super admins

✨ **Six Report Types**
- Ethics violations, security, compliance, data access, consent, agent actions
- Each with metrics and recommendations
- Actionable insights for admins

✨ **Immutable Audit Trail**
- All accesses logged
- Generation events tracked
- 7-year retention
- Super-admin oversight

✨ **Production Ready**
- Full error handling
- Retry mechanism
- Comprehensive logging
- Security built-in

---

## 📊 What You Need

### Requirements
- PostgreSQL 13+
- Node.js 14+
- Express.js backend
- React 18+ frontend
- npm package manager

### Dependencies
```bash
npm install node-cron
```

### Time Investment
- Setup: ~2 hours
- Testing: ~30 minutes
- Monitoring first report: ~5 minutes

---

## 🎯 Next Steps

### I'm ready to get started
👉 Go to: **[ADMIN_SETUP_CHECKLIST.md](ADMIN_SETUP_CHECKLIST.md)**

### I want to understand first
👉 Go to: **[ADMIN_REPORTING_SUMMARY.md](ADMIN_REPORTING_SUMMARY.md)**

### I need full reference docs
👉 Go to: **[ADMIN_REPORTING_GUIDE.md](ADMIN_REPORTING_GUIDE.md)**

### I need to find something specific
👉 Go to: **[FILE_INDEX.md](FILE_INDEX.md)**

---

## 📝 Files in This System

| File | Type | Purpose | Size |
|------|------|---------|------|
| ADMIN_SETUP_CHECKLIST.md | 📄 Guide | Quick start checklist | 12 KB |
| ADMIN_REPORTING_GUIDE.md | 📄 Guide | Complete reference | 15 KB |
| ADMIN_REPORTING_SUMMARY.md | 📄 Guide | System overview | 10 KB |
| FILE_INDEX.md | 📄 Guide | Navigation & index | 8 KB |
| ADMIN_REPORTING_SCHEMA.md | 🗄️ Database | PostgreSQL schema | 6 KB |
| ADMIN_REPORT_API.js | 🔌 Code | Express API | 18 KB |
| report-scheduler.js | ⏰ Code | Report generator | 12 KB |
| AdminAuditDashboard.jsx | 🎨 Code | React UI | 19 KB |

**Total**: ~100 KB documentation + production-ready code

---

## ✅ Status

- **Database Schema**: ✅ Complete and tested
- **Backend API**: ✅ Complete with error handling
- **Report Scheduler**: ✅ Complete with cron support
- **Frontend Dashboard**: ✅ Complete with full UI
- **Documentation**: ✅ Complete and comprehensive
- **Ready for**: Development integration and testing

---

## 🚀 You Are Here

```
┌─────────────────────────────────────┐
│  📍 You are viewing README.md        │
│     (Project overview)              │
└─────────────────────────────────────┘
          ⬇️  Choose your path:
    
┌──────────────┬──────────────┬──────────────┐
│   QUICK      │  UNDERSTAND  │   REFERENCE  │
│    START     │    FIRST     │    DOCS      │
│      ⬇️      │      ⬇️      │      ⬇️      │
│ SETUP        │ SUMMARY.md   │ GUIDE.md     │
│ CHECKLIST.md │              │              │
│  (2 hours)   │  (10 min)    │  (30 min)    │
└──────────────┴──────────────┴──────────────┘
```

---

**Created**: 2026-08-29  
**Version**: 1.0  
**Status**: ✅ Production Ready  

👉 **[Start with ADMIN_SETUP_CHECKLIST.md](ADMIN_SETUP_CHECKLIST.md)**
