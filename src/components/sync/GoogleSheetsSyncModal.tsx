import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Plus,
  Copy,
  Check,
  X,
  Play,
  Share2,
  FolderGit2,
  Pin,
  Link2,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';
import { GoogleSheetsSyncConfig, SystemType } from '../../types';
import { omniStore } from '../../services/storageService';
import { googleSheetsService, INFLUENCER_SHEET_TABS, DIGITAL_SHEET_TABS } from '../../services/googleSheetsService';
import { sanitizeExternalUrl } from '../../utils/securityUtils';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuarantine: () => void;
  defaultSystem?: SystemType;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  onOpenQuarantine,
  defaultSystem = 'influencer'
}) => {
  const currentUser = omniStore.getCurrentUser();
  const isSuperAdmin = currentUser.role === 'Super Admin';
  const canInf = omniStore.hasDepartmentAccess(currentUser, 'influencer');
  const canDig = omniStore.hasDepartmentAccess(currentUser, 'digital');
  const canQuarantine = omniStore.hasGovernanceAccess(currentUser, 'quarantine');

  const initialSys: SystemType =
    defaultSystem === 'digital' && canDig ? 'digital' : canInf ? 'influencer' : 'digital';

  const [syncConfig, setSyncConfig] = useState<GoogleSheetsSyncConfig>(omniStore.getSyncConfig());
  const [activeSystem, setActiveSystem] = useState<SystemType>(initialSys);
  const effectiveSystem: SystemType =
    activeSystem === 'influencer' && !canInf && canDig
      ? 'digital'
      : activeSystem === 'digital' && !canDig && canInf
      ? 'influencer'
      : activeSystem;
  const currentWb = effectiveSystem === 'influencer' ? syncConfig.influencerWorkbook : syncConfig.digitalWorkbook;

  const [sheetInput, setSheetInput] = useState<string>(currentWb.spreadsheetId || '');
  const [isChangingSheet, setIsChangingSheet] = useState<boolean>(false);
  const [showCreateOption, setShowCreateOption] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Keep synced with store whenever modal opens or system switches
  useEffect(() => {
    if (isOpen) {
      const fresh = omniStore.getSyncConfig();
      setSyncConfig(fresh);
      const wb = effectiveSystem === 'influencer' ? fresh.influencerWorkbook : fresh.digitalWorkbook;
      setSheetInput(wb.spreadsheetId || '');
      setIsChangingSheet(false);
      setShowCreateOption(false);
    }
  }, [isOpen, effectiveSystem]);

  if (!isOpen) return null;

  const handleSystemChange = (sys: SystemType) => {
    if (!omniStore.hasDepartmentAccess(currentUser, sys)) return;
    setActiveSystem(sys);
    const fresh = omniStore.getSyncConfig();
    setSyncConfig(fresh);
    const wb = sys === 'influencer' ? fresh.influencerWorkbook : fresh.digitalWorkbook;
    setSheetInput(wb.spreadsheetId || '');
    setIsChangingSheet(false);
    setShowCreateOption(false);
    setStatusMessage(null);
  };

  const handleCopyTeamLink = () => {
    if (currentWb.spreadsheetId) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?sys=${effectiveSystem}&sheetId=${currentWb.spreadsheetId}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetInput.trim()) return;

    try {
      setIsLoading(true);
      setStatusMessage(
        `Connecting and pinning your existing ${effectiveSystem === 'influencer' ? 'Influencer Campaign' : 'Digital Data'} Google Sheet...`
      );
      const result = await googleSheetsService.connectAndPinExistingSpreadsheet(sheetInput, effectiveSystem);
      setSyncConfig(omniStore.getSyncConfig());
      setSheetInput(result.spreadsheetId);
      setIsChangingSheet(false);

      if (result.needsAuth) {
        setStatusMessage(
          `Sheet pinned (${result.spreadsheetId})! Click "Pull from Sheet" or "Push to Sheet" and approve Google access to sync live rows.`
        );
      } else {
        const addedNote = result.addedTabs.length > 0 ? ` Added missing tabs: ${result.addedTabs.join(', ')}.` : '';
        setStatusMessage(
          `Fixed sheet linked: "${result.spreadsheetTitle}".${addedNote} Verified ${result.syncedCount} rows (Quarantined: ${result.quarantinedCount}).`
        );
      }
    } catch (err: any) {
      setSyncConfig(omniStore.getSyncConfig());
      setStatusMessage(`Connection notice: ${err?.message || 'Could not verify sheet.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromPinnedSheet = async () => {
    if (!currentWb.spreadsheetId) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Pulling latest rows from pinned ${effectiveSystem === 'influencer' ? 'Influencer' : 'Digital Data'} sheet...`);
      const result = await googleSheetsService.pullAndReconcileGoogleSheets(currentWb.spreadsheetId, effectiveSystem);
      setSyncConfig(omniStore.getSyncConfig());
      setStatusMessage(
        `Pulled ${result.syncedCount} valid rows from your fixed sheet. Quarantined: ${result.quarantinedCount}.`
      );
    } catch (err: any) {
      setStatusMessage(`Pull notice: ${err?.message || 'Could not read spreadsheet.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!currentWb.spreadsheetId) return;
    try {
      setIsLoading(true);
      setStatusMessage(`Pushing verified ${effectiveSystem} records to your pinned Google Sheet...`);
      await googleSheetsService.pushDatabaseToSheets(currentWb.spreadsheetId, effectiveSystem);
      setSyncConfig(omniStore.getSyncConfig());
      setStatusMessage(`Synchronized with your fixed ${effectiveSystem === 'influencer' ? 'Influencer' : 'Digital Data'} Google Sheet!`);
    } catch (err: any) {
      setStatusMessage(`Push notice: ${err?.message || 'Could not update spreadsheet.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSpreadsheet = async () => {
    try {
      setIsLoading(true);
      const isInf = effectiveSystem === 'influencer';
      setStatusMessage(`Creating new ${isInf ? 'Influencer Campaign' : 'Digital Data'} spreadsheet in Google Drive...`);
      const res = await googleSheetsService.createIntegratedSpreadsheet(effectiveSystem);
      const updated = omniStore.getSyncConfig();
      setSyncConfig(updated);
      setSheetInput(res.id);
      setShowCreateOption(false);
      setIsChangingSheet(false);
      setStatusMessage(`${isInf ? 'Influencer' : 'Digital Data'} Workbook created & pinned! ID: ${res.id}`);
    } catch (err: any) {
      setStatusMessage(`Connection notice: ${err?.message || 'Could not create spreadsheet.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSandboxSheet = () => {
    try {
      const isInf = effectiveSystem === 'influencer';
      const fallback = googleSheetsService.createSimulatedOperationalSpreadsheet(effectiveSystem);
      const updated = omniStore.getSyncConfig();
      setSyncConfig(updated);
      setSheetInput(fallback.id);
      setShowCreateOption(false);
      setIsChangingSheet(false);
      setStatusMessage(`${isInf ? 'Influencer' : 'Digital Data'} Workbook initialized in Sandbox Mode (ID: ${fallback.id}).`);
    } catch (err: any) {
      setStatusMessage(`Sandbox notice: ${err?.message || 'Unauthorized.'}`);
    }
  };

  const handleSimulate = (scenario: 'valid_remote_edit' | 'conflict_app_wins' | 'invalid_quarantine') => {
    try {
      const res = googleSheetsService.simulateDirectSheetEdit(scenario);
      setSyncConfig(omniStore.getSyncConfig());
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Simulation unauthorized.');
    }
  };

  const handleCopyId = () => {
    if (currentWb.spreadsheetId) {
      navigator.clipboard.writeText(currentWb.spreadsheetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const activeTabs = effectiveSystem === 'influencer' ? INFLUENCER_SHEET_TABS : DIGITAL_SHEET_TABS;
  const isPinned = Boolean(currentWb.spreadsheetId);
  const safeSheetUrl = sanitizeExternalUrl(currentWb.spreadsheetUrl);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Two-Workbook Google Sheets Persistence Hub</h3>
              <p className="text-xs text-slate-400">
                Pin one dedicated existing Google Sheet per department. No need to create duplicate sheets in Google Drive.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workbook Switcher Tabs — ONLY shows approved departments */}
        <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
          {canInf && (
            <button
              onClick={() => handleSystemChange('influencer')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                effectiveSystem === 'influencer'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              Workbook 1: Influencer Campaigns (6 Tabs)
            </button>
          )}
          {canDig && (
            <button
              onClick={() => handleSystemChange('digital')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                effectiveSystem === 'digital'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              Workbook 2: Digital Data (6 Tabs)
            </button>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="p-3 bg-slate-950 border border-indigo-700/60 rounded-xl text-xs text-indigo-200">
            {statusMessage}
          </div>
        )}

        {/* CASE A: Fixed Workbook ALREADY Pinned */}
        {isPinned ? (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-700/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs text-white font-bold block">
                    {currentWb.spreadsheetTitle || (effectiveSystem === 'influencer' ? 'Fixed Influencer Campaign Sheet' : 'Fixed Digital Data Sheet')}
                  </span>
                  <span className="text-[11px] text-emerald-300/80">
                    Fixed permanent workbook — all {effectiveSystem} syncs use this sheet
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                Pinned & Active
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
              <span className="font-mono text-slate-300 truncate max-w-xs">{currentWb.spreadsheetId}</span>
              <div className="flex items-center gap-2">
                <button onClick={handleCopyId} className="p-1 rounded text-slate-400 hover:text-white" title="Copy Sheet ID">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCopyTeamLink}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-semibold transition"
                  title="Share link so teammates auto-connect to this exact fixed sheet"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Team Link'}</span>
                </button>
                {safeSheetUrl && (
                  <a
                    href={safeSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <ExternalLink className="w-3 h-3" /> Open Sheet
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                Last Synced: {currentWb.lastSyncTimestamp ? new Date(currentWb.lastSyncTimestamp).toLocaleString() : 'Ready to sync'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePullFromPinnedSheet}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  Pull from Sheet
                </button>
                <button
                  onClick={handlePushToSheets}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Push to Sheet
                </button>
                <button
                  onClick={() => setIsChangingSheet(!isChangingSheet)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white text-[11px] font-medium underline"
                >
                  {isChangingSheet ? 'Cancel Change' : 'Change Sheet'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CASE B: Not Linked Yet — Put Connect Existing Sheet FIRST */
          <form onSubmit={handleConnectExisting} className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-700/50 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-400" />
              <div>
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Connect & Pin Your Existing {effectiveSystem === 'influencer' ? 'Influencer' : 'Digital Data'} Google Sheet
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Paste your existing Google Sheet URL or ID once. The software will pin it permanently and automatically add any missing tabs without erasing your existing data.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste Google Sheet URL or ID (e.g. https://docs.google.com/spreadsheets/d/.../edit)"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
              <button
                type="submit"
                disabled={isLoading || !sheetInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50 whitespace-nowrap"
              >
                {isLoading ? 'Connecting...' : 'Pin & Sync Sheet'}
              </button>
            </div>
          </form>
        )}

        {/* Inline Change Existing Sheet Form (only shown when user clicks "Change Sheet") */}
        {isPinned && isChangingSheet && (
          <form onSubmit={handleConnectExisting} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Replace Pinned Google Sheet for {effectiveSystem === 'influencer' ? 'Influencer Campaigns' : 'Digital Data Management'}:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste new Google Sheet URL or ID"
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              />
              <button
                type="submit"
                disabled={isLoading || !sheetInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Save & Pin'}
              </button>
            </div>
          </form>
        )}

        {/* Secondary Option: Create a Brand-New Sheet (only expanded on demand or when unlinked) */}
        {!isPinned && (
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Don&apos;t have a Google Sheet created yet?
              </span>
              <button
                type="button"
                onClick={() => setShowCreateOption(!showCreateOption)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {showCreateOption ? 'Hide New Sheet Option' : 'Create Brand-New Sheet in Google Drive'}
              </button>
            </div>

            {showCreateOption && (
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Creates a brand-new blank workbook in your Drive with all 6 tabs ({activeTabs.map(t => t.name).join(', ')}).
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCreateNewSpreadsheet}
                    disabled={isLoading}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create New Sheet'}
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={handleCreateSandboxSheet}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition disabled:opacity-50"
                    >
                      Sandbox Mode
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Google Sheets Sync Simulation Engine — Super Admin only */}
        {isSuperAdmin && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" />
                Sync & Conflict Simulation Engine
              </h4>
              <span className="text-[10px] text-slate-500">Super Admin Testing Tool</span>
            </div>
            <p className="text-xs text-slate-400">
              Simulate direct Google Sheets edits, conflicting simultaneous changes, and quarantined negative/unknown rows:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => handleSimulate('valid_remote_edit')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <span className="text-[11px] font-bold text-emerald-400 block mb-0.5">1. Remote Direct Edit</span>
                <p className="text-[10px] text-slate-400">Simulate teammate editing row in Google Sheets.</p>
              </button>

              <button
                onClick={() => handleSimulate('conflict_app_wins')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <span className="text-[11px] font-bold text-indigo-400 block mb-0.5">2. Conflict Resolution</span>
                <p className="text-[10px] text-slate-400">App changes take precedence; conflict logged.</p>
              </button>

              <button
                onClick={() => handleSimulate('invalid_quarantine')}
                className="p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <span className="text-[11px] font-bold text-rose-400 block mb-0.5">3. Corrupt Edit Quarantine</span>
                <p className="text-[10px] text-slate-400">Negative/Unknown row isolated in Quarantine Console.</p>
              </button>
            </div>
          </div>
        )}

        {/* Tabs for Selected System */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Worksheets Partitioned for {effectiveSystem === 'influencer' ? 'Influencer Campaign Management (6)' : 'Digital Data Management (6)'}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
            {activeTabs.map(t => (
              <div key={t.name} className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-slate-300 block truncate">{t.name}</span>
                <span className="text-[10px] text-slate-500">{t.headers.length} columns</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          {canQuarantine ? (
            <button
              onClick={() => {
                onClose();
                onOpenQuarantine();
              }}
              className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Inspect Quarantined Rows Console
            </button>
          ) : <span />}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
