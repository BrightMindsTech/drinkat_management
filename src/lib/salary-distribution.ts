/**
 * Salaries are permanent on `Employee.salaryAmount` (HR “Save salaries” / CSV upload).
 * No automatic monthly snapshot rows — payroll reports read profile salaries directly.
 */
export async function runSalaryDistributionIfDue(): Promise<void> {
  return;
}
