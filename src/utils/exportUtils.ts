import { escapeCsvCell, escapeHtml } from './securityUtils';

/**
 * Export utilities for CSV download and printable reports.
 * Protects against CSV formula injection and HTML injection in print templates.
 */

export function exportToCSV(filename: string, rows: Record<string, any>[]): boolean {
  if (!rows || rows.length === 0) {
    return false;
  }

  const keys = Object.keys(rows[0]);
  const csvContent = [
    keys.map((key) => escapeCsvCell(key)).join(','),
    ...rows.map((row) => keys.map((key) => escapeCsvCell(row[key])).join(',')),
  ].join('\n');

  const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${safeFilename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function printReport(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeTimestamp = escapeHtml(new Date().toLocaleString());

  const headerHtml = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyHtml = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
    )
    .join('');

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: sans-serif; padding: 20px; color: #111; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      p { color: #555; font-size: 12px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f4f4f4; font-weight: bold; }
      tr:nth-child(even) { background: #fafafa; }
      .footer { margin-top: 30px; font-size: 10px; color: #777; text-align: right; }
    </style>
  </head>
  <body>
    <h1>${safeTitle}</h1>
    <p>${safeSubtitle} | Generated on ${safeTimestamp}</p>
    <table>
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${bodyHtml}
      </tbody>
    </table>
    <div class="footer">Influencer &amp; Digital Media OS — Ajit Zone &amp; Franchise Network</div>
  </body>
</html>`;

  // Use a hidden print iframe instead of window.open + document.write
  // so iframe preview environments never block printing and scripts cannot run.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.srcdoc = html;

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  };

  document.body.appendChild(iframe);
}
