import * as XLSX from 'xlsx';
import { parseAttendanceExcel } from './excelParser';
import { aggregateAttendanceData } from './attendanceAggregator';
import { ImportResult } from '../types';

/**
 * Creates an in-memory realistic HR punch card Excel workbook (.xlsx)
 * with the exact non-standard block structure requested.
 */
export function generateSampleExcelWorkbook(): Uint8Array {
  const rows: (string | number)[][] = [
    ['INDUSTRIA & LOGÍSTICA S.A.'],
    ['INFORME DE FICHADAS DE PERSONAL'],
    ['Período: 01/08/2026 al 31/08/2026'],
    [],
    // Employee 1: ACOSTA JACINTO (Legajo 1136)
    ['Empleado: ACOSTA JACINTO'],
    ['N. Legajo: 1136'],
    ['Sector: Planta y Operaciones'],
    ['Día', 'Fecha', 'Entrada', 'Salida', 'Horas'],
    ['Lunes', '03/08/2026', '07:00', '14:09', '07:09'],
    ['Lunes', '03/08/2026', '14:09', '14:09', '00:00'],
    ['Lunes', '03/08/2026', '15:50', '17:00', '01:10'],
    ['Martes', '04/08/2026', '06:56', '17:00', '10:04'],
    ['Miércoles', '05/08/2026', '07:00', '11:16', '04:16'],
    ['Miércoles', '05/08/2026', '13:55', '17:00', '03:05'],
    ['Jueves', '06/08/2026', '08:00', '16:59', '09:00'], // 16:59 -> 17:00 (9h exact, 0 extra)
    ['Viernes', '07/08/2026', '07:00', '17:59', '11:00'], // 17:59 -> 18:00 (11h worked, 2h extra)
    [],
    // Employee 2: PEREZ MARIA LAURA (Legajo 1142)
    ['Empleado: PEREZ MARIA LAURA'],
    ['N. Legajo: 1142'],
    ['Sector: Administración y Finanzas'],
    ['Día', 'Fecha', 'Entrada', 'Salida', 'Horas'],
    ['Lunes', '03/08/2026', '08:00', '17:00', '09:00'],
    ['Martes', '04/08/2026', '08:15', '18:30', '10:15'], // 08:15 + 9h = 17:15 -> 01:15 extra
    ['Miércoles', '05/08/2026', '08:00', '17:00', '09:00'],
    ['Jueves', '06/08/2026', '07:45', '18:00', '10:15'], // 07:45 + 9h = 16:45 -> 01:15 extra
    ['Viernes', '07/08/2026', '08:00', '16:00', '08:00'], // 8h worked, 0 extra
    [],
    // Employee 3: GOMEZ CARLOS ALBERTO (Legajo 1089)
    ['Empleado: GOMEZ CARLOS ALBERTO'],
    ['N. Legajo: 1089'],
    ['Sector: Mantenimiento Técnico'],
    ['Día', 'Fecha', 'Entrada', 'Salida', 'Horas'],
    ['Lunes', '03/08/2026', '06:00', '15:00', '09:00'],
    ['Martes', '04/08/2026', '06:00', '17:00', '11:00'], // 06:00 + 9h = 15:00 -> 02:00 extra
    ['Miércoles', '05/08/2026', '06:00', '12:00', '06:00'],
    ['Miércoles', '05/08/2026', '13:00', '16:00', '03:00'], // 6h + 3h = 9h total -> 0 extra
    ['Jueves', '06/08/2026', '06:00', '18:00', '12:00'], // 06:00 + 9h = 15:00 -> 03:00 extra
    ['Viernes', '07/08/2026', '06:00', '15:00', '09:00'],
    [],
    // Employee 4: RODRIGUEZ JUAN MANUEL (Legajo 1205)
    ['Empleado: RODRIGUEZ JUAN MANUEL'],
    ['N. Legajo: 1205'],
    ['Sector: Logística y Distribución'],
    ['Día', 'Fecha', 'Entrada', 'Salida', 'Horas'],
    ['Lunes', '03/08/2026', '07:30', '16:30', '09:00'],
    ['Martes', '04/08/2026', '07:30', '16:30', '09:00'],
    ['Miércoles', '05/08/2026', '07:30', '19:00', '11:30'], // 07:30 + 9h = 16:30 -> 02:30 extra
    ['Jueves', '06/08/2026', '07:30', '16:30', '09:00'],
    ['Viernes', '07/08/2026', '07:30', '17:30', '10:00'], // 01:00 extra
    [],
    // Employee 5: FERNANDEZ LAURA BEATRIZ (Legajo 1198)
    ['Empleado: FERNANDEZ LAURA BEATRIZ'],
    ['N. Legajo: 1198'],
    ['Sector: Calidad y Seguridad'],
    ['Día', 'Fecha', 'Entrada', 'Salida', 'Horas'],
    ['Lunes', '03/08/2026', '08:00', '17:00', '09:00'],
    ['Martes', '04/08/2026', '08:00', '17:00', '09:00'],
    ['Miércoles', '05/08/2026', '08:00', '17:00', '09:00'],
    ['Jueves', '06/08/2026', '08:00', '17:00', '09:00'],
    ['Viernes', '07/08/2026', '08:00', '17:00', '09:00'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for clean appearance
  ws['!cols'] = [
    { wch: 16 }, // Día / Label
    { wch: 14 }, // Fecha / Valor
    { wch: 12 }, // Entrada
    { wch: 12 }, // Salida
    { wch: 12 }, // Total Hs.
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Informe Fichadas');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

/**
 * Generates sample data and processes it directly to load into the app state.
 */
export async function getSampleImportResult(): Promise<ImportResult> {
  const u8Array = generateSampleExcelWorkbook();
  const blob = new Blob([u8Array], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const sampleFile = new File([blob], 'Fichadas_Ejemplo_RRHH_Agosto2026.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const parsed = await parseAttendanceExcel(sampleFile);
  return aggregateAttendanceData(parsed, sampleFile.name, sampleFile.size);
}
