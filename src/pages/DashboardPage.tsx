import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { CHART_COLORS } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FilterContext';
import { loadScopedData, computeMetrics, normalizeCampus } from '@/lib/analytics';
import ResetSemesterDialog from '@/components/ResetSemesterDialog';
import {
  AlertTriangle, Users, CheckCircle, FileText, TrendingUp, UserCheck,
  BookOpen, GraduationCap, Building2, MapPin, RotateCcw, ArrowLeft,
} from 'lucide-react';
import DashboardTour from '@/components/DashboardTour';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DeptKpi {
  name: string;
  totalStudents: number;
  atRisk: number;
  catA: number;
  catB: number;
  catAPct: string;
  catBPct: string;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const { scope, campus, department, setDepartment, clearDepartment } = useFilters();
  const [resetOpen, setResetOpen] = useState(false);
  const [stats, setStats] = useState({
    totalFlagged: 0, categoryA: 0, categoryB: 0,
    advisorsAssigned: 0, meetingsCompleted: 0,
    aipCompleted: 0, midtermReviews: 0, improved: 0,
    totalStudents: 0, atRiskPct: 0,
  });
  const [deptData, setDeptData] = useState<{ name: string; count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);
  const [campusData, setCampusData] = useState<{ name: string; students: number; atRisk: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [deptKpis, setDeptKpis] = useState<DeptKpi[]>([]);

  const loadDashboardData = useCallback(async () => {
    const data = await loadScopedData(user, scope);
    const m = computeMetrics(data);
    const { cases, students } = data;

    setStats({
      totalFlagged: m.total, categoryA: m.catA, categoryB: m.catB,
      advisorsAssigned: m.pct(m.assigned), meetingsCompleted: m.pct(m.meetingsDone),
      aipCompleted: m.pct(m.aipDone), midtermReviews: m.pct(m.midtermDone),
      improved: m.pct(m.improved),
      totalStudents: m.totalStudents, atRiskPct: m.atRiskPct,
    });

    const deptMap: Record<string, number> = {};
    cases.forEach((c) => { deptMap[c.department] = (deptMap[c.department] || 0) + 1; });
    setDeptData(Object.entries(deptMap).map(([name, count]) => ({ name, count })));

    setStatusData([
      { name: 'Pending', value: cases.filter((c) => !c.assigned_advisor).length },
      { name: 'In Progress', value: cases.filter((c) => c.assigned_advisor && c.outcome_status !== 'completed').length },
      { name: 'Completed', value: m.caseClosed },
    ]);

    // Campus breakdown
    const campusMap: Record<string, { students: number; atRisk: number }> = {};
    students.forEach((s: any) => {
      const key = normalizeCampus(s.campus);
      campusMap[key] = campusMap[key] || { students: 0, atRisk: 0 };
      campusMap[key].students++;
    });
    cases.forEach((c: any) => {
      const key = normalizeCampus(c.campus);
      campusMap[key] = campusMap[key] || { students: 0, atRisk: 0 };
      campusMap[key].atRisk++;
    });
    setCampusData(Object.entries(campusMap).map(([name, v]) => ({ name, ...v })));

    setFunnelData([
      { name: 'At-Risk Identified', value: m.total, fill: CHART_COLORS[0] },
      { name: 'Advisor Assigned', value: m.assigned, fill: CHART_COLORS[1] },
      { name: 'Meeting Conducted', value: m.meetingsDone, fill: CHART_COLORS[2] },
      { name: 'AIP Submitted', value: m.aipDone, fill: CHART_COLORS[3] },
      { name: 'Follow-Up Done', value: m.followUpDone, fill: CHART_COLORS[4] },
      { name: 'Case Closed', value: m.caseClosed, fill: CHART_COLORS[0] },
    ]);

    const deptStudentMap: Record<string, number> = {};
    students.forEach((s: any) => {
      deptStudentMap[s.department] = (deptStudentMap[s.department] || 0) + 1;
    });

    const allDepts = new Set([...Object.keys(deptMap), ...Object.keys(deptStudentMap)]);
    setDeptKpis(Array.from(allDepts).map((dept) => {
      const deptCases = cases.filter((c) => c.department === dept);
      const ts = deptStudentMap[dept] || 0;
      const ca = deptCases.filter((c) => c.risk_category === 'Category A').length;
      const cb = deptCases.filter((c) => c.risk_category === 'Category B').length;
      return {
        name: dept,
        totalStudents: ts,
        atRisk: deptCases.length,
        catA: ca,
        catB: cb,
        catAPct: ts > 0 ? `${Math.round((ca / ts) * 100)}%` : '—',
        catBPct: ts > 0 ? `${Math.round((cb / ts) * 100)}%` : '—',
      };
    }));
  }, [user, scope]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const isChair = user?.role === 'department_chair';
  const scopeLabel = [
    department !== 'all' ? department : null,
    campus !== 'all' ? campus : null,
  ].filter(Boolean).join(' · ');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">
              {department !== 'all' ? `${department} — Department Dashboard` : 'Executive ARIP Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time academic risk intervention overview{scopeLabel ? ` · ${scopeLabel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {department !== 'all' && !isChair && (
              <Button variant="outline" size="sm" onClick={clearDepartment}>
                <ArrowLeft className="h-4 w-4 mr-2" /> All Departments
              </Button>
            )}
            <DashboardTour />
            {user?.role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => setResetOpen(true)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Reset Semester Data
              </Button>
            )}
          </div>
        </div>

        {/* School-Level KPIs */}
        <div data-tour="kpi-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard title="Total Students" value={stats.totalStudents} icon={GraduationCap} />
          <KpiCard title="Total At-Risk" value={stats.totalFlagged} icon={AlertTriangle} variant="warning" />
          <KpiCard title="% At-Risk" value={`${stats.atRiskPct}%`} icon={Users} variant={stats.atRiskPct > 20 ? 'destructive' : 'warning'} />
          <KpiCard title="Category A" value={stats.categoryA} subtitle="<45 credits, CGPA ≤2.3" icon={BookOpen} variant="destructive" />
          <KpiCard title="Category B" value={stats.categoryB} subtitle="≥45 credits, CGPA ≤2.2" icon={BookOpen} variant="warning" />
        </div>

        <div data-tour="progress-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Advisors Assigned" value={`${stats.advisorsAssigned}%`} icon={UserCheck} />
          <KpiCard title="Meetings Done" value={`${stats.meetingsCompleted}%`} icon={CheckCircle} variant="success" />
          <KpiCard title="AIP Completed" value={`${stats.aipCompleted}%`} icon={FileText} />
          <KpiCard title="Improved" value={`${stats.improved}%`} icon={TrendingUp} variant="success" />
        </div>

        {/* ARIP Compliance Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-medium">ARIP Compliance Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {funnelData.map((stage, i) => {
                const prevValue = i > 0 ? funnelData[i - 1].value : stage.value;
                const conversionRate = prevValue > 0 ? Math.round((stage.value / prevValue) * 100) : 0;
                return (
                  <div key={stage.name} className="text-center">
                    <div
                      className="mx-auto rounded-lg flex items-center justify-center font-semibold text-primary-foreground text-lg"
                      style={{
                        backgroundColor: stage.fill,
                        width: `${Math.max(40, 100 - i * 10)}%`,
                        height: '64px',
                      }}
                    >
                      {stage.value}
                    </div>
                    <p className="text-xs font-medium mt-2 text-foreground">{stage.name}</p>
                    {i > 0 && (
                      <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-tour="dept-chart">
            <CardHeader>
              <CardTitle className="text-base font-sans font-medium">Students at Risk by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} height={60} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                    cursor={isChair ? 'default' : 'pointer'}
                    onClick={(d: any) => { if (!isChair && d?.name) setDepartment(d.name); }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card data-tour="status-chart">
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
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1 }}
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

        {/* Campus comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Campus Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={campusData} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={40} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Bar dataKey="students" name="Students" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="atRisk" name="At Risk" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department KPI Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Department Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Total Students</TableHead>
                  <TableHead>At-Risk</TableHead>
                  <TableHead>Cat A</TableHead>
                  <TableHead>Cat A %</TableHead>
                  <TableHead>Cat B</TableHead>
                  <TableHead>Cat B %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deptKpis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No data for the current filters.
                    </TableCell>
                  </TableRow>
                ) : deptKpis.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium">
                      {isChair ? d.name : (
                        <button
                          className="text-primary hover:underline font-medium"
                          onClick={() => setDepartment(d.name)}
                        >
                          {d.name}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>{d.totalStudents}</TableCell>
                    <TableCell>{d.atRisk}</TableCell>
                    <TableCell>{d.catA}</TableCell>
                    <TableCell>{d.catAPct}</TableCell>
                    <TableCell>{d.catB}</TableCell>
                    <TableCell>{d.catBPct}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ResetSemesterDialog open={resetOpen} onOpenChange={setResetOpen} onReset={loadDashboardData} />
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
