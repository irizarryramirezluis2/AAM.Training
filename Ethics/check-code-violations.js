/**
 * Automated Ethics & Security Code Violation Checker
 * Scans staged source files for hardcoded credentials, unlogged admin operations,
 * bypass mechanisms, and ethics compliance failures.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../Src');

// Prohibited security and ethics patterns
const VIOLATION_PATTERNS = [
  {
    name: 'Hardcoded Secrets/Credentials',
    regex: /(?:password|secret|token|apiKey)\s*[:=]\s*["'][^"']{4,}["']/i
  },
  {
    name: 'Console Logging Sensitive Data',
    regex: /console\.log\(.*(?:password|token|auth|secret).*\)/i
  },
  {
    name: 'Bypassing Level 4 Verification',
    regex: /skipL4Verification\s*=\s*true/i
  },
  {
    name: 'Disabled Audit Log Event',
    regex: /disableAuditLogging\s*=\s*true/i
  }
];

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function runEthicsCheck() {
  console.log('Scanning codebase for ethics and security violations...');
  
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`Directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  const files = getAllFiles(SRC_DIR);
  let totalViolations = 0;

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      VIOLATION_PATTERNS.forEach((pattern) => {
        if (pattern.regex.test(line)) {
          console.error(`❌ Violation [${pattern.name}]: ${file}:${index + 1}`);
          console.error(`   Line content: ${line.trim()}`);
          totalViolations++;
        }
      });
    });
  });

  if (totalViolations > 0) {
    console.error(`\nTotal Ethics Violations Found: ${totalViolations}`);
    process.exit(1);
  }

  console.log('No ethics or security policy violations detected.');
  process.exit(0);
}

runEthicsCheck();