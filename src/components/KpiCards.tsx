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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Empleados */}
      <button
        type="button"
        onClick={() => onFilterByStatus?.('all')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          currentStatusTab === 'all'
            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${currentStatusTab === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            Empleados
          </span>
          <div className={`p-1.5 rounded-lg ${currentStatusTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold tracking-tight ${currentStatusTab === 'all' ? 'text-white' : 'text-slate-900'}`}>
            {totalEmployees}
          </span>
          <span className={`text-[11px] ${currentStatusTab === 'all' ? 'text-slate-400' : 'text-slate-500'}`}>
            en nómina
          </span>
        </div>
      </button>

      {/* 2. Horas Trabajadas */}
      <div className="p-3.5 rounded-xl border bg-white border-slate-200 text-left shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Hs. Trabajadas
          </span>
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className="text-2xl font-bold tracking-tight text-blue-950">
            {metadata.totalWorkedHoursStr}
          </span>
          <span className="text-[11px] font-sans text-blue-600 font-medium">
            totales
          </span>
        </div>
      </div>

      {/* 3. Horas Normales (Base 9h) */}
      <button
        type="button"
        onClick={() => onFilterByStatus?.('without_overtime')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          currentStatusTab === 'without_overtime'
            ? 'bg-emerald-950 border-emerald-800 text-white shadow-sm ring-2 ring-emerald-600/30'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${currentStatusTab === 'without_overtime' ? 'text-emerald-300' : 'text-slate-500'}`}>
            Hs. Normales
          </span>
          <div className={`p-1.5 rounded-lg ${currentStatusTab === 'without_overtime' ? 'bg-emerald-900 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl font-bold tracking-tight ${currentStatusTab === 'without_overtime' ? 'text-white' : 'text-emerald-950'}`}>
            {totalNormalHoursStr}
          </span>
          <span className={`text-[11px] font-sans ${currentStatusTab === 'without_overtime' ? 'text-emerald-300' : 'text-emerald-700'} font-medium`}>
            base 9h
          </span>
        </div>
      </button>

      {/* 4. Horas Extras */}
      <button
        type="button"
        onClick={() => onFilterByStatus?.('with_overtime')}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          currentStatusTab === 'with_overtime'
            ? 'bg-amber-950 border-amber-800 text-white shadow-sm ring-2 ring-amber-500/30'
            : 'bg-amber-50/50 border-amber-200/80 hover:border-amber-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${currentStatusTab === 'with_overtime' ? 'text-amber-300' : 'text-amber-800'}`}>
            Horas Extras
          </span>
          <div className={`p-1.5 rounded-lg ${currentStatusTab === 'with_overtime' ? 'bg-amber-900 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5 font-mono">
          <span className={`text-2xl font-bold tracking-tight ${currentStatusTab === 'with_overtime' ? 'text-white' : 'text-amber-950'}`}>
            {metadata.totalOvertimeHoursStr}
          </span>
          <span className={`text-[11px] font-sans ${currentStatusTab === 'with_overtime' ? 'text-amber-300' : 'text-amber-700'} font-medium`}>
            acumuladas
          </span>
        </div>
      </button>

      {/* 5. Empleados con Extras */}
      <button
        type="button"
        onClick={() => onFilterByStatus?.('with_overtime')}
        className="p-3.5 rounded-xl border bg-white border-slate-200 hover:border-slate-300 text-left shadow-2xs transition-all"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Con Extras
          </span>
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {employeesWithOvertime}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            ({overtimePercentage}%)
          </span>
        </div>
      </button>

      {/* 6. Observaciones / Errores */}
      <button
        type="button"
        onClick={onOpenErrors}
        className={`p-3.5 rounded-xl border text-left transition-all ${
          errors.length > 0
            ? 'bg-rose-50/80 border-rose-200 hover:border-rose-300 text-rose-900 shadow-2xs'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${errors.length > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
            Observaciones
          </span>
          <div className={`p-1.5 rounded-lg ${errors.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold tracking-tight ${errors.length > 0 ? 'text-rose-950' : 'text-slate-900'}`}>
            {errors.length}
          </span>
          <span className={`text-[11px] font-medium ${errors.length > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            {errors.length === 0 ? 'limpio' : 'para revisar'}
          </span>
        </div>
      </button>
    </div>
  );
};
