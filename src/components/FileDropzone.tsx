import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, Layers, Clock } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onFileSelected,
  isLoading,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAndUpload = (file: File) => {
    const validExtensions = ['.xlsx', '.xls'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setLocalError('Por favor selecciona un archivo con extensión válida de Excel (.xlsx o .xls)');
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center items-center px-4 select-none">
      {/* Header section */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200/90 rounded-full text-xs font-bold tracking-wide mb-3 shadow-2xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Control Horario & Liquidación Laboral</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Cargar Planilla de Fichadas
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Procesamiento automático de legajos, jornada legal y cómputo de horas extras con redondeo reglamentario.
        </p>
      </div>

      {(localError || error) && (
        <div className="w-full mb-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-semibold">{localError || error}</p>
        </div>
      )}

      {/* Main Drag and Drop Box */}
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`w-full relative border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 group ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01] shadow-lg ring-4 ring-emerald-500/20'
            : 'border-slate-300/90 hover:border-emerald-500 bg-white hover:bg-slate-50/70 shadow-sm hover:shadow-md'
        } ${isLoading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <input
          id="file-input-excel"
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".xlsx, .xls"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-100 to-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/90 shadow-xs group-hover:scale-105 transition-transform">
            {isLoading ? (
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
            ) : (
              <UploadCloud className="w-7 h-7 text-emerald-600" />
            )}
          </div>

          <div>
            <p className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
              {isLoading
                ? 'Analizando fichadas y consolidando legajos...'
                : 'Arrastra tu archivo Excel aquí o haz clic para seleccionarlo'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Archivos soportados: <span className="font-mono font-bold text-slate-700">.xlsx</span> y <span className="font-mono font-bold text-slate-700">.xls</span>
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 text-slate-700 rounded-xl font-medium border border-slate-200">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Detección precisa de Legajos
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 text-slate-700 rounded-xl font-medium border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Cálculo de Extras
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 text-slate-700 rounded-xl font-medium border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Múltiples Fichadas / Día
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
