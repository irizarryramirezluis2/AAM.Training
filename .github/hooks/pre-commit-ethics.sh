#!/bin/bash
# pre-commit-ethics.sh
# Mandatory ethics compliance hook for git commits
# Runs before every commit to ensure code meets ethical guidelines
# Cannot be bypassed (no --no-verify allowed in policy)

set -e

ETHICS_VIOLATIONS=0
VIOLATIONS_FILE=$(mktemp)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

echo "🔍 Running Ethical Compliance Scanner..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Scan staged files for ethical violations
for file in $STAGED_FILES; do
    # Only scan JavaScript, JSX, and Node files
    if [[ ! "$file" =~ \.(js|jsx|ts|tsx)$ ]]; then
        continue
    fi

    # Skip test and config files
    if [[ "$file" =~ (test|spec|config|\.json)$ ]]; then
        continue
    fi

    echo -e "${BLUE}Scanning: $file${NC}"

    STAGED_CONTENT=$(git show :"$file")

    # VIOLATION 1: Hardcoded secrets (API keys, passwords, tokens)
    if echo "$STAGED_CONTENT" | grep -qE '(api[_-]?key|password|secret|token|auth)\s*=\s*["\x27]([a-zA-Z0-9_\-]+)["\x27]'; then
        echo -e "${RED}❌ VIOLATION: Hardcoded secret detected in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: api_key/password/token/secret with literal string" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Use environment variables (process.env.API_KEY)" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 2: Plaintext password storage
    if echo "$STAGED_CONTENT" | grep -qE 'password\s*=|plaintext.*password|store.*password.*plain'; then
        echo -e "${RED}❌ VIOLATION: Plaintext password storage detected in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: password assignment without hashing" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Use bcrypt, argon2, or scrypt for password hashing" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 3: Unauthorized data collection without consent check
    if echo "$STAGED_CONTENT" | grep -qE 'analytics|tracking|telemetry' && ! echo "$STAGED_CONTENT" | grep -qE 'consent|permission|opt[_-]in'; then
        echo -e "${RED}❌ VIOLATION: Potential tracking/analytics without consent check in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: analytics/tracking code without if (consent)" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Wrap tracking in: if (user.consent.analytics) { ... }" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 4: Sensitive data in logs
    if echo "$STAGED_CONTENT" | grep -qE 'console\.log.*password|console\.log.*secret|console\.log.*token|log\(.*ssn|log\(.*credit'; then
        echo -e "${RED}❌ VIOLATION: Sensitive data logging detected in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: console.log/log containing password/secret/token/SSN/creditcard" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Remove sensitive data from logs; use logging service with redaction" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 5: Overly broad data collection
    if echo "$STAGED_CONTENT" | grep -qE 'collect.*All|gather.*Everything|store.*\*|ssn|social.*security|medical|health.*history|credit.*card.*full'; then
        echo -e "${RED}❌ VIOLATION: Over-collection of sensitive data detected in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: Collecting PII/medical/financial data unnecessarily" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Apply data minimization—collect only necessary fields" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 6: Missing input validation
    if echo "$STAGED_CONTENT" | grep -qE 'query|params|request\.body' && ! echo "$STAGED_CONTENT" | grep -qE 'validate|sanitize|escape|parameterized'; then
        echo -e "${YELLOW}⚠️  WARNING: Possible unvalidated user input in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: User input without validation" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Validate and sanitize all user inputs to prevent injection attacks" | tee -a "$VIOLATIONS_FILE"
    fi

    # VIOLATION 7: Disabled authentication
    if echo "$STAGED_CONTENT" | grep -qE 'auth.*disabled|bypass.*auth|skip.*login|no.*authentication'; then
        echo -e "${RED}❌ VIOLATION: Authentication disabled detected in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: Authentication bypass or disabled" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Never bypass authentication; use proper access control" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

    # VIOLATION 8: Exposed PII in URLs or responses
    if echo "$STAGED_CONTENT" | grep -qE 'ssn|social.*security|medical.*record|health.*data|credit.*card' && echo "$STAGED_CONTENT" | grep -qE 'return|response|JSON\.stringify'; then
        echo -e "${RED}❌ VIOLATION: Potential PII exposure in response in $file${NC}" | tee -a "$VIOLATIONS_FILE"
        echo "   📍 Pattern: Sensitive data in API response" | tee -a "$VIOLATIONS_FILE"
        echo "   💡 Fix: Filter response to exclude sensitive fields; use field masking" | tee -a "$VIOLATIONS_FILE"
        ((ETHICS_VIOLATIONS++))
    fi

done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ETHICS_VIOLATIONS -gt 0 ]; then
    echo ""
    echo -e "${RED}🚫 ETHICS COMPLIANCE CHECK FAILED${NC}"
    echo -e "${RED}Found $ETHICS_VIOLATIONS violation(s)${NC}"
    echo ""
    cat "$VIOLATIONS_FILE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${YELLOW}📋 COMPLIANCE REPORT:${NC}"
    echo "  • This commit contains ethical violations"
    echo "  • Fix the violations and stage changes again"
    echo "  • If you believe this is a false positive, document why"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    rm -f "$VIOLATIONS_FILE"
    exit 1
else
    echo -e "${GREEN}✅ ETHICS COMPLIANCE CHECK PASSED${NC}"
    echo "All staged files passed ethical review"
    echo ""
    echo "📝 Audit Log Entry:"
    echo "  Timestamp: $(date -Iseconds)"
    echo "  Files checked: $(echo "$STAGED_FILES" | wc -l)"
    echo "  Violations found: 0"
    echo "  Status: APPROVED"
    echo ""
    rm -f "$VIOLATIONS_FILE"
    exit 0
fi
