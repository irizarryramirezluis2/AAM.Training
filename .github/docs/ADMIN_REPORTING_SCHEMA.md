-- Add admin level support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level INT DEFAULT 0;
-- 0: Regular user, 1-2: Staff, 3: Admin (every 2 weeks), 4: Super Admin (every 3 days)

-- Create admin audit reports table
CREATE TABLE admin_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report metadata
  report_name VARCHAR(255) NOT NULL,
  report_type ENUM('ethics_violations', 'security_incidents', 'compliance_summary', 'data_access', 'consent_status', 'agent_actions') NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  report_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  report_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Content
  summary TEXT,
  detailed_findings JSON,
  recommendations JSON,
  metrics JSON,  -- Statistics and KPIs
  
  -- Distribution
  min_admin_level INT NOT NULL DEFAULT 3,  -- Minimum level to access
  distribution_frequency ENUM('daily', '3_days', '2_weeks', 'monthly', 'quarterly', 'annual') NOT NULL,
  
  -- Status
  status ENUM('draft', 'generated', 'distributed', 'archived') DEFAULT 'generated',
  
  -- Audit
  generated_by UUID,  -- User or system that generated
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INT DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_type ON admin_audit_reports(report_type);
CREATE INDEX idx_reports_level ON admin_audit_reports(min_admin_level);
CREATE INDEX idx_reports_frequency ON admin_audit_reports(distribution_frequency);
CREATE INDEX idx_reports_generated ON admin_audit_reports(generated_at DESC);

-- Table to track who accessed what reports
CREATE TABLE admin_report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES admin_audit_reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  admin_level INT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  access_method ENUM('web', 'api', 'email', 'download') DEFAULT 'web',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_report_access_admin ON admin_report_access_logs(admin_id);
CREATE INDEX idx_report_access_report ON admin_report_access_logs(report_id);
CREATE INDEX idx_report_access_time ON admin_report_access_logs(accessed_at DESC);

-- Table for scheduled report generation
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  report_type VARCHAR(255) NOT NULL,
  admin_level INT NOT NULL,
  frequency ENUM('daily', '3_days', '2_weeks', 'monthly', 'quarterly', 'annual') NOT NULL,
  
  -- Schedule details
  next_generation_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_generated_at TIMESTAMP WITH TIME ZONE,
  generation_time TIME DEFAULT '00:00:00',  -- Time of day to generate
  
  enabled BOOLEAN DEFAULT TRUE,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  config JSON,  -- Additional configuration
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedules_level ON report_schedules(admin_level);
CREATE INDEX idx_schedules_frequency ON report_schedules(frequency);
CREATE INDEX idx_schedules_next_gen ON report_schedules(next_generation_at) WHERE enabled = TRUE;

-- Function to generate next report schedule
CREATE FUNCTION get_next_report_date(current_date TIMESTAMP, frequency VARCHAR) RETURNS TIMESTAMP AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN
      RETURN current_date + INTERVAL '1 day';
    WHEN '3_days' THEN
      RETURN current_date + INTERVAL '3 days';
    WHEN '2_weeks' THEN
      RETURN current_date + INTERVAL '14 days';
    WHEN 'monthly' THEN
      RETURN current_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      RETURN current_date + INTERVAL '3 months';
    WHEN 'annual' THEN
      RETURN current_date + INTERVAL '1 year';
    ELSE
      RETURN current_date + INTERVAL '1 day';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- View for active report schedules
CREATE VIEW active_report_schedules AS
SELECT * FROM report_schedules
WHERE enabled = TRUE
  AND next_generation_at <= CURRENT_TIMESTAMP
ORDER BY next_generation_at ASC;

-- View for admin-level reports
CREATE VIEW admin_accessible_reports AS
SELECT ar.* 
FROM admin_audit_reports ar
ORDER BY ar.generated_at DESC;

-- Audit log for report generation (integrity)
CREATE TABLE report_generation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES report_schedules(id),
  report_id UUID REFERENCES admin_audit_reports(id),
  
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  status ENUM('pending', 'generating', 'success', 'failed', 'skipped') DEFAULT 'pending',
  
  records_processed INT,
  violations_found INT,
  recommendations_count INT,
  
  error_message TEXT,
  error_details JSON,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gen_audit_schedule ON report_generation_audit(schedule_id);
CREATE INDEX idx_gen_audit_status ON report_generation_audit(status);
CREATE INDEX idx_gen_audit_triggered ON report_generation_audit(triggered_at DESC);
