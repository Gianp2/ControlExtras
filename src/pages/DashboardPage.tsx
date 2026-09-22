import React, { useState, useMemo } from 'react';
import {
  Flame,
  ArrowLeft,
  Upload,
} from 'lucide-react';
import {
  ImportResult,
  EmployeeSummary,
  FilterOptions,
} from '../types';
import { Navbar } from '../components/Navbar';
import { FileDropzone } from '../components/FileDropzone';
import { KpiCards } from '../components/KpiCards';
import { FilterBar } from '../components/FilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeDetailModal } from '../components/EmployeeDetailModal';
import { ValidationErrorsModal } from '../components/ValidationErrorsModal';
import { RulesExplainerModal } from '../components/RulesExplainerModal';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { parseAttendanceExcel } from '../services/excelParser';
import { aggregateAttendanceData } from '../services/attendanceAggregator';
import { exportToExcel } from '../exports/excelExporter';
import {
  exportGeneralPdf,
  exportEmployeeDetailPdf,
  exportOvertimeSummaryPdf,
} from '../exports/pdfExporter';
import { useLockBodyScroll } from '../utils/useLockBodyScroll';

export const DashboardPage: React.FC = () => {
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSummary | null>(null);
  const [showErrorsModal, setShowErrorsModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Prevent background scrolling when any modal/card is open
  const isAnyModalOpen = Boolean(
    selectedEmployee || showErrorsModal || showRulesModal || showUploadModal
  );
  useLockBodyScroll(isAnyModalOpen);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Filters State
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    statusTab: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // File Upload Handlers
  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const parsed = await parseAttendanceExcel(file);
      const result = aggregateAttendanceData(parsed, file.name, file.size);
      setImportResult(result);
      setShowUploadModal(false);

      if (result.errors.length > 0) {
        addToast(
          'info',
          'Archivo procesado con observaciones',
          `Se procesaron ${result.employees.length} empleados con ${result.errors.length} advertencias.`
        );
      } else {
        addToast(
          'success',
          'Importación exitosa',
          `Se procesaron ${result.employees.length} empleados correctamente.`
        );
      }
    } catch (err: any) {
      console.error('Error procesando Excel:', err);
      const msg = err?.message || 'Error al procesar el archivo Excel. Verifique que tenga una estructura válida de fichadas.';
      setErrorMessage(msg);
      addToast('error', 'Error de importación', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Export Handlers
  const handleExportExcel = () => {
    if (!importResult) return;
    try {
      exportToExcel(importResult);
      addToast('success', 'Excel descargado', 'El archivo consolidado ha sido generado.');
    } catch (err: any) {
      addToast('error', 'Error al exportar Excel', err?.message);
    }
  };

  const handleExportPdf = () => {
    if (!importResult) return;
    try {
      exportGeneralPdf(importResult);
      addToast('success', 'PDF general generado', 'Reporte ejecutivo descargado.');
    } catch (err: any) {
      addToast('error', 'Error al exportar PDF', err?.message);
    }
  };

  const handleExportOvertimePdf = () => {
    if (!importResult) return;
    try {
      exportOvertimeSummaryPdf(importResult);
      addToast('success', 'PDF de horas extras descargado', 'Listado con nombres y horas extras para liquidación generado.');
    } catch (err: any) {
      addToast('error', 'Error al exportar PDF de horas extras', err?.message);
    }
  };

  const handleExportEmployeeExcel = (emp: EmployeeSummary) => {
    if (!importResult) return;
    try {
      exportToExcel(importResult, emp);
      addToast('success', 'Excel individual generado', `Planilla de ${emp.employee.name} descargada.`);
    } catch (err: any) {
      addToast('error', 'Error al exportar Excel individual', err?.message);
    }
  };

  const handleExportEmployeePdf = (emp: EmployeeSummary) => {
    if (!importResult) return;
    try {
      exportEmployeeDetailPdf(emp, importResult.companyName, importResult.periodText);
      addToast('success', 'PDF individual generado', `Reporte de ${emp.employee.name} descargado.`);
    } catch (err: any) {
      addToast('error', 'Error al exportar PDF individual', err?.message);
    }
  };

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    if (!importResult) {
      return { all: 0, withOvertime: 0, withoutOvertime: 0, withErrors: 0 };
    }
    let withOvertime = 0;
    let withoutOvertime = 0;
    let withErrors = 0;

    importResult.employees.forEach((emp) => {
      if (emp.totalOvertimeMinutes > 0) withOvertime++;
      else withoutOvertime++;
      if (emp.totalDaysWithErrors > 0) withErrors++;
    });

    return {
      all: importResult.employees.length,
      withOvertime,
      withoutOvertime,
      withErrors,
    };
  }, [importResult]);

  // Filtered and Sorted employees list
  const filteredEmployees = useMemo(() => {
    if (!importResult) return [];

    let list = [...importResult.employees];

    // 1. Search Query (Name, Legajo)
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.employee.name.toLowerCase().includes(q) ||
          e.employee.legajo.toLowerCase().includes(q)
      );
    }

    // 2. Status Tab Filter
    if (filters.statusTab === 'with_overtime') {
      list = list.filter((e) => e.totalOvertimeMinutes > 0);
    } else if (filters.statusTab === 'without_overtime') {
      list = list.filter((e) => e.totalOvertimeMinutes === 0);
    } else if (filters.statusTab === 'with_errors') {
      list = list.filter((e) => e.totalDaysWithErrors > 0);
    }

    // 3. Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === 'name') {
        comparison = a.employee.name.localeCompare(b.employee.name);
      } else if (filters.sortBy === 'legajo') {
        comparison = a.employee.legajo.localeCompare(b.employee.legajo, undefined, { numeric: true });
      } else if (filters.sortBy === 'overtimeHours') {
        comparison = a.totalOvertimeMinutes - b.totalOvertimeMinutes;
      } else if (filters.sortBy === 'workedHours') {
        comparison = a.totalWorkedMinutes - b.totalWorkedMinutes;
      } else if (filters.sortBy === 'days') {
        comparison = a.totalDaysWorked - b.totalDaysWorked;
      }
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [importResult, filters]);

  return (
    <div
      className={
        !importResult
          ? 'h-screen w-screen overflow-hidden bg-slate-100 flex flex-col font-sans antialiased text-slate-800 select-none'
          : 'min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-800'
      }
    >
      {/* Navigation Header */}
      <Navbar
        importResult={importResult}
        onGoBack={() => setImportResult(null)}
        onOpenUpload={() => setShowUploadModal(true)}
        onExportExcel={handleExportExcel}
        onExportGeneralPdf={handleExportPdf}
        onExportOvertimePdf={handleExportOvertimePdf}
        onOpenErrors={() => setShowErrorsModal(true)}
        onOpenRules={() => setShowRulesModal(true)}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      {!importResult ? (
        /* Empty State / Initial Dropzone - Strictly zero scroll */
        <main className="flex-1 flex flex-col justify-center items-center px-4 overflow-hidden">
          <FileDropzone
            onFileSelected={handleProcessFile}
            isLoading={isLoading}
            error={errorMessage}
          />
        </main>
      ) : (
        /* Active Dashboard View */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Top Header Card with active file info and quick actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-xs">
            {/* Left: Back button */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
              <button
                id="btn-back-to-upload-bar"
                onClick={() => setImportResult(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-200/80"
                title="Volver a la pantalla inicial para cargar otro archivo"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Cargar otro Excel</span>
              </button>

              <span className="sm:hidden text-xs font-mono font-semibold text-slate-700 truncate max-w-[150px]">
                {importResult.fileName}
              </span>
            </div>

            {/* Center: File and Period Status */}
            <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-slate-600">
              <span className="text-slate-400 font-medium">Archivo:</span>
              <span className="font-semibold text-slate-900 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {importResult.fileName}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{importResult.periodText || 'Período Completo'}</span>
            </div>

            {/* Right: Quick actions */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Cargar una nueva versión o reemplazo de este archivo"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Reemplazar archivo</span>
              </button>
            </div>
          </div>

          {/* KPI Metric Cards */}
          <KpiCards
            importResult={importResult}
            currentStatusTab={filters.statusTab}
            onFilterByStatus={(status) => handleFilterChange({ statusTab: status })}
            onOpenErrors={() => setShowErrorsModal(true)}
          />

          {/* Filters Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            counts={statusCounts}
          />

          {/* Results Header Info */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold text-slate-800">
              Mostrando {filteredEmployees.length} de {importResult.employees.length} empleados
            </span>
            <span className="text-slate-500">
              Haz clic sobre cualquier empleado para ver el desglose diario de fichadas
            </span>
          </div>

          {/* Main Employees Table */}
          <EmployeeTable
            employees={filteredEmployees}
            onSelectEmployee={(emp) => setSelectedEmployee(emp)}
            onExportEmployeeExcel={handleExportEmployeeExcel}
            onExportEmployeePdf={handleExportEmployeePdf}
          />
        </main>
      )}

      {/* Upload Modal (when clicking "Subir reemplazo" while in dashboard) */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden p-6 relative animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1 font-bold"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Cargar Nuevo Archivo de Fichadas
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Selecciona o arrastra el archivo Excel (.xlsx / .xls) para recalcular.
            </p>
            <FileDropzone
              onFileSelected={handleProcessFile}
              isLoading={isLoading}
              error={errorMessage}
            />
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onExportExcel={handleExportEmployeeExcel}
        onExportPdf={handleExportEmployeePdf}
      />

      {/* Validation Errors Modal */}
      <ValidationErrorsModal
        isOpen={showErrorsModal}
        onClose={() => setShowErrorsModal(false)}
        errors={importResult?.errors || []}
      />

      {/* Calculation Rules Explainer Modal */}
      <RulesExplainerModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
