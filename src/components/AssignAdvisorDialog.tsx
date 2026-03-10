import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { loadAdvisors, type Advisor } from '@/lib/advisors';
import { toast } from 'sonner';

interface AssignAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  currentAdvisorId: string | null;
  currentAdvisorName: string | null;
  onUpdated: () => void;
}

const AssignAdvisorDialog = ({ open, onOpenChange, caseId, currentAdvisorId, currentAdvisorName, onUpdated }: AssignAdvisorDialogProps) => {
  const { user } = useAuth();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadAdvisors().then((all) => {
        // For chairs, filter to their department only
        if (user?.role === 'department_chair' && user.department) {
          setAdvisors(all.filter(a => a.department === user.department));
        } else {
          setAdvisors(all);
        }
      });
      setSelectedAdvisor(currentAdvisorId || '');
    }
  }, [open, user]);

  const handleAssign = async () => {
    if (!selectedAdvisor) return;
    setSaving(true);
    const advisor = advisors.find(a => a.advisor_id === selectedAdvisor);
    if (advisor && advisor.case_count >= 10) {
      toast.error('This advisor has reached the maximum of 10 assigned students.');
      setSaving(false);
      return;
    }

    await supabase.from('risk_cases').update({
      assigned_advisor: selectedAdvisor,
      assigned_advisor_name: advisor?.name || null,
    }).eq('case_id', caseId);

    await supabase.from('audit_log').insert({
      action: currentAdvisorId ? 'advisor_reassigned' : 'advisor_assigned',
      user_id: user?.id || null,
      target_record: caseId,
      details: {
        previous_advisor: currentAdvisorName,
        new_advisor: advisor?.name,
        changed_by: user?.full_name,
      },
    });

    toast.success(currentAdvisorId ? 'Advisor reassigned.' : 'Advisor assigned.');
    setSaving(false);
    onOpenChange(false);
    onUpdated();
  };

  const handleRemove = async () => {
    setSaving(true);
    await supabase.from('risk_cases').update({
      assigned_advisor: null,
      assigned_advisor_name: null,
    }).eq('case_id', caseId);

    await supabase.from('audit_log').insert({
      action: 'advisor_removed',
      user_id: user?.id || null,
      target_record: caseId,
      details: {
        removed_advisor: currentAdvisorName,
        changed_by: user?.full_name,
      },
    });

    toast.success('Advisor removed.');
    setSaving(false);
    onOpenChange(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentAdvisorId ? 'Edit Advisor Assignment' : 'Assign Advisor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {currentAdvisorId && (
            <p className="text-sm text-muted-foreground">
              Currently assigned: <strong>{currentAdvisorName}</strong>
            </p>
          )}
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
          <div className="flex gap-2">
            <Button onClick={handleAssign} disabled={!selectedAdvisor || saving} className="flex-1">
              {saving ? 'Saving...' : currentAdvisorId ? 'Reassign' : 'Assign'}
            </Button>
            {currentAdvisorId && (
              <Button variant="destructive" onClick={handleRemove} disabled={saving}>
                Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignAdvisorDialog;
