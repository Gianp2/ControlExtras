import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ImportResult, EmployeeSummary } from '../types';
import { minutesToTimeString } from '../utils/timeCalculations';

/**
 * Exports a high-quality PDF executive report for Human Resources.
 */
export function exportGeneralPdf(importResult: ImportResult): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE GENERAL DE CONTROL DE FICHADAS Y JORNADAS', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${importResult.companyName || 'Recursos Humanos'}  •  ${importResult.periodText || 'Período Completo'}  •  Archivo: ${importResult.fileName}`,
    14,
    18
  );

  doc.text(`Emisión: ${today}`, pageWidth - 45, 18);

  // Summary Metrics Bar
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'F');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  const employeesCount = importResult.employees.length;
  const employeesWithOvertime = importResult.employees.filter((e) => e.totalOvertimeMinutes > 0).length;

  doc.text(`Personal Total: ${employeesCount}`, 20, 37);
  doc.text(`Personal c/ Extras: ${employeesWithOvertime}`, 75, 37);
  doc.text(`Total Hs. Trabajadas: ${importResult.metadata.totalWorkedHoursStr} hs`, 135, 37);
  doc.text(`Total Hs. Extras: ${importResult.metadata.totalOvertimeHoursStr} hs`, 210, 37);

  // Main Employees Table ordered by Legajo
  const sortedEmployees = [...importResult.employees].sort((a, b) =>
    a.employee.legajo.localeCompare(b.employee.legajo, undefined, { numeric: true })
  );

  const tableData = sortedEmployees.map((emp) => [
    emp.employee.legajo,
    emp.employee.name,
    emp.totalDaysWorked.toString(),
    `${emp.totalWorkedFormatted} hs`,
    `${emp.totalNormalFormatted} hs`,
    `${emp.totalOvertimeFormatted} hs`,
    emp.totalOvertimeMinutes > 0 ? 'CON EXTRAS' : 'NORMAL',
  ]);

  autoTable(doc, {
    startY: 46,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [[
      'N° Legajo',
      'Nombre y Apellido',
      'Días Trab.',
      'Hs. Totales',
      'Hs. Normales',
      'Hs. Extras',
      'Estado',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 94 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 34 },
      4: { halign: 'center', cellWidth: 34 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 34, textColor: [180, 83, 9] },
      6: { halign: 'center', cellWidth: 26 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 5 && data.cell.raw !== '00:00 hs') {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [180, 83, 9];
        }
        if (data.column.index === 6) {
          if (data.cell.raw === 'CON EXTRAS') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [22, 101, 52];
          }
        }
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} • Sistema de Control de Fichadas y Liquidación de Horas Extras`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  doc.save(`Reporte_General_RRHH_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exports a focused, dedicated PDF report listing specifically employee names,
 * legajos, departments, and registered overtime hours for payroll / HR approval.
 */
export function exportOvertimeSummaryPdf(importResult: ImportResult): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Top header banner (Slate / Amber accent for Overtime Focus)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Amber accent strip
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 22, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTADO DE HORAS EXTRAS PARA LIQUIDACIÓN DE SUELDOS', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${importResult.companyName || 'Recursos Humanos'}  •  ${importResult.periodText || 'Período Vigente'}  •  Archivo: ${importResult.fileName}`,
    14,
    18
  );
  doc.text(`Emisión: ${today}`, pageWidth - 45, 18);

  // Filter/Sort: list employees ordered by overtime desc, then Legajo
  const totalEmployees = importResult.employees.length;
  const employeesWithOvertime = importResult.employees.filter((e) => e.totalOvertimeMinutes > 0);
  const totalNormalMinutes = importResult.employees.reduce((acc, e) => acc + e.totalNormalMinutes, 0);
  const totalNormalFormatted = minutesToTimeString(totalNormalMinutes);

  // Summary Metrics Card
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'F');
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(14, 28, pageWidth - 28, 14, 2, 2, 'S');

  doc.setTextColor(120, 53, 15); // amber-900
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');

  doc.text(`Personal Total: ${totalEmployees} empleados`, 18, 37);
  doc.text(`Personal con Horas Extras: ${employeesWithOvertime.length}`, 85, 37);
  doc.text(`Total Hs. Extras: ${importResult.metadata.totalOvertimeHoursStr} hs`, 155, 37);
  doc.text(`Total Hs. Normales: ${totalNormalFormatted} hs`, 225, 37);

  // Table Data: Employees list ordered by Overtime desc, then Legajo
  const sortedEmployees = [...importResult.employees].sort(
    (a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes || a.employee.legajo.localeCompare(b.employee.legajo, undefined, { numeric: true })
  );

  const tableData = sortedEmployees.map((emp) => [
    emp.employee.legajo,
    emp.employee.name,
    emp.totalDaysWorked.toString(),
    `${emp.totalNormalFormatted} hs`,
    `${emp.totalOvertimeFormatted} hs`,
    `${emp.totalWorkedFormatted} hs`,
    emp.totalOvertimeMinutes > 0 ? 'CON EXTRAS' : 'NORMAL',
  ]);

  autoTable(doc, {
    startY: 46,
    margin: { left: 14, right: 14, bottom: 20 },
    head: [[
      'N° Legajo',
      'Nombre y Apellido',
      'Días Trab.',
      'Hs. Normales',
      'Hs. Extras',
      'Hs. Totales',
      'Estado',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 26 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 94 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 34 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 34, textColor: [180, 83, 9] },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 34 },
      6: { halign: 'center', cellWidth: 26 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const rawOvertime = data.row.raw as string[];
        const hasOvertime = rawOvertime && rawOvertime[4] !== '00:00 hs';
        if (data.column.index === 4 && hasOvertime) {
          data.cell.styles.fillColor = [254, 243, 199];
          data.cell.styles.textColor = [180, 83, 9];
        }
        if (data.column.index === 6) {
          if (data.cell.raw === 'CON EXTRAS') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} • Sistema de Control de Fichadas y Liquidación de Horas Extras`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  // Add signatures & totals box on last page or new page if needed
  if (finalY + 32 > pageHeight - 15) {
    doc.addPage();
    drawSignatureBlock(doc, 20, pageWidth, importResult);
  } else {
    drawSignatureBlock(doc, finalY + 8, pageWidth, importResult);
  }

  doc.save(`Nomina_Horas_Extras_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function drawSignatureBlock(
  doc: jsPDF,
  startY: number,
  pageWidth: number,
  importResult: ImportResult
): void {
  // Total summary badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, startY, pageWidth - 28, 9, 1.5, 1.5, 'F');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(
    `TOTAL GENERAL HORAS EXTRAS A LIQUIDAR:  ${importResult.metadata.totalOvertimeHoursStr} HS`,
    pageWidth / 2,
    startY + 6,
    { align: 'center' }
  );

  // Signatures lines
  const signY = startY + 22;
  doc.setDrawColor(148, 163, 184);
  doc.line(30, signY, 95, signY);
  doc.line(pageWidth - 95, signY, pageWidth - 30, signY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Firma y Sello Responsable RR. HH.', 38, signY + 4);
  doc.text('Aprobación Dirección / Gerencia', pageWidth - 88, signY + 4);
}

/**
 * Exports detailed day-by-day report for a specific employee.
 */
export function exportEmployeeDetailPdf(
  emp: EmployeeSummary,
  companyName?: string,
  periodText?: string,
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Top header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANILLA INDIVIDUAL DE ASISTENCIA Y JORNADAS', 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName || 'Recursos Humanos'}  •  ${periodText || 'Período Vigente'}`, 14, 19);
  doc.text(`Emisión: ${today}`, pageWidth - 45, 19);

  // Employee Identity Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 32, pageWidth - 28, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 32, pageWidth - 28, 22, 2, 2, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Empleado: ${emp.employee.name}`, 18, 40);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`N° Legajo: ${emp.employee.legajo}`, 18, 48);
  doc.text(`Días Registrados / Trabajados: ${emp.totalDaysWorked} días`, 110, 48);

  // Summary Metrics Badges
  const metricY = 58;
  const boxW = (pageWidth - 28 - 6) / 3;

  // Box 1: Worked
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, metricY, boxW, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, metricY, boxW, 14, 1.5, 1.5, 'S');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL HORAS TRABAJADAS', 14 + boxW / 2, metricY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${emp.totalWorkedFormatted} hs`, 14 + boxW / 2, metricY + 11, { align: 'center' });

  // Box 2: Normal
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + boxW + 3, metricY, boxW, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14 + boxW + 3, metricY, boxW, 14, 1.5, 1.5, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('HORAS NORMALES', 14 + boxW + 3 + boxW / 2, metricY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`${emp.totalNormalFormatted} hs`, 14 + boxW + 3 + boxW / 2, metricY + 11, { align: 'center' });

  // Box 3: Overtime
  const isOver = emp.totalOvertimeMinutes > 0;
  doc.setFillColor(isOver ? 254 : 248, isOver ? 243 : 250, isOver ? 199 : 252);
  doc.roundedRect(14 + (boxW + 3) * 2, metricY, boxW, 14, 1.5, 1.5, 'F');
  doc.setDrawColor(isOver ? 245 : 226, isOver ? 158 : 232, isOver ? 11 : 240);
  doc.roundedRect(14 + (boxW + 3) * 2, metricY, boxW, 14, 1.5, 1.5, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isOver ? 146 : 100, isOver ? 64 : 116, isOver ? 14 : 139);
  doc.text('HORAS EXTRAS', 14 + (boxW + 3) * 2 + boxW / 2, metricY + 5, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isOver ? 180 : 100, isOver ? 83 : 116, isOver ? 9 : 139);
  doc.text(`${emp.totalOvertimeFormatted} hs`, 14 + (boxW + 3) * 2 + boxW / 2, metricY + 11, { align: 'center' });

  // Daily Table
  const tableData = emp.dailyRecords.map((day) => [
    day.formattedDate,
    day.dayName.slice(0, 3),
    day.firstEntryFormatted || '--',
    day.normalWorkdayEndFormatted || '--',
    day.lastExitFormatted || '--',
    day.intervals.map((i) => `${i.entryFormatted}-${i.exitFormatted}`).join(', ') || '--',
    `${day.totalWorkedFormatted} hs`,
    day.overtimeMinutes > 0 ? `${day.overtimeFormatted} hs` : '--',
  ]);

  autoTable(doc, {
    startY: 77,
    margin: { left: 14, right: 14, bottom: 25 },
    head: [[
      'Fecha',
      'Día',
      '1ra Entr.',
      'Fin Jornada',
      'Últ. Sal.',
      'Tramos',
      'Trabajadas',
      'Hs. Extras',
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 12 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 22 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'left', cellWidth: 46 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 22, textColor: [180, 83, 9] },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7 && data.cell.raw !== '--') {
        data.cell.styles.fillColor = [254, 243, 199];
        data.cell.styles.textColor = [180, 83, 9];
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${data.pageNumber} • ${emp.employee.name} (Legajo ${emp.employee.legajo})`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 200;

  // Signatures on employee individual sheet
  const signY = Math.min(finalY + 22, pageHeight - 20);
  if (finalY + 28 > pageHeight) {
    doc.addPage();
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(20, signY, 80, signY);
  doc.line(pageWidth - 80, signY, pageWidth - 20, signY);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Firma del Empleado (Conformidad)', 26, signY + 4);
  doc.text('Firma y Sello de Recursos Humanos', pageWidth - 76, signY + 4);

  doc.save(`Ficha_${emp.employee.legajo}_${emp.employee.name.replace(/\s+/g, '_')}.pdf`);
}
