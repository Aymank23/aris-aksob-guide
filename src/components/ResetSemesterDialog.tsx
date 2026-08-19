import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFilters } from '@/contexts/FilterContext';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

const CONFIRM_WORD = 'RESET';

const currentTerm = () => {
  const now = new Date();
  const m = now.getMonth();
  const y = now.getFullYear();
  return m <= 4 ? `Spring ${y}` : m <= 7 ? `Summer ${y}` : `Fall ${y}`;
};

const ResetSemesterDialog = ({ open, onOpenChange, onReset }: Props) => {
  const { user } = useAuth();
  const { refreshOptions } = useFilters();
  const [confirmText, setConfirmText] = useState('');
  const [label, setLabel] = useState(currentTerm());
  const [busy, setBusy] = useState(false);

  const close = (next: boolean) => {
    if (!next) { setConfirmText(''); setLabel(currentTerm()); }
    onOpenChange(next);
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      // 1. Snapshot everything before deletion
      const [{ data: cases }, { data: students }, { data: followUps }, { data: forms }, { data: outcomes }] =
        await Promise.all([
          supabase.from('risk_cases').select('*'),
          supabase.from('students').select('*'),
          supabase.from('follow_ups').select('*'),
          supabase.from('intervention_forms').select('*'),
          supabase.from('outcomes').select('*'),
        ]);

      const { error: archiveError } = await supabase.from('semester_archives').insert({
        label: label.trim() || currentTerm(),
        archived_by: user?.id ?? null,
        archived_by_name: user?.full_name ?? null,
        case_count: cases?.length || 0,
        student_count: students?.length || 0,
        snapshot: { cases, students, follow_ups: followUps, intervention_forms: forms, outcomes },
      } as any);

      if (archiveError) {
        toast.error('Could not archive current data. Reset cancelled.');
        setBusy(false);
        return;
      }

      // 2. Delete in dependency order
      const steps = [
        supabase.from('outcomes').delete().not('id', 'is', null),
        supabase.from('follow_ups').delete().not('followup_id', 'is', null),
        supabase.from('intervention_forms').delete().not('id', 'is', null),
      ];
      for (const step of steps) await step;
      await supabase.from('risk_cases').delete().not('case_id', 'is', null);
      await supabase.from('students').delete().not('id', 'is', null);

      await supabase.from('audit_log').insert({
        user_id: user?.id ?? null,
        action: 'semester_reset',
        target_record: label.trim() || currentTerm(),
        details: { cases: cases?.length || 0, students: students?.length || 0 },
      } as any);

      toast.success(`Semester data cleared and archived as "${label.trim() || currentTerm()}".`);
      await refreshOptions();
      onReset();
      close(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" /> Reset Semester Data
          </DialogTitle>
          <DialogDescription>
            Archives and then removes all students, intervention cases, follow-ups, intervention forms
            and outcomes so a new semester can be imported. User accounts and settings are kept.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This action cannot be undone from the app. A full snapshot is stored in the archive first.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="archive-label">Archive label</Label>
            <Input id="archive-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Fall 2025" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reset">Type <strong>{CONFIRM_WORD}</strong> to confirm</Label>
            <Input
              id="confirm-reset"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={confirmText !== CONFIRM_WORD || busy}
          >
            {busy ? 'Resetting…' : 'Archive & Reset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResetSemesterDialog;
