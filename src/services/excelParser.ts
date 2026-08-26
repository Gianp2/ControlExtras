import * as XLSX from 'xlsx';
import { AttendanceRecord, ValidationError } from '../types';
import { normalizeDate, parseAndRoundTime, getDayNameSpanish } from '../utils/timeCalculations';

export interface RawParseResult {
  records: AttendanceRecord[];
  errors: ValidationError[];
  companyName?: string;
  periodText?: string;
  rawSheetNames: string[];
  totalRowsScanned: number;
}

/**
 * Extracts and cleans string value from a cell.
 */
function getCellStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Checks if a string is a system word that should not be treated as a person's name.
 */
const SYSTEM_WORDS_REGEX = /^(?:EMPRESA|INFORME|REPORTE|TOTAL|TOTALES|HORAS|HORA|FICHADAS|FICHADA|FECHA|DIA|D[IÍ]A|ENTRADA|SALIDA|INGRESO|EGRESO|SECTOR|AREA|[AÁ]REA|TURNO|DESCRIPCION|OBSERVACION|OBSERVACIONES|COMENTARIO|ESTADO|FIRMA|SUBTOTAL|RESUMEN|PROMEDIO|NORMAL|EXTRAS|TARJETAS?|MARCACIONES?|CONTROL\s+DE\s+ASISTENCIA)/i;

/**
 * Cleans and formats an employee name string.
 */
