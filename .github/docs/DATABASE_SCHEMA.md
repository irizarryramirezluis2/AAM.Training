# Audit Log Database Schema

## Overview
The audit log is the immutable record of all code changes, user actions, and ethical compliance events in the system. This schema supports the Ethics & Reasoning Agent's mandatory compliance tracking.

## Database Design Principles

- **Immutability**: Audit logs cannot be modified or deleted after creation
- **Traceability**: Every action is traceable to a specific actor (user, agent, or system)
- **Transparency**: All data collection and access is logged
- **Compliance**: Supports GDPR, CCPA, and privacy-first auditing
- **Queryability**: Optimized for compliance reports and privacy dashboards

## Core Tables

### 1. `audit_logs` (Primary Audit Trail)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Actor Information
  actor_id UUID,
  actor_type ENUM('user', 'agent', 'system') NOT NULL,
  actor_name VARCHAR(255),  -- username or agent name
  
  -- Action Information
  action_type ENUM(
    'CREATE',
    'UPDATE', 
    'DELETE',
    'READ',
    'REGISTER',
    'LOGIN',
    'LOGOUT',
    'DATA_ACCESS',
    'DATA_EXPORT',
    'DATA_DELETE',
    'CONSENT_CHANGE',
    'SECURITY_VIOLATION',
    'ETHICS_VIOLATION',
    'ETHICS_FIX_APPLIED'
  ) NOT NULL,
  
  -- Resource Information
  resource_type ENUM(
    'CODE',
    'USER',
    'DATA',
    'CONFIG',
    'SECRET',
    'AUTH',
    'CONSENT',
    'AUDIT_LOG'
  ) NOT NULL,
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  
  -- Change Details
  change_description TEXT,  -- What changed
  before_value TEXT,        -- Previous state (serialized)
  after_value TEXT,         -- New state (serialized)
  change_summary VARCHAR(500),
  
  -- Ethics & Security Assessment
  ethics_violations_detected JSON,  -- Array of violations found
  ethics_violations_count INT DEFAULT 0,
  ethics_fixes_applied JSON,        -- Array of auto-fixes applied
  ethics_fixes_count INT DEFAULT 0,
  compliance_status ENUM(
    'PASS',
    'AUTO_FIXED',
    'BLOCKED',
    'FLAGGED_FOR_REVIEW',
    'EXEMPTED'
  ) NOT NULL DEFAULT 'PASS',
  
  -- Security & Privacy
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_reason TEXT,
  
  -- Additional Context
  source_ip VARCHAR(45),        -- IPv4 or IPv6
  user_agent VARCHAR(500),
  session_id UUID,
  branch_name VARCHAR(255),     -- Git branch (for code changes)
  commit_hash VARCHAR(40),      -- Git commit hash
  file_path VARCHAR(500),       -- For code changes
  line_numbers INT RANGE,       -- For code changes
  
  -- Metadata
  metadata JSON,  -- Flexible field for additional context
  tags JSON,      -- For categorization
  
  -- Indexing & Performance
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, actor_type);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_compliance ON audit_logs(compliance_status);
CREATE INDEX idx_audit_ethics ON audit_logs(ethics_violations_count) WHERE ethics_violations_count > 0;
CREATE INDEX idx_audit_file ON audit_logs(file_path) WHERE resource_type = 'CODE';

-- Constraint: Audit logs are immutable (no updates, only inserts)
ALTER TABLE audit_logs DISABLE UPDATE;
ALTER TABLE audit_logs DISABLE DELETE;
```

### 2. `ethics_violations` (Violation Registry)

```sql
CREATE TABLE ethics_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
  
  violation_type ENUM(
    'HARDCODED_SECRET',
    'PLAINTEXT_PASSWORD',
    'UNAUTHORIZED_TRACKING',
    'SENSITIVE_DATA_LOGGING',
    'DATA_OVER_COLLECTION',
    'MISSING_INPUT_VALIDATION',
    'AUTH_BYPASS',
    'PII_EXPOSURE',
    'CONSENT_MISSING',
    'UNENCRYPTED_DATA',
    'INSUFFICIENT_ACCESS_CONTROL',
    'CUSTOM'
  ) NOT NULL,
  
  severity ENUM('critical', 'high', 'medium', 'low', 'info') NOT NULL DEFAULT 'medium',
  
  description TEXT,
  code_pattern TEXT,        -- Regex or code snippet that triggered violation
  affected_code VARCHAR(500),
  line_number INT,
  
  fix_applied BOOLEAN DEFAULT FALSE,
  fix_type VARCHAR(255),    -- 'auto_fix', 'manual_fix', 'blocked', 'exempted'
  fix_description TEXT,
  fix_applied_by UUID,      -- User or agent that applied fix
  fixed_at TIMESTAMP WITH TIME ZONE,
  
  requires_review BOOLEAN DEFAULT FALSE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_audit ON ethics_violations(audit_log_id);
