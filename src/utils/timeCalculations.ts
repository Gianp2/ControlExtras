/**
 * Time and Date Calculation Utilities.
 * Re-exports core calculation services and provides date formatting helpers.
 */

export {
  STANDARD_WORKDAY_HOURS,
  STANDARD_WORKDAY_MINUTES,
  STANDARD_WORKDAY_HOURS_MON_THU,
  STANDARD_WORKDAY_MINUTES_MON_THU,
  STANDARD_WORKDAY_HOURS_FRIDAY,
  STANDARD_WORKDAY_MINUTES_FRIDAY,
  applyRounding59,
  minutesToTimeString,
  parseAndRoundTime,
  truncateOvertimeToHours,
  calculateDailyMetrics,
  isWeekendDay,
  isFridayDay,
  getStandardWorkdayForDay,
  processDayIntervals,
  runCalculationTests,
} from '../services/calculationService';

export type {
  RoundedTime,
  RawIntervalInput,
  ProcessedInterval,
  DayCalculationResult,
  TestCaseResult,
  TestSuiteSummary,
} from '../services/calculationService';

export interface RoundedTimeResult {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
  wasRounded59: boolean;
}

/**
 * Calculates duration between two times in minutes.
 * Returns -1 if entry > exit (invalid order on same day).
 */
export function calculateIntervalDuration(entryMin: number, exitMin: number): number {
  if (entryMin > exitMin) {
    return -1;
  }
  return exitMin - entryMin;
}

/**
 * Returns formatted day name in Spanish from date string (YYYY-MM-DD or DD/MM/YYYY)
 */
export function getDayNameSpanish(dateInput: string): string {
  if (!dateInput) return '';

  let year: number;
  let month: number;
  let day: number;

  if (dateInput.includes('-')) {
    const parts = dateInput.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else if (dateInput.includes('/')) {
    const parts = dateInput.split('/');
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
  } else {
    return '';
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return '';

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[d.getDay()];
}

/**
 * Formats a Date or date string to standard display "DD/MM/YYYY" and ISO "YYYY-MM-DD"
 */
export function normalizeDate(val: unknown): { iso: string; formatted: string } | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return {
      iso: `${y}-${m}-${d}`,
      formatted: `${d}/${m}/${y}`,
    };
  }

  // Excel serial date number (e.g. 45507 for 03/08/2026)
  if (typeof val === 'number' && val > 30000 && val < 70000) {
    // Excel base date: 1899-12-30 due to the 1900 leap year bug
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const dateObj = new Date(excelEpoch.getTime() + Math.floor(val) * 86400000);
    const y = dateObj.getUTCFullYear();
    const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getUTCDate()).padStart(2, '0');
    return {
      iso: `${y}-${m}-${d}`,
      formatted: `${d}/${m}/${y}`,
    };
  }

  const str = String(val).trim();

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 1900) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      return {
        iso: `${year}-${mStr}-${dStr}`,
        formatted: `${dStr}/${mStr}/${year}`,
      };
    }
  }

  // Match YYYY-MM-DD
  const ymdMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      return {
        iso: `${year}-${mStr}-${dStr}`,
        formatted: `${dStr}/${mStr}/${year}`,
      };
    }
  }

  return null;
}
