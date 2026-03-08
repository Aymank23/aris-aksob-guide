import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { CHART_COLORS } from '@/lib/constants';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdvisorWorkloadTour from '@/components/AdvisorWorkloadTour';

const AdvisorWorkloadPage = () => {
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: users } = await supabase.from('app_users').select('*').eq('role', 'advisor').eq('status', 'active');
    const { data: cases } = await supabase.from('risk_cases').select('*');
    if (!users || !cases) return;

    const advisorStats = users.map((u) => {
      const myCases = cases.filter((c) => c.assigned_advisor === u.user_id);
      return {
        name: u.full_name,
        department: u.department,
        assigned: myCases.length,
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
  };

  const totalAssigned = advisors.reduce((s, a) => s + a.assigned, 0);
  const totalPending = advisors.reduce((s, a) => s + a.pending, 0);
  const totalOverdue = advisors.reduce((s, a) => s + a.overdue, 0);
  const totalCompleted = advisors.reduce((s, a) => s + a.completed, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Advisor Workload</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor advisor assignments and case completion</p>
          </div>
          <AdvisorWorkloadTour />
        </div>

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
            <CardHeader><CardTitle className="text-base font-sans font-medium">Advisor Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Overdue</TableHead>
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
                      <TableCell>{a.pending}</TableCell>
                      <TableCell className={a.overdue > 0 ? 'text-destructive font-medium' : ''}>{a.overdue}</TableCell>
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
