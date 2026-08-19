import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeCampus, normalizeText } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface FilterContextType {
  campus: string;
  department: string;
  setCampus: (c: string) => void;
  setDepartment: (d: string) => void;
  clearDepartment: () => void;
  campusOptions: string[];
  departmentOptions: string[];
  refreshOptions: () => Promise<void>;
  scope: { campus: string; department: string };
}

const FilterContext = createContext<FilterContextType | null>(null);

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be inside FilterProvider');
  return ctx;
};

const STORAGE_KEY = 'arip_filters';

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const stored = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  const [campus, setCampusState] = useState<string>(stored.campus || 'all');
  const [department, setDepartmentState] = useState<string>(stored.department || 'all');
  const [campusOptions, setCampusOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);

  const persist = (next: { campus: string; department: string }) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setCampus = (c: string) => {
    setCampusState(c);
    persist({ campus: c, department });
  };
  const setDepartment = (d: string) => {
    setDepartmentState(d);
    persist({ campus, department: d });
  };
  const clearDepartment = () => setDepartment('all');

  const refreshOptions = useCallback(async () => {
    const [{ data: cases }, { data: students }] = await Promise.all([
      supabase.from('risk_cases').select('campus, department'),
      supabase.from('students').select('campus, department'),
    ]);
    const rows = [...(cases || []), ...(students || [])];
    setCampusOptions([...new Set(rows.map((r: any) => normalizeCampus(r.campus)))].sort());
    setDepartmentOptions([...new Set(rows.map((r: any) => normalizeText(r.department)).filter(Boolean))].sort());
  }, []);

  useEffect(() => { refreshOptions(); }, [refreshOptions]);

  // Chairs are always locked to their own department
  const effectiveDepartment = user?.role === 'department_chair' && user.department
    ? user.department
    : department;

  const value = useMemo(() => ({
    campus,
    department: effectiveDepartment,
    setCampus,
    setDepartment,
    clearDepartment,
    campusOptions,
    departmentOptions,
    refreshOptions,
    scope: { campus, department: effectiveDepartment },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [campus, effectiveDepartment, campusOptions, departmentOptions, refreshOptions]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};