CREATE INDEX idx_violations_severity ON ethics_violations(severity);
CREATE INDEX idx_violations_type ON ethics_violations(violation_type);
CREATE INDEX idx_violations_unfixed ON ethics_violations(fix_applied) WHERE fix_applied = FALSE;
```

### 3. `user_consent` (Consent Management)

```sql
CREATE TABLE user_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  consent_type ENUM(
    'analytics',
    'profiling',
    'third_party_sharing',
    'location_tracking',
    'behavioral_tracking',
    'marketing_emails',
    'privacy_policy',
    'terms_of_service'
  ) NOT NULL,
  
  status ENUM('granted', 'denied', 'revoked', 'pending', 'expired') NOT NULL DEFAULT 'pending',
  
  given_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  
  consent_version VARCHAR(50),  -- Version of policy they consented to
  consent_medium ENUM('web_form', 'api', 'email', 'admin_override') DEFAULT 'web_form',
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  
  audit_log_id UUID REFERENCES audit_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consent_user ON user_consent(user_id);
CREATE INDEX idx_consent_type ON user_consent(consent_type);
CREATE INDEX idx_consent_status ON user_consent(status);
CREATE UNIQUE INDEX idx_consent_unique ON user_consent(user_id, consent_type) WHERE status IN ('granted', 'pending');
```

### 4. `user_registrations` (New User Tracking)

```sql
CREATE TABLE user_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  
  username VARCHAR(255) UNIQUE NOT NULL,
  email_hash VARCHAR(255),   -- Hashed email for privacy
  
  registration_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  
  data_collected JSON,  -- What data was captured at registration
  consent_status ENUM('fully_consented', 'partial_consent', 'no_consent') DEFAULT 'no_consent',
  consent_required_fields JSON,
  
  privacy_policy_version VARCHAR(50),
  privacy_policy_accepted_at TIMESTAMP WITH TIME ZONE,
  
  source ENUM('web', 'api', 'oauth', 'ldap', 'admin') DEFAULT 'web',
  oauth_provider VARCHAR(50),  -- if source is 'oauth'
  
  account_status ENUM('active', 'pending_verification', 'suspended', 'deleted') DEFAULT 'pending_verification',
  
  audit_log_id UUID REFERENCES audit_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registrations_timestamp ON user_registrations(registration_timestamp DESC);
CREATE INDEX idx_registrations_status ON user_registrations(account_status);
CREATE INDEX idx_registrations_consent ON user_registrations(consent_status);
```

### 5. `data_access_logs` (Privacy-Critical Access)

```sql
CREATE TABLE data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  accessor_id UUID,
  accessor_type ENUM('user', 'agent', 'service', 'api') NOT NULL,
  
  data_owner_id UUID,  -- Whose data was accessed
  data_type ENUM(
    'personal_info',
    'contact_info',
    'auth_data',
    'payment_data',
    'health_data',
    'behavioral_data',
    'preferences',
    'audit_trail'
  ) NOT NULL,
  
  data_fields JSON,  -- Which specific fields were accessed
  access_method ENUM('direct_read', 'api_call', 'export', 'report', 'backup'),
  access_count INT DEFAULT 1,
  
  purpose VARCHAR(255),
  justified BOOLEAN,
  
  ip_address VARCHAR(45),
  session_id UUID,
  
  audit_log_id UUID REFERENCES audit_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_access_timestamp ON data_access_logs(timestamp DESC);