export function cleanEmployeeName(text: string): string {
  if (!text) return '';
  let clean = text.trim();

  // Strip labels like "Empleado:", "Nombre:", "Personal:", "Agente:", "Nombre y Apellido:", "Apellido y Nombre:"
  clean = clean.replace(/^(?:Empleado|Personal|Agente|Nombre|Colaborador|Trabajador|Operario|Apellido y Nombre|Nombre y Apellido|Agente\/Empleado)\s*[:\-\–\.]\s*/i, '');

  // Strip leading brackets or numbers e.g. "[1136] ACOSTA JACINTO" or "1136 - ACOSTA JACINTO" or "1136 ACOSTA JACINTO"
  clean = clean.replace(/^\[?\d{1,8}\]?[\s\-\–\:\.]+\s*/, '');

  // Strip trailing legajo/parenthesis e.g. "ACOSTA JACINTO (1136)" or "ACOSTA JACINTO (Legajo 1136)"
  clean = clean.replace(/\s*[\(\[]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*)?\s*\d+\s*[\)\]]\s*$/i, '');
  clean = clean.replace(/\s*[\-\–]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*)?\s*\d+\s*$/i, '');

  // Strip quotes if any
  clean = clean.replace(/^["']|["']$/g, '');

  // Normalize multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

/**
 * Extracts a legajo / ID number from text or adjacent cell.
 */
export function extractLegajoFromStr(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();

  // Explicit label: "Legajo: 1136", "N° Legajo: 1136", "Nro: 1136", "Leg.: 1136", "ID: 1136"
  const labelMatch = clean.match(/(?:N[\.\°\s]*Legajo|N[\°\º\.]+|Nro[\.\s]*|Legajo|Leg\.|Leg|DNI|Matr[ií]cula|Ficha|ID|C[oó]digo)\s*[:\-]?\s*([A-Za-z0-9\-\.]+)/i);
  if (labelMatch) {
    const val = labelMatch[1].trim();
    if (val && !SYSTEM_WORDS_REGEX.test(val)) {
      return val;
    }
  }

  // Bracket combo: "[1136] ACOSTA" -> "1136"
  const comboBracket = clean.match(/^\[(\d{1,8})\]/);
  if (comboBracket) {
    return comboBracket[1].trim();
  }

  // Dash/colon combo: "1136 - ACOSTA" or "1136: ACOSTA" -> "1136"
  const comboDash = clean.match(/^(\d{1,8})\s*[\-\–\:\/]\s*[A-Za-zÁÉÍÓÚÑáéíóúñ]/);
  if (comboDash) {
    return comboDash[1].trim();
  }

  // Trailing combo: "ACOSTA (1136)" or "ACOSTA [1136]" -> "1136"
  const comboTrailing = clean.match(/[\(\[]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*)?\s*(\d{1,8})\s*[\)\]]$/i);
  if (comboTrailing) {
    return comboTrailing[1].trim();
  }

  // Pure numeric string
  if (/^\d{1,8}$/.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Checks if a string looks like a valid employee name candidate.
 */
function isValidNameCandidate(text: string): boolean {
  if (!text) return false;
  const clean = cleanEmployeeName(text);

  if (clean.length < 3 || clean.length > 60) return false;
  if (/^\d+$/.test(clean)) return false;
  if (SYSTEM_WORDS_REGEX.test(clean)) return false;

  // Must contain letters and not be a date or time
  const hasLetters = /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(clean);
  const isDate = normalizeDate(clean) !== null;
  const isTime = parseAndRoundTime(clean) !== null;

  return hasLetters && !isDate && !isTime;
}

/**
 * Detects if a row defines column headers for a tabular format.
 */
interface TableColumnsMap {
  colLegajo: number;
  colName: number;
  colDate: number;
  colEntry?: number;
  colExit?: number;
  timeColumns: number[];
}

function detectTableColumns(rowCells: string[]): TableColumnsMap | null {
  let colLegajo = -1;
  let colName = -1;
  let colDate = -1;
  let colEntry = -1;
  let colExit = -1;
  const timeColumns: number[] = [];

  for (let i = 0; i < rowCells.length; i++) {
    const raw = rowCells[i].toLowerCase().trim();
    if (!raw) continue;

    // Check Legajo column
    if (
      colLegajo === -1 &&
      (raw.includes('legajo') ||
        raw === 'leg' ||
        raw === 'leg.' ||
        raw === 'nro' ||
        raw === 'n°' ||
        raw === 'nro.' ||
        raw === 'id' ||
        raw === 'ficha' ||
        raw === 'codigo' ||
        raw === 'código' ||
        raw === 'matrícula' ||
        raw === 'matricula')
    ) {
      colLegajo = i;
      continue;
    }

    // Check Name / Employee column
    if (
      colName === -1 &&
      (raw.includes('nombre') ||
        raw.includes('apellido') ||
        raw.includes('empleado') ||
        raw.includes('personal') ||
        raw.includes('agente') ||
        raw.includes('colaborador') ||
        raw.includes('operario'))
    ) {
      colName = i;
      continue;
    }

    // Check Date column
    if (
      colDate === -1 &&
      (raw.includes('fecha') ||
        raw === 'dia' ||
        raw === 'día' ||
        raw === 'fichada' ||
        raw === 'f. fichada' ||
        raw === 'date')
    ) {
      colDate = i;
      continue;
    }

    // Check Entry / Exit columns
    if (raw.includes('entrada') || raw.includes('ingreso') || raw === 'desde' || raw === 'in' || raw === 'e1' || raw === 'ent 1') {
      if (colEntry === -1) colEntry = i;
      timeColumns.push(i);
      continue;
    }

    if (raw.includes('salida') || raw.includes('egreso') || raw === 'hasta' || raw === 'out' || raw === 's1' || raw === 'sal 1') {
      if (colExit === -1) colExit = i;
      timeColumns.push(i);
      continue;
    }

    if (raw.includes('e2') || raw.includes('s2') || raw.includes('e3') || raw.includes('s3') || raw.includes('marcado') || raw.includes('horario')) {
      timeColumns.push(i);
    }
  }

  // To be considered a valid Tabular Table, we need at least Date AND (Name or Legajo)
  if (colDate !== -1 && (colName !== -1 || colLegajo !== -1)) {
    return {
      colLegajo,
      colName,
      colDate,
      colEntry: colEntry !== -1 ? colEntry : undefined,
      colExit: colExit !== -1 ? colExit : undefined,
      timeColumns,
    };
  }

  return null;
}

/**
 * Checks if a row is a period header.
 * Example: "Período: 01/08/2026 al 31/08/2026"
 */
function extractPeriod(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:Per[ií]odo|Desde|Rango)\s*[:\-]\s*(.+)/i);
  if (match) {
    return match[0].trim();
  }
  return null;
}

/**
 * Main parser that accurately handles all Argentine & international HR Excel formats
 * (Tabular grid, BioStar/ZKTeco blocks, multi-cell labels, cards, and daily punches).
 */
export async function parseAttendanceExcel(file: File): Promise<RawParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
    dateNF: 'yyyy-mm-dd',
  });

  const rawSheetNames = workbook.SheetNames;
  if (!rawSheetNames || rawSheetNames.length === 0) {
    throw new Error('El archivo Excel no contiene ninguna hoja válida.');
  }

  const records: AttendanceRecord[] = [];
  const errors: ValidationError[] = [];
  let companyName: string | undefined;
  let periodText: string | undefined;
  let totalRowsScanned = 0;

  // Process the first non-empty sheet
  let activeSheet = workbook.Sheets[rawSheetNames[0]];
  let rawRows: unknown[][] = XLSX.utils.sheet_to_json(activeSheet, {
    header: 1,
    defval: '',
    blankrows: true,
    raw: false,
  });

  // If first sheet is empty, check other sheets
  if (rawRows.length === 0 && rawSheetNames.length > 1) {
    for (let s = 1; s < rawSheetNames.length; s++) {
      const candidateSheet = workbook.Sheets[rawSheetNames[s]];
      const candidateRows: unknown[][] = XLSX.utils.sheet_to_json(candidateSheet, {
        header: 1,
        defval: '',
        blankrows: true,
        raw: false,
      });
      if (candidateRows.length > 0) {
        activeSheet = candidateSheet;
        rawRows = candidateRows;
        break;
      }
    }
  }

  totalRowsScanned = rawRows.length;
  if (totalRowsScanned === 0) {
    throw new Error('El archivo Excel está vacío o no contiene filas con datos legibles.');
  }

  // 1. Scan the first 25 rows to see if there is a global Tabular Header
  let tableHeaderRowIndex = -1;
  let tableColumns: TableColumnsMap | null = null;

  for (let r = 0; r < Math.min(25, rawRows.length); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;
    const strCells = row.map(c => getCellStr(c));
    const detected = detectTableColumns(strCells);
    if (detected) {
      tableHeaderRowIndex = r;
      tableColumns = detected;
      break;
    }
  }

  // Active state for Block / Card based parsing
  let currentEmployeeName: string | null = null;
  let currentLegajo: string | null = null;
  let punchesInCurrentBlock = 0;
  let lastEmployeeHeaderRow = 0;

  // Track unique punch signatures to prevent duplicate row counting
  const seenPunchesSet = new Set<string>();

  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    const rowNum = rowIndex + 1; // 1-indexed for display

    if (!row || !Array.isArray(row) || row.length === 0) {
      continue;
    }

    const strCells = row.map(c => getCellStr(c));
    const nonBlankCells = strCells.filter(s => s.length > 0);
    const rowText = strCells.join(' | ');

    if (nonBlankCells.length === 0) {
      continue; // skip blank row
    }

    // Skip the exact tabular header row if we are at it
    if (rowIndex === tableHeaderRowIndex) {
      continue;
    }

    // Scan metadata in the first 8 rows (Company name, Period)
    if (rowIndex < 8) {
      const periodFound = extractPeriod(rowText);
      if (periodFound && !periodText) {
        periodText = periodFound;
      }

      if (!companyName && nonBlankCells.length === 1 && !SYSTEM_WORDS_REGEX.test(nonBlankCells[0])) {
        companyName = nonBlankCells[0];
      }
    }

    // =========================================================================
    // STEP A: DETECT EMPLOYEE NAME & LEGAJO IN THIS ROW
    // =========================================================================
    let rowEmployeeName: string | null = null;
    let rowLegajo: string | null = null;

    // 1. If we have a Tabular table map:
    if (tableColumns) {
      if (tableColumns.colLegajo !== -1 && tableColumns.colLegajo < row.length) {
        const legCell = strCells[tableColumns.colLegajo];
        const extracted = extractLegajoFromStr(legCell);
        if (extracted) rowLegajo = extracted;
      }
      if (tableColumns.colName !== -1 && tableColumns.colName < row.length) {
        const nameCell = strCells[tableColumns.colName];
        if (isValidNameCandidate(nameCell)) {
          rowEmployeeName = cleanEmployeeName(nameCell);
        }
      }
    }

    // 2. Scan multi-cell key-value pairs (e.g. Col A = "Legajo:", Col B = "1136" | Col C = "Nombre:", Col D = "ACOSTA JACINTO")
    for (let c = 0; c < row.length; c++) {
      const cellVal = strCells[c];
      if (!cellVal) continue;

      // Check if this cell is a Legajo label and adjacent cell has the value
      if (/(?:^|\s)(?:legajo|leg\.|nro|n[°º\.]+|ficha|id|c[oó]digo)[\s:]*$/i.test(cellVal) && c + 1 < row.length) {
        const nextCell = strCells[c + 1];
        const extracted = extractLegajoFromStr(nextCell);
        if (extracted && !rowLegajo) {
          rowLegajo = extracted;
        }
      }

      // Check if this cell is a Name label and adjacent cell has the value
      if (/(?:^|\s)(?:nombre|empleado|agente|personal|colaborador|apellido)[\s:]*$/i.test(cellVal) && c + 1 < row.length) {
        const nextCell = strCells[c + 1];
        if (isValidNameCandidate(nextCell) && !rowEmployeeName) {
          rowEmployeeName = cleanEmployeeName(nextCell);
        }
      }

      // Check single cell that contains both label and value (e.g. "Legajo: 1136", "Nombre: ACOSTA JACINTO", "Empleado: 1136 - ACOSTA JACINTO")
      const legInCell = extractLegajoFromStr(cellVal);
      if (legInCell && !rowLegajo && (cellVal.toLowerCase().includes('leg') || cellVal.toLowerCase().includes('nro') || cellVal.toLowerCase().includes('id') || cellVal.includes('['))) {
        rowLegajo = legInCell;
      }

      if (/(?:empleado|personal|agente|nombre)\s*[:\-\–\.]/i.test(cellVal) && !rowEmployeeName) {
        const cleaned = cleanEmployeeName(cellVal);
        if (isValidNameCandidate(cleaned)) {
          rowEmployeeName = cleaned;
        }
      }

      // Combo bracket/dash e.g. "[1136] ACOSTA JACINTO" or "1136 - ACOSTA JACINTO"
      const comboMatch = cellVal.match(/^(?:\[?(\d{1,8})\]?[\s\-\–\:\.]+)([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})$/);
      if (comboMatch) {
        if (!rowLegajo) rowLegajo = comboMatch[1].trim();
        if (!rowEmployeeName) rowEmployeeName = cleanEmployeeName(comboMatch[2]);
      }
    }

    // 3. Fallback for unlabeled Employee Header rows (e.g. Cell 0 = "1136", Cell 1 = "ACOSTA JACINTO" on non-punch row)
    const hasDateInRow = row.some(c => normalizeDate(c) !== null);

    if (!hasDateInRow && (!rowEmployeeName || !rowLegajo)) {
      for (let c = 0; c < row.length; c++) {
        const cell = strCells[c];
        if (!cell) continue;

        if (!rowLegajo && /^\d{1,8}$/.test(cell)) {
          rowLegajo = cell;
        } else if (!rowEmployeeName && isValidNameCandidate(cell)) {
          rowEmployeeName = cleanEmployeeName(cell);
        }
      }
    }

    // If an employee header/context was detected:
    if (rowEmployeeName || rowLegajo) {
      if (rowEmployeeName) {
        currentEmployeeName = rowEmployeeName;
        lastEmployeeHeaderRow = rowNum;
        punchesInCurrentBlock = 0;
      }
      if (rowLegajo) {
        currentLegajo = rowLegajo;
      }

      // If this row has NO date or punches, it's purely an Employee Header Row. Move to next row!
      if (!hasDateInRow) {
        continue;
      }
    }

    // =========================================================================
    // STEP B: DETECT DATE & TIME PUNCHES IN THIS ROW
    // =========================================================================
    let foundDate: { iso: string; formatted: string } | null = null;
    let dateColIdx = -1;

    // Check mapped date column first
    if (tableColumns && tableColumns.colDate !== -1 && tableColumns.colDate < row.length) {
      foundDate = normalizeDate(row[tableColumns.colDate]);
      if (foundDate) dateColIdx = tableColumns.colDate;
    }

    // If not found in mapped column, scan all cells for a Date
    if (!foundDate) {
      for (let c = 0; c < row.length; c++) {
        const parsedD = normalizeDate(row[c]);
        if (parsedD) {
          foundDate = parsedD;
          dateColIdx = c;
          break;
        }
      }
    }

    // If no date found in this row, skip (could be summary row, notes, footer)
    if (!foundDate) {
      continue;
    }

    // Determine Day Name
    let dayName = '';
    if (dateColIdx > 0 && typeof row[dateColIdx - 1] === 'string') {
      const prevStr = getCellStr(row[dateColIdx - 1]);
      if (/^(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo|Lun|Mar|Mi[eé]|Jue|Vie|S[aá]b|Dom)/i.test(prevStr)) {
        dayName = prevStr;
      }
    }
    if (!dayName) {
      dayName = getDayNameSpanish(foundDate.iso);
    }

    // Extract all valid Time punch candidates in this row
    const timeCandidates: {
      totalMinutes: number;
      formatted: string;
      raw: string;
      colIdx: number;
    }[] = [];

    // If table has designated entry/exit columns
    if (tableColumns && tableColumns.colEntry !== undefined && tableColumns.colExit !== undefined) {
      const entryVal = row[tableColumns.colEntry];
      const exitVal = row[tableColumns.colExit];
      const parsedEntry = parseAndRoundTime(entryVal);
      const parsedExit = parseAndRoundTime(exitVal);

      if (parsedEntry) {
        timeCandidates.push({ ...parsedEntry, colIdx: tableColumns.colEntry });
      }
      if (parsedExit) {
        timeCandidates.push({ ...parsedExit, colIdx: tableColumns.colExit });
      }
    }

    // If no fixed entry/exit or not enough candidates, scan all non-date cells
    if (timeCandidates.length === 0) {
      for (let c = 0; c < row.length; c++) {
        if (c === dateColIdx) continue;
        // Do not parse legajo column or name column as a time
        if (tableColumns && (c === tableColumns.colLegajo || c === tableColumns.colName)) continue;

        const cellVal = row[c];
        const strVal = getCellStr(cellVal);

        // Avoid parsing pure legajo numbers as time
        if (/^\d{1,8}$/.test(strVal) && (strVal === currentLegajo || strVal.length >= 4 && parseInt(strVal, 10) > 2400)) {
          continue;
        }

        const parsedTime = parseAndRoundTime(cellVal);
        if (parsedTime) {
          timeCandidates.push({
            ...parsedTime,
            colIdx: c,
          });
        }
      }
    }

    // Active employee determination
    const finalEmployeeName = rowEmployeeName || currentEmployeeName || (currentLegajo ? `Empleado ${currentLegajo}` : 'Empleado Sin Nombre');
    const finalLegajo = rowLegajo || currentLegajo || (rowEmployeeName ? rowEmployeeName.replace(/\D/g, '') || 'S/L' : 'S/L');

    // Update active context
    currentEmployeeName = finalEmployeeName;
    currentLegajo = finalLegajo;

    // If no punch times in this row (e.g. non-working day, descanso, domingo, franco, feriado):
    // This is completely normal and should NOT generate an error. Simply skip to next row.
    if (timeCandidates.length === 0) {
      continue;
    }

    // Sort time candidates in this row by time or column index
    timeCandidates.sort((a, b) => (a.colIdx !== b.colIdx ? a.colIdx - b.colIdx : a.totalMinutes - b.totalMinutes));

    // Multiple punches on the same row: pair them [0,1], [2,3]
    if (timeCandidates.length >= 2) {
      for (let t = 0; t < timeCandidates.length; t += 2) {
        const entryCand = timeCandidates[t];
        const exitCand = timeCandidates[t + 1];

        if (!exitCand) {
          // Unpaired trailing punch on this row
          records.push({
            id: `rec-${rowNum}-${records.length}`,
            rawRowNumber: rowNum,
            employeeName: finalEmployeeName,
            legajo: finalLegajo,
            dateStr: foundDate.iso,
            formattedDate: foundDate.formatted,
            dayName,
            entryRaw: entryCand.raw,
            exitRaw: '',
            entryMinutes: entryCand.totalMinutes,
            exitMinutes: null,
            entryRoundedStr: entryCand.formatted,
            exitRoundedStr: '',
            durationMinutes: 0,
            isValid: true,
          });
          break;
        }

        let eMin = entryCand.totalMinutes;
        let sMin = exitCand.totalMinutes;
        let isValidInterval = true;
        let errorReason: string | undefined;

        if (eMin > sMin) {
          // If reversed times, adjust duration or swap if clearly inverted
          const temp = eMin;
          eMin = sMin;
          sMin = temp;
          errorReason = `Horario invertido ajustado: ${entryCand.formatted} - ${exitCand.formatted}`;
        }

        const durationMinutes = Math.max(0, sMin - eMin);

        // Avoid exact duplicate rows
        const punchSig = `${finalLegajo}_${foundDate.iso}_${entryCand.formatted}_${exitCand.formatted}`;
        if (!seenPunchesSet.has(punchSig)) {
          seenPunchesSet.add(punchSig);
          records.push({
            id: `rec-${rowNum}-${records.length}`,
            rawRowNumber: rowNum,
            employeeName: finalEmployeeName,
            legajo: finalLegajo,
            dateStr: foundDate.iso,
            formattedDate: foundDate.formatted,
            dayName,
            entryRaw: entryCand.raw,
            exitRaw: exitCand.raw,
            entryMinutes: eMin,
            exitMinutes: sMin,
            entryRoundedStr: entryCand.formatted,
            exitRoundedStr: exitCand.formatted,
            durationMinutes,
            isValid: isValidInterval,
            errorReason,
          });
          punchesInCurrentBlock++;
        }
      }
    } else if (timeCandidates.length === 1) {
      // Single punch on this row (e.g. event log with 1 punch per row)
      const singleTime = timeCandidates[0];
      records.push({
        id: `rec-${rowNum}-${records.length}`,
        rawRowNumber: rowNum,
        employeeName: finalEmployeeName,
        legajo: finalLegajo,
        dateStr: foundDate.iso,
        formattedDate: foundDate.formatted,
        dayName,
        entryRaw: singleTime.raw,
        exitRaw: '',
        entryMinutes: singleTime.totalMinutes,
        exitMinutes: null,
        entryRoundedStr: singleTime.formatted,
        exitRoundedStr: '',
        durationMinutes: 0,
        isValid: true,
      });
      punchesInCurrentBlock++;
    }
  }

  if (records.length === 0) {
    throw new Error(
      'No se encontraron registros de fichadas válidos con fechas y horarios en el archivo Excel. Verifique el formato.'
    );
  }

  return {
    records,
    errors,
    companyName,
    periodText,
    rawSheetNames,
    totalRowsScanned,
  };
}
