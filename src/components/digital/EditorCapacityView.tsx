import React, { useState } from 'react';
import { 
  Gauge, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Clock, 
  Users, 
  Check, 
  X,
  Sparkles,
  UserCheck,
  UserX,
  Info,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { EditorCapacityRecord, EditorProfile, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';

interface EditorCapacityViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const EditorCapacityView: React.FC<EditorCapacityViewProps> = ({ userRole, searchQuery }) => {
  const currentUser = omniStore.getCurrentUser();
  const [capacities, setCapacities] = useState<EditorCapacityRecord[]>(omniStore.getEditorCapacities());
  const [profiles, setProfiles] = useState<EditorProfile[]>(omniStore.getEditorProfiles());

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<Partial<EditorProfile>>({
    name: '',
    email: '',
    department: 'Video Production',
    status: 'Active',
    workingDays: 22,
    leaveDays: 0,
    dailyCapacityPoints: 5,
    longVideoTarget: 12,
    shortsTarget: 28,
  });

  const [loginNoticeBanner, setLoginNoticeBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreateOrEdit = omniStore.hasPermission(currentUser, 'digital', 'canCreate') || 
                          omniStore.hasPermission(currentUser, 'digital', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'digital', 'canDelete') &&
                    currentUser.role !== 'Video Editor' && currentUser.role !== 'Anchor & Presenter';

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshList = () => {
    setCapacities(omniStore.getEditorCapacities());
    setProfiles(omniStore.getEditorProfiles());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deleteEditorProfile(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('digital');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete editor profile.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAddEditor = () => {
    setEditingProfile({
      name: '',
      email: '',
      department: 'Video Production',
      status: 'Active',
      workingDays: 22,
      leaveDays: 0,
      dailyCapacityPoints: 5,
      longVideoTarget: 12,
      shortsTarget: 28,
    });
    setLoginNoticeBanner(null);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditEditor = (cap: EditorCapacityRecord) => {
    const prof = profiles.find(p => p.id === cap.editorId || p.name === cap.editorName);
    setEditingProfile({
      id: prof?.id || cap.editorId,
      name: cap.editorName,
      email: prof?.email || '',
      department: prof?.department || 'Video Production',
      status: cap.status || prof?.status || 'Active',
      workingDays: cap.workingDays,
      leaveDays: cap.leaveDays,
      dailyCapacityPoints: cap.dailyCapacityPoints,
      longVideoTarget: cap.longVideoTarget,
      shortsTarget: cap.shortsTarget,
    });
    setLoginNoticeBanner(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!canCreateOrEdit) {
      setActionError('Unauthorized: You do not have permission to manage Editor profiles.');
      return;
    }

    try {
      const res = omniStore.saveEditorProfile(editingProfile);
      setLoginNoticeBanner(res.loginNotice);
      refreshList();
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setLoginNoticeBanner(null);
      }, 2200);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to save editor profile.');
    }
  };

  const handleToggleStatus = (editorId: string) => {
    setActionError(null);
    if (!canCreateOrEdit) {
      setActionError('Unauthorized: You do not have permission to activate/deactivate Editors.');
      return;
    }
    try {
      omniStore.toggleEditorStatus(editorId);
      refreshList();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to update editor status.');
    }
  };

  const filteredCapacities = capacities.filter(cap => 
    cap.editorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {actionError && (
        <div className="p-3 bg-rose-950/70 border border-rose-700 rounded-xl flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {/* Top Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-400" />
            Editor Roster, Monthly Targets & Bandwidth Planning
          </h2>
          <p className="text-xs text-slate-400">
            Workload weights: Long-form = 6 pts • Shorts / Reels = 1 pt. Saved to Digital Data Management workbook.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
            <span>Active Staff: </span>
            <strong className="text-white font-bold">{capacities.filter(c => c.status !== 'Inactive').length} / {capacities.length}</strong>
          </div>

          {canCreateOrEdit && (
            <button
              onClick={handleOpenAddEditor}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Editor Profile
            </button>
          )}
        </div>
      </div>

      {/* Capacity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredCapacities.map(cap => {
          const prof = profiles.find(p => p.id === cap.editorId || p.name === cap.editorName);
          const isInactive = cap.status === 'Inactive' || prof?.status === 'Inactive';

          const netWorkingDays = cap.workingDays - cap.leaveDays;
          const maxMonthlyPoints = netWorkingDays * cap.dailyCapacityPoints;
          const completedPoints = (cap.longVideoCompleted * 6) + (cap.shortsCompleted * 1);
          const currentTotalUsedPoints = completedPoints + cap.activeAssignedPoints;
          const remainingPoints = Math.max(0, maxMonthlyPoints - currentTotalUsedPoints);
          const loadPercentage = maxMonthlyPoints > 0
            ? Math.min(100, Math.round((currentTotalUsedPoints / maxMonthlyPoints) * 100))
            : 0;

          const longTargetPct = cap.longVideoTarget > 0 ? Math.round((cap.longVideoCompleted / cap.longVideoTarget) * 100) : 0;
          const shortsTargetPct = cap.shortsTarget > 0 ? Math.round((cap.shortsCompleted / cap.shortsTarget) * 100) : 0;

          return (
            <div 
              key={cap.id} 
              className={`bg-slate-900 border rounded-2xl p-5 shadow-sm space-y-4 transition ${
                isInactive ? 'border-rose-900/50 bg-slate-950/60 opacity-75' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">{cap.editorName}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      !isInactive 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {!isInactive ? 'Active Staff' : 'Deactivated'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Month: {cap.month} • {netWorkingDays} net working days ({cap.leaveDays}d approved leave)
                  </p>
                </div>

                {(canCreateOrEdit || canDelete) && (
                  <div className="flex items-center gap-1.5">
                    {canCreateOrEdit && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(prof?.id || cap.editorId)}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                            !isInactive ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60' : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                          }`}
                          title={!isInactive ? 'Deactivate Editor Profile' : 'Activate Editor Profile'}
                        >
                          {!isInactive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleOpenEditEditor(cap)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Configure
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete editor profile & capacity"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget({ id: prof?.id || cap.editorId || cap.id, name: cap.editorName });
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Bandwidth Gauge Bar */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Monthly Bandwidth Allocation</span>
                  <span className={`font-bold ${loadPercentage > 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {loadPercentage}% Allocated ({currentTotalUsedPoints} / {maxMonthlyPoints} pts)
                  </span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      loadPercentage > 85 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-gradient-to-r from-teal-500 to-indigo-500'
                    }`} 
                    style={{ width: `${loadPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>In-flight queue: {cap.activeAssignedPoints} pts</span>
                  <span>Available capacity: {remainingPoints} pts</span>
                </div>
              </div>

              {/* Deliverable Targets vs Actuals */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Long Videos */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-semibold">Long Videos (6 pts)</span>
                    <span className="font-bold text-white">{longTargetPct}%</span>
                  </div>
                  <div className="text-lg font-bold text-teal-400">
                    {cap.longVideoCompleted} <span className="text-xs text-slate-500 font-normal">/ {cap.longVideoTarget} target</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
                    <div className="bg-teal-400 h-1 rounded-full" style={{ width: `${Math.min(100, longTargetPct)}%` }} />
                  </div>
                </div>

                {/* Shorts / Reels */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 font-semibold">Shorts / Reels (1 pt)</span>
                    <span className="font-bold text-white">{shortsTargetPct}%</span>
                  </div>
                  <div className="text-lg font-bold text-indigo-400">
                    {cap.shortsCompleted} <span className="text-xs text-slate-500 font-normal">/ {cap.shortsTarget} target</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
                    <div className="bg-indigo-400 h-1 rounded-full" style={{ width: `${Math.min(100, shortsTargetPct)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Editor Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">
                  {editingProfile.id ? `Configure Editor: ${editingProfile.name}` : 'Create Operational Editor Profile'}
                </h3>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Login Notice Banner */}
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Software Login Access Rule:</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Operational profile creation registers the staff member for task assignment, bandwidth tracking, and Digital Data Management workbook persistence. <strong>Profile creation does not automatically grant login access.</strong> To grant software login access, an Administrator must explicitly create an account in User Administration & RBAC Settings.
                </p>
              </div>
            </div>

            {loginNoticeBanner && (
              <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-emerald-200 font-medium">
                ✅ {loginNoticeBanner}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Editor Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProfile.name || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingProfile.email || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={editingProfile.department || 'Video Production'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Profile Status</label>
                  <select
                    value={editingProfile.status || 'Active'}
                    onChange={(e: any) => setEditingProfile({ ...editingProfile, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="Active">Active Staff</option>
                    <option value="Inactive">Deactivated / Offboarded</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Working Days</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={editingProfile.workingDays || 22}
                    onChange={(e) => setEditingProfile({ ...editingProfile, workingDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Approved Leave</label>
                  <input
                    type="number"
                    min="0"
                    max="31"
                    required
                    value={editingProfile.leaveDays || 0}
                    onChange={(e) => setEditingProfile({ ...editingProfile, leaveDays: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pts / Day</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProfile.dailyCapacityPoints || 5}
                    onChange={(e) => setEditingProfile({ ...editingProfile, dailyCapacityPoints: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Long Video Monthly Target</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProfile.longVideoTarget || 12}
                    onChange={(e) => setEditingProfile({ ...editingProfile, longVideoTarget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Shorts / Reels Monthly Target</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProfile.shortsTarget || 28}
                    onChange={(e) => setEditingProfile({ ...editingProfile, shortsTarget: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-500 shadow"
                >
                  Save Profile & Targets
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Editor Profile"
        itemName={deleteTarget?.name || ''}
        description="This removes both the Editor operational profile and its capacity target record."
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
