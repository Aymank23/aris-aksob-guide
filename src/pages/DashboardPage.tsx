import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  AlertTriangle,
  Users,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  UserCheck,
  BookOpen,
  HeartPulse,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const CHART_COLORS = [
  'hsl(160, 63%, 14%)',
  'hsl(155, 45%, 28%)',
  'hsl(150, 35%, 42%)',
  'hsl(148, 25%, 58%)',
  'hsl(145, 20%, 72%)',
];

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalFlagged: 0,
    categoryA: 0,
    categoryB: 0,
    advisorsAssigned: 0,
    meetingsCompleted: 0,
    aipCompleted: 0,
    midtermReviews: 0,
    improved: 0,
    referralRate: 0,
  });
  const [deptData, setDeptData] = useState<{ name: string; count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const { data: cases } = await supabase.from('risk_cases').select('*');
    if (!cases) return;

    const total = cases.length;
    const catA = cases.filter((c) => c.risk_category === 'Category A').length;
    const catB = cases.filter((c) => c.risk_category === 'Category B').length;
    const assigned = cases.filter((c) => c.assigned_advisor).length;
    const meetingsDone = cases.filter((c) => c.meeting_status === 'completed').length;
    const aipDone = cases.filter((c) => c.aip_status === 'completed').length;
    const midtermDone = cases.filter((c) => c.midterm_review_status === 'completed').length;

    const { data: outcomes } = await supabase.from('outcomes').select('*');
    const improvedCount = outcomes?.filter((o) => o.final_outcome === 'improved_above_threshold').length || 0;

    setStats({
      totalFlagged: total,
      categoryA: catA,
      categoryB: catB,
      advisorsAssigned: total > 0 ? Math.round((assigned / total) * 100) : 0,
      meetingsCompleted: total > 0 ? Math.round((meetingsDone / total) * 100) : 0,
      aipCompleted: total > 0 ? Math.round((aipDone / total) * 100) : 0,
      midtermReviews: total > 0 ? Math.round((midtermDone / total) * 100) : 0,
      improved: total > 0 ? Math.round((improvedCount / total) * 100) : 0,
      referralRate: 0,
    });

    // Department distribution
    const deptMap: Record<string, number> = {};
    cases.forEach((c) => {
      deptMap[c.department] = (deptMap[c.department] || 0) + 1;
    });
    setDeptData(Object.entries(deptMap).map(([name, count]) => ({ name, count })));

    // Status distribution
    const statusMap: Record<string, number> = {
      'Pending': cases.filter((c) => !c.assigned_advisor).length,
      'In Progress': cases.filter((c) => c.assigned_advisor && c.outcome_status !== 'completed').length,
      'Completed': cases.filter((c) => c.outcome_status === 'completed').length,
    };
    setStatusData(Object.entries(statusMap).map(([name, value]) => ({ name, value })));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Executive ARIP Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time academic risk intervention overview</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard title="Total Flagged" value={stats.totalFlagged} icon={AlertTriangle} variant="warning" />
          <KpiCard title="Category A" value={stats.categoryA} subtitle="<45 credits, CGPA ≤2.3" icon={BookOpen} variant="destructive" />
          <KpiCard title="Category B" value={stats.categoryB} subtitle="≥45 credits, CGPA ≤2.2" icon={BookOpen} variant="warning" />
          <KpiCard title="Advisors Assigned" value={`${stats.advisorsAssigned}%`} icon={UserCheck} />
          <KpiCard title="Meetings Done" value={`${stats.meetingsCompleted}%`} icon={CheckCircle} variant="success" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="AIP Completed" value={`${stats.aipCompleted}%`} icon={FileText} />
          <KpiCard title="Midterm Reviews" value={`${stats.midtermReviews}%`} icon={Clock} />
          <KpiCard title="Improved" value={`${stats.improved}%`} icon={TrendingUp} variant="success" />
          <KpiCard title="Referral Rate" value={`${stats.referralRate}%`} icon={HeartPulse} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans font-medium">Students at Risk by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150,10%,88%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-sans font-medium">Case Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
