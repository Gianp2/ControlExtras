export interface AttendanceRecord {
  id: string;
  rawRowNumber: number;
  employeeName: string;
  legajo: string;
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM/YYYY
  dayName: string;
  entryRaw: string;
  exitRaw: string;
  entryMinutes: number | null;
  exitMinutes: number | null;
  entryRoundedStr: string;
  exitRoundedStr: string;
  durationMinutes: number;
  isValid: boolean;
  errorReason?: string;
}

export interface DayInterval {
  entryRaw: string;
  exitRaw: string;
  entryMinutes: number;
  exitMinutes: number;
  entryFormatted: string;
  exitFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
}

export type DayStatus = 'normal' | 'overtime' | 'incomplete' | 'error' | 'no_work';

export interface DailySummary {
  date: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM/YYYY
  dayName: string;
  firstEntryMinutes: number | null;
  firstEntryFormatted: string;
  normalWorkdayEndMinutes: number | null;
  normalWorkdayEndFormatted: string;
  lastExitMinutes: number | null;
  lastExitFormatted: string;
  intervals: DayInterval[];
  rawIntervalsCount: number;
  totalWorkedMinutes: number;
  totalWorkedFormatted: string;
  normalMinutes: number;
  normalFormatted: string;
  overtimeMinutes: number;
  overtimeFormatted: string;
  status: DayStatus;
  hasOvertime: boolean;
  hasErrors: boolean;
  errorNotes: string[];
}

export interface Employee {
  id: string;
  name: string;
  legajo: string;
}

export type EmployeeStatus = 'normal' | 'with_overtime' | 'with_errors';

export interface EmployeeSummary {
  employee: Employee;
  dailyRecords: DailySummary[];
  totalDaysWorked: number;
  totalDaysWithOvertime: number;
  totalDaysWithErrors: number;
  totalWorkedMinutes: number;
  totalWorkedFormatted: string;
  totalNormalMinutes: number;
  totalNormalFormatted: string;
  totalOvertimeMinutes: number;
  totalOvertimeFormatted: string;
  status: EmployeeStatus;
}

export type ValidationErrorType =
  | 'missing_entry'
  | 'missing_exit'
  | 'invalid_date'
  | 'invalid_time'
  | 'entry_after_exit'
  | 'duplicate_record'
  | 'no_legajo'
  | 'incomplete_block'
  | 'empty_row'
  | 'format_warning';

export interface ValidationError {
  id: string;
  rowNumber: number;
  employeeName?: string;
  legajo?: string;
  date?: string;
  type: ValidationErrorType;
  message: string;
  severity: 'warning' | 'error';
}

export interface ImportResult {
  fileName: string;
  fileSizeBytes: number;
  importDate: Date;
  periodText?: string;
  companyName?: string;
  employees: EmployeeSummary[];
  allRecords: AttendanceRecord[];
  errors: ValidationError[];
  rawSheetNames: string[];
  metadata: {
    totalRowsProcessed: number;
    parsedEmployeesCount: number;
    totalDaysCount: number;
    totalOvertimeHoursStr: string;
    totalWorkedHoursStr: string;
  };
}

export interface FilterOptions {
  searchQuery: string;
  statusTab: 'all' | 'with_overtime' | 'without_overtime' | 'with_errors';
  startDate?: string;
  endDate?: string;
  sortBy: 'name' | 'legajo' | 'workedHours' | 'overtimeHours' | 'days';
  sortOrder: 'asc' | 'desc';
}
