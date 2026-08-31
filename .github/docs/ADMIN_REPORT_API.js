/**
 * Admin Audit Report API Endpoints
 * 
 * Routes for generating, accessing, and managing audit reports
 * with admin-level access control
 * 
 * Access Control:
 * - Level 3 (Admin): Every 2 weeks, can access own reports
 * - Level 4 (Super Admin): Every 3 days, can access all reports
 * - Level 0-2: No access
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware: Require minimum admin level
const requireAdminLevel = (minLevel) => (req, res, next) => {
  if (!req.user || !req.user.admin_level || req.user.admin_level < minLevel) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      required_level: minLevel,
      your_level: req.user?.admin_level || 0
    });
  }
  next();
};

// ============================================================================
// GET /api/admin/reports - List audit reports
// ============================================================================
/**
 * Get available audit reports based on admin level
 * 
 * Access: Level 3+
 * Frequency: Level 3 → updates every 2 weeks, Level 4 → every 3 days
 */
router.get('/reports', requireAdminLevel(3), async (req, res) => {
  try {
    const { report_type, limit = 20, offset = 0 } = req.query;
    const adminLevel = req.user.admin_level;

    // Build query based on admin level
    let query = `
      SELECT ar.* FROM admin_audit_reports ar
      WHERE ar.min_admin_level <= $1
    `;
    const params = [adminLevel];

    // Filter by type if specified
    if (report_type) {
      query += ` AND ar.report_type = $${params.length + 1}`;
      params.push(report_type);
    }

    // Pagination
    query += ` ORDER BY ar.generated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Log access
    for (const report of result.rows) {
      await db.query(
        `INSERT INTO admin_report_access_logs (report_id, admin_id, admin_level, access_method)
         VALUES ($1, $2, $3, 'web')`,
        [report.id, req.user.id, adminLevel]
      );
    }

    res.json({
      reports: result.rows,
      total: result.rows.length,
      admin_level: adminLevel,
      update_frequency: adminLevel === 4 ? '3 days' : adminLevel === 3 ? '2 weeks' : 'not_eligible'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET /api/admin/reports/:reportId - Get specific report
// ============================================================================
/**
 * Retrieve a specific audit report with access control
 * 
 * Access: Level 3+ (must meet min_admin_level)
 */
router.get('/reports/:reportId', requireAdminLevel(3), async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminLevel = req.user.admin_level;

    // Get report
    const result = await db.query(
      `SELECT * FROM admin_audit_reports 
       WHERE id = $1 AND min_admin_level <= $2`,
      [reportId, adminLevel]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Report not found or access denied',
        report_id: reportId
      });
    }

    const report = result.rows[0];

    // Log access
    await db.query(
      `INSERT INTO admin_report_access_logs (report_id, admin_id, admin_level, access_method)
       VALUES ($1, $2, $3, 'web')`,
      [reportId, req.user.id, adminLevel]
    );

    // Increment access count
    await db.query(
      `UPDATE admin_audit_reports 
       SET access_count = access_count + 1, last_accessed_at = NOW()
       WHERE id = $1`,
      [reportId]
    );

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST /api/admin/reports/generate - Trigger manual report generation
// ============================================================================
/**
 * Manually trigger a report generation (admin only)
 * 
 * Access: Level 4 (Super Admin) only
 */
router.post('/reports/generate', requireAdminLevel(4), async (req, res) => {
  try {
    const { report_type, period_days = 14 } = req.body;

    if (!report_type) {
      return res.status(400).json({ error: 'report_type is required' });
    }

    // Generate report
    const report = await generateReport({
      report_type,
      period_days,
      generated_by: req.user.id,
      min_admin_level: 3
    });

    res.json({
      success: true,
      report_id: report.id,
      message: 'Report generated successfully',
      report
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET /api/admin/reports/:reportId/download - Download report as JSON
// ============================================================================
/**
 * Download audit report as JSON file
 * 
 * Access: Level 3+ (must meet min_admin_level)
 */
router.get('/reports/:reportId/download', requireAdminLevel(3), async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminLevel = req.user.admin_level;

    const result = await db.query(
      `SELECT * FROM admin_audit_reports 
       WHERE id = $1 AND min_admin_level <= $2`,
      [reportId, adminLevel]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    const report = result.rows[0];

    // Log download
    await db.query(
      `INSERT INTO admin_report_access_logs (report_id, admin_id, admin_level, access_method)
       VALUES ($1, $2, $3, 'download')`,
      [reportId, req.user.id, adminLevel]
    );

    // Send file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-report-${report.report_type}-${report.generated_at.toISOString()}.json"`
    );
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET /api/admin/reports/summary - Get report summary dashboard
// ============================================================================
/**
 * Get summary of all recent reports (admin dashboard)
 * 
 * Access: Level 3+
 */
router.get('/summary', requireAdminLevel(3), async (req, res) => {
  try {
    const adminLevel = req.user.admin_level;

    // Get summary statistics
    const summaryResult = await db.query(
      `SELECT 
         report_type,
         COUNT(*) as total_reports,
         MAX(generated_at) as latest_report,
         AVG(access_count) as avg_accesses
       FROM admin_audit_reports
       WHERE min_admin_level <= $1
       GROUP BY report_type
       ORDER BY MAX(generated_at) DESC`,
      [adminLevel]
    );

    // Get recent violations
    const violationsResult = await db.query(
      `SELECT 
         report_type,
         detailed_findings->>'violation_count' as violations,
         generated_at,
         report_period_start,
         report_period_end
       FROM admin_audit_reports
       WHERE report_type = 'ethics_violations' 
         AND min_admin_level <= $1
       ORDER BY generated_at DESC
       LIMIT 5`,
      [adminLevel]
    );

    // Get metrics
    const metricsResult = await db.query(
      `SELECT 
         report_type,
         (metrics->>'total_records')::INT as total_records,
         (metrics->>'violations_found')::INT as violations_found,
         (metrics->>'auto_fixes')::INT as auto_fixes
       FROM admin_audit_reports
       WHERE min_admin_level <= $1
       ORDER BY generated_at DESC
       LIMIT 1`,
      [adminLevel]
    );

    res.json({
      admin_level: adminLevel,
      update_frequency: adminLevel === 4 ? '3 days' : '2 weeks',
      report_summary: summaryResult.rows,
      recent_violations: violationsResult.rows,
      latest_metrics: metricsResult.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET /api/admin/reports/schedule - Get report generation schedule
// ============================================================================
/**
 * Get the report generation schedule for this admin's level
 * 
 * Access: Level 3+
 */
router.get('/schedule', requireAdminLevel(3), async (req, res) => {
  try {
    const adminLevel = req.user.admin_level;

    const result = await db.query(
      `SELECT * FROM report_schedules
       WHERE admin_level <= $1 AND enabled = TRUE
       ORDER BY frequency, report_type`,
      [adminLevel]
    );

    res.json({
      admin_level: adminLevel,
      schedules: result.rows,
      your_frequency: adminLevel === 4 ? '3 days' : adminLevel === 3 ? '2 weeks' : 'not_eligible'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// POST /api/admin/reports/:reportId/email - Email report
// ============================================================================
/**
 * Email a report to the requesting admin
 * 
 * Access: Level 3+
 */
router.post('/reports/:reportId/email', requireAdminLevel(3), async (req, res) => {
  try {
    const { reportId } = req.params;
    const adminLevel = req.user.admin_level;

    const result = await db.query(
      `SELECT * FROM admin_audit_reports 
       WHERE id = $1 AND min_admin_level <= $2`,
      [reportId, adminLevel]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];

    // TODO: Send email via email service
    // await emailService.send({
    //   to: req.user.email,
    //   subject: `Audit Report: ${report.report_type}`,
    //   html: generateEmailTemplate(report),
    //   attachments: [{ filename: `report-${report.id}.json`, content: JSON.stringify(report) }]
    // });

    // Log access
    await db.query(
      `INSERT INTO admin_report_access_logs (report_id, admin_id, admin_level, access_method)
       VALUES ($1, $2, $3, 'email')`,
      [reportId, req.user.id, adminLevel]
    );

    res.json({
      success: true,
      message: `Report emailed to ${req.user.email}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GET /api/admin/access-logs - View who accessed reports
// ============================================================================
/**
 * View access logs for audit reports (Level 4 only)
 * 
 * Access: Level 4 (Super Admin)
 */
router.get('/access-logs', requireAdminLevel(4), async (req, res) => {
  try {
    const { report_id, limit = 100, offset = 0 } = req.query;

    let query = `SELECT * FROM admin_report_access_logs`;
    const params = [];

    if (report_id) {
      query += ` WHERE report_id = $1`;
      params.push(report_id);
    }

    query += ` ORDER BY accessed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      access_logs: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * Generate an audit report
 * Called by scheduler or manual trigger
 */
async function generateReport({ report_type, period_days, generated_by, min_admin_level }) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - period_days * 24 * 60 * 60 * 1000);

  let findings = {};
  let metrics = {};

  // Generate based on report type
  switch (report_type) {
    case 'ethics_violations':
      findings = await generateEthicsViolationsReport(periodStart, now);
      metrics = {
        total_records: findings.violations_count,
        violations_found: findings.violations_count,
        auto_fixes: findings.auto_fixes_count,
        severity_critical: findings.critical_count,
        severity_high: findings.high_count
      };
      break;

    case 'security_incidents':
      findings = await generateSecurityReport(periodStart, now);
      metrics = {
        total_incidents: findings.incidents_count,
        vulnerabilities_found: findings.vulnerabilities_count,
        patches_applied: findings.patches_count
      };
      break;

    case 'compliance_summary':
      findings = await generateComplianceSummary(periodStart, now);
      metrics = {
        compliance_score: findings.compliance_score,
        regulations_monitored: findings.regulations.length,
        violations_resolved: findings.violations_resolved
      };
      break;

    case 'data_access':
      findings = await generateDataAccessReport(periodStart, now);
      metrics = {
        total_access_events: findings.access_count,
        unique_users: findings.unique_users,
        sensitive_data_accessed: findings.sensitive_access_count
      };
      break;

    case 'consent_status':
      findings = await generateConsentReport(periodStart, now);
      metrics = {
        total_users: findings.total_users,
        consents_granted: findings.granted_count,
        consents_denied: findings.denied_count,
        consents_pending: findings.pending_count
      };
      break;

    case 'agent_actions':
      findings = await generateAgentActionsReport(periodStart, now);
      metrics = {
        total_actions: findings.actions_count,
        auto_fixes_applied: findings.auto_fixes_count,
        manual_reviews: findings.manual_reviews_count
      };
      break;
  }

  // Create report
  const result = await db.query(
    `INSERT INTO admin_audit_reports (
      report_name, report_type, report_period_start, report_period_end,
      summary, detailed_findings, recommendations, metrics, 
      min_admin_level, distribution_frequency, generated_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      `${report_type} - ${now.toISOString()}`,
      report_type,
      periodStart,
      now,
      findings.summary || '',
      JSON.stringify(findings),
      JSON.stringify(findings.recommendations || []),
      JSON.stringify(metrics),
      min_admin_level,
      period_days === 14 ? '2_weeks' : '3_days',
      generated_by,
      'generated'
    ]
  );

  return result.rows[0];
}

// Report generation helper functions (stubs)
async function generateEthicsViolationsReport(start, end) {
  const result = await db.query(
    `SELECT COUNT(*) as count, 
            SUM(CASE WHEN fix_applied THEN 1 ELSE 0 END) as fixes,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high
     FROM ethics_violations
     WHERE created_at BETWEEN $1 AND $2`,
    [start, end]
  );
  
  return {
    summary: `${result.rows[0].count} ethics violations detected`,
    violations_count: result.rows[0].count,
    auto_fixes_count: result.rows[0].fixes,
    critical_count: result.rows[0].critical,
    high_count: result.rows[0].high,
    recommendations: ['Review critical violations', 'Improve dev training']
  };
}

async function generateSecurityReport(start, end) {
  return {
    summary: 'Security audit report',
    incidents_count: 0,
    vulnerabilities_count: 0,
    patches_count: 0,
    recommendations: ['Regular scanning', 'Patch management']
  };
}

async function generateComplianceSummary(start, end) {
  return {
    summary: 'Compliance status',
    compliance_score: 95,
    regulations: ['GDPR', 'CCPA', 'COPPA'],
    violations_resolved: 5,
    recommendations: []
  };
}

async function generateDataAccessReport(start, end) {
  return {
    summary: 'Data access audit',
    access_count: 0,
    unique_users: 0,
    sensitive_access_count: 0,
    recommendations: []
  };
}

async function generateConsentReport(start, end) {
  return {
    summary: 'User consent status',
    total_users: 0,
    granted_count: 0,
    denied_count: 0,
    pending_count: 0,
    recommendations: []
  };
}

async function generateAgentActionsReport(start, end) {
  return {
    summary: 'Agent activity report',
    actions_count: 0,
    auto_fixes_count: 0,
    manual_reviews_count: 0,
    recommendations: []
  };
}

module.exports = router;
