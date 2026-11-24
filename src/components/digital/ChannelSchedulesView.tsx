import React, { useState, useMemo } from 'react';
import { 
  Radio, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Calendar,
  X,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { ChannelScheduleTask, ChannelPostingStatus, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface ChannelSchedulesViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const ChannelSchedulesView: React.FC<ChannelSchedulesViewProps> = ({ userRole, searchQuery }) => {
  const [tasks, setTasks] = useState<ChannelScheduleTask[]>(omniStore.getChannelSchedules());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewTaskModal, setIsNewTaskModal] = useState<boolean>(false);
  const [publishTarget, setPublishTarget] = useState<ChannelScheduleTask | null>(null);
  const [publishUrlInput, setPublishUrlInput] = useState<string>('');
  const [publishError, setPublishError] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ChannelScheduleTask>>({
    contentId: '',
    contentTitle: '',
    channelName: 'YouTube Main',
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '18:00',
    status: 'Scheduled',
    publishedUrl: '',
  });

  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'digital', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'digital', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'digital', 'canDelete');

  const [deleteTarget, setDeleteTarget] = useState<ChannelScheduleTask | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const contentList = omniStore.getContentMaster();

  const refreshList = () => {
    setTasks(omniStore.getChannelSchedules());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deleteChannelSchedule(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('digital');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete channel schedule.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = 
        t.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      return t.status === statusFilter;
    });
  }, [tasks, searchQuery, statusFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sel = contentList.find(c => c.id === form.contentId);
    omniStore.saveChannelSchedule({
      ...form,
      contentTitle: sel ? sel.title : (form.contentTitle || 'Untitled Post'),
    });
    refreshList();
    setIsNewTaskModal(false);
  };

  const handleOpenPublishModal = (t: ChannelScheduleTask) => {
    setPublishError(null);
    setPublishTarget(t);
    setPublishUrlInput(t.publishedUrl || '');
  };

  const handleConfirmPublished = (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishTarget) return;
    const safeUrl = sanitizeExternalUrl(publishUrlInput);
    if (!safeUrl) {
      setPublishError('Please enter a valid http:// or https:// published URL.');
      return;
    }

    omniStore.saveChannelSchedule({
      ...publishTarget,
      status: 'Published',
      publishedUrl: safeUrl,
    });
    setPublishTarget(null);
    setPublishUrlInput('');
    setPublishError(null);
    refreshList();
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {/* Top Banner and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'Scheduled', 'Queued', 'Published', 'Postponed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {canCreate && (
          <button
            onClick={() => {
              const first = contentList[0];
              setForm({
                contentId: first?.id || '',
                contentTitle: first?.title || '',
                channelName: 'YouTube Main',
                scheduledDate: new Date().toISOString().slice(0, 10),
                scheduledTime: '18:00',
                status: 'Scheduled',
              });
              setIsNewTaskModal(true);
            }}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Queue Broadcast Post
          </button>
        )}
      </div>

      {/* Grid of Broadcast Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map(t => {
          const isPublished = t.status === 'Published';
          return (
            <div key={t.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-slate-500 text-[11px] font-semibold">{t.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isPublished ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    t.status === 'Queued' ? 'bg-indigo-500/20 text-indigo-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold mb-1">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{t.channelName}</span>
                </div>

                <h4 className="font-bold text-white text-sm line-clamp-2">{t.contentTitle}</h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">Linked: {t.contentId}</p>

                {(() => {
                  const safeLiveUrl = sanitizeExternalUrl(t.publishedUrl);
                  return safeLiveUrl ? (
                    <a 
                      href={safeLiveUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="mt-2 text-xs text-teal-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Live Link
                    </a>
                  ) : null;
                })()}
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 mb-3">
                  <span>Slot: <strong className="text-white">{t.scheduledTime}</strong></span>
                  <span>Date: <strong className="text-white">{t.scheduledDate}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  {!isPublished ? (
                    canEdit ? (
                      <button
                        onClick={() => handleOpenPublishModal(t)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Post Published
                      </button>
                    ) : (
                      <div className="flex-1 text-center text-[11px] text-slate-500 py-1">
                        Scheduled for Broadcast
                      </div>
                    )
                  ) : (
                    <div className="flex-1 text-center text-[11px] text-emerald-400 font-semibold py-1">
                      Broadcasted to Channel
                    </div>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title="Delete schedule entry"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(t);
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

      {/* New Broadcast Task Modal */}
      {isNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Schedule Channel Broadcast</h3>
              <button onClick={() => setIsNewTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Approved Content Topic *</label>
                <select
                  required
                  value={form.contentId}
                  onChange={(e) => setForm({ ...form, contentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose Content --</option>
                  {contentList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.editingStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Channel</label>
                <select
                  value={form.channelName}
                  onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="YouTube Main">YouTube Main</option>
                  <option value="YouTube Shorts">YouTube Shorts</option>
                  <option value="Instagram Reels">Instagram Reels</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={form.scheduledDate}
                    onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTaskModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-500 shadow"
                >
                  Queue Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Post Published Modal */}
      {publishTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Confirm Broadcast Published</h3>
              <button onClick={() => setPublishTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmPublished} className="mt-4 space-y-4">
              <div className="text-xs text-slate-300">
                <p className="font-semibold text-white">{publishTarget.contentTitle}</p>
                <p className="text-slate-400 mt-0.5">{publishTarget.channelName} • {publishTarget.scheduledDate}</p>
              </div>
              {publishError && (
                <div className="p-2.5 bg-rose-950/70 border border-rose-700 rounded-lg text-xs text-rose-200">
                  {publishError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Live Published URL *</label>
                <input
                  type="url"
                  required
                  value={publishUrlInput}
                  onChange={(e) => setPublishUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPublishTarget(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Mark Published
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Channel Schedule"
        itemName={deleteTarget ? `${deleteTarget.contentTitle} (${deleteTarget.channelName})` : ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
