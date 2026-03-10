import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CHART_COLORS } from '@/lib/constants';
import { TrendingUp, TrendingDown, ArrowRight, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const OutcomesPage = () => {
  const { user } = useAuth();
  const [outcomeStats, setOutcomeStats] = useState<{ name: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ improved: 0, stillAtRisk: 0, declined: 0, withdrew: 0, total: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    // Get cases scoped to user's role
    let caseQuery = supabase.from('risk_cases').select('case_id');
    if (user?.role === 'department_chair' && user.department) {
      caseQuery = caseQuery.eq('department', user.department);
    }
    const { data: cases } = await caseQuery;
    const caseIds = cases?.map(c => c.case_id) || [];

    if (caseIds.length === 0) {
      setTotals({ improved: 0, stillAtRisk: 0, declined: 0, withdrew: 0, total: 0 });
      setOutcomeStats([]);
      return;
    }

    const { data: outcomes } = await supabase.from('outcomes').select('*').in('case_id', caseIds);
    if (!outcomes) return;

    const total = outcomes.length;
    const improved = outcomes.filter((o) => o.final_outcome === 'improved_above_threshold').length;
    const stillAtRisk = outcomes.filter((o) => o.final_outcome === 'improved_still_at_risk').length;
    const declined = outcomes.filter((o) => o.final_outcome === 'declined_escalated').length;
    const withdrew = outcomes.filter((o) => o.final_outcome === 'withdrew').length;

    setTotals({ improved, stillAtRisk, declined, withdrew, total });
    setOutcomeStats([
      { name: 'Improved', value: improved },
      { name: 'Still At Risk', value: stillAtRisk },
      { name: 'Declined', value: declined },
      { name: 'Withdrew', value: withdrew },
    ]);
  };

  const rate = (n: number) => totals.total > 0 ? `${Math.round((n / totals.total) * 100)}%` : '0%';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Outcomes Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track intervention effectiveness and student outcomes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard title="Improvement Rate" value={rate(totals.improved)} icon={TrendingUp} variant="success" />
          <KpiCard title="Still At Risk" value={rate(totals.stillAtRisk)} icon={ArrowRight} variant="warning" />
          <KpiCard title="Declined" value={rate(totals.declined)} icon={TrendingDown} variant="destructive" />
          <KpiCard title="Withdrew" value={rate(totals.withdrew)} icon={XCircle} />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base font-sans font-medium">Outcome Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={outcomeStats} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" labelLine={{ strokeWidth: 1 }} label={({ name, value }) => `${name}: ${value}`}>
                  {outcomeStats.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default OutcomesPage;
