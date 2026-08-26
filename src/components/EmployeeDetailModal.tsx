import React from 'react';
import {
  X,
  User,
  Clock,
  Flame,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { EmployeeSummary } from '../types';

interface EmployeeDetailModalProps {
  employee: EmployeeSummary | null;
  onClose: () => void;
  onExportExcel: (employee: EmployeeSummary) => void;
  onExportPdf: (employee: EmployeeSummary) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({
  employee,
  onClose,
  onExportExcel,
  onExportPdf,
}) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-inner">
              {employee.employee.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-lg text-white">{employee.employee.name}</h3>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-200 font-mono text-xs rounded border border-slate-700 font-bold">
                  N° Legajo: {employee.employee.legajo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Planilla individual de fichadas y control de jornada flexible
              </p>
            </div>
          </div>

          {/* Quick Exports and Close */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExportExcel(employee)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Exportar a Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={() => onExportPdf(employee)}
              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow"
              title="Exportar a PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Días Registrados</span>
            <span className="text-xl font-bold text-slate-900">{employee.totalDaysWorked}</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Hs. Trabajadas</span>
            <span className="text-xl font-bold text-slate-900">{employee.totalWorkedFormatted}</span>
          </div>

          <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Hs. Normales</span>
            <span className="text-xl font-bold text-emerald-700">{employee.totalNormalFormatted}</span>
          </div>

          <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Hs. Extras</span>
            <span className="text-xl font-black text-amber-900">{employee.totalOvertimeFormatted}</span>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Detalle Diario de Fichadas y Jornada
            </h4>
            <span className="text-xs text-slate-500">
              Lun-Jue: 9h | Vie: 8h | Sáb-Dom: 100% extras | Extras en horas enteras (:00)
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-2">Día</th>
                    <th className="py-2.5 px-3 text-center">1ra Entrada</th>
                    <th className="py-2.5 px-3 text-center bg-slate-50">Fin Jornada Normal</th>
                    <th className="py-2.5 px-3 text-center">Última Salida</th>
                    <th className="py-2.5 px-3 text-left">Tramos Registrados</th>
                    <th className="py-2.5 px-3 text-center font-bold">Trabajadas</th>
                    <th className="py-2.5 px-3 text-center text-amber-800 font-bold bg-amber-50/50">Extras</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {employee.dailyRecords.map((day) => {
                    const hasOvertime = day.hasOvertime;
                    const hasErrors = day.hasErrors;

                    return (
                      <tr
                        key={day.date}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          hasOvertime ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Fecha */}
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {day.formattedDate}
                        </td>

                        {/* Día */}
                        <td className="py-3 px-2 text-slate-500 font-medium">
                          {day.dayName}
                        </td>

                        {/* Primera Entrada */}
                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-800">
                          {day.firstEntryFormatted}
                        </td>

                        {/* Fin Jornada Normal (9h) */}
                        <td className="py-3 px-3 text-center font-mono text-slate-600 bg-slate-50/60">
                          <span className="px-1.5 py-0.5 bg-slate-200/70 rounded text-[11px] text-slate-700 font-medium">
                            {day.normalWorkdayEndFormatted}
                          </span>
                        </td>

                        {/* Ultima Salida */}
                        <td className="py-3 px-3 text-center font-mono font-medium text-slate-800">
                          {day.lastExitFormatted}
                        </td>

                        {/* Tramos Fichados */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {day.intervals.map((interval, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono border border-slate-200"
                                title={`Duración: ${interval.durationFormatted}`}
                              >
                                <span>{interval.entryFormatted}</span>
                                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                <span>{interval.exitFormatted}</span>
                                <span className="text-[9px] text-slate-500 font-sans font-semibold">
                                  ({interval.durationFormatted})
                                </span>
                              </span>
                            ))}
                            {day.intervals.length === 0 && (
                              <span className="text-slate-400 italic text-[11px]">Sin tramos válidos</span>
                            )}
                          </div>
                        </td>

                        {/* Horas Trabajadas */}
                        <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                          {day.totalWorkedFormatted}
                        </td>

                        {/* Horas Extras */}
                        <td className="py-3 px-3 text-center font-mono bg-amber-50/50">
                          {hasOvertime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-950 font-bold rounded text-xs border border-amber-300">
                              <Flame className="w-3 h-3 text-amber-700" />
                              {day.overtimeFormatted}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">00:00</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center">
                          {hasErrors ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800"
                              title={day.errorNotes.join(', ')}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              Error
                            </span>
                          ) : hasOvertime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Extra
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Jornada legal calculada: 9 horas a partir de la 1ra entrada real.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
