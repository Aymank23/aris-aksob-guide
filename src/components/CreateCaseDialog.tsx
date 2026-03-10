import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { departments, campuses } from '@/lib/constants';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const CreateCaseDialog = ({ open, onOpenChange, onCreated }: CreateCaseDialogProps) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  // Required fields
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [campus, setCampus] = useState('');
  const [major, setMajor] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [credits, setCredits] = useState('');
  const [riskCategory, setRiskCategory] = useState('');

  // Optional fields
  const [termSemester, setTermSemester] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [financialAid, setFinancialAid] = useState('');

  const resetForm = () => {
    setStudentName(''); setStudentId(''); setDepartment(''); setCampus('');
    setMajor(''); setCgpa(''); setCredits(''); setRiskCategory('');
    setTermSemester(''); setEmail(''); setPhone(''); setFinancialAid('');
  };

  const handleSave = async () => {
    if (!studentName.trim()) { toast.error('Student Name is required.'); return; }
    if (!studentId.trim()) { toast.error('Student ID is required.'); return; }
    if (!department) { toast.error('Department is required.'); return; }
    if (!campus) { toast.error('Campus is required.'); return; }
    if (!major.trim()) { toast.error('Major is required.'); return; }
    if (!cgpa.trim() || isNaN(Number(cgpa)) || Number(cgpa) < 0 || Number(cgpa) > 4) {
      toast.error('CGPA must be a number between 0 and 4.'); return;
    }
    if (!credits.trim() || isNaN(Number(credits))) {
      toast.error('Credits Completed must be a valid number.'); return;
    }
    if (!riskCategory) { toast.error('Risk Category is required.'); return; }

    const { data: existing } = await supabase
      .from('risk_cases')
      .select('case_id')
      .eq('student_id', studentId.trim());
    if (existing && existing.length > 0) {
      toast.error('An intervention case already exists for this student.'); return;
    }

    setSaving(true);
    try {
      const { data: newCase, error: caseError } = await supabase.from('risk_cases').insert({
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        department,
        campus,
        risk_category: riskCategory,
        major: major.trim(),
        cgpa: Number(cgpa),
        credits_completed: Number(credits),
        meeting_status: 'not_started',
        aip_status: 'not_started',
        midterm_review_status: 'not_started',
        outcome_status: 'not_started',
        term_semester: termSemester || null,
        student_email: email || null,
        student_phone: phone || null,
        financial_aid: financialAid || null,
      } as any).select('case_id').single();

      if (caseError || !newCase) {
        toast.error('Failed to create case.'); setSaving(false); return;
      }

      // Also upsert into students table
      await supabase.from('students').upsert({
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        department,
        campus,
        major: major.trim(),
        cgpa: Number(cgpa),
        credits_completed: Number(credits),
      } as any, { onConflict: 'student_id' });

      await supabase.from('audit_log').insert({
        action: 'case_created',
        user_id: user?.id || null,
        target_record: newCase.case_id,
        details: { student_id: studentId, student_name: studentName, department, risk_category: riskCategory },
      });

      toast.success('Intervention case created. Advisor and intervention details can be added later.');
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      toast.error('An error occurred while creating the case.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-lg font-serif">New Intervention Case</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Fill in required student information. Advisor assignment and intervention details can be completed later.
          </p>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-10rem)] px-6">
          <div className="space-y-6 pb-6">
            {/* Required Fields */}
            <div>
              <h3 className="text-sm font-semibold text-primary mb-3">Student Information *</h3>
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
                  <Label className="text-xs">Department *</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Campus *</Label>
                  <Select value={campus} onValueChange={setCampus}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {campuses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Major *</Label>
                  <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Marketing" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CGPA *</Label>
                  <Input value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g. 2.1" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Credits Completed *</Label>
                  <Input value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 36" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Risk Category *</Label>
                  <Select value={riskCategory} onValueChange={setRiskCategory}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Category A">Category A: &lt;45 cr, CGPA ≤ 2.3</SelectItem>
                      <SelectItem value="Category B">Category B: ≥45 cr, CGPA ≤ 2.2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Optional Fields */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Optional Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Term / Semester</Label>
                  <Input value={termSemester} onChange={(e) => setTermSemester(e.target.value)} placeholder="e.g. Spring 2026" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Financial Aid</Label>
                  <Select value={financialAid} onValueChange={setFinancialAid}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable">Not Applicable</SelectItem>
                      <SelectItem value="applicable">Applicable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@lau.edu" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+961..." />
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
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Create Case'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCaseDialog;
