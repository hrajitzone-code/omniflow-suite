import React, { useState, useMemo } from 'react';
import { 
  PhoneCall, 
  Plus, 
  MessageSquare, 
  Mail, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  X,
  Trash2
} from 'lucide-react';
import { FollowUpRecord, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';

interface FollowUpsViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({ userRole, searchQuery }) => {
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(omniStore.getFollowUps());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isNewModal, setIsNewModal] = useState<boolean>(false);

  const [form, setForm] = useState<Partial<FollowUpRecord>>({
    entityType: 'campaign',
    entityName: '',
    assignedTo: omniStore.getCurrentUser().name,
    type: 'WhatsApp',
    purpose: '',
    date: new Date().toISOString().slice(0, 10),
    nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    status: 'Pending',
    remarks: '',
  });

  const campaigns = omniStore.getCampaigns();
  const influencers = omniStore.getInfluencers();
  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'influencer', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'influencer', 'canDelete');

  const [deleteTarget, setDeleteTarget] = useState<FollowUpRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshList = () => {
    setFollowUps(omniStore.getFollowUps());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deleteFollowUp(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete follow-up record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredFollowUps = useMemo(() => {
    return followUps.filter(f => {
      const matchesSearch = 
        f.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'OVERDUE') {
        return f.status !== 'Completed' && new Date(f.nextFollowUpDate) < new Date();
      }
      return f.status === statusFilter;
    });
  }, [followUps, searchQuery, statusFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    omniStore.saveFollowUp(form);
    refreshList();
    setIsNewModal(false);
  };

  const handleMarkComplete = (f: FollowUpRecord) => {
    omniStore.saveFollowUp({
      ...f,
      status: 'Completed',
    });
    refreshList();
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'OVERDUE', 'Pending', 'In Progress', 'Completed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? status === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All Follow-ups' : status}
            </button>
          ))}
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setForm({
                entityType: 'campaign',
                entityName: campaigns[0]?.name || '',
                assignedTo: omniStore.getCurrentUser().name,
                type: 'WhatsApp',
                purpose: '',
                date: new Date().toISOString().slice(0, 10),
                nextFollowUpDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
                status: 'Pending',
                remarks: '',
              });
              setIsNewModal(true);
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Log New Follow-up
          </button>
        )}
      </div>

      {/* Grid of Follow-up Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFollowUps.map(f => {
          const isOverdue = f.status !== 'Completed' && new Date(f.nextFollowUpDate) < new Date();
          return (
            <div 
              key={f.id} 
              className={`p-5 rounded-2xl border bg-slate-900 transition flex flex-col justify-between ${
                isOverdue ? 'border-rose-800/80 ring-1 ring-rose-500/30' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-slate-500 text-[11px] font-semibold">{f.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isOverdue ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      f.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {isOverdue ? 'Overdue' : f.status}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-medium">
                      {f.type}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-white text-sm line-clamp-1">{f.entityName}</h4>
                <p className="text-[11px] text-indigo-400 font-medium capitalize mb-2">{f.entityType} Level Follow-up</p>
                <p className="text-xs text-slate-300 line-clamp-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                  {f.purpose}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 mb-3">
                  <span>Assigned: <strong className="text-slate-200">{f.assignedTo}</strong></span>
                  <span className={isOverdue ? "text-rose-400 font-bold" : ""}>Next: {f.nextFollowUpDate}</span>
                </div>

                <div className="flex items-center gap-2">
                  {f.status !== 'Completed' && canEdit && (
                    <button
                      onClick={() => handleMarkComplete(f)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Task Completed
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title="Delete follow-up"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(f);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Follow-up Modal */}
      {isNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Schedule Follow-up</h3>
              <button onClick={() => setIsNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Level</label>
                  <select
                    value={form.entityType}
                    onChange={(e: any) => setForm({ ...form, entityType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="campaign">Campaign Level</option>
                    <option value="influencer">Influencer Level</option>
                    <option value="deliverable">Deliverable Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Channel / Type</label>
                  <select
                    value={form.type}
                    onChange={(e: any) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Call">Direct Call</option>
                    <option value="Email">Official Email</option>
                    <option value="Meeting">Meeting / Call</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Entity Target Name *</label>
                <input
                  type="text"
                  required
                  value={form.entityName || ''}
                  onChange={(e) => setForm({ ...form, entityName: e.target.value })}
                  placeholder="Enter campaign, creator, or deliverable name"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Purpose / Action Items *</label>
                <textarea
                  required
                  rows={3}
                  value={form.purpose || ''}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g. Collect raw invoice, confirm reel publish time, share tracking link..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Coordinator</label>
                  <input
                    type="text"
                    value={form.assignedTo || ''}
                    onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Next Follow-up Due *</label>
                  <input
                    type="date"
                    required
                    value={form.nextFollowUpDate || ''}
                    onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 shadow"
                >
                  Schedule Follow-up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Follow-Up"
        itemName={deleteTarget ? `${deleteTarget.entityName} (${deleteTarget.id})` : ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
