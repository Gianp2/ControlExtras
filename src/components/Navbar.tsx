import React from 'react';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  AlertTriangle,
  HelpCircle,
  Building2,
  Calendar,
  Users,
  ArrowLeft,
  Flame,
  FileCheck,
} from 'lucide-react';
import { ImportResult } from '../types';

interface NavbarProps {
  importResult: ImportResult | null;
  onGoBack?: () => void;
  onOpenUpload: () => void;
  onExportExcel: () => void;
  onExportGeneralPdf: () => void;
  onExportOvertimePdf: () => void;
  onOpenErrors: () => void;
  onOpenRules: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  importResult,
  onGoBack,
  onOpenUpload,
  onExportExcel,
  onExportGeneralPdf,
  onExportOvertimePdf,
  onOpenErrors,
  onOpenRules,
  isLoading,
}) => {
  const errorCount = importResult?.errors.length || 0;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand Identity & Back Action */}
          <div className="flex items-center space-x-3 shrink-0">
            {importResult && onGoBack ? (
              <button
                id="btn-nav-go-back"
                onClick={onGoBack}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Volver a la pantalla inicial para cargar otro archivo"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Cargar otro</span>
              </button>
            ) : null}

            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm border border-emerald-500/30 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base text-white tracking-tight leading-tight">
                    Control de Fichadas
                  </span>
                  <span className="hidden md:inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded">
                    RR. HH.
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                  Liquidación de jornadas y horas extras
                </span>
              </div>
            </div>
          </div>

          {/* Center: Prominent, Centered & Clean Active File Details */}
          {importResult ? (
            <div className="flex-1 flex justify-center items-center px-2">
              <div className="flex items-center justify-center gap-2 sm:gap-3.5 px-3.5 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-slate-200 shadow-inner max-w-xl truncate">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white truncate max-w-[120px] sm:max-w-[160px]">
                    {importResult.companyName || 'Empresa'}
                  </span>
                </div>

                <span className="text-slate-600 shrink-0">|</span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-slate-300 font-medium truncate max-w-[120px] sm:max-w-[180px]">
                    {importResult.periodText || 'Período actual'}
                  </span>
                </div>

                <span className="text-slate-600 shrink-0 hidden md:inline">|</span>

                <div className="hidden md:flex items-center gap-1 text-emerald-400 font-semibold font-mono shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  <span>{importResult.employees.length}</span>
                  <span className="text-[11px] font-sans font-normal text-slate-300">empleados</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Right: Actions & Export Tools */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* System Rules Modal Button */}
            <button
              id="btn-rules-info"
              onClick={onOpenRules}
              title="Ver reglas de cálculo de jornada y horas extras"
              className="px-2.5 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Criterios</span>
            </button>

            {/* Error Alerts Button (if any) */}
            {errorCount > 0 && (
              <button
                id="btn-nav-errors"
                onClick={onOpenErrors}
                className="px-2.5 py-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                title="Ver observaciones detectadas"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{errorCount}</span>
                <span className="hidden xl:inline">{errorCount === 1 ? 'alerta' : 'alertas'}</span>
              </button>
            )}

            <div className="h-5 w-px bg-slate-800 hidden sm:block mx-1" />

            {!importResult ? (
              /* State: No file loaded */
              <button
                id="btn-upload-nav"
                onClick={onOpenUpload}
                disabled={isLoading}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs border border-emerald-500/30 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar Excel</span>
              </button>
            ) : (
              /* State: File loaded - Organized Actions */
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {/* PDF Horas Extras para Liquidación */}
                <button
                  id="btn-export-overtime-pdf"
                  onClick={onExportOvertimePdf}
                  className="px-2.5 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Descargar PDF enfocado con nombres y horas extras para liquidación"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-200" />
                  <span className="hidden md:inline">PDF Horas Extras</span>
                  <span className="md:hidden">Extras</span>
                </button>

                {/* PDF General */}
                <button
                  id="btn-export-general-pdf"
                  onClick={onExportGeneralPdf}
                  className="px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Descargar reporte PDF general con todas las fichadas"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">PDF General</span>
                  <span className="lg:hidden">General</span>
                </button>

                {/* Exportar Excel */}
                <button
                  id="btn-export-excel"
                  onClick={onExportExcel}
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Exportar resumen y detalle a Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
