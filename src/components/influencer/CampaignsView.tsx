import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  Edit3, 
  X, 
  FileCheck, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Link2,
  Eye,
  Heart,
  BarChart3,
  MessageCircle,
  Share2,
  TrendingUp,
  Trash2
} from 'lucide-react';
import { CampaignRecord, DeliverableItem, CampaignStatus, PerformanceRecord, UserRole, FilterState, CAMPAIGN_OBJECTIVES, DEFAULT_DEPARTMENTS, DEFAULT_FRANCHISES } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService } from '../../services/googleSheetsService';
import { AdvancedFilterBar } from '../common/AdvancedFilterBar';
import { DeleteConfirmModal, DeleteFeedbackBanner, DeleteFeedback } from '../common/DeleteConfirmModal';
import { exportToCSV, printReport } from '../../utils/exportUtils';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface PostPerfEntryForm {
  localKey: string;
  id?: string;
  contentTitle: string;
  publishedUrl: string;
  actualPostingDate: string;
  platform: string;
  viewsDay7: number;
  viewsDay15: number;
  viewsDay30: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  allocatedSpend: number;
  notes: string;
}

interface CampaignsViewProps {
  userRole: UserRole;
  searchQuery: string;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({ userRole, searchQuery }) => {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(omniStore.getCampaigns());
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(omniStore.getDeliverables());
  const [performances, setPerformances] = useState<PerformanceRecord[]>(omniStore.getPerformances());
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignRecord | null>(null);
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);

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
  
  // Modals
  const [isNewCampaignModal, setIsNewCampaignModal] = useState<boolean>(false);
  const [isDeliverableModal, setIsDeliverableModal] = useState<boolean>(false);
  const [isAuditEditModal, setIsAuditEditModal] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [deliverableError, setDeliverableError] = useState<string | null>(null);

  // Multi-Link Posted Links & Performance Modal state (supports unlimited links)
  const [postPerfContext, setPostPerfContext] = useState<{
    campaign: CampaignRecord;
    deliverable: DeliverableItem | null;
  } | null>(null);
  const [postPerfError, setPostPerfError] = useState<string | null>(null);
  const [postPerfEntries, setPostPerfEntries] = useState<PostPerfEntryForm[]>([]);
  const [removedPerfIds, setRemovedPerfIds] = useState<string[]>([]);

  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canEdit = omniStore.hasPermission(currentUser, 'influencer', 'canEdit');
  const canDelete = omniStore.hasPermission(currentUser, 'influencer', 'canDelete');
  const canExport = omniStore.hasPermission(currentUser, 'influencer', 'canExport');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: 'campaign' | 'deliverable';
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<DeleteFeedback | null>(null);

  // Form states
  const [campaignForm, setCampaignForm] = useState<Partial<CampaignRecord>>({
    name: '',
    businessTypes: ['Ajit Zone'],
    franchises: [],
    departments: ['Saree'],
    influencerId: '',
    influencerName: '',
    department: 'Saree',
    objective: 'Brand Awareness',
    collaborationType: 'Paid',
    visitDate: new Date().toISOString().slice(0, 10),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    month: 'November',
    year: '2026',
    agreedAmount: 0,
    budget: 0,
    advancePaid: 0,
    status: 'Planned',
    assignedTeamMember: omniStore.getCurrentUser().name,
  });

  const [deliverableForm, setDeliverableForm] = useState<Partial<DeliverableItem>>({
    title: '',
    type: 'Instagram Reel',
    isRequired: true,
    status: 'Pending',
    shootDate: new Date().toISOString().slice(0, 10),
    expectedPostingDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    publishedUrl: '',
    remarks: '',
  });

  const influencers = omniStore.getInfluencers();
  const availableDepts = omniStore.getDepartments();
  const availableFranchises = omniStore.getFranchises();

  const refreshData = () => {
    const nextCampaigns = omniStore.getCampaigns();
    setCampaigns(nextCampaigns);
    setDeliverables(omniStore.getDeliverables());
    setPerformances(omniStore.getPerformances());
    if (selectedCampaign) {
      const updated = nextCampaigns.find(c => c.id === selectedCampaign.id) || null;
      setSelectedCampaign(updated);
    }
  };

  const inferPlatformFromDeliverableType = (type: DeliverableItem['type']): string => {
    if (type.toLowerCase().includes('youtube')) return 'YouTube';
    if (type.toLowerCase().includes('instagram') || type.toLowerCase().includes('reel') || type.toLowerCase().includes('story')) {
      return 'Instagram';
    }
    return 'Instagram';
  };

