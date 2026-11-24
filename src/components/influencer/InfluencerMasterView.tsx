import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Star, 
  ExternalLink, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Instagram, 
  Youtube, 
  Twitter, 
  Linkedin,
  Lock,
  Building,
  CreditCard,
  TrendingUp,
  Award,
  Trash2
} from 'lucide-react';
import { InfluencerRecord, InfluencerStage, UserRole, FilterState, DEFAULT_DEPARTMENTS, DEFAULT_FRANCHISES } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { AdvancedFilterBar } from '../common/AdvancedFilterBar';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { exportToCSV, printReport } from '../../utils/exportUtils';
import { INDIAN_STATES, getCitiesForState, findStateForCity } from '../../data/indiaLocations';

interface InfluencerMasterViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const InfluencerMasterView: React.FC<InfluencerMasterViewProps> = ({ userRole, searchQuery }) => {
  const [influencers, setInfluencers] = useState<InfluencerRecord[]>(omniStore.getInfluencers());
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerRecord | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showMaskedFields, setShowMaskedFields] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [newDeptInput, setNewDeptInput] = useState<string>('');

  // Advanced Filter State
  const [filterState, setFilterState] = useState<FilterState>({
    businessTypes: [],
    franchises: [],
    departments: [],
    statuses: [],
    influencerTypes: [],
    collaborationTypes: [],
    startDate: '',
    endDate: '',
    months: [],
    years: [],
    campaignStatuses: [],
    paymentStatuses: [],
    contentStatuses: [],
    states: [],
    genders: [],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Form State
  const [formData, setFormData] = useState<Partial<InfluencerRecord>>({
    name: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    address: '',
    businessTypes: ['Ajit Zone'],
    franchises: [],
    departments: ['Saree'],
    influencerStatus: 'Active',
    influencerType: 'Instagram',
    collaborationType: 'Paid',
    socialPlatforms: {
      instagram: { handle: '', followers: 0, profileUrl: '' },
      youtube: { handle: '', subscribers: 0, channelUrl: '' },
    },
    contentRates: {
      reelRate: 0,
      youtubeVideoRate: 0,
      storyRate: 0,
      staticPostRate: 0,
    },
    panNumber: '',
    govIdType: 'Aadhaar',
    govIdNumber: '',
    bankDetails: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
    },
    isBlacklisted: false,
    blacklistReason: '',
    internalRating: 4.5,
    isPreferred: false,
    remarks: '',
    totalReels: 0,
    totalPosts: 0,
    totalStories: 0,
    totalViews: 0,
    totalReach: 0,
    engagementRate: 4.0,
  });

  const currentUser = omniStore.getCurrentUser();
  const canViewSensitive = omniStore.hasPermission(currentUser, 'influencer', 'viewSensitiveFields');
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'influencer', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'influencer', 'canDelete');
  const canExport = omniStore.hasPermission(currentUser, 'influencer', 'canExport');

  const [deleteTarget, setDeleteTarget] = useState<InfluencerRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  const availableDepts = omniStore.getDepartments();
  const availableFranchises = omniStore.getFranchises();

  const refreshList = () => {
    setInfluencers(omniStore.getInfluencers());
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      omniStore.deleteInfluencer(deleteTarget.id);
      refreshList();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete influencer profile.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInfluencers = useMemo(() => {
    return influencers.filter((inf) => {
      // Global search query
      const matchesSearch = 
        inf.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        inf.city.toLowerCase().includes(localSearch.toLowerCase()) ||
        (inf.state || '').toLowerCase().includes(localSearch.toLowerCase()) ||
        inf.email.toLowerCase().includes(localSearch.toLowerCase()) ||
        inf.phone.includes(localSearch) ||
        inf.id.toLowerCase().includes(localSearch.toLowerCase());

      if (!matchesSearch) return false;

      // Stage / Blacklist tab filter
      if (stageFilter === 'BLACKLISTED' && !inf.isBlacklisted) return false;
      if (stageFilter !== 'ALL' && stageFilter !== 'BLACKLISTED' && inf.stage !== stageFilter) return false;

      // Advanced filters (AND between groups, OR within multi-select)
      if (filterState.businessTypes.length > 0) {
        const hasBt = (inf.businessTypes || []).some(bt => filterState.businessTypes.includes(bt));
        if (!hasBt) return false;
      }

      if (filterState.franchises.length > 0) {
        const hasFran = (inf.franchises || []).some(f => filterState.franchises.includes(f));
        if (!hasFran) return false;
      }

      if (filterState.departments.length > 0) {
        const hasDept = (inf.departments || []).some(d => filterState.departments.includes(d));
        if (!hasDept) return false;
      }

      if (filterState.statuses.length > 0) {
        if (!filterState.statuses.includes(inf.influencerStatus || (inf.isBlacklisted ? 'Blacklisted' : 'Active'))) return false;
      }

      if (filterState.influencerTypes.length > 0) {
        if (!filterState.influencerTypes.includes(inf.influencerType || 'Instagram')) return false;
      }

      if (filterState.collaborationTypes.length > 0) {
        if (!filterState.collaborationTypes.includes(inf.collaborationType || 'Paid')) return false;
      }

      if (filterState.states.length > 0) {
        const infState = inf.state || findStateForCity(inf.city) || '';
        if (!filterState.states.includes(infState)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (filterState.sortBy === 'followers') {
        const fa = (a.socialPlatforms?.instagram?.followers || 0) + (a.socialPlatforms?.youtube?.subscribers || 0);
        const fb = (b.socialPlatforms?.instagram?.followers || 0) + (b.socialPlatforms?.youtube?.subscribers || 0);
        return filterState.sortOrder === 'desc' ? fb - fa : fa - fb;
      }
      if (filterState.sortBy === 'engagement') {
        return filterState.sortOrder === 'desc' ? (b.engagementRate || 0) - (a.engagementRate || 0) : (a.engagementRate || 0) - (b.engagementRate || 0);
      }
      if (filterState.sortBy === 'budget') {
        return filterState.sortOrder === 'desc' ? (b.contentRates?.reelRate || 0) - (a.contentRates?.reelRate || 0) : (a.contentRates?.reelRate || 0) - (b.contentRates?.reelRate || 0);
      }
      if (filterState.sortBy === 'name') {
        return filterState.sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
      }
      // default date
      return filterState.sortOrder === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [influencers, localSearch, stageFilter, filterState]);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      address: '',
      businessTypes: ['Ajit Zone'],
      franchises: [],
      departments: ['Saree'],
      influencerStatus: 'Active',
      influencerType: 'Instagram',
      collaborationType: 'Paid',
      socialPlatforms: {
        instagram: { handle: '', followers: 0, profileUrl: '' },
        youtube: { handle: '', subscribers: 0, channelUrl: '' },
      },
      contentRates: { reelRate: 0, youtubeVideoRate: 0, storyRate: 0, staticPostRate: 0 },
      panNumber: '',
      govIdType: 'Aadhaar',
      govIdNumber: '',
      bankDetails: { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '', upiId: '' },
      isBlacklisted: false,
      blacklistReason: '',
      internalRating: 4.0,
      isPreferred: false,
      remarks: '',
      totalReels: 0,
      totalPosts: 0,
      totalStories: 0,
      totalViews: 0,
      totalReach: 0,
      engagementRate: 4.5,
    });
    setDuplicateWarning(null);
    setIsEditing(true);
  };

  const handleOpenEditModal = (inf: InfluencerRecord) => {
    const inferredState = inf.state || findStateForCity(inf.city) || '';
    setFormData({ ...inf, state: inferredState });
    setDuplicateWarning(null);
    setIsEditing(true);
  };

  const handleSaveCreator = (e: React.FormEvent) => {
    e.preventDefault();
    const res = omniStore.saveInfluencer(formData);
    if (res.duplicateWarning && !duplicateWarning) {
      setDuplicateWarning(res.duplicateWarning);
      return;
    }
    refreshList();
    setIsEditing(false);
    setDuplicateWarning(null);
  };

  const handleExportCSV = () => {
    const rows = filteredInfluencers.map(i => ({
      ID: i.id,
      Name: i.name,
      Phone: i.phone,
      Email: i.email,
      State: i.state || '',
      City: i.city,
      BusinessTypes: (i.businessTypes || []).join('; '),
      Franchises: (i.franchises || []).join('; '),
      Departments: (i.departments || []).join('; '),
      Stage: i.stage,
      Status: i.influencerStatus || 'Active',
      IG_Followers: i.socialPlatforms?.instagram?.followers || 0,
      YT_Subscribers: i.socialPlatforms?.youtube?.subscribers || 0,
      ReelRate: i.contentRates?.reelRate || 0,
      Rating: i.internalRating,
    }));
    exportToCSV('influencers_master', rows);
  };

  const handlePrintReport = () => {
    const headers = ['ID', 'Creator Name', 'Business / Franchise', 'Departments', 'Stage', 'Phone', 'IG Followers', 'Rate (₹)'];
    const rows = filteredInfluencers.map(i => [
      i.id,
      i.name,
      [...(i.businessTypes || []), ...(i.franchises || [])].join(', '),
      (i.departments || []).join(', '),
      i.stage,
      i.phone,
      (i.socialPlatforms?.instagram?.followers || 0).toLocaleString(),
      (i.contentRates?.reelRate || 0).toLocaleString()
    ]);
    printReport('Influencer Master Directory Report', `Total matching records: ${filteredInfluencers.length}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      {/* Advanced Filter Bar */}
      <AdvancedFilterBar
        filterState={filterState}
        onFilterChange={setFilterState}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        totalMatching={filteredInfluencers.length}
        onExportCSV={canExport ? handleExportCSV : undefined}
        onPrintReport={canExport ? handlePrintReport : undefined}
      />

      {/* Controls & Stage Quick Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'Payment-Ready', 'Campaign-Ready', 'Draft', 'BLACKLISTED'].map((stage) => (
            <button
              key={stage}
              onClick={() => setStageFilter(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                stageFilter === stage
                  ? stage === 'BLACKLISTED'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-violet-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {stage === 'ALL' ? 'All Creators' : stage}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {canViewSensitive && (
            <button
              onClick={() => setShowMaskedFields(!showMaskedFields)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              title="Toggle PAN & Banking masking"
            >
              {showMaskedFields ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showMaskedFields ? 'Mask Sensitive Info' : 'Reveal Sensitive (Finance)'}</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Creator Profile
            </button>
          )}
        </div>
      </div>

      {/* Influencer Grid / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3.5 pl-4">Creator Identity & Business</th>
                <th className="py-3.5">Business & Franchise</th>
                <th className="py-3.5">Product Departments</th>
                <th className="py-3.5">Social Channels</th>
                <th className="py-3.5">Standard Rates</th>
                <th className="py-3.5">KYC & Banking</th>
                <th className="py-3.5">Rating</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInfluencers.map((inf) => {
                const stageColor = 
                  inf.isBlacklisted ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  inf.stage === 'Payment-Ready' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                  inf.stage === 'Campaign-Ready' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                  'bg-amber-500/20 text-amber-300 border-amber-500/40';

                return (
                  <tr key={inf.id} className="hover:bg-slate-800/40 transition group">
                    {/* Identity */}
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100 text-sm">{inf.name}</span>
                            {inf.isPreferred && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                Preferred
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-500">{inf.id}</span>
                            <span>• {[inf.city, inf.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                            <span>• {inf.phone}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Business & Franchise */}
                    <td className="py-3.5">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {(inf.businessTypes || ['Ajit Zone']).map((bt, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {bt}
                            </span>
                          ))}
                        </div>
                        {inf.franchises && inf.franchises.length > 0 && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]" title={inf.franchises.join(', ')}>
                            Franchise: {inf.franchises.join(', ')}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Product Departments */}
                    <td className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(inf.departments || ['General']).slice(0, 3).map((dept, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">
                            {dept}
                          </span>
                        ))}
                        {(inf.departments || []).length > 3 && (
                          <span className="text-[9px] text-slate-400 self-center">+{(inf.departments || []).length - 3}</span>
                        )}
                      </div>
                    </td>

                    {/* Socials */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2 text-[11px] text-slate-300">
                        {inf.socialPlatforms?.youtube?.handle && (
                          <div className="flex items-center gap-1 text-red-400" title="YouTube">
                            <Youtube className="w-3.5 h-3.5" />
                            <span>{((inf.socialPlatforms.youtube.subscribers || 0) / 1000).toFixed(0)}k</span>
                          </div>
                        )}
                        {inf.socialPlatforms?.instagram?.handle && (
                          <div className="flex items-center gap-1 text-pink-400" title="Instagram">
                            <Instagram className="w-3.5 h-3.5" />
                            <span>{((inf.socialPlatforms.instagram.followers || 0) / 1000).toFixed(0)}k</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Content Rates */}
                    <td className="py-3.5">
                      <div className="text-[11px] space-y-0.5">
                        <p className="text-slate-200">Reel: <span className="font-semibold text-white">₹{inf.contentRates.reelRate.toLocaleString()}</span></p>
                      </div>
                    </td>

                    {/* KYC & Banking */}
                    <td className="py-3.5">
                      <div className="text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">
                            {showMaskedFields && canViewSensitive
                              ? inf.panNumber || 'Missing'
                              : inf.panNumber ? '••••••••' + inf.panNumber.slice(-2) : 'Missing'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Rating */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-1 text-amber-400 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{inf.internalRating}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(inf)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                          >
                            Edit Profile
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget(inf);
                            }}
                            title="Delete creator profile"
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

      {/* Add / Edit Creator Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {formData.id ? `Edit Profile • ${formData.id}` : 'Onboard New Creator'}
                </h3>
                <p className="text-xs text-slate-400">
                  Select mandatory Business Association, Franchises, and Product Departments.
                </p>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="mt-4 p-3 bg-amber-950/60 border border-amber-600 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-300">Duplicate Creator Detected</p>
                  <p className="text-amber-200/90 mt-0.5">{duplicateWarning}</p>
                  <p className="text-[11px] text-amber-300/80 mt-1">
                    Click "Confirm & Save Anyway" if this is verified as a separate creator profile.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveCreator} className="mt-6 space-y-5">
              {/* Mandatory Business Association (Ajit Zone / Franchise) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider">
                  A. Business / Brand Classification (Required) *
                </label>
                <div className="flex gap-6">
                  {['Ajit Zone', 'Franchise'].map((bt) => {
                    const checked = (formData.businessTypes || []).includes(bt as any);
                    return (
                      <label key={bt} className="flex items-center gap-2 cursor-pointer text-xs text-slate-200 font-semibold">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = formData.businessTypes || [];
                            const next = e.target.checked ? [...current, bt] : current.filter(x => x !== bt);
                            setFormData({ ...formData, businessTypes: next as any });
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-violet-600 w-4 h-4"
                        />
                        {bt}
                      </label>
                    );
                  })}
                </div>

                {/* Franchise Selection if Franchise checked */}
                {(formData.businessTypes || []).includes('Franchise') && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">Select Relevant Franchises *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableFranchises.map(fran => {
                        const sel = (formData.franchises || []).includes(fran);
                        return (
                          <label key={fran} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sel}
                              onChange={(e) => {
                                const current = formData.franchises || [];
                                const next = e.target.checked ? [...current, fran] : current.filter(f => f !== fran);
                                setFormData({ ...formData, franchises: next });
                              }}
                              className="rounded bg-slate-900 border-slate-700 text-violet-600"
                            />
                            {fran}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* B. Department / Product Category (Multi-Select) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-violet-300 uppercase tracking-wider">
                    B. Product Departments / Categories (Multi-Select) *
                  </label>
                  {(canCreate || canEdit) && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add new category..."
                        value={newDeptInput}
                        onChange={(e) => setNewDeptInput(e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newDeptInput.trim()) {
                            omniStore.saveDepartment(newDeptInput.trim());
                            const current = formData.departments || [];
                            setFormData({ ...formData, departments: [...current, newDeptInput.trim()] });
                            setNewDeptInput('');
                          }
                        }}
                        className="px-2 py-1 bg-violet-600 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-2">
                  {availableDepts.map(dept => {
                    const sel = (formData.departments || []).includes(dept);
                    return (
                      <label key={dept} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={(e) => {
                            const current = formData.departments || [];
                            const next = e.target.checked ? [...current, dept] : current.filter(d => d !== dept);
                            setFormData({ ...formData, departments: next });
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-violet-600"
                        />
                        {dept}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Creator / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State / UT *</label>
                  <select
                    required
                    value={formData.state || ''}
                    onChange={(e) => {
                      const nextState = e.target.value;
                      const stateCities = getCitiesForState(nextState);
                      const keepCity = formData.city && stateCities.includes(formData.city) ? formData.city : '';
                      setFormData({ ...formData, state: nextState, city: keepCity });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Select State --</option>
                    {formData.state && !INDIAN_STATES.includes(formData.state) && (
                      <option value={formData.state}>{formData.state}</option>
                    )}
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <select
                    required
                    disabled={!formData.state}
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white disabled:opacity-50"
                  >
                    <option value="">
                      {formData.state ? '-- Select City --' : 'Select State first'}
                    </option>
                    {(() => {
                      const cities = getCitiesForState(formData.state);
                      return (
                        <>
                          {formData.city && !cities.includes(formData.city) && (
                            <option value={formData.city}>{formData.city}</option>
                          )}
                          {cities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </>
                      );
                    })()}
                  </select>
                </div>
              </div>

              {/* Social Channels & Rates */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider">Social Channels & Pricing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Instagram Handle & Followers</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="@handle"
                        value={formData.socialPlatforms?.instagram?.handle || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialPlatforms: {
                            ...formData.socialPlatforms,
                            instagram: { handle: e.target.value, followers: formData.socialPlatforms?.instagram?.followers || 0 }
                          }
                        })}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="number"
                        placeholder="Followers"
                        value={formData.socialPlatforms?.instagram?.followers || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialPlatforms: {
                            ...formData.socialPlatforms,
                            instagram: { handle: formData.socialPlatforms?.instagram?.handle || '', followers: Number(e.target.value) }
                          }
                        })}
                        className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Standard Reel Rate (₹)</label>
                    <input
                      type="number"
                      value={formData.contentRates?.reelRate || 0}
                      onChange={(e) => setFormData({
                        ...formData,
                        contentRates: { ...formData.contentRates!, reelRate: Number(e.target.value) }
                      })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Performance Metrics Tracking */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Historical Performance Metrics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Total Views</label>
                    <input
                      type="number"
                      value={formData.totalViews || 0}
                      onChange={(e) => setFormData({ ...formData, totalViews: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Total Reach</label>
                    <input
                      type="number"
                      value={formData.totalReach || 0}
                      onChange={(e) => setFormData({ ...formData, totalReach: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Engagement Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.engagementRate || 4.0}
                      onChange={(e) => setFormData({ ...formData, engagementRate: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Store Visits</label>
                    <input
                      type="number"
                      value={formData.storeVisits || 0}
                      onChange={(e) => setFormData({ ...formData, storeVisits: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Banking & Identity */}
              {canViewSensitive ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Identity & Banking (KYC)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={formData.panNumber || ''}
                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono uppercase text-white"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={formData.bankDetails?.bankName || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          bankDetails: { ...formData.bankDetails!, bankName: e.target.value }
                        })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>KYC & banking fields are restricted to Finance / authorized users. Existing KYC data is preserved automatically.</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 shadow-lg shadow-violet-600/30"
                >
                  {duplicateWarning ? 'Confirm & Save Anyway' : 'Save Creator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Influencer Profile"
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.id})` : ''}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
