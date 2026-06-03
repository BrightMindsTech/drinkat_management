export type ReportTableData = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  footerRow?: string[];
  /** Shown when rows are empty (e.g. no payroll/advances/forms for the selected month). */
  emptyMessage?: string;
  asOfDate?: string;
};
