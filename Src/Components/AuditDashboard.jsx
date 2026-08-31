import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, Info, Lock, Download, Eye, Trash2 } from 'lucide-react';

/**
 * AuditDashboard Component
 * 
 * Displays privacy audit logs, consent status, data access, and ethics violations
 * Allows users to view, export, and manage their data
 * 
 * Features:
 * - Audit log viewer
 * - Consent management
 * - Data access logs
 * - Ethics violations dashboard
 * - Data export
 * - Right to deletion
 */

const AuditDashboard = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [consents, setConsents] = useState([]);
  const [dataAccess, setDataAccess] = useState([]);
  const [ethicsViolations, setEthicsViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      // Replace with actual API endpoints
      const [logsRes, consentsRes, accessRes, violationsRes] = await Promise.all([
        fetch('/api/audit/logs?limit=100'),
        fetch('/api/audit/consent'),
        fetch('/api/audit/data-access'),
        fetch('/api/audit/violations'),
      ]);

      if (!logsRes.ok) throw new Error('Failed to load audit logs');

      setAuditLogs(await logsRes.json());
      setConsents(await consentsRes.json());
      setDataAccess(await accessRes.json());
      setEthicsViolations(await violationsRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/audit/export', {
        method: 'POST',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString()}.json`;
      a.click();
    } catch (err) {
      alert('Failed to export data: ' + err.message);
    }
  };

  const handleDeleteData = async () => {
    const confirmed = window.confirm(
      'This will delete all your personal data from AAM.Training. This action cannot be undone. Continue?'
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/audit/delete-account', {
        method: 'POST',
      });
      if (response.ok) {
        alert('Your account and data have been scheduled for deletion (30-day grace period)');
        // Redirect to login
        window.location.href = '/login';
      } else {
        alert('Failed to delete account');
      }
    } catch (err) {
      alert('Failed to delete account: ' + err.message);
    }
  };

  const handleConsentChange = async (consentId, newStatus) => {
    try {
      await fetch(`/api/audit/consent/${consentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Refetch consent data
      const response = await fetch('/api/audit/consent');
      setConsents(await response.json());
    } catch (err) {
      alert('Failed to update consent: ' + err.message);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline',
      info: 'secondary',
    };
    return colors[severity] || 'outline';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical' || severity === 'high') {
      return <AlertTriangle className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading audit data...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Privacy & Audit Dashboard</h1>
          <p className="text-muted-foreground">
            View and manage your personal data, consent preferences, and privacy audit trail
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Data & Privacy Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export My Data (GDPR Right to Portability)
          </Button>
          <Button
            variant="destructive"
            className="w-full h-12"
            onClick={handleDeleteData}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete My Account & Data (Right to Deletion)
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="consent">Consent</TabsTrigger>
            <TabsTrigger value="access">Data Access</TabsTrigger>
            <TabsTrigger value="violations">Ethics & Security</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Summary</CardTitle>
                <CardDescription>
                  Complete audit trail of all actions affecting your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Actions</p>
                    <p className="text-2xl font-bold">{auditLogs.length}</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Data Accesses</p>
                    <p className="text-2xl font-bold">{dataAccess.length}</p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Violations Found</p>
                    <p className="text-2xl font-bold text-destructive">
                      {ethicsViolations.length}
                    </p>
                  </div>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Consents Given</p>
                    <p className="text-2xl font-bold">
                      {consents.filter((c) => c.status === 'granted').length}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Recent Activity</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Resource</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.slice(0, 10).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-sm">
                              {formatDate(log.timestamp)}
                            </TableCell>
                            <TableCell className="text-sm">{log.action_type}</TableCell>
                            <TableCell className="text-sm">{log.resource_type}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  log.compliance_status === 'PASS' ? 'default' : 'secondary'
                                }
                              >
                                {log.compliance_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONSENT TAB */}
          <TabsContent value="consent" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Consent Management</CardTitle>
                <CardDescription>
                  Manage what data AAM.Training can collect and how it's used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    We don't collect ANY data without your explicit consent. Toggle off any
                    consent type to stop data collection immediately.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div
                      key={consent.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-secondary/50 transition"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium capitalize">{consent.consent_type}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getConsentDescription(consent.consent_type)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Given: {formatDate(consent.given_at)}
                          {consent.expires_at && ` | Expires: ${formatDate(consent.expires_at)}`}
                        </p>
                      </div>
                      <select
                        value={consent.status}
                        onChange={(e) => handleConsentChange(consent.id, e.target.value)}
                        className="ml-4 px-3 py-2 rounded border bg-background"
                      >
                        <option value="granted">Granted</option>
                        <option value="denied">Denied</option>
                        <option value="revoked">Revoked</option>
                      </select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATA ACCESS TAB */}
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Access Log</CardTitle>
                <CardDescription>
                  Complete record of who accessed your data, when, and what they accessed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <Eye className="h-4 w-4" />
                  <AlertDescription>
                    We log all data access to ensure transparency. You can see every time your
                    data is accessed.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Who Accessed</TableHead>
                        <TableHead>Data Type</TableHead>
                        <TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dataAccess.length > 0 ? (
                        dataAccess.map((access) => (
                          <TableRow key={access.id}>
                            <TableCell className="text-sm">
                              {formatDate(access.timestamp)}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {access.accessor_type}: {access.accessor_id}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {access.data_type}
                            </TableCell>
                            <TableCell className="text-sm">{access.purpose}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                            No data access recorded
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ETHICS & VIOLATIONS TAB */}
          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ethics & Security Violations</CardTitle>
                <CardDescription>
                  Violations detected and auto-fixed by our Ethics & Reasoning Agent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {ethicsViolations.length > 0 ? (
                  <div className="space-y-4">
                    {ethicsViolations.map((violation) => (
                      <div
                        key={violation.id}
                        className="p-4 border rounded-lg hover:bg-secondary/50 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(violation.severity)}
                            <h4 className="font-medium capitalize">
                              {violation.violation_type.replace(/_/g, ' ')}
                            </h4>
                          </div>
                          <Badge variant={getSeverityColor(violation.severity)}>
                            {violation.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {violation.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                          {violation.fix_applied ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Auto-fixed: {violation.fix_type}</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                              <span className="text-yellow-600">
                                Pending fix: requires review
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Detected: {formatDate(violation.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No ethics or security violations detected
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
          <p>
            📋 <strong>Privacy & Audit Dashboard</strong>: Complete transparency into your data.
            This dashboard is powered by our Ethics & Reasoning Agent, which automatically logs all
            changes and ensures privacy compliance.
          </p>
          <p className="mt-2">
            🔒 <strong>Your Rights</strong>: You can export your data, change consent preferences,
            or request deletion anytime. See our{' '}
            <a href="/privacy-policy" className="underline hover:no-underline">
              Privacy Policy
            </a>{' '}
            for details.
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper function to get consent descriptions
const getConsentDescription = (consentType) => {
  const descriptions = {
    analytics:
      "We collect anonymized usage data to improve the platform (only with consent)",
    profiling:
      "We analyze your learning patterns to provide personalized recommendations",
    third_party_sharing:
      "We may share data with educational partners and service providers",
    location_tracking:
      "We collect your approximate location to provide location-specific features",
    behavioral_tracking:
      "We track how you interact with our platform to improve your experience",
    marketing_emails:
      "We send you emails about new features, courses, and promotions",
    privacy_policy:
      "You accept our Privacy Policy and Terms of Service",
    terms_of_service:
      "You agree to abide by our Terms of Service",
  };
  return descriptions[consentType] || "Consent category";
};

export default AuditDashboard;
