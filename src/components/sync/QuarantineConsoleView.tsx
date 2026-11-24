import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  FileSpreadsheet, 
  Search, 
  Check, 
  X,
  FileCode,
  Wrench,
  CheckCheck
} from 'lucide-react';
import { QuarantineRecord, UserRole, CANONICAL_PAYMENT_TYPES, PaymentType } from '../../types';
import { omniStore } from '../../services/storageService';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface QuarantineConsoleViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const QuarantineConsoleView: React.FC<QuarantineConsoleViewProps> = ({ userRole, searchQuery }) => {
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>(omniStore.getQuarantineRecords());
  const [selectedRecord, setSelectedRecord] = useState<QuarantineRecord | null>(null);

  // Reconciliation modal state
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState<boolean>(false);
  const [reconcileType, setReconcileType] = useState<PaymentType>('Advance');
  const [reconcileAmount, setReconcileAmount] = useState<number>(0);
  const [reconcileReason, setReconcileReason] = useState<string>('');
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const currentUser = omniStore.getCurrentUser();
  const canManageQuarantine = omniStore.hasGovernanceAccess(currentUser, 'quarantine');
  const canReconcile =
    canManageQuarantine &&
    (currentUser.role === 'Super Admin' || omniStore.hasPermission(currentUser, 'influencer', 'canApprove'));
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuarantineRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshList = () => {
    setQuarantineRecords(omniStore.getQuarantineRecords());
  };

  const handleConfirmDeleteQuarantine = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      omniStore.deleteQuarantineRecord(deleteTarget.id);
      if (selectedRecord?.id === deleteTarget.id) {
        setSelectedRecord(null);
      }
      refreshList();
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete quarantine record.');
    }
  };

  const handleResolve = (id: string, action: 'RECONCILED' | 'DISCARDED') => {
    if (!canReconcile) {
      setActionError('You do not have approval permission to resolve quarantined records.');
      return;
    }

    try {
      setActionError(null);
      omniStore.resolveQuarantine(id, action);
      refreshList();
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resolve quarantined record.');
    }
  };

  const handleOpenPaymentReconcile = (record: QuarantineRecord) => {
    setSelectedRecord(record);
    const rawAmt = Number(record.rawPayload.Amount || record.rawPayload.amount || 0);
    const positiveAmt = Math.abs(rawAmt) || 0;
    setReconcileAmount(positiveAmt);

    const rawType = record.rawPayload.Payment_Type || record.rawPayload.paymentType || '';
    const detectedType = omniStore.normalizePaymentType(rawType) || (rawAmt < 0 ? 'Refund / Reversal' : 'Advance');
    setReconcileType(detectedType);

    setReconcileReason(
      rawAmt < 0 
        ? `Reconciled negative amount (${rawAmt}) to positive convention (₹${positiveAmt.toLocaleString()}) and assigned canonical type "${detectedType}".`
        : `Reconciled unrecognized type "${rawType || 'Unknown Type'}" into canonical type "${detectedType}" with valid positive amount.`
    );
    setReconcileError(null);
    setIsReconcileModalOpen(true);
  };

  const handleSubmitReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (reconcileAmount <= 0) {
      setReconcileError('Payment amount must be greater than zero.');
      return;
    }

    const res = omniStore.reconcileQuarantinedPayment(
      selectedRecord.id,
      {
        amount: reconcileAmount,
        paymentType: reconcileType,
        status: 'Approved',
        remarks: reconcileReason,
      },
      reconcileReason || 'Authorized payment schema reconciliation'
    );

    if (res.error) {
      setReconcileError(res.error);
      return;
    }

    setIsReconcileModalOpen(false);
    refreshList();
    setSelectedRecord(null);
  };

  const pendingCount = quarantineRecords.filter(q => q.status === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Data Integrity Isolation
            </span>
            <span className="text-xs text-slate-400">Section 2 & 10 Safeguard</span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            Google Sheets Schema Quarantine Console
          </h2>
          <p className="text-xs text-slate-400">
            Invalid, negative, or unrecognized edits from Google Sheets are quarantined here to prevent database corruption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs font-semibold text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{pendingCount} Pending Review</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedRecord ? "lg:col-span-7 space-y-3" : "lg:col-span-12 space-y-3"}>
          {quarantineRecords.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-white">No Quarantined Records</p>
              <p className="text-slate-500 mt-1">All Google Sheets operational rows match validated schemas.</p>
            </div>
          ) : (
            quarantineRecords.map(q => {
              const isPending = q.status === 'PENDING_REVIEW';
              const isSelected = selectedRecord?.id === q.id;

              return (
                <div 
                  key={q.id}
                  onClick={() => setSelectedRecord(q)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 border-rose-500 ring-1 ring-rose-500/40' 
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-rose-400 font-bold">{q.id}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        Tab: {q.sheetTab} (Row #{q.rowNumber})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        q.status === 'RECONCILED' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {q.status}
                      </span>
                      {canManageQuarantine && (
                        <button
                          type="button"
                          title="Delete quarantine entry"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setDeleteTarget(q);
                          }}
                          className="p-1 rounded bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    {q.validationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-rose-300 flex items-start gap-1.5 font-medium">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{err}</span>
                      </p>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                    <span>Detected: {new Date(q.timestamp).toLocaleString()}</span>
                    <span className="text-indigo-400 hover:underline">Click to inspect and reconcile</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detailed Drawer */}
        {selectedRecord && (
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-rose-400">Quarantine Inspection</span>
                <h3 className="font-bold text-white text-sm">{selectedRecord.id}</h3>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Target Sheet Location
                </span>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200">
                  <p>Spreadsheet Worksheet: <strong>{selectedRecord.sheetTab}</strong></p>
                  <p className="text-slate-400 mt-0.5">Spreadsheet Row Number: #{selectedRecord.rowNumber}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Raw Corrupt Incoming Payload (Preserved Safely)
                </span>
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedRecord.rawPayload, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">
                  Violated Validation Rules
                </span>
                <div className="p-2.5 bg-rose-950/30 border border-rose-900/60 rounded-lg space-y-1">
                  {selectedRecord.validationErrors.map((err, i) => (
                    <p key={i} className="text-xs text-rose-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                      <span>{err}</span>
                    </p>
                  ))}
                </div>
              </div>

              {selectedRecord.status === 'PENDING_REVIEW' && canReconcile && (
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleResolve(selectedRecord.id, 'DISCARDED')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
                  >
                    Discard Row
                  </button>

                  {selectedRecord.sheetTab === 'Payments' ? (
                    <button
                      onClick={() => handleOpenPaymentReconcile(selectedRecord)}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Reconcile & Map Payment
                    </button>
                  ) : (
                    <button
                      onClick={() => handleResolve(selectedRecord.id, 'RECONCILED')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                    >
                      Reconcile
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Reconciliation Modal */}
      {isReconcileModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Reconcile Quarantined Payment Row</h3>
                  <p className="text-xs text-slate-400">Map corrupt sheet values into a verified canonical ledger entry.</p>
                </div>
              </div>
              <button onClick={() => setIsReconcileModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reconcileError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{reconcileError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReconciliation} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                <p className="text-slate-400">Original Quarantined Values:</p>
                <div className="font-mono text-rose-400 text-[11px]">
                  Amount: {selectedRecord.rawPayload.Amount || selectedRecord.rawPayload.amount} | Type: {selectedRecord.rawPayload.Payment_Type || selectedRecord.rawPayload.paymentType || 'Unknown'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Canonical Payment Type *
                </label>
                <select
                  value={reconcileType}
                  onChange={(e) => setReconcileType(e.target.value as PaymentType)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  {CANONICAL_PAYMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select "Refund / Reversal" if this represents an advance clawback, deduction, or cancellation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Magnitude (Positive Amount ₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={reconcileAmount}
                  onChange={(e) => setReconcileAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  All payment transactions must be entered as positive values. Direction is determined by Payment Type.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Authorized Reconciliation Reason / Audit Note *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reconcileReason}
                  onChange={(e) => setReconcileReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReconcileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  Apply & Commit to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Quarantine Record"
        itemName={deleteTarget ? `${deleteTarget.id} (${deleteTarget.sheetTab} Row #${deleteTarget.rowNumber})` : ''}
        sheetNote="This removes the isolated quarantine entry from the Quarantine Console."
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteQuarantine}
      />
    </div>
  );
};
