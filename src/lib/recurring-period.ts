export interface RecurringPeriod {
  active: boolean;
  start_year?: number | null;
  start_month?: number | null;
}

export function recurringAppliesToMonth(recurring: RecurringPeriod, year: number, month: number) {
  if (!recurring.active || recurring.start_year == null || recurring.start_month == null) return false;
  return year * 12 + month >= recurring.start_year * 12 + recurring.start_month;
}

export function remainingMonthsInYear(month: number) {
  return Array.from({ length: 13 - month }, (_, index) => month + index);
}