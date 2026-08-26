import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ValidationError } from '../types';

interface ValidationErrorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationError[];
}

export const ValidationErrorsModal: React.FC<ValidationErrorsModalProps> = ({
  isOpen,
  onClose,
  errors,
}) => {
  if (!isOpen) return null;

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Resumen de Inconsistencias y Advertencias
              </h3>
              <p className="text-xs text-slate-400">
                {errors.length} observaciones detectadas en el archivo de fichadas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Severity Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorCount} Errores críticos</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{warningCount} Advertencias / Formato</span>
          </div>
          <span className="text-slate-500 ml-auto hidden sm:inline">
            Los registros válidos continuaron su procesamiento normalmente.
          </span>
        </div>

        {/* Errors Table */}
        <div className="p-5 overflow-y-auto flex-1">
          {errors.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">¡Archivo 100% limpio!</p>
              <p className="text-xs text-slate-500">No se detectaron inconsistencias ni faltantes de fichadas.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center">Fila Excel</th>
                    <th className="py-2.5 px-3">Empleado / Legajo</th>
                    <th className="py-2.5 px-3 text-center">Fecha</th>
                    <th className="py-2.5 px-3 text-center">Tipo</th>
                    <th className="py-2.5 px-4">Descripción de la Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {errors.map((err) => {
                    const isErr = err.severity === 'error';
                    return (
                      <tr key={err.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {err.rowNumber > 0 ? `#${err.rowNumber}` : 'General'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {err.employeeName || 'No asignado'}
                          {err.legajo && (
                            <span className="ml-1.5 font-mono text-[10px] text-slate-500">
                              ({err.legajo})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {err.date || '--'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isErr
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {err.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 text-xs">
                          {err.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Entendido, Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
