import * as XLSX from 'xlsx';
import { ImportResult, EmployeeSummary } from '../types';

/**
 * Generates and downloads a multi-sheet Excel file (.xlsx) with all processed HR attendance data.
 */
export function exportToExcel(importResult: ImportResult, specificEmployee?: EmployeeSummary): void {
  const wb = XLSX.utils.book_new();

  // 1. Resumen por Empleado Sheet
  const summaryHeaders = [
    'N° Legajo',
    'Empleado',
    'Días Trabajados',
    'Horas Trabajadas (HH:MM)',
    'Horas Normales (HH:MM)',
    'Horas Extras (HH:MM)',
    'Días con Horas Extras',
    'Días con Observaciones',
    'Estado',
  ];

  const employeesToExport = specificEmployee ? [specificEmployee] : importResult.employees;

  const summaryData = employeesToExport.map(emp => [
    emp.employee.legajo,
    emp.employee.name,
    emp.totalDaysWorked,
    emp.totalWorkedFormatted,
    emp.totalNormalFormatted,
    emp.totalOvertimeFormatted,
    emp.totalDaysWithOvertime,
    emp.totalDaysWithErrors,
    emp.totalOvertimeMinutes > 0 ? 'Con Horas Extras' : 'Jornada Normal',
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([
    [`REPORTE DE HORAS Y HORAS EXTRAS - ${importResult.companyName || 'RRHH'}`],
    [`Período: ${importResult.periodText || 'Mes Actual'} | Generado: ${new Date().toLocaleDateString('es-AR')}`],
    [],
    summaryHeaders,
    ...summaryData,
  ]);

  wsSummary['!cols'] = [
    { wch: 14 }, // N° Legajo
    { wch: 32 }, // Empleado
    { wch: 16 }, // Días Trabajados
    { wch: 24 }, // Horas Trabajadas
    { wch: 24 }, // Horas Normales
    { wch: 22 }, // Horas Extras
    { wch: 22 }, // Días con Horas Extras
    { wch: 22 }, // Días con Observaciones
    { wch: 18 }, // Estado
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Empleados');

  // 2. Detalle Diario Sheet
  const detailHeaders = [
    'N° Legajo',
    'Empleado',
    'Fecha',
    'Día',
    '1ra Entrada',
    'Fin Jornada Legal',
    'Última Salida',
    'Tramos Fichados',
    'Horas Trabajadas',
    'Horas Normales',
    'Horas Extras',
    'Estado',
    'Observaciones',
  ];

  const detailRows: (string | number)[][] = [];

  employeesToExport.forEach(emp => {
    emp.dailyRecords.forEach(day => {
      const tramosText = day.intervals
        .map(i => `${i.entryFormatted} - ${i.exitFormatted}`)
        .join(' | ');

      let estadoText = 'Normal';
      if (day.hasErrors) estadoText = 'Con Error / Incompleto';
      else if (day.hasOvertime) estadoText = 'Horas Extras';

      detailRows.push([
        emp.employee.legajo,
        emp.employee.name,
        day.formattedDate,
        day.dayName,
        day.firstEntryFormatted,
        day.normalWorkdayEndFormatted,
        day.lastExitFormatted,
        tramosText || 'Sin tramos válidos',
        day.totalWorkedFormatted,
        day.normalFormatted,
        day.overtimeFormatted,
        estadoText,
        day.errorNotes.join('; '),
      ]);
    });
  });

  const wsDetail = XLSX.utils.aoa_to_sheet([
    ['DETALLE DIARIO DE FICHADAS Y HORAS EXTRAS'],
    [`Generado: ${new Date().toLocaleDateString('es-AR')}`],
    [],
    detailHeaders,
    ...detailRows,
  ]);

  wsDetail['!cols'] = [
    { wch: 14 }, // N° Legajo
    { wch: 30 }, // Empleado
    { wch: 14 }, // Fecha
    { wch: 14 }, // Día
    { wch: 14 }, // 1ra Entrada
    { wch: 24 }, // Fin Jornada Normal (9h)
    { wch: 14 }, // Última Salida
    { wch: 34 }, // Tramos Fichados
    { wch: 18 }, // Horas Trabajadas
    { wch: 16 }, // Horas Normales
    { wch: 16 }, // Horas Extras
    { wch: 18 }, // Estado
    { wch: 32 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle Diario');

  // 3. Errores y Advertencias Sheet
  if (importResult.errors.length > 0) {
    const errorHeaders = ['Fila Excel', 'Empleado', 'N° Legajo', 'Fecha', 'Severidad', 'Tipo', 'Descripción'];
    const errorRows = importResult.errors.map(err => [
      err.rowNumber,
      err.employeeName || 'N/A',
      err.legajo || 'N/A',
      err.date || 'N/A',
      err.severity === 'error' ? 'ERROR' : 'ADVERTENCIA',
      err.type,
      err.message,
    ]);

    const wsErrors = XLSX.utils.aoa_to_sheet([
      ['INFORME DE INCONSISTENCIAS Y VALIDACIONES EN FICHADAS'],
      [`Total observaciones detectadas: ${importResult.errors.length}`],
      [],
      errorHeaders,
      ...errorRows,
    ]);

    wsErrors['!cols'] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 50 },
    ];

    XLSX.utils.book_append_sheet(wb, wsErrors, 'Errores y Advertencias');
  }

  // Trigger download in browser
  const filePrefix = specificEmployee
    ? `Fichadas_${specificEmployee.employee.legajo}_${specificEmployee.employee.name.replace(/\s+/g, '_')}`
    : 'Reporte_Fichadas_Horas_Extras_RRHH';

  XLSX.writeFile(wb, `${filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
