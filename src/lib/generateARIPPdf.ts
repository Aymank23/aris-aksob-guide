import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  academicFactors, externalFactors, engagementFactors,
  courseStrategies, supportActivities, monitoringReqs,
} from '@/lib/constants';

const GREEN = [0, 103, 81] as const; // Pantone 336
const GRAY = [100, 100, 100] as const;

interface CaseData {
  student_name: string;
  student_id: string;
  department: string;
  risk_category: string;
  term_semester?: string;
  date_of_meeting?: string;
  major?: string;
  student_email?: string;
  student_phone?: string;
  assigned_advisor_name?: string;
  advisor_email?: string;
  cgpa?: number;
  credits_completed?: number;
  financial_aid?: string;
  meeting_status: string;
  aip_status: string;
  midterm_review_status: string;
  outcome_status: string;
}

interface InterventionForm {
  root_cause_academic: string[];
  root_cause_external: string[];
  root_cause_engagement: string[];
  advisor_notes: string;
  course_strategy: string[];
  support_services: string[];
  monitoring_requirements: string[];
}

interface FollowUp {
  date: string;
  progress_notes: string;
}

interface Outcome {
  final_outcome: string;
  other_outcome?: string;
  cgpa_change?: number;
  probation_avoided?: boolean;
}

const outcomeLabels: Record<string, string> = {
  improved_above_threshold: 'Student improved above threshold',
  improved_still_at_risk: 'Student improved but still at risk',
  declined_escalated: 'Student declined / probation case escalated',
  withdrew: 'Student withdrew from term',
  other: 'Other',
};

export const generateARIPPdf = (
  caseData: CaseData,
  form: InterventionForm | null,
  followUps: FollowUp[],
  outcome: Outcome | null,
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 14;
    }
  };

  const sectionHeader = (title: string) => {
    addPageIfNeeded(12);
    doc.setFillColor(...GREEN);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const labelValue = (label: string, value: string, x: number, width: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, x, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(value || '—', width - 2);
    doc.text(lines, x, y + 4);
    return 4 + lines.length * 3.5;
  };

  const checklistSection = (title: string, allItems: string[], selected: string[]) => {
    addPageIfNeeded(16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 5;

    const colWidth = contentWidth / 2;
    allItems.forEach((item, i) => {
      const col = i % 2;
      if (col === 0 && i > 0) y += 5;
      addPageIfNeeded(6);

      const x = margin + col * colWidth;
      const checked = selected.includes(item);

      // Draw checkbox
      doc.setDrawColor(150);
      doc.rect(x, y - 3, 3, 3);
      if (checked) {
        doc.setFillColor(...GREEN);
        doc.rect(x + 0.5, y - 2.5, 2, 2, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(item, x + 5, y);
    });
    y += 6;

    // Show "Other:" entries
    const others = selected.filter(v => v.startsWith('Other:'));
    others.forEach(v => {
      addPageIfNeeded(5);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(v, margin + 5, y);
      doc.setTextColor(0, 0, 0);
      y += 4;
    });
  };

  // ─── HEADER ───
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Academic Risk Intervention Form', pageWidth / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AKSOB — Lebanese American University  •  Confidential Academic Record', pageWidth / 2, 17, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y = 28;

  // ─── SECTION A ───
  sectionHeader('Section A — Student Information');
  const half = contentWidth / 2;
  const fields: [string, string][] = [
    ['Student Name', caseData.student_name],
    ['Student ID', caseData.student_id],
    ['Term / Semester', caseData.term_semester || '—'],
    ['Date of Meeting', caseData.date_of_meeting ? new Date(caseData.date_of_meeting).toLocaleDateString() : '—'],
    ['Department', caseData.department],
    ['Major / Program', caseData.major || '—'],
    ['Student Email', caseData.student_email || '—'],
    ['Phone Number', caseData.student_phone || '—'],
    ['Assigned Special Advisor', caseData.assigned_advisor_name || '—'],
    ['Advisor Email', caseData.advisor_email || '—'],
  ];
  for (let i = 0; i < fields.length; i += 2) {
    addPageIfNeeded(12);
    const h1 = labelValue(fields[i][0], fields[i][1], margin, half);
    const h2 = i + 1 < fields.length ? labelValue(fields[i + 1][0], fields[i + 1][1], margin + half, half) : 0;
    y += Math.max(h1, h2) + 2;
  }

  // ─── SECTION B ───
  sectionHeader('Section B — Academic Snapshot (from Cognos)');
  const bFields: [string, string][] = [
    ['CGPA', caseData.cgpa != null ? String(caseData.cgpa) : '—'],
    ['Credits Completed', caseData.credits_completed != null ? String(caseData.credits_completed) : '—'],
    ['Risk Category', `${caseData.risk_category} ${caseData.risk_category === 'Category A' ? '(<45 credits, CGPA ≤ 2.3)' : '(≥45 credits, CGPA ≤ 2.2)'}`],
    ['Financial Aid', caseData.financial_aid === 'applicable' ? 'Applicable' : caseData.financial_aid === 'not_applicable' ? 'Not Applicable' : '—'],
  ];
  for (let i = 0; i < bFields.length; i += 2) {
    addPageIfNeeded(12);
    const h1 = labelValue(bFields[i][0], bFields[i][1], margin, half);
    const h2 = i + 1 < bFields.length ? labelValue(bFields[i + 1][0], bFields[i + 1][1], margin + half, half) : 0;
    y += Math.max(h1, h2) + 2;
  }

  // ─── SECTION C ───
  if (form) {
    sectionHeader('Section C — Root Cause Assessment');
    checklistSection('1) Academic Factors', academicFactors, form.root_cause_academic);
    checklistSection('2) External / Personal Factors', externalFactors, form.root_cause_external);
    checklistSection('3) Engagement Factors', engagementFactors, form.root_cause_engagement);

    if (form.advisor_notes) {
      addPageIfNeeded(14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Advisor Notes / Summary of Key Causes', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(form.advisor_notes, contentWidth);
      addPageIfNeeded(noteLines.length * 4 + 2);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4 + 2;
    }

    // ─── SECTION D ───
    sectionHeader('Section D — Academic Improvement Plan');
    checklistSection('D1) Course Strategy', courseStrategies, form.course_strategy);
    checklistSection('D2) Support Activities', supportActivities, form.support_services);
    checklistSection('D3) Monitoring Requirements', monitoringReqs, form.monitoring_requirements);
  }

  // ─── SECTION E ───
  if (followUps.length > 0) {
    sectionHeader('Section E — Follow-Up Tracking');
    addPageIfNeeded(20);
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Date', 'Progress Notes']],
      body: followUps.map((f) => [
        new Date(f.date).toLocaleDateString(),
        f.progress_notes || '',
      ]),
      headStyles: { fillColor: GREEN as any, fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 28 } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── SECTION F ───
  if (outcome) {
    sectionHeader('Section F — Final Outcome (Assistant Dean)');
    addPageIfNeeded(10);
    const label = outcomeLabels[outcome.final_outcome] || outcome.final_outcome;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Final Outcome:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin + 30, y);
    y += 5;
    if (outcome.final_outcome === 'other' && outcome.other_outcome) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`Details: ${outcome.other_outcome}`, margin, y);
      y += 5;
    }
  }

  // ─── FOOTER ───
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(
      `AKSOB ARIP — ${caseData.student_name} (${caseData.student_id})  •  Generated ${new Date().toLocaleDateString()}  •  Page ${p}/${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' },
    );
  }

  doc.save(`ARIP_${caseData.student_id}_${caseData.student_name.replace(/\s/g, '_')}.pdf`);
};
