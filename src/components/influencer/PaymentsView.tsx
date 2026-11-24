import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  ShieldCheck, 
  X,
  Filter,
  ArrowDownLeft,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { PaymentRecord, PaymentStatus, UserRole, CANONICAL_PAYMENT_TYPES, PaymentType } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface PaymentsViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ userRole, searchQuery }) => {
  const [payments, setPayments] = useState<PaymentRecord[]>(omniStore.getPayments());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewPaymentModal, setIsNewPaymentModal] = useState<boolean>(false);
  const [isCorrectionModal, setIsCorrectionModal] = useState<boolean>(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Form
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentRecord>>({
    campaignId: '',
    amount: 0,
    paymentType: 'Advance',
    status: 'Pending Approval',
    remarks: '',
  });

  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [overpaymentError, setOverpaymentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [disburseTarget, setDisburseTarget] = useState<PaymentRecord | null>(null);
  const [utrInput, setUtrInput] = useState<string>('');

  const campaigns = omniStore.getCampaigns();
  const currentUser = omniStore.getCurrentUser();
  const canApprove = omniStore.hasPermission(currentUser, 'influencer', 'canApprove');
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canDelete = omniStore.hasPermission(currentUser, 'influencer', 'canDelete');

  const [deleteTarget, setDeleteTarget] = useState<PaymentRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshPayments = () => {
    setPayments(omniStore.getPayments());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deletePayment(deleteTarget.id);
      refreshPayments();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete payment record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        p.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.influencerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.transactionReference && p.transactionReference.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      return p.status === statusFilter;
    });
  }, [payments, searchQuery, statusFilter]);

  // Aggregate balance calculations across campaigns
  const aggregateMetrics = useMemo(() => {
    let totalAgreed = 0;
    let totalPaid = 0;
    let totalBalance = 0;

    campaigns.forEach(c => {
      const bal = omniStore.getCampaignOutstandingBalance(c.id);
      totalAgreed += bal.agreedAmount;
      totalPaid += bal.totalPaid;
      totalBalance += bal.balance;
    });

    return { totalAgreed, totalPaid, totalBalance };
  }, [campaigns, payments]);

  const handleOpenAddModal = () => {
    const firstCamp = campaigns[0];
    setPaymentForm({
      campaignId: firstCamp?.id || '',
      amount: 0,
      paymentType: 'Advance',
      status: 'Pending Approval',
      remarks: '',
    });
    setOverpaymentError(null);
    setIsNewPaymentModal(true);
  };

  const handleSubmitPayment = (e: React.FormEvent, isOverride = false) => {
    e.preventDefault();
    const res = omniStore.savePayment(paymentForm, isOverride);
    if (res.error) {
      setOverpaymentError(res.error);
      return;
    }

    refreshPayments();
    setIsNewPaymentModal(false);
    setOverpaymentError(null);
  };

  const handleApprovePayment = (p: PaymentRecord) => {
    setActionError(null);
    if (!canApprove) {
      setActionError('Only users with Payment Approval permission or Super Admin can approve payments.');
      return;
    }
    const res = omniStore.savePayment({
      ...p,
      status: 'Approved',
      approvedBy: omniStore.getCurrentUser().name,
      approvalDate: new Date().toISOString().slice(0, 10),
    });
    if (res.error) {
      setActionError(res.error);
      return;
    }
    refreshPayments();
  };

  const handleOpenDisburse = (p: PaymentRecord) => {
    setActionError(null);
    if (!canApprove) {
      setActionError('Only users with Payment Approval permission or Super Admin can disburse payments.');
      return;
    }
    setDisburseTarget(p);
    setUtrInput(`UTR-${Date.now().toString(36).toUpperCase()}`);
  };

  const handleConfirmDisburse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disburseTarget || !utrInput.trim()) return;
    const res = omniStore.savePayment({
      ...disburseTarget,
      status: 'Paid',
      paymentDate: new Date().toISOString().slice(0, 10),
      transactionReference: utrInput.trim(),
    });
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setDisburseTarget(null);
    setUtrInput('');
    refreshPayments();
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {actionError && (
        <div className="p-3 bg-rose-950/70 border border-rose-700 rounded-xl flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Committed Budget</p>
          <p className="text-xl font-bold text-white mt-1">₹{aggregateMetrics.totalAgreed.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Sum of all campaign agreed amounts</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-emerald-400 font-semibold uppercase">Net Approved & Paid</p>
          <p className="text-xl font-bold text-emerald-300 mt-1">₹{aggregateMetrics.totalPaid.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Disbursements net of refunds/reversals</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] text-amber-400 font-semibold uppercase">Outstanding Campaign Balance</p>
          <p className="text-xl font-bold text-amber-300 mt-1">₹{aggregateMetrics.totalBalance.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Remaining unreleased contract obligations</p>
        </div>
      </div>

      {/* Top Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'Pending Approval', 'Approved', 'Paid', 'Draft', 'Rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Request Payment Installment
          </button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3.5 pl-4">Payment ID & Type</th>
                <th className="py-3.5">Campaign & Creator</th>
                <th className="py-3.5">Installment Amount</th>
                <th className="py-3.5">Approval Status</th>
                <th className="py-3.5">Banking / UTR</th>
                <th className="py-3.5">Proof / Drive Receipt</th>
                <th className="py-3.5 pr-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.map(pay => {
                const isPaid = pay.status === 'Paid';
                const isApproved = pay.status === 'Approved';
                const isPending = pay.status === 'Pending Approval';
                const isRefund = pay.paymentType === 'Refund / Reversal';

                return (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-amber-400">{pay.id}</span>
                        {pay.isCorrection && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/20 text-indigo-300 font-bold">
                            Corrected
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        {isRefund ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <RotateCcw className="w-2.5 h-2.5" />
                            Refund / Reversal
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300 font-medium">{pay.paymentType}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-200">{pay.campaignName}</p>
                      <p className="text-[11px] text-violet-400">{pay.influencerName}</p>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-bold ${isRefund ? 'text-rose-400' : 'text-white'}`}>
                          {isRefund ? '-' : ''}₹{pay.amount.toLocaleString()}
                        </span>
                        {isRefund && (
                          <span className="text-[10px] text-rose-400/80 font-normal">(credit)</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                        isPaid ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        isApproved ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {pay.status}
                      </span>
                      {pay.approvedBy && (
                        <p className="text-[10px] text-slate-500 mt-0.5">By: {pay.approvedBy}</p>
                      )}
                    </td>
                    <td className="py-3.5">
                      {pay.transactionReference ? (
                        <span className="font-mono text-[11px] text-emerald-400">{pay.transactionReference}</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Awaiting UTR</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {(() => {
                        const safeProofUrl = sanitizeExternalUrl(pay.paymentProofUrl);
                        return safeProofUrl ? (
                          <a 
                            href={safeProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            View Receipt
                          </a>
                        ) : (
                          <span className="text-slate-500 text-[11px]">No proof uploaded</span>
                        );
                      })()}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {isPending && canApprove && (
                          <button
                            onClick={() => handleApprovePayment(pay)}
                            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow"
                          >
                            Approve Payout
                          </button>
                        )}
                        {isApproved && canApprove && (
                          <button
                            onClick={() => handleOpenDisburse(pay)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
                          >
                            Disburse &amp; UTR
                          </button>
                        )}
                        {isPaid && (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mr-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Settled
                          </span>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete payment entry"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(pay);
                            }}
                            className="p-1.5 rounded bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Payment Modal */}
      {isNewPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Request Payment Installment</h3>
              <button onClick={() => setIsNewPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overpayment Warning / Blocking Banner */}
            {overpaymentError && (
              <div className="mt-4 p-3 bg-rose-950/70 border border-rose-600 rounded-xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-200">
                    <p className="font-bold">Payment Validation Notice</p>
                    <p className="mt-1">{overpaymentError}</p>
                    {userRole === 'Super Admin' && (
                      <button
                        type="button"
                        onClick={(e) => handleSubmitPayment(e, true)}
                        className="mt-2.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[11px] shadow"
                      >
                        Authorize Exception Override (Super Admin)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleSubmitPayment(e, false)} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Campaign *</label>
                <select
                  required
                  value={paymentForm.campaignId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, campaignId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose Campaign --</option>
                  {campaigns.map(c => {
                    const bal = omniStore.getCampaignOutstandingBalance(c.id);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} (Budget: ₹{c.agreedAmount.toLocaleString()} | Bal: ₹{bal.balance.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Payment Type *</label>
                  <select
                    value={paymentForm.paymentType}
                    onChange={(e: any) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    {CANONICAL_PAYMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Magnitude Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={paymentForm.amount || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Must be positive magnitude (&gt; 0)</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Payment Proof (Google Drive Link / Receipt)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={paymentForm.paymentProofUrl || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentProofUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Remarks / Payment Milestone Justification</label>
                <textarea
                  rows={2}
                  value={paymentForm.remarks || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-500 shadow"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Disburse & UTR Modal */}
      {disburseTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Record Bank Disbursement / UTR</h3>
              <button onClick={() => setDisburseTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmDisburse} className="mt-4 space-y-4">
              <div className="text-xs text-slate-300 space-y-1">
                <p>Payment ID: <span className="font-mono text-amber-400">{disburseTarget.id}</span></p>
                <p>Recipient: <strong className="text-white">{disburseTarget.influencerName}</strong> — ₹{disburseTarget.amount.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Transaction Reference / UTR Number *</label>
                <input
                  type="text"
                  required
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="UTR-..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDisburseTarget(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Payment Record"
        itemName={deleteTarget ? `${deleteTarget.id} • ₹${deleteTarget.amount.toLocaleString()} (${deleteTarget.campaignName})` : ''}
        description="Campaign outstanding balance will automatically recalculate after removing this payment."
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
