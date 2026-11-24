import React, { useState, useMemo } from 'react';
import { 
  Video, 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileVideo, 
  UserPlus, 
  X,
  Layers,
  Sparkles,
  Share2,
  Trash2
} from 'lucide-react';
import { ContentMasterRecord, RecordingLifecycle, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface ContentMasterViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const ContentMasterView: React.FC<ContentMasterViewProps> = ({ userRole, searchQuery }) => {
  const [contentList, setContentList] = useState<ContentMasterRecord[]>(omniStore.getContentMaster());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
  const [activeChannelFilter, setActiveChannelFilter] = useState<string>('ALL');
  const [isNewTopicModal, setIsNewTopicModal] = useState<boolean>(false);
  const [isHandoverModal, setIsHandoverModal] = useState<boolean>(false);
  const [isAssignEditorModal, setIsAssignEditorModal] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ContentMasterRecord | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState<Partial<ContentMasterRecord>>({
    title: '',
    department: 'Technology',
    contentType: 'Long-form Video',
    anchor: '',
    recordingDate: new Date().toISOString().slice(0, 10),
    recordingStatus: 'Planned',
    cameraman: '',
    rawFootageLocationUrl: '',
    categories: ['Tech'],
    channels: ['YouTube Main'],
    remarks: '',
  });

  const [handoverData, setHandoverData] = useState({
    cameraman: '',
    receiver: '',
    rawFootageLocationUrl: '',
  });

  const [assignData, setAssignData] = useState({
    editorId: '',
    editorName: '',
  });

  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'digital', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'digital', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'digital', 'canDelete');

  const [deleteTarget, setDeleteTarget] = useState<ContentMasterRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const capacities = omniStore.getEditorCapacities();
  const recommended = omniStore.getRecommendedEditor(4);

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
      setDeleteError(err?.message || 'Unable to delete content topic.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct categories and channels from actual records
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    contentList.forEach(c => c.categories.forEach(cat => set.add(cat)));
    return Array.from(set);
  }, [contentList]);

  const allChannels = useMemo(() => {
    const set = new Set<string>();
    contentList.forEach(c => c.channels.forEach(ch => set.add(ch)));
    return Array.from(set);
  }, [contentList]);

  const filteredContent = useMemo(() => {
    return contentList.filter(c => {
      const matchesSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.anchor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.assignedEditorName && c.assignedEditorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (activeCategoryFilter !== 'ALL' && !c.categories.includes(activeCategoryFilter)) return false;
      if (activeChannelFilter !== 'ALL' && !c.channels.includes(activeChannelFilter)) return false;
      return true;
    });
  }, [contentList, searchQuery, activeCategoryFilter, activeChannelFilter]);

  const handleOpenNewTopic = () => {
    setForm({
      title: '',
      department: 'Technology',
      contentType: 'Long-form Video',
      anchor: '',
      recordingDate: new Date().toISOString().slice(0, 10),
      recordingStatus: 'Planned',
      cameraman: '',
      rawFootageLocationUrl: '',
      categories: ['Tech'],
      channels: ['YouTube Main'],
      remarks: '',
    });
    setDuplicateWarning(null);
    setIsNewTopicModal(true);
  };

  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const res = omniStore.saveContentMaster(form);
    if (res.duplicateWarning && !duplicateWarning) {
      setDuplicateWarning(res.duplicateWarning);
      return;
    }
    refreshList();
    setIsNewTopicModal(false);
    setDuplicateWarning(null);
  };

  const handleOpenHandover = (c: ContentMasterRecord) => {
    setSelectedRecord(c);
    setHandoverData({
      cameraman: c.cameraman || '',
      receiver: omniStore.getCurrentUser().name,
      rawFootageLocationUrl: c.rawFootageLocationUrl || '',
    });
    setIsHandoverModal(true);
  };

  const handleConfirmHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    omniStore.saveContentMaster({
      ...selectedRecord,
      cameraman: handoverData.cameraman,
      receiver: handoverData.receiver,
      rawFootageLocationUrl: handoverData.rawFootageLocationUrl,
      handoverDate: new Date().toISOString().slice(0, 10),
      recordingStatus: 'Raw Footage Received',
    });
    refreshList();
    setIsHandoverModal(false);
  };

  const handleOpenAssignEditor = (c: ContentMasterRecord) => {
    setSelectedRecord(c);
    setAssignData({
      editorId: recommended.recommendedId,
      editorName: recommended.recommendedName,
    });
    setIsAssignEditorModal(true);
  };

  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    omniStore.saveContentMaster({
      ...selectedRecord,
      assignedEditorId: assignData.editorId,
      assignedEditorName: assignData.editorName,
      editingStatus: 'Assigned',
    });
    refreshList();
    setIsAssignEditorModal(false);
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {/* Category Tabs (Linked Views instead of separate sheets) */}
      <div className="flex flex-col gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-400" />
              Central Content Master
            </h2>
            <p className="text-xs text-slate-400">Single canonical record with synchronized category & channel views.</p>
          </div>

          {canCreate && (
            <button
              onClick={handleOpenNewTopic}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit New Topic
            </button>
          )}
        </div>

        {/* Linked Category View Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase text-slate-500 mr-2">Linked Categories:</span>
          <button
            onClick={() => setActiveCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeCategoryFilter === 'ALL' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Categories ({contentList.length})
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeCategoryFilter === cat ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Channel View Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase text-slate-500 mr-2">Target Channels:</span>
          <button
            onClick={() => setActiveChannelFilter('ALL')}
            className={`px-2 py-0.5 rounded text-[11px] transition ${
              activeChannelFilter === 'ALL' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Channels
          </button>
          {allChannels.map(ch => (
            <button
              key={ch}
              onClick={() => setActiveChannelFilter(ch)}
              className={`px-2 py-0.5 rounded text-[11px] transition ${
                activeChannelFilter === ch ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3.5 pl-4">Topic ID & Title</th>
                <th className="py-3.5">Department & Anchor</th>
                <th className="py-3.5">Footage Handover</th>
                <th className="py-3.5">Editor Assignment</th>
                <th className="py-3.5">Workflow Status</th>
                <th className="py-3.5">Distribution</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredContent.map(c => {
                const hasRaw = c.recordingStatus === 'Raw Footage Received';
                const hasEditor = Boolean(c.assignedEditorName);

                return (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    {/* Topic */}
                    <td className="py-3.5 pl-4 max-w-xs">
                      <span className="font-mono text-teal-400 text-xs font-semibold block">{c.id}</span>
                      <p className="font-bold text-white text-sm line-clamp-1">{c.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Type: {c.contentType}</p>
                    </td>

                    {/* Anchor & Dept */}
                    <td className="py-3.5">
                      <p className="font-semibold text-slate-200">{c.anchor}</p>
                      <p className="text-[11px] text-slate-400">{c.department}</p>
                      <p className="text-[10px] text-slate-500">Recorded: {c.recordingDate}</p>
                    </td>

                    {/* Raw Footage Handover */}
                    <td className="py-3.5">
                      {hasRaw ? (
                        <div className="text-[11px]">
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Received
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">{c.cameraman} → {c.receiver}</p>
                          {(() => {
                            const safeRawUrl = sanitizeExternalUrl(c.rawFootageLocationUrl);
                            return safeRawUrl ? (
                              <a 
                                href={safeRawUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" /> Footage Folder
                              </a>
                            ) : null;
                          })()}
                        </div>
                      ) : canEdit ? (
                        <button
                          onClick={() => handleOpenHandover(c)}
                          className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase hover:bg-amber-500/30"
                        >
                          Confirm Handover
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Pending Handover</span>
                      )}
                    </td>

                    {/* Assigned Editor */}
                    <td className="py-3.5">
                      {hasEditor ? (
                        <div>
                          <p className="font-semibold text-indigo-300">{c.assignedEditorName}</p>
                          <span className="text-[10px] text-slate-500">Edit Lead</span>
                        </div>
                      ) : hasRaw && canEdit ? (
                        <button
                          onClick={() => handleOpenAssignEditor(c)}
                          className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Assign Editor
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">{hasRaw ? 'Unassigned' : 'Await Footage'}</span>
                      )}
                    </td>

                    {/* Editing Workflow Status */}
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.editingStatus === 'Approved / Ready for Posting' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        c.editingStatus === 'Submitted for Review' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        c.editingStatus === 'Editing in Progress' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {c.editingStatus}
                      </span>
                      {(() => {
                        const safeEditUrl = sanitizeExternalUrl(c.editSubmissionUrl);
                        return safeEditUrl ? (
                          <a 
                            href={safeEditUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-teal-400 block mt-1 hover:underline"
                          >
                            View Cut Preview
                          </a>
                        ) : null;
                      })()}
                    </td>

                    {/* Distribution Channels */}
                    <td className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {c.channels.map(ch => (
                          <span key={ch} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[9px] font-medium">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {!hasRaw && canEdit && (
                          <button
                            onClick={() => handleOpenHandover(c)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                          >
                            Handover
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete content topic"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(c);
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

      {/* New Topic Modal */}
      {isNewTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Submit Topic to Master</h3>
              <button onClick={() => setIsNewTopicModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="mt-4 p-3 bg-amber-950/70 border border-amber-600 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-300">Potential Duplicate Topic</p>
                  <p className="text-amber-200 mt-0.5">{duplicateWarning}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveTopic} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic / Working Title *</label>
                <input
                  type="text"
                  required
                  value={form.title || ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 5 Cloud Technologies Powering 2027 AI Startups"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Content Type</label>
                  <select
                    value={form.contentType}
                    onChange={(e: any) => setForm({ ...form, contentType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="Long-form Video">Long-form Video</option>
                    <option value="Shorts / Reel">Shorts / Reel</option>
                    <option value="Podcast">Podcast</option>
                    <option value="Infographic / Carousel">Infographic / Carousel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lead Anchor</label>
                  <input
                    type="text"
                    value={form.anchor || ''}
                    onChange={(e) => setForm({ ...form, anchor: e.target.value })}
                    placeholder="Enter anchor name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={form.department || ''}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    placeholder="Tech, Finance, Health..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Recording Date</label>
                  <input
                    type="date"
                    value={form.recordingDate || ''}
                    onChange={(e) => setForm({ ...form, recordingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Distribution Channels (comma separated)</label>
                <input
                  type="text"
                  value={form.channels?.join(', ') || ''}
                  onChange={(e) => setForm({ ...form, channels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder="YouTube Main, Instagram Reels, LinkedIn"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Remarks & Production Notes</label>
                <textarea
                  rows={2}
                  value={form.remarks || ''}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  placeholder="Key research points, graphics needed..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTopicModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-500 shadow"
                >
                  {duplicateWarning ? 'Confirm & Override Duplicate' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raw Footage Handover Modal */}
      {isHandoverModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Raw Footage Handover Confirmation</h3>
              <button onClick={() => setIsHandoverModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmHandover} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-slate-300 font-semibold mb-1">Topic: {selectedRecord.title}</p>
                <span className="font-mono text-[11px] text-teal-400">{selectedRecord.id}</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Cameraman / DP Handover Signoff *</label>
                <input
                  type="text"
                  required
                  value={handoverData.cameraman}
                  onChange={(e) => setHandoverData({ ...handoverData, cameraman: e.target.value })}
                  placeholder="Enter cameraman name"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Receiver Name *</label>
                <input
                  type="text"
                  required
                  value={handoverData.receiver}
                  onChange={(e) => setHandoverData({ ...handoverData, receiver: e.target.value })}
                  placeholder="Enter receiver name"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Raw Footage Drive / NAS Location *</label>
                <input
                  type="url"
                  required
                  value={handoverData.rawFootageLocationUrl}
                  onChange={(e) => setHandoverData({ ...handoverData, rawFootageLocationUrl: e.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHandoverModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Confirm Handover & Unlock Editing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Editor with Capacity Recommendation */}
      {isAssignEditorModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Assign Editor with Capacity Intelligence</h3>
              <button onClick={() => setIsAssignEditorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Recommendation Banner */}
            <div className="mt-4 p-3 bg-indigo-950/60 border border-indigo-700/80 rounded-xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-indigo-300">Recommended Assignment</p>
                <p className="text-indigo-200 mt-0.5">{recommended.reason}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmAssign} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Choose Assigned Editor *</label>
                <select
                  required
                  value={assignData.editorId}
                  onChange={(e) => {
                    const sel = capacities.find(c => c.editorId === e.target.value);
                    setAssignData({
                      editorId: e.target.value,
                      editorName: sel ? sel.editorName : '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose Editor --</option>
                  {capacities.map(c => (
                    <option key={c.editorId} value={c.editorId}>
                      {c.editorName} ({c.activeAssignedPoints} current pts load)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignEditorModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 shadow"
                >
                  Assign to Editor Workspace
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
        description="Any Channel Schedule tasks linked to this Topic ID will also be removed."
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
