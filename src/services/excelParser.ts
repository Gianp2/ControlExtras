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
 * Checks if a string is a system word or day name that should not be treated as a person's name or legajo.
 */
export const SYSTEM_WORDS_REGEX = /^(?:EMPRESA|INFORME|REPORTE|TOTAL|TOTALES|TOTAL\s*HS\.?|TOTAL\s*HORAS|HORAS|HORA|HS\.?|FICHADAS|FICHADA|FECHA|DIA|D[IÍ]A|ENTRADA|SALIDA|INGRESO|EGRESO|SECTOR|AREA|[AÁ]REA|TURNO|DESCRIPCION|OBSERVACION|OBSERVACIONES|COMENTARIO|ESTADO|FIRMA|SUBTOTAL|RESUMEN|PROMEDIO|NORMAL|EXTRAS|TARJETAS?|MARCACIONES?|CONTROL\s+DE\s+ASISTENCIA|PER[IÍ]ODO(?:\s+DE\s+EVALUACI[OÓ]N)?|EVALUACI[OÓ]N|SEMANA|LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)$/i;

/**
 * Checks whether a string represents a day of the week in Spanish or English.
 */
export function isDayName(str: string): boolean {
  if (!str) return false;
  const upper = str.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^(?:LUNES|MARTES|MIERCOLES|JUEVES|VIERNES|SABADO|DOMINGO|LUN|MAR|MIE|JUE|VIE|SAB|DOM|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY|MON|TUE|WED|THU|FRI|SAT|SUN)$/.test(upper);
}

/**
 * Validates whether an extracted string is a legitimate employee legajo/ID.
 * Filters out system words, header labels, date/time formats, and parsing artifacts (like "N", "Nro", "No").
 */
function isValidLegajoValue(val: string): boolean {
  if (!val) return false;
  const upper = val.toUpperCase().trim();
  if (SYSTEM_WORDS_REGEX.test(upper)) return false;

  // Discard isolated label tokens, abbreviations or bad artifacts
  if (/^(?:N|NRO|NO|N°|Nº|N\.|LEGAJO|LEG|TARJETA|FICHA|ID|DNI|COD|CODIGO|CÓDIGO|EMPLEADO|NOMBRE|FECHA|DIA|DÍA|TOTAL|SUBTOTAL|HORAS|HORA|DESDE|HASTA|SECTOR|AREA|TURNO|FIRMA|OK|SI|NO|S\/L|NULL|UNDEFINED|NAN|TRUE|FALSE)$/i.test(upper)) {
    return false;
  }

  // A legajo MUST contain at least one digit! (Words with only letters like "ACOSTA" or "JUAN" are names, not legajos)
  if (!/\d/.test(upper)) {
    return false;
  }

  // Length sanity check (legajos are typically 1 to 15 chars)
  if (upper.length < 1 || upper.length > 18) return false;

  // Avoid pure date formats e.g. "01/08/2026", "2026-08-01", "01-08-2026"
  if (normalizeDate(upper) !== null) return false;

  // Avoid pure time formats e.g. "08:00", "17:30:00", "08:00 AM" (must have colon or AM/PM)
  if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?$/i.test(upper) || /^\d{1,2}\s*(?:AM|PM)$/i.test(upper)) {
    return false;
  }

  // Avoid day names
  if (/^(?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO|LUN|MAR|MI[EÉ]|JUE|VIE|S[AÁ]B|DOM)$/i.test(upper)) {
    return false;
  }

  return true;
}

/**
 * Cleans and standardizes an extracted legajo number.
 * Normalizes Excel decimal formats (e.g. "1136.0" -> "1136"),
 * thousands separators ("1,136" or "1.136"), and brackets.
 */
