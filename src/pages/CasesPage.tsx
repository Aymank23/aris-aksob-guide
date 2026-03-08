import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Download, Eye, UserPlus, Plus, Pencil, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import CreateCaseDialog from '@/components/CreateCaseDialog';
import BulkImportDialog from '@/components/BulkImportDialog';

interface RiskCase {
  case_id: string;
  student_id: string;
  student_name: string;
  department: string;
  risk_category: string;
  assigned_advisor: string | null;
  assigned_advisor_name: string | null;
  meeting_status: string;
  aip_status: string;
  midterm_review_status: string;
  outcome_status: string;
  created_date: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    completed: 'default',
    pending: 'secondary',
    overdue: 'destructive',
    'not_started': 'outline',
  };
  return <Badge variant={map[status] || 'outline'} className="text-xs capitalize">{status.replace('_', ' ')}</Badge>;
};

const CasesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<RiskCase[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [advisors, setAdvisors] = useState<{ advisor_id: string; name: string; department: string; case_count: number }[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  useEffect(() => {
    loadCases();
    loadAdvisors();
  }, []);

  const loadCases = async () => {
    let query = supabase.from('risk_cases').select('*');
    if (user?.role === 'department_chair' && user.department) {
      query = query.eq('department', user.department);
    }
    if (user?.role === 'advisor') {
      query = query.eq('assigned_advisor', user.id);
    }
    const { data } = await query.order('created_date', { ascending: false });
    setCases(data || []);
  };

  const loadAdvisors = async () => {
    const { data: advData } = await supabase.from('app_users').select('*').eq('role', 'advisor').eq('status', 'active');
    if (!advData) return;

    const { data: casesData } = await supabase.from('risk_cases').select('assigned_advisor');
    const countMap: Record<string, number> = {};
    casesData?.forEach((c) => {
      if (c.assigned_advisor) countMap[c.assigned_advisor] = (countMap[c.assigned_advisor] || 0) + 1;
    });

    setAdvisors(
      advData.map((a) => ({
        advisor_id: a.user_id,
        name: a.full_name,
        department: a.department || '',
        case_count: countMap[a.user_id] || 0,
      }))
    );
  };

  const assignAdvisor = async () => {
    if (!selectedCase || !selectedAdvisor) return;
    const advisor = advisors.find((a) => a.advisor_id === selectedAdvisor);
    if (advisor && advisor.case_count >= 10) {
      alert('This advisor has reached the maximum of 10 assigned students.');
      return;
    }
    await supabase
      .from('risk_cases')
      .update({
        assigned_advisor: selectedAdvisor,
        assigned_advisor_name: advisor?.name,
      })
      .eq('case_id', selectedCase);
    setAssignDialogOpen(false);
    setSelectedCase(null);
    setSelectedAdvisor('');
    loadCases();
    loadAdvisors();
  };

  const filtered = cases.filter((c) => {
    const matchSearch =
      c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.student_id?.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === 'all' || c.department === filterDept;
    const matchCat = filterCategory === 'all' || c.risk_category === filterCategory;
    return matchSearch && matchDept && matchCat;
  });

  const departments = [...new Set(cases.map((c) => c.department))];

  const exportCSV = () => {
    const headers = ['Student ID', 'Name', 'Department', 'Risk Category', 'Advisor', 'Meeting', 'AIP', 'Midterm', 'Outcome'];
    const rows = filtered.map((c) => [
      c.student_id, c.student_name, c.department, c.risk_category,
      c.assigned_advisor_name || 'Unassigned', c.meeting_status, c.aip_status,
      c.midterm_review_status, c.outcome_status,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arip_cases.csv';
    a.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Intervention Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track all academic risk intervention cases</p>
          </div>
          <div className="flex gap-2">
            {(user?.role === 'admin' || user?.role === 'department_chair') && (
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Intervention Case
              </Button>
            )}
            {user?.role === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Risk Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Category A">Category A</SelectItem>
                  <SelectItem value="Category B">Category B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Risk Category</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead>AIP</TableHead>
                  <TableHead>Midterm</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No cases found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.case_id}>
                      <TableCell className="font-mono text-xs">{c.student_id}</TableCell>
                      <TableCell className="font-medium">{c.student_name}</TableCell>
                      <TableCell>{c.department}</TableCell>
                      <TableCell>
                        <Badge variant={c.risk_category === 'Category A' ? 'destructive' : 'secondary'} className="text-xs">
                          {c.risk_category}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.assigned_advisor_name || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{statusBadge(c.meeting_status)}</TableCell>
                      <TableCell>{statusBadge(c.aip_status)}</TableCell>
                      <TableCell>{statusBadge(c.midterm_review_status)}</TableCell>
                      <TableCell>{statusBadge(c.outcome_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${c.case_id}`)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {(user?.role === 'advisor' && c.assigned_advisor === user.id) && (
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${c.case_id}`)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(user?.role === 'admin' || user?.role === 'department_chair') && !c.assigned_advisor && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCase(c.case_id);
                                setAssignDialogOpen(true);
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Assign Advisor Dialog */}
        {/* Assign Advisor Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Advisor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Advisor</Label>
                <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose advisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {advisors.map((a) => (
                      <SelectItem key={a.advisor_id} value={a.advisor_id} disabled={a.case_count >= 10}>
                        {a.name} ({a.department}) — {a.case_count}/10 cases
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={assignAdvisor} className="w-full">Assign</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Case Dialog */}
        <CreateCaseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={() => { loadCases(); loadAdvisors(); }}
        />

        {/* Bulk Import Dialog */}
        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImported={() => { loadCases(); loadAdvisors(); }}
        />
      </div>
    </AppLayout>
  );
};

export default CasesPage;
