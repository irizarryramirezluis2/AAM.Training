const fs = require('fs');

const reportFile = process.argv[2] || 'ethics-report.json';

console.log('# Ethics & Compliance Audit Report\n');
console.log(`**Generated:** ${new Date().toISOString()}\n`);

let violations = [];
let status = 'Active Monitoring';

if (fs.existsSync(reportFile)) {
  try {
    const rawData = fs.readFileSync(reportFile, 'utf8').trim();
    if (rawData) {
      const data = JSON.parse(rawData);
      violations = data.violations || data.issues || [];
    }
  } catch (err) {
    console.log('> ⚠️ *Warning: Could not parse ethics report JSON data.*\n');
  }

  if (violations.length > 0) {
    status = 'Violations Detected';
  }

  console.log('## Summary');
  console.log(`- **Status:** ${status}`);
  console.log(`- **Total Violations:** ${violations.length}\n`);

  if (violations.length > 0) {
    console.log('## Detected Violations');
    violations.forEach((v, idx) => {
      const desc = typeof v === 'string' ? v : (v.description || v.message || JSON.stringify(v));
      console.log(`${idx + 1}. ${desc}`);
    });
  } else {
    console.log('✅ No compliance violations were detected during this scan.');
  }
} else {
  console.log('## Summary');
  console.log('- **Status:** Default Report');
  console.log('- **Total Violations:** 0\n');
  console.log('No detailed audit metrics file was found for this run.');
}