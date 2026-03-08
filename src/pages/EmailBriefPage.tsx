import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Check, Mail } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const EMAIL_SUBJECT = 'ARIP Dashboard — Academic Risk Intervention Program Overview';

const EMAIL_BODY = `Dear Colleague,

I am writing to introduce the Academic Risk Intervention Program (ARIP) Dashboard, a web-based management system developed for the Adnan Kassar School of Business at the Lebanese American University.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PURPOSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The ARIP Dashboard provides a centralized, data-driven platform for:

• Identifying academically at-risk students based on CGPA and credit thresholds
• Managing advisor-led intervention plans and follow-up meetings
• Tracking compliance with institutional intervention protocols
• Reporting outcomes and program effectiveness to university leadership

The system automates the full lifecycle of academic risk management — from initial flagging through advisor assignment, intervention planning, follow-up monitoring, and final outcome recording.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Executive Dashboard
   High-level KPIs including total flagged students, category breakdowns, advisor assignment rates, meeting completion, AIP completion, midterm review rates, and student improvement percentages.

2. Case Management
   Central hub for viewing, filtering, searching, and managing all risk cases. Supports individual case creation and bulk Excel import from registrar data.

3. Advisor Workload Monitoring
   Visual overview of each advisor's current caseload, enabling leadership to balance case distribution and identify capacity issues.

4. Department Monitoring
   Department-level aggregate view of risk cases for cross-departmental comparisons and resource allocation decisions.

5. Outcomes Analytics
   Tracks final outcomes across all closed cases — improvement, continued probation, or withdrawal — supporting data-driven institutional reporting.

6. Compliance Tracking
   Monitors whether required intervention steps (meetings, AIP forms, midterm reviews) have been completed on time, highlighting non-compliant cases.

7. User Management
   Creation, editing, and deactivation of system users with role-based access control (Admin, Department Chair, Advisor).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPERATIONAL WORKFLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 → Student Flagging: Students meeting risk criteria are identified and entered into the system.
Step 2 → Case Creation: Admin or chair creates a case with academic profile and risk category.
Step 3 → Advisor Assignment: A qualified advisor is assigned to each case.
Step 4 → Initial Meeting: The advisor meets with the student and records the meeting.
Step 5 → Intervention Planning: The advisor completes the Academic Intervention Plan (AIP) form.
Step 6 → Follow-Up Tracking: Subsequent check-ins are logged with dates and progress notes.
Step 7 → Midterm Review: Midterm progress review is conducted and recorded.
Step 8 → Outcome Recording: Final outcome is recorded with CGPA changes at term end.
Step 9 → Compliance & Reporting: Leadership reviews dashboards for program effectiveness.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROLE-BASED ACCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• System Admin: Full access to all pages including User Management and Department Monitoring.
• Department Chair: Access to Dashboard, Cases, Advisor Workload, Outcomes, and Compliance.
• Advisor: Access to assigned Cases only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Role                  Username        Password
System Admin          admin           Admin@123
AKSOB Admin           aksobadmin      Aksob@123
Chair — Marketing     chair_mkt       Chair@123
Chair — Finance       chair_fin       Chair@123
Advisor One           advisor1        Advisor@123
Advisor Two           advisor2        Advisor@123

⚠ These credentials are for internal testing only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For a detailed implementation guide, please log in as an admin and navigate to the Guide page within the application.

A comprehensive PDF guide can also be exported directly from the Guide page for offline reference and presentations.

Best regards,
AKSOB Academic Risk Intervention Program
Adnan Kassar School of Business — Lebanese American University`;

const EmailBriefPage = () => {
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null);

  const handleCopy = async (text: string, type: 'subject' | 'body') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success(type === 'subject' ? 'Subject copied!' : 'Email body copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMailto = () => {
    const mailto = `mailto:?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`;
    window.open(mailto, '_blank');
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-1">Communication</p>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground leading-tight">
              Email Brief
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ready-to-send overview of the ARIP Dashboard for stakeholders
            </p>
          </div>
          <Button onClick={handleMailto} className="gap-2 shrink-0">
            <Mail className="h-4 w-4" />
            Open in Email Client
          </Button>
        </div>

        <Separator />

        {/* Subject */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Subject Line</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(EMAIL_SUBJECT, 'subject')}
              className="gap-1.5 text-xs h-7"
            >
              {copied === 'subject' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'subject' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-sm text-foreground font-medium">{EMAIL_SUBJECT}</p>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Email Body</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(EMAIL_BODY, 'body')}
              className="gap-1.5 text-xs h-7"
            >
              {copied === 'body' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'body' ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 max-h-[600px] overflow-y-auto">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {EMAIL_BODY}
            </pre>
          </div>
        </div>

        <Separator />

        <div className="flex justify-center gap-3">
          <Button onClick={() => handleCopy(`Subject: ${EMAIL_SUBJECT}\n\n${EMAIL_BODY}`, 'body')} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Everything
          </Button>
          <Button onClick={handleMailto} variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Open in Email Client
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default EmailBriefPage;
