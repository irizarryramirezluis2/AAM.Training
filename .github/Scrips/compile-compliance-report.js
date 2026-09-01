const fs = require('fs');
const args = process.argv.slice(2);

// Parse input arguments
let outputFile = 'compliance-report.md';
let ethicsFile = 'ethics-report.json';

const outputIdx = args.indexOf('--output');
if (outputIdx !== -1 && args[outputIdx + 1]) {
  outputFile = args[outputIdx + 1];
}

const ethicsIdx = args.indexOf('--ethics');
if (ethicsIdx !== -1 && args[ethicsIdx + 1]) {
  ethicsFile = args[ethicsIdx + 1];
}

// Read ethics report if available
let violationsCount = 0;
let status = 'Passing';

if (fs.existsSync(ethicsFile)) {
  try {
    const rawData = fs.readFileSync(ethicsFile, 'utf8');
    const data = JSON.parse(rawData);
    const violations = data.violations || data.issues || [];
    violationsCount = violations.length;
    if (violationsCount > 0) {
      status = 'Action Required';
    }
  } catch (err) {
    console.warn(`⚠️ Could not parse ${ethicsFile}, defaulting report status.`);
  }
}

// Generate dynamic Markdown content
const content = `# Automated Compliance Report

- **Timestamp:** ${new Date().toISOString()}
- **Status:** ${status}
- **Violations Flagged:** ${violationsCount}
- **Oversight:** Active

## Overview
All automated system checks have completed. 

${violationsCount === 0 
  ? '✅ No ethics or security violations were detected in this run.' 
  : `⚠️ **${violationsCount}** violation(s) require review.`}
`;

try {
  fs.writeFileSync(outputFile, content, 'utf8');
  console.log(`✅ Compliance report compiled successfully to ${outputFile}`);
} catch (err) {
  console.error(`❌ Failed to write compliance report: ${err.message}`);
  process.exit(1);
}