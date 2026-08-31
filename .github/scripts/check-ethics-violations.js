#!/usr/bin/env node

/**
 * Ethics Violations Checker
 * Validates ethics report for critical violations
 */

const fs = require('fs');
const path = require('path');

const reportFile = process.argv[2] || 'ethics-report.json';
const FAIL_ON_CRITICAL = process.env.FAIL_ON_CRITICAL === 'true';
const FAIL_ON_HIGH = process.env.FAIL_ON_HIGH === 'true';

try {
  // Check if report file exists
  if (!fs.existsSync(reportFile)) {
    console.warn(`⚠️  Ethics report not found at ${reportFile}`);
    console.log('✅ Proceeding without ethics violations');
    process.exit(0);
  }

  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  
  const violations = {
    critical: report.violations?.filter(v => v.severity === 'critical') || [],
    high: report.violations?.filter(v => v.severity === 'high') || [],
    medium: report.violations?.filter(v => v.severity === 'medium') || [],
    low: report.violations?.filter(v => v.severity === 'low') || []
  };

  // Log summary
  console.log('\n📋 Ethics Compliance Report Summary');
  console.log('═══════════════════════════════════════');
  console.log(`🔴 Critical: ${violations.critical.length}`);
  console.log(`🟠 High:     ${violations.high.length}`);
  console.log(`🟡 Medium:   ${violations.medium.length}`);
  console.log(`🟢 Low:      ${violations.low.length}`);
  console.log('═══════════════════════════════════════\n');

  // Log critical violations
  if (violations.critical.length > 0) {
    console.log('🔴 CRITICAL VIOLATIONS:');
    violations.critical.forEach(v => {
      console.log(`  • ${v.message}`);
      if (v.file) console.log(`    File: ${v.file}`);
      if (v.line) console.log(`    Line: ${v.line}`);
    });
    console.log('');
  }

  // Log high violations
  if (violations.high.length > 0) {
    console.log('🟠 HIGH SEVERITY VIOLATIONS:');
    violations.high.forEach(v => {
      console.log(`  • ${v.message}`);
      if (v.file) console.log(`    File: ${v.file}`);
    });
    console.log('');
  }

  // Determine exit code
  let shouldFail = false;
  if (FAIL_ON_CRITICAL && violations.critical.length > 0) {
    shouldFail = true;
    console.log('❌ Build failed: Critical violations found');
  }
  if (FAIL_ON_HIGH && violations.high.length > 0) {
    shouldFail = true;
    console.log('❌ Build failed: High severity violations found');
  }

  if (!shouldFail && (violations.critical.length === 0 && violations.high.length === 0)) {
    console.log('✅ No critical or high severity violations found');
    process.exit(0);
  }

  process.exit(shouldFail ? 1 : 0);
} catch (error) {
  console.error('Error reading ethics report:', error.message);
  console.log('ℹ️  Proceeding without ethics violations check');
  process.exit(0);
}
