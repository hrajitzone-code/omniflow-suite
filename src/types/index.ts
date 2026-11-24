export type SystemType = 'influencer' | 'digital';

export type UserRole = 
  | 'Super Admin'
  | 'Campaign Manager'
  | 'Finance & Approver'
  | 'Content Coordinator'
  | 'Video Editor'
  | 'Anchor & Presenter';

export const INFLUENCER_MODULES = [
  { id: 'dashboard', label: 'Executive Dashboard' },
  { id: 'influencers', label: 'Influencer Master' },
  { id: 'campaigns', label: 'Campaigns & Deliverables' },
  { id: 'payments', label: 'Payments & Approvals' },
  { id: 'followups', label: 'Follow-ups Tracker' },
  { id: 'performance', label: 'Performance Analytics' },
] as const;

export const DIGITAL_MODULES = [
  { id: 'digital_dashboard', label: 'Studio Dashboard' },
  { id: 'content_master', label: 'Central Content Master' },
  { id: 'editor_workspace', label: 'Editor Workspace' },
  { id: 'editor_capacity', label: 'Editor Targets & Capacity' },
  { id: 'channel_schedules', label: 'Channel Schedules' },
  { id: 'anchor_schedules', label: 'Anchor Schedules' },
] as const;

export const GOVERNANCE_MODULES = [
  { id: 'users', label: 'User Admin & RBAC' },
  { id: 'sync', label: 'Google Sheets Live Sync' },
  { id: 'audit', label: 'Audit & Conflict Trail' },
  { id: 'quarantine', label: 'Quarantine Console' },
] as const;

