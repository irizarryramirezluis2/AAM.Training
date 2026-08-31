# Admin Reporting System - Quick Start Checklist

**Purpose**: 5-minute checklist to get admin tiered reporting working  
**Time to Complete**: ~2 hours (including 30 min testing)  
**Difficulty**: Medium

---

## ✅ Pre-Flight Checks

- [ ] PostgreSQL database running and accessible
- [ ] Node.js 14+ with npm
- [ ] Express.js backend server running
- [ ] React frontend app configured
- [ ] Git repository initialized
- [ ] `.env` configured with database URL
- [ ] User authentication working

---

## ✅ Phase 1: Database (15 mins)

- [ ] Read: `.github/docs/ADMIN_REPORTING_SCHEMA.md`
- [ ] Run: Database migration
  ```bash
  psql -d your_database < .github/docs/ADMIN_REPORTING_SCHEMA.md
  ```
- [ ] Verify: 4 new tables created
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  AND tablename LIKE 'admin_%' OR tablename = 'report_schedules';
  ```
- [ ] Expected: 4 tables (admin_audit_reports, admin_report_access_logs, report_schedules, report_generation_audit)
- [ ] ✅ Phase 1 Complete

---

## ✅ Phase 2: User Setup (5 mins)

- [ ] Check current admin levels
  ```sql
  SELECT id, email, admin_level FROM users WHERE admin_level > 0;
  ```
- [ ] Assign admin level to test users
  ```sql
  UPDATE users SET admin_level = 3 WHERE email = 'test.admin@example.com';
  UPDATE users SET admin_level = 4 WHERE email = 'test.superadmin@example.com';
  ```
- [ ] Verify updates
  ```sql
  SELECT id, email, admin_level FROM users WHERE admin_level >= 3;
  ```
- [ ] ✅ Phase 2 Complete

---

## ✅ Phase 3: Dependencies (2 mins)

- [ ] Install node-cron
  ```bash
  npm install node-cron
  ```
- [ ] Verify installation
  ```bash
  npm list node-cron
  ```
- [ ] ✅ Phase 3 Complete

---

## ✅ Phase 4: Backend Integration (30 mins)

### 4a: Report Scheduler Setup (10 mins)

- [ ] Copy scheduler file: `.github/docs/report-scheduler.js`
- [ ] Locate server startup file (usually `server.js` or `src/server.js`)
- [ ] Add scheduler startup code:
  ```javascript
  const reportScheduler = require('./.github/docs/report-scheduler');
  
  // After database connection established:
  db.connect().then(() => {
    reportScheduler.start();
    console.log('✅ Report scheduler started');
  });
  
  // Add graceful shutdown:
  process.on('SIGTERM', () => {
    reportScheduler.stop();
    process.exit(0);
  });
  ```
- [ ] Test: Restart server and check logs for "Report Scheduler started"

### 4b: API Endpoints Setup (15 mins)

- [ ] Copy API file: `.github/docs/ADMIN_REPORT_API.js`
- [ ] Create: `src/routes/admin-reports.js`
- [ ] Copy all code from `ADMIN_REPORT_API.js` to new file
- [ ] Register routes in main app:
  ```javascript
  const adminReportsRouter = require('./routes/admin-reports');
  app.use('/api/admin', adminReportsRouter);
  ```
- [ ] Test endpoints:
  ```bash
  curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/admin/reports
  ```

### 4c: Initialize Report Schedules (5 mins)

- [ ] Copy SQL from section "Initialize Report Schedules" in `ADMIN_REPORTING_GUIDE.md`
- [ ] Run SQL:
  ```bash
  psql -d your_database -c "..." < sql-file.sql
  ```
- [ ] Verify schedules created:
  ```sql
  SELECT COUNT(*) FROM report_schedules;
  ```
- [ ] Expected: 12 rows (6 report types × 2 admin levels)

- [ ] ✅ Phase 4 Complete

---

## ✅ Phase 5: Frontend Integration (15 mins)

### 5a: Add Component

- [ ] Copy component file: `Src/Components/AdminAuditDashboard.jsx`
- [ ] Place in: `src/Components/AdminAuditDashboard.jsx`
- [ ] No changes needed to file

### 5b: Add Routes

- [ ] Locate routing file (e.g., `src/routes.jsx` or `src/App.jsx`)
- [ ] Add route:
  ```jsx
  import AdminAuditDashboard from './Components/AdminAuditDashboard';
  
  // In your routes array:
  {
    path: '/admin/audit',
    component: AdminAuditDashboard,
    auth: true,
    adminLevel: 3  // Show only if admin_level >= 3
  }
  ```

### 5c: Add Navigation Link

- [ ] Locate main navigation component (e.g., Sidebar.jsx)
- [ ] Add link (only for admins):
  ```jsx
  {user?.admin_level >= 3 && (
    <NavLink href="/admin/audit" icon={<BarChart />}>
      Audit Reports
    </NavLink>
  )}
  ```

- [ ] ✅ Phase 5 Complete

---

## ✅ Phase 6: Testing (30 mins)

### 6a: Server Verification (5 mins)

- [ ] Start server: `npm run dev` or `base44 dev`
- [ ] Check server logs for:
  ```
  ✅ Report Scheduler started
  ⏰ Scheduling ethics_violations_3
  ⏰ Scheduling ethics_violations_4
  ```
- [ ] If not present: Check server.js integration

### 6b: API Testing (10 mins)

- [ ] Test as Level 3 admin:
  ```bash
  curl -H "Authorization: Bearer TOKEN_L3" http://localhost:3000/api/admin/reports
  ```
  Expected: Empty array or {"reports": []}

- [ ] Test as Level 4 super-admin:
  ```bash
  curl -H "Authorization: Bearer TOKEN_L4" http://localhost:3000/api/admin/reports
  ```
  Expected: Same as Level 3 (no reports yet)

- [ ] Test as Level 2 user:
  ```bash
  curl -H "Authorization: Bearer TOKEN_L2" http://localhost:3000/api/admin/reports
  ```
  Expected: 403 Forbidden error

### 6c: Manual Report Generation (10 mins)

- [ ] Use Level 4 super-admin token
- [ ] Make POST request:
  ```bash
  curl -X POST -H "Authorization: Bearer TOKEN_L4" \
    -H "Content-Type: application/json" \
    -d '{"report_type": "ethics_violations", "period_days": 7}' \
    http://localhost:3000/api/admin/reports/generate
  ```
- [ ] Expected: New report returned with ID
- [ ] Check database:
  ```sql
  SELECT * FROM admin_audit_reports ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Should see new report

