import PageTour, { type TourStep } from '@/components/PageTour';

const STEPS: TourStep[] = [
  {
    target: '[data-tour="kpi-section"]',
    title: 'Key Performance Indicators',
    description: 'These cards show high-level metrics: total flagged students, risk categories, advisor assignments, and meeting completion rates.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="progress-section"]',
    title: 'Progress Metrics',
    description: 'Track AIP completion, midterm reviews, improvement rates, and referral statistics across all active cases.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="dept-chart"]',
    title: 'Department Breakdown',
    description: 'This bar chart visualizes how at-risk students are distributed across departments, helping identify areas needing attention.',
    placement: 'top',
  },
  {
    target: '[data-tour="status-chart"]',
    title: 'Case Status Distribution',
    description: 'The donut chart shows the proportion of pending, in-progress, and completed cases at a glance.',
    placement: 'top',
  },
];

const DashboardTour = () => (
  <PageTour steps={STEPS} storageKey="arip_dashboard_tour_seen" label="Dashboard Guide" />
);

export default DashboardTour;
