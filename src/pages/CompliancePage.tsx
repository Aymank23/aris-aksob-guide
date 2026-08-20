import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FilterContext';
import { loadScopedData, daysSince, OVERDUE_MEETING_DAYS } from '@/lib/analytics';
import { ShieldCheck, AlertTriangle, Clock, FileX } from 'lucide-react';

interface Alert {
  type: string;
  message: string;
  severity: 'warning' | 'critical';
  case_id: string;
  student_name: string;
  campus: string;
}

const CompliancePage = () => {
  const { user } = useAuth();
  const { scope, campus } = useFilters();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({ overdue: 0, missingMeetings: 0, missingAIP: 0, missingFollowups: 0 });

  const loadData = useCallback(async () => {
    const { cases } = await loadScopedData(user, scope);

    const alertList: Alert[] = [];
    let overdue = 0, missingMeetings = 0, missingAIP = 0, missingFollowups = 0;

    cases.forEach((c) => {
      const daysSinceCreated = daysSince(c.created_date);
      const base = { case_id: c.case_id, student_name: c.student_name, campus: c.campus };

      if (!c.assigned_advisor && daysSinceCreated > 7) {
        alertList.push({ ...base, type: 'No Advisor', message: 'Advisor not assigned within 7 days', severity: 'critical' });
        overdue++;
      }
      if (c.meeting_status !== 'completed' && daysSinceCreated > OVERDUE_MEETING_DAYS) {
        alertList.push({ ...base, type: 'Meeting Overdue', message: 'Meeting not held within 14 days', severity: 'critical' });
        missingMeetings++;
      }
      if (c.assigned_advisor && c.meeting_status === 'completed' && c.aip_status !== 'completed') {
        alertList.push({ ...base, type: 'Missing AIP', message: 'Intervention plan not completed', severity: 'warning' });
        missingAIP++;
      }
      if (c.aip_status === 'completed' && c.midterm_review_status !== 'completed') {
        alertList.push({ ...base, type: 'Missing Midterm', message: 'Midterm review pending', severity: 'warning' });
        missingFollowups++;
      }
    });

    setAlerts(alertList);
    setStats({ overdue, missingMeetings, missingAIP, missingFollowups });
  }, [user, scope]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Compliance Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor intervention compliance and overdue actions{campus !== 'all' ? ` · ${campus} campus` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Overdue Cases" value={stats.overdue} icon={AlertTriangle} variant="destructive" />
          <KpiCard title="Missing Meetings" value={stats.missingMeetings} icon={Clock} variant="warning" />
          <KpiCard title="Missing AIP" value={stats.missingAIP} icon={FileX} variant="warning" />
          <KpiCard title="Missing Reviews" value={stats.missingFollowups} icon={ShieldCheck} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base font-sans font-medium">Active Alerts</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Campus</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No compliance alerts</TableCell>
                  </TableRow>
                ) : (
                  alerts.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                          {a.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{a.type}</TableCell>
                      <TableCell>{a.student_name}</TableCell>
                      <TableCell>{a.campus}</TableCell>
                      <TableCell className="text-muted-foreground">{a.message}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CompliancePage;
