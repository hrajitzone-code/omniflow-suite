import React, { useRef, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Table,
} from 'lucide-react';
import { SystemType, UserProfile } from '../../types';
import {
  getExcelModuleConfig,
  canUserImportModule,
  downloadExcelTemplate,
  parseExcelFile,
  importExcelData,
  ParsedExcelWorkbook,
  ExcelImportResult,
} from '../../services/excelService';

interface ModuleExcelBarProps {
  moduleId: string;
  activeSystem: SystemType;
  currentUser: UserProfile;
  onImportComplete: () => void;
}

export const ModuleExcelBar: React.FC<ModuleExcelBarProps> = ({
  moduleId,
  activeSystem,
  currentUser,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedExcelWorkbook | null>(null);
  const [activePreviewSheet, setActivePreviewSheet] = useState<number>(0);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const config = getExcelModuleConfig(moduleId, activeSystem);
  const canImport = canUserImportModule(moduleId, activeSystem, currentUser);

  const handleDownloadTemplate = () => {
    try {
      const fileName = downloadExcelTemplate(moduleId, activeSystem);
      setDownloadFeedback(`Downloaded ${fileName}`);
      setTimeout(() => setDownloadFeedback(null), 3500);
    } catch (err: any) {
      setParseError(err?.message || 'Unable to generate Excel template.');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setParseError(null);
    setImportResult(null);
    setIsProcessing(true);

    try {
      const parsed = await parseExcelFile(file);
      if (parsed.sheets.length === 0) {
        setParseError('No readable worksheet headers were found in this file.');
        return;
      }
      setParsedWorkbook(parsed);
      setActivePreviewSheet(0);
    } catch (err: any) {
      setParseError(err?.message || 'Unable to read Excel file. Please upload a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedWorkbook) return;
    setIsProcessing(true);
    try {
      const res = importExcelData(moduleId, activeSystem, parsedWorkbook.sheets);
      setImportResult(res);
      if (res.importedCount > 0) {
        onImportComplete();
      }
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        skippedCount: parsedWorkbook.totalRows,
        errors: [err?.message || 'Import failed unexpectedly.'],
        details: [],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setParsedWorkbook(null);
    setImportResult(null);
    setParseError(null);
    setActivePreviewSheet(0);
  };

  const previewSheet = parsedWorkbook?.sheets[activePreviewSheet];

  return (
    <>
      <div className="mb-5 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white truncate">{config.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                Excel Bulk Tools
              </span>
              {downloadFeedback && (
                <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {downloadFeedback}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{config.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            Download Excel Template
          </button>

          {canImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                {isProcessing ? 'Reading...' : 'Import Excel'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Parse Error Banner */}
      {parseError && !parsedWorkbook && (
        <div className="mb-4 p-3 bg-rose-950/60 border border-rose-600/70 rounded-xl text-xs text-rose-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{parseError}</span>
          </div>
          <button onClick={() => setParseError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Excel Import Preview & Validation Results Modal */}
      {parsedWorkbook && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Excel Import — {config.label}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  File: <span className="text-slate-200 font-medium">{parsedWorkbook.fileName}</span> • {parsedWorkbook.totalRows} data row{parsedWorkbook.totalRows === 1 ? '' : 's'} detected across {parsedWorkbook.sheets.length} sheet{parsedWorkbook.sheets.length === 1 ? '' : 's'}
                </p>
              </div>
              <button type="button" onClick={handleCloseModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {importResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${
                    importResult.importedCount > 0 && importResult.errors.length === 0
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : importResult.importedCount > 0
                        ? 'bg-amber-950/40 border-amber-500/40'
                        : 'bg-rose-950/40 border-rose-500/40'
                  }`}>
                    <div className="flex items-center gap-2 font-bold text-sm text-white">
                      {importResult.importedCount > 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                      <span>
                        Imported {importResult.importedCount} record{importResult.importedCount === 1 ? '' : 's'}
                        {importResult.skippedCount > 0 ? ` • Skipped ${importResult.skippedCount} row${importResult.skippedCount === 1 ? '' : 's'}` : ''}
                      </span>
                    </div>
                    {importResult.details.length > 0 && (
                      <ul className="mt-2 space-y-1 text-emerald-200/90 text-[11px] list-disc list-inside">
                        {importResult.details.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl space-y-2">
                      <p className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" />
                        Validation &amp; Skipped Row Details ({importResult.errors.length})
                      </p>
                      <ul className="max-h-48 overflow-y-auto space-y-1 text-[11px] text-rose-200/90 list-disc list-inside pr-2">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Sheet selector tabs if multi-sheet */}
                  {parsedWorkbook.sheets.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parsedWorkbook.sheets.map((sh, i) => (
                        <button
                          key={sh.name}
                          type="button"
                          onClick={() => setActivePreviewSheet(i)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition ${
                            activePreviewSheet === i
                              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {sh.name} ({sh.rows.length})
                        </button>
                      ))}
                    </div>
                  )}

                  {previewSheet && previewSheet.rows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                          <Table className="w-3.5 h-3.5 text-teal-400" />
                          Previewing first {Math.min(5, previewSheet.rows.length)} of {previewSheet.rows.length} rows in "{previewSheet.name}"
                        </span>
                        <span>{previewSheet.headers.length} columns</span>
                      </div>
                      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                              {previewSheet.headers.slice(0, 8).map(h => (
                                <th key={h} className="py-2 px-3 font-semibold whitespace-nowrap">{h}</th>
                              ))}
                              {previewSheet.headers.length > 8 && (
                                <th className="py-2 px-3 text-slate-500">+{previewSheet.headers.length - 8} more</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            {previewSheet.rows.slice(0, 5).map((row, rIdx) => (
                              <tr key={rIdx} className="text-slate-300">
                                {previewSheet.headers.slice(0, 8).map(h => (
                                  <td key={h} className="py-2 px-3 max-w-[180px] truncate">
                                    {String(row[h] ?? '') || <span className="text-slate-600">—</span>}
                                  </td>
                                ))}
                                {previewSheet.headers.length > 8 && (
                                  <td className="py-2 px-3 text-slate-500">...</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400">
                      This sheet has headers only (0 data rows). Add your data rows beneath the headers in Excel and re-upload.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0">
              {importResult ? (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing || parsedWorkbook.totalRows === 0}
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                  >
                    {isProcessing ? 'Importing...' : `Confirm & Import ${parsedWorkbook.totalRows} Row${parsedWorkbook.totalRows === 1 ? '' : 's'}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
