import { 
  InfluencerRecord, 
  CampaignRecord, 
  DeliverableItem, 
  PaymentRecord, 
  CANONICAL_PAYMENT_TYPES,
  PaymentType,
  PaymentStatus,
  FollowUpRecord, 
  PerformanceRecord, 
  ContentMasterRecord, 
  EditorCapacityRecord, 
  EditorProfile,
  AnchorProfile,
  DepartmentPermissions,
  SystemType,
  ChannelScheduleTask, 
  AnchorScheduleRecord, 
  AuditLogEntry, 
  QuarantineRecord, 
  GoogleSheetsSyncConfig, 
  AppNotification, 
  UserProfile,
  UserRole,
  DEFAULT_DEPARTMENTS,
  DEFAULT_FRANCHISES,
  INFLUENCER_MODULES,
  DIGITAL_MODULES,
  GOVERNANCE_MODULES
} from '../types';
import { hashPassword, verifyPassword } from '../utils/securityUtils';

export const ALL_INFLUENCER_TABS: string[] = INFLUENCER_MODULES.map(m => m.id);
export const ALL_DIGITAL_TABS: string[] = DIGITAL_MODULES.map(m => m.id);
export const ALL_GOVERNANCE_TABS: string[] = GOVERNANCE_MODULES.map(m => m.id);

export const DENIED_DEPT_PERMS: DepartmentPermissions = {
  canAccess: false,
  canView: false,
  canCreate: false,
  canEdit: false,
  canApprove: false,
  canDelete: false,
  canExport: false,
  viewSensitiveFields: false,
  allowedTabs: [],
};

export const DEFAULT_GOVERNANCE_TABS: Record<UserRole, string[]> = {
  'Super Admin': [...ALL_GOVERNANCE_TABS],
  'Campaign Manager': [],
  'Finance & Approver': [],
  'Content Coordinator': [],
  'Video Editor': [],
  'Anchor & Presenter': [],
};

export const DEFAULT_PERMISSIONS: Record<UserRole, { influencer: DepartmentPermissions; digital: DepartmentPermissions }> = {
  'Super Admin': {
    influencer: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: true, canDelete: true, canExport: true, viewSensitiveFields: true, allowedTabs: [...ALL_INFLUENCER_TABS] },
    digital: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: true, canDelete: true, canExport: true, viewSensitiveFields: true, allowedTabs: [...ALL_DIGITAL_TABS] },
  },
  'Campaign Manager': {
    influencer: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: true, canDelete: true, canExport: true, viewSensitiveFields: true, allowedTabs: [...ALL_INFLUENCER_TABS] },
    digital: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: false, canDelete: false, canExport: true, viewSensitiveFields: true, allowedTabs: ['digital_dashboard', 'content_master', 'editor_capacity', 'channel_schedules', 'anchor_schedules'] },
  },
  'Finance & Approver': {
    influencer: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: true, canDelete: false, canExport: true, viewSensitiveFields: true, allowedTabs: ['dashboard', 'influencers', 'campaigns', 'payments', 'performance'] },
    digital: { canAccess: true, canView: true, canCreate: false, canEdit: false, canApprove: true, canDelete: false, canExport: true, viewSensitiveFields: true, allowedTabs: ['digital_dashboard'] },
  },
  'Content Coordinator': {
    influencer: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: false, canDelete: false, canExport: false, viewSensitiveFields: false, allowedTabs: ['dashboard', 'influencers', 'campaigns', 'followups'] },
    digital: { canAccess: true, canView: true, canCreate: true, canEdit: true, canApprove: true, canDelete: true, canExport: true, viewSensitiveFields: true, allowedTabs: [...ALL_DIGITAL_TABS] },
  },
  'Video Editor': {
    influencer: { ...DENIED_DEPT_PERMS },
    digital: { canAccess: true, canView: true, canCreate: false, canEdit: true, canApprove: false, canDelete: false, canExport: false, viewSensitiveFields: false, allowedTabs: ['editor_workspace'] },
  },
  'Anchor & Presenter': {
    influencer: { ...DENIED_DEPT_PERMS },
    digital: { canAccess: true, canView: true, canCreate: false, canEdit: true, canApprove: false, canDelete: false, canExport: false, viewSensitiveFields: false, allowedTabs: ['anchor_schedules'] },
  },
};

export const CURRENT_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Sakshi Shukla',
    email: 'sakshishukla1167@gmail.com',
    role: 'Super Admin',
    status: 'Active',
    departments: ['influencer', 'digital'],
    governanceTabs: [...ALL_GOVERNANCE_TABS],
    permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS['Super Admin'])),
    avatar: ''
  },
];

export const INITIAL_EDITOR_PROFILES: EditorProfile[] = [];

export const INITIAL_ANCHOR_PROFILES: AnchorProfile[] = [];

const INITIAL_INFLUENCERS: InfluencerRecord[] = [];

const INITIAL_CAMPAIGNS: CampaignRecord[] = [];

const INITIAL_DELIVERABLES: DeliverableItem[] = [];

const INITIAL_PAYMENTS: PaymentRecord[] = [];

const INITIAL_FOLLOWUPS: FollowUpRecord[] = [];

const INITIAL_PERFORMANCE: PerformanceRecord[] = [];

const INITIAL_CONTENT_MASTER: ContentMasterRecord[] = [];

const INITIAL_EDITOR_CAPACITY: EditorCapacityRecord[] = [];

const INITIAL_CHANNEL_SCHEDULES: ChannelScheduleTask[] = [];

const INITIAL_ANCHOR_SCHEDULES: AnchorScheduleRecord[] = [];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

const INITIAL_QUARANTINE: QuarantineRecord[] = [];

const INITIAL_NOTIFICATIONS: AppNotification[] = [];

const DEFAULT_INFLUENCER_TABS = [
  { name: 'Influencer_Master', rowsCount: 0, lastUpdated: '' },
  { name: 'Campaign_Master', rowsCount: 0, lastUpdated: '' },
  { name: 'Deliverables', rowsCount: 0, lastUpdated: '' },
  { name: 'Payments', rowsCount: 0, lastUpdated: '' },
  { name: 'Follow_Ups', rowsCount: 0, lastUpdated: '' },
  { name: 'Performance_Master', rowsCount: 0, lastUpdated: '' },
];

const DEFAULT_DIGITAL_TABS = [
  { name: 'Content_Master', rowsCount: 0, lastUpdated: '' },
  { name: 'Editor_Capacity', rowsCount: 0, lastUpdated: '' },
  { name: 'Channel_Schedules', rowsCount: 0, lastUpdated: '' },
  { name: 'Anchor_Schedules', rowsCount: 0, lastUpdated: '' },
  { name: 'Editor_Profiles', rowsCount: 0, lastUpdated: '' },
  { name: 'Anchor_Profiles', rowsCount: 0, lastUpdated: '' },
];

const readEnvSheetId = (key: 'VITE_INFLUENCER_SHEET_ID' | 'VITE_DIGITAL_SHEET_ID'): string => {
  try {
    const val = (import.meta as any)?.env?.[key];
    return typeof val === 'string' ? val.trim() : '';
  } catch {
    return '';
  }
};

const ENV_INFLUENCER_SHEET_ID = readEnvSheetId('VITE_INFLUENCER_SHEET_ID');
const ENV_DIGITAL_SHEET_ID = readEnvSheetId('VITE_DIGITAL_SHEET_ID');

export const INITIAL_SYNC_CONFIG: GoogleSheetsSyncConfig = {
  influencerWorkbook: {
    spreadsheetId: ENV_INFLUENCER_SHEET_ID,
    spreadsheetTitle: 'Influencer Campaign Management (Google Sheets)',
    spreadsheetUrl: ENV_INFLUENCER_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${ENV_INFLUENCER_SHEET_ID}/edit` : '',
    lastSyncTimestamp: null,
    syncStatus: 'IDLE',
    conflictCount: 0,
    quarantineCount: 0,
    sheetTabs: DEFAULT_INFLUENCER_TABS
  },
  digitalWorkbook: {
    spreadsheetId: ENV_DIGITAL_SHEET_ID,
    spreadsheetTitle: 'Digital Data Management (Google Sheets)',
    spreadsheetUrl: ENV_DIGITAL_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${ENV_DIGITAL_SHEET_ID}/edit` : '',
    lastSyncTimestamp: null,
    syncStatus: 'IDLE',
    conflictCount: 0,
    quarantineCount: 0,
    sheetTabs: DEFAULT_DIGITAL_TABS
  },
  spreadsheetId: ENV_INFLUENCER_SHEET_ID,
  spreadsheetTitle: 'Influencer Campaign Management (Google Sheets)',
  spreadsheetUrl: ENV_INFLUENCER_SHEET_ID ? `https://docs.google.com/spreadsheets/d/${ENV_INFLUENCER_SHEET_ID}/edit` : '',
  lastSyncTimestamp: null,
  syncStatus: 'IDLE',
  conflictCount: 0,
  quarantineCount: 0,
  autoSyncIntervalSec: 60,
  sheetTabs: [...DEFAULT_INFLUENCER_TABS, ...DEFAULT_DIGITAL_TABS]
};

const DUMMY_RECORD_IDS = {
  influencers: new Set(['INF-101', 'INF-102', 'INF-103', 'INF-104']),
  campaigns: new Set(['CMP-2026-001', 'CMP-2026-002', 'CMP-2026-003']),
  deliverables: new Set(['DEL-001', 'DEL-002', 'DEL-003', 'DEL-004', 'DEL-005']),
  payments: new Set(['PAY-1001', 'PAY-1002', 'PAY-1003']),
  followUps: new Set(['FOL-001', 'FOL-002', 'FOL-003']),
  performances: new Set(['PERF-001', 'PERF-002']),
  contentMaster: new Set(['TOP-2026-001', 'TOP-2026-002', 'TOP-2026-003', 'TOP-2026-004']),
  editorCapacity: new Set(['CAP-001', 'CAP-002']),
  channelSchedules: new Set(['POST-001', 'POST-002', 'POST-003']),
  anchorSchedules: new Set(['ANC-001', 'ANC-002', 'ANC-003']),
  auditLogs: new Set(['AUD-001', 'AUD-002']),
  quarantine: new Set(['QRN-001']),
  notifications: new Set(['NOTIF-001', 'NOTIF-002', 'NOTIF-003', 'NOTIF-004']),
  editorProfiles: new Set(['ED-101', 'ED-102']),
  anchorProfiles: new Set(['ANC-PROF-101', 'ANC-PROF-102']),
  users: new Set(['usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7']),
};

// STORAGE CLASS
class OmniStorage {
  private influencers: InfluencerRecord[];
  private campaigns: CampaignRecord[];
  private deliverables: DeliverableItem[];
  private payments: PaymentRecord[];
  private followUps: FollowUpRecord[];
  private performances: PerformanceRecord[];
  private contentMaster: ContentMasterRecord[];
  private editorCapacity: EditorCapacityRecord[];
  private channelSchedules: ChannelScheduleTask[];
  private anchorSchedules: AnchorScheduleRecord[];
  private auditLogs: AuditLogEntry[];
  private quarantine: QuarantineRecord[];
  private syncConfig: GoogleSheetsSyncConfig;
  private notifications: AppNotification[];
  private currentUser: UserProfile;
  private authenticatedUser: UserProfile | null = null;
  private editorProfiles: EditorProfile[];
  private anchorProfiles: AnchorProfile[];
  private users: UserProfile[];
  private departments: string[];
  private franchises: string[];
  private customFields: any[];

