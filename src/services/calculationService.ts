/**
 * Calculation Service for HR Attendance and Overtime.
 * Strictly adheres to the business rules:
 * 1. Standard flexible workday = 9 hours (540 minutes).
 *    Normal shift end = first entry of the day + 9 hours.
 * 2. Mandatory :59 rounding rule:
 *    Any time ending with minute :59 is rounded up to minute :00 of the following hour
 *    (e.g., 17:59 -> 18:00, 16:59 -> 17:00, 07:59 -> 08:00).
 * 3. Processing multiple intervals per day:
 *    Sums all valid intervals (e.g. morning + afternoon), extracts the day's first entry
 *    and last exit, calculates total worked time, and determines overtime when total worked > 9h.
 * 4. Includes an automated test suite verifying all required test cases.
 */

export const STANDARD_WORKDAY_HOURS_MON_THU = 9;
export const STANDARD_WORKDAY_MINUTES_MON_THU = 9 * 60; // 540 minutes
export const STANDARD_WORKDAY_HOURS_FRIDAY = 8;
export const STANDARD_WORKDAY_MINUTES_FRIDAY = 8 * 60; // 480 minutes

// Backward compatible aliases
export const STANDARD_WORKDAY_HOURS = 9;
export const STANDARD_WORKDAY_MINUTES = STANDARD_WORKDAY_HOURS * 60; // 540 minutes

export interface RoundedTime {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
  wasRounded59: boolean;
}

export interface RawIntervalInput {
  entry: string | number | null | undefined;
  exit: string | number | null | undefined;
  id?: string;
}

export interface ProcessedInterval {
  entryRaw: string;
  exitRaw: string;
  entryMinutes: number;
  exitMinutes: number;
  entryFormatted: string;
  exitFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
  isValid: boolean;
  errorReason?: string;
}

export interface DayCalculationResult {
  firstEntryMinutes: number | null;
  firstEntryFormatted: string;
  normalWorkdayEndMinutes: number | null;
  normalWorkdayEndFormatted: string;
  lastExitMinutes: number | null;
  lastExitFormatted: string;
  validIntervals: ProcessedInterval[];
  invalidIntervals: ProcessedInterval[];
  totalWorkedMinutes: number;
  totalWorkedFormatted: string;
  normalMinutes: number;
  normalFormatted: string;
  overtimeMinutes: number;
  overtimeFormatted: string;
  hasOvertime: boolean;
  hasErrors: boolean;
  errorNotes: string[];
}

/**
 * Applies the mandatory :59 rounding rule.
 * If minutes == 59, rounds up to :00 of the next hour.
 */
