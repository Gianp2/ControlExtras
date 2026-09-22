import React from 'react';
import { Users, Clock, Flame, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { ImportResult, FilterOptions } from '../types';

interface KpiCardsProps {
  importResult: ImportResult;
  currentStatusTab?: FilterOptions['statusTab'];
  onFilterByStatus?: (status: 'all' | 'with_overtime' | 'without_overtime' | 'with_errors') => void;
  onOpenErrors?: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  importResult,
  currentStatusTab = 'all',
  onFilterByStatus,
  onOpenErrors,
}) => {
  const { employees, metadata, errors } = importResult;

  const totalEmployees = employees.length;
  const employeesWithOvertime = employees.filter(e => e.totalOvertimeMinutes > 0).length;
  const overtimePercentage = totalEmployees > 0 ? Math.round((employeesWithOvertime / totalEmployees) * 100) : 0;

  let totalNormalMinutes = 0;
  employees.forEach(e => {
    totalNormalMinutes += e.totalNormalMinutes;
  });
  const totalNormalHoursStr = `${Math.floor(totalNormalMinutes / 60)}:${String(totalNormalMinutes % 60).padStart(2, '0')}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Total Empleados */}
      <button
        type="button"
        id="kpi-total-employees"
        onClick={() => onFilterByStatus?.('all')}
        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
          currentStatusTab === 'all'
            ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-slate-800'
            : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusTab === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            Empleados
          </span>
          <div className={`p-2 rounded-xl ${currentStatusTab === 'all' ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-700'}`}>
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${currentStatusTab === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {totalEmployees}
          </span>
          <span className={`text-xs ${currentStatusTab === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
            en nómina
          </span>
        </div>
      </button>

      {/* 2. Horas Trabajadas */}
      <div className="p-4 rounded-2xl border bg-white border-slate-200/90 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Hs. Trabajadas
          </span>
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5 font-mono">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {metadata.totalWorkedHoursStr}
          </span>
          <span className="text-xs font-sans text-sky-700 font-medium">
            totales
          </span>
        </div>
      </div>

      {/* 3. Horas Normales (Base 9h) */}
      <button
        type="button"
        id="kpi-normal-hours"
        onClick={() => onFilterByStatus?.('without_overtime')}
        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
          currentStatusTab === 'without_overtime'
            ? 'bg-emerald-950 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-600/40'
            : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusTab === 'without_overtime' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Hs. Normales
          </span>
          <div className={`p-2 rounded-xl ${currentStatusTab === 'without_overtime' ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${currentStatusTab === 'without_overtime' ? 'text-white' : 'text-emerald-900'}`}>
            {totalNormalHoursStr}
          </span>
          <span className={`text-xs font-sans ${currentStatusTab === 'without_overtime' ? 'text-emerald-300' : 'text-emerald-700'} font-semibold`}>
            base 9h
          </span>
        </div>
      </button>

      {/* 4. Horas Extras */}
      <button
        type="button"
        id="kpi-overtime-hours"
        onClick={() => onFilterByStatus?.('with_overtime')}
        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
          currentStatusTab === 'with_overtime'
            ? 'bg-amber-950 border-amber-700 text-white shadow-sm ring-2 ring-amber-500/40'
            : 'bg-gradient-to-b from-amber-50/60 to-amber-50/20 border-amber-200/80 hover:border-amber-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStatusTab === 'with_overtime' ? 'text-amber-300' : 'text-amber-900'}`}>
            Horas Extras
          </span>
          <div className={`p-2 rounded-xl ${currentStatusTab === 'with_overtime' ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
            <Flame className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${currentStatusTab === 'with_overtime' ? 'text-white' : 'text-amber-950'}`}>
            {metadata.totalOvertimeHoursStr}
          </span>
          <span className={`text-xs font-sans ${currentStatusTab === 'with_overtime' ? 'text-amber-300' : 'text-amber-800'} font-semibold`}>
            extras
          </span>
        </div>
      </button>

      {/* 5. Empleados con Extras */}
      <button
        type="button"
        id="kpi-employees-with-overtime"
        onClick={() => onFilterByStatus?.('with_overtime')}
        className="p-4 rounded-2xl border bg-white border-slate-200/90 hover:border-slate-300 text-left shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Con Extras
          </span>
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {employeesWithOvertime}
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            ({overtimePercentage}%)
          </span>
        </div>
        {/* Visual progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-amber-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, overtimePercentage)}%` }}
          />
        </div>
      </button>

      {/* 6. Observaciones / Errores */}
      <button
        type="button"
        id="kpi-observations"
        onClick={onOpenErrors}
        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md ${
          errors.length > 0
            ? 'bg-rose-50/80 border-rose-200/90 hover:border-rose-300 text-rose-900 shadow-2xs'
            : 'bg-white border-slate-200/90 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${errors.length > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
            Observaciones
          </span>
          <div className={`p-2 rounded-xl ${errors.length > 0 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${errors.length > 0 ? 'text-rose-950' : 'text-slate-900'}`}>
            {errors.length}
          </span>
          <span className={`text-xs font-semibold ${errors.length > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {errors.length === 0 ? 'sin alertas' : 'para revisar'}
          </span>
        </div>
      </button>
    </div>
  );
};
