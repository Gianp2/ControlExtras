import React from 'react';
import {
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  User,
} from 'lucide-react';
import { EmployeeSummary } from '../types';

interface EmployeeTableProps {
  employees: EmployeeSummary[];
  onSelectEmployee: (employee: EmployeeSummary) => void;
  onExportEmployeeExcel: (employee: EmployeeSummary) => void;
  onExportEmployeePdf: (employee: EmployeeSummary) => void;
}

export const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onSelectEmployee,
  onExportEmployeeExcel,
  onExportEmployeePdf,
}) => {
  if (employees.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <User className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">No se encontraron empleados</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Prueba cambiando los términos de búsqueda o los filtros de sector y estado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <th className="py-3.5 px-4 font-bold">Empleado</th>
              <th className="py-3.5 px-3 text-center font-bold">N° Legajo</th>
              <th className="py-3.5 px-3 text-center font-bold">Días Trab.</th>
              <th className="py-3.5 px-3 text-center font-bold">Hs. Totales</th>
              <th className="py-3.5 px-3 text-center font-bold text-emerald-400">Hs. Normales</th>
              <th className="py-3.5 px-3 text-center font-bold text-amber-300">Hs. Extras</th>
              <th className="py-3.5 px-3 text-center font-bold">Estado</th>
              <th className="py-3.5 px-4 text-right font-bold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {employees.map((emp) => {
              const hasOvertime = emp.totalOvertimeMinutes > 0;

              return (
                <tr
                  key={emp.employee.id}
                  id={`row-employee-${emp.employee.legajo || emp.employee.id}`}
                  onClick={() => onSelectEmployee(emp)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  {/* Name with initials avatar */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 shadow-2xs ${
                          hasOvertime
                            ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-950 border border-amber-300/80'
                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border border-slate-300/60'
                        }`}
                      >
                        {emp.employee.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block text-xs sm:text-sm">
                          {emp.employee.name}
                        </span>
                        <span className="sm:hidden font-mono text-[10px] text-slate-500">
                          Legajo: {emp.employee.legajo}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Legajo */}
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs tracking-tight shadow-2xs">
                      {emp.employee.legajo}
                    </span>
                  </td>

                  {/* Dias trabajados */}
                  <td className="py-3 px-3 text-center font-semibold text-slate-700 font-mono text-xs">
                    {emp.totalDaysWorked}
                  </td>

                  {/* Horas Trabajadas */}
                  <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono text-xs">
                    {emp.totalWorkedFormatted}
                  </td>

                  {/* Horas Normales */}
                  <td className="py-3 px-3 text-center font-semibold text-emerald-800 font-mono text-xs">
                    {emp.totalNormalFormatted}
                  </td>

                  {/* Horas Extras */}
                  <td className="py-3 px-3 text-center font-mono">
                    {hasOvertime ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg font-black text-xs shadow-2xs">
                        <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {emp.totalOvertimeFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal text-xs">00:00</span>
                    )}
                  </td>

                  {/* Estado Badge */}
                  <td className="py-3 px-3 text-center">
                    {hasOvertime ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs">
                        <Flame className="w-3 h-3 text-amber-600" />
                        Con Extras
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onExportEmployeeExcel(emp)}
                        title="Descargar Excel de este empleado"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onExportEmployeePdf(emp)}
                        title="Generar PDF individual con firma"
                        className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-indigo-200"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="px-2.5 py-1 text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold ml-1 cursor-pointer shadow-2xs"
                      >
                        <span>Ver Ficha</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
