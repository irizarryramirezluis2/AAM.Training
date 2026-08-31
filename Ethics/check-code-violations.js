const fs = require('fs');
const path = process.argv[2] || 'ethics-report.json';

try {
  if (!fs.existsSync(path)) {
    console.warn(`Warning: File ${path} not found. Creating default clean status.`);
    fs.writeFileSync(path, JSON.stringify({ violations: [] }, null, 2));
  }
  const report = JSON.parse(fs.readFileSync(path, 'utf8'));
  const violations = report.violations || report.issues || [];

  if (violations.length > 0) {
    console.error(`❌ Critical ethics or security violations found: ${violations.length}`);
    process.exit(1);
  } else {
    console.log('✅ No critical ethics or security violations found.');
    process.exit(0);
  }
} catch (err) {
  console.error('Error checking ethics violations:', err.message);
  process.exit(1);
}