export interface DepartmentPermissions {
  canAccess: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canExport: boolean;
  viewSensitiveFields: boolean;
  allowedTabs?: string[]; // Explicit list of approved module tab IDs inside this department
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  editorId?: string; // links to editor profile / capacity
  anchorId?: string; // links to anchor profile / schedule
  status: 'Active' | 'Suspended';
  departments: SystemType[]; // e.g. ['influencer'], ['digital'], or ['influencer', 'digital']
  governanceTabs?: string[]; // Explicit list of approved governance tabs ('users', 'sync', 'audit', 'quarantine')
  permissions: {
    influencer: DepartmentPermissions;
    digital: DepartmentPermissions;
  };
  passwordHash?: string; // PBKDF2-SHA256 salted hash (internal storage only; stripped from public views)
  hasPassword?: boolean; // Safe UI flag indicating whether email/password login is configured
  passwordUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------
// INFLUENCER MANAGEMENT DATA MODELS
// ------------------------------------

export const DEFAULT_DEPARTMENTS = [
  'Kids',
  'Readymade',
  'Dress',
  'Saree',
  'Lehenga',
  'Gown',
  'Dupatta',
  'Top',
  'Nighty',
  'Undergarments',
  'Kurti',
  'Suit',
  'Blouse',
  'Ethnic Wear',
  'Western Wear',
  'Accessories',
  'Other'
];

export const DEFAULT_FRANCHISES = [
  'Ajit Zone Surat Central',
  'Ajit Zone Mumbai Hub',
  'Ajit Zone Delhi West',
  'Ajit Zone Bengaluru North',
  'Ajit Zone Jaipur Flagship',
  'Ajit Zone Kolkata Outlet'
];

export const CAMPAIGN_OBJECTIVES = [
  'Brand Awareness',
  'Product Promotion',
  'Store Visit',
  'Product Shoot',
  'Reel Promotion',
  'Festival Campaign',
  'Sales Generation',
  'New Collection Launch',
  'Franchise Promotion'
];

export type InfluencerStage = 'Draft' | 'Campaign-Ready' | 'Payment-Ready';
export type InfluencerStatus = 'Active' | 'Inactive' | 'Pending' | 'On Hold' | 'Blacklisted';
export type InfluencerType = 'Instagram' | 'YouTube' | 'Facebook' | 'Multi-Platform';
export type CollaborationType = 'Paid' | 'Barter' | 'Gifted' | 'Affiliate' | 'Exchange';
export type BusinessClassification = 'Ajit Zone' | 'Franchise';

export interface InfluencerRecord {
  id: string; // e.g., INF-001
  name: string;
  stage: InfluencerStage;
  phone: string;
  email: string;
  city: string;
  state?: string;
  address: string;
  businessTypes: BusinessClassification[]; // ['Ajit Zone', 'Franchise']
  franchises: string[]; // e.g. ['Ajit Zone Surat Central']
  departments: string[]; // e.g. ['Saree', 'Lehenga']
  influencerStatus: InfluencerStatus;
  influencerType: InfluencerType;
  collaborationType: CollaborationType;
  gender?: 'Female' | 'Male' | 'Other';
  socialPlatforms: {
    instagram?: { handle: string; followers: number; profileUrl?: string };
    youtube?: { handle: string; subscribers: number; channelUrl?: string };
    twitter?: { handle: string; followers: number };
    linkedin?: { handle: string; followers: number };
    facebook?: { handle: string; followers: number; profileUrl?: string };
  };
  contentRates: {
    reelRate: number;
    youtubeVideoRate: number;
    storyRate: number;
    staticPostRate: number;
  };
  panNumber: string;
  govIdType: 'Aadhaar' | 'Passport' | 'Voter ID' | 'Driving License' | 'Other';
  govIdNumber: string;
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    upiId?: string;
  };
  isBlacklisted: boolean;
  blacklistReason?: string;
  internalRating: number; // 1-5
  isPreferred: boolean;
  remarks: string;
  lastVisitDate?: string;
  assignedTeamMember?: string;
  // Performance metrics tracking
  totalReels?: number;
  totalPosts?: number;
  totalStories?: number;
  totalViews?: number;
  totalReach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  engagementRate?: number; // percentage e.g. 4.5
  leadsGenerated?: number;
  storeVisits?: number;
  salesGenerated?: number;
  customFieldValues?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'Draft' | 'Planned' | 'Active' | 'Completed' | 'Cancelled' | 'On Hold';

export interface DeliverableItem {
  id: string; // e.g. DEL-001
  campaignId: string;
  title: string;
  type: 'Instagram Reel' | 'YouTube Long-form' | 'YouTube Short' | 'Static Post' | 'Story Set' | 'Live Appearance';
  isRequired: boolean;
  status: 'Pending' | 'Shot Completed' | 'Draft Submitted' | 'Revision Requested' | 'Approved' | 'Posted';
  shootDate?: string;
  expectedPostingDate: string;
  actualPostingDate?: string;
  publishedUrl?: string;
  remarks?: string;
}

export interface CampaignRecord {
  id: string; // e.g., CMP-001
  name: string;
  businessTypes: BusinessClassification[];
  franchises: string[];
  departments: string[];
  influencerId: string;
  influencerIds?: string[];
  influencerName: string;
  influencerNames?: string[];
  coordinator: string;
  assignedTeamMember: string;
  objective: string;
  department: string;
  startDate?: string;
  endDate?: string;
  month?: string; // e.g. 'October', 'November'
  year?: string; // e.g. '2026'
  visitDate: string;
  agreedAmount: number;
  budget?: number;
  advancePaid: number;
  collaborationType: CollaborationType;
  // Outstanding balance calculated dynamically: agreedAmount - totalApprovedPayments
  status: CampaignStatus;
  deliverablesCount: number;
  completedDeliverablesCount: number;
  completionDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  businessTypes: string[];
  franchises: string[];
  departments: string[];
  statuses: string[];
  influencerTypes: string[];
  collaborationTypes: string[];
  startDate?: string;
  endDate?: string;
  months: string[];
  years: string[];
  campaignStatuses: string[];
  paymentStatuses: string[];
  contentStatuses: string[];
  states: string[];
  genders: string[];
  minBudget?: number;
  maxBudget?: number;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  sortBy: 'date' | 'followers' | 'engagement' | 'budget' | 'performance' | 'name';
  sortOrder: 'asc' | 'desc';
}

export const CANONICAL_PAYMENT_TYPES = [
  'Advance',
  'Milestone 1',
  'Milestone 2',
  'Final Settlement',
  'Reimbursement',
  'Refund / Reversal',
  'Correction',
] as const;

export type PaymentType = typeof CANONICAL_PAYMENT_TYPES[number];

export type PaymentStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';

export interface PaymentRecord {
  id: string; // e.g., PAY-001
  campaignId: string;
  campaignName: string;
  influencerId: string;
  influencerName: string;
  amount: number;
  paymentType: PaymentType | string;
  status: PaymentStatus;
  requestedBy: string;
  approvedBy?: string;
  approvalDate?: string;
  paymentDate?: string;
  transactionReference?: string;
  paymentProofUrl?: string;
  remarks?: string;
  isCorrection?: boolean;
  correctionReason?: string;
  createdAt: string;
}

export type FollowUpStatus = 'Pending' | 'In Progress' | 'Completed' | 'Rescheduled' | 'Escalated';

export interface FollowUpRecord {
  id: string; // e.g. FOL-001
  entityType: 'influencer' | 'campaign' | 'deliverable';
  entityId: string;
  entityName: string;
  assignedTo: string;
  date: string;
  nextFollowUpDate: string;
  type: 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Site Visit';
  purpose: string;
  status: FollowUpStatus;
  remarks: string;
  createdAt: string;
}

export interface PerformanceRecord {
  id: string; // e.g. PERF-001
  deliverableId: string;
  campaignId: string;
  campaignName: string;
  influencerName: string;
  contentTitle: string;
  platform: string;
  publishedUrl: string;
  postingDate: string;
  delayDays: number; // calculated vs expected posting date
  viewsDay7: number;
  viewsDay15: number;
  viewsDay30: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  allocatedSpend: number;
  // CPV = allocatedSpend / viewsDay30 (or max views)
  // Engagement = ((likes + comments + shares + saves) / reach or views) * 100
  performanceScore: number; // 0-100 calculated rating
  notes?: string;
  updatedAt: string;
}

// ------------------------------------
// DIGITAL DATA MANAGEMENT DATA MODELS
// ------------------------------------

export type RecordingLifecycle = 'Planned' | 'Scheduled' | 'Recorded' | 'Raw Footage Received';

export type EditingWorkflowStatus = 
  | 'Assigned' 
  | 'Raw Awaited' 
  | 'Raw Received' 
  | 'Editing in Progress' 
  | 'Submitted for Review' 
  | 'Changes Requested' 
  | 'Approved / Ready for Posting';

export interface ContentMasterRecord {
  id: string; // Topic ID e.g., TOP-001
  title: string;
  department: string;
  contentType: 'Long-form Video' | 'Shorts / Reel' | 'Podcast' | 'Infographic / Carousel' | 'Special Docu';
  anchor: string;
  recordingDate: string;
  recordingStatus: RecordingLifecycle;
  
