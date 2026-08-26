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
      alert('Por favor selecciona un archivo con extensión válida de Excel (.xlsx o .xls)');
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center items-center px-4 select-none">
      {/* Header section */}
      <div className="text-center mb-4 sm:mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold tracking-wide mb-2">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistema de Liquidación y Control de Fichadas</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Cargar Planilla de Fichadas
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Arrastra o selecciona el archivo Excel (.xlsx / .xls) del reloj para procesar jornadas y horas extras.
        </p>
      </div>

      {error && (
        <div className="w-full mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Main Drag and Drop Box */}
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`w-full relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/70 shadow-xs'
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

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/80 shadow-inner">
            {isLoading ? (
              <RefreshCw className="w-6 h-6 sm:w-7 sm:h-7 animate-spin text-emerald-600" />
            ) : (
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
            )}
          </div>

          <div>
            <p className="text-sm sm:text-base font-bold text-slate-800">
              {isLoading
                ? 'Analizando fichadas y calculando horas...'
                : 'Arrastra tu archivo Excel aquí o haz clic para buscarlo'}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Formatos compatibles: <span className="font-semibold text-slate-700">.xlsx</span> y <span className="font-semibold text-slate-700">.xls</span>
            </p>
          </div>

          <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200/80">
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              Lectura por legajo
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200/80">
              <Clock className="w-3 h-3 text-amber-600" />
              9h y Horas Extras
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium border border-slate-200/80">
              <Layers className="w-3 h-3 text-indigo-600" />
              Múltiples tramos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
