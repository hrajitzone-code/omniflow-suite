import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Check, 
  X, 
  Lock, 
  UserCheck,
  UserX,
  Building,
  Users,
  Info,
  Edit3,
  Trash2
} from 'lucide-react';
import { AnchorScheduleRecord, AnchorScheduleStatus, AnchorProfile, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';

interface AnchorSchedulesViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const AnchorSchedulesView: React.FC<AnchorSchedulesViewProps> = ({ userRole, searchQuery }) => {
  const currentUser = omniStore.getCurrentUser();
  const [schedules, setSchedules] = useState<AnchorScheduleRecord[]>(omniStore.getAnchorSchedules());
  const [anchorProfiles, setAnchorProfiles] = useState<AnchorProfile[]>(omniStore.getAnchorProfiles());
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'roster'>('calendar');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  // Modals
  const [isNewModal, setIsNewModal] = useState<boolean>(false);
  const [isRescheduleModal, setIsRescheduleModal] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  
  const [selectedRecord, setSelectedRecord] = useState<AnchorScheduleRecord | null>(null);

  // Form: Shoot Schedule
  const [form, setForm] = useState<Partial<AnchorScheduleRecord>>({
    anchorName: '',
    shootDate: new Date().toISOString().slice(0, 10),
    shootTimeSlot: '10:00 AM - 01:00 PM',
    topicTitle: '',
    department: 'Markets',
    studioOrLocation: 'Studio Floor A (Teleprompter setup)',
    status: 'Assigned',
  });

  // Form: Anchor Profile
  const [profileForm, setProfileForm] = useState<Partial<AnchorProfile>>({
    name: '',
    email: '',
    department: 'Markets & Finance',
    primaryStudio: 'Studio Floor A (Teleprompter setup)',
    status: 'Active',
  });

  const [proposedDate, setProposedDate] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [loginNoticeBanner, setLoginNoticeBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAnchorPersona = userRole === 'Anchor & Presenter';
  const canCreate = omniStore.hasPermission(currentUser, 'digital', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'digital', 'canEdit');
  const canApprove = omniStore.hasPermission(currentUser, 'digital', 'canApprove');
  const canDelete = omniStore.hasPermission(currentUser, 'digital', 'canDelete') && !isAnchorPersona;
  const canCreateOrEdit = canCreate || canEdit;

  const [deleteConfirm, setDeleteConfirm] = useState<{ kind: 'schedule' | 'profile'; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const refreshList = () => {
    setSchedules(omniStore.getAnchorSchedules());
    setAnchorProfiles(omniStore.getAnchorProfiles());
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (deleteConfirm.kind === 'schedule') {
        omniStore.deleteAnchorSchedule(deleteConfirm.id);
      } else {
        omniStore.deleteAnchorProfile(deleteConfirm.id);
      }
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('digital');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Personal isolation for anchors (matches by anchor profile ID, email, or name)
  const myAnchorProfileIds = useMemo(() => {
    const emailLower = currentUser.email.trim().toLowerCase();
    return new Set(
      anchorProfiles
        .filter(
          ap =>
            (ap.email && ap.email.trim().toLowerCase() === emailLower) ||
            ap.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
        )
        .map(ap => ap.id)
    );
  }, [anchorProfiles, currentUser]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (isAnchorPersona) {
        const matchesByName = s.anchorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
        const matchesById = Boolean(s.anchorId && myAnchorProfileIds.has(s.anchorId));
        if (!matchesByName && !matchesById) return false;
      }

      const matchesSearch = 
        s.anchorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.topicTitle && s.topicTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studioOrLocation.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'ALL') return true;
      return s.status === statusFilter;
    });
  }, [schedules, isAnchorPersona, currentUser, searchQuery, statusFilter]);

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    omniStore.saveAnchorSchedule(form);
    refreshList();
    setIsNewModal(false);
  };

  const handleOpenAddAnchorProfile = () => {
    setProfileForm({
      name: '',
      email: '',
      department: 'Markets & Finance',
      primaryStudio: 'Studio Floor A (Teleprompter setup)',
      status: 'Active',
    });
    setLoginNoticeBanner(null);
    setIsProfileModalOpen(true);
  };

  const handleOpenEditAnchorProfile = (ap: AnchorProfile) => {
    setProfileForm({ ...ap });
    setLoginNoticeBanner(null);
    setIsProfileModalOpen(true);
  };

  const handleSaveAnchorProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!canCreateOrEdit) {
      setActionError('Unauthorized: You do not have permission to manage Anchor profiles.');
      return;
    }

    try {
      const res = omniStore.saveAnchorProfile(profileForm);
      setLoginNoticeBanner(res.loginNotice);
      refreshList();
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setLoginNoticeBanner(null);
      }, 2200);
    } catch (err: any) {
      setActionError(err?.message || 'Unable to save anchor profile.');
    }
  };

  const handleToggleAnchorStatus = (id: string) => {
    setActionError(null);
    if (!canCreateOrEdit) {
      setActionError('Unauthorized: You do not have permission to toggle Anchor status.');
      return;
    }
    try {
      omniStore.toggleAnchorStatus(id);
      refreshList();
    } catch (err: any) {
      setActionError(err?.message || 'Unable to update anchor status.');
    }
  };

  const handleOpenReschedule = (record: AnchorScheduleRecord) => {
    setSelectedRecord(record);
    setProposedDate(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
    setRescheduleReason('');
    setIsRescheduleModal(true);
  };

  const handleConfirmRescheduleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    omniStore.saveAnchorSchedule({
      ...selectedRecord,
      status: 'Reschedule Requested',
      proposedRevisedDate: proposedDate,
      rescheduleReason,
      originalShootDate: selectedRecord.originalShootDate || selectedRecord.shootDate,
    });

    omniStore.addNotification({
      title: 'Anchor Shoot Reschedule Requested',
      message: `${selectedRecord.anchorName} requested to reschedule shoot to ${proposedDate}: "${rescheduleReason}"`,
      type: 'warning',
      system: 'digital',
      linkAction: { system: 'digital', tab: 'anchor_schedules', itemId: selectedRecord.id }
    });

    refreshList();
    setIsRescheduleModal(false);
  };

  const handleApproveReschedule = (record: AnchorScheduleRecord) => {
    setActionError(null);
    if (!canApprove) {
      setActionError('Only users with Digital Approval permission can approve revised shoot dates.');
      return;
    }

    omniStore.saveAnchorSchedule({
      ...record,
      shootDate: record.proposedRevisedDate || record.shootDate,
      status: 'Confirmed',
      managerNotes: `Reschedule approved by ${currentUser.name} on ${new Date().toISOString().slice(0, 10)}.`,
    });

    omniStore.addNotification({
      title: 'Anchor Shoot Date Confirmed',
      message: `Revised date for ${record.anchorName} (${record.topicTitle}) approved for ${record.proposedRevisedDate}.`,
      type: 'success',
      system: 'digital'
    });

    refreshList();
  };

  const handleUpdateStatus = (record: AnchorScheduleRecord, status: AnchorScheduleStatus) => {
    omniStore.saveAnchorSchedule({
      ...record,
      status,
    });
    refreshList();
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
      {/* Top Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Anchor Studio Scheduling & Presenter Roster
            </span>
            {isAnchorPersona && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Personal Workspace (Anchor: {currentUser.name})
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white">Daily Shoot Calendar, Shift Allocations & Anchor Roster</h2>
          <p className="text-xs text-slate-400">
            Saved to Digital Data Management workbook (`Anchor_Schedules`, `Anchor_Profiles`).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Tab Switcher */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'calendar' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Shoot Calendar
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'roster' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Anchor Roster ({anchorProfiles.length})
            </button>
          </div>

          {canCreateOrEdit && (
            <button
              onClick={
                activeTab === 'roster'
                  ? handleOpenAddAnchorProfile
                  : () => {
                      setForm({
                        anchorName: anchorProfiles.find(ap => ap.status !== 'Inactive')?.name || '',
                        shootDate: new Date().toISOString().slice(0, 10),
                        shootTimeSlot: '10:00 AM - 01:00 PM',
                        topicTitle: '',
                        department: 'Markets',
                        studioOrLocation: 'Studio Floor A (Teleprompter setup)',
                        status: 'Assigned',
                      });
                      setIsNewModal(true);
                    }
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'roster' ? 'Add Anchor Profile' : 'Schedule Shoot Shift'}
            </button>
          )}
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              {['ALL', 'Assigned', 'Confirmed', 'Reschedule Requested', 'Completed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    statusFilter === status ? 'bg-indigo-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 font-medium">{filteredSchedules.length} scheduled shifts</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchedules.map(sched => {
              const isRescheduled = sched.status === 'Reschedule Requested';
              const isConfirmed = sched.status === 'Confirmed';

              return (
                <div key={sched.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{sched.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isConfirmed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      isRescheduled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {sched.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm">{sched.anchorName}</h3>
                    <p className="text-xs text-indigo-300 font-semibold mt-0.5">{sched.topicTitle || 'Studio Session'}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{sched.department} • {sched.studioOrLocation}</p>
                  </div>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Shoot Date:</span>
                      <span className="font-bold text-white">{sched.shootDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Time Slot:</span>
                      <span>{sched.shootTimeSlot}</span>
                    </div>
                  </div>

                  {isRescheduled && (
                    <div className="p-2.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs space-y-1 text-amber-200">
                      <p className="font-bold text-[11px]">Proposed Revised Date: {sched.proposedRevisedDate}</p>
                      <p className="text-[10px] text-amber-300/80 italic">"{sched.rescheduleReason}"</p>
                      {canApprove && (
                        <button
                          onClick={() => handleApproveReschedule(sched)}
                          className="mt-2 w-full py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-xs shadow"
                        >
                          Approve Revised Shoot Date
                        </button>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                    {!isRescheduled && (canEdit || isAnchorPersona) && (
                      <button
                        onClick={() => handleOpenReschedule(sched)}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Request Reschedule
                      </button>
                    )}
                    <div className="ml-auto flex items-center gap-1.5">
                      {isConfirmed && canEdit && (
                        <button
                          onClick={() => handleUpdateStatus(sched, 'Completed')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[11px] shadow"
                        >
                          Mark Completed
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          title="Delete shoot schedule"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteConfirm({
                              kind: 'schedule',
                              id: sched.id,
                              name: `${sched.anchorName} — ${sched.topicTitle || sched.shootDate}`,
                            });
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
        </div>
      )}

      {/* ANCHOR ROSTER VIEW */}
      {activeTab === 'roster' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3.5 pl-4">Anchor Name & ID</th>
                  <th className="py-3.5">Email Address</th>
                  <th className="py-3.5">Department</th>
                  <th className="py-3.5">Primary Studio / Setup</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {anchorProfiles.map(ap => {
                  const isInactive = ap.status === 'Inactive';
                  return (
                    <tr key={ap.id} className={`hover:bg-slate-800/40 transition ${isInactive ? 'opacity-60 bg-slate-950/40' : ''}`}>
                      <td className="py-3.5 pl-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-amber-400">{ap.id}</span>
                          <span>{ap.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-300">{ap.email || 'N/A'}</td>
                      <td className="py-3.5 text-indigo-300 font-semibold">{ap.department}</td>
                      <td className="py-3.5 text-slate-300">{ap.primaryStudio}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          !isInactive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {ap.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        {(canCreateOrEdit || canDelete) && (
                          <div className="flex items-center justify-end gap-1.5">
                            {canCreateOrEdit && (
                              <>
                                <button
                                  onClick={() => handleOpenEditAnchorProfile(ap)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                  title="Edit Anchor Profile"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleAnchorStatus(ap.id)}
                                  className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                                    !isInactive ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60' : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                                  }`}
                                  title={!isInactive ? 'Deactivate Anchor Profile' : 'Activate Anchor Profile'}
                                >
                                  {!isInactive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete Anchor Profile"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteConfirm({ kind: 'profile', id: ap.id, name: `${ap.name} (${ap.id})` });
                                }}
                                className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Anchor Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {profileForm.id ? `Configure Anchor: ${profileForm.name}` : 'Create Operational Anchor Profile'}
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
                  Operational profile creation registers the presenter for studio scheduling and Digital Data Management workbook persistence. <strong>Profile creation does not automatically grant login access.</strong> To grant software login access, an Administrator must explicitly create an account in User Administration & RBAC Settings.
                </p>
              </div>
            </div>

            {loginNoticeBanner && (
              <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-emerald-200 font-medium">
                ✅ {loginNoticeBanner}
              </div>
            )}

            <form onSubmit={handleSaveAnchorProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Anchor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primary Department</label>
                  <input
                    type="text"
                    value={profileForm.department || 'Markets & Finance'}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primary Studio Floor / Setup</label>
                  <input
                    type="text"
                    value={profileForm.primaryStudio || 'Studio Floor A (Teleprompter setup)'}
                    onChange={(e) => setProfileForm({ ...profileForm, primaryStudio: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Profile Status</label>
                <select
                  value={profileForm.status || 'Active'}
                  onChange={(e: any) => setProfileForm({ ...profileForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="Active">Active Presenter</option>
                  <option value="Inactive">Deactivated / On Leave</option>
                </select>
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
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Save Anchor Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Shift Modal */}
      {isNewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Schedule Studio Shoot Shift</h3>
              <button onClick={() => setIsNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Anchor *</label>
                <select
                  required
                  value={form.anchorName || ''}
                  onChange={(e) => setForm({ ...form, anchorName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                >
                  <option value="">-- Select Active Anchor --</option>
                  {anchorProfiles.filter(ap => ap.status !== 'Inactive').map(ap => (
                    <option key={ap.id} value={ap.name}>{ap.name} ({ap.department})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic / Subject Title</label>
                <input
                  type="text"
                  placeholder="e.g. RBI Digital Lending Policy Deep-dive"
                  value={form.topicTitle || ''}
                  onChange={(e) => setForm({ ...form, topicTitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Shoot Date *</label>
                  <input
                    type="date"
                    required
                    value={form.shootDate}
                    onChange={(e) => setForm({ ...form, shootDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Time Slot *</label>
                  <select
                    value={form.shootTimeSlot}
                    onChange={(e) => setForm({ ...form, shootTimeSlot: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="10:00 AM - 01:00 PM">10:00 AM - 01:00 PM</option>
                    <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                    <option value="06:00 PM - 09:00 PM">06:00 PM - 09:00 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Studio / Location</label>
                <input
                  type="text"
                  value={form.studioOrLocation}
                  onChange={(e) => setForm({ ...form, studioOrLocation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
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
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                >
                  Schedule Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose Reschedule Modal */}
      {isRescheduleModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Propose Revised Shoot Date</h3>
              <button onClick={() => setIsRescheduleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmRescheduleRequest} className="mt-4 space-y-4">
              <div className="text-xs text-slate-300">
                <p>Current Scheduled Date: <strong className="text-white">{selectedRecord.shootDate}</strong></p>
                <p className="text-[11px] text-slate-400 mt-0.5">Original record history will be preserved in audit trail.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Proposed New Date *</label>
                <input
                  type="date"
                  required
                  value={proposedDate}
                  onChange={(e) => setProposedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Incomplete / Reschedule *</label>
                <textarea
                  required
                  rows={3}
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Script rewrite needed, medical appointment, teleprompter technical error..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-500 shadow"
                >
                  Submit to Studio Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === 'schedule' ? 'Delete Shoot Schedule' : 'Delete Anchor Profile'}
        itemName={deleteConfirm?.name || ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
