import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CHART_COLORS } from '@/lib/constants';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdvisorWorkloadTour from '@/components/AdvisorWorkloadTour';

const AdvisorWorkloadPage = () => {
  const { user } = useAuth();
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [deptSummary, setDeptSummary] = useState({ total: 0, assigned: 0, unassigned: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: users } = await supabase.from('app_users').select('*').eq('role', 'advisor').eq('status', 'active');
    let caseQuery = supabase.from('risk_cases').select('*');

    // Filter for chairs: only their department
    if (user?.role === 'department_chair' && user.department) {
      caseQuery = caseQuery.eq('department', user.department);
    }

    const { data: cases } = await caseQuery;
    const { data: followUps } = await supabase.from('follow_ups').select('case_id');
    const { data: interventions } = await supabase.from('intervention_forms').select('case_id');

    if (!users || !cases) return;

    const followUpSet = new Set(followUps?.map(f => f.case_id) || []);
    const interventionSet = new Set(interventions?.map(f => f.case_id) || []);

    // Filter advisors by department for chairs
    let filteredUsers = users;
    if (user?.role === 'department_chair' && user.department) {
      filteredUsers = users.filter(u => u.department === user.department);
    }

    const advisorStats = filteredUsers.map((u) => {
      const myCases = cases.filter((c) => c.assigned_advisor === u.user_id);
      return {
        name: u.full_name,
        department: u.department,
        assigned: myCases.length,
        meetingsDone: myCases.filter(c => c.meeting_status === 'completed').length,
        aipSubmitted: myCases.filter(c => interventionSet.has(c.case_id)).length,
        midtermDone: myCases.filter(c => c.midterm_review_status === 'completed').length,
        followUpsDone: myCases.filter(c => followUpSet.has(c.case_id)).length,
        pending: myCases.filter((c) => c.meeting_status !== 'completed').length,
        overdue: myCases.filter((c) => {
          const created = new Date(c.created_date);
          const daysDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
          return c.meeting_status !== 'completed' && daysDiff > 14;
        }).length,
        completed: myCases.filter((c) => c.outcome_status === 'completed').length,
      };
    });

    setAdvisors(advisorStats);
    setChartData(advisorStats.map((a) => ({ name: a.name.split(' ')[0], cases: a.assigned })));

    // Department summary for chairs
    const totalCases = cases.length;
    const assignedCases = cases.filter(c => c.assigned_advisor).length;
    setDeptSummary({
      total: totalCases,
      assigned: assignedCases,
      unassigned: totalCases - assignedCases,
    });
  };

  const totalAssigned = advisors.reduce((s, a) => s + a.assigned, 0);
  const totalPending = advisors.reduce((s, a) => s + a.pending, 0);
  const totalOverdue = advisors.reduce((s, a) => s + a.overdue, 0);
  const totalCompleted = advisors.reduce((s, a) => s + a.completed, 0);

  const isDeptChair = user?.role === 'department_chair';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              {isDeptChair ? `${user?.department} — Advisor Workload` : 'Advisor Workload'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isDeptChair
                ? `Monitor advisor assignments within ${user?.department}`
                : 'Monitor advisor assignments and case completion'}
            </p>
          </div>
          <AdvisorWorkloadTour />
        </div>

        {isDeptChair && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Total Cases" value={deptSummary.total} icon={Users} />
            <KpiCard title="Assigned" value={deptSummary.assigned} icon={CheckCircle} variant="success" />
            <KpiCard title="Unassigned" value={deptSummary.unassigned} icon={AlertTriangle} variant="warning" />
          </div>
        )}

        <div data-tour="workload-kpis" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Assigned Cases" value={totalAssigned} icon={Users} />
          <KpiCard title="Pending Meetings" value={totalPending} icon={Clock} variant="warning" />
          <KpiCard title="Overdue Cases" value={totalOverdue} icon={AlertTriangle} variant="destructive" />
          <KpiCard title="Completed" value={totalCompleted} icon={CheckCircle} variant="success" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-tour="workload-chart">
            <CardHeader><CardTitle className="text-base font-sans font-medium">Workload Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cases" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card data-tour="workload-table">
            <CardHeader><CardTitle className="text-base font-sans font-medium">Advisor Performance</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Meetings</TableHead>
                    <TableHead>AIP</TableHead>
                    <TableHead>Midterm</TableHead>
                    <TableHead>Follow-Ups</TableHead>
                    <TableHead>Done</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisors.map((a) => (
                    <TableRow key={a.name}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.department}</TableCell>
                      <TableCell>
                        <Badge variant={a.assigned >= 10 ? 'destructive' : 'secondary'}>{a.assigned}/10</Badge>
                      </TableCell>
                      <TableCell>{a.meetingsDone}/{a.assigned}</TableCell>
                      <TableCell>{a.aipSubmitted}/{a.assigned}</TableCell>
                      <TableCell>{a.midtermDone}/{a.assigned}</TableCell>
                      <TableCell>{a.followUpsDone}/{a.assigned}</TableCell>
                      <TableCell>{a.completed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdvisorWorkloadPage;
