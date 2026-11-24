import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Plus, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Sparkles, 
  ExternalLink,
  Edit2,
  X,
  Trash2
} from 'lucide-react';
import { PerformanceRecord, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface PerformanceViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ userRole, searchQuery }) => {
  const [performances, setPerformances] = useState<PerformanceRecord[]>(omniStore.getPerformances());
  const [isEditModal, setIsEditModal] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<Partial<PerformanceRecord>>({});

  const deliverables = omniStore.getDeliverables();
  const campaigns = omniStore.getCampaigns();
  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'influencer', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'influencer', 'canDelete') || canEdit;

  const [deleteTarget, setDeleteTarget] = useState<PerformanceRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshList = () => {
    setPerformances(omniStore.getPerformances());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deletePerformance(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete performance entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPerformances = useMemo(() => {
    return performances.filter(p => {
      return (
        p.contentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.influencerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.platform.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [performances, searchQuery]);

  const handleOpenAdd = () => {
    const firstDel = deliverables[0];
    const camp = campaigns.find(c => c.id === firstDel?.campaignId);
    setSelectedRecord({
      deliverableId: firstDel?.id || '',
      campaignId: camp?.id || '',
      campaignName: camp?.name || '',
      influencerName: camp?.influencerName || '',
      contentTitle: firstDel?.title || '',
      platform: 'YouTube',
      publishedUrl: firstDel?.publishedUrl || '',
      postingDate: new Date().toISOString().slice(0, 10),
      delayDays: 0,
      viewsDay7: 0,
      viewsDay15: 0,
      viewsDay30: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      reach: 0,
      allocatedSpend: 0,
    });
    setIsEditModal(true);
  };

  const handleOpenEdit = (p: PerformanceRecord) => {
    setSelectedRecord({ ...p });
    setIsEditModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = (selectedRecord.publishedUrl || '').trim();
    const safeUrl = trimmedUrl ? sanitizeExternalUrl(trimmedUrl) : '';
    const saved = omniStore.savePerformance({
      ...selectedRecord,
      publishedUrl: safeUrl || '',
      performanceScore: undefined, // Always recompute fresh score from updated metrics
    });
    // Sync posted link back to linked deliverable if present
    if (saved.deliverableId && safeUrl) {
      const linkedDel = deliverables.find(d => d.id === saved.deliverableId);
      if (linkedDel && linkedDel.publishedUrl !== safeUrl) {
        omniStore.saveDeliverable({
          ...linkedDel,
          status: 'Posted',
          publishedUrl: safeUrl,
          actualPostingDate: linkedDel.actualPostingDate || saved.postingDate,
        });
      }
    }
    refreshList();
    setIsEditModal(false);
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-white">Deliverable Performance & Cost-Efficiency</h2>
          <p className="text-xs text-slate-400">Manual metric tracking, 7/15/30-day views, and computed CPV efficiency.</p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Content Performance
          </button>
        )}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredPerformances.map(p => {
          const cpv = p.viewsDay30 > 0 ? (p.allocatedSpend / p.viewsDay30).toFixed(2) : 'N/A';
          const engTotal = p.likes + p.comments + p.shares + p.saves;
          const engRate = p.viewsDay30 > 0 ? ((engTotal / p.viewsDay30) * 100).toFixed(1) : '0';

          return (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-slate-500 text-[10px]">{p.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-indigo-300">
                      {p.platform}
                    </span>
                    <span className="text-xs font-semibold text-violet-400">{p.influencerName}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{p.contentTitle}</h3>
                  <p className="text-[11px] text-slate-400">{p.campaignName}</p>
                  {(() => {
                    const safeUrl = sanitizeExternalUrl(p.publishedUrl);
                    return safeUrl ? (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-400 hover:underline font-medium"
                      >
                        <ExternalLink className="w-3 h-3" /> View Live Post
                      </a>
                    ) : null;
                  })()}
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Score {p.performanceScore}/100
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(p);
                        }}
                        title="Delete performance entry"
                        className="p-1 text-rose-400 hover:text-white rounded hover:bg-rose-600/80 text-xs flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Views progression */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Views Trajectory
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Day 7</p>
                    <p className="text-xs font-bold text-white">{p.viewsDay7.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Day 15</p>
                    <p className="text-xs font-bold text-white">{p.viewsDay15.toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Day 30</p>
                    <p className="text-xs font-bold text-emerald-400">{p.viewsDay30.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Engagement details */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Heart className="w-3.5 h-3.5 text-pink-400 mx-auto mb-1" />
                  <p className="text-slate-200 font-bold">{p.likes.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Likes</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                  <p className="text-slate-200 font-bold">{p.comments.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Comments</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Share2 className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                  <p className="text-slate-200 font-bold">{p.shares.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Shares</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Bookmark className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
                  <p className="text-slate-200 font-bold">{p.saves.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Saves</p>
                </div>
              </div>

              {/* Bottom KPIs: CPV, Delay, Spend */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="space-x-3 text-slate-400">
                  <span>Spend: <strong className="text-white">₹{p.allocatedSpend.toLocaleString()}</strong></span>
                  <span>CPV: <strong className="text-emerald-400">₹{cpv}</strong></span>
                  <span>Eng: <strong className="text-indigo-400">{engRate}%</strong></span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {p.delayDays === 0 ? (
                    <span className="text-emerald-400 font-medium">Posted On-Time</span>
                  ) : (
                    <span className="text-rose-400 font-medium">{p.delayDays}d Delay</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Performance Modal */}
      {isEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Record Content Performance Metrics</h3>
              <button onClick={() => setIsEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Content Title *</label>
                <input
                  type="text"
                  required
                  value={selectedRecord.contentTitle || ''}
                  onChange={(e) => setSelectedRecord({ ...selectedRecord, contentTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Posted Link (Live Reel / Video URL)</label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/reel/... or https://youtu.be/..."
                  value={selectedRecord.publishedUrl || ''}
                  onChange={(e) => setSelectedRecord({ ...selectedRecord, publishedUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Platform</label>
                  <select
                    value={selectedRecord.platform}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, platform: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Twitter / X">Twitter / X</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Delay vs Expected (Days)</label>
                  <input
                    type="number"
                    value={selectedRecord.delayDays || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, delayDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Views Day 7</label>
                  <input
                    type="number"
                    value={selectedRecord.viewsDay7 || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, viewsDay7: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Views Day 15</label>
                  <input
                    type="number"
                    value={selectedRecord.viewsDay15 || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, viewsDay15: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Views Day 30</label>
                  <input
                    type="number"
                    value={selectedRecord.viewsDay30 || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, viewsDay30: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Likes</label>
                  <input
                    type="number"
                    value={selectedRecord.likes || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, likes: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Comments</label>
                  <input
                    type="number"
                    value={selectedRecord.comments || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, comments: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Shares</label>
                  <input
                    type="number"
                    value={selectedRecord.shares || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, shares: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Saves</label>
                  <input
                    type="number"
                    value={selectedRecord.saves || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, saves: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Allocated Campaign Spend (₹)</label>
                  <input
                    type="number"
                    value={selectedRecord.allocatedSpend || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, allocatedSpend: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Reach</label>
                  <input
                    type="number"
                    value={selectedRecord.reach || 0}
                    onChange={(e) => setSelectedRecord({ ...selectedRecord, reach: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Save Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Performance Record"
        itemName={deleteTarget ? `${deleteTarget.contentTitle} (${deleteTarget.id})` : ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
