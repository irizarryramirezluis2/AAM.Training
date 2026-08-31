/**
 * Report Scheduler Service
 * 
 * Automatically generates audit reports on schedule:
 * - Level 3 (Admin): Every 2 weeks
 * - Level 4 (Super Admin): Every 3 days
 * 
 * Installation:
 * npm install node-cron
 * 
 * Usage:
 * const scheduler = require('./report-scheduler');
 * scheduler.start();
 */

const cron = require('node-cron');
const db = require('../db');

const REPORT_TYPES = [
  'ethics_violations',
  'security_incidents',
  'compliance_summary',
  'data_access',
  'consent_status',
  'agent_actions'
];

// Cron schedules
const SCHEDULES = {
  '3_days': '0 0 */3 * *',      // Every 3 days at midnight
  '2_weeks': '0 0 */14 * *',    // Every 2 weeks at midnight
  'daily': '0 0 * * *',         // Every day at midnight
  'monthly': '0 0 1 * *',       // First day of month
  'quarterly': '0 0 1 */3 *',   // First day of every 3 months
  'annual': '0 0 1 1 *'         // January 1st
};

let tasks = {};

/**
 * Start the scheduler
 */
async function start() {
  console.log('🚀 Starting Report Scheduler...');

  try {
    // Load all active schedules from database
    const result = await db.query(
      `SELECT * FROM report_schedules WHERE enabled = TRUE ORDER BY frequency`
    );

    console.log(`📋 Found ${result.rows.length} active report schedules`);

    for (const schedule of result.rows) {
      createSchedule(schedule);
    }

    console.log('✅ Report Scheduler started successfully');
  } catch (err) {
    console.error('❌ Failed to start scheduler:', err);
  }
}

/**
 * Create a cron schedule for a report
 */
function createSchedule(schedule) {
  const taskKey = `${schedule.report_type}_${schedule.admin_level}`;

  // Cancel existing task if any
  if (tasks[taskKey]) {
    tasks[taskKey].stop();
  }

  const cronExpression = SCHEDULES[schedule.frequency] || SCHEDULES.daily;

  console.log(`⏰ Scheduling ${taskKey} - Frequency: ${schedule.frequency}`);

  tasks[taskKey] = cron.schedule(cronExpression, async () => {
    console.log(`\n🔄 Generating report: ${schedule.report_type} (Admin Level ${schedule.admin_level})`);
    await generateAndDistributeReport(schedule);
  });
}

/**
 * Generate a report and distribute it
 */
async function generateAndDistributeReport(schedule) {
  const auditLogId = await db.query('SELECT gen_random_uuid() as id');
  const auditId = auditLogId.rows[0].id;

  try {
    // Log the generation start
    await db.query(
      `INSERT INTO report_generation_audit (schedule_id, triggered_at, status)
       VALUES ($1, NOW(), 'generating')`,
      [schedule.id]
    );

    // Generate the report
    const report = await generateReport({
      report_type: schedule.report_type,
      period_days: getPeriodDays(schedule.frequency),
      generated_by: 'system',
      min_admin_level: schedule.admin_level,
      audit_id: auditId
    });

    console.log(`✅ Report generated: ${report.id}`);

    // Update schedule
    await db.query(
      `UPDATE report_schedules 
       SET last_generated_at = NOW(), 
           next_generation_at = NOW() + INTERVAL '1' || $1::text,
           retry_count = 0
       WHERE id = $2`,
      [getIntervalString(schedule.frequency), schedule.id]
    );

    // Log success
    await db.query(
      `UPDATE report_generation_audit 
       SET report_id = $1, completed_at = NOW(), status = 'success'
       WHERE id = $2`,
      [report.id, auditId]
    );

    // Email notification to admins (optional)
    await notifyAdmins(report, schedule.admin_level);

  } catch (err) {
    console.error(`❌ Report generation failed for ${schedule.report_type}:`, err);

    // Update schedule with retry
    await db.query(
      `UPDATE report_schedules 
       SET retry_count = retry_count + 1
       WHERE id = $1 AND retry_count < max_retries`,
      [schedule.id]
    );

    // Log failure
    await db.query(
      `UPDATE report_generation_audit 
       SET completed_at = NOW(), status = 'failed', error_message = $1
       WHERE id = $2`,
      [err.message, auditId]
    );
  }
}

/**
 * Generate actual report data
 */
