import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface Advisor {
  advisor_id: string;
  name: string;
  department: string;
  case_count: number;
}

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const departments = ['Marketing', 'Finance', 'Accounting', 'Management', 'Economics', 'HITM'];

const academicFactors = ['Study skills', 'Time management', 'Quantitative difficulty', 'Writing difficulty', 'Missing prerequisites', 'Test anxiety'];
const externalFactors = ['Work obligations', 'Family responsibilities', 'Financial stress', 'Health concerns', 'Mental health concerns'];
const engagementFactors = ['Poor attendance', 'Low participation', 'Missed deadlines', 'Lack of motivation', 'Major mismatch'];
const courseStrategies = ['Maintain current schedule', 'Reduce course load', 'Withdraw from courses', 'Retake courses', 'Course sequencing adjustments'];
const supportActivities = ['Tutoring', 'Writing Center', 'Counseling referral', 'Learning support'];
const monitoringReqs = ['Bi-weekly advisor check-in', 'Midterm grade review'];

const CreateCaseDialog = ({ open, onOpenChange, onCreated }: CreateCaseDialogProps) => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [saving, setSaving] = useState(false);

  // Student info
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [department, setDepartment] = useState('');
  const [major, setMajor] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [advisorId, setAdvisorId] = useState('');

  // Academic snapshot
  const [cgpa, setCgpa] = useState('');
  const [credits, setCredits] = useState('');
  const [financialAid, setFinancialAid] = useState('');

  // Root cause
  const [rootAcademic, setRootAcademic] = useState<string[]>([]);
  const [rootExternal, setRootExternal] = useState<string[]>([]);
  const [rootEngagement, setRootEngagement] = useState<string[]>([]);
  const [advisorNotes, setAdvisorNotes] = useState('');

  // AIP
  const [courseStrategy, setCourseStrategy] = useState<string[]>([]);
  const [supportServices, setSupportServices] = useState<string[]>([]);
  const [monitoring, setMonitoring] = useState<string[]>([]);

  useEffect(() => {
    if (open) loadAdvisors();
  }, [open]);

  const loadAdvisors = async () => {
    const { data: advData } = await supabase.from('app_users').select('*').eq('role', 'advisor').eq('status', 'active');
    if (!advData) return;
    const { data: casesData } = await supabase.from('risk_cases').select('assigned_advisor');
    const countMap: Record<string, number> = {};
    casesData?.forEach((c) => {
      if (c.assigned_advisor) countMap[c.assigned_advisor] = (countMap[c.assigned_advisor] || 0) + 1;
    });
    setAdvisors(advData.map((a) => ({
      advisor_id: a.user_id,
      name: a.full_name,
      department: a.department || '',
      case_count: countMap[a.user_id] || 0,
    })));
  };

  const toggleList = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const resetForm = () => {
    setStudentId(''); setStudentName(''); setDepartment(''); setMajor('');
    setEmail(''); setPhone(''); setRiskCategory(''); setAdvisorId('');
    setCgpa(''); setCredits(''); setFinancialAid('');
    setRootAcademic([]); setRootExternal([]); setRootEngagement([]); setAdvisorNotes('');
    setCourseStrategy([]); setSupportServices([]); setMonitoring([]);
  };

  const handleSave = async () => {
    // Validation
    if (!studentId.trim()) { toast.error('Student ID is required.'); return; }
    if (!studentName.trim()) { toast.error('Student Name is required.'); return; }
    if (!department) { toast.error('Department is required.'); return; }
    if (!riskCategory) { toast.error('Risk Category is required.'); return; }

    if (cgpa && (isNaN(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 4)) {
      toast.error('CGPA must be a number between 0 and 4.'); return;
    }
    if (credits && isNaN(Number(credits))) {
      toast.error('Credits must be a valid number.'); return;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('risk_cases')
      .select('case_id')
      .eq('student_id', studentId.trim());
    if (existing && existing.length > 0) {
      toast.error('An intervention case already exists for this student.'); return;
    }

    const advisor = advisors.find((a) => a.advisor_id === advisorId);
    if (advisorId && advisor && advisor.case_count >= 10) {
      toast.error('Selected advisor has reached the maximum of 10 cases.'); return;
    }

    setSaving(true);
    try {
      // Create risk case
      const { data: newCase, error: caseError } = await supabase.from('risk_cases').insert({
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        department,
        risk_category: riskCategory,
        assigned_advisor: advisorId || null,
        assigned_advisor_name: advisor?.name || null,
        meeting_status: 'not_started',
        aip_status: 'not_started',
        midterm_review_status: 'not_started',
        outcome_status: 'not_started',
      }).select('case_id').single();

      if (caseError || !newCase) {
        toast.error('Failed to create case.'); setSaving(false); return;
      }

      // Create intervention form if any root cause or AIP data provided
      const hasFormData = rootAcademic.length > 0 || rootExternal.length > 0 || rootEngagement.length > 0 ||
        advisorNotes || courseStrategy.length > 0 || supportServices.length > 0 || monitoring.length > 0;

      if (hasFormData) {
        await supabase.from('intervention_forms').insert({
          case_id: newCase.case_id,
          root_cause_academic: rootAcademic,
          root_cause_external: rootExternal,
          root_cause_engagement: rootEngagement,
          advisor_notes: advisorNotes || null,
          course_strategy: courseStrategy,
          support_services: supportServices,
          monitoring_requirements: monitoring,
        });
      }

      // Audit log
      await supabase.from('audit_log').insert({
        action: 'case_created',
        target_record: newCase.case_id,
        details: { student_id: studentId, student_name: studentName, department, risk_category: riskCategory },
      });

      toast.success('Intervention case successfully created.');
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      toast.error('An error occurred while creating the case.');
    } finally {
      setSaving(false);
    }
  };

  const CheckboxGroup = ({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) => (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {items.map((item) => (
        <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={selected.includes(item)} onCheckedChange={() => onToggle(item)} />
          {item}
        </label>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-serif">New Intervention Case</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6">
          <div className="space-y-6 pb-6">
            {/* Student Information */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Student Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Student ID *</Label>
                  <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 202401234" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student Name *</Label>
                  <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department *</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Major</Label>
                  <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Marketing" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@lau.edu" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961..." />
                </div>
              </div>
            </div>

            <Separator />

            {/* Risk Category & Advisor */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Risk Category & Advisor</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Risk Category *</Label>
                  <Select value={riskCategory} onValueChange={setRiskCategory}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Category A">Category A (&lt;45 credits, CGPA ≤2.3)</SelectItem>
                      <SelectItem value="Category B">Category B (≥45 credits, CGPA ≤2.2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assign Advisor</Label>
                  <Select value={advisorId} onValueChange={setAdvisorId}>
                    <SelectTrigger><SelectValue placeholder="Select advisor..." /></SelectTrigger>
                    <SelectContent>
                      {advisors.map((a) => (
                        <SelectItem key={a.advisor_id} value={a.advisor_id} disabled={a.case_count >= 10}>
                          {a.name} ({a.department}) — {a.case_count}/10
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Academic Snapshot */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Academic Snapshot</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CGPA</Label>
                  <Input value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g. 2.1" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credits Completed</Label>
                  <Input value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 36" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Financial Aid</Label>
                  <Select value={financialAid} onValueChange={setFinancialAid}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="na">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Root Cause Assessment */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Root Cause Assessment</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Academic Factors</Label>
                  <CheckboxGroup items={academicFactors} selected={rootAcademic} onToggle={(v) => toggleList(rootAcademic, setRootAcademic, v)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">External Factors</Label>
                  <CheckboxGroup items={externalFactors} selected={rootExternal} onToggle={(v) => toggleList(rootExternal, setRootExternal, v)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Engagement Factors</Label>
                  <CheckboxGroup items={engagementFactors} selected={rootEngagement} onToggle={(v) => toggleList(rootEngagement, setRootEngagement, v)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Advisor Notes</Label>
                  <Textarea value={advisorNotes} onChange={(e) => setAdvisorNotes(e.target.value)} placeholder="Summary of key observations..." rows={3} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Academic Improvement Plan */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Academic Improvement Plan</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Course Strategy</Label>
                  <CheckboxGroup items={courseStrategies} selected={courseStrategy} onToggle={(v) => toggleList(courseStrategy, setCourseStrategy, v)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Support Activities</Label>
                  <CheckboxGroup items={supportActivities} selected={supportServices} onToggle={(v) => toggleList(supportServices, setSupportServices, v)} />
                </div>
                <div>
                  <Label className="text-xs font-medium">Monitoring Requirements</Label>
                  <CheckboxGroup items={monitoringReqs} selected={monitoring} onToggle={(v) => toggleList(monitoring, setMonitoring, v)} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Case'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCaseDialog;
