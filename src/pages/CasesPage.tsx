import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Download, Eye, UserPlus, Plus, Pencil, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreateCaseDialog from '@/components/CreateCaseDialog';
import BulkImportDialog from '@/components/BulkImportDialog';
import DeleteCaseDialog from '@/components/DeleteCaseDialog';
import AssignAdvisorDialog from '@/components/AssignAdvisorDialog';
import CasesTour from '@/components/CasesTour';

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ caseId: string; studentName: string } | null>(null);

  // Assign advisor dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<{
    caseId: string;
    advisorId: string | null;
    advisorName: string | null;
  } | null>(null);

  useEffect(() => { loadCases(); }, []);

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

  const canManageAssignments = user?.role === 'admin' || user?.role === 'department_chair';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">Intervention Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and track all academic risk intervention cases</p>
          </div>
          <div data-tour="cases-actions" className="flex gap-2">
            <CasesTour />
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
        <Card data-tour="cases-filters">
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
        <Card data-tour="cases-table">
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
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No intervention cases available. Cases will appear here once flagged students are added.
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
                      <TableCell>
                        {canManageAssignments ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs font-normal"
                            onClick={() => {
                              setAssignTarget({
                                caseId: c.case_id,
                                advisorId: c.assigned_advisor,
                                advisorName: c.assigned_advisor_name,
                              });
                              setAssignDialogOpen(true);
                            }}
                          >
                            {c.assigned_advisor_name ? (
                              <span className="flex items-center gap-1">
                                {c.assigned_advisor_name}
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <UserPlus className="h-3 w-3" /> Assign
                              </span>
                            )}
                          </Button>
                        ) : (
                          c.assigned_advisor_name || <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(c.meeting_status)}</TableCell>
                      <TableCell>{statusBadge(c.aip_status)}</TableCell>
                      <TableCell>{statusBadge(c.midterm_review_status)}</TableCell>
                      <TableCell>{statusBadge(c.outcome_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${c.case_id}`)} title="View">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteTarget({ caseId: c.case_id, studentName: c.student_name });
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

        {/* Dialogs */}
        <CreateCaseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={loadCases}
        />

        <BulkImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImported={loadCases}
        />

        {deleteTarget && (
          <DeleteCaseDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            caseId={deleteTarget.caseId}
            studentName={deleteTarget.studentName}
            onDeleted={loadCases}
          />
        )}

        {assignTarget && (
          <AssignAdvisorDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            caseId={assignTarget.caseId}
            currentAdvisorId={assignTarget.advisorId}
            currentAdvisorName={assignTarget.advisorName}
            onUpdated={loadCases}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default CasesPage;
