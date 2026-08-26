import React from 'react';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';
import { FilterOptions } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: Partial<FilterOptions>) => void;
  counts: {
    all: number;
    with_overtime: number;
    without_overtime: number;
    with_errors: number;
  };
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  counts,
}) => {
  const tabs = [
    { id: 'all', label: 'Todos', count: counts.all },
    { id: 'with_overtime', label: 'Con Horas Extras', count: counts.with_overtime },
    { id: 'without_overtime', label: 'Jornada Normal', count: counts.without_overtime },
    { id: 'with_errors', label: 'Con Alertas', count: counts.with_errors },
  ] as const;

  const isAnyFilterActive = Boolean(
    filters.searchQuery ||
    filters.statusTab !== 'all'
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
      {/* Top row: Status Tabs & Sort Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const isActive = filters.statusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilterChange({ statusTab: tab.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200/90 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 justify-end shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline font-medium">Ordenar:</span>
          <select
            id="select-sort-by"
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [
                FilterOptions['sortBy'],
                FilterOptions['sortOrder']
              ];
              onFilterChange({ sortBy, sortOrder });
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-slate-400 focus:outline-hidden"
          >
            <option value="name-asc">Nombre (A - Z)</option>
            <option value="name-desc">Nombre (Z - A)</option>
            <option value="overtimeHours-desc">Mayor Horas Extras</option>
            <option value="workedHours-desc">Mayor Horas Trabajadas</option>
            <option value="legajo-asc">N° Legajo</option>
          </select>
        </div>
      </div>

      {/* Bottom row: Search Bar */}
      <div className="flex items-center gap-2.5">
        {/* Search by Name or Legajo */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-search-employee"
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Buscar por nombre de empleado o N° de legajo..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-400 focus:outline-hidden transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Borrar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Reset Filters button */}
        {isAnyFilterActive && (
          <button
            id="btn-reset-filters"
            onClick={() => onFilterChange({ searchQuery: '', statusTab: 'all' })}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
            title="Restablecer todos los filtros"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Limpiar</span>
          </button>
        )}
      </div>
    </div>
  );
};
