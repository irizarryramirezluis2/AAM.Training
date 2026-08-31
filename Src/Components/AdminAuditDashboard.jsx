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
import { Download, Mail, Eye, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * AdminAuditDashboard Component
 * 
 * Admin-level dashboard for viewing ethics and security audit reports
 * 
 * Access Control:
 * - Level 3 (Admin): View reports every 2 weeks, access own reports
 * - Level 4 (Super Admin): View reports every 3 days, access all reports
 * 
 * Features:
 * - List audit reports
 * - View detailed reports
 * - Download reports
 * - Email reports
 * - Schedule overview
 * - Access logs (Level 4 only)
 */

const AdminAuditDashboard = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Check admin level
  const adminLevel = user?.admin_level || 0;
  const isSuperAdmin = adminLevel >= 4;
  const isAdmin = adminLevel >= 3;
  const updateFrequency = adminLevel === 4 ? '3 days' : adminLevel === 3 ? '2 weeks' : 'Not eligible';

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch reports, summary, and schedules in parallel
      const [reportsRes, summaryRes, schedulesRes] = await Promise.all([
        fetch('/api/admin/reports'),
        fetch('/api/admin/reports/summary'),
        fetch('/api/admin/reports/schedule'),
      ]);

      if (!reportsRes.ok) throw new Error('Failed to load reports');

      setReports(await reportsRes.json());
      setSummary(await summaryRes.json());
      setSchedules(await schedulesRes.json());

      // Fetch access logs if super admin
      if (isSuperAdmin) {
        const accessLogsRes = await fetch('/api/admin/access-logs');
        setAccessLogs(await accessLogsRes.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/download`);
      if (!response.ok) throw new Error('Failed to download report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${reportId}.json`;
      a.click();
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleEmailReport = async (reportId) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}/email`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to email report');

      const result = await response.json();
      alert(result.message);
    } catch (err) {
      alert('Email failed: ' + err.message);
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await fetch(`/api/admin/reports/${reportId}`);
      if (!response.ok) throw new Error('Failed to load report');

      setSelectedReport(await response.json());
    } catch (err) {
      alert('Failed to load report: ' + err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="w-full min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Access denied. You must be Admin Level 3 or higher to view audit reports.
              Your current level: {adminLevel}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading audit reports...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Audit Reports</h1>
          <p className="text-muted-foreground">
            Ethics, security, and compliance audit reports for administrative oversight
          </p>
        </div>

        {/* Admin Level Badge */}
        <div className="mb-6 flex gap-4">
          <Card className="flex-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Your Admin Level</p>
                  <p className="text-2xl font-bold">{adminLevel}</p>
                </div>
                <Badge
                  variant={adminLevel === 4 ? 'default' : 'secondary'}
                  className="text-base px-4 py-2"
                >
                  {adminLevel === 4 ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Report Update Frequency</p>
                <p className="text-2xl font-bold">{updateFrequency}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {adminLevel === 4
                    ? 'Reports updated every 3 days'
                    : 'Reports updated every 2 weeks'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="access-logs">Access Logs</TabsTrigger>}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Summary</CardTitle>
                <CardDescription>Overview of recent audit reports</CardDescription>
              </CardHeader>
              <CardContent>
                {summary ? (
                  <div className="space-y-6">
                    {/* Latest Metrics */}
                    {summary.latest_metrics && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Total Records Scanned</p>
                          <p className="text-2xl font-bold">
                            {summary.latest_metrics.total_records || 0}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Violations Found</p>
                          <p className="text-2xl font-bold text-destructive">
                            {summary.latest_metrics.violations_found || 0}
                          </p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <p className="text-sm text-muted-foreground">Auto-Fixes Applied</p>
                          <p className="text-2xl font-bold text-green-600">
                            {summary.latest_metrics.auto_fixes || 0}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recent Violations */}
                    {summary.recent_violations && summary.recent_violations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Recent Ethics Violations</h3>
                        <div className="space-y-2">
                          {summary.recent_violations.slice(0, 5).map((v, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-secondary rounded">
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {v.violations || 0} violations detected
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Period: {new Date(v.report_period_start).toLocaleDateString()} to{' '}
                                  {new Date(v.report_period_end).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {new Date(v.generated_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reports by Type */}
                    {summary.report_summary && (
                      <div>
                        <h3 className="font-semibold mb-3">Reports by Type</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Report Type</TableHead>
                                <TableHead>Count</TableHead>
                                <TableHead>Latest</TableHead>
                                <TableHead>Avg Accesses</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {summary.report_summary.map((s) => (
                                <TableRow key={s.report_type}>
                                  <TableCell className="text-sm capitalize">
                                    {s.report_type.replace(/_/g, ' ')}
                                  </TableCell>
                                  <TableCell>{s.total_reports}</TableCell>
                                  <TableCell className="text-sm">
                                    {new Date(s.latest_report).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>{Math.round(s.avg_accesses)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No reports available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REPORTS TAB */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Reports</CardTitle>
                <CardDescription>
                  Available audit reports (updated every {updateFrequency.toLowerCase()})
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reports.reports && reports.reports.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report Type</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Generated</TableHead>
                          <TableHead>Accesses</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="text-sm capitalize">
                              {report.report_type.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(report.report_period_start).toLocaleDateString()} to{' '}
                              {new Date(report.report_period_end).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(report.generated_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{report.access_count || 0}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewReport(report.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadReport(report.id)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEmailReport(report.id)}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No reports available yet</p>
                )}
              </CardContent>
            </Card>

            {/* Selected Report Details */}
            {selectedReport && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedReport.report_name}</CardTitle>
                  <CardDescription>
                    Generated:{' '}
                    {new Date(selectedReport.generated_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedReport.summary}
                      </p>
                    </div>

                    {selectedReport.metrics && (
                      <div>
                        <h4 className="font-semibold mb-2">Metrics</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedReport.metrics).map(([key, value]) => (
                            <div key={key} className="p-2 bg-secondary rounded">
                              <p className="text-xs text-muted-foreground capitalize">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <p className="font-semibold">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReport.recommendations && (
                      <div>
                        <h4 className="font-semibold mb-2">Recommendations</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedReport.recommendations.map((rec, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SCHEDULE TAB */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report Generation Schedule</CardTitle>
                <CardDescription>
                  When reports are automatically generated for your admin level
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schedules.schedules && schedules.schedules.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Report Type</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Generation Time</TableHead>
                          <TableHead>Next Generation</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedules.schedules.map((sched) => (
                          <TableRow key={sched.id}>
                            <TableCell className="text-sm capitalize">
                              {sched.report_type.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {sched.frequency.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-sm">
                              {sched.generation_time}
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(sched.next_generation_at).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {sched.enabled ? (
                                <Badge variant="default" className="flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Disabled</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No schedules configured</p>
                )}

                <Alert className="mt-4">
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    Reports for your level ({adminLevel}) are automatically generated{' '}
                    {updateFrequency.toLowerCase()}. The next batch will be available soon.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESS LOGS TAB (Level 4 only) */}
          {isSuperAdmin && (
            <TabsContent value="access-logs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Access Logs</CardTitle>
                  <CardDescription>
                    Who accessed which reports and when (Super Admin only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accessLogs.access_logs && accessLogs.access_logs.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Admin ID</TableHead>
                            <TableHead>Admin Level</TableHead>
                            <TableHead>Accessed At</TableHead>
                            <TableHead>Access Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accessLogs.access_logs.slice(0, 50).map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm font-mono">
                                {log.admin_id.slice(0, 8)}...
                              </TableCell>
                              <TableCell>{log.admin_level}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(log.accessed_at).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.access_method}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No access logs yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
          <p>
            📊 <strong>Admin Audit Reports</strong>: These reports are automatically generated based on
            your admin level:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1">
            <li>
              <strong>Level 3 (Admin)</strong>: Reports updated every <strong>2 weeks</strong>
            </li>
            <li>
              <strong>Level 4 (Super Admin)</strong>: Reports updated every <strong>3 days</strong>
            </li>
          </ul>
          <p className="mt-2">
            Reports include ethics violations, security incidents, compliance status, data access logs,
            user consent status, and agent actions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditDashboard;
