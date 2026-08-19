import { supabase } from '@/lib/supabase';

export const UNSPECIFIED_CAMPUS = 'Not Specified';

/** Normalize any campus value to a single canonical label. */
export const normalizeCampus = (value?: string | null): string => {
  const trimmed = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return UNSPECIFIED_CAMPUS;
  return trimmed
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

export const normalizeText = (value?: string | null): string =>
  (value ?? '').trim().replace(/\s+/g, ' ');

export interface Scope {
  campus: string;      // 'all' or a campus label
  department: string;  // 'all' or a department name
}

export interface ScopedData {
  cases: any[];
  students: any[];
  followUps: any[];
  interventions: any[];
  outcomes: any[];
}

interface ScopeUser {
  id?: string;
  role?: string;
  department?: string | null;
}

const matches = (row: any, scope: Scope) => {
  if (scope.campus !== 'all' && normalizeCampus(row.campus) !== scope.campus) return false;
  if (scope.department !== 'all' && normalizeText(row.department) !== scope.department) return false;
  return true;
};

/**
 * Single source of truth for every dashboard/report query.
 * Applies role scoping (chairs -> own department, advisors -> own cases)
 * on top of the active campus/department filters.
 */
export const loadScopedData = async (
  user: ScopeUser | null | undefined,
  scope: Scope,
): Promise<ScopedData> => {
  const [{ data: cases }, { data: students }, { data: followUps }, { data: interventions }, { data: outcomes }] =
    await Promise.all([
      supabase.from('risk_cases').select('*'),
      supabase.from('students').select('*'),
      supabase.from('follow_ups').select('*'),
      supabase.from('intervention_forms').select('case_id'),
      supabase.from('outcomes').select('*'),
    ]);

  let scopedCases = (cases || []).map((c: any) => ({ ...c, campus: normalizeCampus(c.campus) }));
  let scopedStudents = (students || []).map((s: any) => ({ ...s, campus: normalizeCampus(s.campus) }));

  if (user?.role === 'department_chair' && user.department) {
    scopedCases = scopedCases.filter((c) => c.department === user.department);
    scopedStudents = scopedStudents.filter((s) => s.department === user.department);
  }
  if (user?.role === 'advisor' && user.id) {
    scopedCases = scopedCases.filter((c) => c.assigned_advisor === user.id);
  }

  scopedCases = scopedCases.filter((c) => matches(c, scope));
  scopedStudents = scopedStudents.filter((s) => matches(s, scope));

  const caseIds = new Set(scopedCases.map((c) => c.case_id));

  return {
    cases: scopedCases,
    students: scopedStudents,
    followUps: (followUps || []).filter((f: any) => caseIds.has(f.case_id)),
    interventions: (interventions || []).filter((i: any) => caseIds.has(i.case_id)),
    outcomes: (outcomes || []).filter((o: any) => caseIds.has(o.case_id)),
  };
};

/** Shared KPI computation so every page reports identical numbers. */
export const computeMetrics = (data: ScopedData) => {
  const { cases, students, outcomes, followUps, interventions } = data;
  const total = cases.length;
  const totalStudents = students.length;
  const followUpSet = new Set(followUps.map((f) => f.case_id));
  const interventionSet = new Set(interventions.map((i) => i.case_id));

  const catA = cases.filter((c) => c.risk_category === 'Category A').length;
  const catB = cases.filter((c) => c.risk_category === 'Category B').length;
  const assigned = cases.filter((c) => c.assigned_advisor).length;
  const meetingsDone = cases.filter((c) => c.meeting_status === 'completed').length;
  const aipDone = cases.filter((c) => c.aip_status === 'completed').length;
  const midtermDone = cases.filter((c) => c.midterm_review_status === 'completed').length;
  const caseClosed = cases.filter((c) => c.outcome_status === 'completed').length;
  const followUpDone = cases.filter((c) => followUpSet.has(c.case_id)).length;
  const improved = outcomes.filter((o) => o.final_outcome === 'improved_above_threshold').length;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    total, totalStudents, catA, catB, assigned, meetingsDone, aipDone,
    midtermDone, caseClosed, followUpDone, improved,
    followUpSet, interventionSet,
    atRiskPct: totalStudents > 0 ? Math.round((total / totalStudents) * 100) : 0,
    pct,
  };
};

export const OVERDUE_MEETING_DAYS = 14;

export const daysSince = (date: string) =>
  (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
