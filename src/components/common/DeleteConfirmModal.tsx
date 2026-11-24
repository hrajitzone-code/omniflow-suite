import React from 'react';
import { Trash2, AlertTriangle, RefreshCw, X, CheckCircle2, CloudOff } from 'lucide-react';

export interface DeleteFeedback {
  status: 'synced' | 'not_connected' | 'auth_required' | 'error';
  message: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  description?: string;
  sheetNote?: string;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  itemName,
  description,
  sheetNote = 'This entry will be permanently removed from the software and automatically synced to your connected Google Sheet.',
  isDeleting = false,
  errorMessage,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close delete confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-bold text-white">&ldquo;{itemName}&rdquo;</span>?
          </p>

          {description && (
            <div className="px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
              {description}
            </div>
          )}

          <p className="text-[11px] text-slate-400 leading-relaxed">{sheetNote}</p>

          {errorMessage && (
            <div className="px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Deleting &amp; Syncing...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Delete Entry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteFeedbackBannerProps {
  feedback: DeleteFeedback | null;
  onDismiss: () => void;
}

export const DeleteFeedbackBanner: React.FC<DeleteFeedbackBannerProps> = ({ feedback, onDismiss }) => {
  if (!feedback) return null;

  const isSynced = feedback.status === 'synced';
  const isError = feedback.status === 'error';

  return (
    <div
      className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
        isSynced
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          : isError
          ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
          : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {isSynced ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
        )}
        <span>{feedback.message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-white p-1 rounded"
        aria-label="Dismiss status message"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
