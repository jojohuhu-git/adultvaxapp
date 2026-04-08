export function displayYear(entry) {
  if (!entry) return '?';
  if (entry.dateStr) {
    const d = new Date(entry.dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return Math.round(entry.year).toString();
}

export function yrDisplay(decimalYear) {
  if (!decimalYear) return '?';
  return Math.floor(decimalYear).toString();
}

export function fmtHistDate(d) {
  if (d.dateStr) {
    const dt = new Date(d.dateStr + 'T12:00:00');
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return Math.round(d.year).toString();
}

export function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d;
}

export function toDecimalYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const yr = d.getFullYear();
  const startOfYear = new Date(yr, 0, 1);
  const endOfYear = new Date(yr + 1, 0, 1);
  return yr + (d - startOfYear) / (endOfYear - startOfYear);
}
