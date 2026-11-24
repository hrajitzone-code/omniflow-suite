import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  PhoneCall,
  BarChart3,
  Video,
  Clapperboard,
  Calendar,
  Gauge,
  Radio,
  History,
  ShieldAlert,
  FileSpreadsheet
} from 'lucide-react';
import { SystemType, UserProfile } from '../../types';
import { omniStore } from '../../services/storageService';

interface SidebarProps {
  currentSystem: SystemType;
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: UserProfile;
  quarantineCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSystem,
  activeTab,
  onTabChange,
  currentUser,
  quarantineCount,
}) => {
  // Navigation for Influencer Campaign Management
  const influencerNav = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'influencers', label: 'Influencer Master', icon: Users, badge: 'Stages' },
    { id: 'campaigns', label: 'Campaigns & Deliverables', icon: Briefcase },
    { id: 'payments', label: 'Payments & Approvals', icon: CreditCard },
    { id: 'followups', label: 'Follow-ups Tracker', icon: PhoneCall },
    { id: 'performance', label: 'Performance Analytics', icon: BarChart3 },
  ].filter(item => omniStore.hasTabAccess(currentUser, 'influencer', item.id));

  // Navigation for Digital Data Management
  const digitalNav = [
    { id: 'digital_dashboard', label: 'Studio Dashboard', icon: LayoutDashboard },
    { id: 'content_master', label: 'Central Content Master', icon: Video, badge: 'Raw Footage' },
    { id: 'editor_workspace', label: 'Editor Workspace', icon: Clapperboard, badge: 'Role-based' },
    { id: 'editor_capacity', label: 'Editor Targets & Capacity', icon: Gauge },
    { id: 'channel_schedules', label: 'Channel Schedules', icon: Radio },
    { id: 'anchor_schedules', label: 'Anchor Schedules', icon: Calendar, badge: 'Shifts' },
  ].filter(item => omniStore.hasTabAccess(currentUser, 'digital', item.id));

  // Shared System Infrastructure (Deny-by-default unless explicitly granted)
  const sharedNav = [
    { id: 'users', label: 'User Admin & RBAC', icon: Users, badge: 'Security' },
    { id: 'sync', label: 'Google Sheets Live Sync', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit & Conflict Trail', icon: History },
    { id: 'quarantine', label: 'Quarantine Console', icon: ShieldAlert, alertBadge: quarantineCount },
  ].filter(item => omniStore.hasGovernanceAccess(currentUser, item.id));

  const currentNav = currentSystem === 'influencer' ? influencerNav : digitalNav;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] text-slate-300">
      <div className="py-4 px-3 overflow-y-auto space-y-6">
        {/* Active System Header */}
        {currentNav.length > 0 && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>{currentSystem === 'influencer' ? 'Campaign OS Modules' : 'Production Studio'}</span>
              <span className={`w-2 h-2 rounded-full ${currentSystem === 'influencer' ? 'bg-violet-500' : 'bg-teal-500'}`} />
            </div>
            <nav className="space-y-1">
              {currentNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? currentSystem === 'influencer'
                          ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                          : 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? currentSystem === 'influencer' ? 'text-violet-400' : 'text-teal-400'
                          : 'text-slate-500'
                      }`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Shared Operations & Sheets Sync — only visible if user has at least one approved governance tab */}
        {sharedNav.length > 0 && (
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Data Governance & Sync
            </div>
            <nav className="space-y-1">
              {sharedNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.alertBadge !== undefined && item.alertBadge > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        {item.alertBadge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Role & Storage Status Bar at Sidebar bottom */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 text-xs">
        <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
          <span className="font-semibold text-slate-300">Active Role</span>
          <span className="font-mono text-[10px] text-indigo-400">{currentUser.role}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Approved Depts</span>
          <span className="text-emerald-400 font-medium capitalize">
            {currentUser.departments.length > 0 ? currentUser.departments.join(', ') : 'None'}
          </span>
        </div>
      </div>
    </aside>
  );
};
