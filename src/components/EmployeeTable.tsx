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
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <th className="py-3 px-4">Empleado</th>
              <th className="py-3 px-3 text-center">N° Legajo</th>
              <th className="py-3 px-3 text-center">Días Trab.</th>
              <th className="py-3 px-3 text-center">Hs. Totales</th>
              <th className="py-3 px-3 text-center">Hs. Normales</th>
              <th className="py-3 px-3 text-center text-amber-300">Hs. Extras</th>
              <th className="py-3 px-3 text-center">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {employees.map((emp) => {
              const hasOvertime = emp.totalOvertimeMinutes > 0;
              const hasErrors = emp.totalDaysWithErrors > 0;

              return (
                <tr
                  key={emp.employee.id}
                  onClick={() => onSelectEmployee(emp)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  {/* Name with initials avatar */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          hasOvertime
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {emp.employee.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block">
                          {emp.employee.name}
                        </span>
                        <span className="sm:hidden font-mono text-[10px] text-slate-500">
                          Legajo: {emp.employee.legajo}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Legajo */}
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/90 rounded-md text-[11px] text-slate-800">
                      {emp.employee.legajo}
                    </span>
                  </td>

                  {/* Dias trabajados */}
                  <td className="py-2.5 px-3 text-center font-medium text-slate-800 font-mono">
                    {emp.totalDaysWorked}
                  </td>

                  {/* Horas Trabajadas */}
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                    {emp.totalWorkedFormatted}
                  </td>

                  {/* Horas Normales */}
                  <td className="py-2.5 px-3 text-center font-medium text-emerald-800 font-mono">
                    {emp.totalNormalFormatted}
                  </td>

                  {/* Horas Extras */}
                  <td className="py-2.5 px-3 text-center font-mono">
                    {hasOvertime ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 border border-amber-300 rounded font-bold">
                        <Flame className="w-3 h-3 text-amber-600" />
                        {emp.totalOvertimeFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-normal">00:00</span>
                    )}
                  </td>

                  {/* Estado Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {hasOvertime ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Flame className="w-3 h-3 text-amber-600" />
                        Con Extras
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onExportEmployeeExcel(emp)}
                        title="Descargar Excel de este empleado"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onExportEmployeePdf(emp)}
                        title="Generar PDF individual con firma"
                        className="p-1.5 text-slate-400 hover:text-indigo-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onSelectEmployee(emp)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-0.5 text-[11px] font-medium ml-1"
                      >
                        <span>Detalle</span>
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
