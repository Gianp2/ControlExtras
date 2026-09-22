import React from 'react';
import { X, CheckCircle, Clock, Flame, Calculator, Sparkles } from 'lucide-react';

interface RulesExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesExplainerModal: React.FC<RulesExplainerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Reglas de Cálculo RR. HH. y Redondeo :59
              </h3>
              <p className="text-xs text-slate-400">
                Fórmulas matemáticas exactas aplicadas en el procesamiento de fichadas
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Rule 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              1. Lunes a Jueves: Jornada Legal de 9 Horas
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              De lunes a jueves la jornada legal es de 9 horas de trabajo real:
            </p>
            <div className="mt-2 p-2.5 bg-slate-900 text-emerald-300 font-mono text-xs rounded-lg space-y-1">
              <div>Jornada normal = Primera entrada real del día + 9 horas</div>
              <div>Horas extras = Todo el tiempo trabajado después de las 9 horas</div>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              2. Viernes: Jornada Legal de 8 Horas
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Todos los viernes se trabajan 8 horas legales. El tiempo trabajado posterior a las 8 horas computa como horas extras:
            </p>
            <div className="mt-2 p-2.5 bg-slate-900 text-blue-300 font-mono text-xs rounded-lg space-y-1">
              <div>Jornada normal viernes = Primera entrada real del día + 8 horas</div>
              <div>Horas extras viernes = Todo el tiempo trabajado después de las 8 horas</div>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
              <Flame className="w-4 h-4 text-amber-600" />
              3. Sábados: 100% Horas Extras Directas
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Los sábados (y fines de semana) no computan horas normales. Todo el tiempo trabajado se cuenta directamente como horas extras:
            </p>
            <div className="mt-2 p-2.5 bg-slate-900 text-amber-300 font-mono text-xs rounded-lg space-y-1">
              <div>Horas normales sábado = 00:00</div>
              <div>Horas extras sábado = 100% del tiempo total trabajado en el día</div>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              4. Redondeo Obligatorio :59
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Si una hora de fichada termina en minuto <span className="font-bold text-slate-900">:59</span>, se ajusta automáticamente a la hora en punto siguiente:
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">17:59</span> → <span className="font-bold text-emerald-700">18:00</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">16:59</span> → <span className="font-bold text-emerald-700">17:00</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">07:59</span> → <span className="font-bold text-emerald-700">08:00</span>
              </div>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm mb-2">
              <Flame className="w-4 h-4 text-amber-600" />
              5. Redondeo de Horas Extras a Horas Enteras
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Las horas extras se redondean hacia abajo a horas enteras (los minutos fraccionarios se descartan):
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">03:03 hs</span> → <span className="font-bold text-amber-700">3 hs (03:00)</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">02:15 hs</span> → <span className="font-bold text-amber-700">2 hs (02:00)</span>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-500 line-through">01:45 hs</span> → <span className="font-bold text-amber-700">1 hs (01:00)</span>
              </div>
            </div>
          </div>

          {/* Verified Test Cases Table */}
          <div>
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
              Casos de Prueba Verificados
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="p-2.5">Día y Entrada</th>
                    <th className="p-2.5">Salida</th>
                    <th className="p-2.5">Jornada Legal</th>
                    <th className="p-2.5">Hs. Trabajadas</th>
                    <th className="p-2.5 text-amber-800">Hs. Extras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  <tr>
                    <td className="p-2.5">Lun-Jue 07:00</td>
                    <td className="p-2.5">17:00</td>
                    <td className="p-2.5 text-slate-500">16:00 (07:00 + 9h)</td>
                    <td className="p-2.5 font-bold">10:00</td>
                    <td className="p-2.5 font-bold text-amber-700">01:00 Extra (1 hs)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Lun-Jue 07:00</td>
                    <td className="p-2.5">16:00</td>
                    <td className="p-2.5 text-slate-500">16:00</td>
                    <td className="p-2.5 font-bold">09:00</td>
                    <td className="p-2.5 text-slate-400">00:00</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td className="p-2.5 font-semibold text-blue-900">Viernes 08:00</td>
                    <td className="p-2.5">17:00</td>
                    <td className="p-2.5 text-blue-700 font-semibold">16:00 (08:00 + 8h)</td>
                    <td className="p-2.5 font-bold">09:00</td>
                    <td className="p-2.5 font-bold text-amber-700">01:00 Extra (1 hs)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Lun-Jue 08:00</td>
                    <td className="p-2.5">20:03</td>
                    <td className="p-2.5 text-slate-500">17:00 (08:00 + 9h)</td>
                    <td className="p-2.5 font-bold">12:03</td>
                    <td className="p-2.5 font-bold text-amber-700">03:00 Extra (3 hs)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Lun-Jue 08:00</td>
                    <td className="p-2.5">19:15</td>
                    <td className="p-2.5 text-slate-500">17:00 (08:00 + 9h)</td>
                    <td className="p-2.5 font-bold">11:15</td>
                    <td className="p-2.5 font-bold text-amber-700">02:00 Extra (2 hs)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5">Lun-Jue 06:56</td>
                    <td className="p-2.5">17:00</td>
                    <td className="p-2.5 text-slate-500">15:56 (06:56 + 9h)</td>
                    <td className="p-2.5 font-bold">10:04</td>
                    <td className="p-2.5 font-bold text-amber-700">01:00 Extra (1 hs)</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="p-2.5 font-semibold text-amber-900">Sábado 08:00</td>
                    <td className="p-2.5">13:00</td>
                    <td className="p-2.5 text-amber-700 font-semibold">100% Extras (0h norm.)</td>
                    <td className="p-2.5 font-bold">05:00</td>
                    <td className="p-2.5 font-bold text-amber-700">05:00 Extras (5 hs)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
