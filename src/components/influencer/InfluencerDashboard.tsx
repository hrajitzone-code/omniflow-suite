import React, { useMemo } from 'react';
import { 
  Users, 
  Briefcase, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  ShieldAlert, 
  ArrowUpRight,
  DollarSign,
  Flame,
  FileCheck,
  Building,
  Star
} from 'lucide-react';
import { omniStore } from '../../services/storageService';

interface InfluencerDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const InfluencerDashboard: React.FC<InfluencerDashboardProps> = ({ onNavigateTab }) => {
  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'influencer', 'canCreate');
  const canTab = (tab: string) => omniStore.hasTabAccess(currentUser, 'influencer', tab);
  const navigateIfAllowed = (tab: string) => {
    if (canTab(tab)) onNavigateTab(tab);
  };

  const influencers = omniStore.getInfluencers();
  const campaigns = omniStore.getCampaigns();
  const deliverables = omniStore.getDeliverables();
  const payments = omniStore.getPayments();
  const followUps = omniStore.getFollowUps();

  // Metrics
  const stats = useMemo(() => {
    const totalInfluencers = influencers.length;
    const activeInfluencers = influencers.filter(i => i.influencerStatus === 'Active' || !i.influencerStatus).length;
    const paymentReady = influencers.filter(i => i.stage === 'Payment-Ready').length;
    const blacklisted = influencers.filter(i => i.isBlacklisted).length;
    
    // Ajit Zone vs Franchise breakdown
    const ajitZoneCount = influencers.filter(i => (i.businessTypes || []).includes('Ajit Zone')).length;
    const franchiseCount = influencers.filter(i => (i.businessTypes || []).includes('Franchise')).length;

    const activeCampaigns = campaigns.filter(c => c.status === 'Active');
    const totalAgreedBudget = campaigns.reduce((sum, c) => sum + (c.agreedAmount || c.budget || 0), 0);
    const totalDisbursed = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPendingApproval = payments
      .filter(p => p.status === 'Pending Approval')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.max(0, totalAgreedBudget - totalDisbursed);

    const requiredDeliverables = deliverables.filter(d => d.isRequired);
    const completedRequired = requiredDeliverables.filter(d => d.status === 'Approved' || d.status === 'Posted');
    const completionRate = requiredDeliverables.length > 0 
      ? Math.round((completedRequired.length / requiredDeliverables.length) * 100)
      : 0;

    const overdueDeliverables = deliverables.filter(d => {
      if (d.status === 'Posted' || d.status === 'Approved') return false;
      return new Date(d.expectedPostingDate) < new Date();
    }).length;

    // Top performers
    const topPerformers = [...influencers].sort((a, b) => (b.internalRating || 0) - (a.internalRating || 0)).slice(0, 5);

    return {
      totalInfluencers,
      activeInfluencers,
      paymentReady,
      blacklisted,
      ajitZoneCount,
      franchiseCount,
      activeCampaignsCount: activeCampaigns.length,
      totalAgreedBudget,
      totalDisbursed,
      totalPendingApproval,
      outstandingBalance,
      completionRate,
      overdueDeliverables,
      topPerformers,
    };
  }, [influencers, campaigns, deliverables, payments, followUps]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/60 p-6 rounded-2xl border border-violet-800/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Ajit Zone & Franchise Network OS
            </span>
            <span className="text-xs text-slate-400">Influencer & Digital Media OS</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Dashboard & Analytics</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time multi-brand classification metrics, collaboration budgets, deliverable tracking, and network performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canTab('campaigns') && canCreate && (
            <button
              onClick={() => onNavigateTab('campaigns')}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-violet-700/30 transition flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              + New Campaign
            </button>
          )}
          {canTab('influencers') && canCreate && (
            <button
              onClick={() => onNavigateTab('influencers')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              + Onboard Creator
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Influencers */}
        <div 
          onClick={() => navigateIfAllowed('influencers')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('influencers') ? 'hover:border-violet-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Total Influencers</span>
            <Users className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats.totalInfluencers} <span className="text-xs font-normal text-emerald-400">({stats.activeInfluencers} Active)</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Ajit Zone: {stats.ajitZoneCount}</span>
            <span className="text-violet-300 font-semibold">Franchise: {stats.franchiseCount}</span>
          </div>
        </div>

        {/* Active Campaigns & Budget */}
        <div 
          onClick={() => navigateIfAllowed('campaigns')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('campaigns') ? 'hover:border-violet-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Active Campaigns</span>
            <Briefcase className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats.activeCampaignsCount} <span className="text-xs font-normal text-slate-400">/ {campaigns.length} total</span>
          </div>
          <div className="text-xs text-violet-300 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Committed Budget</span>
            <span className="font-semibold text-white">₹{stats.totalAgreedBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Total Paid & Pending */}
        <div 
          onClick={() => navigateIfAllowed('payments')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('payments') ? 'hover:border-emerald-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Total Disbursed</span>
            <CreditCard className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mb-1">
            ₹{stats.totalDisbursed.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Pending Approval</span>
            <span className="text-amber-400 font-semibold">₹{stats.totalPendingApproval.toLocaleString()}</span>
          </div>
        </div>

        {/* Deliverable Completion Rate */}
        <div 
          onClick={() => navigateIfAllowed('campaigns')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('campaigns') ? 'hover:border-teal-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Deliverables Completion</span>
            <CheckCircle2 className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {stats.completionRate}%
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full" 
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400">
            <span>Overdue Tasks</span>
            <span className={stats.overdueDeliverables > 0 ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
              {stats.overdueDeliverables} overdue
            </span>
          </div>
        </div>
      </div>

      {/* Analytics & Comparison Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ajit Zone vs Franchise Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Ajit Zone vs Franchise Network Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Distribution of onboarded creators and active campaigns across Ajit Zone headquarters and franchise outlets.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Ajit Zone Direct</span>
                <span className="text-violet-400">{stats.ajitZoneCount} creators</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-violet-600 h-2 rounded-full" 
                  style={{ width: `${Math.round((stats.ajitZoneCount / (stats.totalInfluencers || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-300">Franchise Network</span>
                <span className="text-indigo-400">{stats.franchiseCount} creators</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-2 rounded-full" 
                  style={{ width: `${Math.round((stats.franchiseCount / (stats.totalInfluencers || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Influencers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Top Performing Influencers (Rating & ROI)
          </h3>
          <p className="text-xs text-slate-400">
            Highest-rated creators by internal score and engagement rate.
          </p>

          <div className="space-y-3">
            {stats.topPerformers.map(inf => (
              <div key={inf.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-xs font-bold text-white">{inf.name}</p>
                  <p className="text-[10px] text-slate-400">{inf.city} • {(inf.departments || []).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    {inf.internalRating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
