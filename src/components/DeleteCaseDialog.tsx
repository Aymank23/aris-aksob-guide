import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  studentName: string;
  onDeleted: () => void;
}

const DeleteCaseDialog = ({ open, onOpenChange, caseId, studentName, onDeleted }: DeleteCaseDialogProps) => {
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related records first
      await supabase.from('follow_ups').delete().eq('case_id', caseId);
      await supabase.from('intervention_forms').delete().eq('case_id', caseId);
      await supabase.from('outcomes').delete().eq('case_id', caseId);
      const { error } = await supabase.from('risk_cases').delete().eq('case_id', caseId);

      if (error) {
        toast.error('Failed to delete case.');
        return;
      }

      await supabase.from('audit_log').insert({
        action: 'case_deleted',
        user_id: user?.id || null,
        target_record: caseId,
        details: { student_name: studentName, deleted_by: user?.full_name },
      });

      toast.success('Case deleted successfully.');
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error('An error occurred while deleting the case.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Case
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete the intervention case for{' '}
            <strong>{studentName}</strong>? This will remove all associated records including
            intervention forms, follow-ups, and outcomes. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Case'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteCaseDialog;
