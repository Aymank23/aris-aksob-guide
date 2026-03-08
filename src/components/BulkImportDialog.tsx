import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

interface ImportRow {
  student_id: string;
  student_name: string;
  department: string;
  risk_category: string;
  major?: string;
  student_email?: string;
  student_phone?: string;
  cgpa?: string;
  credits_completed?: string;
  term_semester?: string;
  financial_aid?: string;
  error?: string;
}

const REQUIRED_COLUMNS = ['student_id', 'student_name', 'department', 'risk_category'];
const VALID_CATEGORIES = ['Category A', 'Category B'];

const BulkImportDialog = ({ open, onOpenChange, onImported }: BulkImportDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [results, setResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const reset = () => {
    setRows([]);
    setStep('upload');
    setResults({ success: 0, failed: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const normalizeHeader = (header: string): string => {
    return header.trim().toLowerCase().replace(/[\s\-]+/g, '_');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

        if (json.length === 0) {
          toast({ title: 'Empty file', description: 'The uploaded file contains no data rows.', variant: 'destructive' });
          return;
        }

        // Normalize headers
        const rawHeaders = Object.keys(json[0]);
        const headerMap: Record<string, string> = {};
        rawHeaders.forEach((h) => {
          headerMap[normalizeHeader(h)] = h;
        });

        const missing = REQUIRED_COLUMNS.filter((c) => !headerMap[c]);
        if (missing.length > 0) {
          toast({
            title: 'Missing columns',
            description: `Required columns not found: ${missing.join(', ')}. Please use the template.`,
            variant: 'destructive',
          });
          return;
        }

        const parsed: ImportRow[] = json.map((row) => {
          const sid = String(row[headerMap['student_id']] || '').trim();
          const sname = String(row[headerMap['student_name']] || '').trim();
          const dept = String(row[headerMap['department']] || '').trim();
          const cat = String(row[headerMap['risk_category']] || '').trim();
          const mjr = String(row[headerMap['major']] || '').trim();
          const semail = String(row[headerMap['student_email']] || '').trim();
          const sphone = String(row[headerMap['student_phone']] || '').trim();
          const scgpa = String(row[headerMap['cgpa']] || '').trim();
          const scredits = String(row[headerMap['credits_completed']] || '').trim();
          const sterm = String(row[headerMap['term_semester']] || '').trim();
          const sfaid = String(row[headerMap['financial_aid']] || '').trim();

          let error: string | undefined;
          if (!sid) error = 'Missing Student ID';
          else if (!sname) error = 'Missing Student Name';
          else if (!dept) error = 'Missing Department';
          else if (!VALID_CATEGORIES.includes(cat)) error = `Invalid risk category: "${cat}"`;

          return { student_id: sid, student_name: sname, department: dept, risk_category: cat, major: mjr, student_email: semail, student_phone: sphone, cgpa: scgpa, credits_completed: scredits, term_semester: sterm, financial_aid: sfaid, error };
        });

        setRows(parsed);
        setStep('preview');
      } catch {
        toast({ title: 'Parse error', description: 'Could not read the file. Please use CSV or Excel format.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => !!r.error);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    // Check for existing students to prevent duplicates
    const studentIds = validRows.map((r) => r.student_id);
    const { data: existing } = await supabase
      .from('risk_cases')
      .select('student_id')
      .in('student_id', studentIds);

    const existingSet = new Set(existing?.map((e) => e.student_id) || []);

    let success = 0;
    let failed = 0;

    for (const row of validRows) {
      if (existingSet.has(row.student_id)) {
        failed++;
        continue;
      }

      const { error } = await supabase.from('risk_cases').insert({
        student_id: row.student_id,
        student_name: row.student_name,
        department: row.department,
        risk_category: row.risk_category,
      });

      if (error) failed++;
      else success++;
    }

    setResults({ success, failed: failed + errorRows.length });
    setStep('done');
    setImporting(false);

    if (success > 0) {
      onImported();
      toast({ title: 'Import complete', description: `${success} case(s) created successfully.` });
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['student_id', 'student_name', 'department', 'risk_category', 'major', 'student_email', 'student_phone', 'cgpa', 'credits_completed', 'term_semester', 'financial_aid'],
      ['202401234', 'Jane Doe', 'Marketing', 'Category A', 'Marketing', 'jane.doe@lau.edu', '+961...', '2.1', '30', 'Spring 2026', 'Not Applicable'],
      ['202405678', 'John Smith', 'Finance', 'Category B', 'Finance', 'john.smith@lau.edu', '+961...', '1.9', '50', 'Spring 2026', 'Applicable'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'arip_import_template.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Flagged Students
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <Alert>
              <AlertDescription>
                Upload a CSV or Excel file with columns: <strong>student_id</strong>, <strong>student_name</strong>, <strong>department</strong>, <strong>risk_category</strong> (Category A or Category B).
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4 py-8 border-2 border-dashed border-border rounded-lg">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a CSV or Excel file to import</p>
              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()}>
                  Choose File
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default">{validRows.length} valid</Badge>
              {errorRows.length > 0 && <Badge variant="destructive">{errorRows.length} errors</Badge>}
            </div>

            <div className="border rounded-md max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Risk Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row.error ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">{row.student_id || '—'}</TableCell>
                      <TableCell>{row.student_name || '—'}</TableCell>
                      <TableCell>{row.department || '—'}</TableCell>
                      <TableCell>{row.risk_category || '—'}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> {row.error}
                          </span>
                        ) : (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Ready
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={validRows.length === 0 || importing}>
                {importing ? 'Importing...' : `Import ${validRows.length} Case(s)`}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <div>
              <p className="text-lg font-medium">{results.success} case(s) created</p>
              {results.failed > 0 && (
                <p className="text-sm text-muted-foreground">{results.failed} skipped (errors or duplicates)</p>
              )}
            </div>
            <Button onClick={() => handleClose(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