CREATE INDEX idx_access_data_owner ON data_access_logs(data_owner_id);
CREATE INDEX idx_access_accessor ON data_access_logs(accessor_id);
CREATE INDEX idx_access_type ON data_access_logs(data_type);
```

### 6. `agent_actions` (Agent Operation Log)

```sql
CREATE TABLE agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  agent_name VARCHAR(255) NOT NULL,
  agent_type ENUM('Code Rewriter', 'Security Agent', 'Debug & Test Agent', 'Ethics & Reasoning', 'Other') NOT NULL,
  
  action_type ENUM(
    'file_read',
    'file_edit',
    'file_create',
    'file_delete',
    'code_analysis',
    'security_scan',
    'test_execution',
    'ethics_check',
    'subagent_invocation'
  ) NOT NULL,
  
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  
  -- Impact & Result
  impact_description TEXT,
  changes_made JSON,
  result_status ENUM('success', 'failed', 'partial', 'blocked', 'reverted') DEFAULT 'success',
  
  -- Ethics & Security
  ethics_violations_found INT DEFAULT 0,
  security_issues_found INT DEFAULT 0,
  compliance_checks_passed BOOLEAN DEFAULT TRUE,
  
  -- Provenance
  triggered_by_user_id UUID,
  triggered_by_agent_id UUID,
  parent_session_id UUID,
  
  audit_log_id UUID REFERENCES audit_logs(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_actions_timestamp ON agent_actions(timestamp DESC);
CREATE INDEX idx_agent_actions_agent ON agent_actions(agent_name);
CREATE INDEX idx_agent_actions_type ON agent_actions(action_type);
CREATE INDEX idx_agent_actions_status ON agent_actions(result_status);
CREATE INDEX idx_agent_actions_ethics ON agent_actions(ethics_violations_found) WHERE ethics_violations_found > 0;
```

## Retention & Compliance Policies

### Data Retention

```sql
-- Audit logs: 7 years (regulatory requirement)
-- Active user data: Until account deletion (+ 30 day grace period)
-- Deleted user data: 30 days (for recovery), then purged
-- Consent records: 3 years after revocation
-- Access logs: 1 year (then archived)

CREATE FUNCTION archive_old_audit_logs() RETURNS void AS $$
BEGIN
  -- Archive logs older than 7 years
  INSERT INTO audit_logs_archive
  SELECT * FROM audit_logs
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 years';
  
  DELETE FROM audit_logs
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Run weekly
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('archive-audit-logs', '0 2 * * 0', 'SELECT archive_old_audit_logs()');
```

## Views for Compliance Reporting

### Ethical Violations Dashboard
```sql
CREATE VIEW ethics_violations_summary AS
SELECT
  DATE(timestamp) as date,
  violation_type,
  severity,
  COUNT(*) as violation_count,
  SUM(CASE WHEN fix_applied THEN 1 ELSE 0 END) as fixed_count,
  SUM(CASE WHEN requires_review THEN 1 ELSE 0 END) as pending_review
FROM ethics_violations
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '90 days'
GROUP BY DATE(timestamp), violation_type, severity
ORDER BY date DESC, severity DESC;
```

### User Privacy Dashboard
```sql
CREATE VIEW user_privacy_status AS
SELECT
  user_id,
  COUNT(DISTINCT consent_type) as consent_types_available,
  SUM(CASE WHEN status = 'granted' THEN 1 ELSE 0 END) as consents_granted,
  SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as consents_denied,
  MAX(updated_at) as last_consent_change,
  COUNT(DISTINCT dal.data_type) as data_types_accessed
FROM user_consent uc
LEFT JOIN data_access_logs dal ON uc.user_id = dal.data_owner_id
GROUP BY uc.user_id;
```

## Security Constraints

```sql
-- Audit logs are append-only
CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION raise_audit_immutable();

CREATE FUNCTION raise_audit_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Consent changes are audited
CREATE TRIGGER consent_audit_trail AFTER UPDATE ON user_consent
  FOR EACH ROW EXECUTE FUNCTION log_consent_change();

CREATE FUNCTION log_consent_change() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    actor_type, action_type, resource_type, resource_id,
    before_value, after_value, change_summary
  ) VALUES (
    'system', 'CONSENT_CHANGE', 'CONSENT', NEW.id,
    row_to_json(OLD), row_to_json(NEW),
    FORMAT('Consent for %s changed from %s to %s', NEW.consent_type, OLD.status, NEW.status)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Querying Examples

### Find all code changes by a specific user
```sql
SELECT timestamp, file_path, change_summary, compliance_status
FROM audit_logs
WHERE actor_id = $1
  AND action_type = 'UPDATE'
  AND resource_type = 'CODE'
ORDER BY timestamp DESC
LIMIT 100;
```

### Find unresolved ethics violations
```sql
SELECT al.timestamp, al.actor_name, ev.violation_type, ev.severity, ev.description
FROM ethics_violations ev
JOIN audit_logs al ON ev.audit_log_id = al.id
WHERE ev.fix_applied = FALSE
  AND ev.requires_review = TRUE
ORDER BY ev.severity DESC, al.timestamp DESC;
```

### User consent status
```sql
SELECT consent_type, status, given_at, expires_at
FROM user_consent
WHERE user_id = $1
  AND status IN ('granted', 'pending')
ORDER BY given_at DESC;
```

### Data access by user
```sql
SELECT timestamp, accessor_type, data_type, data_fields, access_method
FROM data_access_logs
WHERE data_owner_id = $1
ORDER BY timestamp DESC
LIMIT 50;
```

## Implementation Notes

- **Database**: PostgreSQL 13+ (required for JSON support and immutable triggers)
- **Backup**: Audit logs should be backed up immediately after each write
- **Replication**: Consider read-only replicas for compliance reporting
- **GDPR Compliance**: Support "right to be forgotten" via `data_access_logs` and `user_registrations` purging
- **Encryption**: All PII should be encrypted at rest using database-level encryption or application-level encryption
- **Monitoring**: Set up alerts for critical violations (auth bypass, PII exposure, etc.)