  constructor() {
    this.influencers = this.load('omni_influencers', INITIAL_INFLUENCERS);
    this.campaigns = this.load('omni_campaigns', INITIAL_CAMPAIGNS);
    this.deliverables = this.load('omni_deliverables', INITIAL_DELIVERABLES);
    this.payments = this.load('omni_payments', INITIAL_PAYMENTS);
    this.followUps = this.load('omni_followups', INITIAL_FOLLOWUPS);
    this.performances = this.load('omni_performances', INITIAL_PERFORMANCE);
    this.contentMaster = this.load('omni_content', INITIAL_CONTENT_MASTER);
    this.editorCapacity = this.load('omni_capacity', INITIAL_EDITOR_CAPACITY);
    this.channelSchedules = this.load('omni_channel_sched', INITIAL_CHANNEL_SCHEDULES);
    this.anchorSchedules = this.load('omni_anchor_sched', INITIAL_ANCHOR_SCHEDULES);
    this.auditLogs = this.load('omni_audit', INITIAL_AUDIT_LOGS);
    this.quarantine = this.load('omni_quarantine', INITIAL_QUARANTINE);
    this.editorProfiles = this.load('omni_editor_profiles', INITIAL_EDITOR_PROFILES);
    this.anchorProfiles = this.load('omni_anchor_profiles', INITIAL_ANCHOR_PROFILES);
    this.users = this.load('omni_users', CURRENT_USERS).map(u => this.normalizeUserProfile(u));
    this.departments = this.load('omni_departments', DEFAULT_DEPARTMENTS);
    this.franchises = this.load('omni_franchises', DEFAULT_FRANCHISES);
    this.customFields = this.load('omni_custom_fields', []);

    const loadedSync = this.load('omni_sync_config', INITIAL_SYNC_CONFIG);
    const resolvedInfId = loadedSync?.influencerWorkbook?.spreadsheetId || loadedSync?.spreadsheetId || ENV_INFLUENCER_SHEET_ID;
    const resolvedDigId = loadedSync?.digitalWorkbook?.spreadsheetId || ENV_DIGITAL_SHEET_ID;
    this.syncConfig = {
      ...INITIAL_SYNC_CONFIG,
      ...loadedSync,
      spreadsheetId: resolvedInfId,
      spreadsheetUrl: resolvedInfId ? (loadedSync?.influencerWorkbook?.spreadsheetUrl || loadedSync?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedInfId}/edit`) : '',
      influencerWorkbook: {
        ...INITIAL_SYNC_CONFIG.influencerWorkbook,
        ...(loadedSync?.influencerWorkbook || {}),
        spreadsheetId: resolvedInfId,
        spreadsheetUrl: resolvedInfId ? (loadedSync?.influencerWorkbook?.spreadsheetUrl || loadedSync?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedInfId}/edit`) : '',
      },
      digitalWorkbook: {
        ...INITIAL_SYNC_CONFIG.digitalWorkbook,
        ...(loadedSync?.digitalWorkbook || {}),
        spreadsheetId: resolvedDigId,
        spreadsheetUrl: resolvedDigId ? (loadedSync?.digitalWorkbook?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedDigId}/edit`) : '',
      }
    };
    this.notifications = this.load('omni_notifs', INITIAL_NOTIFICATIONS);
    const loadedCurrentUser = this.load('omni_current_user', CURRENT_USERS[0]);
    const matchedUser = this.users.find(u => u.id === loadedCurrentUser?.id);
    this.currentUser = this.normalizeUserProfile(matchedUser || loadedCurrentUser || CURRENT_USERS[0]);

    this.purgeLegacyDummyDataOnce();
  }

  private normalizeUserProfile(raw: UserProfile): UserProfile {
    const role: UserRole = raw.role || 'Content Coordinator';
    const rolePreset = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['Content Coordinator'];
    const email = (raw.email || '').trim().toLowerCase();

    if (role === 'Super Admin') {
      return {
        ...raw,
        email,
        role: 'Super Admin',
        status: raw.status || 'Active',
        departments: ['influencer', 'digital'],
        governanceTabs: [...ALL_GOVERNANCE_TABS],
        permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS['Super Admin'])),
        passwordHash: raw.passwordHash,
        hasPassword: Boolean(raw.passwordHash),
        passwordUpdatedAt: raw.passwordUpdatedAt,
      };
    }

    const rawDepts: SystemType[] = Array.isArray(raw.departments)
      ? raw.departments.filter((d): d is SystemType => d === 'influencer' || d === 'digital')
      : (role === 'Video Editor' || role === 'Anchor & Presenter' ? ['digital'] : ['influencer', 'digital']);

    const buildDeptPerm = (sys: SystemType): DepartmentPermissions => {
      const allTabs = sys === 'influencer' ? ALL_INFLUENCER_TABS : ALL_DIGITAL_TABS;
      const preset = rolePreset[sys];
      const existing = raw.permissions?.[sys];
      const isEnabled = rawDepts.includes(sys) && (existing ? existing.canAccess !== false : preset.canAccess !== false);

      if (!isEnabled) {
        return { ...DENIED_DEPT_PERMS, allowedTabs: [] };
      }

      const defaultAllowed = (preset.allowedTabs && preset.allowedTabs.length > 0)
        ? [...preset.allowedTabs]
        : [...allTabs];

      const allowedTabs = Array.isArray(existing?.allowedTabs)
        ? existing.allowedTabs.filter(t => allTabs.includes(t))
        : defaultAllowed;

      return {
        canAccess: true,
        canView: existing?.canView !== undefined ? Boolean(existing.canView) : true,
        canCreate: existing?.canCreate !== undefined ? Boolean(existing.canCreate) : preset.canCreate,
        canEdit: existing?.canEdit !== undefined ? Boolean(existing.canEdit) : preset.canEdit,
        canApprove: existing?.canApprove !== undefined ? Boolean(existing.canApprove) : preset.canApprove,
        canDelete: existing?.canDelete !== undefined ? Boolean(existing.canDelete) : preset.canDelete,
        canExport: existing?.canExport !== undefined ? Boolean(existing.canExport) : preset.canExport,
        viewSensitiveFields: existing?.viewSensitiveFields !== undefined ? Boolean(existing.viewSensitiveFields) : preset.viewSensitiveFields,
        allowedTabs,
      };
    };

    const influencerPerms = buildDeptPerm('influencer');
    const digitalPerms = buildDeptPerm('digital');

    const finalDepts: SystemType[] = [];
    if (influencerPerms.canAccess) finalDepts.push('influencer');
    if (digitalPerms.canAccess) finalDepts.push('digital');

    // Non-Super Admin accounts can never be granted 'users' (account roster / RBAC management)
    const govTabs = Array.isArray(raw.governanceTabs)
      ? raw.governanceTabs.filter(t => ALL_GOVERNANCE_TABS.includes(t) && t !== 'users')
      : [...(DEFAULT_GOVERNANCE_TABS[role] || [])].filter(t => t !== 'users');

    return {
      ...raw,
      email,
      role,
      status: raw.status || 'Active',
      departments: finalDepts,
      governanceTabs: govTabs,
      permissions: {
        influencer: influencerPerms,
        digital: digitalPerms,
      },
      passwordHash: raw.passwordHash,
      hasPassword: Boolean(raw.passwordHash),
      passwordUpdatedAt: raw.passwordUpdatedAt,
    };
  }

  private stripSecretFields(user: UserProfile): UserProfile {
    const { passwordHash, ...safeUser } = user;
    return {
      ...safeUser,
      hasPassword: Boolean(passwordHash || user.hasPassword),
    };
  }

  private purgeLegacyDummyDataOnce() {
    if (typeof localStorage === 'undefined') return;
    try {
      if (localStorage.getItem('omni_dummy_purged_v1') === 'true') return;

      this.influencers = this.influencers.filter(r => !DUMMY_RECORD_IDS.influencers.has(r.id));
      this.campaigns = this.campaigns.filter(r => !DUMMY_RECORD_IDS.campaigns.has(r.id));
      this.deliverables = this.deliverables.filter(r => !DUMMY_RECORD_IDS.deliverables.has(r.id));
      this.payments = this.payments.filter(r => !DUMMY_RECORD_IDS.payments.has(r.id));
      this.followUps = this.followUps.filter(r => !DUMMY_RECORD_IDS.followUps.has(r.id));
      this.performances = this.performances.filter(r => !DUMMY_RECORD_IDS.performances.has(r.id));
      this.contentMaster = this.contentMaster.filter(r => !DUMMY_RECORD_IDS.contentMaster.has(r.id));
      this.editorCapacity = this.editorCapacity.filter(r => !DUMMY_RECORD_IDS.editorCapacity.has(r.id));
      this.channelSchedules = this.channelSchedules.filter(r => !DUMMY_RECORD_IDS.channelSchedules.has(r.id));
      this.anchorSchedules = this.anchorSchedules.filter(r => !DUMMY_RECORD_IDS.anchorSchedules.has(r.id));
      this.auditLogs = this.auditLogs.filter(r => !DUMMY_RECORD_IDS.auditLogs.has(r.id));
      this.quarantine = this.quarantine.filter(r => !DUMMY_RECORD_IDS.quarantine.has(r.id));
      this.notifications = this.notifications.filter(r => !DUMMY_RECORD_IDS.notifications.has(r.id));
      this.editorProfiles = this.editorProfiles.filter(r => !DUMMY_RECORD_IDS.editorProfiles.has(r.id));
      this.anchorProfiles = this.anchorProfiles.filter(r => !DUMMY_RECORD_IDS.anchorProfiles.has(r.id));
      this.users = this.users
        .filter(u => !DUMMY_RECORD_IDS.users.has(u.id))
        .map(u => ({
          ...u,
          avatar: u.avatar?.includes('unsplash.com') ? '' : (u.avatar || ''),
        }));
      if (this.users.length === 0) {
        this.users = [...CURRENT_USERS];
      }

      if (DUMMY_RECORD_IDS.users.has(this.currentUser.id)) {
        this.currentUser = this.users[0] || CURRENT_USERS[0];
      } else if (this.currentUser.avatar?.includes('unsplash.com')) {
        this.currentUser = { ...this.currentUser, avatar: '' };
      }

      const pendingQ = this.quarantine.filter(q => q.status === 'PENDING_REVIEW').length;
      this.syncConfig.quarantineCount = pendingQ;
      this.syncConfig.influencerWorkbook.quarantineCount = pendingQ;

      this.save('omni_influencers', this.influencers);
      this.save('omni_campaigns', this.campaigns);
      this.save('omni_deliverables', this.deliverables);
      this.save('omni_payments', this.payments);
      this.save('omni_followups', this.followUps);
      this.save('omni_performances', this.performances);
      this.save('omni_content', this.contentMaster);
      this.save('omni_capacity', this.editorCapacity);
      this.save('omni_channel_sched', this.channelSchedules);
      this.save('omni_anchor_sched', this.anchorSchedules);
      this.save('omni_audit', this.auditLogs);
      this.save('omni_quarantine', this.quarantine);
      this.save('omni_notifs', this.notifications);
      this.save('omni_editor_profiles', this.editorProfiles);
      this.save('omni_anchor_profiles', this.anchorProfiles);
      this.save('omni_users', this.users);
      this.save('omni_current_user', this.currentUser);
      this.save('omni_sync_config', this.syncConfig);

      localStorage.setItem('omni_dummy_purged_v1', 'true');
    } catch {
      // Ignore storage purge errors
    }
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private save(key: string, data: any) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Could not save ${key} to localStorage:`, e);
    }
  }

  // User, Auth Session & Super Admin Preview
  getCurrentUser(): UserProfile {
    const authoritative = this.users.find(u => u.id === this.currentUser?.id);
    return this.stripSecretFields(authoritative || this.currentUser);
  }

  getAuthenticatedUser(): UserProfile | null {
    if (!this.authenticatedUser) return null;
    const authoritative = this.users.find(u => u.id === this.authenticatedUser?.id);
    return this.stripSecretFields(authoritative || this.authenticatedUser);
  }

  setAuthenticatedUser(user: UserProfile | null) {
    if (!user) {
      this.authenticatedUser = null;
      return;
    }
    const authoritative = this.users.find(u => u.id === user.id);
    const normalized = this.normalizeUserProfile(authoritative || user);
    const safe = this.stripSecretFields(normalized);
    this.authenticatedUser = safe;
    this.currentUser = safe;
    this.save('omni_current_user', safe);
  }

  resolveUserByEmail(email?: string | null): UserProfile | null {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const match = this.users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    if (!match || match.status !== 'Active') return null;
    return this.stripSecretFields(this.normalizeUserProfile(match));
  }

  async authenticateWithPassword(email: string, password: string): Promise<UserProfile | null> {
    if (!email || !password) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const match = this.users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    if (!match || match.status !== 'Active' || !match.passwordHash) {
      return null;
    }
    const valid = await verifyPassword(password, match.passwordHash);
    if (!valid) return null;
    return this.stripSecretFields(this.normalizeUserProfile(match));
  }

  isPreviewingAnotherUser(): boolean {
    return Boolean(this.authenticatedUser && this.authenticatedUser.id !== this.currentUser.id);
  }

  exitPreviewMode() {
    if (this.authenticatedUser) {
      this.currentUser = this.getAuthenticatedUser() || this.authenticatedUser;
      this.save('omni_current_user', this.currentUser);
    }
  }

  setCurrentUser(user: UserProfile) {
    if (
      this.authenticatedUser &&
      this.authenticatedUser.role !== 'Super Admin' &&
      user.id !== this.authenticatedUser.id
    ) {
      throw new Error('Unauthorized: Only Super Administrators can access or preview other user accounts.');
    }
    const authoritative = this.users.find(u => u.id === user.id);
    const normalized = this.normalizeUserProfile(authoritative || user);
    const safe = this.stripSecretFields(normalized);
    this.currentUser = safe;
    this.save('omni_current_user', safe);
  }

  private assertPermission(system: SystemType, action: keyof DepartmentPermissions, message?: string) {
    if (!this.hasPermission(this.currentUser, system, action)) {
      throw new Error(message || `Unauthorized: Missing ${system} "${action}" permission.`);
    }
  }

  private assertSuperAdmin(message?: string) {
    if (!this.currentUser || this.currentUser.status !== 'Active' || this.currentUser.role !== 'Super Admin') {
      throw new Error(message || 'Unauthorized: Super Administrator privileges are required.');
    }
  }

  // AUDIT LOGGING
  logAudit(
    system: 'influencer' | 'digital',
    entityType: string,
    entityId: string,
    action: AuditLogEntry['action'],
    changes: { field: string; before: any; after: any }[],
    reason?: string
  ) {
    const entry: AuditLogEntry = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      user: this.currentUser.name,
      userRole: this.currentUser.role,
      system,
      entityType,
      entityId,
      action,
      reason,
      changes,
    };
    this.auditLogs.unshift(entry);
    this.save('omni_audit', this.auditLogs);
    return entry;
  }

  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  // NOTIFICATIONS
  getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  markNotificationAsRead(id: string) {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    this.save('omni_notifs', this.notifications);
  }

  addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) {
    const newNotif: AppNotification = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    this.notifications.unshift(newNotif);
    this.save('omni_notifs', this.notifications);
  }

  // -------------------------
  // INFLUENCER OPERATIONS
  // -------------------------
  getInfluencers(): InfluencerRecord[] {
    return [...this.influencers];
  }

  saveInfluencer(data: Partial<InfluencerRecord>): { record: InfluencerRecord; duplicateWarning?: string } {
    const isNew = !data.id;
    this.assertPermission('influencer', isNew ? 'canCreate' : 'canEdit');

    const id = data.id || `INF-${Math.floor(100 + Math.random() * 900)}`;
    const before = this.influencers.find(i => i.id === id);
    const canViewSensitive = this.hasPermission(this.currentUser, 'influencer', 'viewSensitiveFields');

    const safePan = canViewSensitive ? (data.panNumber ?? before?.panNumber ?? '') : (before?.panNumber ?? '');
    const safeGovIdType = canViewSensitive ? (data.govIdType ?? before?.govIdType ?? 'Aadhaar') : (before?.govIdType ?? 'Aadhaar');
    const safeGovIdNumber = canViewSensitive ? (data.govIdNumber ?? before?.govIdNumber ?? '') : (before?.govIdNumber ?? '');
    const safeBankDetails = canViewSensitive
      ? (data.bankDetails ?? before?.bankDetails ?? { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '' })
      : (before?.bankDetails ?? { accountHolderName: '', bankName: '', accountNumber: '', ifscCode: '' });

    // Duplicate detection check (Phone, Email, PAN, Instagram handle)
    let duplicateWarning: string | undefined;
    const existing = this.influencers.find(i => 
      i.id !== id && (
        (data.phone && i.phone === data.phone) ||
        (data.email && i.email.toLowerCase() === data.email.toLowerCase()) ||
        (safePan && i.panNumber.toUpperCase() === safePan.toUpperCase()) ||
        (data.socialPlatforms?.instagram?.handle && i.socialPlatforms?.instagram?.handle.toLowerCase() === data.socialPlatforms.instagram.handle.toLowerCase())
      )
    );

    if (existing) {
      duplicateWarning = `Possible duplicate detected with "${existing.name}" (${existing.id}). Matched on contact/social details.`;
    }

    // Determine Stage
    let stage: InfluencerRecord['stage'] = 'Draft';
    const hasContact = Boolean(data.name && data.phone && data.email);
    const hasRates = Boolean(data.contentRates && (data.contentRates.reelRate > 0 || data.contentRates.youtubeVideoRate > 0));
    const hasBanking = Boolean(
      safePan && 
      safeBankDetails?.accountNumber && 
      safeBankDetails?.ifscCode && 
      safeBankDetails?.accountHolderName
    );

    if (hasContact && hasRates && hasBanking) {
      stage = 'Payment-Ready';
    } else if (hasContact && hasRates) {
      stage = 'Campaign-Ready';
    } else {
      stage = 'Draft';
    }

    const record: InfluencerRecord = {
      id,
      name: data.name || 'Untitled Creator',
      stage: data.stage || stage,
      phone: data.phone || '',
      email: data.email || '',
      city: data.city || '',
      state: data.state || '',
      address: data.address || '',
      businessTypes: data.businessTypes || ['Ajit Zone'],
      franchises: data.franchises || [],
      departments: data.departments || ['Saree'],
      influencerStatus: data.influencerStatus || (data.isBlacklisted ? 'Blacklisted' : 'Active'),
      influencerType: data.influencerType || 'Instagram',
      collaborationType: data.collaborationType || 'Paid',
      socialPlatforms: data.socialPlatforms || {},
      contentRates: data.contentRates || { reelRate: 0, youtubeVideoRate: 0, storyRate: 0, staticPostRate: 0 },
      panNumber: safePan,
      govIdType: safeGovIdType,
      govIdNumber: safeGovIdNumber,
      bankDetails: safeBankDetails,
      isBlacklisted: Boolean(data.isBlacklisted),
      blacklistReason: data.blacklistReason || '',
      internalRating: data.internalRating || 4.0,
      isPreferred: Boolean(data.isPreferred),
      remarks: data.remarks || '',
      lastVisitDate: data.lastVisitDate,
      assignedTeamMember: data.assignedTeamMember || this.currentUser?.name || '',
      totalReels: Number(data.totalReels || 0),
      totalPosts: Number(data.totalPosts || 0),
      totalStories: Number(data.totalStories || 0),
      totalViews: Number(data.totalViews || 0),
      totalReach: Number(data.totalReach || 0),
      engagementRate: Number(data.engagementRate || 4.0),
      storeVisits: Number(data.storeVisits || 0),
      salesGenerated: Number(data.salesGenerated || 0),
      createdAt: before ? before.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.influencers.unshift(record);
      this.logAudit('influencer', 'InfluencerRecord', record.id, 'CREATE', [
        { field: 'all', before: null, after: record.name }
      ]);
    } else {
      this.influencers = this.influencers.map(i => i.id === id ? record : i);
      this.logAudit('influencer', 'InfluencerRecord', record.id, 'UPDATE', [
        { field: 'stage', before: before?.stage, after: record.stage },
        { field: 'isBlacklisted', before: before?.isBlacklisted, after: record.isBlacklisted }
      ]);
    }

    this.save('omni_influencers', this.influencers);
    return { record, duplicateWarning };
  }

  deleteInfluencer(id: string): boolean {
    this.assertPermission('influencer', 'canDelete');
    const existing = this.influencers.find(i => i.id === id);
    if (!existing) return false;
    this.influencers = this.influencers.filter(i => i.id !== id);
    this.logAudit('influencer', 'InfluencerRecord', id, 'DELETE', [
      { field: 'name', before: existing.name, after: null },
      { field: 'email', before: existing.email, after: null },
    ], 'Influencer profile deleted');
    this.save('omni_influencers', this.influencers);
    return true;
  }

  // -------------------------
  // CAMPAIGNS & DELIVERABLES
  // -------------------------
  getCampaigns(): CampaignRecord[] {
    return [...this.campaigns];
  }

  getDeliverables(campaignId?: string): DeliverableItem[] {
    if (campaignId) {
      return this.deliverables.filter(d => d.campaignId === campaignId);
    }
    return [...this.deliverables];
  }

  saveCampaign(data: Partial<CampaignRecord>, reasonForChange?: string): CampaignRecord {
    const isNew = !data.id;
    this.assertPermission('influencer', isNew ? 'canCreate' : 'canEdit');
    const id = data.id || `CMP-2026-${String(Math.floor(10 + Math.random() * 90)).padStart(3, '0')}`;
    const before = this.campaigns.find(c => c.id === id);

    const record: CampaignRecord = {
      id,
      name: data.name || 'New Campaign',
      businessTypes: data.businessTypes || ['Ajit Zone'],
      franchises: data.franchises || [],
      departments: data.departments || ['Saree'],
      influencerId: data.influencerId || '',
      influencerName: data.influencerName || '',
      coordinator: data.coordinator || this.currentUser.name,
      assignedTeamMember: data.assignedTeamMember || this.currentUser?.name || '',
      objective: data.objective || 'Brand Awareness',
      department: data.department || 'Saree',
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      endDate: data.endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      month: data.month || 'November',
      year: data.year || '2026',
      visitDate: data.visitDate || new Date().toISOString().slice(0, 10),
      agreedAmount: Number(data.agreedAmount || 0),
      budget: Number(data.budget || data.agreedAmount || 0),
      advancePaid: Number(data.advancePaid || 0),
      collaborationType: data.collaborationType || 'Paid',
      status: data.status || 'Planned',
      deliverablesCount: data.deliverablesCount || 0,
      completedDeliverablesCount: data.completedDeliverablesCount || 0,
      completionDate: data.completionDate,
      remarks: data.remarks || '',
      createdAt: before ? before.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.campaigns.unshift(record);
      this.logAudit('influencer', 'CampaignRecord', record.id, 'CREATE', [
        { field: 'name', before: null, after: record.name },
        { field: 'agreedAmount', before: null, after: record.agreedAmount }
      ]);
    } else {
      this.campaigns = this.campaigns.map(c => c.id === id ? record : c);
      this.logAudit('influencer', 'CampaignRecord', record.id, 'UPDATE', [
        { field: 'status', before: before?.status, after: record.status },
        { field: 'agreedAmount', before: before?.agreedAmount, after: record.agreedAmount }
      ], reasonForChange || 'Campaign details revised');
    }

    this.save('omni_campaigns', this.campaigns);
    return record;
  }

  saveDeliverable(data: Partial<DeliverableItem>): DeliverableItem {
    const isNew = !data.id;
    if (isNew) {
      const canCreate = this.hasPermission(this.currentUser, 'influencer', 'canCreate');
      const canEditExistingCampaign = Boolean(data.campaignId) && this.hasPermission(this.currentUser, 'influencer', 'canEdit');
      if (!canCreate && !canEditExistingCampaign) {
        this.assertPermission('influencer', 'canCreate');
      }
    } else {
      this.assertPermission('influencer', 'canEdit');
    }
    const id = data.id || `DEL-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const before = this.deliverables.find(d => d.id === id);

    const record: DeliverableItem = {
      id,
      campaignId: data.campaignId || '',
      title: data.title || 'Untitled Deliverable',
      type: data.type || 'Instagram Reel',
      isRequired: data.isRequired !== undefined ? data.isRequired : true,
      status: data.status || 'Pending',
      shootDate: data.shootDate,
      expectedPostingDate: data.expectedPostingDate || new Date().toISOString().slice(0, 10),
      actualPostingDate: data.actualPostingDate,
      publishedUrl: data.publishedUrl,
      remarks: data.remarks,
    };

    if (isNew) {
      this.deliverables.push(record);
      this.logAudit('influencer', 'DeliverableItem', record.id, 'CREATE', [
        { field: 'title', before: null, after: record.title },
        { field: 'status', before: null, after: record.status },
        ...(record.publishedUrl ? [{ field: 'publishedUrl', before: null, after: record.publishedUrl }] : []),
      ]);
    } else {
      this.deliverables = this.deliverables.map(d => d.id === id ? record : d);
      const changes: { field: string; before: any; after: any }[] = [];
      if (before?.status !== record.status) {
        changes.push({ field: 'status', before: before?.status, after: record.status });
      }
      if (before?.publishedUrl !== record.publishedUrl) {
        changes.push({ field: 'publishedUrl', before: before?.publishedUrl || '', after: record.publishedUrl || '' });
      }
      if (before?.actualPostingDate !== record.actualPostingDate) {
        changes.push({ field: 'actualPostingDate', before: before?.actualPostingDate || '', after: record.actualPostingDate || '' });
      }
      if (changes.length > 0) {
        this.logAudit('influencer', 'DeliverableItem', record.id, 'UPDATE', changes, 'Deliverable status / posted link updated');
      }
    }

    // Recalculate campaign deliverable stats and completion state
    if (record.campaignId) {
      const campDels = this.deliverables.filter(d => d.campaignId === record.campaignId);
      const reqDels = campDels.filter(d => d.isRequired);
      const reqCompleted = reqDels.filter(d => d.status === 'Approved' || d.status === 'Posted');
      const allCompleted = campDels.filter(d => d.status === 'Approved' || d.status === 'Posted');

      const targetCamp = this.campaigns.find(c => c.id === record.campaignId);
      if (targetCamp) {
        targetCamp.deliverablesCount = campDels.length;
        targetCamp.completedDeliverablesCount = allCompleted.length;
        // As per discovery specs: "campaign completion when all required deliverables have been submitted"
        if (reqDels.length > 0 && reqCompleted.length === reqDels.length && targetCamp.status === 'Active') {
          targetCamp.status = 'Completed';
          targetCamp.completionDate = new Date().toISOString().slice(0, 10);
        }
        this.save('omni_campaigns', this.campaigns);
      }
    }

    this.save('omni_deliverables', this.deliverables);
    return record;
  }

  deleteCampaign(id: string): boolean {
    this.assertPermission('influencer', 'canDelete');
    const existing = this.campaigns.find(c => c.id === id);
    if (!existing) return false;

    const removedDels = this.deliverables.filter(d => d.campaignId === id).length;
    const removedPerfs = this.performances.filter(p => p.campaignId === id).length;
    const removedPays = this.payments.filter(p => p.campaignId === id).length;

    this.campaigns = this.campaigns.filter(c => c.id !== id);
    this.deliverables = this.deliverables.filter(d => d.campaignId !== id);
    this.performances = this.performances.filter(p => p.campaignId !== id);
    this.payments = this.payments.filter(p => p.campaignId !== id);

    this.logAudit('influencer', 'CampaignRecord', id, 'DELETE', [
      { field: 'name', before: existing.name, after: null },
      { field: 'removedDeliverables', before: removedDels, after: 0 },
      { field: 'removedPerformances', before: removedPerfs, after: 0 },
      { field: 'removedPayments', before: removedPays, after: 0 },
    ], 'Campaign and linked child records deleted');

    this.save('omni_campaigns', this.campaigns);
    this.save('omni_deliverables', this.deliverables);
    this.save('omni_performances', this.performances);
    this.save('omni_payments', this.payments);
    return true;
  }

  deleteDeliverable(id: string): boolean {
    const canRemove =
      this.hasPermission(this.currentUser, 'influencer', 'canDelete') ||
      this.hasPermission(this.currentUser, 'influencer', 'canEdit');
    if (!canRemove) {
      throw new Error('Unauthorized: Missing permission to delete a deliverable.');
    }
    const existing = this.deliverables.find(d => d.id === id);
    if (!existing) return false;

    this.deliverables = this.deliverables.filter(d => d.id !== id);
    this.performances = this.performances.filter(p => p.deliverableId !== id);

    if (existing.campaignId) {
      const campDels = this.deliverables.filter(d => d.campaignId === existing.campaignId);
      const allCompleted = campDels.filter(d => d.status === 'Approved' || d.status === 'Posted');
      const targetCamp = this.campaigns.find(c => c.id === existing.campaignId);
      if (targetCamp) {
        targetCamp.deliverablesCount = campDels.length;
        targetCamp.completedDeliverablesCount = allCompleted.length;
        this.save('omni_campaigns', this.campaigns);
      }
    }

    this.logAudit('influencer', 'DeliverableItem', id, 'DELETE', [
      { field: 'title', before: existing.title, after: null },
      { field: 'campaignId', before: existing.campaignId, after: null },
    ], 'Deliverable and linked posted performance removed');

    this.save('omni_deliverables', this.deliverables);
    this.save('omni_performances', this.performances);
    return true;
  }

  // -------------------------
  // PAYMENTS & BALANCES
  // -------------------------
  getPayments(): PaymentRecord[] {
    return [...this.payments];
  }

  getCampaignOutstandingBalance(campaignId: string): { agreedAmount: number; totalPaid: number; balance: number } {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) return { agreedAmount: 0, totalPaid: 0, balance: 0 };

    // Standard approved/paid payments increase total paid; Refund / Reversal payments decrease total paid (credit back to campaign budget)
    const approvedOrPaidPayments = this.payments
      .filter(p => p.campaignId === campaignId && (p.status === 'Paid' || p.status === 'Approved'))
      .reduce((sum, p) => {
        if (p.paymentType === 'Refund / Reversal') {
          return sum - p.amount;
        }
        return sum + p.amount;
      }, 0);

    const netPaid = Math.max(0, approvedOrPaidPayments);
    const balance = Math.max(0, campaign.agreedAmount - netPaid);
    return {
      agreedAmount: campaign.agreedAmount,
      totalPaid: netPaid,
      balance,
    };
  }

  // Canonical payment type normalizer
  normalizePaymentType(rawType?: string): PaymentType | null {
    if (!rawType) return null;
    const trimmed = rawType.trim();
    const exact = CANONICAL_PAYMENT_TYPES.find(
      t => t.toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return exact;

    // Common synonyms/aliases mapping
    const lower = trimmed.toLowerCase();
    if (lower.includes('refund') || lower.includes('reversal')) return 'Refund / Reversal';
    if (lower.includes('advance') || lower.includes('initial')) return 'Advance';
    if (lower.includes('settlement') || lower.includes('final')) return 'Final Settlement';
    if (lower.includes('reimburse')) return 'Reimbursement';
    if (lower.includes('correct')) return 'Correction';
    if (lower === 'm1' || lower === 'milestone 1') return 'Milestone 1';
    if (lower === 'm2' || lower === 'milestone 2') return 'Milestone 2';

    return null;
  }

  savePayment(data: Partial<PaymentRecord>, isExceptionOverride = false): { payment: PaymentRecord; error?: string } {
    const isNew = !data.id;
    if (!this.hasPermission(this.currentUser, 'influencer', isNew ? 'canCreate' : 'canEdit')) {
      return { payment: null as any, error: 'Unauthorized: You do not have permission to create or modify payments.' };
    }
    if ((data.status === 'Approved' || data.status === 'Paid') && !this.hasPermission(this.currentUser, 'influencer', 'canApprove')) {
      return { payment: null as any, error: 'Unauthorized: Financial approval permission is required to approve or disburse payments.' };
    }
    if (isExceptionOverride && this.currentUser.role !== 'Super Admin') {
      return { payment: null as any, error: 'Unauthorized: Only a Super Administrator can authorize budget exception overrides.' };
    }

    const id = data.id || `PAY-${Math.floor(1000 + Math.random() * 9000)}`;

    const campaign = this.campaigns.find(c => c.id === data.campaignId);
    if (!campaign && data.campaignId) {
      return { payment: null as any, error: 'Campaign does not exist.' };
    }

    // 1. Amount validation - must follow positive magnitude convention
    if (data.amount !== undefined) {
      const amt = Number(data.amount);
      if (isNaN(amt) || amt <= 0) {
        return {
          payment: null as any,
          error: `Validation Error: Payment amount cannot be negative (${data.amount})`
        };
      }
    }

    // 2. Canonical payment type validation
    let resolvedType: PaymentType | string = data.paymentType || 'Advance';
    if (data.paymentType) {
      const canonical = this.normalizePaymentType(data.paymentType);
      if (canonical) {
        resolvedType = canonical;
      } else {
        // If not canonical, verify if this is an authorized legacy/correction record
        if (!data.isCorrection && isNew) {
          return {
            payment: null as any,
            error: `Validation Error: "${data.paymentType}" is not a recognized Payment Type`
          };
        }
      }
    }

    // 3. Overpayment check (Reversals don't increase budget expenditure)
    if (campaign && data.amount && resolvedType !== 'Refund / Reversal') {
      const otherPayments = this.payments
        .filter(p => p.campaignId === campaign.id && p.id !== id && (p.status === 'Paid' || p.status === 'Approved'))
        .reduce((sum, p) => p.paymentType === 'Refund / Reversal' ? sum - p.amount : sum + p.amount, 0);

      const netPaidAfter = otherPayments + Number(data.amount);
      if (netPaidAfter > campaign.agreedAmount && !isExceptionOverride) {
        return {
          payment: null as any,
          error: `Overpayment blocked: Proposed payment of ₹${Number(data.amount).toLocaleString()} exceeds remaining campaign budget of ₹${Math.max(0, campaign.agreedAmount - otherPayments).toLocaleString()}. An authorized exception or agreed amount adjustment is required.`
        };
      }
    }

    const before = this.payments.find(p => p.id === id);
    const record: PaymentRecord = {
      id,
      campaignId: data.campaignId || '',
      campaignName: campaign ? campaign.name : (data.campaignName || ''),
      influencerId: campaign ? campaign.influencerId : (data.influencerId || ''),
      influencerName: campaign ? campaign.influencerName : (data.influencerName || ''),
      amount: Number(data.amount || 0),
      paymentType: resolvedType,
      status: data.status || 'Draft',
      requestedBy: data.requestedBy || this.currentUser.name,
      approvedBy: data.approvedBy,
      approvalDate: data.approvalDate,
      paymentDate: data.paymentDate,
      transactionReference: data.transactionReference,
      paymentProofUrl: data.paymentProofUrl,
      remarks: data.remarks,
      isCorrection: Boolean(data.isCorrection),
      correctionReason: data.correctionReason,
      createdAt: before ? before.createdAt : new Date().toISOString(),
    };

    if (isNew) {
      this.payments.unshift(record);
      this.logAudit('influencer', 'PaymentRecord', record.id, 'CREATE', [
        { field: 'amount', before: null, after: record.amount },
        { field: 'paymentType', before: null, after: record.paymentType }
      ]);
    } else {
      this.payments = this.payments.map(p => p.id === id ? record : p);
      this.logAudit('influencer', 'PaymentRecord', record.id, 'UPDATE', [
        { field: 'status', before: before?.status, after: record.status },
        { field: 'amount', before: before?.amount, after: record.amount },
        { field: 'paymentType', before: before?.paymentType, after: record.paymentType }
      ], record.correctionReason || 'Payment record updated');
    }

    this.save('omni_payments', this.payments);
    return { payment: record };
  }

  // Reconcile a quarantined payment record into verified application ledger
  reconcileQuarantinedPayment(
    quarantineId: string,
    correctedData: {
      campaignId?: string;
      amount: number;
      paymentType: PaymentType;
      status?: PaymentStatus;
      remarks?: string;
    },
    auditReason: string
  ): { payment?: PaymentRecord; error?: string } {
    if (!this.hasGovernanceAccess(this.currentUser, 'quarantine') || !this.hasPermission(this.currentUser, 'influencer', 'canApprove')) {
      return { error: 'Unauthorized: Quarantine governance and financial approval permissions are required to reconcile payments.' };
    }
    const qRec = this.quarantine.find(q => q.id === quarantineId);
    if (!qRec) return { error: 'Quarantine record not found.' };

    if (correctedData.amount <= 0) {
      return { error: 'Validation Error: Payment amount must be a positive number.' };
    }

    const campaignId = correctedData.campaignId || qRec.rawPayload.Campaign_ID || qRec.rawPayload.campaignId || this.campaigns[0]?.id;
    const targetId = qRec.rawPayload.ID || qRec.rawPayload.id || `PAY-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = this.savePayment({
      id: targetId,
      campaignId,
      amount: correctedData.amount,
      paymentType: correctedData.paymentType,
      status: correctedData.status || 'Approved',
      remarks: correctedData.remarks || `Reconciled from quarantine (${qRec.id}): ${auditReason}`,
      isCorrection: true,
      correctionReason: auditReason,
    }, true);

    if (result.error) return { error: result.error };

    this.resolveQuarantine(quarantineId, 'RECONCILED');

    this.logAudit('influencer', 'PaymentRecord', result.payment.id, 'EXCEPTION_OVERRIDE', [
      { field: 'rawPayload', before: qRec.rawPayload, after: result.payment },
      { field: 'quarantineStatus', before: 'PENDING_REVIEW', after: 'RECONCILED' }
    ], `Quarantined payment row reconciled: ${auditReason}`);

    return { payment: result.payment };
  }

  deletePayment(id: string): boolean {
    this.assertPermission('influencer', 'canDelete');
    const existing = this.payments.find(p => p.id === id);
    if (!existing) return false;

    this.payments = this.payments.filter(p => p.id !== id);
    this.save('omni_payments', this.payments);

    if (existing.campaignId) {
      const targetCamp = this.campaigns.find(c => c.id === existing.campaignId);
      if (targetCamp) {
        const { totalPaid } = this.getCampaignOutstandingBalance(existing.campaignId);
        targetCamp.advancePaid = totalPaid;
        this.save('omni_campaigns', this.campaigns);
      }
    }

    this.logAudit('influencer', 'PaymentRecord', id, 'DELETE', [
      { field: 'amount', before: existing.amount, after: null },
      { field: 'paymentType', before: existing.paymentType, after: null },
      { field: 'campaignName', before: existing.campaignName, after: null },
    ], 'Payment ledger entry deleted');
    return true;
  }

  // -------------------------
  // FOLLOW-UPS
  // -------------------------
  getFollowUps(): FollowUpRecord[] {
    return [...this.followUps];
  }

  saveFollowUp(data: Partial<FollowUpRecord>): FollowUpRecord {
    const isNew = !data.id;
    this.assertPermission('influencer', isNew ? 'canCreate' : 'canEdit');
    const id = data.id || `FOL-${Math.floor(100 + Math.random() * 900)}`;
    const before = this.followUps.find(f => f.id === id);

    const record: FollowUpRecord = {
      id,
      entityType: data.entityType || 'influencer',
      entityId: data.entityId || '',
      entityName: data.entityName || '',
      assignedTo: data.assignedTo || this.currentUser.name,
      date: data.date || new Date().toISOString().slice(0, 10),
      nextFollowUpDate: data.nextFollowUpDate || new Date().toISOString().slice(0, 10),
      type: data.type || 'WhatsApp',
      purpose: data.purpose || '',
      status: data.status || 'Pending',
      remarks: data.remarks || '',
      createdAt: before ? before.createdAt : new Date().toISOString(),
    };

    if (isNew) {
      this.followUps.unshift(record);
    } else {
      this.followUps = this.followUps.map(f => f.id === id ? record : f);
    }

    this.save('omni_followups', this.followUps);
    return record;
  }

  deleteFollowUp(id: string): boolean {
    this.assertPermission('influencer', 'canDelete');
    const existing = this.followUps.find(f => f.id === id);
    if (!existing) return false;
    this.followUps = this.followUps.filter(f => f.id !== id);
    this.logAudit('influencer', 'FollowUpRecord', id, 'DELETE', [
      { field: 'entityName', before: existing.entityName, after: null },
      { field: 'purpose', before: existing.purpose, after: null },
    ], 'Follow-up record deleted');
    this.save('omni_followups', this.followUps);
    return true;
  }

  // -------------------------
  // PERFORMANCE
  // -------------------------
  getPerformances(): PerformanceRecord[] {
    return [...this.performances];
  }

  getPerformanceByDeliverableId(deliverableId: string): PerformanceRecord | undefined {
    return this.performances.find(p => p.deliverableId === deliverableId);
  }

  getPerformancesByDeliverableId(deliverableId: string): PerformanceRecord[] {
    return this.performances.filter(p => p.deliverableId === deliverableId);
  }

  deletePerformance(id: string): boolean {
    const canRemove =
      this.hasPermission(this.currentUser, 'influencer', 'canDelete') ||
      this.hasPermission(this.currentUser, 'influencer', 'canEdit');
    if (!canRemove) {
      throw new Error('Unauthorized: Missing permission to remove a posted link & performance record.');
    }
    const existing = this.performances.find(p => p.id === id);
    if (!existing) return false;
    this.performances = this.performances.filter(p => p.id !== id);
    this.logAudit('influencer', 'PerformanceRecord', id, 'DELETE', [
      { field: 'publishedUrl', before: existing.publishedUrl, after: null },
      { field: 'contentTitle', before: existing.contentTitle, after: null },
    ], 'Posted link & performance entry removed');
    this.save('omni_performances', this.performances);
    return true;
  }

  savePerformance(
    data: Partial<PerformanceRecord>,
    options?: { forceNew?: boolean }
  ): PerformanceRecord {
    // Only upsert by deliverableId when NOT forcing a new entry AND the link matches (or no distinct URL is being added)
    const normalizedIncomingUrl = (data.publishedUrl || '').trim().toLowerCase();
    const existingByDel = !data.id && !options?.forceNew && data.deliverableId
      ? this.performances.find(p => {
          if (p.deliverableId !== data.deliverableId) return false;
          const existingUrl = (p.publishedUrl || '').trim().toLowerCase();
          if (!normalizedIncomingUrl || !existingUrl) return true;
          return existingUrl === normalizedIncomingUrl;
        })
      : undefined;
    const resolvedId = data.id || existingByDel?.id;
    const isNew = !resolvedId;

    if (isNew) {
      // Allow users with either canCreate or canEdit to log posted links & performance for an existing deliverable or campaign
      const linkedToExisting = Boolean(data.deliverableId || data.campaignId);
      const allowed = linkedToExisting
        ? (this.hasPermission(this.currentUser, 'influencer', 'canCreate') || this.hasPermission(this.currentUser, 'influencer', 'canEdit'))
        : this.hasPermission(this.currentUser, 'influencer', 'canCreate');
      if (!allowed) {
        throw new Error('Unauthorized: Missing permission to record deliverable performance.');
      }
    } else {
      this.assertPermission('influencer', 'canEdit');
    }

    const id = resolvedId || `PERF-${Date.now().toString(36).toUpperCase().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const before = this.performances.find(p => p.id === id);

    // Score calculation
    const views = Number(data.viewsDay30 || data.viewsDay15 || data.viewsDay7 || 0);
    const engagementSum = Number(data.likes || 0) + Number(data.comments || 0) + Number(data.shares || 0) + Number(data.saves || 0);
    const engRate = views > 0 ? (engagementSum / views) * 100 : 0;
    const onTimeBonus = (data.delayDays || 0) <= 0 ? 10 : Math.max(0, 10 - (data.delayDays || 0) * 2);
    
    // Performance score 0-100
    const rawScore = Math.min(100, Math.round(engRate * 8 + onTimeBonus + (views > 100000 ? 20 : views > 0 ? 10 : 0)));

    const record: PerformanceRecord = {
      id,
      deliverableId: data.deliverableId !== undefined ? data.deliverableId : (before?.deliverableId || ''),
      campaignId: data.campaignId || before?.campaignId || '',
      campaignName: data.campaignName || before?.campaignName || '',
      influencerName: data.influencerName || before?.influencerName || '',
      contentTitle: data.contentTitle || before?.contentTitle || '',
      platform: data.platform || before?.platform || 'Instagram',
      publishedUrl: data.publishedUrl !== undefined ? data.publishedUrl : (before?.publishedUrl || ''),
      postingDate: data.postingDate || before?.postingDate || new Date().toISOString().slice(0, 10),
      delayDays: data.delayDays !== undefined ? Number(data.delayDays) : (before?.delayDays || 0),
      viewsDay7: Number(data.viewsDay7 ?? before?.viewsDay7 ?? 0),
      viewsDay15: Number(data.viewsDay15 ?? before?.viewsDay15 ?? 0),
      viewsDay30: Number(data.viewsDay30 ?? before?.viewsDay30 ?? 0),
      likes: Number(data.likes ?? before?.likes ?? 0),
      comments: Number(data.comments ?? before?.comments ?? 0),
      shares: Number(data.shares ?? before?.shares ?? 0),
      saves: Number(data.saves ?? before?.saves ?? 0),
      reach: Number(data.reach ?? before?.reach ?? 0),
      allocatedSpend: Number(data.allocatedSpend ?? before?.allocatedSpend ?? 0),
      performanceScore: data.performanceScore !== undefined ? data.performanceScore : rawScore,
      notes: data.notes !== undefined ? data.notes : before?.notes,
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.performances.unshift(record);
      this.logAudit('influencer', 'PerformanceRecord', record.id, 'CREATE', [
        { field: 'publishedUrl', before: null, after: record.publishedUrl },
        { field: 'viewsDay30', before: null, after: record.viewsDay30 || record.viewsDay15 || record.viewsDay7 },
        { field: 'likes', before: null, after: record.likes },
      ]);
    } else {
      this.performances = this.performances.map(p => p.id === id ? record : p);
      this.logAudit('influencer', 'PerformanceRecord', record.id, 'UPDATE', [
        { field: 'publishedUrl', before: before?.publishedUrl, after: record.publishedUrl },
        { field: 'viewsDay7', before: before?.viewsDay7, after: record.viewsDay7 },
        { field: 'viewsDay15', before: before?.viewsDay15, after: record.viewsDay15 },
        { field: 'viewsDay30', before: before?.viewsDay30, after: record.viewsDay30 },
        { field: 'likes', before: before?.likes, after: record.likes },
      ], 'Deliverable posted link & performance updated');
    }

    this.save('omni_performances', this.performances);
    return record;
  }

  // -------------------------
  // DIGITAL CONTENT MASTER
  // -------------------------
  getContentMaster(): ContentMasterRecord[] {
    return [...this.contentMaster];
  }

  saveContentMaster(data: Partial<ContentMasterRecord>): { record: ContentMasterRecord; duplicateWarning?: string } {
    const isNew = !data.id;
    this.assertPermission('digital', isNew ? 'canCreate' : 'canEdit');
    const id = data.id || `TOP-2026-${String(Math.floor(10 + Math.random() * 90)).padStart(3, '0')}`;
    const before = this.contentMaster.find(c => c.id === id);

    if (this.currentUser.role === 'Video Editor') {
      if (isNew || !before) {
        throw new Error('Unauthorized: Video Editors cannot create new content topics.');
      }
      const isAssigned =
        (this.currentUser.editorId && before.assignedEditorId === this.currentUser.editorId) ||
        before.assignedEditorName === this.currentUser.name;
      if (!isAssigned) {
        throw new Error('Unauthorized: Video Editors can only update content assigned to them.');
      }
      if (data.editingStatus === 'Approved / Ready for Posting' || data.isManagerApproved === true) {
        throw new Error('Unauthorized: Video Editors cannot self-approve edits.');
      }
    }

    // Duplicate topic check (simple similarity check)
    let duplicateWarning: string | undefined;
    if (data.title) {
      const targetWords = data.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matched = this.contentMaster.find(c => {
        if (c.id === id) return false;
        const cWords = c.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const common = targetWords.filter(w => cWords.includes(w));
        return common.length >= 3;
      });
      if (matched) {
        duplicateWarning = `Topic warning: "${matched.title}" (${matched.id}) shares similar keywords. An authorized user may proceed.`;
      }
    }

    const record: ContentMasterRecord = {
      id,
      title: data.title || 'Untitled Topic',
      department: data.department || 'Production',
      contentType: data.contentType || 'Long-form Video',
      anchor: data.anchor || '',
      recordingDate: data.recordingDate || new Date().toISOString().slice(0, 10),
      recordingStatus: data.recordingStatus || 'Planned',
      cameraman: data.cameraman || '',
      receiver: data.receiver || '',
      handoverDate: data.handoverDate,
      rawFootageLocationUrl: data.rawFootageLocationUrl || '',
      assignedEditorId: data.assignedEditorId,
      assignedEditorName: data.assignedEditorName,
      editingStatus: data.editingStatus || 'Assigned',
      editSubmissionUrl: data.editSubmissionUrl,
      reviewNotes: data.reviewNotes,
      categories: data.categories || ['General'],
      channels: data.channels || ['YouTube Main'],
      remarks: data.remarks || '',
      submittedBy: data.submittedBy || this.currentUser.name,
      isManagerApproved: data.isManagerApproved !== undefined ? data.isManagerApproved : false,
      createdAt: before ? before.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.contentMaster.unshift(record);
      this.logAudit('digital', 'ContentMaster', record.id, 'CREATE', [
        { field: 'title', before: null, after: record.title }
      ]);
    } else {
      this.contentMaster = this.contentMaster.map(c => c.id === id ? record : c);
      this.logAudit('digital', 'ContentMaster', record.id, 'UPDATE', [
        { field: 'editingStatus', before: before?.editingStatus, after: record.editingStatus },
        { field: 'recordingStatus', before: before?.recordingStatus, after: record.recordingStatus }
      ]);
    }

    this.save('omni_content', this.contentMaster);
    return { record, duplicateWarning };
  }

  deleteContentMaster(id: string): boolean {
    this.assertPermission('digital', 'canDelete');
    const existing = this.contentMaster.find(c => c.id === id);
    if (!existing) return false;
    this.contentMaster = this.contentMaster.filter(c => c.id !== id);
    this.channelSchedules = this.channelSchedules.filter(cs => cs.contentId !== id);
    this.logAudit('digital', 'ContentMaster', id, 'DELETE', [
      { field: 'title', before: existing.title, after: null },
    ], 'Studio content master entry deleted');
    this.save('omni_content', this.contentMaster);
    this.save('omni_channel_sched', this.channelSchedules);
    return true;
  }

  // -------------------------
  // EDITOR CAPACITY & WORKSPACE
  // -------------------------
  getEditorCapacities(): EditorCapacityRecord[] {
    return [...this.editorCapacity];
  }

  saveEditorCapacity(record: EditorCapacityRecord) {
    this.assertPermission('digital', 'canEdit');
    this.editorCapacity = this.editorCapacity.map(c => c.id === record.id ? record : c);
    this.save('omni_capacity', this.editorCapacity);
  }

  // Recommend best eligible editor when assigning work
  getRecommendedEditor(pointsNeeded: number = 4): { recommendedId: string; recommendedName: string; reason: string } {
    const scored = this.editorCapacity.map(cap => {
      const netWorkingDays = cap.workingDays - cap.leaveDays;
      const totalCapacity = netWorkingDays * cap.dailyCapacityPoints;
      const usedCapacity = (cap.longVideoCompleted * 6) + (cap.shortsCompleted * 1) + cap.activeAssignedPoints;
      const remainingCapacity = Math.max(0, totalCapacity - usedCapacity);
      return {
        ...cap,
        remainingCapacity,
      };
    });

    scored.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
    const best = scored[0];
    if (!best) {
      return {
        recommendedId: '',
        recommendedName: '',
        reason: 'No active editors configured yet. Add an editor profile in Editor Capacity first.'
      };
    }
    return {
      recommendedId: best.editorId,
      recommendedName: best.editorName,
      reason: `${best.editorName} has highest remaining bandwidth (${best.remainingCapacity} pts available vs ${best.activeAssignedPoints} assigned).`
    };
  }

  // -------------------------
  // CHANNEL SCHEDULES
  // -------------------------
  getChannelSchedules(): ChannelScheduleTask[] {
    return [...this.channelSchedules];
  }

  saveChannelSchedule(data: Partial<ChannelScheduleTask>): ChannelScheduleTask {
    const isNew = !data.id;
    this.assertPermission('digital', isNew ? 'canCreate' : 'canEdit');
    const id = data.id || `POST-${Math.floor(100 + Math.random() * 900)}`;

    const record: ChannelScheduleTask = {
      id,
      contentId: data.contentId || '',
      contentTitle: data.contentTitle || '',
      channelName: data.channelName || 'YouTube Main',
      scheduledDate: data.scheduledDate || new Date().toISOString().slice(0, 10),
      scheduledTime: data.scheduledTime || '18:00',
      status: data.status || 'Scheduled',
      publishedUrl: data.publishedUrl,
      views: data.views,
      likes: data.likes,
      delayReason: data.delayReason,
      overriddenLimitsNotice: data.overriddenLimitsNotice,
    };

    if (isNew) {
      this.channelSchedules.unshift(record);
    } else {
      this.channelSchedules = this.channelSchedules.map(c => c.id === id ? record : c);
    }

    this.save('omni_channel_sched', this.channelSchedules);
    return record;
  }

  deleteChannelSchedule(id: string): boolean {
    this.assertPermission('digital', 'canDelete');
    const existing = this.channelSchedules.find(c => c.id === id);
    if (!existing) return false;
    this.channelSchedules = this.channelSchedules.filter(c => c.id !== id);
    this.logAudit('digital', 'ChannelScheduleTask', id, 'DELETE', [
      { field: 'contentTitle', before: existing.contentTitle, after: null },
      { field: 'channelName', before: existing.channelName, after: null },
    ], 'Channel schedule entry deleted');
    this.save('omni_channel_sched', this.channelSchedules);
    return true;
  }

  // -------------------------
  // ANCHOR SCHEDULES
  // -------------------------
  getAnchorSchedules(): AnchorScheduleRecord[] {
    return [...this.anchorSchedules];
  }

  saveAnchorSchedule(data: Partial<AnchorScheduleRecord>): AnchorScheduleRecord {
    const isNew = !data.id;
    this.assertPermission('digital', isNew ? 'canCreate' : 'canEdit');
    const id = data.id || `ANC-${Math.floor(100 + Math.random() * 900)}`;
    const before = this.anchorSchedules.find(a => a.id === id);

    if (this.currentUser.role === 'Anchor & Presenter') {
      if (isNew || !before) {
        throw new Error('Unauthorized: Anchors cannot create new studio shoots.');
      }
      const linkedAnchor = this.anchorProfiles.find(ap => ap.id === this.currentUser.anchorId);
      const isOwn =
        before.anchorName === this.currentUser.name ||
        (linkedAnchor && before.anchorName === linkedAnchor.name);
      if (!isOwn) {
        throw new Error('Unauthorized: Anchors can only request changes on their own shoots.');
      }
      if (
        before.status === 'Reschedule Requested' &&
        data.status === 'Confirmed' &&
        !this.hasPermission(this.currentUser, 'digital', 'canApprove')
      ) {
        throw new Error('Unauthorized: Anchors cannot self-approve reschedule requests.');
      }
    }

    const record: AnchorScheduleRecord = {
      id,
      anchorId: data.anchorId || before?.anchorId,
      anchorName: data.anchorName || '',
      shootDate: data.shootDate || new Date().toISOString().slice(0, 10),
      shootTimeSlot: data.shootTimeSlot || '10:00 AM - 01:00 PM',
      topicId: data.topicId,
      topicTitle: data.topicTitle || 'Studio Recording Session',
      department: data.department || 'Production',
      studioOrLocation: data.studioOrLocation || 'Main Studio Floor',
      status: data.status || 'Assigned',
      originalShootDate: data.originalShootDate || before?.shootDate || data.shootDate,
      proposedRevisedDate: data.proposedRevisedDate,
      rescheduleReason: data.rescheduleReason,
      managerNotes: data.managerNotes,
      assignedBy: data.assignedBy || this.currentUser.name,
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.anchorSchedules.unshift(record);
    } else {
      this.anchorSchedules = this.anchorSchedules.map(a => a.id === id ? record : a);
      this.logAudit('digital', 'AnchorScheduleRecord', record.id, 'STATUS_CHANGE', [
        { field: 'status', before: before?.status, after: record.status }
      ], record.rescheduleReason || 'Anchor status or date adjusted');
    }

    this.save('omni_anchor_sched', this.anchorSchedules);
    return record;
  }

  deleteAnchorSchedule(id: string): boolean {
    this.assertPermission('digital', 'canDelete');
    const existing = this.anchorSchedules.find(a => a.id === id);
    if (!existing) return false;
    this.anchorSchedules = this.anchorSchedules.filter(a => a.id !== id);
    this.logAudit('digital', 'AnchorScheduleRecord', id, 'DELETE', [
      { field: 'anchorName', before: existing.anchorName, after: null },
      { field: 'topicTitle', before: existing.topicTitle, after: null },
    ], 'Anchor shoot schedule deleted');
    this.save('omni_anchor_sched', this.anchorSchedules);
    return true;
  }

  // -------------------------
  // EDITOR PROFILES & ROSTER
  // -------------------------
  getEditorProfiles(): EditorProfile[] {
    return [...this.editorProfiles];
  }

  saveEditorProfile(data: Partial<EditorProfile>): { profile: EditorProfile; loginNotice: string } {
    const id = data.id || `ED-${Math.floor(100 + Math.random() * 900)}`;
    const before = this.editorProfiles.find(e => e.id === id);
    const isNew = !before;
    this.assertPermission('digital', isNew ? 'canCreate' : 'canEdit');
    if (this.currentUser.role === 'Video Editor' || this.currentUser.role === 'Anchor & Presenter') {
      throw new Error('Unauthorized: Only managers or administrators can manage editor profiles.');
    }

    const profile: EditorProfile = {
      id,
      name: data.name || 'New Editor',
      email: data.email || '',
      department: data.department || 'Video Production',
      status: data.status || 'Active',
      workingDays: Number(data.workingDays || 22),
      leaveDays: Number(data.leaveDays || 0),
      dailyCapacityPoints: Number(data.dailyCapacityPoints || 5),
      longVideoTarget: Number(data.longVideoTarget || 12),
      shortsTarget: Number(data.shortsTarget || 28),
      monthlyTargetVideos: Number(data.monthlyTargetVideos || 25),
      assignedChannels: data.assignedChannels || [],
      shiftSchedule: data.shiftSchedule || 'Day Shift',
      skills: data.skills || [],
      createdAt: before ? before.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.editorProfiles.unshift(profile);
      this.logAudit('digital', 'EditorProfile', profile.id, 'CREATE', [
        { field: 'name', before: null, after: profile.name },
        { field: 'status', before: null, after: profile.status }
      ], 'Created Editor operational profile');
    } else {
      this.editorProfiles = this.editorProfiles.map(e => e.id === id ? profile : e);
      this.logAudit('digital', 'EditorProfile', profile.id, 'UPDATE', [
        { field: 'status', before: before?.status, after: profile.status },
        { field: 'workingDays', before: before?.workingDays, after: profile.workingDays }
      ], 'Updated Editor operational profile');
    }

    // Sync corresponding EditorCapacityRecord
    let cap = this.editorCapacity.find(c => c.editorId === id || c.editorName === profile.name);
    if (!cap) {
      cap = {
        id: `CAP-${Math.floor(100 + Math.random() * 900)}`,
        editorId: profile.id,
        editorName: profile.name,
        month: new Date().toISOString().slice(0, 7),
        workingDays: profile.workingDays,
        leaveDays: profile.leaveDays,
        dailyCapacityPoints: profile.dailyCapacityPoints,
        longVideoTarget: profile.longVideoTarget,
        shortsTarget: profile.shortsTarget,
        longVideoCompleted: 0,
        shortsCompleted: 0,
        activeAssignedPoints: 0,
        status: profile.status,
      };
      this.editorCapacity.unshift(cap);
    } else {
      cap.editorName = profile.name;
      cap.workingDays = profile.workingDays;
      cap.leaveDays = profile.leaveDays;
      cap.dailyCapacityPoints = profile.dailyCapacityPoints;
      cap.longVideoTarget = profile.longVideoTarget;
      cap.shortsTarget = profile.shortsTarget;
      cap.status = profile.status;
      this.editorCapacity = this.editorCapacity.map(c => c.id === cap!.id ? cap! : c);
    }

    this.save('omni_editor_profiles', this.editorProfiles);
    this.save('omni_capacity', this.editorCapacity);

    const loginNotice = "Operational profile created for capacity planning and task assignments. Profile creation does not automatically grant login access to the software. To enable login access, an Administrator must explicitly provision an account in User Administration & RBAC Settings.";

    return { profile, loginNotice };
  }

  toggleEditorStatus(id: string): EditorProfile {
    const profile = this.editorProfiles.find(e => e.id === id);
    if (!profile) throw new Error('Editor profile not found');

    const nextStatus = profile.status === 'Active' ? 'Inactive' : 'Active';
    profile.status = nextStatus;
    profile.updatedAt = new Date().toISOString();

    this.saveEditorProfile(profile);
    return profile;
  }

  deleteEditorProfile(id: string): boolean {
    this.assertPermission('digital', 'canDelete');
    if (this.currentUser.role === 'Video Editor' || this.currentUser.role === 'Anchor & Presenter') {
      throw new Error('Unauthorized: Only managers or administrators can delete editor profiles.');
    }
    const existing = this.editorProfiles.find(e => e.id === id);
    const matchingCap = this.editorCapacity.find(c => c.editorId === id || c.id === id);
    if (!existing && !matchingCap) return false;

    const targetEditorId = existing?.id || matchingCap?.editorId || id;
    this.editorProfiles = this.editorProfiles.filter(e => e.id !== targetEditorId);
    this.editorCapacity = this.editorCapacity.filter(c => c.editorId !== targetEditorId && c.id !== id);

    this.logAudit('digital', 'EditorProfile', targetEditorId, 'DELETE', [
      { field: 'name', before: existing?.name || matchingCap?.editorName || targetEditorId, after: null },
    ], 'Editor profile and capacity entry deleted');

    this.save('omni_editor_profiles', this.editorProfiles);
    this.save('omni_capacity', this.editorCapacity);
    return true;
  }

  // -------------------------
  // ANCHOR PROFILES & ROSTER
  // -------------------------
  getAnchorProfiles(): AnchorProfile[] {
    return [...this.anchorProfiles];
  }

  saveAnchorProfile(data: Partial<AnchorProfile>): { profile: AnchorProfile; loginNotice: string } {
    const id = data.id || `ANC-PROF-${Math.floor(100 + Math.random() * 900)}`;
    const before = this.anchorProfiles.find(a => a.id === id);
    const isNew = !before;
    this.assertPermission('digital', isNew ? 'canCreate' : 'canEdit');
    if (this.currentUser.role === 'Video Editor' || this.currentUser.role === 'Anchor & Presenter') {
      throw new Error('Unauthorized: Only managers or administrators can manage anchor profiles.');
    }

    const profile: AnchorProfile = {
      id,
      name: data.name || 'New Anchor',
      email: data.email || '',
      department: data.department || 'Markets & Finance',
      primaryStudio: data.primaryStudio || 'Studio Floor A',
      status: data.status || 'Active',
      primaryChannel: data.primaryChannel || '',
      assignedCategory: data.assignedCategory || '',
      monthlyTargetShoots: Number(data.monthlyTargetShoots || 15),
      preferredShifts: data.preferredShifts || [],
      createdAt: before ? before.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isNew) {
      this.anchorProfiles.unshift(profile);
      this.logAudit('digital', 'AnchorProfile', profile.id, 'CREATE', [
        { field: 'name', before: null, after: profile.name },
        { field: 'status', before: null, after: profile.status }
      ], 'Created Anchor operational profile');
    } else {
      this.anchorProfiles = this.anchorProfiles.map(a => a.id === id ? profile : a);
      this.logAudit('digital', 'AnchorProfile', profile.id, 'UPDATE', [
        { field: 'status', before: before?.status, after: profile.status }
      ], 'Updated Anchor operational profile');
    }

    this.save('omni_anchor_profiles', this.anchorProfiles);

    const loginNotice = "Operational profile created for studio scheduling. Profile creation does not automatically grant login access to the software. To enable login access, an Administrator must explicitly provision an account in User Administration & RBAC Settings.";

    return { profile, loginNotice };
  }

  toggleAnchorStatus(id: string): AnchorProfile {
    const profile = this.anchorProfiles.find(a => a.id === id);
    if (!profile) throw new Error('Anchor profile not found');

    const nextStatus = profile.status === 'Active' ? 'Inactive' : 'Active';
    profile.status = nextStatus;
    profile.updatedAt = new Date().toISOString();

    this.saveAnchorProfile(profile);
    return profile;
  }

  deleteAnchorProfile(id: string): boolean {
    this.assertPermission('digital', 'canDelete');
    if (this.currentUser.role === 'Video Editor' || this.currentUser.role === 'Anchor & Presenter') {
      throw new Error('Unauthorized: Only managers or administrators can delete anchor profiles.');
    }
    const existing = this.anchorProfiles.find(a => a.id === id);
    if (!existing) return false;
    this.anchorProfiles = this.anchorProfiles.filter(a => a.id !== id);
    this.logAudit('digital', 'AnchorProfile', id, 'DELETE', [
      { field: 'name', before: existing.name, after: null },
    ], 'Anchor operational profile deleted');
    this.save('omni_anchor_profiles', this.anchorProfiles);
    return true;
  }

  // -------------------------
  // USER ADMINISTRATION & RBAC
  // -------------------------
  getUsers(): UserProfile[] {
    const actor = this.authenticatedUser || this.currentUser;
    const isSuperAdmin = actor?.status === 'Active' && actor?.role === 'Super Admin';
    if (!isSuperAdmin) {
      const own = this.users.find(u => u.id === actor?.id) || actor;
      return own ? [this.stripSecretFields(own)] : [];
    }
    return this.users.map(u => this.stripSecretFields(u));
  }

  saveUser(data: Partial<UserProfile>): UserProfile {
    this.assertSuperAdmin('Unauthorized: Only Super Administrators can create or modify user accounts.');

    const id = data.id || `usr-${Math.floor(10 + Math.random() * 90)}`;
    const before = this.users.find(u => u.id === id);
    const isNew = !before;

    const normalizedEmail = (data.email || before?.email || 'user@omniflow.io').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('A valid email address is required.');
    }
    const duplicate = this.users.find(u => u.id !== id && u.email.trim().toLowerCase() === normalizedEmail);
    if (duplicate) {
      throw new Error(`An account with email "${normalizedEmail}" already exists.`);
    }

    const role = data.role || 'Content Coordinator';
    const defaultPerms = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['Content Coordinator']));

    const rawUser: UserProfile = {
      id,
      name: (data.name || before?.name || 'New User').trim(),
      email: normalizedEmail,
      role,
      avatar: data.avatar ?? before?.avatar ?? '',
      editorId: data.editorId !== undefined ? data.editorId : before?.editorId,
      anchorId: data.anchorId !== undefined ? data.anchorId : before?.anchorId,
      status: data.status || 'Active',
      departments: data.departments !== undefined
        ? data.departments
        : (role === 'Video Editor' || role === 'Anchor & Presenter' ? ['digital'] : ['influencer', 'digital']),
      governanceTabs: data.governanceTabs !== undefined
        ? data.governanceTabs
        : [...(DEFAULT_GOVERNANCE_TABS[role] || [])],
      permissions: data.permissions ? JSON.parse(JSON.stringify(data.permissions)) : defaultPerms,
      passwordHash: data.passwordHash !== undefined ? data.passwordHash : before?.passwordHash,
      passwordUpdatedAt: data.passwordUpdatedAt !== undefined ? data.passwordUpdatedAt : before?.passwordUpdatedAt,
      createdAt: before?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const user = this.normalizeUserProfile(rawUser);

    if (isNew) {
      this.users.unshift(user);
      this.logAudit('digital', 'UserProfile', user.id, 'CREATE', [
        { field: 'name', before: null, after: user.name },
        { field: 'role', before: null, after: user.role },
        { field: 'departments', before: null, after: user.departments.join(', ') || 'None' }
      ], 'Created new user account with RBAC permissions');
    } else {
      this.users = this.users.map(u => u.id === id ? user : u);
      this.logAudit('digital', 'UserProfile', user.id, 'UPDATE', [
        { field: 'role', before: before?.role, after: user.role },
        { field: 'status', before: before?.status, after: user.status },
        { field: 'departments', before: before?.departments?.join(', ') || 'None', after: user.departments.join(', ') || 'None' }
      ], 'Updated user account & RBAC configuration');
    }

    this.save('omni_users', this.users);

    const safeUser = this.stripSecretFields(user);

    // If active user is updated, keep current session in sync
    if (this.currentUser.id === user.id) {
      this.currentUser = safeUser;
      this.save('omni_current_user', this.currentUser);
    }
    if (this.authenticatedUser?.id === user.id) {
      this.authenticatedUser = safeUser;
    }

    return safeUser;
  }

  async setUserPassword(userId: string, newPassword: string): Promise<void> {
    this.assertSuperAdmin('Unauthorized: Only Super Administrators can set or reset passwords for user accounts.');
    if (!newPassword || newPassword.trim().length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const existing = this.users.find(u => u.id === userId);
    if (!existing) {
      throw new Error('User account not found.');
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();
    this.users = this.users.map(u =>
      u.id === userId
        ? { ...u, passwordHash, hasPassword: true, passwordUpdatedAt: now, updatedAt: now }
        : u
    );
    this.save('omni_users', this.users);

    if (this.currentUser.id === userId) {
      this.currentUser = { ...this.currentUser, hasPassword: true, passwordUpdatedAt: now };
      this.save('omni_current_user', this.currentUser);
    }
    if (this.authenticatedUser?.id === userId) {
      this.authenticatedUser = { ...this.authenticatedUser, hasPassword: true, passwordUpdatedAt: now };
    }

    this.logAudit('digital', 'UserProfile', userId, 'UPDATE', [
      { field: 'password', before: '[PROTECTED]', after: '[UPDATED]' },
    ], `Password configured for ${existing.email}`);
  }

  async changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
    const actor = this.authenticatedUser || this.currentUser;
    if (!actor || actor.status !== 'Active') {
      throw new Error('Unauthorized: Active signed-in session required.');
    }
    if (!newPassword || newPassword.trim().length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    const existing = this.users.find(u => u.id === actor.id);
    if (!existing) {
      throw new Error('Account record not found.');
    }

    if (existing.passwordHash) {
      if (!currentPassword) {
        throw new Error('Please enter your current password to set a new password.');
      }
      const ok = await verifyPassword(currentPassword, existing.passwordHash);
      if (!ok) {
        throw new Error('Current password is incorrect.');
      }
    }

    const passwordHash = await hashPassword(newPassword);
    const now = new Date().toISOString();
    this.users = this.users.map(u =>
      u.id === existing.id
        ? { ...u, passwordHash, hasPassword: true, passwordUpdatedAt: now, updatedAt: now }
        : u
    );
    this.save('omni_users', this.users);

    if (this.currentUser.id === existing.id) {
      this.currentUser = { ...this.currentUser, hasPassword: true, passwordUpdatedAt: now };
      this.save('omni_current_user', this.currentUser);
    }
    if (this.authenticatedUser?.id === existing.id) {
      this.authenticatedUser = { ...this.authenticatedUser, hasPassword: true, passwordUpdatedAt: now };
    }

    this.logAudit('digital', 'UserProfile', existing.id, 'UPDATE', [
      { field: 'password', before: '[PROTECTED]', after: '[SELF_UPDATED]' },
    ], `User updated own account password`);
  }

  toggleUserStatus(id: string): UserProfile {
    this.assertSuperAdmin('Unauthorized: Only Super Administrators can suspend or activate user accounts.');
    const user = this.users.find(u => u.id === id);
    if (!user) throw new Error('User account not found');

    const updated: UserProfile = {
      ...user,
      status: user.status === 'Active' ? 'Suspended' : 'Active',
      updatedAt: new Date().toISOString(),
    };

    return this.saveUser(updated);
  }

  deleteUser(id: string): boolean {
    this.assertSuperAdmin('Unauthorized: Only Super Administrators can delete user accounts.');
    const existing = this.users.find(u => u.id === id);
    if (!existing) return false;
    if (existing.id === this.currentUser.id || existing.id === this.authenticatedUser?.id) {
      throw new Error('Cannot delete the currently signed-in account.');
    }
    if (existing.role === 'Super Admin') {
      const remainingActiveAdmins = this.users.filter(
        u => u.id !== id && u.role === 'Super Admin' && u.status === 'Active'
      );
      if (remainingActiveAdmins.length === 0) {
        throw new Error('Cannot delete the last active Super Administrator account.');
      }
    }
    this.users = this.users.filter(u => u.id !== id);
    this.logAudit('digital', 'UserProfile', id, 'DELETE', [
      { field: 'name', before: existing.name, after: null },
      { field: 'email', before: existing.email, after: null },
      { field: 'role', before: existing.role, after: null },
    ], 'User account permanently deleted');
    this.save('omni_users', this.users);
    return true;
  }

  updateUserPermissions(userId: string, system: SystemType, perms: Partial<DepartmentPermissions>): UserProfile {
    this.assertSuperAdmin('Unauthorized: Only Super Administrators can modify user permissions.');
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    const nextPerms = JSON.parse(JSON.stringify(user.permissions));
    nextPerms[system] = {
      ...nextPerms[system],
      ...perms,
    };

    const nextDepts = new Set<SystemType>(user.departments || []);
    if (perms.canAccess === false) {
      nextDepts.delete(system);
    } else if (perms.canAccess === true) {
      nextDepts.add(system);
    }

    return this.saveUser({
      ...user,
      departments: Array.from(nextDepts),
      permissions: nextPerms,
      updatedAt: new Date().toISOString(),
    });
  }

  exportUsersPolicyJson(): string {
    this.assertSuperAdmin();
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      users: this.users,
    }, null, 2);
  }

  importUsersPolicyJson(rawJson: string): { importedCount: number; error?: string } {
    this.assertSuperAdmin();
    try {
      const parsed = JSON.parse(rawJson);
      const list = Array.isArray(parsed) ? parsed : parsed?.users;
      if (!Array.isArray(list) || list.length === 0) {
        return { importedCount: 0, error: 'Invalid policy file: no user records found.' };
      }
      const normalized = list
        .filter((u: any) => u && typeof u.email === 'string' && u.email.includes('@'))
        .map((u: UserProfile) => this.normalizeUserProfile(u));

      const hasAdmin = normalized.some(u => u.role === 'Super Admin' && u.status === 'Active');
      if (!hasAdmin) {
        return { importedCount: 0, error: 'Policy rejected: At least one active Super Admin account is required.' };
      }
      this.users = normalized;
      this.save('omni_users', this.users);
      this.logAudit('digital', 'UserProfile', 'POLICY_IMPORT', 'UPDATE', [
        { field: 'usersCount', before: null, after: normalized.length }
      ], 'Imported RBAC user access policy');
      return { importedCount: normalized.length };
    } catch {
      return { importedCount: 0, error: 'Could not parse JSON policy file.' };
    }
  }

  hasDepartmentAccess(user: UserProfile, system: SystemType): boolean {
    if (!user) return false;
    if (user.status !== 'Active') return false;
    if (user.role === 'Super Admin') return true;
    if (!user.departments || !user.departments.includes(system)) return false;
    return Boolean(user.permissions?.[system]?.canAccess);
  }

  hasPermission(user: UserProfile, system: SystemType, action: keyof DepartmentPermissions): boolean {
    if (!user) return false;
    if (user.status !== 'Active') return false;
    if (user.role === 'Super Admin') return true;
    if (!this.hasDepartmentAccess(user, system)) return false;
    return Boolean(user.permissions?.[system]?.[action]);
  }

  hasTabAccess(user: UserProfile, system: SystemType, tab: string): boolean {
    if (!this.hasDepartmentAccess(user, system)) return false;
    if (user.role === 'Super Admin') return true;
    const perms = user.permissions?.[system];
    if (!perms || perms.canView === false) return false;
    const allowed = perms.allowedTabs;
    if (!Array.isArray(allowed)) return false;
    return allowed.includes(tab);
  }

  hasGovernanceAccess(user: UserProfile, tab: string): boolean {
    if (!user || user.status !== 'Active') return false;
    if (user.role === 'Super Admin') return true;
    // User Administration & all-account access is strictly restricted to Super Admin
    if (tab === 'users') return false;
    return Array.isArray(user.governanceTabs) && user.governanceTabs.includes(tab);
  }

  getFirstAllowedRoute(user: UserProfile): { system: SystemType; tab: string } | null {
    if (!user || user.status !== 'Active') return null;

    if (this.hasDepartmentAccess(user, 'influencer')) {
      const firstInf = INFLUENCER_MODULES.find(m => this.hasTabAccess(user, 'influencer', m.id));
      if (firstInf) return { system: 'influencer', tab: firstInf.id };
    }

    if (this.hasDepartmentAccess(user, 'digital')) {
      const firstDig = DIGITAL_MODULES.find(m => this.hasTabAccess(user, 'digital', m.id));
      if (firstDig) return { system: 'digital', tab: firstDig.id };
    }

    const firstGov = GOVERNANCE_MODULES.find(m => this.hasGovernanceAccess(user, m.id));
    if (firstGov) {
      return {
        system: this.hasDepartmentAccess(user, 'digital') ? 'digital' : 'influencer',
        tab: firstGov.id,
      };
    }

    return null;
  }

  // -------------------------
  // QUARANTINE & SYNC
  // -------------------------
  getQuarantineRecords(): QuarantineRecord[] {
    return [...this.quarantine];
  }

  addQuarantineRecord(record: Omit<QuarantineRecord, 'id' | 'timestamp' | 'status'>): QuarantineRecord {
    const item: QuarantineRecord = {
      ...record,
      id: `QRN-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      status: 'PENDING_REVIEW',
    };
    this.quarantine.unshift(item);
    this.save('omni_quarantine', this.quarantine);
    this.syncConfig.quarantineCount = this.quarantine.filter(q => q.status === 'PENDING_REVIEW').length;
    this.save('omni_sync_config', this.syncConfig);
    return item;
  }

  resolveQuarantine(id: string, action: 'RECONCILED' | 'DISCARDED') {
    if (!this.hasGovernanceAccess(this.currentUser, 'quarantine')) {
      throw new Error('Unauthorized: Quarantine governance access is required.');
    }
    this.quarantine = this.quarantine.map(q => {
      if (q.id === id) {
        return {
          ...q,
          status: action,
          reconciledBy: this.currentUser.name,
          reconciledAt: new Date().toISOString(),
        };
      }
      return q;
    });
    this.save('omni_quarantine', this.quarantine);
    this.syncConfig.quarantineCount = this.quarantine.filter(q => q.status === 'PENDING_REVIEW').length;
    this.save('omni_sync_config', this.syncConfig);
  }

  deleteQuarantineRecord(id: string): boolean {
    if (!this.hasGovernanceAccess(this.currentUser, 'quarantine')) {
      throw new Error('Unauthorized: Quarantine governance access is required to delete quarantine records.');
    }
    const existing = this.quarantine.find(q => q.id === id);
    if (!existing) return false;
    this.quarantine = this.quarantine.filter(q => q.id !== id);
    this.save('omni_quarantine', this.quarantine);
    this.syncConfig.quarantineCount = this.quarantine.filter(q => q.status === 'PENDING_REVIEW').length;
    this.save('omni_sync_config', this.syncConfig);
    this.logAudit('influencer', 'QuarantineRecord', id, 'DELETE', [
      { field: 'sheetTab', before: existing.sheetTab, after: null },
      { field: 'rowNumber', before: existing.rowNumber, after: null },
    ], 'Quarantine record deleted');
    return true;
  }

  getSyncConfig(): GoogleSheetsSyncConfig {
    return { ...this.syncConfig };
  }

  updateSyncConfig(config: Partial<GoogleSheetsSyncConfig>) {
    this.syncConfig = { 
      ...this.syncConfig, 
      ...config,
      influencerWorkbook: config.influencerWorkbook 
        ? { ...this.syncConfig.influencerWorkbook, ...config.influencerWorkbook }
        : this.syncConfig.influencerWorkbook,
      digitalWorkbook: config.digitalWorkbook 
        ? { ...this.syncConfig.digitalWorkbook, ...config.digitalWorkbook }
        : this.syncConfig.digitalWorkbook,
    };
    this.save('omni_sync_config', this.syncConfig);
    return this.syncConfig;
  }

  getDepartments(): string[] {
    return [...this.departments];
  }

  saveDepartment(dep: string) {
    if (!this.hasPermission(this.currentUser, 'influencer', 'canCreate') && !this.hasPermission(this.currentUser, 'influencer', 'canEdit')) {
      throw new Error('Unauthorized: Permission required to add product categories.');
    }
    if (dep && !this.departments.includes(dep)) {
      this.departments.push(dep);
      this.save('omni_departments', this.departments);
    }
  }

  getFranchises(): string[] {
    return [...this.franchises];
  }

  saveFranchise(fran: string) {
    if (!this.hasPermission(this.currentUser, 'influencer', 'canCreate') && !this.hasPermission(this.currentUser, 'influencer', 'canEdit')) {
      throw new Error('Unauthorized: Permission required to add franchises.');
    }
    if (fran && !this.franchises.includes(fran)) {
      this.franchises.push(fran);
      this.save('omni_franchises', this.franchises);
    }
  }

  getCustomFields(): any[] {
    return [...this.customFields];
  }

  saveCustomField(field: any) {
    const idx = this.customFields.findIndex(f => f.id === field.id);
    if (idx >= 0) {
      this.customFields[idx] = field;
    } else {
      this.customFields.push({ ...field, id: field.id || `CF-${Math.floor(100 + Math.random() * 900)}` });
    }
    this.save('omni_custom_fields', this.customFields);
  }

  // Reset database to initial clean state
  resetAllToFactoryDemo() {
    this.influencers = [...INITIAL_INFLUENCERS];
    this.campaigns = [...INITIAL_CAMPAIGNS];
    this.deliverables = [...INITIAL_DELIVERABLES];
    this.payments = [...INITIAL_PAYMENTS];
    this.followUps = [...INITIAL_FOLLOWUPS];
    this.performances = [...INITIAL_PERFORMANCE];
    this.contentMaster = [...INITIAL_CONTENT_MASTER];
    this.editorCapacity = [...INITIAL_EDITOR_CAPACITY];
    this.channelSchedules = [...INITIAL_CHANNEL_SCHEDULES];
    this.anchorSchedules = [...INITIAL_ANCHOR_SCHEDULES];
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.quarantine = [...INITIAL_QUARANTINE];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.syncConfig = JSON.parse(JSON.stringify(INITIAL_SYNC_CONFIG));
    this.editorProfiles = [...INITIAL_EDITOR_PROFILES];
    this.anchorProfiles = [...INITIAL_ANCHOR_PROFILES];
    this.users = [...CURRENT_USERS].map(u => this.normalizeUserProfile(u));
    this.currentUser = this.users[0];
    this.authenticatedUser = null;

    this.save('omni_influencers', this.influencers);
    this.save('omni_campaigns', this.campaigns);
    this.save('omni_deliverables', this.deliverables);
    this.save('omni_payments', this.payments);
    this.save('omni_followups', this.followUps);
    this.save('omni_performances', this.performances);
    this.save('omni_content', this.contentMaster);
    this.save('omni_capacity', this.editorCapacity);
    this.save('omni_channel_sched', this.channelSchedules);
    this.save('omni_anchor_sched', this.anchorSchedules);
    this.save('omni_audit', this.auditLogs);
    this.save('omni_quarantine', this.quarantine);
    this.save('omni_notifs', this.notifications);
    this.save('omni_sync_config', this.syncConfig);
    this.save('omni_editor_profiles', this.editorProfiles);
    this.save('omni_anchor_profiles', this.anchorProfiles);
    this.save('omni_users', this.users);
    this.save('omni_current_user', this.currentUser);
  }
}

export const omniStore = new OmniStorage();
