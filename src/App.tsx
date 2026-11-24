import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Lock, LogOut, ShieldAlert, Eye, EyeOff, RotateCcw, Mail, KeyRound } from 'lucide-react';
import { SystemType, UserProfile } from './types';
import { omniStore } from './services/storageService';
import { initAuth, googleSignIn, logoutGoogle } from './services/googleAuth';
import { isValidSpreadsheetId } from './utils/securityUtils';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ModuleExcelBar } from './components/common/ModuleExcelBar';

// Influencer Views
import { InfluencerDashboard } from './components/influencer/InfluencerDashboard';
import { InfluencerMasterView } from './components/influencer/InfluencerMasterView';
import { CampaignsView } from './components/influencer/CampaignsView';
import { PaymentsView } from './components/influencer/PaymentsView';
import { FollowUpsView } from './components/influencer/FollowUpsView';
import { PerformanceView } from './components/influencer/PerformanceView';

// Digital Data Management Views
import { DigitalDashboard } from './components/digital/DigitalDashboard';
import { ContentMasterView } from './components/digital/ContentMasterView';
import { EditorWorkspaceView } from './components/digital/EditorWorkspaceView';
import { EditorCapacityView } from './components/digital/EditorCapacityView';
import { ChannelSchedulesView } from './components/digital/ChannelSchedulesView';
import { AnchorSchedulesView } from './components/digital/AnchorSchedulesView';

// Shared Governance Views & Modals
import { UserAdminView } from './components/admin/UserAdminView';
import { GoogleSheetsSyncModal } from './components/sync/GoogleSheetsSyncModal';
import { QuarantineConsoleView } from './components/sync/QuarantineConsoleView';
import { AuditLogModal } from './components/audit/AuditLogModal';
import { NotificationDrawer } from './components/notifications/NotificationDrawer';

const GOVERNANCE_TABS = new Set(['users', 'sync', 'audit', 'quarantine']);

