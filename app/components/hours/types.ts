export type WorkHoursEntry = {
  uuid: string;
  minutes: number;
  comment: string;
  kind: 'manual' | 'adjustment';
  eventUuid: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkHoursEvent = {
  assignmentUuid: string;
  eventUuid: string;
  eventTitle: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
};

export type WorkHoursDay = {
  date: string;
  plannedMinutes: number;
  reportedMinutes: number;
  effectiveMinutes: number;
  differenceMinutes: number;
  events: WorkHoursEvent[];
  entries: WorkHoursEntry[];
};

export type WorkHoursTotals = {
  plannedMinutes: number;
  reportedMinutes: number;
  effectiveMinutes: number;
  differenceMinutes: number;
};

export type MyHoursResponse = {
  from: string;
  to: string;
  employeeUuid: string;
  days: WorkHoursDay[];
  totals: WorkHoursTotals;
};

export type EmployeeHoursItem = {
  employeeUuid: string;
  employeeName: string;
  days: WorkHoursDay[];
  totals: WorkHoursTotals;
};

export type EmployeeHoursResponse = {
  from: string;
  to: string;
  items: EmployeeHoursItem[];
  totals: WorkHoursTotals;
};
