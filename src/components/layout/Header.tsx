import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Bell,
  Layers,
  Database,
  UserCheck,
  LogOut,
  ChevronDown,
  Eye,
  RotateCcw,
  KeyRound,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SystemType, UserProfile } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSignIn, logoutGoogle, getAccessToken, initAuth } from '../../services/googleAuth';
import { User } from 'firebase/auth';

interface HeaderProps {
  currentSystem: SystemType;
  onSystemChange: (sys: SystemType) => void;
  onOpenSyncModal: () => void;
  onOpenAuditModal: () => void;
  onOpenQuarantineModal: () => void;
  onOpenNotifications: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser: UserProfile;
  authenticatedUser: UserProfile | null;
  onUserChange: (user: UserProfile) => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSystem,
  onSystemChange,
  onOpenSyncModal,
  onOpenNotifications,
  searchQuery,
  onSearchChange,
  currentUser,
  authenticatedUser,
  onUserChange,
  onSignOut,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);
  const [syncConfig, setSyncConfig] = useState(omniStore.getSyncConfig());
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const canAccessInfluencer = omniStore.hasDepartmentAccess(currentUser, 'influencer');
  const canAccessDigital = omniStore.hasDepartmentAccess(currentUser, 'digital');
  const canAccessSync = omniStore.hasGovernanceAccess(currentUser, 'sync');
  const isAuthenticatedSuperAdmin = authenticatedUser?.role === 'Super Admin';
  const isPreviewing = Boolean(authenticatedUser && authenticatedUser.id !== currentUser.id);
  const [usersList, setUsersList] = useState<UserProfile[]>(() =>
    isAuthenticatedSuperAdmin ? omniStore.getUsers() : []
  );

  // Self-service Change Own Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [currentPwd, setCurrentPwd] = useState<string>('');
  const [newPwd, setNewPwd] = useState<string>('');
  const [confirmPwd, setConfirmPwd] = useState<string>('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState<boolean>(false);

  const openPasswordModal = () => {
    setShowRoleMenu(false);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError(null);
    setPwdSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handleChangeOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPwd.trim().length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPwd(true);
    try {
      await omniStore.changeOwnPassword(currentPwd, newPwd);
      setPwdSuccess('Your account password has been updated.');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPwdSuccess(null);
      }, 1200);
    } catch (err: any) {
      setPwdError(err?.message || 'Could not update password.');
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasGoogleToken(Boolean(token));
      },
      () => {
        setGoogleUser(null);
        setHasGoogleToken(false);
      }
    );

    getAccessToken().then(tok => setHasGoogleToken(Boolean(tok)));

    const updateStats = () => {
      setSyncConfig(omniStore.getSyncConfig());
      const activeUser = omniStore.getCurrentUser();
      const visibleUnread = omniStore.getNotifications().filter(n => {
        if (n.isRead) return false;
        if (n.system === 'influencer') return omniStore.hasDepartmentAccess(activeUser, 'influencer');
        if (n.system === 'digital') return omniStore.hasDepartmentAccess(activeUser, 'digital');
        return activeUser.role === 'Super Admin' || (activeUser.governanceTabs && activeUser.governanceTabs.length > 0);
      }).length;
      setUnreadCount(visibleUnread);
      if (isAuthenticatedSuperAdmin) {
        setUsersList(omniStore.getUsers());
      } else {
        setUsersList([]);
      }
    };
    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => {
      clearInterval(interval);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser.id, isAuthenticatedSuperAdmin]);

  const handleReconnectGoogleSheets = async () => {
    try {
      setIsSigningIn(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setHasGoogleToken(true);
      }
    } catch (err) {
      console.error('Google Sheets authorization failed:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setHasGoogleToken(false);
    onSignOut();
  };

  const handlePreviewUser = (u: UserProfile) => {
    if (!isAuthenticatedSuperAdmin) return;
    omniStore.setCurrentUser(u);
    onUserChange(omniStore.getCurrentUser());
    setShowRoleMenu(false);
  };

  const handleExitPreview = () => {
    omniStore.exitPreviewMode();
    onUserChange(omniStore.getCurrentUser());
    setShowRoleMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand & Approved Department Switcher */}
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-900/30 font-bold text-lg tracking-wider">
              Ω
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">OmniFlow</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {canAccessInfluencer && canAccessDigital ? 'Dual-Engine' : canAccessInfluencer ? 'Influencer OS' : 'Digital Studio'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {canAccessInfluencer && canAccessDigital
                  ? 'Influencer & Digital Media OS'
                  : canAccessInfluencer
                  ? 'Influencer Campaign Management'
                  : canAccessDigital
                  ? 'Digital Data Management'
                  : 'Authorized Workspace'}
              </p>
            </div>
          </div>

          {/* System Toggle Tabs — ONLY renders departments explicitly approved for this user */}
          {(canAccessInfluencer || canAccessDigital) && (
            <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
              {canAccessInfluencer && (
                <button
                  onClick={() => onSystemChange('influencer')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    currentSystem === 'influencer'
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                  Influencer Campaigns
                </button>
              )}
              {canAccessDigital && (
                <button
                  onClick={() => onSystemChange('digital')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    currentSystem === 'digital'
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-teal-300" />
                  Digital Data Management
                </button>
              )}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md hidden xl:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                currentSystem === 'influencer'
                  ? 'Search influencers, campaigns, deliverables, payments...'
                  : 'Search topics, anchors, editors, channels, shoots...'
              }
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Action Controls & Sync Status */}
        <div className="flex items-center gap-2.5">
          {/* Google Sheets Sync Indicator Pill — ONLY for users with approved 'sync' governance access */}
          {canAccessSync && (
            <button
              onClick={onOpenSyncModal}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                syncConfig.quarantineCount > 0
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/50'
                  : syncConfig.syncStatus === 'SYNCING'
                  ? 'bg-indigo-950/50 border-indigo-700 text-indigo-300 animate-pulse'
                  : syncConfig.spreadsheetId || syncConfig.digitalWorkbook?.spreadsheetId || hasGoogleToken
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title="Google Sheets Live Synchronization Hub"
            >
              <Database className="w-3.5 h-3.5 text-current" />
              <span className="hidden sm:inline">
                {syncConfig.quarantineCount > 0
                  ? `${syncConfig.quarantineCount} Quarantined`
                  : syncConfig.syncStatus === 'SYNCING'
                  ? 'Syncing Sheets...'
                  : syncConfig.spreadsheetId || syncConfig.digitalWorkbook?.spreadsheetId
                  ? 'Sheets Synced'
                  : 'Google Sheets DB'}
              </span>
              <div className={`w-2 h-2 rounded-full ${
                syncConfig.quarantineCount > 0 ? 'bg-amber-400' :
                syncConfig.spreadsheetId || syncConfig.digitalWorkbook?.spreadsheetId ? 'bg-emerald-400' : 'bg-slate-500'
              }`} />
            </button>
          )}

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Sheets OAuth token reconnect button (only for sync-approved users whose short-lived token expired) */}
          {canAccessSync && !hasGoogleToken && (
            <button
              onClick={handleReconnectGoogleSheets}
              disabled={isSigningIn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-700/50 transition disabled:opacity-50"
              title="Authorize Google Sheets API access for live sync"
            >
              <span className="hidden sm:inline">{isSigningIn ? 'Authorizing...' : 'Authorize Sheets'}</span>
            </button>
          )}

          {/* Signed-in User Account Chip (Super Admin gets Preview Switcher; regular users cannot switch accounts) */}
          <div className="relative flex items-center gap-2">
            {isAuthenticatedSuperAdmin ? (
              <>
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg border transition ${
                    isPreviewing
                      ? 'bg-amber-950/60 border-amber-500/60 hover:bg-amber-900/50'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700/80'
                  }`}
                  title="Preview Access As another approved user account (Super Admin only)"
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-[11px] font-bold text-indigo-200">
                      {(currentUser.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left hidden lg:block pr-1">
                    <p className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                      {isPreviewing && <Eye className="w-3 h-3 text-amber-400" />}
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-indigo-300 font-medium leading-none">{currentUser.role}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Super Admin: Preview Access</p>
                      <p className="text-[11px] text-slate-400">
                        Verify exact department & module restrictions for any configured account.
                      </p>
                    </div>
                    {isPreviewing && (
                      <button
                        onClick={handleExitPreview}
                        className="w-full mb-1.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Exit Preview ({authenticatedUser?.name})
                      </button>
                    )}
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {usersList.filter(u => u.status === 'Active').map(u => (
                        <button
                          key={u.id}
                          onClick={() => handlePreviewUser(u)}
                          className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition ${
                            currentUser.id === u.id ? 'bg-indigo-600/30 border border-indigo-500/50 text-white' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-300 shrink-0">
                            {(u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium truncate">{u.name}</p>
                              {currentUser.id === u.id && <UserCheck className="w-3.5 h-3.5 text-indigo-400" />}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {u.role} • {u.departments.length > 0 ? u.departments.join(', ') : 'No depts'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-800 space-y-1.5">
                      <button
                        onClick={openPasswordModal}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-200 text-xs font-semibold transition"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        {authenticatedUser?.hasPassword ? 'Change My Password' : 'Set My Login Password'}
                      </button>
                      <button
                        onClick={handleGoogleSignOut}
                        className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 text-xs font-semibold transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out ({googleUser?.email || authenticatedUser?.email})
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 p-1.5 pl-2 rounded-lg bg-slate-800/90 border border-slate-700">
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-[11px] font-bold text-indigo-200">
                  {(currentUser.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden lg:block pr-1">
                  <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] text-indigo-300 font-medium leading-none">{currentUser.role}</p>
                </div>
                <button
                  onClick={openPasswordModal}
                  title="Change My Password"
                  className="p-1.5 rounded-md text-slate-400 hover:text-indigo-300 hover:bg-slate-700/60 transition"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleGoogleSignOut}
                  title="Sign Out"
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-700/60 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile system toggle — ONLY shown when user has access to BOTH departments */}
      {canAccessInfluencer && canAccessDigital && (
        <div className="md:hidden px-4 py-2 border-t border-slate-800 flex items-center justify-between bg-slate-950 gap-2">
          <button
            onClick={() => onSystemChange('influencer')}
            className={`flex-1 py-1 text-center text-xs font-semibold rounded-md ${
              currentSystem === 'influencer' ? 'bg-violet-600 text-white' : 'text-slate-400'
            }`}
          >
            Influencer
          </button>
          <button
            onClick={() => onSystemChange('digital')}
            className={`flex-1 py-1 text-center text-xs font-semibold rounded-md ${
              currentSystem === 'digital' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Digital Data
          </button>
        </div>
      )}

      {/* Self-Service Change My Password Modal */}
      {isPasswordModalOpen && authenticatedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {authenticatedUser.hasPassword ? 'Change My Account Password' : 'Set My Account Password'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {authenticatedUser.name} ({authenticatedUser.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {pwdError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangeOwnPasswordSubmit} className="space-y-3">
              {authenticatedUser.hasPassword && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password *</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password * (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPwd}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isUpdatingPwd ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
