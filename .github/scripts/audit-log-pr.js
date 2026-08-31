#!/usr/bin/env node

/**
 * PR Audit Log
 * Logs PR activity and ethics compliance to audit trail
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    args[key] = value || process.argv[process.argv.indexOf(arg) + 1];
  }
});

const prNumber = args['pr-number'];
const repository = args['repository'];
const reportFile = args['report'];

try {
  // Create audit log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType: 'PR_SCAN',
    prNumber: prNumber || 'unknown',
    repository: repository || 'unknown',
    actor: process.env.GITHUB_ACTOR || 'github-actions',
    status: 'completed'
  };

  // Add report data if available
  if (reportFile && fs.existsSync(reportFile)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      logEntry.violationCount = (report.violations || []).length;
      logEntry.violationsBySeverity = {
        critical: (report.violations || []).filter(v => v.severity === 'critical').length,
        high: (report.violations || []).filter(v => v.severity === 'high').length,
        medium: (report.violations || []).filter(v => v.severity === 'medium').length,
        low: (report.violations || []).filter(v => v.severity === 'low').length
      };
    } catch (e) {
      console.warn('Could not parse report file:', e.message);
    }
  }

  // Log to console for GitHub Actions log
  console.log('📝 Audit Log Entry:');
  console.log(JSON.stringify(logEntry, null, 2));

  // Optionally append to audit log file
  const auditLogPath = path.join(process.cwd(), '.github', 'audit-log.jsonl');
  const logLine = JSON.stringify(logEntry) + '\n';
  
  if (process.env.GITHUB_ACTIONS === 'true') {
    // In GitHub Actions, output to log only (no file write)
    process.stdout.write(`✅ Audit log recorded for PR #${logEntry.prNumber}\n`);
  } else {
    // In local environment, append to file
    fs.appendFileSync(auditLogPath, logLine);
    console.log(`✅ Audit log saved to ${auditLogPath}`);
  }

} catch (error) {
  console.error('Error logging audit entry:', error.message);
  process.exit(0); // Don't fail the build for audit log errors
}