### 6d: Dashboard Testing (5 mins)

- [ ] Login as Level 3 admin
- [ ] Navigate to `/admin/audit`
- [ ] Expected: 
  - ✅ Dashboard loads
  - ✅ Shows admin level badge
  - ✅ Shows "2 weeks" update frequency
  - ✅ Shows "No reports available" initially
- [ ] Navigate to Reports tab
- [ ] Try to download report (should have no reports yet)
- [ ] Navigate to Schedule tab
- [ ] Should see 6 report schedules for Level 3

### 6e: Super Admin Testing (5 mins)

- [ ] Login as Level 4 super-admin
- [ ] Navigate to `/admin/audit`
- [ ] Expected:
  - ✅ Shows admin level 4 badge
  - ✅ Shows "3 days" update frequency
  - ✅ Shows Access Logs tab (not visible for Level 3)
- [ ] Generate test report via API
- [ ] Refresh dashboard
- [ ] Report should appear in Reports tab
- [ ] Try downloading and emailing (should work with stubbed email)

- [ ] ✅ Phase 6 Complete

---

## ✅ Phase 7: Production Readiness (15 mins)

- [ ] [ ] Review security:
  - [ ] All endpoints require admin_level check
  - [ ] All access logged to audit trail
  - [ ] Error messages don't leak sensitive data

