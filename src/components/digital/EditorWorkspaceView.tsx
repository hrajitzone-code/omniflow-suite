import React, { useState, useMemo } from 'react';
import { 
  Clapperboard, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Check, 
  X, 
  Lock, 
  Play, 
  Edit3,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { ContentMasterRecord, EditingWorkflowStatus, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface EditorWorkspaceViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const EditorWorkspaceView: React.FC<EditorWorkspaceViewProps> = ({ userRole, searchQuery }) => {
  const currentUser = omniStore.getCurrentUser();
  const [contentList, setContentList] = useState<ContentMasterRecord[]>(omniStore.getContentMaster());
  const [isSubmitModal, setIsSubmitModal] = useState<boolean>(false);
  const [isReviewModal, setIsReviewModal] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<ContentMasterRecord | null>(null);

  const [submissionUrl, setSubmissionUrl] = useState<string>('');
  const [reviewDecision, setReviewDecision] = useState<'Approve' | 'Request Changes'>('Approve');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isEditorPersona = userRole === 'Video Editor';
  const canEdit = omniStore.hasPermission(currentUser, 'digital', 'canEdit');
  const canApprove = omniStore.hasPermission(currentUser, 'digital', 'canApprove');
  const canDelete = omniStore.hasPermission(currentUser, 'digital', 'canDelete') && !isEditorPersona;

  const [deleteTarget, setDeleteTarget] = useState<ContentMasterRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshList = () => {
    setContentList(omniStore.getContentMaster());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deleteContentMaster(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('digital');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete content entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Section 4.2 Enforce isolation:
  // "Editors cannot see other editors' records by default unless explicitly authorized."
  const myAssignedContent = useMemo(() => {
    return contentList.filter(c => {
      // If user is a Video Editor, only show content assigned to their specific editorId or name
      if (isEditorPersona) {
        const matchesEditor = c.assignedEditorId === currentUser.editorId || c.assignedEditorName === currentUser.name;
        if (!matchesEditor) return false;
      }

      if (!searchQuery) return true;
      return (
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [contentList, isEditorPersona, currentUser, searchQuery]);

  const handleUpdateStatus = (topic: ContentMasterRecord, nextStatus: EditingWorkflowStatus) => {
    omniStore.saveContentMaster({
      ...topic,
      editingStatus: nextStatus,
    });
    refreshList();
  };

  const handleOpenSubmit = (topic: ContentMasterRecord) => {
    setActionError(null);
    setSelectedTopic(topic);
    setSubmissionUrl(topic.editSubmissionUrl || '');
    setIsSubmitModal(true);
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic) return;
    const safeUrl = sanitizeExternalUrl(submissionUrl);
    if (!safeUrl) {
      setActionError('Please enter a valid http:// or https:// render preview link.');
      return;
    }

    omniStore.saveContentMaster({
      ...selectedTopic,
      editSubmissionUrl: safeUrl,
      editingStatus: 'Submitted for Review',
    });
    omniStore.addNotification({
      title: 'Edit Cut Submitted for Review',
      message: `${selectedTopic.assignedEditorName} submitted cut for "${selectedTopic.title}".`,
      type: 'info',
      system: 'digital',
      linkAction: { system: 'digital', tab: 'editor_workspace', itemId: selectedTopic.id }
    });
    refreshList();
    setIsSubmitModal(false);
  };

  const handleOpenReview = (topic: ContentMasterRecord) => {
    setActionError(null);
    setReviewError(null);
    if (!canApprove) {
      setActionError('Only authorized reviewers with approval permission can approve or request revisions.');
      return;
    }
    setSelectedTopic(topic);
    setReviewNotes('');
    setReviewDecision('Approve');
    setIsReviewModal(true);
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    if (!selectedTopic) return;
    if (!canApprove) {
      setReviewError('You do not have approval permission to review cuts.');
      return;
    }

    if (reviewDecision === 'Request Changes' && !reviewNotes.trim()) {
      setReviewError('Please specify the revision notes for the editor.');
      return;
    }

    const nextStatus: EditingWorkflowStatus = 
      reviewDecision === 'Approve' ? 'Approved / Ready for Posting' : 'Changes Requested';

    omniStore.saveContentMaster({
      ...selectedTopic,
      editingStatus: nextStatus,
      reviewNotes: reviewNotes || selectedTopic.reviewNotes,
    });

    omniStore.addNotification({
      title: reviewDecision === 'Approve' ? 'Edit Cut Approved' : 'Revisions Requested',
      message: `Cut for "${selectedTopic.title}" was ${reviewDecision === 'Approve' ? 'approved' : 'returned for changes: ' + reviewNotes}.`,
      type: reviewDecision === 'Approve' ? 'success' : 'warning',
      system: 'digital',
      linkAction: { system: 'digital', tab: 'editor_workspace', itemId: selectedTopic.id }
    });

    refreshList();
    setIsReviewModal(false);
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {actionError && (
        <div className="p-3 bg-rose-950/70 border border-rose-700 rounded-xl flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Banner with Strict Security Badge */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Personal Editor Workspace
            </span>
            {isEditorPersona && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Isolated Workspace (Editor: {currentUser.name})
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white">Assigned Editing Queue & Review Portal</h2>
          <p className="text-xs text-slate-400">
            {isEditorPersona 
              ? "Enforcing Section 4.2 backend isolation: other editors' cuts are restricted from your workspace." 
              : "Studio Manager view: inspecting submissions and reviewing cuts across all active editors."}
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
          <span>Active Tasks: </span>
          <strong className="text-white font-bold">{myAssignedContent.length} cuts assigned</strong>
        </div>
      </div>

      {/* Editor Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myAssignedContent.map(topic => {
          const isPendingReview = topic.editingStatus === 'Submitted for Review';
          const isChangesRequested = topic.editingStatus === 'Changes Requested';
          const isApproved = topic.editingStatus === 'Approved / Ready for Posting';
          const isEditing = topic.editingStatus === 'Editing in Progress';

          return (
            <div 
              key={topic.id}
              className={`p-5 rounded-2xl border bg-slate-900 transition flex flex-col justify-between ${
                isPendingReview ? 'border-amber-700/80 ring-1 ring-amber-500/20' :
                isApproved ? 'border-emerald-800/80' :
                'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-teal-400 text-xs font-semibold">{topic.id}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isApproved ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    isPendingReview ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    isChangesRequested ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    isEditing ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {topic.editingStatus}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base mb-1">{topic.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                  <span>Anchor: {topic.anchor}</span>
                  <span>Format: {topic.contentType}</span>
                  <span>Dept: {topic.department}</span>
                </div>

                {/* Raw Footage Link */}
                {(() => {
                  const safeRaw = sanitizeExternalUrl(topic.rawFootageLocationUrl);
                  return safeRaw ? (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Raw Footage Ingest:</span>
                      <a 
                        href={safeRaw} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> Open Raw Assets
                      </a>
                    </div>
                  ) : null;
                })()}

                {/* Revisions alert if any */}
                {topic.reviewNotes && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200 mb-3">
                    <p className="font-bold flex items-center gap-1 text-rose-300">
                      <MessageSquare className="w-3 h-3" />
                      Reviewer Feedback / Revisions:
                    </p>
                    <p className="mt-1 text-[11px] text-rose-200/90">{topic.reviewNotes}</p>
                  </div>
                )}

                {(() => {
                  const safeCut = sanitizeExternalUrl(topic.editSubmissionUrl);
                  return safeCut ? (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Current Cut Submission:</span>
                      <a 
                        href={safeCut} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Play className="w-3 h-3" /> Watch Render
                      </a>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Assigned: <strong className="text-slate-300">{topic.assignedEditorName}</strong>
                </span>

                <div className="flex items-center gap-2">
                  {topic.editingStatus === 'Assigned' && canEdit && (
                    <button
                      onClick={() => handleUpdateStatus(topic, 'Editing in Progress')}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                    >
                      Start Editing
                    </button>
                  )}

                  {(isEditing || isChangesRequested) && canEdit && (
                    <button
                      onClick={() => handleOpenSubmit(topic)}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Submit for Review
                    </button>
                  )}

                  {isPendingReview && canApprove && (
                    <button
                      onClick={() => handleOpenReview(topic)}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Review Cut
                    </button>
                  )}

                  {isApproved && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for Posting
                    </span>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      title="Delete topic from Content Master & Sheet"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(topic);
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Submission Modal */}
      {isSubmitModal && selectedTopic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Submit Cut for Manager Review</h3>
              <button onClick={() => setIsSubmitModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmSubmit} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-300 font-semibold mb-1">Topic: {selectedTopic.title}</p>
                <span className="font-mono text-[11px] text-teal-400">{selectedTopic.id}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Preview Video Render URL (Vimeo / Frame.io / Drive) *
                </label>
                <input
                  type="url"
                  required
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://vimeo.com/review/..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 shadow"
                >
                  Submit Cut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Review Modal */}
      {isReviewModal && selectedTopic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Review Video Edit Cut</h3>
              <button onClick={() => setIsReviewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmReview} className="mt-4 space-y-4">
              {reviewError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-700 rounded-lg text-xs text-rose-200">
                  {reviewError}
                </div>
              )}
              <div>
                <p className="text-xs text-slate-300 font-semibold">{selectedTopic.title}</p>
                {(() => {
                  const safeReviewUrl = sanitizeExternalUrl(selectedTopic.editSubmissionUrl);
                  return safeReviewUrl ? (
                    <a 
                      href={safeReviewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1 mt-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Render for Viewing
                    </a>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('Approve')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      reviewDecision === 'Approve' 
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Approve / Ready for Posting
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('Request Changes')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      reviewDecision === 'Request Changes' 
                        ? 'bg-rose-600/30 border-rose-500 text-rose-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Request Corrections
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Revision Notes / Timestamp Feedback {reviewDecision === 'Request Changes' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Cut 2 seconds between 02:15 and 02:17, lower background audio ducking..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReviewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-lg text-xs font-semibold shadow ${
                    reviewDecision === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Content Topic"
        itemName={deleteTarget ? `${deleteTarget.title} (${deleteTarget.id})` : ''}
        description="Removes this content topic and any linked channel schedule tasks from software and Google Sheets."
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
