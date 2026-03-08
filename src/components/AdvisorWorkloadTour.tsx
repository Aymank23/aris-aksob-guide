import PageTour, { type TourStep } from '@/components/PageTour';

const STEPS: TourStep[] = [
  {
    target: '[data-tour="workload-kpis"]',
    title: 'Workload Summary',
    description: 'Overview of total assigned cases, pending meetings, overdue cases, and completed interventions across all advisors.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="workload-chart"]',
    title: 'Workload Distribution',
    description: 'This bar chart shows how cases are distributed among advisors, helping identify imbalances in workload.',
    placement: 'top',
  },
  {
    target: '[data-tour="workload-table"]',
    title: 'Advisor Details',
    description: 'Detailed breakdown per advisor showing assigned count (max 10), pending meetings, overdue cases, and completions.',
    placement: 'top',
  },
];

const AdvisorWorkloadTour = () => (
  <PageTour steps={STEPS} storageKey="arip_workload_tour_seen" label="Workload Guide" />
);

export default AdvisorWorkloadTour;