  // Handover tracking
  cameraman: string;
  receiver: string;
  handoverDate?: string;
  rawFootageLocationUrl: string; // Drive link or external drive tag
  
  // Editing linkage
  assignedEditorId?: string;
  assignedEditorName?: string;
  editingStatus: EditingWorkflowStatus;
  editSubmissionUrl?: string;
  reviewNotes?: string;
  
  // Channels and Categories
  categories: string[]; // e.g. ['Finance', 'Tech', 'Education']
  channels: string[];   // e.g. ['YouTube Main', 'Instagram Reels', 'LinkedIn']
  
  remarks: string;
  submittedBy: string;
  isManagerApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EditorProfile {
  id: string; // e.g., ED-001
  name: string;
  email: string;
  department: string;
  status: 'Active' | 'Inactive';
  workingDays: number;
  leaveDays: number;
  dailyCapacityPoints: number;
  longVideoTarget: number;
  shortsTarget: number;
  monthlyTargetVideos?: number;
  assignedChannels?: string[];
  shiftSchedule?: string;
  skills?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EditorCapacityRecord {
  id: string;
  editorId: string;
  editorName: string;
  month: string; // '2026-11'
  workingDays: number;
  leaveDays: number;
  dailyCapacityPoints: number; // e.g. 5 points/day
  longVideoTarget: number;
  shortsTarget: number;
  // Actuals
  longVideoCompleted: number;
  shortsCompleted: number;
  activeAssignedPoints: number;
  status?: 'Active' | 'Inactive';
}

export interface AnchorProfile {
  id: string; // e.g., ANC-PROF-001
  name: string;
  email: string;
  department: string;
  primaryStudio: string;
  status: 'Active' | 'Inactive';
  primaryChannel?: string;
  assignedCategory?: string;
  monthlyTargetShoots?: number;
  preferredShifts?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ChannelPostingStatus = 'Scheduled' | 'Queued' | 'Published' | 'Postponed' | 'Failed';

export interface ChannelScheduleTask {
  id: string; // e.g. POST-001
  contentId: string;
  contentTitle: string;
  channelName: string; // 'YouTube Main', 'YouTube Shorts', 'Instagram Reels', 'Facebook', 'LinkedIn'
  scheduledDate: string;
  scheduledTime: string;
  status: ChannelPostingStatus;
  publishedUrl?: string;
  views?: number;
  likes?: number;
  delayReason?: string;
  overriddenLimitsNotice?: string;
}

export interface ChannelConfig {
  channelName: string;
  allowedDays: string[]; // ['Monday', 'Wednesday', 'Friday']
  recommendedTimes: string[]; // ['18:00', '20:00']
  dailyLimit: number;
}

export type AnchorScheduleStatus = 'Assigned' | 'Confirmed' | 'Completed' | 'Not Done' | 'Reschedule Requested';

export interface AnchorScheduleRecord {
  id: string; // e.g. ANC-001
  anchorId?: string;
  anchorName: string;
  shootDate: string;
  shootTimeSlot: string; // e.g. '10:00 AM - 01:00 PM'
  topicId?: string;
  topicTitle?: string;
  department: string;
  studioOrLocation: string;
  status: AnchorScheduleStatus;
  originalShootDate?: string;
  proposedRevisedDate?: string;
  rescheduleReason?: string;
  managerNotes?: string;
  assignedBy: string;
  updatedAt: string;
}

// ------------------------------------
// AUDIT, QUARANTINE & SYNC
// ------------------------------------

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  userRole: UserRole;
  system: SystemType;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVAL' | 'STATUS_CHANGE' | 'SHEET_SYNC' | 'EXCEPTION_OVERRIDE';
  reason?: string;
  changes: {
    field: string;
    before: any;
    after: any;
  }[];
}

export interface QuarantineRecord {
  id: string;
  timestamp: string;
  sheetTab: string;
  rowNumber: number;
  rawPayload: Record<string, any>;
  validationErrors: string[];
  status: 'PENDING_REVIEW' | 'RECONCILED' | 'DISCARDED';
  reconciledBy?: string;
  reconciledAt?: string;
}

export interface WorkbookSyncState {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncTimestamp: string | null;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'CONFLICT_DETECTED';
  conflictCount: number;
  quarantineCount: number;
  sheetTabs: {
    name: string;
    rowsCount: number;
    lastUpdated: string;
  }[];
}

export interface GoogleSheetsSyncConfig {
  influencerWorkbook: WorkbookSyncState;
  digitalWorkbook: WorkbookSyncState;
  // Legacy / top-level compatibility fields
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  lastSyncTimestamp: string | null;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'CONFLICT_DETECTED';
  conflictCount: number;
  quarantineCount: number;
  autoSyncIntervalSec: number;
  sheetTabs: {
    name: string;
    rowsCount: number;
    lastUpdated: string;
  }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'success';
  system: SystemType | 'system';
  timestamp: string;
  isRead: boolean;
  linkAction?: {
    system: SystemType;
    tab: string;
    itemId?: string;
  };
}
