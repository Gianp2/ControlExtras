import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Play, ShieldCheck, Clock, Calculator, RotateCcw } from 'lucide-react';
import { runCalculationTests, TestSuiteSummary } from '../services/calculationService';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [suiteResult, setSuiteResult] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  useLockBodyScroll(isOpen);

  const executeTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runCalculationTests();
      setSuiteResult(res);
      setIsRunning(false);
    }, 150);
  };

  useEffect(() => {
    if (isOpen) {
      executeTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Suite de Validación de Reglas RR. HH.
                </h3>
                {suiteResult && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      suiteResult.allPassed
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                        : 'bg-rose-950 text-rose-300 border-rose-700/60'
                    }`}
                  >
                    {suiteResult.allPassed ? '100% Verificado' : `${suiteResult.failed} Fallos`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tests automáticos: Lun-Jue 9h, Viernes 8h, Sábados 100% extras, redondeo :59 y extras en horas enteras
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={executeTests}
              disabled={isRunning}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Volver a ejecutar tests"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-ejecutar</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {suiteResult && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-slate-700">
                Total de Casos: <span className="font-mono text-slate-900">{suiteResult.total}</span>
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aprobados: {suiteResult.passed}
              </span>
              {suiteResult.failed > 0 && (
                <span className="text-rose-700 font-semibold flex items-center gap-1">
                  <XCircle className="w-4 h-4 text-rose-600" /> Fallidos: {suiteResult.failed}
                </span>
              )}
            </div>
            <div className="text-slate-500 font-mono text-[11px]">
              Motor: src/services/calculationService.ts
            </div>
          </div>
        )}

        {/* Content - Test List */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-sm bg-slate-100/50">
          {suiteResult?.results.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {test.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {test.id}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm">{test.name}</h4>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{test.description}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      test.passed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* Input vs Expected vs Actual */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                <div className="p-2 bg-slate-50 rounded-lg text-slate-700">
                  <div className="text-[10px] text-slate-500 font-sans font-semibold uppercase tracking-wider mb-1">
                    Valores Esperados
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    <span>Trabajadas: <strong className="text-slate-900">{test.expected.workedHours}</strong></span>
                    <span>Normales: <strong className="text-slate-900">{test.expected.normalHours}</strong></span>
                    <span>Extras: <strong className="text-amber-700">{test.expected.overtimeHours}</strong></span>
                    {test.expected.normalEnd && <span>Fin 9h: <strong>{test.expected.normalEnd}</strong></span>}
                  </div>
                </div>

                <div className={`p-2 rounded-lg ${test.passed ? 'bg-emerald-50/70 text-emerald-950' : 'bg-rose-50 text-rose-950'}`}>
                  <div className="text-[10px] text-slate-500 font-sans font-semibold uppercase tracking-wider mb-1">
                    Resultado Obtenido
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    <span>Trabajadas: <strong className={test.actual.workedHours === test.expected.workedHours ? 'text-emerald-800' : 'text-rose-700'}>{test.actual.workedHours}</strong></span>
                    <span>Normales: <strong className={test.actual.normalHours === test.expected.normalHours ? 'text-emerald-800' : 'text-rose-700'}>{test.actual.normalHours}</strong></span>
                    <span>Extras: <strong className={test.actual.overtimeHours === test.expected.overtimeHours ? 'text-emerald-800' : 'text-rose-700'}>{test.actual.overtimeHours}</strong></span>
                    {test.actual.normalEnd && <span>Fin 9h: <strong>{test.actual.normalEnd}</strong></span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Todos los cálculos se procesan en minutos enteros exactos sin pérdida de precisión.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
