import PageTour, { type TourStep } from '@/components/PageTour';

const STEPS: TourStep[] = [
  {
    target: '[data-tour="cases-actions"]',
    title: 'Case Actions',
    description: 'Create new intervention cases, bulk import from spreadsheets, or export all cases to CSV for reporting.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="cases-filters"]',
    title: 'Search & Filter',
    description: 'Quickly find cases by student name or ID. Filter by department or risk category to narrow results.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="cases-table"]',
    title: 'Cases Table',
    description: 'View all intervention cases with their current status. Click the eye icon to open case details, or assign an advisor to unassigned cases.',
    placement: 'top',
  },
];

const CasesTour = () => (
  <PageTour steps={STEPS} storageKey="arip_cases_tour_seen" label="Cases Guide" />
);

export default CasesTour;
