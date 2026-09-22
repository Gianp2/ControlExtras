import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  AlertTriangle,
  HelpCircle,
  Building2,
  Calendar,
  Users,
  Flame,
  ChevronDown,
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
  onOpenUpload,
  onExportExcel,
  onExportGeneralPdf,
  onExportOvertimePdf,
  onOpenErrors,
  onOpenRules,
  isLoading,
}) => {
  const errorCount = importResult?.errors.length || 0;
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPdfDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800/90 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-[72px] py-3 gap-4 sm:gap-6">
          
          {/* Left: Brand Identity & Active File Info */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 border border-emerald-400/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight leading-tight">
                  Control de Fichadas
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-md tracking-wider">
                  RR. HH.
                </span>
              </div>

              {importResult ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-[220px]">
                    {importResult.companyName || 'Empresa'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="truncate max-w-[120px] sm:max-w-[180px] text-slate-400">
                    {importResult.periodText || 'Período actual'}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] sm:text-xs text-slate-400 font-normal mt-0.5">
                  Liquidación de jornadas y horas extras
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions & Export Tools with generous spacing */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Criterios de Cálculo */}
            <button
              id="btn-rules-info"
              onClick={onOpenRules}
              title="Ver reglas de cálculo de jornada y horas extras"
              className="px-3.5 py-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Criterios</span>
            </button>

            {/* Error Alerts Button (if any) */}
            {errorCount > 0 && (
              <button
                id="btn-nav-errors"
                onClick={onOpenErrors}
                className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                title="Ver observaciones detectadas"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{errorCount}</span>
                <span className="hidden sm:inline">{errorCount === 1 ? 'alerta' : 'alertas'}</span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-800 hidden md:block mx-0.5" />

            {!importResult ? (
              /* State: No file loaded */
              <button
                id="btn-upload-nav"
                onClick={onOpenUpload}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs border border-emerald-500/30 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar Excel</span>
              </button>
            ) : (
              /* State: File loaded - Generously spaced export tools */
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Desktop: Direct PDF Buttons */}
                <div className="hidden lg:flex items-center gap-2.5">
                  {/* PDF Horas Extras para Liquidación */}
                  <button
                    id="btn-export-overtime-pdf"
                    onClick={onExportOvertimePdf}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:shadow-amber-900/30"
                    title="Descargar PDF enfocado con nombres y horas extras para liquidación"
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-200" />
                    <span>PDF Horas Extras</span>
                  </button>

                  {/* PDF General */}
                  <button
                    id="btn-export-general-pdf"
                    onClick={onExportGeneralPdf}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:shadow-indigo-900/30"
                    title="Descargar reporte PDF general con todas las fichadas y firmas"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-200" />
                    <span>PDF General</span>
                  </button>
                </div>

                {/* Tablet / Mobile: Unified PDF Dropdown */}
                <div className="relative lg:hidden" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowPdfDropdown(!showPdfDropdown)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>PDFs</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  {showPdfDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl py-2 z-50 animate-scaleIn">
                      <button
                        onClick={() => {
                          setShowPdfDropdown(false);
                          onExportOvertimePdf();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold">PDF Horas Extras</div>
                          <div className="text-[10px] text-slate-400 font-normal">Para liquidación de haberes</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowPdfDropdown(false);
                          onExportGeneralPdf();
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700/80 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-700/50"
                      >
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-bold">PDF General</div>
                          <div className="text-[10px] text-slate-400 font-normal">Con todas las fichadas y firmas</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Excel Export Button */}
                <button
                  id="btn-export-excel"
                  onClick={onExportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:shadow-emerald-900/30"
                  title="Exportar resumen y detalle a Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