- [ ] [ ] Configure production settings:
  - [ ] Email service integration (currently stubbed)
  - [ ] Report retention policy (default: 7 years)
  - [ ] Access log retention (default: 7 years)
  - [ ] Report generation time (default: midnight UTC)

- [ ] [ ] Set up monitoring:
  - [ ] Logs for scheduler startup
  - [ ] Logs for report generation
  - [ ] Database alerts for failed generations

- [ ] [ ] Documentation:
  - [ ] Share `ADMIN_REPORTING_GUIDE.md` with team
  - [ ] Train Level 3+ admins on dashboard usage
  - [ ] Document email notification setup

- [ ] ✅ Phase 7 Complete

---

## ✅ Verification Checklist

Run through these checks to confirm everything works:

### Database
- [ ] `admin_audit_reports` table exists and has columns
- [ ] `admin_report_access_logs` table exists
- [ ] `report_schedules` table has 12 rows (6 types × 2 levels)
- [ ] `report_generation_audit` table exists

### Backend
- [ ] Scheduler starts on server startup (check logs)
- [ ] API responds to GET `/api/admin/reports` (with auth)
- [ ] API responds with 403 for users level < 3
- [ ] Manual report generation works (Level 4 only)

### Frontend
- [ ] `/admin/audit` route loads for Level 3+ users
- [ ] Shows 403 error for Level 0-2 users
- [ ] Dashboard displays admin level badge
- [ ] Dashboard displays update frequency
- [ ] Reports tab shows (may be empty initially)
- [ ] Schedule tab shows schedules
- [ ] Level 4 can see Access Logs tab

### Data Flow
- [ ] Generate test report via API
- [ ] Report appears in admin dashboard
- [ ] Report can be downloaded
- [ ] Report access is logged in audit trail
- [ ] Generation is logged in report_generation_audit

---

## 🚀 First Report Generation

**When**: Automatically on schedule after setup
- Level 3 admins: First report in 2 weeks
- Level 4 super-admins: First report in 3 days

**Or manually trigger**:
```bash
curl -X POST -H "Authorization: Bearer SUPERADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"report_type":"ethics_violations","period_days":7}' \
  http://localhost:3000/api/admin/reports/generate
```

**Monitor generation**:
```sql
SELECT * FROM report_generation_audit ORDER BY triggered_at DESC LIMIT 1;
SELECT * FROM admin_audit_reports ORDER BY generated_at DESC LIMIT 1;
```

---

## ❌ Troubleshooting

| Problem | Solution |
|---------|----------|
| Scheduler won't start | Check node-cron installed: `npm list node-cron` |
| API returns 403 | Verify user admin_level: `SELECT admin_level FROM users` |
| Dashboard won't load | Check `/admin/audit` route registered in app |
| Reports not generating | Check `report_schedules` table has entries: `SELECT * FROM report_schedules` |
| No Access Logs tab | You're not Level 4. Access Logs tab only shows for Level 4 users |
| Reports show "no data" | Normal for first few days. Generate test report manually. |

---

## 📊 Success Indicators

✅ You're done when:
- Scheduler shows "started successfully" in logs
- Level 3 users see `/admin/audit` page
- Level 4 users see Access Logs tab
- Test report generates successfully
- Report appears in dashboard
- Database logs show generation audit

---

## 🎯 Summary

| Phase | Time | Task | Files |
|-------|------|------|-------|
| 1 | 15m | Database setup | ADMIN_REPORTING_SCHEMA.md |
| 2 | 5m | User permissions | SQL commands |
| 3 | 2m | Install dependencies | npm install |
| 4 | 30m | Backend integration | report-scheduler.js, ADMIN_REPORT_API.js |
| 5 | 15m | Frontend setup | AdminAuditDashboard.jsx |
| 6 | 30m | Testing | Manual tests |
| 7 | 15m | Production ready | Configuration |

**Total**: ~2 hours (including 30 min testing)

---

**Status**: Ready to implement  
**Last Updated**: 2026-08-29  
**Version**: 1.0
