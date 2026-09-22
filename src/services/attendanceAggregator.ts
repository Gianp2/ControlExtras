import {
  AttendanceRecord,
  DailySummary,
  DayInterval,
  DayStatus,
  Employee,
  EmployeeStatus,
  EmployeeSummary,
  ImportResult,
  ValidationError,
} from '../types';
import { calculateDailyMetrics, getStandardWorkdayForDay, minutesToTimeString } from '../utils/timeCalculations';
import { RawParseResult } from './excelParser';

/**
 * Aggregates raw attendance punch records by employee and by date.
 * Strictly computes worked hours, normal hours, and overtime hours.
 */
export function aggregateAttendanceData(
  rawResult: RawParseResult,
  fileName: string,
  fileSizeBytes: number,
): ImportResult {
  const { records, errors, companyName, periodText, rawSheetNames, totalRowsScanned } = rawResult;

  // 1. Pass 1: Build bidirectional lookup maps between names and legajos across all records
  const nameToLegajo = new Map<string, string>();
  const legajoToName = new Map<string, string>();

  for (const rec of records) {
    const rawLeg = (rec.legajo || '').trim();
    const rawName = (rec.employeeName || '').trim();
    const normName = rawName.toUpperCase().replace(/\s+/g, ' ');
    const hasValidLegajo = rawLeg && rawLeg !== 'S/L' && rawLeg !== '0' && /\d/.test(rawLeg);
    const hasValidName = rawName && !rawName.toLowerCase().startsWith('empleado sin nombre') && rawName.length >= 3;

    if (hasValidLegajo && hasValidName) {
      if (!nameToLegajo.has(normName)) {
        nameToLegajo.set(normName, rawLeg);
      }
      if (!legajoToName.has(rawLeg) || rawName.length > legajoToName.get(rawLeg)!.length) {
        legajoToName.set(rawLeg, rawName);
      }
    }
  }

  // 2. Pass 2: Reconcile records and group by canonical employee key
  const employeeMap = new Map<string, { employee: Employee; records: AttendanceRecord[] }>();

  for (const rec of records) {
    let cleanLeg = (rec.legajo || '').trim();
    let cleanName = (rec.employeeName || '').trim();
    const normName = cleanName.toUpperCase().replace(/\s+/g, ' ');

    // Reconcile missing legajo from known employee name
    if ((!cleanLeg || cleanLeg === 'S/L' || cleanLeg === '0') && nameToLegajo.has(normName)) {
      cleanLeg = nameToLegajo.get(normName)!;
      rec.legajo = cleanLeg;
    }

    // Reconcile missing or generic name from known legajo
    if ((!cleanName || cleanName.toLowerCase().startsWith('empleado sin nombre') || cleanName.toLowerCase().startsWith('empleado ')) && legajoToName.has(cleanLeg)) {
      cleanName = legajoToName.get(cleanLeg)!;
      rec.employeeName = cleanName;
    }

    const hasRealLegajo = cleanLeg && cleanLeg !== 'S/L' && cleanLeg !== '0' && /\d/.test(cleanLeg);
    const key = hasRealLegajo ? `EMP_${cleanLeg}` : `NAME_${cleanName.toUpperCase().replace(/\s+/g, ' ')}`;

    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        employee: {
          id: key,
          name: cleanName || (hasRealLegajo ? `Empleado ${cleanLeg}` : 'Empleado Sin Nombre'),
          legajo: cleanLeg || 'S/L',
        },
        records: [],
      });
    } else {
      const existing = employeeMap.get(key)!;
      // If current name is more descriptive, keep it
      if (cleanName && cleanName.length > existing.employee.name.length && !cleanName.toLowerCase().startsWith('empleado ')) {
        existing.employee.name = cleanName;
      }
      if (hasRealLegajo && (existing.employee.legajo === 'S/L' || !existing.employee.legajo)) {
        existing.employee.legajo = cleanLeg;
      }
    }
    employeeMap.get(key)!.records.push(rec);
  }

  const employeeSummaries: EmployeeSummary[] = [];
  let globalWorkedMinutes = 0;
  let globalOvertimeMinutes = 0;
  const allUniqueDates = new Set<string>();

  // 2. Process each employee
  for (const [, empData] of employeeMap) {
    const { employee, records: empRecords } = empData;

    // Group records by date (YYYY-MM-DD)
    const dateMap = new Map<string, AttendanceRecord[]>();
    for (const rec of empRecords) {
      if (!dateMap.has(rec.dateStr)) {
        dateMap.set(rec.dateStr, []);
      }
      dateMap.get(rec.dateStr)!.push(rec);
      allUniqueDates.add(rec.dateStr);
    }

    // Sort dates chronologically
    const sortedDates = Array.from(dateMap.keys()).sort();
    const dailySummaries: DailySummary[] = [];

    let empWorkedMinutes = 0;
    let empNormalMinutes = 0;
    let empOvertimeMinutes = 0;
    let daysWithOvertimeCount = 0;
    let daysWithErrorsCount = 0;

    for (const dateStr of sortedDates) {
      const dayRecs = dateMap.get(dateStr)!;
      const firstRec = dayRecs[0];
      const formattedDate = firstRec.formattedDate;
      const dayName = firstRec.dayName;

      // Collect all intervals and punches for this day
      const rawPunches: { minutes: number; raw: string; formatted: string }[] = [];
      const intervals: DayInterval[] = [];
      let dayWorkedMinutes = 0;

      // 1. Check for already paired intervals or collect single punches
      for (const r of dayRecs) {
        if (r.entryMinutes !== null && r.exitMinutes !== null && r.exitMinutes >= r.entryMinutes) {
          const duration = r.durationMinutes > 0 ? r.durationMinutes : (r.exitMinutes - r.entryMinutes);
          if (duration > 0) {
            dayWorkedMinutes += duration;
          }
          intervals.push({
            entryRaw: r.entryRaw,
            exitRaw: r.exitRaw,
            entryMinutes: r.entryMinutes,
            exitMinutes: r.exitMinutes,
            entryFormatted: r.entryRoundedStr || minutesToTimeString(r.entryMinutes, false),
            exitFormatted: r.exitRoundedStr || minutesToTimeString(r.exitMinutes, false),
            durationMinutes: duration,
            durationFormatted: minutesToTimeString(duration),
          });
        } else if (r.entryMinutes !== null) {
          rawPunches.push({
            minutes: r.entryMinutes,
            raw: r.entryRaw,
            formatted: r.entryRoundedStr || minutesToTimeString(r.entryMinutes, false),
          });
        }
      }

      // 2. If there were single punches on separate rows, pair them chronologically
      if (rawPunches.length >= 2 && intervals.length === 0) {
        // Sort chronologically
        rawPunches.sort((a, b) => a.minutes - b.minutes);

        for (let p = 0; p < rawPunches.length; p += 2) {
          const pEntry = rawPunches[p];
          const pExit = rawPunches[p + 1];

          if (pExit) {
            const dur = Math.max(0, pExit.minutes - pEntry.minutes);
            dayWorkedMinutes += dur;
            intervals.push({
              entryRaw: pEntry.raw,
              exitRaw: pExit.raw,
              entryMinutes: pEntry.minutes,
              exitMinutes: pExit.minutes,
              entryFormatted: pEntry.formatted,
              exitFormatted: pExit.formatted,
              durationMinutes: dur,
              durationFormatted: minutesToTimeString(dur),
            });
          }
        }
      }

      // Filter out redundant 0-minute duplicate taps (e.g. 14:09 - 14:09) if the day has productive working intervals
      const productiveIntervals = intervals.filter(i => i.durationMinutes > 0);
      const cleanIntervals = productiveIntervals.length > 0 ? productiveIntervals : intervals;

      // Determine first entry and last exit of the day
      let firstEntryMinutes: number | null = null;
      let firstEntryFormatted = '--:--';
      let lastExitMinutes: number | null = null;
      let lastExitFormatted = '--:--';

      if (cleanIntervals.length > 0) {
        const allEntries = cleanIntervals.map(i => i.entryMinutes);
        const allExits = cleanIntervals.map(i => i.exitMinutes);
        firstEntryMinutes = Math.min(...allEntries);
        firstEntryFormatted = minutesToTimeString(firstEntryMinutes, false);
        lastExitMinutes = Math.max(...allExits);
        lastExitFormatted = minutesToTimeString(lastExitMinutes, false);
      } else if (rawPunches.length > 0) {
        firstEntryMinutes = rawPunches[0].minutes;
        firstEntryFormatted = rawPunches[0].formatted;
      }

      // Determine legal standard hours for this day:
      // Mon-Thu: 9h (540 mins)
      // Friday: 8h (480 mins)
      // Sat/Sun: 100% overtime
      const dayRule = getStandardWorkdayForDay(dayName || dateStr);

      // Calculate daily metrics:
      const metrics = calculateDailyMetrics(
        firstEntryMinutes,
        lastExitMinutes,
        dayWorkedMinutes,
        dayRule.standardMinutes,
        dayRule.isWeekend,
      );

      let dayStatus: DayStatus = 'normal';
      if (metrics.hasOvertime) {
        dayStatus = 'overtime';
        daysWithOvertimeCount++;
      } else if (cleanIntervals.length === 0 && rawPunches.length === 1) {
        dayStatus = 'incomplete';
        daysWithErrorsCount++;
      }

      empWorkedMinutes += dayWorkedMinutes;
      empNormalMinutes += metrics.normalMinutes;
      empOvertimeMinutes += metrics.overtimeMinutes;

      dailySummaries.push({
        date: dateStr,
        formattedDate,
        dayName,
        firstEntryMinutes,
        firstEntryFormatted,
        normalWorkdayEndMinutes: metrics.normalWorkdayEndMinutes,
        normalWorkdayEndFormatted: metrics.normalWorkdayEndFormatted,
        lastExitMinutes,
        lastExitFormatted,
        intervals: cleanIntervals,
        rawIntervalsCount: dayRecs.length,
        totalWorkedMinutes: dayWorkedMinutes,
        totalWorkedFormatted: minutesToTimeString(dayWorkedMinutes),
        normalMinutes: metrics.normalMinutes,
        normalFormatted: metrics.normalFormatted,
        overtimeMinutes: metrics.overtimeMinutes,
        overtimeFormatted: metrics.overtimeFormatted,
        status: dayStatus,
        hasOvertime: metrics.hasOvertime,
        hasErrors: cleanIntervals.length === 0 && rawPunches.length === 1,
        errorNotes: cleanIntervals.length === 0 && rawPunches.length === 1 ? [`Fichada única: ${rawPunches[0].formatted} (sin salida)`] : [],
      });
    }

    // Status: No hay límite de horas extras; se clasifica claramente en 'with_overtime' o 'normal'
    const empStatus: EmployeeStatus = empOvertimeMinutes > 0 ? 'with_overtime' : 'normal';

    globalWorkedMinutes += empWorkedMinutes;
    globalOvertimeMinutes += empOvertimeMinutes;

    employeeSummaries.push({
      employee,
      dailyRecords: dailySummaries,
      totalDaysWorked: dailySummaries.length,
      totalDaysWithOvertime: daysWithOvertimeCount,
      totalDaysWithErrors: daysWithErrorsCount,
      totalWorkedMinutes: empWorkedMinutes,
      totalWorkedFormatted: minutesToTimeString(empWorkedMinutes),
      totalNormalMinutes: empNormalMinutes,
      totalNormalFormatted: minutesToTimeString(empNormalMinutes),
      totalOvertimeMinutes: empOvertimeMinutes,
      totalOvertimeFormatted: minutesToTimeString(empOvertimeMinutes),
      status: empStatus,
    });
  }

  // Sort employees by name alphabetically by default
  employeeSummaries.sort((a, b) => a.employee.name.localeCompare(b.employee.name));

  return {
    fileName,
    fileSizeBytes,
    importDate: new Date(),
    periodText,
    companyName,
    employees: employeeSummaries,
    allRecords: records,
    errors,
    rawSheetNames,
    metadata: {
      totalRowsProcessed: totalRowsScanned,
      parsedEmployeesCount: employeeSummaries.length,
      totalDaysCount: allUniqueDates.size,
      totalWorkedHoursStr: minutesToTimeString(globalWorkedMinutes),
      totalOvertimeHoursStr: minutesToTimeString(globalOvertimeMinutes),
    },
  };
}