export function cleanLegajoValue(val: string): string {
  if (!val) return '';
  let clean = val.trim();

  // Strip enclosing quotes, brackets, parens
  clean = clean.replace(/^["'\[\(]+|["'\]\)]+$/g, '').trim();

  // Strip trailing punctuation like colons or dots e.g. "1136:" -> "1136"
  clean = clean.replace(/[:;\-\.\,\#]+$/, '').trim();

  // If Excel float like "1136.0" or "1136.00" -> "1136"
  clean = clean.replace(/^(\d+)\.0+$/, '$1');

  // If formatted with thousands comma like "1,136" -> "1136"
  if (/^\d{1,3}(,\d{3})+$/.test(clean)) {
    clean = clean.replace(/,/g, '');
  }

  // If formatted with thousands dot like "1.136" -> "1136" (3-digit grouping)
  if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
    clean = clean.replace(/\./g, '');
  }

  return clean;
}

/**
 * Cleans and formats an employee name string.
 */
export function cleanEmployeeName(text: string): string {
  if (!text) return '';
  let clean = text.trim();

  // Strip labels like "Empleado:", "Nombre:", "Personal:", "Agente:", "Nombre y Apellido:", "Apellido y Nombre:"
  clean = clean.replace(/^(?:Empleado|Personal|Agente|Nombre|Colaborador|Trabajador|Operario|Apellido y Nombre|Nombre y Apellido|Agente\/Empleado)\s*[:\-\–\.]\s*/i, '');

  // Strip leading legajo prefixes:
  // e.g. "Legajo: 1136 - ACOSTA JACINTO", "Legajo N° 1136 ACOSTA JACINTO", "1136 - ACOSTA JACINTO", "[1136] ACOSTA"
  clean = clean.replace(/^(?:(?:N[\°\º\.]*|Nro[\.\s]*)?(?:Legajo|Leg\.|Tarjeta|Ficha|ID|C[oó]d\.?)\s*[:\-\–\.]*\s*(?:N[\°\º\.]+|Nro[\.\s]*|#)?\s*\d+[\s\-\–\:\/\|]+)+/i, '');
  clean = clean.replace(/^\[?\d{1,8}\]?[\s\-\–\:\.]+\s*/, '');

  // Strip trailing legajo/parenthesis e.g. "ACOSTA JACINTO (1136)" or "ACOSTA JACINTO (Legajo 1136)" or "ACOSTA JACINTO - 1136"
  clean = clean.replace(/\s*[\(\[]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*|Tarjeta[\s:]*|ID[\s:]*)?\s*\d+\s*[\)\]]\s*$/i, '');
  clean = clean.replace(/\s*[\-\–\|\/]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*)?\s*\d+\s*$/i, '');
  clean = clean.replace(/\s+\d{1,8}$/, '');

  // Strip quotes if any
  clean = clean.replace(/^["']|["']$/g, '');

  // Normalize multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

/**
 * Extracts both employee name and legajo from a single cell if both are present.
 * Examples:
 * - "Legajo: 1136 - ACOSTA JACINTO"
 * - "1136 - ACOSTA JACINTO"
 * - "[1136] ACOSTA JACINTO"
 * - "ACOSTA JACINTO (Legajo 1136)"
 * - "Legajo: 1136 Nombre: ACOSTA JACINTO"
 */
export function extractEmployeeAndLegajoFromCell(text: string): { legajo: string | null; name: string | null } {
  if (!text) return { legajo: null, name: null };
  const clean = text.trim();

  // Pattern: "Legajo: 1136 Nombre: ACOSTA JACINTO" or "Legajo: 1136 | Empleado: ACOSTA"
  const multiLabelMatch = clean.match(/(?:(?:N[\°\º\.]*|Nro[\.\s]*|No[\.\s]*)?(?:Legajo|Leg|Tarjeta|Ficha|ID|AC[\s\-]No|Badge|C[oó]digo|C[oó]d\.?))\s*[:\-\–\.\#]*\s*([A-Za-z0-9\-\.\/]+)[\s,\-\–\|\/]+(?:Nombre(?:\s+y\s+Apellido)?|Apellido(?:\s+y\s+Nombre)?|Empleado|Personal|Agente)\s*[:\-\–\.]*\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})/i);
  if (multiLabelMatch) {
    const rawLeg = cleanLegajoValue(multiLabelMatch[1]);
    const rawName = cleanEmployeeName(multiLabelMatch[2]);
    return {
      legajo: isValidLegajoValue(rawLeg) ? rawLeg : null,
      name: isValidNameCandidate(rawName) ? rawName : null,
    };
  }

  // Reverse pattern: "Empleado: ACOSTA JACINTO - Legajo: 1136"
  const reverseLabelMatch = clean.match(/(?:Nombre(?:\s+y\s+Apellido)?|Apellido(?:\s+y\s+Nombre)?|Empleado|Personal|Agente)\s*[:\-\–\.]*\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})[\s,\-\–\|\/]+(?:(?:N[\°\º\.]*|Nro[\.\s]*|No[\.\s]*)?(?:Legajo|Leg|Tarjeta|Ficha|ID|AC[\s\-]No|Badge|C[oó]digo|C[oó]d\.?))\s*[:\-\–\.\#]*\s*([A-Za-z0-9\-\.\/]+)/i);
  if (reverseLabelMatch) {
    const rawName = cleanEmployeeName(reverseLabelMatch[1]);
    const rawLeg = cleanLegajoValue(reverseLabelMatch[2]);
    return {
      legajo: isValidLegajoValue(rawLeg) ? rawLeg : null,
      name: isValidNameCandidate(rawName) ? rawName : null,
    };
  }

  // Bracket combo: "[1136] ACOSTA JACINTO"
  const bracketMatch = clean.match(/^\[([A-Za-z0-9\-\.\/]{1,15})\]\s*[\-\–\:\.]*\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})$/);
  if (bracketMatch) {
    const rawLeg = cleanLegajoValue(bracketMatch[1]);
    const rawName = cleanEmployeeName(bracketMatch[2]);
    return {
      legajo: isValidLegajoValue(rawLeg) ? rawLeg : null,
      name: isValidNameCandidate(rawName) ? rawName : null,
    };
  }

  // Leading number combo: "1136 - ACOSTA JACINTO" or "1136 ACOSTA JACINTO"
  const comboMatch = clean.match(/^(?:(?:N[\°\º\.]*|Nro[\.\s]*|No[\.\s]*)?(?:Legajo|Leg|Tarjeta|Ficha|ID|C[oó]d\.?)\s*[:\-\–\.\#]*\s*)?(\d{1,10})[\s\-\–\:\/\|\.]+\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})$/i);
  if (comboMatch) {
    const rawLeg = cleanLegajoValue(comboMatch[1]);
    const rawName = cleanEmployeeName(comboMatch[2]);
    return {
      legajo: isValidLegajoValue(rawLeg) ? rawLeg : null,
      name: isValidNameCandidate(rawName) ? rawName : null,
    };
  }

  // Trailing legajo: "ACOSTA JACINTO (Legajo 1136)" or "ACOSTA JACINTO - 1136"
  const trailingMatch = clean.match(/^([A-ZÁÉÍÓÚÑa-záéíóúñ\s,\.]{3,})\s*(?:[\(\[]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*|Tarjeta[\s:]*|ID[\s:]*)?\s*(\d{1,10})\s*[\)\]]|[\-\–\|\/]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*)?\s*(\d{1,10}))$/i);
  if (trailingMatch) {
    const rawName = cleanEmployeeName(trailingMatch[1]);
    const rawLeg = cleanLegajoValue(trailingMatch[2] || trailingMatch[3]);
    return {
      legajo: isValidLegajoValue(rawLeg) ? rawLeg : null,
      name: isValidNameCandidate(rawName) ? rawName : null,
    };
  }

  return { legajo: null, name: null };
}

/**
 * Extracts a legajo / ID number from text or adjacent cell.
 * Thoroughly handles labeled formats ("Legajo N°: 101", "N° Legajo 101", "Tarjeta: 50", "AC-No.: 1", "No.: 101"),
 * bracket combinations ("[101] PEREZ"), combos ("101 - PEREZ"), and pure numbers.
 */
export function extractLegajoFromStr(text: string): string | null {
  if (!text) return null;
  let clean = text.trim();

  // Strip wrapping quotes
  clean = clean.replace(/^["']|["']$/g, '').trim();

  // Check if it's a combined cell (has both name and legajo)
  const combo = extractEmployeeAndLegajoFromCell(clean);
  if (combo.legajo) {
    return combo.legajo;
  }

  // 1. Explicit labeled prefixes (ordered from most specific compound to simple and isolated prefixes):
  const prefixPatterns = [
    // A. Compound prefixes: "N° Legajo: 1136", "Nro. Legajo: 1136", "Legajo N°: 1136", "Legajo Nro: 1136", "Tarjeta N°: 1136", "N° de Legajo: 1136"
    /(?:(?:N[°º]|Nro\.?|No\.?|N[úu]m(?:ero)?\.?)\s*(?:de\s+)?(?:Legajo|Leg|Tarjeta|Ficha|ID|AC[\s\-]No|C[oó]digo|C[oó]d\.?)|(?:Legajo|Leg|Tarjeta|Ficha|ID|AC[\s\-]No|C[oó]digo|C[oó]d\.?)\s*(?:N[°º]|Nro\.?|No\.?|N[úu]m(?:ero)?\.?|#))\s*[:\-\–\.\#]*\s*([A-Za-z0-9\-\.\/]+)/i,
    // B. Direct labels: "Legajo: 1136", "Tarjeta: 1136", "Ficha: 1136", "ID: 1136", "AC-No.: 1136", "AC-No: 1136", "DNI: 1136", "Cod.: 1136"
    /(?:Legajo|Leg\.|Leg|Tarjeta|Ficha|Matr[íi]cula|C[oó]digo|C[oó]d\.?|User\s*ID|UserID|ID|AC[\s\-]No\.?|ACNo|Badge|Badgenumber|DNI|Documento)(?:\s+(?:Empleado|Personal|Agente|Colaborador))?\s*[:\-\–\.\#]*\s*([A-Za-z0-9\-\.\/]+)/i,
    // C. Isolated number prefixes: "No.: 1136", "No: 1136", "N°: 1136", "Nº: 1136", "Nro: 1136", "Nro.: 1136", "N° 1136", "Nro 1136", "No 1136", "# 1136"
    /^(?:N[°º]|Nro\.?|No\.?|N[úu]mero|#)\s*[:\-\–\.\#]*\s*([A-Za-z0-9\-\.\/]+)/i,
  ];

  for (const pat of prefixPatterns) {
    const prefixMatch = clean.match(pat);
    if (prefixMatch) {
      let candidate = prefixMatch[1].trim();
      // If followed by trailing dash or name e.g. "1136-ACOSTA", take leading digits/id
      const leadId = candidate.match(/^(\d{1,10})/);
      if (leadId) {
        candidate = leadId[1];
      }
      const cleaned = cleanLegajoValue(candidate);
      if (isValidLegajoValue(cleaned)) {
        return cleaned;
      }
    }
  }

  // 2. Bracket combos: "[1136] ACOSTA" or "[1136]" or "(1136)"
  const comboBracket = clean.match(/^\[([A-Za-z0-9\-\.\/]{1,15})\]/);
  if (comboBracket) {
    const cleaned = cleanLegajoValue(comboBracket[1]);
    if (isValidLegajoValue(cleaned)) return cleaned;
  }

  const trailingBracket = clean.match(/[\(\[]\s*(?:Leg[\.\s]*|Legajo[\s:]*|N[\°\.]*|Tarjeta[\s:]*|ID[\s:]*)?\s*([A-Za-z0-9\-\.\/]{1,15})\s*[\)\]]$/i);
  if (trailingBracket) {
    const cleaned = cleanLegajoValue(trailingBracket[1]);
    if (isValidLegajoValue(cleaned)) return cleaned;
  }

  // 3. Leading number followed by dash, colon, slash or whitespace + name:
  // e.g. "1136 - ACOSTA JACINTO" or "1136: ACOSTA" or "1136 ACOSTA"
  const leadingCombo = clean.match(/^([A-Za-z0-9\-\.\/]{1,15})\s*[\-\–\:\/]\s*[A-ZÁÉÍÓÚÑa-záéíóúñ]/);
  if (leadingCombo) {
    const cleaned = cleanLegajoValue(leadingCombo[1]);
    if (isValidLegajoValue(cleaned)) return cleaned;
  }

  const leadingNumWords = clean.match(/^(\d{1,8})\s+[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}/);
  if (leadingNumWords) {
    const cleaned = cleanLegajoValue(leadingNumWords[1]);
    if (isValidLegajoValue(cleaned)) return cleaned;
  }

  // 4. Trailing legajo: e.g. "ACOSTA JACINTO - 1136" or "ACOSTA JACINTO 1136"
  const trailingNum = clean.match(/[A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}\s*[\-\–\:\s]\s*(\d{1,8})$/);
  if (trailingNum) {
    const cleaned = cleanLegajoValue(trailingNum[1]);
    if (isValidLegajoValue(cleaned)) return cleaned;
  }

  // 5. Pure numeric or alphanumeric ID string (e.g. "1136", "01136", "L-1136", "1136/01", "1,136", "1.136")
  const cleanedVal = cleanLegajoValue(clean);
  if (/^[A-Za-z0-9\-\.\/]{1,15}$/.test(cleanedVal) && isValidLegajoValue(cleanedVal)) {
    return cleanedVal;
  }

  return null;
}

/**
 * Checks if a string looks like a valid employee name candidate.
 * Strictly filters out days of the week, system words, report headers, times, dates, and numbers.
 */
export function isValidNameCandidate(text: string): boolean {
  if (!text) return false;
  const clean = cleanEmployeeName(text);

  if (clean.length < 3 || clean.length > 65) return false;
  if (/^\d+$/.test(clean)) return false;

  // 1. Day names (Lunes, Martes, Miércoles, etc.) are NEVER employee names
  if (isDayName(clean)) return false;

  const upper = clean.toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2. System words & report headers
  if (SYSTEM_WORDS_REGEX.test(upper)) return false;

  // 3. Isolated block/table headers or totals
  if (/^(?:TOTAL|TOTAL\s*HS|TOTAL\s*HS\.|TOTAL\s*HORAS|HORAS|HORA|HS|HS\.|PERIODO|PERIODO\s*DE\s*EVALUACION|EVALUACION|SEMANA|DESDE|HASTA)$/i.test(upper)) {
    return false;
  }
  if (/^(?:N[\.\s]*LEGAJO|NRO[\.\s]*LEGAJO|N[\°\º\.]*[\s]*LEGAJO|NO[\.\s]*LEGAJO|LEGAJO|TARJETA|FICHA|ID|DNI|CODIGO|CÓDIGO|COD|CÓD)$/i.test(upper)) {
    return false;
  }
  if (/^(?:NOMBRE|APELLIDO|NOMBRE\s*Y\s*APELLIDO|APELLIDO\s*Y\s*NOMBRE|EMPLEADO|PERSONAL|AGENTE|COLABORADOR|OPERARIO)$/i.test(upper)) {
    return false;
  }

  // 4. Pure time or duration formats (e.g. "42:30", "07:00", "7:09", "14:09", "17:00")
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(clean)) return false;

  // 5. Pure dates
  if (normalizeDate(clean) !== null) return false;

  // 6. Must contain letters
  const hasLetters = /[a-zA-Z]/.test(upper);
  return hasLetters;
}

/**
 * Helper to determine if a cell string matches a Legajo column header.
 */
export function isLegajoHeader(raw: string): boolean {
  if (!raw) return false;
  const norm = raw.toLowerCase().trim().replace(/[\._\-\:\/\#\°\º]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^(?:legajo|leg|legajos|tarjeta|tarjetas|ficha|fichas|matricula|matrícula)$/i.test(norm)) return true;
  if (/^(?:id|user\s*id|userid|id\s*usuario|id\s*empleado|id\s*personal|id\s*agente|enroll\s*id|enroll\s*number|ac\s*no|acno|badge|badgenumber)$/i.test(norm)) return true;
  if (/^(?:nro|nro\s*legajo|n\s*legajo|no\s*legajo|num\s*legajo|numero\s*legajo|n[úu]mero\s*de\s*legajo|legajo\s*nro|legajo\s*n|legajo\s*no)$/i.test(norm)) return true;
  if (/^(?:nro\s*tarjeta|n\s*tarjeta|no\s*tarjeta|tarjeta\s*nro|tarjeta\s*n)$/i.test(norm)) return true;
  if (/^(?:nro\s*empleado|n\s*empleado|no\s*empleado|nro\s*personal|nro\s*agente|no\s*agente|cod\s*agente)$/i.test(norm)) return true;
  if (/^(?:codigo|código|cod|cód|codigo\s*emp|cod\s*emp|cod\s*empleado|c[oó]digo\s*empleado)$/i.test(norm)) return true;
  if (/^(?:dni|d\s*n\s*i|documento|cedula|c[eé]dula|ci)$/i.test(norm)) return true;
  if (/^(?:n|nro|no|num|numero|n[úu]mero)$/i.test(norm)) return true;

  if (norm.includes('legajo') || norm.includes('tarjeta') || norm.includes('badgenumber') || norm.includes('ac no') || norm.includes('user id') || norm.includes('id empleado')) return true;

  return false;
}

/**
 * Helper to determine if a cell string matches an Employee Name column header.
 */
export function isNameHeader(raw: string): boolean {
  if (!raw) return false;
  const norm = raw.toLowerCase().trim().replace(/[\._\-\:\/\#\°\º]/g, ' ').replace(/\s+/g, ' ').trim();

  if (/^(?:nombre|nombres|apellido|apellidos|nombre\s*y\s*apellido|apellido\s*y\s*nombre|apellidos\s*y\s*nombres|nombres\s*y\s*apellidos)$/i.test(norm)) return true;
  if (/^(?:empleado|empleados|personal|agente|agentes|colaborador|colaboradores|operario|operarios|trabajador|trabajadores)$/i.test(norm)) return true;
  if (/^(?:nombre\s*empleado|nombre\s*personal|nombre\s*agente|nombre\s*del\s*empleado|empleado\s*nombre)$/i.test(norm)) return true;

  if (norm.includes('nombre') || norm.includes('apellido') || norm.includes('empleado') || norm.includes('personal') || norm.includes('colaborador')) return true;

  return false;
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
    if (colLegajo === -1 && isLegajoHeader(raw)) {
      colLegajo = i;
      continue;
    }

    // Check Name / Employee column
    if (colName === -1 && isNameHeader(raw)) {
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
 * Automatically infers tabular column mapping by sampling actual data rows
 * when text headers are not detected in the initial rows.
 */
function inferTableColumnsFromData(rawRows: unknown[][]): TableColumnsMap | null {
  const maxRowsToSample = Math.min(60, rawRows.length);
  let bestDateCol = -1;
  let maxDateMatches = 0;

  // 1. Find Date Column
  for (let col = 0; col < 15; col++) {
    let dateCount = 0;
    for (let r = 0; r < maxRowsToSample; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || col >= row.length) continue;
      if (normalizeDate(row[col]) !== null) {
        dateCount++;
      }
    }
    if (dateCount > maxDateMatches && dateCount >= 3) {
      maxDateMatches = dateCount;
      bestDateCol = col;
    }
  }

  if (bestDateCol === -1) return null;

  // 2. Find Legajo Column (column with numbers/IDs in rows that have dates)
  let bestLegajoCol = -1;
  let maxLegajoMatches = 0;

  for (let col = 0; col < 15; col++) {
    if (col === bestDateCol) continue;
    let legCount = 0;
    for (let r = 0; r < maxRowsToSample; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || col >= row.length) continue;
      if (normalizeDate(row[bestDateCol]) === null) continue;
      const cellStr = getCellStr(row[col]);
      const leg = extractLegajoFromStr(cellStr);
      if (leg && /^\d{1,10}$/.test(leg) && !isDayName(cellStr)) {
        legCount++;
      }
    }
    if (legCount > maxLegajoMatches && legCount >= 3) {
      maxLegajoMatches = legCount;
      bestLegajoCol = col;
    }
  }

  // 3. Find Name Column
  let bestNameCol = -1;
  let maxNameMatches = 0;

  for (let col = 0; col < 15; col++) {
    if (col === bestDateCol || col === bestLegajoCol) continue;
    let nameCount = 0;
    const distinctNames = new Set<string>();
    for (let r = 0; r < maxRowsToSample; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || col >= row.length) continue;
      if (normalizeDate(row[bestDateCol]) === null) continue;
      const cellStr = getCellStr(row[col]);
      if (isValidNameCandidate(cellStr) && !isDayName(cellStr)) {
        nameCount++;
        distinctNames.add(cellStr.toUpperCase().trim());
      }
    }
    // Only accept if at least 2 distinct employee names appear in this column!
    if (nameCount > maxNameMatches && nameCount >= 3 && distinctNames.size >= 2) {
      maxNameMatches = nameCount;
      bestNameCol = col;
    }
  }

  // If in rows with dates, there are NO employee names AND NO legajos on every row,
  // this is a Card / Block-based layout, NOT a flat tabular table.
  if (bestNameCol === -1 && bestLegajoCol === -1) {
    return null;
  }

  // 4. Find Entry & Exit time columns
  let colEntry = -1;
  let colExit = -1;
  const timeColumns: number[] = [];

  for (let col = 0; col < 15; col++) {
    if (col === bestDateCol || col === bestLegajoCol || col === bestNameCol) continue;
    let timeCount = 0;
    for (let r = 0; r < maxRowsToSample; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || col >= row.length) continue;
      if (normalizeDate(row[bestDateCol]) === null) continue;
      if (parseAndRoundTime(row[col]) !== null) {
        timeCount++;
      }
    }
    if (timeCount >= 3) {
      timeColumns.push(col);
    }
  }

  if (timeColumns.length >= 2) {
    colEntry = timeColumns[0];
    colExit = timeColumns[1];
  }

  if (bestDateCol !== -1 && (bestLegajoCol !== -1 || bestNameCol !== -1)) {
    return {
      colLegajo: bestLegajoCol,
      colName: bestNameCol,
      colDate: bestDateCol,
      colEntry: colEntry !== -1 ? colEntry : undefined,
      colExit: colExit !== -1 ? colExit : undefined,
      timeColumns,
    };
  }

  return null;
}

/**
 * Checks if a row is a period header.
 * Example: "Período de evaluación : 3/8/2026 - 9/8/2026" or "Período: 01/08/2026 al 31/08/2026"
 */
function extractPeriod(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:Per[ií]odo(?:\s+de\s+evaluaci[oó]n)?|Desde|Rango)\s*[:\-]\s*(.+)/i);
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

  // 1. Scan the first 40 rows to see if there is a global Tabular Header
  let tableHeaderRowIndex = -1;
  let tableColumns: TableColumnsMap | null = null;

  for (let r = 0; r < Math.min(40, rawRows.length); r++) {
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

  // Fallback: Infer columns from actual data if explicit text headers were not matched
  if (!tableColumns) {
    tableColumns = inferTableColumnsFromData(rawRows);
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
        // Check if the cell has both legajo and name
        const combo = extractEmployeeAndLegajoFromCell(nameCell);
        if (combo.legajo && !rowLegajo) rowLegajo = combo.legajo;
        if (combo.name && !rowEmployeeName) rowEmployeeName = combo.name;

        if (!rowEmployeeName && isValidNameCandidate(nameCell)) {
          rowEmployeeName = cleanEmployeeName(nameCell);
        }
      }
    }

    // 2. Scan cells in this row for combinations, labels, or bracketed headers
    for (let c = 0; c < row.length; c++) {
      const cellVal = strCells[c];
      if (!cellVal) continue;

      // Check combined cell (e.g. "Legajo: 1136 - ACOSTA JACINTO" or "[1136] ACOSTA")
      const combo = extractEmployeeAndLegajoFromCell(cellVal);
      if (combo.legajo && !rowLegajo) rowLegajo = combo.legajo;
      if (combo.name && !rowEmployeeName) rowEmployeeName = combo.name;

      // Check if this cell is a Legajo label and search forward up to 4 columns for value
      const isLegLabel = isLegajoHeader(cellVal) || /^(?:legajo|tarjeta|ficha|id|ac[\s\-]no|c[oó]digo)[\s:]*$/i.test(cellVal);
      if (isLegLabel) {
        for (let offset = 1; offset <= 4 && c + offset < row.length; offset++) {
          const candidate = strCells[c + offset];
          if (!candidate) continue;
          const extracted = extractLegajoFromStr(candidate);
          if (extracted && !rowLegajo) {
            rowLegajo = extracted;
            break;
          }
        }
      }

      // Check if this cell is a Name label and search forward up to 4 columns for value
      const isNmLabel = isNameHeader(cellVal) || /^(?:nombre|apellido|empleado|personal|agente)[\s:]*$/i.test(cellVal);
      if (isNmLabel) {
        for (let offset = 1; offset <= 4 && c + offset < row.length; offset++) {
          const candidate = strCells[c + offset];
          if (!candidate) continue;
          if (isValidNameCandidate(candidate) && !rowEmployeeName) {
            rowEmployeeName = cleanEmployeeName(candidate);
            break;
          }
        }
      }

      // Check single cell with label + value (e.g. "Legajo: 1136", "Tarjeta: 1136", "AC-No.: 1136")
      const legInCell = extractLegajoFromStr(cellVal);
      if (legInCell && !rowLegajo) {
        const lower = cellVal.toLowerCase();
        if (
          lower.includes('leg') ||
          lower.includes('nro') ||
          lower.includes('n°') ||
          lower.includes('nº') ||
          lower.includes('tarjeta') ||
          lower.includes('ficha') ||
          lower.includes('id') ||
          lower.includes('ac-no') ||
          cellVal.includes('[') ||
          cellVal.includes('(')
        ) {
          rowLegajo = legInCell;
        }
      }

      if (/(?:empleado|personal|agente|nombre|apellido)\s*[:\-\–\.]/i.test(cellVal) && !rowEmployeeName) {
        const cleaned = cleanEmployeeName(cellVal);
        if (isValidNameCandidate(cleaned)) {
          rowEmployeeName = cleaned;
        }
      }
    }

    // 3. Fallback for unlabeled Employee Header rows
    const hasDateInRow = row.some(c => normalizeDate(c) !== null);

    if (!hasDateInRow && (!rowEmployeeName || !rowLegajo)) {
      const nameCandidates: string[] = [];
      const legajoCandidates: string[] = [];

      for (let c = 0; c < row.length; c++) {
        const cell = strCells[c];
        if (!cell) continue;

        if (isValidNameCandidate(cell)) {
          nameCandidates.push(cleanEmployeeName(cell));
        } else {
          const leg = extractLegajoFromStr(cell);
          if (leg) {
            legajoCandidates.push(leg);
          }
        }
      }

      if (!rowEmployeeName && nameCandidates.length > 0) {
        rowEmployeeName = nameCandidates[0];
      }

      if (!rowLegajo && legajoCandidates.length > 0) {
        // Prefer multi-digit legajos over 1-digit index numbers
        const best = legajoCandidates.find(l => /^\d{2,10}$/.test(l)) || legajoCandidates[0];
        rowLegajo = best;
      }
    }

    // 4. Update employee context cleanly without losing legajos
    const isNewEmployeeByName = rowEmployeeName && rowEmployeeName !== currentEmployeeName;
    const isNewEmployeeByLegajo = rowLegajo && currentLegajo && rowLegajo !== currentLegajo;

    if (isNewEmployeeByName || isNewEmployeeByLegajo) {
      // Transitioning to a new employee
      if (rowEmployeeName) currentEmployeeName = rowEmployeeName;
      if (rowLegajo) currentLegajo = rowLegajo;
      lastEmployeeHeaderRow = rowNum;
      punchesInCurrentBlock = 0;

      // If we got a name but no legajo, perform bidirectional lookahead & lookbehind:
      if (rowEmployeeName && !rowLegajo) {
        let foundLeg: string | null = null;

        // A. Lookahead up to 4 rows down (before dates or other employee headers start)
        for (let nextR = rowIndex + 1; nextR < Math.min(rawRows.length, rowIndex + 5); nextR++) {
          const nextRow = rawRows[nextR];
          if (!Array.isArray(nextRow)) continue;
          if (nextRow.some(c => normalizeDate(c) !== null)) break;
          if (nextRow.some(c => isValidNameCandidate(getCellStr(c)))) break;

          const nextStrCells = nextRow.map(c => getCellStr(c));
          for (let nc = 0; nc < nextStrCells.length; nc++) {
            const nextCell = nextStrCells[nc];
            const candidateLeg = extractLegajoFromStr(nextCell);
            if (candidateLeg) {
              foundLeg = candidateLeg;
              break;
            }
          }
          if (foundLeg) break;
        }

        // B. Lookbehind up to 3 rows up (before previous dates or other employee headers)
        if (!foundLeg) {
          for (let prevR = rowIndex - 1; prevR >= Math.max(0, rowIndex - 4); prevR--) {
            const prevRow = rawRows[prevR];
            if (!Array.isArray(prevRow)) continue;
            if (prevRow.some(c => normalizeDate(c) !== null)) break;
            if (prevRow.some(c => isValidNameCandidate(getCellStr(c)))) break;

            const prevStrCells = prevRow.map(c => getCellStr(c));
            for (let pc = 0; pc < prevStrCells.length; pc++) {
              const candidateLeg = extractLegajoFromStr(prevStrCells[pc]);
              if (candidateLeg) {
                foundLeg = candidateLeg;
                break;
              }
            }
            if (foundLeg) break;
          }
        }

        if (foundLeg) {
          currentLegajo = foundLeg;
        } else if (punchesInCurrentBlock > 0) {
          // Reset to prevent carrying over previous employee's legajo
          currentLegajo = null;
        }
      }

      // If we got a legajo but no name, lookahead for their name
      if (rowLegajo && !rowEmployeeName) {
        for (let nextR = rowIndex + 1; nextR < Math.min(rawRows.length, rowIndex + 5); nextR++) {
          const nextRow = rawRows[nextR];
          if (!Array.isArray(nextRow)) continue;
          if (nextRow.some(c => normalizeDate(c) !== null)) break;

          const nextStrCells = nextRow.map(c => getCellStr(c));
          for (let nc = 0; nc < nextStrCells.length; nc++) {
            const nextCell = nextStrCells[nc];
            if (isValidNameCandidate(nextCell)) {
              currentEmployeeName = cleanEmployeeName(nextCell);
              break;
            }
          }
          if (currentEmployeeName) break;
        }
      }

      // If this row has NO date or punches, it's purely an Employee Header Row. Move to next row!
      if (!hasDateInRow) {
        continue;
      }
    } else {
      // Continuing same employee block
      if (rowLegajo && !currentLegajo) {
        currentLegajo = rowLegajo;
      }
      if (rowEmployeeName && !currentEmployeeName) {
        currentEmployeeName = rowEmployeeName;
      }
      if (!hasDateInRow && (rowLegajo || rowEmployeeName)) {
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
    const finalLegajo = rowLegajo || currentLegajo || 'S/L';

    // Update active context
    currentEmployeeName = finalEmployeeName;
    if (finalLegajo !== 'S/L' && !currentLegajo) {
      currentLegajo = finalLegajo;
    }

    // If no punch times in this row (e.g. non-working day, descanso, domingo, franco, feriado):
    // This is completely normal and should NOT generate an error. Simply skip to next row.
    if (timeCandidates.length === 0) {
      continue;
    }

    // Sort time candidates in this row by column index, then by time
    timeCandidates.sort((a, b) => (a.colIdx !== b.colIdx ? a.colIdx - b.colIdx : a.totalMinutes - b.totalMinutes));

    // If an odd number of time candidates and the last one matches the worked duration of preceding punch pairs
    // (e.g. [07:00, 14:09, 7:09] where 7:09 is Total Hs. column), remove the duration column so it is not treated as an unpaired punch.
    if (timeCandidates.length >= 3 && timeCandidates.length % 2 === 1) {
      const lastCand = timeCandidates[timeCandidates.length - 1];
      let sumOfIntervals = 0;
      for (let i = 0; i < timeCandidates.length - 1; i += 2) {
        const e1 = timeCandidates[i].totalMinutes;
        const e2 = timeCandidates[i + 1].totalMinutes;
        sumOfIntervals += Math.max(0, e2 - e1);
      }
      if (Math.abs(sumOfIntervals - lastCand.totalMinutes) <= 2) {
        timeCandidates.pop();
      }
    }

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
        const punchSig = `${finalLegajo}_${finalEmployeeName}_${foundDate.iso}_${entryCand.formatted}_${exitCand.formatted}`;
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
      const singleSig = `${finalLegajo}_${finalEmployeeName}_${foundDate.iso}_${singleTime.formatted}_single`;
      if (!seenPunchesSet.has(singleSig)) {
        seenPunchesSet.add(singleSig);
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
