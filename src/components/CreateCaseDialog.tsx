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
import { loadAdvisors, type Advisor } from '@/lib/advisors';
import {
  departments, academicFactors, externalFactors, engagementFactors,
  courseStrategies, supportActivities, monitoringReqs,
} from '@/lib/constants';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateCaseDialog = ({ open, onOpenChange, onCreated }: CreateCaseDialogProps) => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [saving, setSaving] = useState(false);

  // Section A
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [termSemester, setTermSemester] = useState('');
  const [dateOfMeeting, setDateOfMeeting] = useState('');
  const [department, setDepartment] = useState('');
  const [major, setMajor] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [advisorId, setAdvisorId] = useState('');

  // Section B
  const [cgpa, setCgpa] = useState('');
  const [credits, setCredits] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [financialAid, setFinancialAid] = useState('');

  // Section C
  const [rootAcademic, setRootAcademic] = useState<string[]>([]);
  const [rootExternal, setRootExternal] = useState<string[]>([]);
  const [rootEngagement, setRootEngagement] = useState<string[]>([]);
  const [otherAcademic, setOtherAcademic] = useState('');
  const [otherExternal, setOtherExternal] = useState('');
  const [otherEngagement, setOtherEngagement] = useState('');
  const [advisorNotes, setAdvisorNotes] = useState('');

  // Section D
  const [courseStrategy, setCourseStrategy] = useState<string[]>([]);
  const [otherCourseStrategy, setOtherCourseStrategy] = useState('');
  const [supportServices, setSupportServices] = useState<string[]>([]);
  const [otherSupport, setOtherSupport] = useState('');
  const [monitoring, setMonitoring] = useState<string[]>([]);

  useEffect(() => {
    if (open) loadAdvisors().then(setAdvisors);
  }, [open]);

  const toggleList = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const resetForm = () => {
    setStudentId(''); setStudentName(''); setTermSemester(''); setDateOfMeeting('');
    setDepartment(''); setMajor(''); setEmail(''); setPhone('');
    setRiskCategory(''); setAdvisorId('');
    setCgpa(''); setCredits(''); setFinancialAid('');
    setRootAcademic([]); setRootExternal([]); setRootEngagement([]);
    setOtherAcademic(''); setOtherExternal(''); setOtherEngagement('');
    setAdvisorNotes('');
    setCourseStrategy([]); setOtherCourseStrategy('');
    setSupportServices([]); setOtherSupport('');
    setMonitoring([]);
  };

  const handleSave = async () => {
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
        term_semester: termSemester || null,
        date_of_meeting: dateOfMeeting || null,
        advisor_email: null,
        major: major || null,
        student_email: email || null,
        student_phone: phone || null,
        cgpa: cgpa ? Number(cgpa) : null,
        credits_completed: credits ? Number(credits) : null,
        financial_aid: financialAid || null,
      } as any).select('case_id').single();

      if (caseError || !newCase) {
        toast.error('Failed to create case.'); setSaving(false); return;
      }

      const finalAcademic = [...rootAcademic, ...(otherAcademic ? [`Other: ${otherAcademic}`] : [])];
      const finalExternal = [...rootExternal, ...(otherExternal ? [`Other: ${otherExternal}`] : [])];
      const finalEngagement = [...rootEngagement, ...(otherEngagement ? [`Other: ${otherEngagement}`] : [])];
      const finalCourseStrategy = [...courseStrategy, ...(otherCourseStrategy ? [`Other: ${otherCourseStrategy}`] : [])];
      const finalSupport = [...supportServices, ...(otherSupport ? [`Other: ${otherSupport}`] : [])];

      const hasFormData = finalAcademic.length > 0 || finalExternal.length > 0 || finalEngagement.length > 0 ||
        advisorNotes || finalCourseStrategy.length > 0 || finalSupport.length > 0 || monitoring.length > 0;

      if (hasFormData) {
        await supabase.from('intervention_forms').insert({
          case_id: newCase.case_id,
          root_cause_academic: finalAcademic,
          root_cause_external: finalExternal,
          root_cause_engagement: finalEngagement,
          advisor_notes: advisorNotes || null,
          course_strategy: finalCourseStrategy,
          support_services: finalSupport,
          monitoring_requirements: monitoring,
        });
      }

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
            {/* Section A */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Section A — Student Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Student Name *</Label>
                  <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student ID *</Label>
                  <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 202401234" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Term / Semester</Label>
                  <Input value={termSemester} onChange={(e) => setTermSemester(e.target.value)} placeholder="e.g. Spring 2026" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of Meeting</Label>
                  <Input type="date" value={dateOfMeeting} onChange={(e) => setDateOfMeeting(e.target.value)} />
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
                  <Label className="text-xs">Major / Program</Label>
                  <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Marketing" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@lau.edu" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961..." />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Assigned Special Advisor</Label>
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

            {/* Section B */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Section B — Academic Snapshot (from Cognos)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">CGPA</Label>
                  <Input value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g. 2.1" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credits Completed</Label>
                  <Input value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 36" />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Label className="text-xs font-medium">Risk Category * (check one)</Label>
                <Select value={riskCategory} onValueChange={setRiskCategory}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Category A">Category A: &lt;45 credits and CGPA ≤ 2.3</SelectItem>
                    <SelectItem value="Category B">Category B: ≥45 credits and CGPA ≤ 2.2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 space-y-1">
                <Label className="text-xs">Financial Aid</Label>
                <Select value={financialAid} onValueChange={setFinancialAid}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_applicable">Not Applicable</SelectItem>
                    <SelectItem value="applicable">Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Section C */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Section C — Root Cause Assessment</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">1) Academic Factors (check all that apply)</Label>
                  <CheckboxGroup items={academicFactors} selected={rootAcademic} onToggle={(v) => toggleList(rootAcademic, setRootAcademic, v)} />
                  <div className="mt-2">
                    <Input value={otherAcademic} onChange={(e) => setOtherAcademic(e.target.value)} placeholder="Other (specify)..." className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">2) External / Personal Factors</Label>
                  <CheckboxGroup items={externalFactors} selected={rootExternal} onToggle={(v) => toggleList(rootExternal, setRootExternal, v)} />
                  <div className="mt-2">
                    <Input value={otherExternal} onChange={(e) => setOtherExternal(e.target.value)} placeholder="Other (specify)..." className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">3) Engagement Factors</Label>
                  <CheckboxGroup items={engagementFactors} selected={rootEngagement} onToggle={(v) => toggleList(rootEngagement, setRootEngagement, v)} />
                  <div className="mt-2">
                    <Input value={otherEngagement} onChange={(e) => setOtherEngagement(e.target.value)} placeholder="Other (specify)..." className="text-sm" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Advisor Notes / Summary of Key Causes</Label>
                  <Textarea value={advisorNotes} onChange={(e) => setAdvisorNotes(e.target.value)} placeholder="Summary of key observations..." rows={3} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section D */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Section D — Academic Improvement Plan</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">D1) Course Strategy</Label>
                  <CheckboxGroup items={courseStrategies} selected={courseStrategy} onToggle={(v) => toggleList(courseStrategy, setCourseStrategy, v)} />
                  <div className="mt-2">
                    <Input value={otherCourseStrategy} onChange={(e) => setOtherCourseStrategy(e.target.value)} placeholder="Other (specify)..." className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">D2) Support Activities</Label>
                  <CheckboxGroup items={supportActivities} selected={supportServices} onToggle={(v) => toggleList(supportServices, setSupportServices, v)} />
                  <div className="mt-2">
                    <Input value={otherSupport} onChange={(e) => setOtherSupport(e.target.value)} placeholder="Other (specify)..." className="text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">D3) Monitoring Requirements</Label>
                  <CheckboxGroup items={monitoringReqs} selected={monitoring} onToggle={(v) => toggleList(monitoring, setMonitoring, v)} />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

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
