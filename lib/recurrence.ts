export type RecurrenceRule = "weekly" | "biweekly" | `every_${number}_days`;

export function generateRecurringDates(
  startDate: Date,
  rule: RecurrenceRule,
  count: number = 8
): Date[] {
  const dates: Date[] = [];
  let intervalDays: number;

  if (rule === "weekly") {
    intervalDays = 7;
  } else if (rule === "biweekly") {
    intervalDays = 14;
  } else {
    const match = rule.match(/^every_(\d+)_days$/);
    intervalDays = match ? parseInt(match[1]) : 7;
  }

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + intervalDays * i);
    dates.push(date);
  }

  return dates;
}
