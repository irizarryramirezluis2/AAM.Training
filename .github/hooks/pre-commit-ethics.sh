#!/usr/bin/env bash
# ==============================================================================
# Pre-Commit Ethics & Compliance Enforcer
# ==============================================================================
set -e

echo "=== Running Ethics & Compliance Pre-Commit Validation ==="

# 1. Run static code checks for ethics violations
node ./Ethics/check-code-violations.js
CHECK_STATUS=$?

if [ $CHECK_STATUS -ne 0 ]; then
  echo "❌ [ETHICS ERROR] Code checks failed. Ethical violations detected in staged code."
  echo "Commit rejected. Please review the output above and resolve all compliance issues."
  exit 1
fi

# 2. Generate Compliance Audit Report
node ./Ethics/generate-ethicsreport.js
REPORT_STATUS=$?

if [ $REPORT_STATUS -ne 0 ]; then
  echo "❌ [ETHICS ERROR] Compliance report generation failed."
  echo "Commit rejected."
  exit 1
fi

echo "✅ [ETHICS SUCCESS] All ethics and compliance checks passed successfully."
exit 0