import { useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Shield, Users, LayoutDashboard, FileText, TrendingUp, Building2, ShieldCheck, UserCog, LogIn, ArrowRight } from 'lucide-react';
import jsPDF from 'jspdf';

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-8">
    <h2 className="text-xl font-serif font-semibold text-foreground mb-4">{title}</h2>
    {children}
  </section>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
    {children}
  </div>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2 items-start text-sm text-muted-foreground leading-relaxed">
    <span className="mt-1 shrink-0"><ArrowRight className="h-3.5 w-3.5 text-primary" /></span>
    <span>{children}</span>
  </li>
);

/* ------------------------------------------------------------------ */
/*  Credential card                                                    */
/* ------------------------------------------------------------------ */
const CredentialRow = ({ role, username, password }: { role: string; username: string; password: string }) => (
  <tr className="border-b border-border last:border-0">
    <td className="py-2.5 px-4 text-sm font-medium text-foreground">{role}</td>
    <td className="py-2.5 px-4 text-sm text-muted-foreground font-mono">{username}</td>
    <td className="py-2.5 px-4 text-sm text-muted-foreground font-mono">{password}</td>
  </tr>
);

/* ------------------------------------------------------------------ */
/*  Page-by-page card                                                  */
/* ------------------------------------------------------------------ */
const PageCard = ({ icon: Icon, title, audience, description, actions }: {
  icon: React.ElementType; title: string; audience: string; description: string; actions: string[];
}) => (
  <div className="rounded-lg border border-border bg-card p-5 space-y-3">
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{audience}</p>
      </div>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    <ul className="space-y-1.5">
      {actions.map((a, i) => <Bullet key={i}>{a}</Bullet>)}
    </ul>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Workflow step                                                      */
/* ------------------------------------------------------------------ */
const Step = ({ num, title, desc }: { num: number; title: string; desc: string }) => (
  <div className="flex gap-4 items-start">
    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
      {num}
    </div>
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  PDF export                                                         */
/* ------------------------------------------------------------------ */
const exportGuidePdf = () => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 20;

  const green: [number, number, number] = [0, 103, 81];
  const dark: [number, number, number] = [30, 30, 30];
  const grey: [number, number, number] = [100, 100, 100];

  const ensureSpace = (need: number) => {
    if (y + need > 270) { doc.addPage(); y = 20; }
  };

  const heading = (text: string) => {
    ensureSpace(14);
    doc.setFontSize(14); doc.setTextColor(...green); doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y); y += 4;
    doc.setDrawColor(...green); doc.setLineWidth(0.4); doc.line(margin, y, margin + contentW, y); y += 8;
  };

  const subheading = (text: string) => {
    ensureSpace(10);
    doc.setFontSize(11); doc.setTextColor(...dark); doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y); y += 6;
  };

  const para = (text: string) => {
    doc.setFontSize(10); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentW);
    ensureSpace(lines.length * 5);
    doc.text(lines, margin, y); y += lines.length * 5 + 3;
  };

  const bullet = (text: string) => {
    doc.setFontSize(10); doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, contentW - 6);
    ensureSpace(lines.length * 5);
    doc.text('•', margin + 2, y);
    doc.text(lines, margin + 6, y);
    y += lines.length * 5 + 1;
  };

  /* --- Title --- */
  doc.setFillColor(...green);
  doc.rect(0, 0, W, 38, 'F');
  doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('ARIP Dashboard — Implementation Guide', margin, 18);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Academic Risk Intervention Program  •  Adnan Kassar School of Business  •  Lebanese American University', margin, 28);
  y = 50;

  /* 1 — Purpose */
  heading('1. Purpose of the Application');
  para('The Academic Risk Intervention Program (ARIP) Dashboard is a web-based management system developed for the Adnan Kassar School of Business at the Lebanese American University. It provides a centralized, data-driven platform for identifying academically at-risk students, managing advisor-led interventions, tracking compliance with institutional protocols, and reporting outcomes to leadership.');
  para('The system automates the lifecycle of academic risk management — from initial flagging through advisor assignment, intervention planning, follow-up monitoring, and final outcome recording — enabling deans, department chairs, and academic advisors to collaborate efficiently within a single interface.');

  /* 2 — Design */
  heading('2. Design Logic');
  para('The interface was designed with three guiding principles: institutional professionalism, role-based clarity, and operational efficiency.');
  bullet('Sidebar Navigation: A persistent vertical sidebar organizes the system into logical sections. Users see only the pages relevant to their role, reducing cognitive load and enforcing access control visually.');
  bullet('Executive Dashboard: The main dashboard presents high-level KPIs (Key Performance Indicators) in a card-based layout, giving deans and chairs an at-a-glance summary without navigating into individual records.');
  bullet('Visual Hierarchy: Serif headings (Playfair Display) convey institutional formality; sans-serif body text (Inter) ensures legibility. The LAU green (Pantone 336 C) anchors the color palette, with muted tones for backgrounds and accents for actionable elements.');
  bullet('Section Separation: Each major function (cases, workload, compliance, outcomes) occupies a dedicated page, preventing information overload and allowing focused decision-making.');

  /* 3 — Pages */
  heading('3. Page-by-Page Explanation');

  subheading('Executive Dashboard');
  para('Audience: Deans, Department Chairs. Displays aggregated KPIs including total flagged students, category breakdowns, advisor assignment rates, meeting completion, AIP completion, midterm review rates, and student improvement percentages. Two charts visualize risk distribution by department and overall case status.');

  subheading('Cases');
  para('Audience: All roles. The central case management hub. Users can view, filter, search, and sort all risk cases. Admins and chairs can create new cases individually or via bulk Excel import. Clicking a case opens its full detail view where intervention forms, follow-ups, and outcomes are managed.');

  subheading('Advisor Workload');
  para('Audience: Deans, Department Chairs. Shows each advisor\'s current caseload with visual indicators. Helps leadership balance case distribution and identify advisors who may be over- or under-utilized.');

  subheading('Department Monitoring');
  para('Audience: System Admins. Provides a department-level aggregate view of risk cases, enabling cross-departmental comparisons and resource allocation decisions.');

  subheading('Outcomes Analytics');
  para('Audience: Deans, Department Chairs. Tracks final outcomes across all closed cases — how many students improved, remained on probation, or withdrew. Supports data-driven reporting to university leadership.');

  subheading('Compliance Tracking');
  para('Audience: Deans, Department Chairs. Monitors whether required intervention steps (meetings, AIP forms, midterm reviews) have been completed on time. Highlights non-compliant cases for follow-up.');

  subheading('User Management');
  para('Audience: System Admins only. Allows creation, editing, and deactivation of system users (admins, chairs, advisors). Each user is assigned a role, department, and credentials.');

  /* 4 — Workflow */
  heading('4. Operational Workflow');
  const steps = [
    ['Student Flagging', 'At the start of each term, students meeting risk criteria (CGPA thresholds by credit count) are identified and entered into the system — individually or via bulk import from registrar data.'],
    ['Case Creation', 'An admin or department chair creates a risk case record containing the student\'s academic profile, contact information, and risk category.'],
    ['Advisor Assignment', 'A qualified academic advisor is assigned to each case. The system tracks the assignment and notifies relevant parties.'],
    ['Initial Meeting', 'The assigned advisor meets with the student. The meeting date and status are recorded in the case detail.'],
    ['Intervention Planning (AIP)', 'The advisor completes the Academic Intervention Plan form, documenting root causes (academic, external, engagement), recommended course strategies, support services, and monitoring requirements.'],
    ['Follow-Up Tracking', 'Subsequent check-ins are logged with dates and progress notes, providing a chronological record of the intervention.'],
    ['Midterm Review', 'A midterm progress review is conducted and its status is updated in the system.'],
    ['Outcome Recording', 'At the end of the term, the final outcome is recorded: improvement, continued probation, withdrawal, or other resolution. CGPA changes are logged.'],
    ['Compliance & Reporting', 'Leadership reviews compliance dashboards and outcome analytics to evaluate program effectiveness and prepare institutional reports.'],
  ];
  steps.forEach(([title, desc], i) => {
    ensureSpace(14);
    doc.setFontSize(10); doc.setTextColor(...green); doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}.`, margin + 2, y);
    doc.text(title, margin + 8, y);
    doc.setTextColor(...grey); doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(desc, contentW - 8);
    y += 5; doc.text(lines, margin + 8, y); y += lines.length * 5 + 3;
  });

  /* 5 — Navigation */
  heading('5. Access & Navigation Guide');
  bullet('Login: Navigate to the application URL. Enter your username and password on the login screen and click "Sign In".');
  bullet('Role-Based Access: After login, the sidebar displays only the pages your role is authorized to view. Advisors see Cases only; Chairs see Dashboard, Cases, Workload, Outcomes, and Compliance; Admins see all pages including Department Monitoring and User Management.');
  bullet('Opening a Case: Click on any row in the Cases table to open the full case detail page.');
  bullet('Assigning an Advisor: In the case detail page, select an advisor from the dropdown under the Assignment section and save.');
  bullet('Reviewing Compliance: Navigate to Compliance Tracking from the sidebar to see a table of all cases with their step-completion status.');
  bullet('Signing Out: Click "Sign Out" at the bottom of the sidebar.');

  /* 6 — Credentials */
  heading('6. Test Credentials');
  para('The following credentials are available for demonstration and internal testing:');

  const creds = [
    ['System Admin', 'admin', 'Admin@123'],
    ['AKSOB Admin', 'aksobadmin', 'Aksob@123'],
    ['Chair — Marketing', 'chair_mkt', 'Chair@123'],
    ['Chair — Finance', 'chair_fin', 'Chair@123'],
    ['Advisor One', 'advisor1', 'Advisor@123'],
    ['Advisor Two', 'advisor2', 'Advisor@123'],
  ];

  ensureSpace(creds.length * 7 + 10);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...dark);
  doc.text('Role', margin, y); doc.text('Username', margin + 55, y); doc.text('Password', margin + 105, y);
  y += 2; doc.setDrawColor(200, 200, 200); doc.line(margin, y, margin + contentW, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  creds.forEach(([role, user, pass]) => {
    doc.setTextColor(...dark); doc.text(role, margin, y);
    doc.setTextColor(...grey); doc.text(user, margin + 55, y); doc.text(pass, margin + 105, y);
    y += 6;
  });
  y += 4;

  /* 7 — Usage Notes */
  heading('7. Usage Notes');
  bullet('The system operates on a clean-slate data policy — no mock or seeded data is included. All records are created through manual entry or bulk import of real registrar data.');
  bullet('Cases are created by Admins or Department Chairs. Advisors cannot create cases.');
  bullet('Advisor assignment is performed by Admins or Department Chairs from the case detail page.');
  bullet('Intervention plan details (AIP form) are filled in by the assigned advisor.');
  bullet('Final outcomes are recorded by the advisor or admin after the term concludes.');
  bullet('PDF export of individual ARIP forms is available from each case detail page.');

  /* Footer */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'normal');
    doc.text(`ARIP Dashboard Guide  •  AKSOB / LAU  •  Page ${p} of ${pages}`, W / 2, 290, { align: 'center' });
  }

  doc.save('ARIP_Dashboard_Guide.pdf');
};

/* ================================================================== */
/*  GUIDE PAGE                                                         */
/* ================================================================== */
const GuidePage = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <AppLayout>
      <div ref={contentRef} className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-primary mb-1">Implementation &amp; Design Guide</p>
            <h1 className="text-2xl md:text-3xl font-serif font-semibold text-foreground leading-tight">
              ARIP Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Adnan Kassar School of Business — Lebanese American University
            </p>
          </div>
          <Button onClick={exportGuidePdf} className="gap-2 shrink-0">
            <Download className="h-4 w-4" />
            Export Guide as PDF
          </Button>
        </div>

        <Separator />

        {/* 1 — Purpose */}
        <Section id="purpose" title="1. Purpose of the Application">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            The <strong className="text-foreground">Academic Risk Intervention Program (ARIP) Dashboard</strong> is a
            web-based management system developed for the Adnan Kassar School of Business at the Lebanese American
            University. It provides a centralized, data-driven platform for:
          </p>
          <ul className="space-y-2 mb-3">
            <Bullet>Identifying academically at-risk students based on CGPA and credit thresholds</Bullet>
            <Bullet>Managing advisor-led intervention plans and follow-up meetings</Bullet>
            <Bullet>Tracking compliance with institutional intervention protocols</Bullet>
            <Bullet>Reporting outcomes and program effectiveness to university leadership</Bullet>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The system automates the full lifecycle of academic risk management — from initial flagging through advisor
            assignment, intervention planning, follow-up monitoring, and final outcome recording.
          </p>
        </Section>

        <Separator />

        {/* 2 — Design */}
        <Section id="design" title="2. Design Logic">
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            The interface was designed around three guiding principles: <strong className="text-foreground">institutional
            professionalism</strong>, <strong className="text-foreground">role-based clarity</strong>, and{' '}
            <strong className="text-foreground">operational efficiency</strong>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { t: 'Sidebar Navigation', d: 'A persistent vertical sidebar organizes the system into logical sections. Users see only the pages relevant to their role, reducing cognitive load and reinforcing access control visually.' },
              { t: 'Executive Dashboard', d: 'The main dashboard presents high-level KPIs in a card-based layout, giving deans and chairs an at-a-glance summary without navigating into individual records.' },
              { t: 'Visual Hierarchy', d: 'Serif headings (Playfair Display) convey institutional formality; sans-serif body text (Inter) ensures legibility. The LAU green (Pantone 336 C) anchors the entire color palette.' },
              { t: 'Section Separation', d: 'Each major function occupies a dedicated page — preventing information overload and allowing focused decision-making within a clean, uncluttered interface.' },
            ].map((item) => (
              <div key={item.t} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-semibold text-foreground mb-1">{item.t}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        {/* 3 — Pages */}
        <Section id="pages" title="3. Page-by-Page Explanation">
          <div className="grid gap-4">
            <PageCard
              icon={LayoutDashboard}
              title="Executive Dashboard"
              audience="Deans, Department Chairs"
              description="Displays aggregated KPIs: total flagged students, category breakdowns, advisor assignment rates, meeting completion, AIP completion, midterm reviews, and student improvement percentages. Two charts visualize risk distribution by department and overall case status."
              actions={['Monitor overall program health at a glance', 'Identify departments with the highest risk concentrations', 'Track intervention completion rates across the school']}
            />
            <PageCard
              icon={FileText}
              title="Cases"
              audience="All Roles"
              description="The central case management hub. Users can view, filter, search, and sort all risk cases. Admins and chairs can create new cases individually or via bulk Excel import. Clicking a case opens its full detail view."
              actions={['Create or import new risk cases', 'Search and filter by department, category, or status', 'Open any case to manage its full intervention lifecycle']}
            />
            <PageCard
              icon={Users}
              title="Advisor Workload"
              audience="Deans, Department Chairs"
              description="Shows each advisor's current caseload with visual indicators. Helps leadership balance case distribution and identify advisors who may be over- or under-utilized."
              actions={['Review caseload balance across advisors', 'Identify advisors needing additional case assignments', 'Ensure equitable distribution of work']}
            />
            <PageCard
              icon={Building2}
              title="Department Monitoring"
              audience="System Admins"
              description="Provides a department-level aggregate view of risk cases, enabling cross-departmental comparisons and resource allocation decisions."
              actions={['Compare risk case volumes across departments', 'Support resource allocation and staffing decisions']}
            />
            <PageCard
              icon={TrendingUp}
              title="Outcomes Analytics"
              audience="Deans, Department Chairs"
              description="Tracks final outcomes across all closed cases — how many students improved, remained on probation, or withdrew. Supports data-driven reporting to university leadership."
              actions={['Evaluate program effectiveness with outcome data', 'Generate evidence for institutional reporting']}
            />
            <PageCard
              icon={ShieldCheck}
              title="Compliance Tracking"
              audience="Deans, Department Chairs"
              description="Monitors whether required intervention steps (meetings, AIP forms, midterm reviews) have been completed on time. Highlights non-compliant cases for follow-up."
              actions={['Identify overdue or incomplete intervention steps', 'Ensure institutional protocol adherence']}
            />
            <PageCard
              icon={UserCog}
              title="User Management"
              audience="System Admins only"
              description="Allows creation, editing, and deactivation of system users — admins, chairs, and advisors. Each user is assigned a role, department, and login credentials."
              actions={['Add or deactivate users', 'Assign roles and departmental access', 'Reset credentials when needed']}
            />
          </div>
        </Section>

        <Separator />

        {/* 4 — Workflow */}
        <Section id="workflow" title="4. Operational Workflow">
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            The system follows a structured, end-to-end workflow from student identification to final outcome recording:
          </p>
          <div className="space-y-5">
            <Step num={1} title="Student Flagging" desc="At the start of each term, students meeting risk criteria (CGPA thresholds by credit count) are identified and entered into the system — individually or via bulk import from registrar data." />
            <Step num={2} title="Case Creation" desc="An admin or department chair creates a risk case record containing the student's academic profile, contact information, and risk category (A or B)." />
            <Step num={3} title="Advisor Assignment" desc="A qualified academic advisor is assigned to each case. The system tracks the assignment and displays it across dashboards." />
            <Step num={4} title="Initial Meeting" desc="The assigned advisor meets with the student. The meeting date and completion status are recorded in the case detail." />
            <Step num={5} title="Intervention Planning (AIP)" desc="The advisor completes the Academic Intervention Plan — documenting root causes, recommended course strategies, support services, and monitoring requirements." />
            <Step num={6} title="Follow-Up Tracking" desc="Subsequent check-ins are logged with dates and progress notes, providing a chronological record of the intervention." />
            <Step num={7} title="Midterm Review" desc="A midterm progress review is conducted and its status is updated in the system." />
            <Step num={8} title="Outcome Recording" desc="At term end, the final outcome is recorded: improvement, continued probation, withdrawal, or other. CGPA changes are logged." />
            <Step num={9} title="Compliance & Reporting" desc="Leadership reviews compliance dashboards and outcome analytics to evaluate program effectiveness and prepare institutional reports." />
          </div>
        </Section>

        <Separator />

        {/* 5 — Navigation */}
        <Section id="navigation" title="5. Access & Navigation Guide">
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <LogIn className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Logging In</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Navigate to the application URL. Enter your username and password on the secure login screen and click <strong>"Sign In"</strong>.</p>
              </div>
            </div>
            <ul className="space-y-2 pl-1">
              <Bullet><strong>Role-Based Access:</strong> After login, the sidebar displays only the pages your role is authorized to view. Advisors see Cases only; Chairs see Dashboard, Cases, Workload, Outcomes, and Compliance; Admins see all pages.</Bullet>
              <Bullet><strong>Opening a Case:</strong> Click any row in the Cases table to open the full case detail page with all intervention data.</Bullet>
              <Bullet><strong>Assigning an Advisor:</strong> In the case detail page, select an advisor from the dropdown under the Assignment section and save.</Bullet>
              <Bullet><strong>Exporting a Form:</strong> Click "Export PDF" on any case detail page to download the official ARIP intervention form.</Bullet>
              <Bullet><strong>Reviewing Compliance:</strong> Navigate to Compliance Tracking from the sidebar to view step-completion status for all cases.</Bullet>
              <Bullet><strong>Signing Out:</strong> Click "Sign Out" at the bottom of the sidebar.</Bullet>
            </ul>
          </div>
        </Section>

        <Separator />

        {/* 6 — Credentials */}
        <Section id="credentials" title="6. Test Credentials">
          <p className="text-sm text-muted-foreground mb-4">
            The following credentials are available for demonstration and internal testing purposes:
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-foreground">Role</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-foreground">Username</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-foreground">Password</th>
                </tr>
              </thead>
              <tbody>
                <CredentialRow role="System Admin" username="admin" password="Admin@123" />
                <CredentialRow role="AKSOB Admin" username="aksobadmin" password="Aksob@123" />
                <CredentialRow role="Chair — Marketing" username="chair_mkt" password="Chair@123" />
                <CredentialRow role="Chair — Finance" username="chair_fin" password="Chair@123" />
                <CredentialRow role="Advisor One" username="advisor1" password="Advisor@123" />
                <CredentialRow role="Advisor Two" username="advisor2" password="Advisor@123" />
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>These credentials are for internal testing only and should not be shared externally.</span>
          </div>
        </Section>

        <Separator />

        {/* 7 — Usage Notes */}
        <Section id="notes" title="7. Usage Notes">
          <ul className="space-y-2">
            <Bullet>The system operates on a clean-slate data policy — no mock or seeded data is included. All records are created through manual entry or bulk import of real registrar data.</Bullet>
            <Bullet><strong>Case creation</strong> is performed by Admins or Department Chairs. Advisors cannot create cases.</Bullet>
            <Bullet><strong>Advisor assignment</strong> is done by Admins or Department Chairs from the case detail page.</Bullet>
            <Bullet><strong>Intervention plan details</strong> (the AIP form) are completed by the assigned advisor.</Bullet>
            <Bullet><strong>Final outcomes</strong> are recorded by the advisor or admin after the term concludes.</Bullet>
            <Bullet>PDF export of individual ARIP forms is available from each case detail page via the "Export PDF" button.</Bullet>
          </ul>
        </Section>

        {/* Bottom export */}
        <Separator />
        <div className="flex justify-center pt-2">
          <Button onClick={exportGuidePdf} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Guide as PDF
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default GuidePage;