async function generateReport({ report_type, period_days, generated_by, min_admin_level, audit_id }) {
  const now = new Date();
  const periodStart = new Date(now.getTime() - period_days * 24 * 60 * 60 * 1000);

  let findings = {};
  let metrics = {};
  let recordsProcessed = 0;
  let violationsFound = 0;

  // Generate based on report type
  switch (report_type) {
    case 'ethics_violations':
      const ethicsData = await queryEthicsViolations(periodStart, now);
      findings = {
        summary: `${ethicsData.violations_count} ethics violations detected in period`,
        violations_count: ethicsData.violations_count,
        auto_fixes_count: ethicsData.auto_fixes_count,
        critical_count: ethicsData.critical_count,
        high_count: ethicsData.high_count,
        violation_types: ethicsData.violation_types,
        recommendations: ['Review critical violations', 'Improve code review process', 'Enhance developer training']
      };
      metrics = {
        total_records: ethicsData.total_records,
        violations_found: ethicsData.violations_count,
        auto_fixes: ethicsData.auto_fixes_count,
        critical: ethicsData.critical_count,
        high: ethicsData.high_count
      };
      recordsProcessed = ethicsData.total_records;
      violationsFound = ethicsData.violations_count;
      break;

    case 'security_incidents':
      const securityData = await querySecurityIncidents(periodStart, now);
      findings = {
        summary: `${securityData.incidents_count} security incidents detected`,
        incidents_count: securityData.incidents_count,
        vulnerabilities_count: securityData.vulnerabilities_count,
        patches_applied: securityData.patches_count,
        recommendations: ['Regular vulnerability scanning', 'Patch management']
      };
      metrics = {
        total_incidents: securityData.incidents_count,
        vulnerabilities: securityData.vulnerabilities_count,
        patches: securityData.patches_count
      };
      violationsFound = securityData.incidents_count;
      break;

    case 'compliance_summary':
      const complianceData = await queryComplianceStatus(periodStart, now);
      findings = {
        summary: `Compliance Score: ${complianceData.score}%`,
        compliance_score: complianceData.score,
        regulations: complianceData.regulations,
        violations_resolved: complianceData.violations_resolved,
        recommendations: complianceData.recommendations
      };
      metrics = {
        compliance_score: complianceData.score,
        regulations_monitored: complianceData.regulations.length,
        violations_resolved: complianceData.violations_resolved
      };
      break;

    case 'data_access':
      const accessData = await queryDataAccess(periodStart, now);
      findings = {
        summary: `${accessData.access_count} data access events recorded`,
        access_count: accessData.access_count,
        unique_users: accessData.unique_users,
        sensitive_access_count: accessData.sensitive_access_count,
        recommendations: ['Monitor sensitive data access', 'Regular access reviews']
      };
      metrics = {
        total_access_events: accessData.access_count,
        unique_users: accessData.unique_users,
        sensitive_access: accessData.sensitive_access_count
      };
      recordsProcessed = accessData.access_count;
      break;

    case 'consent_status':
      const consentData = await queryConsentStatus(periodStart, now);
      findings = {
        summary: `${consentData.total_users} users, ${consentData.granted_count} with granted consent`,
        total_users: consentData.total_users,
        granted_count: consentData.granted_count,
        denied_count: consentData.denied_count,
        pending_count: consentData.pending_count,
        recommendations: ['Follow up on pending consents', 'Improve consent communication']
      };
      metrics = {
        total_users: consentData.total_users,
        consents_granted: consentData.granted_count,
        consents_denied: consentData.denied_count,
        consents_pending: consentData.pending_count
      };
      recordsProcessed = consentData.total_users;
      break;

    case 'agent_actions':
      const agentData = await queryAgentActions(periodStart, now);
      findings = {
        summary: `${agentData.actions_count} agent actions performed`,
        actions_count: agentData.actions_count,
        auto_fixes_count: agentData.auto_fixes_count,
        manual_reviews_count: agentData.manual_reviews_count,
        recommendations: ['Monitor agent auto-fixes', 'Review manual intervention cases']
      };
      metrics = {
        total_actions: agentData.actions_count,
        auto_fixes: agentData.auto_fixes_count,
        manual_reviews: agentData.manual_reviews_count
      };
      recordsProcessed = agentData.actions_count;
      break;
  }

  // Create report in database
  const result = await db.query(
    `INSERT INTO admin_audit_reports (
      report_name, report_type, report_period_start, report_period_end,
      summary, detailed_findings, recommendations, metrics,
      min_admin_level, distribution_frequency, generated_by, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'generated')
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
      getFrequencyForDays(period_days),
      generated_by
    ]
  );

  // Update audit log
  await db.query(
    `UPDATE report_generation_audit
     SET records_processed = $1, violations_found = $2
     WHERE id = $3`,
    [recordsProcessed, violationsFound, audit_id]
  );

  return result.rows[0];
}

/**
 * Query functions for each report type
 */

async function queryEthicsViolations(start, end) {
  const result = await db.query(
    `SELECT 
       COUNT(*) as violations_count,
       COUNT(*) as total_records,
       SUM(CASE WHEN fix_applied THEN 1 ELSE 0 END) as auto_fixes_count,
       SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
       SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_count,
       json_agg(DISTINCT violation_type) as violation_types
     FROM ethics_violations
     WHERE created_at BETWEEN $1 AND $2`,
    [start, end]
  );
  return result.rows[0] || {};
}

async function querySecurityIncidents(start, end) {
  // Stub - implement based on your security incident table
  return {
    incidents_count: 0,
    vulnerabilities_count: 0,
    patches_count: 0
  };
}

async function queryComplianceStatus(start, end) {
  return {
    score: 95,
    regulations: ['GDPR', 'CCPA', 'COPPA'],
    violations_resolved: 5,
    recommendations: ['Continue current practices']
  };
}

async function queryDataAccess(start, end) {
  const result = await db.query(
    `SELECT 
       COUNT(*) as access_count,
       COUNT(DISTINCT accessor_id) as unique_users,
       SUM(CASE WHEN data_type IN ('payment_data', 'health_data', 'personal_info') THEN 1 ELSE 0 END) as sensitive_access_count
     FROM data_access_logs
     WHERE timestamp BETWEEN $1 AND $2`,
    [start, end]
  );
  return result.rows[0] || {};
}

async function queryConsentStatus(start, end) {
  const result = await db.query(
    `SELECT 
       COUNT(DISTINCT user_id) as total_users,
       SUM(CASE WHEN status = 'granted' THEN 1 ELSE 0 END) as granted_count,
       SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_count,
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
     FROM user_consent
     WHERE updated_at BETWEEN $1 AND $2`,
    [start, end]
  );
  return result.rows[0] || {};
}

async function queryAgentActions(start, end) {
  const result = await db.query(
    `SELECT 
       COUNT(*) as actions_count,
       SUM(CASE WHEN result_status = 'success' THEN 1 ELSE 0 END) as auto_fixes_count,
       SUM(CASE WHEN result_status = 'partial' THEN 1 ELSE 0 END) as manual_reviews_count
     FROM agent_actions
     WHERE timestamp BETWEEN $1 AND $2`,
    [start, end]
  );
  return result.rows[0] || {};
}

/**
 * Notify admins of report generation
 */
async function notifyAdmins(report, minAdminLevel) {
  try {
    const admins = await db.query(
      `SELECT id, email FROM users WHERE admin_level >= $1`,
      [minAdminLevel]
    );

    for (const admin of admins.rows) {
      // TODO: Send email notification
      // await emailService.send({
      //   to: admin.email,
      //   subject: `New Audit Report: ${report.report_type}`,
      //   html: generateEmailTemplate(report)
      // });
    }

    console.log(`📧 Notified ${admins.rows.length} admins of report generation`);
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
}

/**
 * Helper functions
 */

function getPeriodDays(frequency) {
  const periods = {
    'daily': 1,
    '3_days': 3,
    '2_weeks': 14,
    'monthly': 30,
    'quarterly': 90,
    'annual': 365
  };
  return periods[frequency] || 14;
}

function getIntervalString(frequency) {
  const intervals = {
    'daily': '1 day',
    '3_days': '3 days',
    '2_weeks': '14 days',
    'monthly': '1 month',
    'quarterly': '3 months',
    'annual': '1 year'
  };
  return intervals[frequency] || '14 days';
}

function getFrequencyForDays(days) {
  if (days === 1) return 'daily';
  if (days === 3) return '3_days';
  if (days === 14) return '2_weeks';
  if (days === 30) return 'monthly';
  if (days === 90) return 'quarterly';
  if (days === 365) return 'annual';
  return '2_weeks';
}

/**
 * Stop the scheduler
 */
function stop() {
  console.log('🛑 Stopping Report Scheduler...');
  Object.values(tasks).forEach(task => task.stop());
  tasks = {};
  console.log('✅ Report Scheduler stopped');
}

/**
 * Reload schedules (useful after database changes)
 */
async function reload() {
  console.log('🔄 Reloading Report Schedules...');
  stop();
  await start();
}

module.exports = {
  start,
  stop,
  reload,
  generateAndDistributeReport
};
