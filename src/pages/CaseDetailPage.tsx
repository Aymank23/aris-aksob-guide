import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

const CaseDetailPage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<any>(null);
  const [interventionForm, setInterventionForm] = useState<any>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [outcome, setOutcome] = useState<any>(null);
  const [newFollowUp, setNewFollowUp] = useState({ date: '', progress_notes: '' });

  // Intervention form state
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
    setOutcome(out);
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
    const payload = { case_id: caseId, final_outcome: finalOutcome };
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

  const academicFactors = ['Study skills', 'Time management', 'Quantitative difficulty', 'Writing difficulty', 'Missing prerequisites', 'Test anxiety'];
  const externalFactors = ['Work obligations', 'Family responsibilities', 'Financial stress', 'Health concerns', 'Mental health concerns'];
  const engagementFactors = ['Poor attendance', 'Low participation', 'Missed deadlines', 'Lack of motivation', 'Major mismatch'];
  const courseStrategies = ['Maintain current schedule', 'Reduce course load', 'Withdraw from courses', 'Retake courses', 'Course sequencing adjustments'];
  const supportActivities = ['Tutoring', 'Writing Center', 'Counseling referral', 'Learning support'];
  const monitoringReqs = ['Bi-weekly advisor check-in', 'Midterm grade review'];

  const canEditForm = user?.role === 'advisor' && caseData.assigned_advisor === user.id;
  const canRecordOutcome = user?.role === 'admin';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cases')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-serif font-semibold">Student Intervention Form</h1>
            <p className="text-sm text-muted-foreground">AKSOB — Confidential Academic Record</p>
          </div>
        </div>

        {/* SECTION A: Student Information */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section A — Student Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><Label className="text-muted-foreground">Student Name</Label><p className="font-medium">{caseData.student_name}</p></div>
              <div><Label className="text-muted-foreground">Student ID</Label><p className="font-mono">{caseData.student_id}</p></div>
              <div><Label className="text-muted-foreground">Department</Label><p>{caseData.department}</p></div>
              <div><Label className="text-muted-foreground">Risk Category</Label>
                <Badge variant={caseData.risk_category === 'Category A' ? 'destructive' : 'secondary'}>{caseData.risk_category}</Badge>
              </div>
              <div><Label className="text-muted-foreground">Assigned Advisor</Label><p>{caseData.assigned_advisor_name || '—'}</p></div>
              <div><Label className="text-muted-foreground">Case Created</Label><p>{new Date(caseData.created_date).toLocaleDateString()}</p></div>
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

        {/* SECTION C: Root Cause Assessment */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section C — Root Cause Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Academic Factors</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {academicFactors.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.root_cause_academic.includes(f)}
                      onCheckedChange={() => toggleCheckbox('root_cause_academic', f)}
                      disabled={!canEditForm}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">External Factors</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {externalFactors.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.root_cause_external.includes(f)}
                      onCheckedChange={() => toggleCheckbox('root_cause_external', f)}
                      disabled={!canEditForm}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Engagement Factors</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {engagementFactors.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.root_cause_engagement.includes(f)}
                      onCheckedChange={() => toggleCheckbox('root_cause_engagement', f)}
                      disabled={!canEditForm}
                    />
                    {f}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Advisor Notes</Label>
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

        {/* SECTION D: Academic Improvement Plan */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section D — Academic Improvement Plan</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Course Strategy</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {courseStrategies.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.course_strategy.includes(s)}
                      onCheckedChange={() => toggleCheckbox('course_strategy', s)}
                      disabled={!canEditForm}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Support Activities</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {supportActivities.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.support_services.includes(s)}
                      onCheckedChange={() => toggleCheckbox('support_services', s)}
                      disabled={!canEditForm}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Monitoring Requirements</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {monitoringReqs.map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={formData.monitoring_requirements.includes(m)}
                      onCheckedChange={() => toggleCheckbox('monitoring_requirements', m)}
                      disabled={!canEditForm}
                    />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            {canEditForm && (
              <Button onClick={saveInterventionForm}><Save className="h-4 w-4 mr-2" />Save Intervention Plan</Button>
            )}
          </CardContent>
        </Card>

        {/* SECTION E: Follow-Up Tracking */}
        <Card>
          <CardHeader><CardTitle className="text-base font-sans">Section E — Follow-Up Tracking</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {followUps.map((f) => (
              <div key={f.followup_id} className="p-3 rounded-md bg-muted text-sm">
                <p className="font-medium text-xs text-muted-foreground">{new Date(f.date).toLocaleDateString()}</p>
                <p className="mt-1">{f.progress_notes}</p>
              </div>
            ))}
            {canEditForm && (
              <div className="flex gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input type="date" value={newFollowUp.date} onChange={(e) => setNewFollowUp({ ...newFollowUp, date: e.target.value })} />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Input value={newFollowUp.progress_notes} onChange={(e) => setNewFollowUp({ ...newFollowUp, progress_notes: e.target.value })} placeholder="Progress notes..." />
                </div>
                <Button size="sm" onClick={addFollowUp}><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION F: Final Outcome */}
        {canRecordOutcome && (
          <Card>
            <CardHeader><CardTitle className="text-base font-sans">Section F — Final Outcome</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { value: 'improved_above_threshold', label: 'Student improved above threshold' },
                  { value: 'improved_still_at_risk', label: 'Student improved but still at risk' },
                  { value: 'declined_escalated', label: 'Student declined / probation escalated' },
                  { value: 'withdrew', label: 'Student withdrew from term' },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={outcome?.final_outcome === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className="mr-2 mb-2"
                    onClick={() => saveOutcome(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default CaseDetailPage;
