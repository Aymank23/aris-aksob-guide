import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CHART_COLORS } from '@/lib/constants';
import { Building2, AlertTriangle, CheckCircle, Clock, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const DepartmentMonitoringPage = () => {
  const { user } = useAuth();
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [studentAlerts, setStudentAlerts] = useState<any[]>([]);
  const [advisorPerf, setAdvisorPerf] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    let caseQuery = supabase.from('risk_cases').select('*');
    // Chairs see only their department
    if (user?.role === 'department_chair' && user.department) {
      caseQuery = caseQuery.eq('department', user.department);
    }

    const [{ data: cases }, { data: students }, { data: advisorUsers }, { data: followUps }, { data: interventions }] = await Promise.all([
      caseQuery,
      supabase.from('students').select('*'),
      supabase.from('app_users').select('*').eq('role', 'advisor').eq('status', 'active'),
      supabase.from('follow_ups').select('case_id'),
      supabase.from('intervention_forms').select('case_id'),
    ]);

    if (!cases) return;

    const followUpSet = new Set(followUps?.map(f => f.case_id) || []);
    const interventionSet = new Set(interventions?.map(f => f.case_id) || []);

    // Department stats
    const deptMap: Record<string, any> = {};
    const studentDeptMap: Record<string, number> = {};
    students?.forEach((s: any) => {
      if (user?.role === 'department_chair' && user.department && s.department !== user.department) return;
      studentDeptMap[s.department] = (studentDeptMap[s.department] || 0) + 1;
    });

    cases.forEach((c) => {
      if (!deptMap[c.department]) {
        deptMap[c.department] = { name: c.department, total: 0, assigned: 0, completed: 0, overdue: 0, totalStudents: studentDeptMap[c.department] || 0 };
      }
      const d = deptMap[c.department];
      d.total++;
      if (c.assigned_advisor) d.assigned++;
      if (c.outcome_status === 'completed') d.completed++;
      const daysDiff = (Date.now() - new Date(c.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (c.meeting_status !== 'completed' && daysDiff > 14) d.overdue++;
    });

    setDeptStats(Object.values(deptMap));

    // Student-level monitoring alerts
    const alerts: any[] = [];
    cases.forEach(c => {
      const daysSince = (Date.now() - new Date(c.created_date).getTime()) / (1000 * 60 * 60 * 24);
      const issues: string[] = [];

      if (c.meeting_status !== 'completed' && daysSince > 14) issues.push('Meeting overdue');
      if (c.meeting_status === 'completed' && !interventionSet.has(c.case_id)) issues.push('AIP not submitted');
      if (c.aip_status === 'completed' && c.midterm_review_status !== 'completed') issues.push('Midterm review pending');
      if (c.aip_status === 'completed' && !followUpSet.has(c.case_id)) issues.push('Missing follow-up');

      if (issues.length > 0) {
        alerts.push({
          student_name: c.student_name,
          student_id: c.student_id,
          advisor: c.assigned_advisor_name || 'Unassigned',
          issues,
        });
      }
    });
    setStudentAlerts(alerts);

    // Advisor performance (filtered for chairs)
    let filteredAdvisors = advisorUsers || [];
    if (user?.role === 'department_chair' && user.department) {
      filteredAdvisors = filteredAdvisors.filter(a => a.department === user.department);
    }

    const perf = filteredAdvisors.map(a => {
      const myCases = cases.filter(c => c.assigned_advisor === a.user_id);
      return {
        name: a.full_name,
        assigned: myCases.length,
        meetings: myCases.filter(c => c.meeting_status === 'completed').length,
        aip: myCases.filter(c => interventionSet.has(c.case_id)).length,
        midterm: myCases.filter(c => c.midterm_review_status === 'completed').length,
        followUps: myCases.filter(c => followUpSet.has(c.case_id)).length,
      };
    });
    setAdvisorPerf(perf);
  };

  const isChair = user?.role === 'department_chair';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">
            {isChair ? `${user?.department} — Department Dashboard` : 'Department Monitoring'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isChair ? 'Monitor your department risk cases and advisor performance' : 'Cross-department risk and compliance overview'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Departments" value={deptStats.length} icon={Building2} />
          <KpiCard title="Total At Risk" value={deptStats.reduce((s, d) => s + d.total, 0)} icon={AlertTriangle} variant="warning" />
          <KpiCard title="Total Completed" value={deptStats.reduce((s, d) => s + d.completed, 0)} icon={CheckCircle} variant="success" />
          <KpiCard title="Total Overdue" value={deptStats.reduce((s, d) => s + d.overdue, 0)} icon={Clock} variant="destructive" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base font-sans font-medium">Students at Risk per Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={deptStats} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="total" name="Total" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="assigned" name="Assigned" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Advisor Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Advisor Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Meetings</TableHead>
                    <TableHead>AIP Submitted</TableHead>
                    <TableHead>Midterm Reviews</TableHead>
                    <TableHead>Follow-Ups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisorPerf.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No advisors found</TableCell>
                    </TableRow>
                  ) : (
                    advisorPerf.map((a) => (
                      <TableRow key={a.name}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.assigned}</TableCell>
                        <TableCell>{a.meetings}/{a.assigned}</TableCell>
                        <TableCell>{a.aip}/{a.assigned}</TableCell>
                        <TableCell>{a.midterm}/{a.assigned}</TableCell>
                        <TableCell>{a.followUps}/{a.assigned}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {advisorPerf.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={advisorPerf} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="meetings" name="Meetings" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aip" name="AIP" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="midterm" name="Midterm" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="followUps" name="Follow-Ups" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Student Monitoring Alerts */}
        {studentAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Student Monitoring Alerts
                <Badge variant="destructive" className="ml-2">{studentAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Alerts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentAlerts.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{a.student_name}</TableCell>
                      <TableCell className="font-mono text-xs">{a.student_id}</TableCell>
                      <TableCell>{a.advisor}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {a.issues.map((issue: string) => (
                            <Badge
                              key={issue}
                              variant={issue.includes('overdue') ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              ⚠ {issue}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default DepartmentMonitoringPage;