export default function App() {
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);
  const authMethodRef = useRef<'google' | 'password' | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const [currentSystem, setCurrentSystem] = useState<SystemType>('influencer');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<UserProfile>(omniStore.getCurrentUser());
  const [quarantineCount, setQuarantineCount] = useState<number>(
    omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length
  );

  // Modals & Drawers
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const [excelRefreshTick, setExcelRefreshTick] = useState<number>(0);

  // Ensure active route is strictly allowed for the active user
  const enforceAllowedRoute = useCallback((user: UserProfile, sys: SystemType, tab: string) => {
    const isGov = GOVERNANCE_TABS.has(tab);
    const isAllowed = isGov
      ? omniStore.hasGovernanceAccess(user, tab)
      : omniStore.hasTabAccess(user, sys, tab);

    if (!isAllowed) {
      const fallback = omniStore.getFirstAllowedRoute(user);
      if (fallback) {
        setCurrentSystem(fallback.system);
        setActiveTab(fallback.tab);
      }
    }
  }, []);

  // Listen for Firebase Google Sign-In state and bind identity to an approved UserProfile
  useEffect(() => {
    const unsubscribe = initAuth(
      (fbUser) => {
        setFirebaseUser(fbUser);
        const approved = omniStore.resolveUserByEmail(fbUser.email);
        if (approved) {
          authMethodRef.current = 'google';
          omniStore.setAuthenticatedUser(approved);
          setAuthenticatedUser(approved);
          setCurrentUser(approved);
          const firstRoute = omniStore.getFirstAllowedRoute(approved);
          if (firstRoute) {
            setCurrentSystem(firstRoute.system);
            setActiveTab(firstRoute.tab);
          }
        } else if (authMethodRef.current !== 'password') {
          omniStore.setAuthenticatedUser(null);
          setAuthenticatedUser(null);
        }
        setAuthChecked(true);
      },
      () => {
        setFirebaseUser(null);
        if (authMethodRef.current !== 'password') {
          authMethodRef.current = null;
          omniStore.setAuthenticatedUser(null);
          setAuthenticatedUser(null);
        }
        setAuthChecked(true);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Safely handle shared team sheet query parameters (?sheetId=...&sys=...) ONLY for authorized sync users
  useEffect(() => {
    if (!authenticatedUser) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const sharedSheetId = params.get('sheetId');
      const rawSys = params.get('sys');
      const targetSys: SystemType = rawSys === 'digital' ? 'digital' : 'influencer';

      if (sharedSheetId && isValidSpreadsheetId(sharedSheetId)) {
        const active = omniStore.getCurrentUser();
        if (
          omniStore.hasGovernanceAccess(active, 'sync') &&
          omniStore.hasDepartmentAccess(active, targetSys)
        ) {
          const cfg = omniStore.getSyncConfig();
          const sheetUrl = `https://docs.google.com/spreadsheets/d/${sharedSheetId}/edit`;
          if (targetSys === 'influencer' && sharedSheetId !== cfg.influencerWorkbook.spreadsheetId) {
            omniStore.updateSyncConfig({
              spreadsheetId: sharedSheetId,
              spreadsheetUrl: sheetUrl,
              syncStatus: 'SUCCESS',
              influencerWorkbook: {
                ...cfg.influencerWorkbook,
                spreadsheetId: sharedSheetId,
                spreadsheetUrl: sheetUrl,
                syncStatus: 'SUCCESS',
              },
            });
          } else if (targetSys === 'digital' && sharedSheetId !== cfg.digitalWorkbook.spreadsheetId) {
            omniStore.updateSyncConfig({
              digitalWorkbook: {
                ...cfg.digitalWorkbook,
                spreadsheetId: sharedSheetId,
                spreadsheetUrl: sheetUrl,
                syncStatus: 'SUCCESS',
              },
            });
          }
        }
        // Clean URL query parameters after handling
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('URL param parse failed', e);
    }
  }, [authenticatedUser]);

  // Keep user state, permissions, and route synced in real time
  useEffect(() => {
    if (!authenticatedUser) return;
    const updateStats = () => {
      const latestUser = omniStore.getCurrentUser();
      const latestAuth = omniStore.getAuthenticatedUser();
      setCurrentUser(latestUser);
      if (latestAuth && latestAuth.hasPassword !== authenticatedUser.hasPassword) {
        setAuthenticatedUser(latestAuth);
      }
      setQuarantineCount(
        omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length
      );
      enforceAllowedRoute(latestUser, currentSystem, activeTab);
    };
    updateStats();
    const interval = setInterval(updateStats, 1500);
    return () => clearInterval(interval);
  }, [authenticatedUser, currentSystem, activeTab, enforceAllowedRoute]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !loginPassword) {
      setAuthError('Please enter both your email address and password.');
      return;
    }

    setIsSigningIn(true);
    try {
      const approved = await omniStore.authenticateWithPassword(trimmedEmail, loginPassword);
      if (!approved) {
        setAuthError('Invalid email or password, or your account has not been approved yet.');
        return;
      }

      authMethodRef.current = 'password';
      omniStore.setAuthenticatedUser(approved);
      setAuthenticatedUser(approved);
      setCurrentUser(approved);
      setLoginPassword('');
      const firstRoute = omniStore.getFirstAllowedRoute(approved);
      if (firstRoute) {
        setCurrentSystem(firstRoute.system);
        setActiveTab(firstRoute.tab);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to verify credentials. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignInClick = async () => {
    try {
      setAuthError(null);
      setIsSigningIn(true);
      await googleSignIn();
    } catch (err: any) {
      setAuthError(err?.message || 'Google Sign-In was cancelled or blocked. Please allow popups and try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutClick = async () => {
    authMethodRef.current = null;
    if (firebaseUser) {
      try {
        await logoutGoogle();
      } catch {
        // Ignore Firebase sign-out error on local password session cleanup
      }
    }
    omniStore.setAuthenticatedUser(null);
    setAuthenticatedUser(null);
    setFirebaseUser(null);
    setLoginPassword('');
    setIsSyncModalOpen(false);
    setIsNotificationOpen(false);
  };

  const handleSystemChange = (sys: SystemType) => {
    if (!omniStore.hasDepartmentAccess(currentUser, sys)) return;
    setCurrentSystem(sys);
    const defaultTab = sys === 'influencer' ? 'dashboard' : 'digital_dashboard';
    if (omniStore.hasTabAccess(currentUser, sys, defaultTab)) {
      setActiveTab(defaultTab);
    } else {
      const firstAllowed = omniStore.getFirstAllowedRoute({
        ...currentUser,
        departments: [sys],
      });
      if (firstAllowed && firstAllowed.system === sys) {
        setActiveTab(firstAllowed.tab);
      }
    }
    setSearchQuery('');
  };

  const handleTabChange = (tab: string) => {
    if (GOVERNANCE_TABS.has(tab)) {
      if (!omniStore.hasGovernanceAccess(currentUser, tab)) return;
      setActiveTab(tab);
      return;
    }
    if (!omniStore.hasTabAccess(currentUser, currentSystem, tab)) return;
    setActiveTab(tab);
  };

  const handleNavigateDirect = (sys: SystemType, tab: string) => {
    if (GOVERNANCE_TABS.has(tab)) {
      if (!omniStore.hasGovernanceAccess(currentUser, tab)) return;
      setActiveTab(tab);
      return;
    }
    if (!omniStore.hasTabAccess(currentUser, sys, tab)) return;
    setCurrentSystem(sys);
    setActiveTab(tab);
  };

  const handleUserChange = (nextUser: UserProfile) => {
    setCurrentUser(nextUser);
    enforceAllowedRoute(nextUser, currentSystem, activeTab);
    if (!omniStore.hasGovernanceAccess(nextUser, 'sync')) {
      setIsSyncModalOpen(false);
    }
  };

  // 1. Auth loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-teal-400 flex items-center justify-center text-white font-bold text-xl mx-auto animate-pulse">
            Ω
          </div>
          <p className="text-xs text-slate-400 font-medium">Verifying account session...</p>
        </div>
      </div>
    );
  }

  // 2. Mandatory Sign-In Gate (Deny-by-default until authenticated via Email/Password or Google)
  if (!authenticatedUser && !firebaseUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-teal-400 flex items-center justify-center text-white font-bold text-2xl mx-auto shadow-lg shadow-indigo-900/40">
              Ω
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">OmniFlow Operations Suite</h1>
            <p className="text-xs text-slate-400">
              Sign in privately to your assigned account. You will only see the departments and modules explicitly approved for you.
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/70 rounded-xl text-xs text-rose-300 text-left">
              {authError}
            </div>
          )}

          {/* Email & Password Sign-In Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{isSigningIn ? 'Signing in...' : 'Sign In with Email & Password'}</span>
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              OR
            </span>
            <div className="border-t border-slate-800 w-full" />
          </div>

          <button
            type="button"
            onClick={handleSignInClick}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Access is restricted to active accounts provisioned by your Super Administrator.
          </p>
        </div>
      </div>
    );
  }

  // 3. Authenticated Google user is NOT approved or is Suspended -> Access Denied
  if (!authenticatedUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-8 shadow-2xl space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-white">Access Approval Required</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              The account <span className="font-semibold text-rose-300">{firebaseUser?.email || 'your account'}</span> is not currently approved or has been suspended. Please ask your Super Administrator to activate your account and assign your department permissions.
            </p>
          </div>
          <button
            onClick={handleSignOutClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out & Switch Google Account
          </button>
        </div>
      </div>
    );
  }

  const isPreviewing = authenticatedUser.id !== currentUser.id;
  const isGovTab = GOVERNANCE_TABS.has(activeTab);
  const canRenderCurrentView = isGovTab
    ? omniStore.hasGovernanceAccess(currentUser, activeTab)
    : omniStore.hasTabAccess(currentUser, currentSystem, activeTab);
  const canAccessSync = omniStore.hasGovernanceAccess(currentUser, 'sync');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Super Admin Preview Mode Banner */}
      {isPreviewing && (
        <div className="bg-amber-600/20 border-b border-amber-500/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Preview Mode:</strong> Viewing software exactly as <strong>{currentUser.name}</strong> ({currentUser.role}) — Approved departments:{' '}
              <span className="capitalize font-semibold">{currentUser.departments.join(', ') || 'None'}</span>.
            </span>
          </div>
          <button
            onClick={() => {
              omniStore.exitPreviewMode();
              handleUserChange(omniStore.getCurrentUser());
            }}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Exit Preview
          </button>
        </div>
      )}

      {/* Global Sticky Header */}
      <Header
        currentSystem={currentSystem}
        onSystemChange={handleSystemChange}
        onOpenSyncModal={() => {
          if (canAccessSync) setIsSyncModalOpen(true);
        }}
        onOpenAuditModal={() => handleTabChange('audit')}
        onOpenQuarantineModal={() => handleTabChange('quarantine')}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
        authenticatedUser={authenticatedUser}
        onUserChange={handleUserChange}
        onSignOut={handleSignOutClick}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <Sidebar
          currentSystem={currentSystem}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentUser={currentUser}
          quarantineCount={quarantineCount}
        />

        {/* View Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {!canRenderCurrentView ? (
            <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Access Restricted</h3>
              <p className="text-xs text-slate-400 mb-6">
                Your account ({currentUser.email}) does not have approved access to this module or department. Contact your Super Administrator to update your permissions.
              </p>
              {(() => {
                const fallback = omniStore.getFirstAllowedRoute(currentUser);
                return fallback ? (
                  <button
                    onClick={() => handleNavigateDirect(fallback.system, fallback.tab)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                  >
                    Go to Approved Workspace
                  </button>
                ) : null;
              })()}
            </div>
          ) : (
            <>
              <ModuleExcelBar
                key={`excel-bar-${currentSystem}-${activeTab}`}
                moduleId={activeTab}
                activeSystem={currentSystem}
                currentUser={currentUser}
                onImportComplete={() => setExcelRefreshTick(t => t + 1)}
              />

              <div key={`view-${currentSystem}-${activeTab}-${excelRefreshTick}`}>
                {/* INFLUENCER MANAGEMENT MODULES */}
                {!isGovTab && currentSystem === 'influencer' && (
                  <>
                    {activeTab === 'dashboard' && (
                      <InfluencerDashboard onNavigateTab={handleTabChange} />
                    )}
                    {activeTab === 'influencers' && (
                      <InfluencerMasterView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'campaigns' && (
                      <CampaignsView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'payments' && (
                      <PaymentsView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'followups' && (
                      <FollowUpsView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'performance' && (
                      <PerformanceView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                  </>
                )}

                {/* DIGITAL DATA MANAGEMENT MODULES */}
                {!isGovTab && currentSystem === 'digital' && (
                  <>
                    {activeTab === 'digital_dashboard' && (
                      <DigitalDashboard onNavigateTab={handleTabChange} />
                    )}
                    {activeTab === 'content_master' && (
                      <ContentMasterView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'editor_workspace' && (
                      <EditorWorkspaceView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'editor_capacity' && (
                      <EditorCapacityView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'channel_schedules' && (
                      <ChannelSchedulesView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                    {activeTab === 'anchor_schedules' && (
                      <AnchorSchedulesView userRole={currentUser.role} searchQuery={searchQuery} />
                    )}
                  </>
                )}

                {/* SHARED GOVERNANCE & SYNC VIEWS (Strictly guarded by hasGovernanceAccess) */}
                {activeTab === 'users' && (
                  <UserAdminView currentUserRole={currentUser.role} searchQuery={searchQuery} />
                )}

                {activeTab === 'sync' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                      <h2 className="text-lg font-bold text-white mb-1">Google Sheets Operational Synchronization</h2>
                      <p className="text-xs text-slate-400 mb-4">
                        Google Sheets serves as the database for all operational records. Use the synchronization hub to manage your approved department workbooks.
                      </p>
                      <button
                        onClick={() => setIsSyncModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                      >
                        Open Google Sheets Live Hub
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'audit' && (
                  <AuditLogModal userRole={currentUser.role} searchQuery={searchQuery} />
                )}

                {activeTab === 'quarantine' && (
                  <QuarantineConsoleView userRole={currentUser.role} searchQuery={searchQuery} />
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Google Sheets Connection & Sync Hub Modal — only mounted when authorized */}
      {canAccessSync && (
        <GoogleSheetsSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onOpenQuarantine={() => {
            handleTabChange('quarantine');
            setIsSyncModalOpen(false);
          }}
          defaultSystem={currentSystem}
        />
      )}

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigateTab={handleNavigateDirect}
      />
    </div>
  );
}
