import React, { useMemo } from 'react';
import { 
  Clapperboard, 
  Video, 
  Layers, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Radio, 
  Gauge, 
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { omniStore } from '../../services/storageService';

interface DigitalDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const DigitalDashboard: React.FC<DigitalDashboardProps> = ({ onNavigateTab }) => {
  const currentUser = omniStore.getCurrentUser();
  const canCreate = omniStore.hasPermission(currentUser, 'digital', 'canCreate');
  const canTab = (tab: string) => omniStore.hasTabAccess(currentUser, 'digital', tab);
  const navigateIfAllowed = (tab: string) => {
    if (canTab(tab)) onNavigateTab(tab);
  };

  const content = omniStore.getContentMaster();
  const capacities = omniStore.getEditorCapacities();
  const channelSchedules = omniStore.getChannelSchedules();
  const anchorSchedules = omniStore.getAnchorSchedules();

  const metrics = useMemo(() => {
    const totalTopics = content.length;
    const inEditing = content.filter(c => c.editingStatus === 'Editing in Progress').length;
    const pendingReview = content.filter(c => c.editingStatus === 'Submitted for Review').length;
    const readyForPosting = content.filter(c => c.editingStatus === 'Approved / Ready for Posting').length;
    const rawFootageAwaited = content.filter(c => c.recordingStatus !== 'Raw Footage Received').length;

    // Capacity & targets
    const totalLongTarget = capacities.reduce((sum, c) => sum + c.longVideoTarget, 0);
    const totalLongDone = capacities.reduce((sum, c) => sum + c.longVideoCompleted, 0);
    const totalShortsTarget = capacities.reduce((sum, c) => sum + c.shortsTarget, 0);
    const totalShortsDone = capacities.reduce((sum, c) => sum + c.shortsCompleted, 0);

    const longCompletionPct = totalLongTarget > 0 ? Math.round((totalLongDone / totalLongTarget) * 100) : 0;
    const shortsCompletionPct = totalShortsTarget > 0 ? Math.round((totalShortsDone / totalShortsTarget) * 100) : 0;

    // Anchor reschedules pending
    const reschedulesPending = anchorSchedules.filter(a => a.status === 'Reschedule Requested').length;

    // Channel Scheduled
    const upcomingPosts = channelSchedules.filter(cs => cs.status === 'Scheduled' || cs.status === 'Queued').length;

    return {
      totalTopics,
      inEditing,
      pendingReview,
      readyForPosting,
      rawFootageAwaited,
      longCompletionPct,
      shortsCompletionPct,
      totalLongDone,
      totalLongTarget,
      totalShortsDone,
      totalShortsTarget,
      reschedulesPending,
      upcomingPosts,
    };
  }, [content, capacities, channelSchedules, anchorSchedules]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-emerald-950/60 p-6 rounded-2xl border border-teal-800/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
              System 2 • Digital Studio OS
            </span>
            <span className="text-xs text-slate-400">Single Central Content Master</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Production, Editor & Broadcast Hub</h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Multi-channel linked views, camera-to-editor footage handovers, editor capacity limits, and anchor daily shoot scheduling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canTab('content_master') && canCreate && (
            <button
              onClick={() => onNavigateTab('content_master')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-teal-700/30 transition flex items-center gap-1.5"
            >
              <Video className="w-4 h-4" />
              + Submit Topic
            </button>
          )}
          {canTab('anchor_schedules') && (
            <button
              onClick={() => onNavigateTab('anchor_schedules')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              Anchor Calendar
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Production Funnel */}
        <div 
          onClick={() => navigateIfAllowed('content_master')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('content_master') ? 'hover:border-teal-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Central Content Pipeline</span>
            <Video className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.totalTopics} <span className="text-xs font-normal text-slate-400">active topics</span>
          </div>
          <div className="text-xs text-teal-300 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>In Edit Suite</span>
            <span className="font-semibold text-white">{metrics.inEditing} cuts</span>
          </div>
        </div>

        {/* Pending Reviews */}
        <div 
          onClick={() => navigateIfAllowed('editor_workspace')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('editor_workspace') ? 'hover:border-amber-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Submitted for Review</span>
            <Clapperboard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.pendingReview}
          </div>
          <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-800/80 text-slate-400">
            <span>Approved & Ready</span>
            <span className="font-semibold text-emerald-400">{metrics.readyForPosting} posts</span>
          </div>
        </div>

        {/* Editor Target Fulfillment */}
        <div 
          onClick={() => navigateIfAllowed('editor_capacity')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('editor_capacity') ? 'hover:border-indigo-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Monthly Output Target</span>
            <Gauge className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.longCompletionPct}% <span className="text-xs font-normal text-slate-400">long-form</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-teal-500 to-indigo-500 h-1.5 rounded-full" 
              style={{ width: `${metrics.longCompletionPct}%` }}
            />
          </div>
          <div className="text-xs flex items-center justify-between text-slate-400">
            <span>Shorts fulfillment</span>
            <span className="font-semibold text-teal-400">{metrics.shortsCompletionPct}%</span>
          </div>
        </div>

        {/* Channel Posting & Anchor Reschedules */}
        <div 
          onClick={() => navigateIfAllowed('channel_schedules')}
          className={`bg-slate-900/90 border border-slate-800 p-5 rounded-2xl transition shadow-sm group ${canTab('channel_schedules') ? 'hover:border-rose-600/60 cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Broadcast Queue</span>
            <Radio className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {metrics.upcomingPosts} <span className="text-xs font-normal text-slate-400">queued posts</span>
          </div>
          <div className="text-xs flex items-center justify-between pt-2 border-t border-slate-800/80 text-slate-400">
            <span>Anchor Reschedules</span>
            <span className={metrics.reschedulesPending > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-semibold"}>
              {metrics.reschedulesPending} pending approval
            </span>
          </div>
        </div>
      </div>

      {/* Production Pipeline Funnel Visualization */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-sm text-white mb-4">Central Content Lifecycle Funnel</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: '1. Planned', count: content.filter(c => c.recordingStatus === 'Planned').length, color: 'text-slate-400 bg-slate-800/60' },
            { label: '2. Scheduled', count: content.filter(c => c.recordingStatus === 'Scheduled').length, color: 'text-blue-400 bg-blue-950/40' },
            { label: '3. Recorded', count: content.filter(c => c.recordingStatus === 'Recorded').length, color: 'text-indigo-400 bg-indigo-950/40' },
            { label: '4. Raw Received', count: content.filter(c => c.recordingStatus === 'Raw Footage Received').length, color: 'text-amber-400 bg-amber-950/40' },
            { label: '5. In Editing', count: content.filter(c => c.editingStatus === 'Editing in Progress').length, color: 'text-teal-400 bg-teal-950/40' },
            { label: '6. Reviewing', count: content.filter(c => c.editingStatus === 'Submitted for Review').length, color: 'text-violet-400 bg-violet-950/40' },
            { label: '7. Approved', count: content.filter(c => c.editingStatus === 'Approved / Ready for Posting').length, color: 'text-emerald-400 bg-emerald-950/40' },
          ].map(stage => (
            <div key={stage.label} className={`p-3 rounded-xl border border-slate-800/80 ${stage.color} text-center`}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{stage.label}</p>
              <p className="text-xl font-bold text-white">{stage.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Live Studio Content & Editor Workload Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Master Content */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-400" />
              Active Content Topics
            </h3>
            {canTab('content_master') && (
              <button
                onClick={() => onNavigateTab('content_master')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
              >
                All Topics <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {content.slice(0, 3).map(c => (
              <div key={c.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-teal-400 font-semibold">{c.id}</span>
                    <span className="text-xs font-bold text-white truncate max-w-sm">{c.title}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    c.editingStatus === 'Approved / Ready for Posting' ? 'bg-emerald-500/20 text-emerald-300' :
                    c.editingStatus === 'Submitted for Review' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {c.editingStatus}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span>Anchor: <strong className="text-slate-200">{c.anchor}</strong></span>
                  <span>Editor: <strong className="text-slate-200">{c.assignedEditorName || 'Unassigned'}</strong></span>
                  <span>Shoot Date: {c.recordingDate}</span>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  {c.categories.map(cat => (
                    <span key={cat} className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                      {cat}
                    </span>
                  ))}
                  {c.channels.map(ch => (
                    <span key={ch} className="px-1.5 py-0.2 rounded bg-teal-950/40 border border-teal-800/40 text-[10px] text-teal-300">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Capacity Snapshot */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-400" />
              Editor Capacity Snapshot
            </h3>
            {canTab('editor_capacity') && (
              <button
                onClick={() => onNavigateTab('editor_capacity')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                Capacity Table <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            {capacities.map(cap => {
              const netDays = cap.workingDays - cap.leaveDays;
              const maxPoints = netDays * cap.dailyCapacityPoints;
              const usedPoints = (cap.longVideoCompleted * 6) + (cap.shortsCompleted * 1) + cap.activeAssignedPoints;
              const loadPct = maxPoints > 0 ? Math.min(100, Math.round((usedPoints / maxPoints) * 100)) : 0;

              return (
                <div key={cap.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-xs">{cap.editorName}</h4>
                      <p className="text-[10px] text-slate-400">{netDays} working days ({cap.leaveDays}d leave)</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      loadPct > 85 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {loadPct}% Capacity Load
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full ${loadPct > 85 ? 'bg-rose-500' : 'bg-teal-500'}`} 
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-400 block">Long-form</span>
                      <span className="font-bold text-white">{cap.longVideoCompleted} / {cap.longVideoTarget}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <span className="text-slate-400 block">Shorts/Reels</span>
                      <span className="font-bold text-white">{cap.shortsCompleted} / {cap.shortsTarget}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
