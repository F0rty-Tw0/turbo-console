const BYTES_PER_KIB = 1024;
const VM_RSS_LINE = /^VmRSS:\s+(\d+) kB$/m;
const PS_RSS = /^\d+$/;
const LINE_BREAK = /\r?\n/;
const NON_DIGITS = /[^0-9]/g;
const TASKLIST_FIELD_SEPARATOR = '","';
const TASKLIST_PID_INDEX = 1;
const TASKLIST_MEM_USAGE_INDEX = 4;

const kibToBytes = (kib: string): number => Number(kib) * BYTES_PER_KIB;

/** `/proc/<pid>/status` text → resident bytes from its `VmRSS` line; `null` when there is none. */
export const parseProcStatus = (text: string): number | null => {
  const match = VM_RSS_LINE.exec(text);

  if (match?.[1] === undefined) return null;

  return kibToBytes(match[1]);
};

/** `ps -o rss= -p <pid>` stdout (KiB) → resident bytes; `null` for empty or non-digit output. */
export const parsePsRss = (stdout: string): number | null => {
  const kib = stdout.trim();

  const isDigits = PS_RSS.test(kib);

  if (!isDigits) return null;

  return kibToBytes(kib);
};

/** One `tasklist /FO CSV` row → "Mem Usage" bytes; `null` unless it is a 5-field row for `pid` with digits. */
const parseTasklistRow = (line: string, pid: number): number | null => {
  const unquoted = line.slice(1, -1);
  const fields = unquoted.split(TASKLIST_FIELD_SEPARATOR);
  const pidText = String(pid);
  const isRow = fields.length >= TASKLIST_MEM_USAGE_INDEX + 1 && fields[TASKLIST_PID_INDEX] === pidText;

  if (!isRow) return null;

  const memUsage = fields[TASKLIST_MEM_USAGE_INDEX] ?? '';
  const digits = memUsage.replace(NON_DIGITS, '');

  if (digits === '') return null;

  return kibToBytes(digits);
};

/**
 * `tasklist /FO CSV /NH` stdout → resident bytes of the first row for `pid`; `null` when no row matches (tasklist
 * prints a localized `INFO: No tasks…` line with exit 0). The thousands separator in "Mem Usage" depends on the
 * locale, so only the digits are kept.
 */
export const parseTasklistCsv = (stdout: string, pid: number): number | null => {
  const allLines = stdout.split(LINE_BREAK);
  const lines = allLines.filter((line) => line.trim() !== '');
  const values = lines.map((line) => parseTasklistRow(line.trim(), pid));

  return values.find((value) => value !== null) ?? null;
};
