import { supabase } from '@/lib/supabase';

export interface Advisor {
  advisor_id: string;
  name: string;
  department: string;
  case_count: number;
  email?: string;
}

export const loadAdvisors = async (): Promise<Advisor[]> => {
  const { data: advData } = await supabase
    .from('app_users')
    .select('*')
    .eq('role', 'advisor')
    .eq('status', 'active');
  if (!advData) return [];

  const { data: casesData } = await supabase
    .from('risk_cases')
    .select('assigned_advisor');
  const countMap: Record<string, number> = {};
  casesData?.forEach((c) => {
    if (c.assigned_advisor)
      countMap[c.assigned_advisor] = (countMap[c.assigned_advisor] || 0) + 1;
  });

  return advData.map((a) => ({
    advisor_id: a.user_id,
    name: a.full_name,
    department: a.department || '',
    case_count: countMap[a.user_id] || 0,
  }));
};