  const computeEngagementRate = (
    views: number,
    likes: number,
    comments: number,
    shares: number,
    saves: number,
    reach: number
  ): number => {
    const base = reach > 0 ? reach : views;
    if (base <= 0) return 0;
    const totalInteractions = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0);
    return Number(((totalInteractions / base) * 100).toFixed(2));
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        c.influencerName.toLowerCase().includes(localSearch.toLowerCase()) ||
        c.id.toLowerCase().includes(localSearch.toLowerCase()) ||
        c.objective.toLowerCase().includes(localSearch.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

      if (filterState.campaignStatuses.length > 0 && !filterState.campaignStatuses.includes(c.status)) {
        return false;
      }

      if (filterState.businessTypes.length > 0) {
        const hasBt = (c.businessTypes || []).some(bt => filterState.businessTypes.includes(bt));
        if (!hasBt) return false;
      }

      if (filterState.franchises.length > 0) {
        const hasFran = (c.franchises || []).some(f => filterState.franchises.includes(f));
        if (!hasFran) return false;
      }

      if (filterState.departments.length > 0) {
        const hasDept = (c.departments || []).some(d => filterState.departments.includes(d));
        if (!hasDept) return false;
      }

      if (filterState.months.length > 0 && c.month && !filterState.months.includes(c.month)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filterState.sortBy === 'budget') {
        return filterState.sortOrder === 'desc' ? (b.agreedAmount || 0) - (a.agreedAmount || 0) : (a.agreedAmount || 0) - (b.agreedAmount || 0);
      }
      return filterState.sortOrder === 'desc' ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [campaigns, localSearch, statusFilter, filterState]);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!canCreate) {
      setModalError('You do not have permission to create campaigns.');
      return;
    }
    const inf = influencers.find(i => i.id === campaignForm.influencerId);
    
    if (inf?.isBlacklisted && userRole !== 'Super Admin') {
      setModalError(`Creator "${inf.name}" is blacklisted. Only a Super Admin can approve an exception.`);
      return;
    }

    try {
      const created = omniStore.saveCampaign({
        ...campaignForm,
        influencerName: inf ? inf.name : 'Unknown Creator',
      });

      omniStore.saveDeliverable({
        campaignId: created.id,
        title: `${created.name} - Primary Reel`,
        type: 'Instagram Reel',
        isRequired: true,
        status: 'Pending',
        expectedPostingDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });

      refreshData();
      setIsNewCampaignModal(false);
    } catch (err: any) {
      setModalError(err?.message || 'Unable to create campaign.');
    }
  };

  const handleSaveDeliverable = (e: React.FormEvent, openPerformanceAfter = false) => {
    e.preventDefault();
    setDeliverableError(null);
    if (!selectedCampaign) return;

    const rawUrl = (deliverableForm.publishedUrl || '').trim();
    const safeUrl = rawUrl ? sanitizeExternalUrl(rawUrl) : '';
    if (rawUrl && !safeUrl) {
      setDeliverableError('Please enter a valid http:// or https:// posted link URL.');
      return;
    }

    try {
      const saved = omniStore.saveDeliverable({
        ...deliverableForm,
        campaignId: selectedCampaign.id,
        status: safeUrl ? 'Posted' : (deliverableForm.status || 'Pending'),
        actualPostingDate: safeUrl ? (deliverableForm.actualPostingDate || new Date().toISOString().slice(0, 10)) : deliverableForm.actualPostingDate,
        publishedUrl: safeUrl || undefined,
      });
      refreshData();
      setIsDeliverableModal(false);
      if (openPerformanceAfter || safeUrl) {
        handleOpenPostPerformance(saved, selectedCampaign);
      }
    } catch (err: any) {
      setDeliverableError(err?.message || 'Unable to save deliverable.');
    }
  };

  const createBlankPostPerfEntry = (
    camp: CampaignRecord,
    del: DeliverableItem | null,
    indexNumber: number,
    defaultSpend = 0
  ): PostPerfEntryForm => ({
    localKey: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    contentTitle: del
      ? (indexNumber === 1 ? del.title : `${del.title} - Link #${indexNumber}`)
      : `${camp.name} - Reel / Video #${indexNumber}`,
    publishedUrl: '',
    actualPostingDate: new Date().toISOString().slice(0, 10),
    platform: del ? inferPlatformFromDeliverableType(del.type) : 'Instagram',
    viewsDay7: 0,
    viewsDay15: 0,
    viewsDay30: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: 0,
    allocatedSpend: defaultSpend,
    notes: '',
  });

  const handleOpenPostPerformance = (
    del: DeliverableItem | null,
    camp: CampaignRecord,
    appendNew = false
  ) => {
    setPostPerfError(null);
    setRemovedPerfIds([]);
    const latestPerfs = omniStore.getPerformances();
    const matchedPerfs = del
      ? latestPerfs.filter(p => p.deliverableId === del.id)
      : latestPerfs.filter(p => p.campaignId === camp.id && !p.deliverableId);

    const campDeliverableCount = Math.max(1, deliverables.filter(d => d.campaignId === camp.id).length);
    const defaultSpend = Math.round((camp.agreedAmount || 0) / campDeliverableCount);

    const mapped: PostPerfEntryForm[] = matchedPerfs.map((p, idx) => ({
      localKey: `saved-${p.id}-${idx}`,
      id: p.id,
      contentTitle: p.contentTitle || (del ? del.title : `${camp.name} - Link #${idx + 1}`),
      publishedUrl: p.publishedUrl || (idx === 0 && del?.publishedUrl ? del.publishedUrl : ''),
      actualPostingDate: p.postingDate || del?.actualPostingDate || new Date().toISOString().slice(0, 10),
      platform: p.platform || (del ? inferPlatformFromDeliverableType(del.type) : 'Instagram'),
      viewsDay7: p.viewsDay7 || 0,
      viewsDay15: p.viewsDay15 || 0,
      viewsDay30: p.viewsDay30 || 0,
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      saves: p.saves || 0,
      reach: p.reach || 0,
      allocatedSpend: p.allocatedSpend ?? defaultSpend,
      notes: p.notes || '',
    }));

    // If deliverable had a legacy publishedUrl with no PerformanceRecord yet, prefill entry #1
    if (mapped.length === 0 && del) {
      mapped.push({
        ...createBlankPostPerfEntry(camp, del, 1, defaultSpend),
        publishedUrl: del.publishedUrl || '',
        actualPostingDate: del.actualPostingDate || new Date().toISOString().slice(0, 10),
        notes: del.remarks || '',
      });
    } else if (mapped.length === 0 || appendNew) {
      mapped.push(createBlankPostPerfEntry(camp, del, mapped.length + 1, mapped.length === 0 ? defaultSpend : 0));
    }

    setPostPerfContext({ campaign: camp, deliverable: del });
    setPostPerfEntries(mapped);
  };

  const handleAddAnotherLinkEntry = () => {
    if (!postPerfContext) return;
    setPostPerfEntries(prev => [
      ...prev,
      createBlankPostPerfEntry(postPerfContext.campaign, postPerfContext.deliverable, prev.length + 1, 0),
    ]);
  };

  const handleUpdateLinkEntry = (localKey: string, patch: Partial<PostPerfEntryForm>) => {
    setPostPerfEntries(prev => prev.map(item => (item.localKey === localKey ? { ...item, ...patch } : item)));
  };

  const handleRemoveLinkEntry = (localKey: string) => {
    const target = postPerfEntries.find(item => item.localKey === localKey);
    if (target?.id) {
      setRemovedPerfIds(prev => [...prev, target.id!]);
    }
    setPostPerfEntries(prev => prev.filter(item => item.localKey !== localKey));
  };

  const handleDeleteSavedPerformance = async (perfId: string) => {
    try {
      omniStore.deletePerformance(perfId);
      refreshData();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
    } catch (err: any) {
      setPostPerfError(err?.message || 'Unable to remove link.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (deleteConfirm.kind === 'campaign') {
        omniStore.deleteCampaign(deleteConfirm.id);
        if (selectedCampaign?.id === deleteConfirm.id) {
          setSelectedCampaign(null);
        }
      } else {
        omniStore.deleteDeliverable(deleteConfirm.id);
      }
      refreshData();
      const syncRes = await googleSheetsService.syncChangesToConnectedSheet('influencer');
      setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSavePostPerformance = (e: React.FormEvent) => {
    e.preventDefault();
    setPostPerfError(null);
    if (!postPerfContext) return;

    const { campaign, deliverable } = postPerfContext;

    // Validate all URLs before mutating store
    for (let i = 0; i < postPerfEntries.length; i++) {
      const entry = postPerfEntries[i];
      const trimmedUrl = entry.publishedUrl.trim();
      if (!trimmedUrl) {
        setPostPerfError(`Link #${i + 1}: Please enter a posted link URL (or remove the blank link row).`);
        return;
      }
      if (!sanitizeExternalUrl(trimmedUrl)) {
        setPostPerfError(`Link #${i + 1}: Please enter a valid http:// or https:// posted link URL.`);
        return;
      }
    }

    try {
      // Delete any previously saved entries that the user removed in the modal
      for (const delId of removedPerfIds) {
        omniStore.deletePerformance(delId);
      }

      const savedUrls: string[] = [];
      let primaryPostingDate = '';

      for (let i = 0; i < postPerfEntries.length; i++) {
        const entry = postPerfEntries[i];
        const safeUrl = sanitizeExternalUrl(entry.publishedUrl.trim()) || '';
        const postingDate = entry.actualPostingDate || new Date().toISOString().slice(0, 10);
        if (i === 0) primaryPostingDate = postingDate;
        if (safeUrl) savedUrls.push(safeUrl);

        let delayDays = 0;
        if (deliverable?.expectedPostingDate && postingDate) {
          const diffMs = new Date(postingDate).getTime() - new Date(deliverable.expectedPostingDate).getTime();
          delayDays = Math.max(0, Math.round(diffMs / 86400000));
        }

        omniStore.savePerformance(
          {
            id: entry.id,
            deliverableId: deliverable ? deliverable.id : '',
            campaignId: campaign.id,
            campaignName: campaign.name,
            influencerName: campaign.influencerName,
            contentTitle: entry.contentTitle.trim() || (deliverable ? `${deliverable.title} - Link #${i + 1}` : `${campaign.name} - Link #${i + 1}`),
            platform: entry.platform,
            publishedUrl: safeUrl,
            postingDate,
            delayDays,
            viewsDay7: Number(entry.viewsDay7 || 0),
            viewsDay15: Number(entry.viewsDay15 || 0),
            viewsDay30: Number(entry.viewsDay30 || 0),
            likes: Number(entry.likes || 0),
            comments: Number(entry.comments || 0),
            shares: Number(entry.shares || 0),
            saves: Number(entry.saves || 0),
            reach: Number(entry.reach || 0),
            allocatedSpend: Number(entry.allocatedSpend || 0),
            notes: entry.notes,
          },
          { forceNew: !entry.id }
        );
      }

      if (deliverable) {
        omniStore.saveDeliverable({
          ...deliverable,
          status: savedUrls.length > 0 ? 'Posted' : deliverable.status,
          actualPostingDate: primaryPostingDate || deliverable.actualPostingDate,
          publishedUrl: savedUrls[0] || undefined,
        });
      }

      refreshData();
      if (removedPerfIds.length > 0) {
        googleSheetsService.syncChangesToConnectedSheet('influencer').then(syncRes => {
          setDeleteFeedback({ status: syncRes.status, message: syncRes.message });
        });
      }
      setPostPerfContext(null);
      setPostPerfEntries([]);
      setRemovedPerfIds([]);
    } catch (err: any) {
      setPostPerfError(err?.message || 'Unable to save posted links and performance metrics.');
    }
  };

  const handleUpdateCampaignStatus = (camp: CampaignRecord, nextStatus: CampaignStatus) => {
    if (!canEdit) return;
    omniStore.saveCampaign({
      ...camp,
      status: nextStatus,
      completionDate: nextStatus === 'Completed' ? (camp.completionDate || new Date().toISOString().slice(0, 10)) : camp.completionDate,
    });
    refreshData();
  };

  const handleUpdateDeliverableStatus = (del: DeliverableItem, nextStatus: DeliverableItem['status']) => {
    omniStore.saveDeliverable({
      ...del,
      status: nextStatus,
      actualPostingDate: nextStatus === 'Posted' ? (del.actualPostingDate || new Date().toISOString().slice(0, 10)) : del.actualPostingDate,
    });
    refreshData();
    // Automatically prompt user to enter posted link & views when marked Posted
    if (nextStatus === 'Posted' && selectedCampaign && (canEdit || canCreate)) {
      handleOpenPostPerformance(
        { ...del, status: 'Posted', actualPostingDate: del.actualPostingDate || new Date().toISOString().slice(0, 10) },
        selectedCampaign
      );
    }
  };

  const handleExportCSV = () => {
    const rows = filteredCampaigns.map(c => {
      const campDels = deliverables.filter(d => d.campaignId === c.id);
      const postedLinks = campDels.filter(d => Boolean(sanitizeExternalUrl(d.publishedUrl))).length;
      const campPerfs = performances.filter(p => p.campaignId === c.id);
      const totalViews = campPerfs.reduce((s, p) => s + (p.viewsDay30 || p.viewsDay15 || p.viewsDay7 || 0), 0);
      const totalLikes = campPerfs.reduce((s, p) => s + (p.likes || 0), 0);
      const totalComments = campPerfs.reduce((s, p) => s + (p.comments || 0), 0);
      const totalShares = campPerfs.reduce((s, p) => s + (p.shares || 0), 0);
      const totalSaves = campPerfs.reduce((s, p) => s + (p.saves || 0), 0);
      const totalReach = campPerfs.reduce((s, p) => s + (p.reach || 0), 0);
      const engagementRate = computeEngagementRate(totalViews, totalLikes, totalComments, totalShares, totalSaves, totalReach);

      return {
        CampaignID: c.id,
        Name: c.name,
        Influencer: c.influencerName,
        BusinessTypes: (c.businessTypes || []).join('; '),
        Franchises: (c.franchises || []).join('; '),
        Departments: (c.departments || []).join('; '),
        Objective: c.objective,
        Status: c.status,
        AgreedAmount: c.agreedAmount,
        AdvancePaid: c.advancePaid,
        StartDate: c.startDate || '',
        EndDate: c.endDate || '',
        PostedLinks: `${postedLinks}/${campDels.length}`,
        TotalViews: totalViews,
        TotalLikes: totalLikes,
        TotalComments: totalComments,
        TotalShares: totalShares,
        TotalReach: totalReach,
        EngagementRatePct: `${engagementRate}%`,
      };
    });
    exportToCSV('campaigns_master', rows);
  };

  const handlePrintReport = () => {
    const headers = ['ID', 'Campaign Name', 'Influencer', 'Objective', 'Status', 'Agreed Budget (₹)', 'Start Date'];
    const rows = filteredCampaigns.map(c => [
      c.id,
      c.name,
      c.influencerName,
      c.objective,
      c.status,
      c.agreedAmount.toLocaleString(),
      c.startDate || '-'
    ]);
    printReport('Campaigns Master Report', `Total matching campaigns: ${filteredCampaigns.length}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <DeleteFeedbackBanner feedback={deleteFeedback} onDismiss={() => setDeleteFeedback(null)} />
      <AdvancedFilterBar
        filterState={filterState}
        onFilterChange={setFilterState}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        totalMatching={filteredCampaigns.length}
        showCampaignFilters={true}
        onExportCSV={canExport ? handleExportCSV : undefined}
        onPrintReport={canExport ? handlePrintReport : undefined}
      />

      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'Active', 'Planned', 'Completed', 'On Hold', 'Draft'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === status
                  ? 'bg-violet-600 text-white shadow'
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
              setModalError(null);
              setCampaignForm({
                name: '',
                businessTypes: ['Ajit Zone'],
                franchises: [],
                departments: ['Saree'],
                influencerId: influencers[0]?.id || '',
                influencerName: influencers[0]?.name || '',
                department: 'Saree',
                objective: 'Brand Awareness',
                collaborationType: 'Paid',
                visitDate: new Date().toISOString().slice(0, 10),
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
                month: 'November',
                year: '2026',
                agreedAmount: 0,
                budget: 0,
                advancePaid: 0,
                status: 'Planned',
                assignedTeamMember: omniStore.getCurrentUser().name,
              });
              setIsNewCampaignModal(true);
            }}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Campaign
          </button>
        )}
      </div>

      {/* Campaigns Grid / List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {filteredCampaigns.map(camp => {
            const isSelected = selectedCampaign?.id === camp.id;
            const balance = omniStore.getCampaignOutstandingBalance(camp.id);
            const statusColor = 
              camp.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
              camp.status === 'Completed' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
              'bg-amber-500/20 text-amber-300 border-amber-500/40';

            return (
              <div 
                key={camp.id}
                onClick={() => setSelectedCampaign(camp)}
                className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition shadow-sm hover:border-violet-500/60 ${
                  isSelected ? 'border-violet-500 ring-2 ring-violet-500/20 bg-slate-900/90' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-violet-400">{camp.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColor}`}>
                        {camp.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{camp.name}</h3>
                    <p className="text-xs text-violet-300 mt-0.5 font-medium">Creator: {camp.influencerName}</p>
                  </div>
                  <div className="text-right flex items-start gap-2.5">
                    <div>
                      <p className="text-sm font-bold text-white">₹{camp.agreedAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Bal: ₹{balance.balance.toLocaleString()}</p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        title="Delete campaign"
                        onClick={(e) => {
                          e.stopPropagation();
                          const delCount = deliverables.filter(d => d.campaignId === camp.id).length;
                          const perfCount = performances.filter(p => p.campaignId === camp.id).length;
                          const payCount = omniStore.getPayments().filter(p => p.campaignId === camp.id).length;
                          const parts = [
                            delCount > 0 ? `${delCount} Deliverable(s)` : '',
                            perfCount > 0 ? `${perfCount} Performance link(s)` : '',
                            payCount > 0 ? `${payCount} Payment(s)` : '',
                          ].filter(Boolean);
                          setDeleteError(null);
                          setDeleteConfirm({
                            kind: 'campaign',
                            id: camp.id,
                            name: `${camp.name} (${camp.id})`,
                            description: parts.length > 0 ? `This will also remove linked ${parts.join(', ')} from software and Google Sheets.` : undefined,
                          });
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{camp.objective}</span>
                    <span className="text-[11px]">Assigned: <strong className="text-slate-200">{camp.assignedTeamMember || camp.coordinator}</strong></span>
                    {(() => {
                      const campDels = deliverables.filter(d => d.campaignId === camp.id);
                      const campPerfs = performances.filter(p => p.campaignId === camp.id);
                      const perfLinksCount = campPerfs.filter(p => Boolean(sanitizeExternalUrl(p.publishedUrl))).length;
                      const delOnlyLinksCount = campDels.filter(
                        d => Boolean(sanitizeExternalUrl(d.publishedUrl)) && !campPerfs.some(p => p.deliverableId === d.id)
                      ).length;
                      const totalPostedLinks = perfLinksCount + delOnlyLinksCount;
                      const totalViews = campPerfs.reduce((sum, p) => sum + (p.viewsDay30 || p.viewsDay15 || p.viewsDay7 || 0), 0);
                      return (
                        <>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            totalPostedLinks > 0
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            Links: {totalPostedLinks}
                          </span>
                          {totalViews > 0 && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                              {totalViews.toLocaleString()} views
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{camp.startDate || camp.visitDate} → {camp.endDate || 'Ongoing'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Campaign Details & Deliverables (1 col) */}
        <div className="space-y-4">
          {selectedCampaign ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg sticky top-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono text-violet-400 font-bold">{selectedCampaign.id}</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedCampaign.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {canDelete && (
                    <button
                      type="button"
                      title="Delete this campaign"
                      onClick={() => {
                        const delCount = deliverables.filter(d => d.campaignId === selectedCampaign.id).length;
                        const perfCount = performances.filter(p => p.campaignId === selectedCampaign.id).length;
                        const payCount = omniStore.getPayments().filter(p => p.campaignId === selectedCampaign.id).length;
                        const parts = [
                          delCount > 0 ? `${delCount} Deliverable(s)` : '',
                          perfCount > 0 ? `${perfCount} Performance link(s)` : '',
                          payCount > 0 ? `${payCount} Payment(s)` : '',
                        ].filter(Boolean);
                        setDeleteError(null);
                        setDeleteConfirm({
                          kind: 'campaign',
                          id: selectedCampaign.id,
                          name: `${selectedCampaign.name} (${selectedCampaign.id})`,
                          description: parts.length > 0 ? `This will also remove linked ${parts.join(', ')} from software and Google Sheets.` : undefined,
                        });
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setSelectedCampaign(null)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Campaign Status:</span>
                  <select
                    disabled={!canEdit}
                    value={selectedCampaign.status}
                    onChange={(e) => handleUpdateCampaignStatus(selectedCampaign, e.target.value as CampaignStatus)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    {['Draft', 'Planned', 'Active', 'On Hold', 'Completed', 'Cancelled'].map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Creator:</span>
                  <span className="font-semibold text-white">{selectedCampaign.influencerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Business / Franchise:</span>
                  <span className="text-slate-200 text-right">{[...(selectedCampaign.businessTypes || []), ...(selectedCampaign.franchises || [])].join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Departments:</span>
                  <span className="text-slate-200 text-right">{(selectedCampaign.departments || []).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agreed Budget:</span>
                  <span className="font-bold text-emerald-400">₹{selectedCampaign.agreedAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Campaign Post-Publish & Performance Rollup */}
              {(() => {
                const campDels = deliverables.filter(d => d.campaignId === selectedCampaign.id);
                const campPerfs = performances.filter(p => p.campaignId === selectedCampaign.id);
                const perfLinks = campPerfs.filter(p => Boolean(sanitizeExternalUrl(p.publishedUrl))).length;
                const delOnlyLinks = campDels.filter(
                  d => Boolean(sanitizeExternalUrl(d.publishedUrl)) && !campPerfs.some(p => p.deliverableId === d.id)
                ).length;
                const totalPostedLinks = perfLinks + delOnlyLinks;
                const totalViews = campPerfs.reduce((sum, p) => sum + (p.viewsDay30 || p.viewsDay15 || p.viewsDay7 || 0), 0);
                const totalLikes = campPerfs.reduce((sum, p) => sum + (p.likes || 0), 0);
                const totalComments = campPerfs.reduce((sum, p) => sum + (p.comments || 0), 0);
                const totalShares = campPerfs.reduce((sum, p) => sum + (p.shares || 0), 0);
                const totalSaves = campPerfs.reduce((sum, p) => sum + (p.saves || 0), 0);
                const totalReach = campPerfs.reduce((sum, p) => sum + (p.reach || 0), 0);
                const avgEngagement = computeEngagementRate(totalViews, totalLikes, totalComments, totalShares, totalSaves, totalReach);

                return (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" /> Post-Publish Performance
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {totalPostedLinks} link{totalPostedLinks === 1 ? '' : 's'} • {campPerfs.length} tracked
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Views</p>
                        <p className="text-xs font-bold text-white">{totalViews.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Likes</p>
                        <p className="text-xs font-bold text-pink-300">{totalLikes.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Comments</p>
                        <p className="text-xs font-bold text-sky-300">{totalComments.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Shares</p>
                        <p className="text-xs font-bold text-violet-300">{totalShares.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Reach</p>
                        <p className="text-xs font-bold text-slate-200">{totalReach.toLocaleString()}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[9px] text-slate-400 uppercase">Engagement</p>
                        <p className="text-xs font-bold text-emerald-300">{avgEngagement.toFixed(2)}%</p>
                      </div>
                    </div>
                    {selectedCampaign.status === 'Completed' && (
                      <p className="text-[10px] text-emerald-300/90 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Campaign Completed — add or edit unlimited posted links &amp; metrics anytime.
                      </p>
                    )}
                    {(canCreate || canEdit) && (
                      <button
                        type="button"
                        onClick={() => handleOpenPostPerformance(null, selectedCampaign, true)}
                        className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Posted Link &amp; Performance
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-violet-300 uppercase tracking-wider">Reels / Videos, Links &amp; Metrics</h4>
                  {(canCreate || canEdit) && (
                    <button
                      onClick={() => {
                        setDeliverableError(null);
                        setDeliverableForm({
                          title: '',
                          type: 'Instagram Reel',
                          isRequired: true,
                          status: 'Pending',
                          expectedPostingDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
                          publishedUrl: '',
                        });
                        setIsDeliverableModal(true);
                      }}
                      className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold rounded shrink-0"
                    >
                      + Add Reel / Video
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[30rem] overflow-y-auto pr-1">
                  {deliverables.filter((d: DeliverableItem) => d.campaignId === selectedCampaign.id).map((del: DeliverableItem) => {
                    const delPerfs = performances.filter(p => p.deliverableId === del.id);
                    const legacyUrl = delPerfs.length === 0 ? sanitizeExternalUrl(del.publishedUrl) : null;

                    return (
                      <div key={del.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200 line-clamp-1">{del.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              disabled={!canEdit}
                              value={del.status}
                              onChange={(e: any) => handleUpdateDeliverableStatus(del, e.target.value)}
                              className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] text-white disabled:opacity-60"
                            >
                              {['Pending', 'Shot Completed', 'Draft Submitted', 'Revision Requested', 'Approved', 'Posted'].map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                            {(canDelete || canEdit) && (
                              <button
                                type="button"
                                title="Delete Reel / Deliverable"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleteConfirm({
                                    kind: 'deliverable',
                                    id: del.id,
                                    name: del.title,
                                    description: delPerfs.length > 0 ? `Also removes ${delPerfs.length} linked performance record(s).` : undefined,
                                  });
                                }}
                                className="p-1 rounded bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>{del.type}</span>
                          <span>
                            {del.actualPostingDate ? `Posted: ${del.actualPostingDate}` : `Due: ${del.expectedPostingDate}`}
                          </span>
                        </div>

                        {/* All Posted Links & Separate Performance Metrics for this Deliverable */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          {delPerfs.length > 0 ? (
                            <div className="space-y-2">
                              {delPerfs.map((perf, idx) => {
                                const safeUrl = sanitizeExternalUrl(perf.publishedUrl);
                                const latestViews = perf.viewsDay30 || perf.viewsDay15 || perf.viewsDay7 || 0;
                                const engagementPct = computeEngagementRate(
                                  latestViews,
                                  perf.likes,
                                  perf.comments,
                                  perf.shares,
                                  perf.saves,
                                  perf.reach
                                );
                                return (
                                  <div key={perf.id} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-semibold text-slate-200 truncate">
                                        #{idx + 1} {perf.contentTitle || del.title}
                                      </span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                                        {perf.platform}
                                      </span>
                                    </div>
                                    {safeUrl && (
                                      <a
                                        href={safeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-teal-400 hover:underline flex items-center gap-1 font-medium truncate"
                                      >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{safeUrl}</span>
                                      </a>
                                    )}
                                    <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1">
                                      <div className="flex items-center gap-1 text-emerald-300 font-semibold" title="Views">
                                        <Eye className="w-3 h-3 shrink-0" />
                                        <span>{latestViews.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-pink-300" title="Likes">
                                        <Heart className="w-3 h-3 shrink-0" />
                                        <span>{perf.likes.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-sky-300" title="Comments">
                                        <MessageCircle className="w-3 h-3 shrink-0" />
                                        <span>{perf.comments.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-violet-300" title="Shares">
                                        <Share2 className="w-3 h-3 shrink-0" />
                                        <span>{perf.shares.toLocaleString()}</span>
                                      </div>
                                      <div className="text-slate-300 truncate" title="Reach">
                                        Reach: <span className="font-semibold text-white">{perf.reach.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Engagement Rate">
                                        <TrendingUp className="w-3 h-3 shrink-0" />
                                        <span>{engagementPct.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : legacyUrl ? (
                            <a
                              href={legacyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-teal-400 hover:underline flex items-center gap-1 font-medium truncate"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{legacyUrl}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-amber-400/90 flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> No posted link entered yet
                            </span>
                          )}

                          {(canEdit || canCreate) && (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenPostPerformance(del, selectedCampaign, false)}
                                className="py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition flex items-center justify-center gap-1"
                              >
                                <BarChart3 className="w-3 h-3" />
                                {delPerfs.length > 0 ? `Edit Links (${delPerfs.length})` : 'Add Link & Stats'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenPostPerformance(del, selectedCampaign, true)}
                                className="py-1.5 px-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-[11px] font-semibold transition flex items-center justify-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Add Another Link
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Additional Campaign-Level Posted Links (not bound to a specific deliverable) */}
                  {(() => {
                    const directCampaignPerfs = performances.filter(
                      p => p.campaignId === selectedCampaign.id && !p.deliverableId
                    );
                    if (directCampaignPerfs.length === 0) return null;

                    return (
                      <div className="p-3 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-emerald-300 text-[11px] uppercase tracking-wider">
                            Additional Campaign Links ({directCampaignPerfs.length})
                          </span>
                          {(canCreate || canEdit) && (
                            <button
                              type="button"
                              onClick={() => handleOpenPostPerformance(null, selectedCampaign, false)}
                              className="text-[10px] text-emerald-300 hover:text-emerald-200 font-semibold underline"
                            >
                              Edit All
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {directCampaignPerfs.map((perf, idx) => {
                            const safeUrl = sanitizeExternalUrl(perf.publishedUrl);
                            const latestViews = perf.viewsDay30 || perf.viewsDay15 || perf.viewsDay7 || 0;
                            const engagementPct = computeEngagementRate(
                              latestViews,
                              perf.likes,
                              perf.comments,
                              perf.shares,
                              perf.saves,
                              perf.reach
                            );
                            return (
                              <div key={perf.id} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-semibold text-slate-200 truncate">
                                    #{idx + 1} {perf.contentTitle || `Posted Link #${idx + 1}`}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                      {perf.platform}
                                    </span>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSavedPerformance(perf.id)}
                                        className="text-slate-500 hover:text-rose-400"
                                        title="Remove link"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {safeUrl && (
                                  <a
                                    href={safeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-teal-400 hover:underline flex items-center gap-1 font-medium truncate"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{safeUrl}</span>
                                  </a>
                                )}
                                <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1">
                                  <div className="flex items-center gap-1 text-emerald-300 font-semibold" title="Views">
                                    <Eye className="w-3 h-3 shrink-0" />
                                    <span>{latestViews.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-pink-300" title="Likes">
                                    <Heart className="w-3 h-3 shrink-0" />
                                    <span>{perf.likes.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-sky-300" title="Comments">
                                    <MessageCircle className="w-3 h-3 shrink-0" />
                                    <span>{perf.comments.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-violet-300" title="Shares">
                                    <Share2 className="w-3 h-3 shrink-0" />
                                    <span>{perf.shares.toLocaleString()}</span>
                                  </div>
                                  <div className="text-slate-300 truncate" title="Reach">
                                    Reach: <span className="font-semibold text-white">{perf.reach.toLocaleString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Engagement Rate">
                                    <TrendingUp className="w-3 h-3 shrink-0" />
                                    <span>{engagementPct.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              <Briefcase className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>Select a campaign to inspect deliverables, schedules, and financial breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create New Campaign Modal */}
      {isNewCampaignModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">Create New Influencer Campaign</h3>
              <button onClick={() => setIsNewCampaignModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-950/70 border border-rose-600 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCampaign} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={campaignForm.name || ''}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  placeholder="e.g. Winter Festive Saree Launch 2026"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Select Creator / Influencer *</label>
                  <select
                    required
                    value={campaignForm.influencerId}
                    onChange={(e) => setCampaignForm({ ...campaignForm, influencerId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    <option value="">-- Choose Creator --</option>
                    {influencers.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.city})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Campaign Objective *</label>
                  <select
                    value={campaignForm.objective}
                    onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {CAMPAIGN_OBJECTIVES.map(obj => (
                      <option key={obj} value={obj}>{obj}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Franchise & Department linking */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <label className="block font-bold text-violet-300 uppercase tracking-wider">Business & Department Links</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Business Association</label>
                    <select
                      value={campaignForm.businessTypes?.[0] || 'Ajit Zone'}
                      onChange={(e) => setCampaignForm({ ...campaignForm, businessTypes: [e.target.value as any] })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    >
                      <option value="Ajit Zone">Ajit Zone</option>
                      <option value="Franchise">Franchise Network</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Product Department</label>
                    <select
                      value={campaignForm.department}
                      onChange={(e) => setCampaignForm({ ...campaignForm, department: e.target.value, departments: [e.target.value] })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                    >
                      {availableDepts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={campaignForm.startDate || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={campaignForm.endDate || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Month</label>
                  <select
                    value={campaignForm.month || 'November'}
                    onChange={(e) => setCampaignForm({ ...campaignForm, month: e.target.value })}
                    className="w-full px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Agreed Budget (₹)</label>
                  <input
                    type="number"
                    value={campaignForm.agreedAmount || 0}
                    onChange={(e) => setCampaignForm({ ...campaignForm, agreedAmount: Number(e.target.value), budget: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assigned Team Member</label>
                  <input
                    type="text"
                    value={campaignForm.assignedTeamMember || ''}
                    onChange={(e) => setCampaignForm({ ...campaignForm, assignedTeamMember: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-500 shadow"
                >
                  Save & Seed Deliverables
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Reel / Video Deliverable Modal */}
      {isDeliverableModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base">Add Reel / Video Deliverable</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Each Reel/video gets its own posted link and separate performance tracking.
                </p>
              </div>
              <button onClick={() => setIsDeliverableModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {deliverableError && (
              <div className="mt-4 p-3 bg-rose-950/70 border border-rose-600 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deliverableError}</span>
              </div>
            )}

            <form onSubmit={(e) => handleSaveDeliverable(e, false)} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reel / Video Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Festive Saree Lookbook Reel #2"
                  value={deliverableForm.title || ''}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Content Type</label>
                  <select
                    value={deliverableForm.type}
                    onChange={(e: any) => setDeliverableForm({ ...deliverableForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {['Instagram Reel', 'YouTube Long-form', 'YouTube Short', 'Static Post', 'Story Set', 'Live Appearance'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Expected Posting Date</label>
                  <input
                    type="date"
                    value={deliverableForm.expectedPostingDate || ''}
                    onChange={(e) => setDeliverableForm({ ...deliverableForm, expectedPostingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Posted Link (Optional — if already live)</label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/reel/... or https://youtu.be/..."
                  value={deliverableForm.publishedUrl || ''}
                  onChange={(e) => setDeliverableForm({ ...deliverableForm, publishedUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  If a live link is entered, the performance tracker will open automatically so you can log Views, Likes, Comments, Shares &amp; Reach.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeliverableModal(false)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-500 shadow"
                >
                  Save Reel / Video
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlimited Posted Links & Performance Tracking Modal */}
      {postPerfContext && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Posted Links &amp; Performance Tracking</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    {postPerfEntries.length} Link{postPerfEntries.length === 1 ? '' : 's'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {postPerfContext.campaign.name}
                  {postPerfContext.deliverable ? ` • ${postPerfContext.deliverable.title}` : ' • Direct Campaign Links'} — add as many Reel/video links as you want with separate metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPostPerfContext(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {postPerfError && (
              <div className="mx-6 mt-4 p-3 bg-rose-950/70 border border-rose-600 rounded-xl text-xs text-rose-200 flex items-center gap-2 shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{postPerfError}</span>
              </div>
            )}

            <form onSubmit={handleSavePostPerformance} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
                {postPerfEntries.map((entry, idx) => {
                  const effectiveViews = entry.viewsDay30 || entry.viewsDay15 || entry.viewsDay7 || 0;
                  const totalEngagements = (entry.likes || 0) + (entry.comments || 0) + (entry.shares || 0) + (entry.saves || 0);
                  const engRate = computeEngagementRate(
                    effectiveViews,
                    entry.likes,
                    entry.comments,
                    entry.shares,
                    entry.saves,
                    entry.reach
                  );

                  return (
                    <div key={entry.localKey} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3.5">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                        <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                          Posted Link &amp; Performance #{idx + 1}
                        </span>
                        {(postPerfEntries.length > 1 || entry.id) && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLinkEntry(entry.localKey)}
                            className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">Reel / Video Label *</label>
                          <input
                            type="text"
                            required
                            placeholder={`e.g. Reel #${idx + 1} - Lookbook`}
                            value={entry.contentTitle}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { contentTitle: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-300 mb-1">
                            Posted Link (Reel / Video URL) *
                          </label>
                          <input
                            type="url"
                            required
                            placeholder="https://www.instagram.com/reel/... or https://youtu.be/..."
                            value={entry.publishedUrl}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { publishedUrl: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1">Platform</label>
                          <select
                            value={entry.platform}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { platform: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          >
                            <option value="Instagram">Instagram</option>
                            <option value="YouTube">YouTube</option>
                            <option value="Facebook">Facebook</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Twitter / X">Twitter / X</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Actual Posting Date *</label>
                          <input
                            type="date"
                            required
                            value={entry.actualPostingDate}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { actualPostingDate: e.target.value })}
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Day 7 Views</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.viewsDay7}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { viewsDay7: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Day 15 Views</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.viewsDay15}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { viewsDay15: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Day 30 Views</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.viewsDay30}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { viewsDay30: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Likes</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.likes}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { likes: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Comments</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.comments}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { comments: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Shares</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.shares}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { shares: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Saves</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.saves}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { saves: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Reach</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.reach}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { reach: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Allocated Spend (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={entry.allocatedSpend}
                            onChange={(e) => handleUpdateLinkEntry(entry.localKey, { allocatedSpend: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                          />
                        </div>
                      </div>

                      {/* Live Computed Engagement Summary for this link */}
                      <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase">Active Views</p>
                          <p className="text-xs font-bold text-white">{effectiveViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase">Engagements</p>
                          <p className="text-xs font-bold text-emerald-300">{totalEngagements.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase">Engagement Rate</p>
                          <p className="text-xs font-bold text-emerald-400">{engRate.toFixed(2)}%</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Notes</label>
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) => handleUpdateLinkEntry(entry.localKey, { notes: e.target.value })}
                          placeholder="Optional remarks for this specific Reel/video..."
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Add Unlimited Link & Performance Entries Button */}
                <button
                  type="button"
                  onClick={handleAddAnotherLinkEntry}
                  className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-violet-500/40 hover:border-violet-400 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 font-semibold text-xs transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  + Add Another Posted Link &amp; Performance
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={handleAddAnotherLinkEntry}
                  className="px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-200 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Link ({postPerfEntries.length + 1})
                </button>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPostPerfContext(null)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 shadow"
                  >
                    Save All ({postPerfEntries.length}) Link{postPerfEntries.length === 1 ? '' : 's'} &amp; Performance
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.kind === 'campaign' ? 'Delete Campaign' : 'Delete Reel / Deliverable'}
        itemName={deleteConfirm?.name || ''}
        description={deleteConfirm?.description}
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
