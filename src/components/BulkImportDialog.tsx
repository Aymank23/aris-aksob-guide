import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
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
  campus: string;
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

const REQUIRED_COLUMNS = ['student_id', 'student_name', 'department', 'campus'];
const VALID_CATEGORIES = ['Category A', 'Category B', ''];

const BulkImportDialog = ({ open, onOpenChange, onImported }: BulkImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [results, setResults] = useState<{ casesCreated: number; studentsStored: number; failed: number }>({
    casesCreated: 0, studentsStored: 0, failed: 0,
  });

  const reset = () => {
    setRows([]);
    setStep('upload');
    setResults({ casesCreated: 0, studentsStored: 0, failed: 0 });
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
          toast.error('The uploaded file contains no data rows.');
          return;
        }

        const rawHeaders = Object.keys(json[0]);
        const headerMap: Record<string, string> = {};
        rawHeaders.forEach((h) => { headerMap[normalizeHeader(h)] = h; });

        // Also accept 'category' as alias for 'risk_category'
        if (!headerMap['risk_category'] && headerMap['category']) {
          headerMap['risk_category'] = headerMap['category'];
        }

        const missing = REQUIRED_COLUMNS.filter((c) => !headerMap[c]);
        if (missing.length > 0) {
          toast.error(`Required columns not found: ${missing.join(', ')}. Please use the template.`);
          return;
        }

        const parsed: ImportRow[] = json.map((row) => {
          const sid = String(row[headerMap['student_id']] || '').trim();
          const sname = String(row[headerMap['student_name']] || '').trim();
          const dept = String(row[headerMap['department']] || '').trim();
          const camp = String(row[headerMap['campus']] || '').trim();
          const cat = String(row[headerMap['risk_category']] || '').trim();
          const mjr = String(row[headerMap['major']] || '').trim();
          const semail = String(row[headerMap['student_email']] || '').trim();
          const sphone = String(row[headerMap['student_phone']] || '').trim();
          const scgpa = String(row[headerMap['cgpa']] || '').trim();
          const scredits = String(row[headerMap['credits_completed']] || headerMap['credits'] ? row[headerMap['credits']] || '' : '').trim();
          const sterm = String(row[headerMap['term_semester']] || '').trim();
          const sfaid = String(row[headerMap['financial_aid']] || '').trim();

          let error: string | undefined;
          if (!sid) error = 'Missing Student ID';
          else if (!sname) error = 'Missing Student Name';
          else if (!dept) error = 'Missing Department';
          else if (!camp) error = 'Missing Campus';
          else if (cat && !['Category A', 'Category B', 'A', 'B'].includes(cat)) error = `Invalid category: "${cat}"`;

          // Normalize category shorthand
          const normalizedCat = cat === 'A' ? 'Category A' : cat === 'B' ? 'Category B' : cat;

          return {
            student_id: sid, student_name: sname, department: dept, campus: camp,
            risk_category: normalizedCat, major: mjr, student_email: semail,
            student_phone: sphone, cgpa: scgpa, credits_completed: scredits,
            term_semester: sterm, financial_aid: sfaid, error,
          };
        });

        setRows(parsed);
        setStep('preview');
      } catch {
        toast.error('Could not read the file. Please use CSV or Excel format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => !!r.error);
  const atRiskRows = validRows.filter((r) => r.risk_category === 'Category A' || r.risk_category === 'Category B');
  const populationOnlyRows = validRows.filter((r) => !r.risk_category);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    let casesCreated = 0;
    let studentsStored = 0;
    let failed = 0;

    // Get existing students and cases
    const studentIds = validRows.map((r) => r.student_id);
    const { data: existingCases } = await supabase.from('risk_cases').select('student_id').in('student_id', studentIds);
    const existingCaseSet = new Set(existingCases?.map((e) => e.student_id) || []);

    for (const row of validRows) {
      // Always upsert into students table
      const { error: studentError } = await supabase.from('students').upsert({
        student_id: row.student_id,
        student_name: row.student_name,
        department: row.department,
        campus: row.campus,
        major: row.major || null,
        cgpa: row.cgpa ? Number(row.cgpa) : null,
        credits_completed: row.credits_completed ? Number(row.credits_completed) : null,
      } as any, { onConflict: 'student_id' });

      if (studentError) { failed++; continue; }
      studentsStored++;

      // If at-risk category, also create a risk case
      if ((row.risk_category === 'Category A' || row.risk_category === 'Category B') && !existingCaseSet.has(row.student_id)) {
        const { error: caseError } = await supabase.from('risk_cases').insert({
          student_id: row.student_id,
          student_name: row.student_name,
          department: row.department,
          campus: row.campus,
          risk_category: row.risk_category,
          major: row.major || null,
          student_email: row.student_email || null,
          student_phone: row.student_phone || null,
          cgpa: row.cgpa ? Number(row.cgpa) : null,
          credits_completed: row.credits_completed ? Number(row.credits_completed) : null,
          term_semester: row.term_semester || null,
          financial_aid: row.financial_aid === 'Applicable' ? 'applicable' : row.financial_aid === 'Not Applicable' ? 'not_applicable' : null,
        } as any);

        if (!caseError) casesCreated++;
      }
    }

    setResults({ casesCreated, studentsStored, failed: failed + errorRows.length });
    setStep('done');
    setImporting(false);

    if (casesCreated > 0 || studentsStored > 0) {
      onImported();
      toast.success(`${studentsStored} student(s) imported, ${casesCreated} at-risk case(s) created.`);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['student_id', 'student_name', 'department', 'campus', 'major', 'cgpa', 'credits_completed', 'category', 'student_email', 'student_phone', 'term_semester', 'financial_aid'],
      ['202401234', 'Jane Doe', 'Marketing', 'Beirut', 'Marketing', '2.1', '30', 'Category A', 'jane.doe@lau.edu', '+961...', 'Spring 2026', 'Not Applicable'],
      ['202405678', 'John Smith', 'Finance', 'Byblos', 'Finance', '1.9', '50', 'Category B', 'john.smith@lau.edu', '+961...', 'Spring 2026', 'Applicable'],
      ['202409999', 'Sarah Lee', 'Accounting', 'Beirut', 'Accounting', '3.2', '60', '', 'sarah.lee@lau.edu', '+961...', 'Spring 2026', ''],
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
            Bulk Import Students
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            <Alert>
              <AlertDescription>
                Upload a CSV or Excel file with all students. Required columns: <strong>student_id</strong>, <strong>student_name</strong>, <strong>department</strong>, <strong>campus</strong>.
                <br />
                Optional <strong>category</strong> column: set to "Category A" or "Category B" to auto-create at-risk cases. Leave empty for general population.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col items-center gap-4 py-8 border-2 border-dashed border-border rounded-lg">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a CSV or Excel file to import</p>
              <div className="flex gap-2">
                <Button onClick={() => fileInputRef.current?.click()}>Choose File</Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default">{validRows.length} valid</Badge>
              <Badge variant="secondary">{atRiskRows.length} at-risk</Badge>
              <Badge variant="outline">{populationOnlyRows.length} population only</Badge>
              {errorRows.length > 0 && <Badge variant="destructive">{errorRows.length} errors</Badge>}
            </div>

            <div className="border rounded-md max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Campus</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row.error ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-xs">{row.student_id || '—'}</TableCell>
                      <TableCell>{row.student_name || '—'}</TableCell>
                      <TableCell>{row.department || '—'}</TableCell>
                      <TableCell>{row.campus || '—'}</TableCell>
                      <TableCell>
                        {row.risk_category ? (
                          <Badge variant={row.risk_category === 'Category A' ? 'destructive' : 'secondary'} className="text-xs">
                            {row.risk_category}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Population</span>
                        )}
                      </TableCell>
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
                {importing ? 'Importing...' : `Import ${validRows.length} Student(s)`}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
            <div>
              <p className="text-lg font-medium">{results.studentsStored} student(s) imported</p>
              <p className="text-sm text-muted-foreground">{results.casesCreated} at-risk case(s) created</p>
              {results.failed > 0 && (
                <p className="text-sm text-destructive">{results.failed} skipped (errors or duplicates)</p>
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
