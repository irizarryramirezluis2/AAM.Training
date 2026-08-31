const fs = require('fs');
const inputFile = process.argv[2] || 'ethics-report.json';

try {
  let report = { violations: [] };
  if (fs.existsSync(inputFile)) {
    report = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  }

  const violations = report.violations || report.issues || [];
  let markdown = '# Ethics and Compliance Audit Report\n\n';

  if (violations.length === 0) {
    markdown += '✅ **Pass**: No violations detected.\n';
  } else {
    markdown += '❌ **Fail**: Violations detected:\n\n';
    violations.forEach((v, index) => {
      markdown += `${index + 1}. **${v.severity || 'HIGH'}**: ${v.message || v}\n`;
    });
  }

  console.log(markdown);
} catch (err) {
  console.error('Error generating report:', err.message);
  process.exit(1);
}