export function applyRounding59(hours: number, minutes: number): RoundedTime {
  let h = hours;
  let m = minutes;
  let wasRounded = false;

  if (m === 59) {
    m = 0;
    h = h + 1;
    wasRounded = true;
  }

  const totalMinutes = h * 60 + m;
  const formatted = `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return {
    hours: h,
    minutes: m,
    totalMinutes,
    formatted,
    wasRounded59: wasRounded,
  };
}

/**
 * Converts integer minutes into "HH:MM" string.
 * Optionally allows hours >= 24 for accumulated totals.
 */
export function minutesToTimeString(totalMinutes: number | null | undefined, allowOver24: boolean = true): string {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes) || totalMinutes < 0) {
    return '00:00';
  }

  const roundedTotal = Math.round(totalMinutes);
  const hours = Math.floor(roundedTotal / 60);
  const mins = roundedTotal % 60;

  if (!allowOver24 && hours >= 24) {
    const modHours = hours % 24;
    return `${String(modHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Parses any time representation (HH:MM string, Date, Excel decimal) and applies :59 rounding.
 */
export function parseAndRoundTime(val: unknown): { totalMinutes: number; formatted: string; raw: string; wasRounded59: boolean } | null {
  if (val === null || val === undefined || val === '') {
    return null;
  }

  const rawStr = String(val).trim();

  // 1. Number: fraction of a day (Excel time serial)
  if (typeof val === 'number') {
    if (val >= 0 && val < 1) {
      const totalSeconds = Math.round(val * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const rounded = applyRounding59(hours, minutes);
      return {
        totalMinutes: rounded.totalMinutes,
        formatted: rounded.formatted,
        raw: rawStr,
        wasRounded59: rounded.wasRounded59,
      };
    } else if (val >= 1) {
      const frac = val - Math.floor(val);
      if (frac > 0) {
        const totalSeconds = Math.round(frac * 86400);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const rounded = applyRounding59(hours, minutes);
        return {
          totalMinutes: rounded.totalMinutes,
          formatted: rounded.formatted,
          raw: rawStr,
          wasRounded59: rounded.wasRounded59,
        };
      }
    }
  }

  // 2. Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const hours = val.getHours();
    const minutes = val.getMinutes();
    const rounded = applyRounding59(hours, minutes);
    return {
      totalMinutes: rounded.totalMinutes,
      formatted: rounded.formatted,
      raw: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      wasRounded59: rounded.wasRounded59,
    };
  }

  // 3. String: "HH:MM", "H:MM", "HH:MM:SS", "HH.MM"
  const normalizedStr = rawStr.replace('.', ':');
  const timeRegex = /(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;
  const match = normalizedStr.match(timeRegex);

  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }

  const rounded = applyRounding59(hours, minutes);
  return {
    totalMinutes: rounded.totalMinutes,
    formatted: rounded.formatted,
    raw: rawStr,
    wasRounded59: rounded.wasRounded59,
  };
}

/**
 * Calculates metrics for a day given first entry, last exit, total worked minutes,
 * and day of week or isWeekend flag.
 *
 * Rules:
 * - Monday to Friday: Standard workday = 9 hours (540 mins).
 *   Work after 9 hours worked counts as overtime.
 * - Saturdays & Sundays: 100% of all worked hours count directly as overtime (0 normal hours).
 */
/**
 * Truncates overtime minutes to whole integer hours (rounding down).
 * Example: 03:03 (183 mins) -> 3 hs (180 mins), 02:15 (135 mins) -> 2 hs (120 mins), 00:45 -> 0 hs.
 */
export function truncateOvertimeToHours(rawMinutes: number): number {
  if (rawMinutes <= 0) return 0;
  const hours = Math.floor(rawMinutes / 60);
  return hours * 60;
}

/**
 * Calculates daily metrics for attendance based on legal workday rules:
 * - Mon to Thu: Standard legal workday = 9 hours (540 mins).
 * - Friday: Standard legal workday = 8 hours (480 mins).
 * - Saturdays & Sundays: 100% of worked hours count directly as overtime.
 * - Overtime hours are rounded down to full integer hours (e.g., 03:03 -> 3 hs, 02:15 -> 2 hs).
 */
export function calculateDailyMetrics(
  firstEntryMinutes: number | null,
  lastExitMinutes: number | null,
  totalWorkedMinutes: number,
  standardMinutes: number = STANDARD_WORKDAY_MINUTES,
  isWeekend: boolean = false,
): {
  normalWorkdayEndMinutes: number | null;
  normalWorkdayEndFormatted: string;
  overtimeMinutes: number;
  overtimeFormatted: string;
  normalMinutes: number;
  normalFormatted: string;
  hasOvertime: boolean;
} {
  if (firstEntryMinutes === null || lastExitMinutes === null || totalWorkedMinutes <= 0) {
    return {
      normalWorkdayEndMinutes: null,
      normalWorkdayEndFormatted: '--:--',
      overtimeMinutes: 0,
      overtimeFormatted: '00:00',
      normalMinutes: 0,
      normalFormatted: '00:00',
      hasOvertime: false,
    };
  }

  // Si es fin de semana (Sábado o Domingo): TODO el tiempo trabajado es hora extra directa
  // Redondeado hacia abajo a horas enteras (ej: 03:03 -> 3 hs)
  if (isWeekend) {
    const roundedOvertime = truncateOvertimeToHours(totalWorkedMinutes);
    return {
      normalWorkdayEndMinutes: firstEntryMinutes,
      normalWorkdayEndFormatted: 'Fin de Semana (100% Extras)',
      overtimeMinutes: roundedOvertime,
      overtimeFormatted: minutesToTimeString(roundedOvertime),
      normalMinutes: 0,
      normalFormatted: '00:00',
      hasOvertime: roundedOvertime > 0,
    };
  }

  // Lunes a Viernes: Jornada normal flexible (9h Lun-Jue, 8h Vie)
  const normalWorkdayEndMinutes = firstEntryMinutes + standardMinutes;
  const normalWorkdayEndFormatted = minutesToTimeString(normalWorkdayEndMinutes, false);

  let rawOvertimeMinutes = 0;
  if (totalWorkedMinutes > standardMinutes) {
    rawOvertimeMinutes = totalWorkedMinutes - standardMinutes;
  }

  // Redondeo de horas extras hacia abajo a horas enteras
  const overtimeMinutes = truncateOvertimeToHours(rawOvertimeMinutes);
  const normalMinutes = Math.min(standardMinutes, totalWorkedMinutes);

  return {
    normalWorkdayEndMinutes,
    normalWorkdayEndFormatted,
    overtimeMinutes,
    overtimeFormatted: minutesToTimeString(overtimeMinutes),
    normalMinutes,
    normalFormatted: minutesToTimeString(normalMinutes),
    hasOvertime: overtimeMinutes > 0,
  };
}

/**
 * Helper to check if a dayName or date is weekend (Saturday or Sunday)
 */
export function isWeekendDay(dayNameOrDate: string): boolean {
  if (!dayNameOrDate) return false;
  const lower = dayNameOrDate.toLowerCase().trim();
  if (
    lower.includes('sábado') ||
    lower.includes('sabado') ||
    lower.includes('domingo') ||
    lower.startsWith('sáb') ||
    lower.startsWith('sab') ||
    lower.startsWith('dom')
  ) {
    return true;
  }
  // Check if date string
  if (dayNameOrDate.includes('-') || dayNameOrDate.includes('/')) {
    const dStr = dayNameOrDate.replace(/\//g, '-');
    const parts = dStr.split('-');
    let d: Date | null = null;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      if (d && !isNaN(d.getTime())) {
        const dayOfWeek = d.getDay();
        return dayOfWeek === 6 || dayOfWeek === 0; // 6 = Saturday, 0 = Sunday
      }
    }
  }
  return false;
}

/**
 * Helper to check if a dayName or date is Friday (Viernes)
 */
export function isFridayDay(dayNameOrDate: string): boolean {
  if (!dayNameOrDate) return false;
  const lower = dayNameOrDate.toLowerCase().trim();
  if (lower.includes('viernes') || lower.startsWith('vie')) {
    return true;
  }
  // Check if date string
  if (dayNameOrDate.includes('-') || dayNameOrDate.includes('/')) {
    const dStr = dayNameOrDate.replace(/\//g, '-');
    const parts = dStr.split('-');
    let d: Date | null = null;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
      if (d && !isNaN(d.getTime())) {
        return d.getDay() === 5; // 5 = Friday
      }
    }
  }
  return false;
}

/**
 * Determines the standard legal workday minutes and weekend status based on day or date.
 * - Monday to Thursday: 9 legal hours (540 minutes)
 * - Friday: 8 legal hours (480 minutes)
 * - Saturday & Sunday: 0 legal hours, 100% overtime
 */
export function getStandardWorkdayForDay(dayNameOrDate: string): {
  standardMinutes: number;
  standardHoursLabel: string;
  isWeekend: boolean;
  isFriday: boolean;
} {
  const isWeekend = isWeekendDay(dayNameOrDate);
  if (isWeekend) {
    return {
      standardMinutes: 0,
      standardHoursLabel: 'Fin de Semana (100% Extras)',
      isWeekend: true,
      isFriday: false,
    };
  }

  const isFriday = isFridayDay(dayNameOrDate);
  if (isFriday) {
    return {
      standardMinutes: STANDARD_WORKDAY_MINUTES_FRIDAY, // 480 mins (8h)
      standardHoursLabel: '8h (Viernes)',
      isWeekend: false,
      isFriday: true,
    };
  }

  return {
    standardMinutes: STANDARD_WORKDAY_MINUTES_MON_THU, // 540 mins (9h)
    standardHoursLabel: '9h (Lunes a Jueves)',
    isWeekend: false,
    isFriday: false,
  };
}

/**
 * Core processor for multiple intervals on a single day.
 * Applies rounding, validates order, calculates total worked, normal, and overtime hours.
 */
export function processDayIntervals(
  intervals: RawIntervalInput[],
  standardMinutes: number = STANDARD_WORKDAY_MINUTES,
  isWeekend: boolean = false,
): DayCalculationResult {
  const validIntervals: ProcessedInterval[] = [];
  const invalidIntervals: ProcessedInterval[] = [];
  const errorNotes: string[] = [];

  let totalWorkedMinutes = 0;

  for (const raw of intervals) {
    const entryParsed = parseAndRoundTime(raw.entry);
    const exitParsed = parseAndRoundTime(raw.exit);

    const entryRawStr = raw.entry !== null && raw.entry !== undefined ? String(raw.entry) : '';
    const exitRawStr = raw.exit !== null && raw.exit !== undefined ? String(raw.exit) : '';

    if (!entryParsed && !exitParsed) {
      continue; // empty row
    }

    if (!entryParsed) {
      const err = `Falta fichada de entrada (salida: ${exitRawStr || '--:--'})`;
      errorNotes.push(err);
      invalidIntervals.push({
        entryRaw: entryRawStr,
        exitRaw: exitRawStr,
        entryMinutes: -1,
        exitMinutes: exitParsed ? exitParsed.totalMinutes : -1,
        entryFormatted: '--:--',
        exitFormatted: exitParsed ? exitParsed.formatted : '--:--',
        durationMinutes: 0,
        durationFormatted: '00:00',
        isValid: false,
        errorReason: err,
      });
      continue;
    }

    if (!exitParsed) {
      const err = `Falta fichada de salida (entrada: ${entryRawStr || '--:--'})`;
      errorNotes.push(err);
      invalidIntervals.push({
        entryRaw: entryRawStr,
        exitRaw: exitRawStr,
        entryMinutes: entryParsed.totalMinutes,
        exitMinutes: -1,
        entryFormatted: entryParsed.formatted,
        exitFormatted: '--:--',
        durationMinutes: 0,
        durationFormatted: '00:00',
        isValid: false,
        errorReason: err,
      });
      continue;
    }

    // Both are present, validate chronological order
    if (entryParsed.totalMinutes > exitParsed.totalMinutes) {
      const err = `Entrada (${entryParsed.formatted}) posterior a salida (${exitParsed.formatted})`;
      errorNotes.push(err);
      invalidIntervals.push({
        entryRaw: entryRawStr,
        exitRaw: exitRawStr,
        entryMinutes: entryParsed.totalMinutes,
        exitMinutes: exitParsed.totalMinutes,
        entryFormatted: entryParsed.formatted,
        exitFormatted: exitParsed.formatted,
        durationMinutes: 0,
        durationFormatted: '00:00',
        isValid: false,
        errorReason: err,
      });
      continue;
    }

    const duration = exitParsed.totalMinutes - entryParsed.totalMinutes;
    if (duration > 0) {
      totalWorkedMinutes += duration;
    }

    validIntervals.push({
      entryRaw: entryRawStr,
      exitRaw: exitRawStr,
      entryMinutes: entryParsed.totalMinutes,
      exitMinutes: exitParsed.totalMinutes,
      entryFormatted: entryParsed.formatted,
      exitFormatted: exitParsed.formatted,
      durationMinutes: duration,
      durationFormatted: minutesToTimeString(duration),
      isValid: true,
    });
  }

  // Sort valid intervals by entry time
  validIntervals.sort((a, b) => a.entryMinutes - b.entryMinutes);

  let firstEntryMinutes: number | null = null;
  let firstEntryFormatted = '--:--';
  let lastExitMinutes: number | null = null;
  let lastExitFormatted = '--:--';

  if (validIntervals.length > 0) {
    firstEntryMinutes = validIntervals[0].entryMinutes;
    firstEntryFormatted = minutesToTimeString(firstEntryMinutes, false);

    lastExitMinutes = Math.max(...validIntervals.map((i) => i.exitMinutes));
    lastExitFormatted = minutesToTimeString(lastExitMinutes, false);
  }

  const metrics = calculateDailyMetrics(
    firstEntryMinutes,
    lastExitMinutes,
    totalWorkedMinutes,
    standardMinutes,
    isWeekend,
  );

  return {
    firstEntryMinutes,
    firstEntryFormatted,
    normalWorkdayEndMinutes: metrics.normalWorkdayEndMinutes,
    normalWorkdayEndFormatted: metrics.normalWorkdayEndFormatted,
    lastExitMinutes,
    lastExitFormatted,
    validIntervals,
    invalidIntervals,
    totalWorkedMinutes,
    totalWorkedFormatted: minutesToTimeString(totalWorkedMinutes),
    normalMinutes: metrics.normalMinutes,
    normalFormatted: metrics.normalFormatted,
    overtimeMinutes: metrics.overtimeMinutes,
    overtimeFormatted: metrics.overtimeFormatted,
    hasOvertime: metrics.hasOvertime,
    hasErrors: invalidIntervals.length > 0 || errorNotes.length > 0,
    errorNotes,
  };
}

/**
 * Automated Verification & Test Suite for Calculations.
 * Validates business rules against real-world test cases.
 */
export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  input: any;
  expected: {
    workedHours: string;
    normalHours: string;
    overtimeHours: string;
    normalEnd?: string;
  };
  actual: {
    workedHours: string;
    normalHours: string;
    overtimeHours: string;
    normalEnd?: string;
  };
  passed: boolean;
  details?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  allPassed: boolean;
  results: TestCaseResult[];
}

export function runCalculationTests(): TestSuiteSummary {
  const tests: TestCaseResult[] = [];

  // Test Case 1: Entrada 07:00, Salida 17:00 (Jornada normal 16:00, 10h trabajadas, 01:00 extra)
  (() => {
    const res = processDayIntervals([{ entry: '07:00', exit: '17:00' }]);
    const passed =
      res.totalWorkedFormatted === '10:00' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '01:00' &&
      res.normalWorkdayEndFormatted === '16:00';

    tests.push({
      id: 'TC-01',
      name: '07:00 a 17:00 (1h Extra)',
      description: 'Entrada 07:00, Salida 17:00 -> Jornada normal termina 16:00, 10h trabajadas, 1h extra.',
      input: [{ entry: '07:00', exit: '17:00' }],
      expected: { workedHours: '10:00', normalHours: '09:00', overtimeHours: '01:00', normalEnd: '16:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 2: Entrada 07:00, Salida 16:00 (Jornada normal 16:00, 9h trabajadas, 00:00 extra)
  (() => {
    const res = processDayIntervals([{ entry: '07:00', exit: '16:00' }]);
    const passed =
      res.totalWorkedFormatted === '09:00' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '00:00' &&
      res.normalWorkdayEndFormatted === '16:00';

    tests.push({
      id: 'TC-02',
      name: '07:00 a 16:00 (Exactas 9h)',
      description: 'Entrada 07:00, Salida 16:00 -> Jornada normal exacta de 9h, 0h extras.',
      input: [{ entry: '07:00', exit: '16:00' }],
      expected: { workedHours: '09:00', normalHours: '09:00', overtimeHours: '00:00', normalEnd: '16:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 3: Entrada 06:56, Salida 17:00 (Jornada normal 15:56, 10h 04m trabajadas, 01:04 bruto -> 01:00 extra redondeado)
  (() => {
    const res = processDayIntervals([{ entry: '06:56', exit: '17:00' }]);
    const passed =
      res.totalWorkedFormatted === '10:04' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '01:00' &&
      res.normalWorkdayEndFormatted === '15:56';

    tests.push({
      id: 'TC-03',
      name: '06:56 a 17:00 (Minutos extras redondeados a horas)',
      description: 'Entrada 06:56 + 9h = 15:56 fin normal. Salida 17:00 -> 1h 04m bruto se redondea a 1h extra.',
      input: [{ entry: '06:56', exit: '17:00' }],
      expected: { workedHours: '10:04', normalHours: '09:00', overtimeHours: '01:00', normalEnd: '15:56' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 4: Entrada 08:00, Salida 16:59 (Redondeo :59 a 17:00 -> 9h trabajadas, 00:00 extra)
  (() => {
    const res = processDayIntervals([{ entry: '08:00', exit: '16:59' }]);
    const passed =
      res.totalWorkedFormatted === '09:00' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '00:00' &&
      res.lastExitFormatted === '17:00';

    tests.push({
      id: 'TC-04',
      name: '08:00 a 16:59 (Redondeo :59 a 17:00)',
      description: 'Salida 16:59 redondeada a 17:00. Total trabajado 09:00, extras 00:00.',
      input: [{ entry: '08:00', exit: '16:59' }],
      expected: { workedHours: '09:00', normalHours: '09:00', overtimeHours: '00:00', normalEnd: '17:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 5: Redondeo individual :59
  (() => {
    const r1 = parseAndRoundTime('17:59');
    const r2 = parseAndRoundTime('07:59');
    const r3 = parseAndRoundTime('16:59');
    const passed =
      r1?.formatted === '18:00' &&
      r2?.formatted === '08:00' &&
      r3?.formatted === '17:00';

    tests.push({
      id: 'TC-05',
      name: 'Verificación de Redondeos :59',
      description: '17:59 -> 18:00, 07:59 -> 08:00, 16:59 -> 17:00.',
      input: ['17:59', '07:59', '16:59'],
      expected: { workedHours: '18:00', normalHours: '08:00', overtimeHours: '17:00' },
      actual: {
        workedHours: r1?.formatted || '',
        normalHours: r2?.formatted || '',
        overtimeHours: r3?.formatted || '',
      },
      passed,
    });
  })();

  // Test Case 6: Múltiples tramos en el mismo día (08:00-12:00 y 13:00-19:00 -> 10h trabajadas, 1h extra)
  (() => {
    const res = processDayIntervals([
      { entry: '08:00', exit: '12:00' },
      { entry: '13:00', exit: '19:00' },
    ]);
    const passed =
      res.totalWorkedFormatted === '10:00' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '01:00' &&
      res.validIntervals.length === 2 &&
      res.firstEntryFormatted === '08:00' &&
      res.lastExitFormatted === '19:00';

    tests.push({
      id: 'TC-06',
      name: 'Múltiples tramos (Mañana + Tarde)',
      description: '08:00-12:00 (4h) + 13:00-19:00 (6h) = 10h trabajadas. Fin normal 17:00, 1h extra.',
      input: [
        { entry: '08:00', exit: '12:00' },
        { entry: '13:00', exit: '19:00' },
      ],
      expected: { workedHours: '10:00', normalHours: '09:00', overtimeHours: '01:00', normalEnd: '17:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 7: Múltiples tramos sin horas extras (07:00-11:00 y 12:00-17:00 -> 9h trabajadas, 0h extra)
  (() => {
    const res = processDayIntervals([
      { entry: '07:00', exit: '11:00' },
      { entry: '12:00', exit: '17:00' },
    ]);
    const passed =
      res.totalWorkedFormatted === '09:00' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '00:00';

    tests.push({
      id: 'TC-07',
      name: 'Múltiples tramos de 9h exactas',
      description: '07:00-11:00 (4h) + 12:00-17:00 (5h) = 9h trabajadas, 00:00 extras.',
      input: [
        { entry: '07:00', exit: '11:00' },
        { entry: '12:00', exit: '17:00' },
      ],
      expected: { workedHours: '09:00', normalHours: '09:00', overtimeHours: '00:00', normalEnd: '16:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 8: Tramos desordenados en el archivo (13:00-18:00 primero, 08:00-12:00 segundo)
  (() => {
    const res = processDayIntervals([
      { entry: '13:00', exit: '18:00' },
      { entry: '08:00', exit: '12:00' },
    ]);
    const passed =
      res.totalWorkedFormatted === '09:00' &&
      res.firstEntryFormatted === '08:00' &&
      res.lastExitFormatted === '18:00';

    tests.push({
      id: 'TC-08',
      name: 'Tramos desordenados cronológicamente',
      description: 'El sistema ordena automáticamente los tramos por hora de entrada (08:00 antes de 13:00).',
      input: [
        { entry: '13:00', exit: '18:00' },
        { entry: '08:00', exit: '12:00' },
      ],
      expected: { workedHours: '09:00', normalHours: '09:00', overtimeHours: '00:00', normalEnd: '17:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 9: Fichada con entrada posterior a salida
  (() => {
    const res = processDayIntervals([{ entry: '17:00', exit: '08:00' }]);
    const passed = res.hasErrors === true && res.validIntervals.length === 0;

    tests.push({
      id: 'TC-09',
      name: 'Validación de Entrada posterior a Salida',
      description: 'Entrada 17:00 y Salida 08:00 es detectada como inválida y registrada como error.',
      input: [{ entry: '17:00', exit: '08:00' }],
      expected: { workedHours: '00:00', normalHours: '00:00', overtimeHours: '00:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
      },
      passed,
    });
  })();

  // Test Case 10: Sábado - 100% Horas Extras directas (Entrada 08:00, Salida 13:00 -> 5h trabajadas, 5h extras, 0h normales)
  (() => {
    const res = processDayIntervals([{ entry: '08:00', exit: '13:00' }], STANDARD_WORKDAY_MINUTES, true);
    const passed =
      res.totalWorkedFormatted === '05:00' &&
      res.normalFormatted === '00:00' &&
      res.overtimeFormatted === '05:00' &&
      res.hasOvertime === true;

    tests.push({
      id: 'TC-10',
      name: 'Sábado (100% Horas Extras directas)',
      description: 'Sábado 08:00 a 13:00 (5h trabajadas) -> 0h normales, 5h extras directas todo el día.',
      input: [{ entry: '08:00', exit: '13:00', isWeekend: true }],
      expected: { workedHours: '05:00', normalHours: '00:00', overtimeHours: '05:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
      },
      passed,
    });
  })();

  // Test Case 11: Viernes - 8 Horas Legales (Entrada 08:00, Salida 18:00 -> 10h trabajadas: 8h normales, 2h extras)
  (() => {
    const res = processDayIntervals([{ entry: '08:00', exit: '18:00' }], STANDARD_WORKDAY_MINUTES_FRIDAY, false);
    const passed =
      res.totalWorkedFormatted === '10:00' &&
      res.normalFormatted === '08:00' &&
      res.overtimeFormatted === '02:00' &&
      res.normalWorkdayEndFormatted === '16:00' &&
      res.hasOvertime === true;

    tests.push({
      id: 'TC-11',
      name: 'Viernes (8 Horas Legales)',
      description: 'Viernes 08:00 a 18:00 (10h trabajadas) -> Jornada legal 8h (hasta 16:00), 2h extras.',
      input: [{ entry: '08:00', exit: '18:00', standardMinutes: 480 }],
      expected: { workedHours: '10:00', normalHours: '08:00', overtimeHours: '02:00', normalEnd: '16:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 12: Redondeo de Horas Extras 03:03 -> 3 hs (03:00)
  (() => {
    const res = processDayIntervals([{ entry: '08:00', exit: '20:03' }], STANDARD_WORKDAY_MINUTES_MON_THU, false);
    // 08:00 a 20:03 = 12h 03m trabajadas. 9h normales -> 3h 03m extra bruto -> 03:00 redondeado
    const passed =
      res.totalWorkedFormatted === '12:03' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '03:00' &&
      res.hasOvertime === true;

    tests.push({
      id: 'TC-12',
      name: 'Redondeo de Extras (03:03 → 3 hs)',
      description: '12h 03m trabajadas (9h normales + 3h 03m extras brutas) -> Se redondea a 3 horas extras (03:00).',
      input: [{ entry: '08:00', exit: '20:03' }],
      expected: { workedHours: '12:03', normalHours: '09:00', overtimeHours: '03:00', normalEnd: '17:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  // Test Case 13: Redondeo de Horas Extras 02:15 -> 2 hs (02:00)
  (() => {
    const res = processDayIntervals([{ entry: '08:00', exit: '19:15' }], STANDARD_WORKDAY_MINUTES_MON_THU, false);
    // 08:00 a 19:15 = 11h 15m trabajadas. 9h normales -> 2h 15m extra bruto -> 02:00 redondeado
    const passed =
      res.totalWorkedFormatted === '11:15' &&
      res.normalFormatted === '09:00' &&
      res.overtimeFormatted === '02:00' &&
      res.hasOvertime === true;

    tests.push({
      id: 'TC-13',
      name: 'Redondeo de Extras (02:15 → 2 hs)',
      description: '11h 15m trabajadas (9h normales + 2h 15m extras brutas) -> Se redondea a 2 horas extras (02:00).',
      input: [{ entry: '08:00', exit: '19:15' }],
      expected: { workedHours: '11:15', normalHours: '09:00', overtimeHours: '02:00', normalEnd: '17:00' },
      actual: {
        workedHours: res.totalWorkedFormatted,
        normalHours: res.normalFormatted,
        overtimeHours: res.overtimeFormatted,
        normalEnd: res.normalWorkdayEndFormatted,
      },
      passed,
    });
  })();

  const passedCount = tests.filter((t) => t.passed).length;

  return {
    total: tests.length,
    passed: passedCount,
    failed: tests.length - passedCount,
    allPassed: passedCount === tests.length,
    results: tests,
  };
}
