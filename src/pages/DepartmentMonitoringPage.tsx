import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Building2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(160, 63%, 14%)', 'hsl(155, 45%, 28%)', 'hsl(150, 35%, 42%)', 'hsl(148, 25%, 58%)'];

const DepartmentMonitoringPage = () => {
  const [deptStats, setDeptStats] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: cases } = await supabase.from('risk_cases').select('*');
    if (!cases) return;

    const deptMap: Record<string, any> = {};
    cases.forEach((c) => {
      if (!deptMap[c.department]) {
        deptMap[c.department] = { name: c.department, total: 0, assigned: 0, completed: 0, overdue: 0 };
      }
      const d = deptMap[c.department];
      d.total++;
      if (c.assigned_advisor) d.assigned++;
      if (c.outcome_status === 'completed') d.completed++;
      const daysDiff = (Date.now() - new Date(c.created_date).getTime()) / (1000 * 60 * 60 * 24);
      if (c.meeting_status !== 'completed' && daysDiff > 14) d.overdue++;
    });

    setDeptStats(Object.values(deptMap));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Department Monitoring</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-department risk and compliance overview</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,10%,88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="total" name="Total" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="assigned" name="Assigned" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default DepartmentMonitoringPage;
