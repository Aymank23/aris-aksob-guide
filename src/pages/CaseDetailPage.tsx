import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  academicFactors, externalFactors, engagementFactors,
  courseStrategies, supportActivities, monitoringReqs,
} from '@/lib/constants';
import { ArrowLeft, Save, Plus, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { generateARIPPdf } from '@/lib/generateARIPPdf';

const CaseDetailPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);
  const [interventionForm, setInterventionForm] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [newFollowUp, setNewFollowUp] = useState({ date: '', progress_notes: '' });
  const [otherOutcome, setOtherOutcome] = useState('');

  const [formData, setFormData] = useState({
    root_cause_academic: [] as string[],
    root_cause_external: [] as string[],
    root_cause_engagement: [] as string[],
    advisor_notes: '',
    course_strategy: [] as string[],
    support_services: [] as string[],
    monitoring_requirements: [] as string[],
  });

  useEffect(() => {
    if (caseId) loadCaseData();
  }, [caseId]);

  const loadCaseData = async () => {
    const { data: c } = await supabase.from('risk_cases').select('*').eq('case_id', caseId).single();
    setCaseData(c);

    const { data: form } = await supabase.from('intervention_forms').select('*').eq('case_id', caseId).single();
    if (form) {
      setInterventionForm(form);
      setFormData({
        root_cause_academic: form.root_cause_academic || [],
        root_cause_external: form.root_cause_external || [],
        root_cause_engagement: form.root_cause_engagement || [],
        advisor_notes: form.advisor_notes || '',
        course_strategy: form.course_strategy || [],
        support_services: form.support_services || [],
        monitoring_requirements: form.monitoring_requirements || [],
      });
    }

    const { data: fups } = await supabase.from('follow_ups').select('*').eq('case_id', caseId).order('date', { ascending: false });
    setFollowUps(fups || []);

    const { data: out } = await supabase.from('outcomes').select('*').eq('case_id', caseId).single();
    if (out) {
      setOutcome(out);
      setOtherOutcome((out as any).other_outcome || '');
    }
  };

  const toggleCheckbox = (field: keyof typeof formData, value: string) => {
    const current = formData[field] as string[];
    setFormData({
      ...formData,
      [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  };

  const saveInterventionForm = async () => {
    if (!caseData?.assigned_advisor) {
      toast.error('Advisor must be assigned before creating an intervention plan.');
      return;
    }
    if (caseData?.meeting_status !== 'completed') {
      toast.error('Meeting must be completed before creating an intervention plan.');
      return;
    }

    const payload = { case_id: caseId, ...formData };

    if (interventionForm) {
      await supabase.from('intervention_forms').update(payload).eq('case_id', caseId);
    } else {
      await supabase.from('intervention_forms').insert(payload);
    }

    await supabase.from('risk_cases').update({ aip_status: 'completed' }).eq('case_id', caseId);
    toast.success('Intervention form saved.');
    loadCaseData();
  };

  const updateMeetingStatus = async () => {
    if (!caseData?.assigned_advisor) {
      toast.error('Advisor must be assigned first.');
      return;
    }
    await supabase.from('risk_cases').update({ meeting_status: 'completed' }).eq('case_id', caseId);
    toast.success('Meeting marked as completed.');
    loadCaseData();
  };

  const addFollowUp = async () => {
    if (!newFollowUp.date || !newFollowUp.progress_notes) return;
    await supabase.from('follow_ups').insert({ case_id: caseId, ...newFollowUp });
    setNewFollowUp({ date: '', progress_notes: '' });
    toast.success('Follow-up added.');
    loadCaseData();
  };

  const saveOutcome = async (finalOutcome: string) => {
    if (!interventionForm) {
      toast.error('Intervention form must be completed before recording outcome.');
      return;
    }
    const payload: any = { case_id: caseId, final_outcome: finalOutcome };
    if (finalOutcome === 'other') {
      payload.other_outcome = otherOutcome;
    }
    if (outcome) {
      await supabase.from('outcomes').update(payload).eq('case_id', caseId);
    } else {
      await supabase.from('outcomes').insert(payload);
    }
    await supabase.from('risk_cases').update({ outcome_status: 'completed' }).eq('case_id', caseId);
    toast.success('Outcome recorded.');
    loadCaseData();
  };

  if (!caseData) return <AppLayout><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></AppLayout>;

  const canEditForm = (user?.role === 'advisor' && caseData.assigned_advisor === user.id) || user?.role === 'admin' || user?.role === 'department_chair';
  const canRecordOutcome = user?.role === 'admin';

  const updateMidtermReview = async () => {
    await supabase.from('risk_cases').update({ midterm_review_status: 'completed' }).eq('case_id', caseId);
    toast.success('Midterm review marked as completed.');
    loadCaseData();
  };

  const CheckboxList = ({ items, field }: { items: string[]; field: keyof typeof formData }) => (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {items.map((f) => (
        <label key={f} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={(formData[field] as string[]).includes(f)}
            onCheckedChange={() => toggleCheckbox(field, f)}
            disabled={!canEditForm}
          />
          {f}
        </label>
      ))}
    </div>
  );

  const OtherItems = ({ field }: { field: keyof typeof formData }) => (
    <>
      {(formData[field] as string[]).filter(v => v.startsWith('Other:')).map(v => (
        <p key={v} className="text-sm text-muted-foreground mt-1 italic">{v}</p>
      ))}
    </>
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-serif font-semibold">Student Academic Risk Intervention Form</h1>
              <p className="text-sm text-muted-foreground">AKSOB — Confidential Academic Record</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateARIPPdf(caseData, interventionForm ? formData : null, followUps, outcome)}
          >
            <FileDown className="h-4 w-4 mr-1" /> Export PDF
          </Button>
        </div>

        {/* SECTION A */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section A — Student Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label className="text-muted-foreground">Student Name</Label><p className="font-medium">{caseData.student_name}</p></div>
              <div><Label className="text-muted-foreground">Student ID</Label><p className="font-mono">{caseData.student_id}</p></div>
              <div><Label className="text-muted-foreground">Term / Semester</Label><p>{caseData.term_semester || '—'}</p></div>
              <div><Label className="text-muted-foreground">Date of Meeting</Label><p>{caseData.date_of_meeting ? new Date(caseData.date_of_meeting).toLocaleDateString() : '—'}</p></div>
              <div><Label className="text-muted-foreground">Department</Label><p>{caseData.department}</p></div>
              <div><Label className="text-muted-foreground">Major / Program</Label><p>{caseData.major || '—'}</p></div>
              <div><Label className="text-muted-foreground">Student Email</Label><p>{caseData.student_email || '—'}</p></div>
              <div><Label className="text-muted-foreground">Phone Number</Label><p>{caseData.student_phone || '—'}</p></div>
              <div><Label className="text-muted-foreground">Assigned Special Advisor</Label><p>{caseData.assigned_advisor_name || '—'}</p></div>
              <div><Label className="text-muted-foreground">Advisor Email</Label><p>{caseData.advisor_email || '—'}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION B */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section B — Academic Snapshot (from Cognos)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label className="text-muted-foreground">CGPA</Label><p>{caseData.cgpa ?? '—'}</p></div>
              <div><Label className="text-muted-foreground">Credits Completed</Label><p>{caseData.credits_completed ?? '—'}</p></div>
              <div><Label className="text-muted-foreground">Risk Category</Label>
                <Badge variant={caseData.risk_category === 'Category A' ? 'destructive' : 'secondary'}>{caseData.risk_category}</Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  {caseData.risk_category === 'Category A' ? '(<45 credits and CGPA ≤ 2.3)' : '(≥45 credits and CGPA ≤ 2.2)'}
                </span>
              </div>
              <div><Label className="text-muted-foreground">Financial Aid</Label>
                <p>{caseData.financial_aid === 'applicable' ? 'Applicable' : caseData.financial_aid === 'not_applicable' ? 'Not Applicable' : '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Status */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Advisor Meeting</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={caseData.meeting_status === 'completed' ? 'default' : 'secondary'}>
                {caseData.meeting_status === 'completed' ? 'Completed' : 'Pending'}
              </Badge>
              {canEditForm && caseData.meeting_status !== 'completed' && (
                <Button size="sm" onClick={updateMeetingStatus}>Mark Meeting as Completed</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION C */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section C — Root Cause Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">1) Academic Factors (check all that apply)</Label>
              <CheckboxList items={academicFactors} field="root_cause_academic" />
              <OtherItems field="root_cause_academic" />
            </div>
            <div>
              <Label className="text-sm font-medium">2) External / Personal Factors</Label>
              <CheckboxList items={externalFactors} field="root_cause_external" />
              <OtherItems field="root_cause_external" />
            </div>
            <div>
              <Label className="text-sm font-medium">3) Engagement Factors</Label>
              <CheckboxList items={engagementFactors} field="root_cause_engagement" />
              <OtherItems field="root_cause_engagement" />
            </div>
            <div>
              <Label className="text-sm font-medium">Advisor Notes / Summary of Key Causes</Label>
              <Textarea
                value={formData.advisor_notes}
                onChange={(e) => setFormData({ ...formData, advisor_notes: e.target.value })}
                placeholder="Summary of key causes..."
                className="mt-1"
                disabled={!canEditForm}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION D */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section D — Academic Improvement Plan</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">D1) Course Strategy</Label>
              <CheckboxList items={courseStrategies} field="course_strategy" />
              <OtherItems field="course_strategy" />
            </div>
            <div>
              <Label className="text-sm font-medium">D2) Support Activities</Label>
              <CheckboxList items={supportActivities} field="support_services" />
              <OtherItems field="support_services" />
            </div>
            <div>
              <Label className="text-sm font-medium">D3) Monitoring Requirements</Label>
              <CheckboxList items={monitoringReqs} field="monitoring_requirements" />
            </div>
            {canEditForm && (
              <Button onClick={saveInterventionForm}><Save className="h-4 w-4 mr-2" />Save Intervention Plan</Button>
            )}
          </CardContent>
        </Card>

        {/* Midterm Review */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Midterm Review</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={caseData.midterm_review_status === 'completed' ? 'default' : 'secondary'}>
                {caseData.midterm_review_status === 'completed' ? 'Completed' : 'Pending'}
              </Badge>
              {canEditForm && caseData.midterm_review_status !== 'completed' && caseData.aip_status === 'completed' && (
                <Button size="sm" onClick={updateMidtermReview}>Mark Midterm Review as Completed</Button>
              )}
              {caseData.aip_status !== 'completed' && caseData.midterm_review_status !== 'completed' && (
                <span className="text-xs text-muted-foreground">AIP must be completed first</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION E */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section E — Follow-Up Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {followUps.length === 0 && (
              <p className="text-sm text-muted-foreground">No follow-up entries yet.</p>
            )}
            {followUps.map((f) => (
              <div key={f.followup_id} className="p-3 rounded-md bg-muted text-sm border-l-2 border-primary">
                <p className="font-medium text-xs text-muted-foreground">{new Date(f.date).toLocaleDateString()}</p>
                <p className="mt-1">{f.progress_notes}</p>
              </div>
            ))}
            {canEditForm && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Add Follow-Up Entry</p>
                <div className="flex gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={newFollowUp.date} onChange={(e) => setNewFollowUp({ ...newFollowUp, date: e.target.value })} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Progress Notes</Label>
                    <Input value={newFollowUp.progress_notes} onChange={(e) => setNewFollowUp({ ...newFollowUp, progress_notes: e.target.value })} placeholder="Progress notes..." />
                  </div>
                  <Button size="sm" onClick={addFollowUp}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION F */}
        {canRecordOutcome && (
          <Card>
            <CardHeader><CardTitle className="text-base font-sans">Section F — Final Outcome (To be Filled by Assistant Deans)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'improved_above_threshold', label: 'Student improved above threshold' },
                    { value: 'improved_still_at_risk', label: 'Student improved but still at risk' },
                    { value: 'declined_escalated', label: 'Student declined / probation case escalated' },
                    { value: 'withdrew', label: 'Student withdrew from term' },
                    { value: 'other', label: 'Other' },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      variant={outcome?.final_outcome === opt.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => opt.value !== 'other' ? saveOutcome(opt.value) : undefined}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
                {(outcome?.final_outcome === 'other' || !outcome) && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Other outcome (specify)</Label>
                      <Input value={otherOutcome} onChange={(e) => setOtherOutcome(e.target.value)} placeholder="Describe outcome..." />
                    </div>
                    <Button size="sm" onClick={() => saveOutcome('other')} disabled={!otherOutcome.trim()}>Save Other</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default CaseDetailPage;
