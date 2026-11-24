import * as XLSX from 'xlsx';
import {
  SystemType,
  UserProfile,
  UserRole,
  BusinessClassification,
  CollaborationType,
  InfluencerStatus,
  InfluencerType,
  CampaignStatus,
  DeliverableItem,
  FollowUpRecord,
  ContentMasterRecord,
  ChannelScheduleTask,
  AnchorScheduleRecord,
} from '../types';
import { omniStore } from './storageService';
import { findStateForCity } from '../data/indiaLocations';
import { sanitizeExternalUrl } from '../utils/securityUtils';

export interface ExcelColumnSpec {
  header: string;
  required?: boolean;
  example: string;
  notes: string;
}

export interface ExcelSheetTemplateSpec {
  sheetName: string;
  columns: ExcelColumnSpec[];
}

export interface ExcelModuleConfig {
  id: string;
  label: string;
  fileName: string;
  system: SystemType | 'governance';
  sheets: ExcelSheetTemplateSpec[];
  description: string;
}

export interface ParsedExcelSheet {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
}

export interface ParsedExcelWorkbook {
  fileName: string;
  sheets: ParsedExcelSheet[];
  totalRows: number;
}

export interface ExcelImportResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
  details: string[];
}

// ---------------------------------------------------------------------------
// COLUMN SPECS PER DOMAIN
// ---------------------------------------------------------------------------

const INFLUENCER_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Name', required: true, example: 'Priya Fashion Studio', notes: 'Full creator or brand name (Required)' },
  { header: 'Phone', required: true, example: '9876543210', notes: '10-digit contact number (Required)' },
  { header: 'Email', required: true, example: 'priya@creator.in', notes: 'Valid email address (Required)' },
  { header: 'State', required: true, example: 'Gujarat', notes: 'Indian State / UT (e.g. Gujarat, Maharashtra, Delhi)' },
  { header: 'City', required: true, example: 'Surat', notes: 'Standardized City name (e.g. Surat, Mumbai, Jaipur)' },
  { header: 'Address', example: 'Ring Road, Textile Market', notes: 'Optional street address' },
  { header: 'Business_Types', required: true, example: 'Ajit Zone, Franchise', notes: 'Comma-separated: Ajit Zone and/or Franchise' },
  { header: 'Franchises', example: 'Ajit Zone Surat Central', notes: 'Comma-separated franchise names (if Franchise selected)' },
  { header: 'Departments', required: true, example: 'Saree, Lehenga, Kurti', notes: 'Comma-separated product categories' },
  { header: 'Status', example: 'Active', notes: 'Active | Inactive | Pending | On Hold | Blacklisted' },
  { header: 'Influencer_Type', example: 'Instagram', notes: 'Instagram | YouTube | Facebook | Multi-Platform' },
  { header: 'Collaboration_Type', example: 'Paid', notes: 'Paid | Barter | Gifted | Affiliate | Exchange' },
  { header: 'Gender', example: 'Female', notes: 'Female | Male | Other' },
  { header: 'Instagram_Handle', example: '@priyafashion', notes: 'Instagram username' },
  { header: 'Instagram_Followers', example: '125000', notes: 'Numeric follower count' },
  { header: 'Instagram_URL', example: 'https://www.instagram.com/priyafashion', notes: 'Optional https:// profile link' },
  { header: 'YouTube_Handle', example: 'PriyaStylesYT', notes: 'YouTube channel name/handle' },
  { header: 'YouTube_Subscribers', example: '45000', notes: 'Numeric subscriber count' },
  { header: 'YouTube_URL', example: 'https://www.youtube.com/@priyastyles', notes: 'Optional https:// channel link' },
  { header: 'Reel_Rate', example: '15000', notes: 'Standard Instagram Reel rate in INR' },
  { header: 'YouTube_Video_Rate', example: '25000', notes: 'Standard YouTube video rate in INR' },
  { header: 'Story_Rate', example: '5000', notes: 'Standard Story rate in INR' },
  { header: 'Static_Post_Rate', example: '8000', notes: 'Standard Static Post rate in INR' },
  { header: 'Engagement_Rate', example: '4.8', notes: 'Engagement rate percentage (number)' },
  { header: 'Internal_Rating', example: '4.5', notes: 'Rating from 1 to 5' },
  { header: 'Assigned_Team_Member', example: 'Campaign Lead', notes: 'Internal coordinator name' },
  { header: 'Remarks', example: 'Strong bridal & festive saree conversion', notes: 'Optional notes' },
];

const CAMPAIGN_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Campaign_ID', example: '', notes: 'Leave blank to create new, or provide existing Campaign ID to update' },
  { header: 'Campaign_Name', required: true, example: 'Diwali Bridal Saree Launch', notes: 'Campaign title (Required)' },
  { header: 'Influencer_Name_Or_ID', required: true, example: 'Priya Fashion Studio', notes: 'Existing Influencer Name or ID (Required)' },
  { header: 'Business_Types', example: 'Ajit Zone', notes: 'Comma-separated: Ajit Zone, Franchise' },
  { header: 'Franchises', example: 'Ajit Zone Surat Central', notes: 'Comma-separated franchises (optional)' },
  { header: 'Departments', example: 'Saree, Lehenga', notes: 'Comma-separated departments' },
  { header: 'Objective', example: 'Festival Campaign', notes: 'Brand Awareness | Product Promotion | Store Visit | Product Shoot | Reel Promotion | Festival Campaign | Sales Generation | New Collection Launch | Franchise Promotion' },
  { header: 'Collaboration_Type', example: 'Paid', notes: 'Paid | Barter | Gifted | Affiliate | Exchange' },
  { header: 'Status', example: 'Active', notes: 'Draft | Planned | Active | Completed | Cancelled | On Hold' },
  { header: 'Agreed_Amount', example: '25000', notes: 'Total agreed campaign budget in INR' },
  { header: 'Start_Date', example: '2026-11-01', notes: 'YYYY-MM-DD' },
  { header: 'End_Date', example: '2026-11-30', notes: 'YYYY-MM-DD' },
  { header: 'Month', example: 'November', notes: 'January to December' },
  { header: 'Year', example: '2026', notes: '4-digit year' },
  { header: 'Assigned_Team_Member', example: 'Campaign Lead', notes: 'Assigned coordinator name' },
  { header: 'Remarks', example: '2 Reels + 1 Story set', notes: 'Optional remarks' },
];

const DELIVERABLE_LINK_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Campaign_Name_Or_ID', required: true, example: 'Diwali Bridal Saree Launch', notes: 'Campaign Name or Campaign ID (Required)' },
  { header: 'Reel_Video_Title', required: true, example: 'Diwali Saree Draping Reel #1', notes: 'Individual Reel / Video title (Required)' },
  { header: 'Type', example: 'Instagram Reel', notes: 'Instagram Reel | YouTube Long-form | YouTube Short | Static Post | Story Set | Live Appearance' },
  { header: 'Status', example: 'Posted', notes: 'Pending | Shot Completed | Draft Submitted | Revision Requested | Approved | Posted' },
  { header: 'Expected_Posting_Date', example: '2026-11-10', notes: 'YYYY-MM-DD' },
  { header: 'Actual_Posting_Date', example: '2026-11-11', notes: 'YYYY-MM-DD' },
  { header: 'Posted_Link_URL', example: 'https://www.instagram.com/reel/DIWALI01/', notes: 'Live https:// URL (optional if not yet posted)' },
  { header: 'Platform', example: 'Instagram', notes: 'Instagram | YouTube | Facebook | LinkedIn | Twitter / X' },
  { header: 'Views_Day7', example: '25000', notes: 'Numeric Day 7 views' },
  { header: 'Views_Day15', example: '52000', notes: 'Numeric Day 15 views' },
  { header: 'Views_Day30', example: '88000', notes: 'Numeric Day 30 views' },
  { header: 'Likes', example: '5400', notes: 'Numeric likes count' },
  { header: 'Comments', example: '240', notes: 'Numeric comments count' },
  { header: 'Shares', example: '410', notes: 'Numeric shares count' },
  { header: 'Saves', example: '720', notes: 'Numeric saves count' },
  { header: 'Reach', example: '79000', notes: 'Numeric total reach' },
  { header: 'Allocated_Spend', example: '12500', notes: 'Allocated spend for this link in INR' },
  { header: 'Notes', example: 'High save ratio on bridal drape', notes: 'Optional notes' },
];

const PAYMENT_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Campaign_ID_Or_Name', required: true, example: 'Diwali Bridal Saree Launch', notes: 'Existing Campaign ID or Campaign Name (Required)' },
  { header: 'Influencer_Name', example: 'Priya Fashion Studio', notes: 'Creator name (auto-filled from campaign if omitted)' },
  { header: 'Payment_Type', required: true, example: 'Advance', notes: 'Advance | Milestone 1 | Milestone 2 | Final Settlement | Reimbursement | Correction | Refund / Reversal' },
  { header: 'Amount', required: true, example: '10000', notes: 'Positive numeric amount in INR (Required; negative/zero rejected)' },
  { header: 'Status', example: 'Submitted', notes: 'Draft | Submitted | Approved | Paid (Approvals require canApprove)' },
  { header: 'Payment_Mode', example: 'NEFT', notes: 'NEFT | IMPS | UPI | RTGS | Cheque' },
  { header: 'UTR_Reference', example: 'UTR20261105001', notes: 'Bank reference / UTR number (if Paid)' },
  { header: 'Payment_Date', example: '2026-11-05', notes: 'YYYY-MM-DD' },
  { header: 'Remarks', example: '50% advance against PO', notes: 'Optional notes' },
];

const FOLLOWUP_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Entity_Type', example: 'influencer', notes: 'influencer | campaign | deliverable' },
  { header: 'Entity_ID', example: '', notes: 'Optional record ID' },
  { header: 'Entity_Name', required: true, example: 'Priya Fashion Studio', notes: 'Creator or Campaign Name (Required)' },
  { header: 'Assigned_To', example: 'Campaign Coordinator', notes: 'Team member assigned' },
  { header: 'Date', example: '2026-11-05', notes: 'Follow-up logged date (YYYY-MM-DD)' },
  { header: 'Next_FollowUp_Date', required: true, example: '2026-11-08', notes: 'Next action date (YYYY-MM-DD)' },
  { header: 'Type', example: 'WhatsApp', notes: 'Call | WhatsApp | Email | Meeting | Site Visit' },
  { header: 'Purpose', required: true, example: 'Confirm Reel #1 draft submission', notes: 'Follow-up purpose (Required)' },
  { header: 'Status', example: 'Pending', notes: 'Pending | In Progress | Completed | Rescheduled | Escalated' },
  { header: 'Remarks', example: 'Draft promised by 6 PM', notes: 'Optional remarks' },
];

const PERFORMANCE_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Campaign_ID_Or_Name', required: true, example: 'Diwali Bridal Saree Launch', notes: 'Campaign ID or Campaign Name (Required)' },
  { header: 'Deliverable_ID', example: '', notes: 'Optional Deliverable ID to link' },
  { header: 'Influencer_Name', example: 'Priya Fashion Studio', notes: 'Creator name (auto-filled from campaign if omitted)' },
  { header: 'Content_Title', required: true, example: 'Diwali Saree Reel #1', notes: 'Reel / Video title or label (Required)' },
  { header: 'Platform', example: 'Instagram', notes: 'Instagram | YouTube | Facebook | LinkedIn | Twitter / X' },
  { header: 'Posted_Link_URL', required: true, example: 'https://www.instagram.com/reel/DIWALI01/', notes: 'Valid https:// live link (Required)' },
  { header: 'Posting_Date', example: '2026-11-11', notes: 'YYYY-MM-DD' },
  { header: 'Views_Day7', example: '25000', notes: 'Day 7 views' },
  { header: 'Views_Day15', example: '52000', notes: 'Day 15 views' },
  { header: 'Views_Day30', example: '88000', notes: 'Day 30 views' },
  { header: 'Likes', example: '5400', notes: 'Likes count' },
  { header: 'Comments', example: '240', notes: 'Comments count' },
  { header: 'Shares', example: '410', notes: 'Shares count' },
  { header: 'Saves', example: '720', notes: 'Saves count' },
  { header: 'Reach', example: '79000', notes: 'Total reach' },
  { header: 'Allocated_Spend', example: '12500', notes: 'Spend in INR' },
  { header: 'Notes', example: 'Strong engagement', notes: 'Optional notes' },
];

const CONTENT_MASTER_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Topic_ID', example: '', notes: 'Leave blank to create new, or provide existing Topic ID to update' },
  { header: 'Title', required: true, example: 'Winter Saree Wholesale Guide 2026', notes: 'Video / content topic title (Required)' },
  { header: 'Department', example: 'Textile & Fashion', notes: 'Production department' },
  { header: 'Content_Type', example: 'Long-form Video', notes: 'Long-form Video | Shorts / Reel | Podcast | Infographic / Carousel | Special Docu' },
  { header: 'Anchor', example: 'Priya Verma', notes: 'Anchor / presenter name' },
  { header: 'Recording_Date', example: '2026-11-12', notes: 'YYYY-MM-DD' },
  { header: 'Recording_Status', example: 'Recorded', notes: 'Planned | Scheduled | Recorded | Raw Footage Received' },
  { header: 'Cameraman', example: 'Amit Patel', notes: 'Cameraman name' },
  { header: 'Receiver', example: 'Studio Desk', notes: 'Footage receiver name' },
  { header: 'Raw_Footage_URL', example: 'https://drive.google.com/drive/folders/example', notes: 'Valid https:// URL or storage tag' },
  { header: 'Assigned_Editor_Name', example: 'Rohan Sharma', notes: 'Assigned video editor' },
  { header: 'Editing_Status', example: 'Assigned', notes: 'Assigned | Raw Awaited | Raw Received | Editing in Progress | Submitted for Review | Changes Requested | Approved / Ready for Posting' },
  { header: 'Categories', example: 'Saree, Wholesale', notes: 'Comma-separated categories' },
  { header: 'Channels', example: 'YouTube Main, Instagram Reels', notes: 'Comma-separated target channels' },
  { header: 'Remarks', example: 'Include showroom B-roll', notes: 'Optional remarks' },
];

const EDITOR_WORKSPACE_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Topic_ID', required: true, example: 'TOP-2026-001', notes: 'Existing Topic ID from Central Content Master (Required)' },
  { header: 'Title', example: 'Winter Saree Wholesale Guide 2026', notes: 'Optional reference title' },
  { header: 'Editing_Status', required: true, example: 'Submitted for Review', notes: 'Assigned | Raw Awaited | Raw Received | Editing in Progress | Submitted for Review | Changes Requested | Approved / Ready for Posting' },
  { header: 'Edit_Submission_URL', example: 'https://drive.google.com/file/d/example', notes: 'Valid https:// review cut URL' },
  { header: 'Review_Notes', example: 'Color grade and captions completed', notes: 'Editor / reviewer notes' },
  { header: 'Remarks', example: 'Ready for final check', notes: 'Optional remarks' },
];

const EDITOR_CAPACITY_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Editor_ID', example: '', notes: 'Leave blank to create new, or provide existing Editor ID to update' },
  { header: 'Name', required: true, example: 'Rohan Sharma', notes: 'Editor full name (Required)' },
  { header: 'Email', example: 'rohan.editor@studio.com', notes: 'Editor email (does not auto-grant login)' },
  { header: 'Department', example: 'Video Production', notes: 'Department name' },
  { header: 'Status', example: 'Active', notes: 'Active | Inactive' },
  { header: 'Working_Days', example: '22', notes: 'Monthly working days' },
  { header: 'Leave_Days', example: '1', notes: 'Planned leave days' },
  { header: 'Daily_Capacity_Points', example: '5', notes: 'Daily capacity points' },
  { header: 'Long_Video_Target', example: '12', notes: 'Monthly long-form target' },
  { header: 'Shorts_Target', example: '28', notes: 'Monthly shorts/reels target' },
  { header: 'Monthly_Target_Videos', example: '40', notes: 'Total monthly video target' },
  { header: 'Assigned_Channels', example: 'YouTube Main, Instagram Reels', notes: 'Comma-separated channels' },
  { header: 'Shift_Schedule', example: 'Day Shift (10 AM - 6 PM)', notes: 'Shift timing' },
  { header: 'Skills', example: 'Premiere Pro, After Effects', notes: 'Comma-separated skills' },
];

const CHANNEL_SCHEDULE_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Content_ID', example: 'TOP-2026-001', notes: 'Optional Topic ID reference' },
  { header: 'Content_Title', required: true, example: 'Winter Saree Wholesale Guide 2026', notes: 'Video / post title (Required)' },
  { header: 'Channel_Name', required: true, example: 'YouTube Main', notes: 'YouTube Main | YouTube Shorts | Instagram Reels | Facebook | LinkedIn' },
  { header: 'Scheduled_Date', required: true, example: '2026-11-15', notes: 'YYYY-MM-DD (Required)' },
  { header: 'Scheduled_Time', example: '18:00', notes: 'HH:MM (24-hour format)' },
  { header: 'Status', example: 'Scheduled', notes: 'Scheduled | Queued | Published | Postponed | Failed' },
  { header: 'Published_URL', example: 'https://youtu.be/example', notes: 'Optional https:// live URL' },
  { header: 'Views', example: '12000', notes: 'Numeric views' },
  { header: 'Likes', example: '850', notes: 'Numeric likes' },
  { header: 'Delay_Reason', example: '', notes: 'Optional delay reason' },
];

const ANCHOR_SCHEDULE_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Anchor_Name', required: true, example: 'Priya Verma', notes: 'Anchor / Presenter name (Required)' },
  { header: 'Shoot_Date', required: true, example: '2026-11-14', notes: 'YYYY-MM-DD (Required)' },
  { header: 'Shoot_Time_Slot', example: '10:00 AM - 01:00 PM', notes: 'Shift / time slot' },
  { header: 'Topic_Title', required: true, example: 'Festive Collection Walkthrough', notes: 'Shoot topic title (Required)' },
  { header: 'Department', example: 'Production', notes: 'Department name' },
  { header: 'Studio_Or_Location', example: 'Studio Floor A', notes: 'Studio floor or location' },
  { header: 'Status', example: 'Assigned', notes: 'Assigned | Confirmed | Completed | Not Done | Reschedule Requested' },
  { header: 'Manager_Notes', example: 'Wardrobe ready by 9:30 AM', notes: 'Optional manager instructions' },
];

const USER_ADMIN_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Name', required: true, example: 'Meera Joshi', notes: 'User full name (Required)' },
  { header: 'Email', required: true, example: 'meera@company.com', notes: 'Approved Google sign-in email (Required)' },
  { header: 'Role', required: true, example: 'Campaign Manager', notes: 'Super Admin | Campaign Manager | Finance & Approver | Content Coordinator | Video Editor | Anchor & Presenter' },
  { header: 'Status', example: 'Active', notes: 'Active | Suspended' },
  { header: 'Departments', example: 'influencer', notes: 'influencer, digital, or influencer, digital' },
];

const AUDIT_REVIEW_COLUMNS: ExcelColumnSpec[] = [
  { header: 'System', required: true, example: 'influencer', notes: 'influencer | digital' },
  { header: 'Entity_Type', required: true, example: 'ComplianceReview', notes: 'Entity category for governance note' },
  { header: 'Entity_ID', required: true, example: 'CMP-101', notes: 'Related Record ID' },
  { header: 'Reason_Or_Note', required: true, example: 'Monthly finance audit verified', notes: 'Audit compliance remark (Required)' },
];

const QUARANTINE_IMPORT_COLUMNS: ExcelColumnSpec[] = [
  { header: 'Campaign_ID_Or_Name', required: true, example: 'Diwali Bridal Saree Launch', notes: 'Campaign ID or Name for payment validation' },
  { header: 'Payment_Type', required: true, example: 'Advance', notes: 'Canonical payment type (invalid types will be quarantined)' },
  { header: 'Amount', required: true, example: '15000', notes: 'Positive numeric amount (invalid amounts will be quarantined)' },
  { header: 'Status', example: 'Submitted', notes: 'Draft | Submitted | Approved | Paid' },
  { header: 'Remarks', example: 'External sheet import batch', notes: 'Optional notes' },
];

// ---------------------------------------------------------------------------
// MODULE CONFIG REGISTRY (Covers Every Menu Option)
// ---------------------------------------------------------------------------

export function getExcelModuleConfig(moduleId: string, activeSystem: SystemType): ExcelModuleConfig {
  switch (moduleId) {
    case 'dashboard':
      return {
        id: 'dashboard',
        label: 'Executive Dashboard (Full Influencer Workbook)',
        fileName: 'Influencer_OS_Master_Template.xlsx',
        system: 'influencer',
        description: 'Multi-sheet template covering Influencers, Campaigns, Deliverables & Links, Payments, Follow-ups, and Performance.',
        sheets: [
          { sheetName: 'Influencers', columns: INFLUENCER_COLUMNS },
          { sheetName: 'Campaigns', columns: CAMPAIGN_COLUMNS },
          { sheetName: 'Deliverables_And_Links', columns: DELIVERABLE_LINK_COLUMNS },
          { sheetName: 'Payments', columns: PAYMENT_COLUMNS },
          { sheetName: 'FollowUps', columns: FOLLOWUP_COLUMNS },
          { sheetName: 'Performance', columns: PERFORMANCE_COLUMNS },
        ],
      };

    case 'influencers':
      return {
        id: 'influencers',
        label: 'Influencer Master',
        fileName: 'Influencer_Master_Template.xlsx',
        system: 'influencer',
        description: 'Bulk import creator profiles with Business Association, Franchises, Departments, State/City, and rates.',
        sheets: [{ sheetName: 'Influencers', columns: INFLUENCER_COLUMNS }],
      };

    case 'campaigns':
      return {
        id: 'campaigns',
        label: 'Campaigns & Deliverables',
        fileName: 'Campaigns_Deliverables_Template.xlsx',
        system: 'influencer',
        description: 'Import Campaigns and unlimited individual Reel/video Deliverables, Posted Links, and Performance metrics.',
        sheets: [
          { sheetName: 'Campaigns', columns: CAMPAIGN_COLUMNS },
          { sheetName: 'Deliverables_And_Links', columns: DELIVERABLE_LINK_COLUMNS },
        ],
      };

    case 'payments':
      return {
        id: 'payments',
        label: 'Payments & Approvals',
        fileName: 'Payments_Approvals_Template.xlsx',
        system: 'influencer',
        description: 'Import campaign payment entries with automatic overpayment, negative-amount, and payment-type validation.',
        sheets: [{ sheetName: 'Payments', columns: PAYMENT_COLUMNS }],
      };

    case 'followups':
      return {
        id: 'followups',
        label: 'Follow-ups Tracker',
        fileName: 'FollowUps_Tracker_Template.xlsx',
        system: 'influencer',
        description: 'Bulk import creator, campaign, and deliverable follow-up tasks.',
        sheets: [{ sheetName: 'FollowUps', columns: FOLLOWUP_COLUMNS }],
      };

    case 'performance':
      return {
        id: 'performance',
        label: 'Performance Analytics',
        fileName: 'Performance_Analytics_Template.xlsx',
        system: 'influencer',
        description: 'Import posted Reel/video links with Day 7/15/30 Views, Likes, Comments, Shares, Saves, and Reach.',
        sheets: [{ sheetName: 'Performance', columns: PERFORMANCE_COLUMNS }],
      };

    case 'digital_dashboard':
      return {
        id: 'digital_dashboard',
        label: 'Studio Dashboard (Full Digital Workbook)',
        fileName: 'Digital_Studio_Master_Template.xlsx',
        system: 'digital',
        description: 'Multi-sheet template covering Content Master, Editor Capacity Profiles, Channel Schedules, and Anchor Schedules.',
        sheets: [
          { sheetName: 'Content_Master', columns: CONTENT_MASTER_COLUMNS },
          { sheetName: 'Editor_Capacity', columns: EDITOR_CAPACITY_COLUMNS },
          { sheetName: 'Channel_Schedules', columns: CHANNEL_SCHEDULE_COLUMNS },
          { sheetName: 'Anchor_Schedules', columns: ANCHOR_SCHEDULE_COLUMNS },
        ],
      };

    case 'content_master':
      return {
        id: 'content_master',
        label: 'Central Content Master',
        fileName: 'Content_Master_Template.xlsx',
        system: 'digital',
        description: 'Bulk import studio production topics, raw footage links, anchors, and assigned editors.',
        sheets: [{ sheetName: 'Content_Master', columns: CONTENT_MASTER_COLUMNS }],
      };

    case 'editor_workspace':
      return {
        id: 'editor_workspace',
        label: 'Editor Workspace',
        fileName: 'Editor_Workspace_Template.xlsx',
        system: 'digital',
        description: 'Bulk update editing statuses, submission URLs, and review notes by Topic ID.',
        sheets: [{ sheetName: 'Editor_Workspace', columns: EDITOR_WORKSPACE_COLUMNS }],
      };

    case 'editor_capacity':
      return {
        id: 'editor_capacity',
        label: 'Editor Targets & Capacity',
        fileName: 'Editor_Targets_Capacity_Template.xlsx',
        system: 'digital',
        description: 'Import video editor operational profiles, monthly targets, and capacity points.',
        sheets: [{ sheetName: 'Editor_Capacity', columns: EDITOR_CAPACITY_COLUMNS }],
      };

    case 'channel_schedules':
      return {
        id: 'channel_schedules',
        label: 'Channel Schedules',
        fileName: 'Channel_Schedules_Template.xlsx',
        system: 'digital',
        description: 'Bulk import multi-channel publishing schedules and live URLs.',
        sheets: [{ sheetName: 'Channel_Schedules', columns: CHANNEL_SCHEDULE_COLUMNS }],
      };

    case 'anchor_schedules':
      return {
        id: 'anchor_schedules',
        label: 'Anchor Schedules',
        fileName: 'Anchor_Schedules_Template.xlsx',
        system: 'digital',
        description: 'Bulk import anchor studio shoot dates, time slots, and locations.',
        sheets: [{ sheetName: 'Anchor_Schedules', columns: ANCHOR_SCHEDULE_COLUMNS }],
      };

    case 'users':
      return {
        id: 'users',
        label: 'User Admin & RBAC',
        fileName: 'Users_RBAC_Template.xlsx',
        system: 'governance',
        description: 'Super Admin bulk user provisioning template with role and department access assignment.',
        sheets: [{ sheetName: 'Users', columns: USER_ADMIN_COLUMNS }],
      };

    case 'sync':
      return activeSystem === 'digital'
        ? {
            ...getExcelModuleConfig('digital_dashboard', 'digital'),
            id: 'sync',
            label: 'Google Sheets Sync (Digital Master Import)',
          }
        : {
            ...getExcelModuleConfig('dashboard', 'influencer'),
            id: 'sync',
            label: 'Google Sheets Sync (Influencer Master Import)',
          };

    case 'audit':
      return {
        id: 'audit',
        label: 'Audit & Conflict Trail',
        fileName: 'Audit_Review_Notes_Template.xlsx',
        system: 'governance',
        description: 'Download structured audit review template or import compliance verification remarks.',
        sheets: [{ sheetName: 'Audit_Notes', columns: AUDIT_REVIEW_COLUMNS }],
      };

    case 'quarantine':
      return {
        id: 'quarantine',
        label: 'Quarantine Console (Payment Validation Batch)',
        fileName: 'Quarantine_Validation_Batch_Template.xlsx',
        system: 'governance',
        description: 'Validate external payment sheets — valid rows are saved, while invalid rows are automatically quarantined for review.',
        sheets: [{ sheetName: 'Quarantine_Batch', columns: QUARANTINE_IMPORT_COLUMNS }],
      };

    default:
      return getExcelModuleConfig('influencers', activeSystem);
  }
}

export function canUserImportModule(moduleId: string, activeSystem: SystemType, user: UserProfile): boolean {
  if (!user || user.status !== 'Active') return false;
  if (moduleId === 'users') return user.role === 'Super Admin';
  if (moduleId === 'audit') return user.role === 'Super Admin' && omniStore.hasGovernanceAccess(user, 'audit');
  if (moduleId === 'quarantine') return omniStore.hasGovernanceAccess(user, 'quarantine');
  if (moduleId === 'sync') {
    return (
      omniStore.hasGovernanceAccess(user, 'sync') &&
      (omniStore.hasPermission(user, activeSystem, 'canCreate') || omniStore.hasPermission(user, activeSystem, 'canEdit'))
    );
  }
  const config = getExcelModuleConfig(moduleId, activeSystem);
  const sys: SystemType = config.system === 'governance' ? activeSystem : config.system;
  return (
    omniStore.hasPermission(user, sys, 'canCreate') ||
    omniStore.hasPermission(user, sys, 'canEdit')
  );
}

// ---------------------------------------------------------------------------
// TEMPLATE GENERATOR (.xlsx)
// ---------------------------------------------------------------------------

export function buildExcelTemplateWorkbook(moduleId: string, activeSystem: SystemType): { workbook: XLSX.WorkBook; fileName: string } {
  const config = getExcelModuleConfig(moduleId, activeSystem);
  const wb = XLSX.utils.book_new();

  // Add each data template sheet (headers only on row 1 so users never accidentally import sample dummy data)
  const guideRows: Record<string, string>[] = [];

  for (const sheetSpec of config.sheets) {
    const headers = sheetSpec.columns.map(c => c.header);
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!cols'] = sheetSpec.columns.map(c => ({
      wch: Math.max(16, c.header.length + 4, Math.min(34, c.example.length + 4)),
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheetSpec.sheetName.slice(0, 31));

    for (const col of sheetSpec.columns) {
      guideRows.push({
        Sheet: sheetSpec.sheetName,
        Column_Header: col.header,
        Required: col.required ? 'YES' : 'Optional',
        Example_Value: col.example,
        Instructions: col.notes,
      });
    }
  }

  // Add Sample_And_Guide reference sheet
  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [
    { wch: 24 },
    { wch: 26 },
    { wch: 12 },
    { wch: 36 },
    { wch: 62 },
  ];
  XLSX.utils.book_append_sheet(wb, guideSheet, 'Sample_And_Guide');

  return { workbook: wb, fileName: config.fileName };
}

export function downloadExcelTemplate(moduleId: string, activeSystem: SystemType): string {
  const { workbook, fileName } = buildExcelTemplateWorkbook(moduleId, activeSystem);
  XLSX.writeFile(workbook, fileName);
  return fileName;
}

// ---------------------------------------------------------------------------
// PARSER (.xlsx / .xls / .csv)
// ---------------------------------------------------------------------------

export async function parseExcelFile(file: File): Promise<ParsedExcelWorkbook> {
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer, file.name);
}

export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array, fileName = 'upload.xlsx'): ParsedExcelWorkbook {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheets: ParsedExcelSheet[] = [];
  let totalRows = 0;

  for (const sheetName of wb.SheetNames) {
    // Skip reference guide sheet automatically
    if (sheetName.toLowerCase().includes('guide') || sheetName.toLowerCase().includes('instruction')) {
      continue;
    }
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: '',
      raw: false,
    });

    // Drop completely blank rows
    const nonEmptyRows = jsonRows.filter(row =>
      Object.values(row).some(v => String(v ?? '').trim() !== '')
    );

    const headerRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    const headers = Array.isArray(headerRows[0])
      ? headerRows[0].map(h => String(h ?? '').trim()).filter(Boolean)
      : (nonEmptyRows[0] ? Object.keys(nonEmptyRows[0]) : []);

    if (headers.length > 0) {
      sheets.push({ name: sheetName, headers, rows: nonEmptyRows });
      totalRows += nonEmptyRows.length;
    }
  }

  return { fileName, sheets, totalRows };
}

// ---------------------------------------------------------------------------
// VALUE NORMALIZATION HELPERS
// ---------------------------------------------------------------------------

function pickCell(row: Record<string, any>, ...keys: string[]): string {
  const entries = Object.entries(row);
  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const match = entries.find(([k]) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedKey);
    if (match && String(match[1] ?? '').trim() !== '') {
      return String(match[1]).trim();
    }
  }
  return '';
}

function pickNumber(row: Record<string, any>, ...keys: string[]): number {
  const raw = pickCell(row, ...keys).replace(/[₹,\s%]/g, '');
  if (!raw) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function splitList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;|]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function normalizeDate(raw: string, fallback = ''): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// PER-SHEET IMPORTERS (All routed through omniStore with RBAC & validation)
// ---------------------------------------------------------------------------

function importInfluencerRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = pickCell(row, 'Name', 'Creator Name', 'Influencer Name');
    const phone = pickCell(row, 'Phone', 'Phone Number', 'Contact');
    const email = pickCell(row, 'Email', 'Email Address');

    if (!name) {
      result.skippedCount++;
      result.errors.push(`Influencers Row ${rowNum}: Missing required "Name".`);
      return;
    }

    const rawCity = pickCell(row, 'City');
    const rawState = pickCell(row, 'State', 'State / UT') || findStateForCity(rawCity) || '';
    const rawBts = splitList(pickCell(row, 'Business_Types', 'Business Type', 'Business Association'));
    const businessTypes: BusinessClassification[] = rawBts.length > 0
      ? rawBts.map(bt => (bt.toLowerCase().includes('fran') ? 'Franchise' : 'Ajit Zone'))
      : ['Ajit Zone'];
    const uniqueBts = Array.from(new Set(businessTypes));

    const franchises = splitList(pickCell(row, 'Franchises', 'Franchise'));
    const departments = splitList(pickCell(row, 'Departments', 'Department', 'Product Category'));
    if (departments.length === 0) departments.push('Other');

    const rawStatus = pickCell(row, 'Status', 'Influencer Status');
    const allowedStatuses: InfluencerStatus[] = ['Active', 'Inactive', 'Pending', 'On Hold', 'Blacklisted'];
    const influencerStatus = allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

    const rawType = pickCell(row, 'Influencer_Type', 'Platform', 'Type');
    const allowedTypes: InfluencerType[] = ['Instagram', 'YouTube', 'Facebook', 'Multi-Platform'];
    const influencerType = allowedTypes.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'Instagram';

    const rawCollab = pickCell(row, 'Collaboration_Type', 'Deal Type');
    const allowedCollabs: CollaborationType[] = ['Paid', 'Barter', 'Gifted', 'Affiliate', 'Exchange'];
    const collaborationType = allowedCollabs.find(c => c.toLowerCase() === rawCollab.toLowerCase()) || 'Paid';

    const rawGender = pickCell(row, 'Gender');
    const gender = rawGender.toLowerCase() === 'female'
      ? 'Female'
      : rawGender.toLowerCase() === 'male'
        ? 'Male'
        : rawGender
          ? 'Other'
          : undefined;

    const igUrl = sanitizeExternalUrl(pickCell(row, 'Instagram_URL', 'IG URL')) || '';
    const ytUrl = sanitizeExternalUrl(pickCell(row, 'YouTube_URL', 'YT URL')) || '';

    try {
      omniStore.saveInfluencer({
        name,
        phone,
        email,
        state: rawState,
        city: rawCity,
        address: pickCell(row, 'Address'),
        businessTypes: uniqueBts,
        franchises,
        departments,
        influencerStatus,
        influencerType,
        collaborationType,
        gender,
        socialPlatforms: {
          instagram: {
            handle: pickCell(row, 'Instagram_Handle', 'IG Handle', 'Handle'),
            followers: pickNumber(row, 'Instagram_Followers', 'Followers'),
            profileUrl: igUrl,
          },
          youtube: {
            handle: pickCell(row, 'YouTube_Handle', 'YT Handle'),
            subscribers: pickNumber(row, 'YouTube_Subscribers', 'Subscribers'),
            channelUrl: ytUrl,
          },
        },
        contentRates: {
          reelRate: pickNumber(row, 'Reel_Rate', 'Reel Rate'),
          youtubeVideoRate: pickNumber(row, 'YouTube_Video_Rate', 'YouTube Rate'),
          storyRate: pickNumber(row, 'Story_Rate', 'Story Rate'),
          staticPostRate: pickNumber(row, 'Static_Post_Rate', 'Post Rate'),
        },
        engagementRate: pickNumber(row, 'Engagement_Rate', 'Engagement') || 0,
        internalRating: pickNumber(row, 'Internal_Rating', 'Rating') || 4,
        isBlacklisted: influencerStatus === 'Blacklisted',
        assignedTeamMember: pickCell(row, 'Assigned_Team_Member', 'Coordinator'),
        remarks: pickCell(row, 'Remarks', 'Notes'),
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Influencers Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Influencer profile(s)`);
}

function importCampaignRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  const influencers = omniStore.getInfluencers();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = pickCell(row, 'Campaign_Name', 'Name', 'Campaign');
    if (!name) {
      result.skippedCount++;
      result.errors.push(`Campaigns Row ${rowNum}: Missing required "Campaign_Name".`);
      return;
    }

    const infLookup = pickCell(row, 'Influencer_Name_Or_ID', 'Influencer', 'Influencer_Name', 'Influencer_ID');
    const matchedInf = influencers.find(
      i => i.id.toLowerCase() === infLookup.toLowerCase() || i.name.toLowerCase() === infLookup.toLowerCase()
    );

    const rawBts = splitList(pickCell(row, 'Business_Types', 'Business Type'));
    const businessTypes: BusinessClassification[] = rawBts.length > 0
      ? Array.from(new Set(rawBts.map(bt => (bt.toLowerCase().includes('fran') ? 'Franchise' : 'Ajit Zone'))))
      : ['Ajit Zone'];
    const franchises = splitList(pickCell(row, 'Franchises', 'Franchise'));
    const departments = splitList(pickCell(row, 'Departments', 'Department'));
    if (departments.length === 0) departments.push('Saree');

    const rawStatus = pickCell(row, 'Status', 'Campaign Status');
    const allowedStatuses: CampaignStatus[] = ['Draft', 'Planned', 'Active', 'Completed', 'Cancelled', 'On Hold'];
    const status = allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Planned';

    const rawCollab = pickCell(row, 'Collaboration_Type', 'Collaboration');
    const allowedCollabs: CollaborationType[] = ['Paid', 'Barter', 'Gifted', 'Affiliate', 'Exchange'];
    const collaborationType = allowedCollabs.find(c => c.toLowerCase() === rawCollab.toLowerCase()) || 'Paid';

    const agreedAmount = pickNumber(row, 'Agreed_Amount', 'Budget', 'Amount');
    const startDate = normalizeDate(pickCell(row, 'Start_Date', 'Visit_Date'), new Date().toISOString().slice(0, 10));
    const endDate = normalizeDate(pickCell(row, 'End_Date'), '');

    try {
      omniStore.saveCampaign({
        id: pickCell(row, 'Campaign_ID', 'ID') || undefined,
        name,
        influencerId: matchedInf?.id || '',
        influencerName: matchedInf?.name || infLookup || 'Unassigned Creator',
        businessTypes,
        franchises,
        departments,
        department: departments[0],
        objective: pickCell(row, 'Objective', 'Campaign Objective') || 'Brand Awareness',
        collaborationType,
        status,
        agreedAmount,
        budget: agreedAmount,
        startDate,
        visitDate: startDate,
        endDate: endDate || undefined,
        month: pickCell(row, 'Month') || undefined,
        year: pickCell(row, 'Year') || undefined,
        assignedTeamMember: pickCell(row, 'Assigned_Team_Member', 'Coordinator') || omniStore.getCurrentUser().name,
        remarks: pickCell(row, 'Remarks', 'Notes'),
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Campaigns Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Campaign(s)`);
}

function importDeliverableAndLinkRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let delCount = 0;
  let perfCount = 0;
  const campaigns = omniStore.getCampaigns();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const campLookup = pickCell(row, 'Campaign_Name_Or_ID', 'Campaign_ID', 'Campaign_Name', 'Campaign');
    const title = pickCell(row, 'Reel_Video_Title', 'Title', 'Content_Title', 'Deliverable_Title');

    if (!campLookup || !title) {
      result.skippedCount++;
      result.errors.push(`Deliverables Row ${rowNum}: Missing required "Campaign_Name_Or_ID" or "Reel_Video_Title".`);
      return;
    }

    const camp = campaigns.find(
      c => c.id.toLowerCase() === campLookup.toLowerCase() || c.name.toLowerCase() === campLookup.toLowerCase()
    );
    if (!camp) {
      result.skippedCount++;
      result.errors.push(`Deliverables Row ${rowNum}: Campaign "${campLookup}" not found.`);
      return;
    }

    const rawUrl = pickCell(row, 'Posted_Link_URL', 'Published_URL', 'Posted_Link', 'URL');
    const safeUrl = rawUrl ? sanitizeExternalUrl(rawUrl) : '';
    if (rawUrl && !safeUrl) {
      result.skippedCount++;
      result.errors.push(`Deliverables Row ${rowNum}: Invalid URL "${rawUrl}" (must start with http:// or https://).`);
      return;
    }

    const rawType = pickCell(row, 'Type', 'Content_Type');
    const allowedTypes: DeliverableItem['type'][] = [
      'Instagram Reel',
      'YouTube Long-form',
      'YouTube Short',
      'Static Post',
      'Story Set',
      'Live Appearance',
    ];
    const type = allowedTypes.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'Instagram Reel';

    const rawStatus = pickCell(row, 'Status');
    const allowedStatuses: DeliverableItem['status'][] = [
      'Pending',
      'Shot Completed',
      'Draft Submitted',
      'Revision Requested',
      'Approved',
      'Posted',
    ];
    const status: DeliverableItem['status'] =
      allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || (safeUrl ? 'Posted' : 'Pending');

    const expectedPostingDate = normalizeDate(
      pickCell(row, 'Expected_Posting_Date', 'Due_Date'),
      new Date().toISOString().slice(0, 10)
    );
    const actualPostingDate = normalizeDate(pickCell(row, 'Actual_Posting_Date', 'Posting_Date'), '');

    try {
      const savedDel = omniStore.saveDeliverable({
        campaignId: camp.id,
        title,
        type,
        status,
        expectedPostingDate,
        actualPostingDate: actualPostingDate || (safeUrl ? new Date().toISOString().slice(0, 10) : undefined),
        publishedUrl: safeUrl || undefined,
        remarks: pickCell(row, 'Notes', 'Remarks'),
      });
      delCount++;
      result.importedCount++;

      const views7 = pickNumber(row, 'Views_Day7', 'Views');
      const views15 = pickNumber(row, 'Views_Day15');
      const views30 = pickNumber(row, 'Views_Day30');
      const likes = pickNumber(row, 'Likes');
      const comments = pickNumber(row, 'Comments');
      const shares = pickNumber(row, 'Shares');
      const saves = pickNumber(row, 'Saves');
      const reach = pickNumber(row, 'Reach');
      const spend = pickNumber(row, 'Allocated_Spend', 'Spend');

      if (safeUrl || views7 > 0 || views15 > 0 || views30 > 0 || likes > 0 || reach > 0) {
        omniStore.savePerformance(
          {
            deliverableId: savedDel.id,
            campaignId: camp.id,
            campaignName: camp.name,
            influencerName: camp.influencerName,
            contentTitle: title,
            platform: pickCell(row, 'Platform') || (type.toLowerCase().includes('youtube') ? 'YouTube' : 'Instagram'),
            publishedUrl: safeUrl || '',
            postingDate: actualPostingDate || new Date().toISOString().slice(0, 10),
            viewsDay7: views7,
            viewsDay15: views15,
            viewsDay30: views30,
            likes,
            comments,
            shares,
            saves,
            reach,
            allocatedSpend: spend,
            notes: pickCell(row, 'Notes', 'Remarks'),
          },
          { forceNew: true }
        );
        perfCount++;
      }
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Deliverables Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (delCount > 0) result.details.push(`Imported ${delCount} Reel/Video Deliverable(s)`);
  if (perfCount > 0) result.details.push(`Logged ${perfCount} Linked Performance record(s)`);
}

function importPaymentRows(rows: Record<string, any>[], result: ExcelImportResult, quarantineOnFailure = false) {
  let count = 0;
  let quarantinedCount = 0;
  const campaigns = omniStore.getCampaigns();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const campLookup = pickCell(row, 'Campaign_ID_Or_Name', 'Campaign_ID', 'Campaign_Name', 'Campaign');
    const camp = campaigns.find(
      c => c.id.toLowerCase() === campLookup.toLowerCase() || c.name.toLowerCase() === campLookup.toLowerCase()
    );
    const rawAmount = pickCell(row, 'Amount');
    const amount = Number(rawAmount.replace(/[₹,\s]/g, ''));
    const paymentType = pickCell(row, 'Payment_Type', 'Type');
    const rawStatus = pickCell(row, 'Status') || 'Pending Approval';
    const normalizedStatus = (rawStatus.toLowerCase() === 'submitted' ? 'Pending Approval' : rawStatus) as any;
    const paymentMode = pickCell(row, 'Payment_Mode', 'Mode');
    const baseRemarks = pickCell(row, 'Remarks', 'Notes');
    const combinedRemarks = paymentMode
      ? [baseRemarks, `Mode: ${paymentMode}`].filter(Boolean).join(' | ')
      : baseRemarks;

    if (!campLookup || !camp) {
      if (quarantineOnFailure) {
        omniStore.addQuarantineRecord({
          sheetTab: 'Payments_Excel_Import',
          rowNumber: rowNum,
          rawPayload: row,
          validationErrors: [`Campaign "${campLookup || '(blank)'}" not found.`],
        });
        quarantinedCount++;
      }
      result.skippedCount++;
      result.errors.push(`Payments Row ${rowNum}: Campaign "${campLookup || '(blank)'}" not found.`);
      return;
    }

    const res = omniStore.savePayment({
      campaignId: camp.id,
      campaignName: camp.name,
      influencerId: camp.influencerId,
      influencerName: pickCell(row, 'Influencer_Name') || camp.influencerName,
      paymentType: paymentType as any,
      amount: Number.isFinite(amount) ? amount : NaN,
      status: normalizedStatus,
      transactionReference: pickCell(row, 'UTR_Reference', 'Transaction_Reference', 'UTR'),
      paymentDate: normalizeDate(pickCell(row, 'Payment_Date', 'Date'), ''),
      remarks: combinedRemarks,
    });

    if (res.error) {
      if (quarantineOnFailure) {
        omniStore.addQuarantineRecord({
          sheetTab: 'Payments_Excel_Import',
          rowNumber: rowNum,
          rawPayload: row,
          validationErrors: [res.error],
        });
        quarantinedCount++;
      }
      result.skippedCount++;
      result.errors.push(`Payments Row ${rowNum}: ${res.error}`);
    } else {
      count++;
      result.importedCount++;
    }
  });

  if (count > 0) result.details.push(`Imported ${count} validated Payment record(s)`);
  if (quarantinedCount > 0) result.details.push(`Isolated ${quarantinedCount} invalid row(s) into Quarantine Console`);
}

function importFollowUpRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const entityName = pickCell(row, 'Entity_Name', 'Name', 'Creator', 'Campaign');
    const purpose = pickCell(row, 'Purpose', 'Subject');
    if (!entityName || !purpose) {
      result.skippedCount++;
      result.errors.push(`FollowUps Row ${rowNum}: Missing required "Entity_Name" or "Purpose".`);
      return;
    }

    const rawEntityType = pickCell(row, 'Entity_Type').toLowerCase();
    const entityType: FollowUpRecord['entityType'] =
      rawEntityType === 'campaign' ? 'campaign' : rawEntityType === 'deliverable' ? 'deliverable' : 'influencer';

    const rawType = pickCell(row, 'Type', 'Channel');
    const allowedTypes: FollowUpRecord['type'][] = ['Call', 'WhatsApp', 'Email', 'Meeting', 'Site Visit'];
    const type = allowedTypes.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'WhatsApp';

    const rawStatus = pickCell(row, 'Status');
    const allowedStatuses: FollowUpRecord['status'][] = ['Pending', 'In Progress', 'Completed', 'Rescheduled', 'Escalated'];
    const status = allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Pending';

    try {
      omniStore.saveFollowUp({
        entityType,
        entityId: pickCell(row, 'Entity_ID') || `ENT-${Date.now().toString(36).slice(-4)}`,
        entityName,
        assignedTo: pickCell(row, 'Assigned_To') || omniStore.getCurrentUser().name,
        date: normalizeDate(pickCell(row, 'Date'), new Date().toISOString().slice(0, 10)),
        nextFollowUpDate: normalizeDate(pickCell(row, 'Next_FollowUp_Date', 'Next_Date'), new Date().toISOString().slice(0, 10)),
        type,
        purpose,
        status,
        remarks: pickCell(row, 'Remarks', 'Notes'),
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`FollowUps Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Follow-up(s)`);
}

function importPerformanceRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  const campaigns = omniStore.getCampaigns();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const campLookup = pickCell(row, 'Campaign_ID_Or_Name', 'Campaign_ID', 'Campaign_Name', 'Campaign');
    const title = pickCell(row, 'Content_Title', 'Reel_Video_Title', 'Title');
    const rawUrl = pickCell(row, 'Posted_Link_URL', 'Published_URL', 'Posted_Link', 'URL');

    if (!campLookup || !title) {
      result.skippedCount++;
      result.errors.push(`Performance Row ${rowNum}: Missing required "Campaign_ID_Or_Name" or "Content_Title".`);
      return;
    }

    const safeUrl = rawUrl ? sanitizeExternalUrl(rawUrl) : '';
    if (rawUrl && !safeUrl) {
      result.skippedCount++;
      result.errors.push(`Performance Row ${rowNum}: Invalid URL "${rawUrl}".`);
      return;
    }

    const camp = campaigns.find(
      c => c.id.toLowerCase() === campLookup.toLowerCase() || c.name.toLowerCase() === campLookup.toLowerCase()
    );

    try {
      omniStore.savePerformance(
        {
          campaignId: camp?.id || campLookup,
          campaignName: camp?.name || campLookup,
          deliverableId: pickCell(row, 'Deliverable_ID'),
          influencerName: pickCell(row, 'Influencer_Name') || camp?.influencerName || '',
          contentTitle: title,
          platform: pickCell(row, 'Platform') || 'Instagram',
          publishedUrl: safeUrl || '',
          postingDate: normalizeDate(pickCell(row, 'Posting_Date', 'Actual_Posting_Date'), new Date().toISOString().slice(0, 10)),
          viewsDay7: pickNumber(row, 'Views_Day7', 'Views'),
          viewsDay15: pickNumber(row, 'Views_Day15'),
          viewsDay30: pickNumber(row, 'Views_Day30'),
          likes: pickNumber(row, 'Likes'),
          comments: pickNumber(row, 'Comments'),
          shares: pickNumber(row, 'Shares'),
          saves: pickNumber(row, 'Saves'),
          reach: pickNumber(row, 'Reach'),
          allocatedSpend: pickNumber(row, 'Allocated_Spend', 'Spend'),
          notes: pickCell(row, 'Notes', 'Remarks'),
        },
        { forceNew: true }
      );
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Performance Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Performance link record(s)`);
}

function importContentMasterRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const title = pickCell(row, 'Title', 'Topic_Title', 'Content_Title');
    if (!title) {
      result.skippedCount++;
      result.errors.push(`Content Master Row ${rowNum}: Missing required "Title".`);
      return;
    }

    const rawUrl = pickCell(row, 'Raw_Footage_URL', 'Raw_Footage');
    const safeUrl = rawUrl && /^https?:\/\//i.test(rawUrl) ? (sanitizeExternalUrl(rawUrl) || '') : rawUrl;

    try {
      omniStore.saveContentMaster({
        id: pickCell(row, 'Topic_ID', 'ID') || undefined,
        title,
        department: pickCell(row, 'Department') || 'Production',
        contentType: (pickCell(row, 'Content_Type') || 'Long-form Video') as ContentMasterRecord['contentType'],
        anchor: pickCell(row, 'Anchor') || 'TBD',
        recordingDate: normalizeDate(pickCell(row, 'Recording_Date'), new Date().toISOString().slice(0, 10)),
        recordingStatus: (pickCell(row, 'Recording_Status') || 'Planned') as ContentMasterRecord['recordingStatus'],
        cameraman: pickCell(row, 'Cameraman'),
        receiver: pickCell(row, 'Receiver'),
        rawFootageLocationUrl: safeUrl,
        assignedEditorName: pickCell(row, 'Assigned_Editor_Name', 'Editor'),
        editingStatus: (pickCell(row, 'Editing_Status') || 'Assigned') as ContentMasterRecord['editingStatus'],
        categories: splitList(pickCell(row, 'Categories')),
        channels: splitList(pickCell(row, 'Channels')),
        remarks: pickCell(row, 'Remarks', 'Notes'),
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Content Master Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Content Master topic(s)`);
}

function importEditorWorkspaceRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  const existingTopics = omniStore.getContentMaster();

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const topicId = pickCell(row, 'Topic_ID', 'ID');
    const editingStatus = pickCell(row, 'Editing_Status', 'Status');
    if (!topicId || !editingStatus) {
      result.skippedCount++;
      result.errors.push(`Editor Workspace Row ${rowNum}: Missing required "Topic_ID" or "Editing_Status".`);
      return;
    }

    const existing = existingTopics.find(t => t.id.toLowerCase() === topicId.toLowerCase());
    if (!existing) {
      result.skippedCount++;
      result.errors.push(`Editor Workspace Row ${rowNum}: Topic "${topicId}" not found in Content Master.`);
      return;
    }

    const rawSubUrl = pickCell(row, 'Edit_Submission_URL', 'Submission_URL');
    const safeSubUrl = rawSubUrl ? sanitizeExternalUrl(rawSubUrl) : existing.editSubmissionUrl;
    if (rawSubUrl && !safeSubUrl) {
      result.skippedCount++;
      result.errors.push(`Editor Workspace Row ${rowNum}: Invalid submission URL "${rawSubUrl}".`);
      return;
    }

    try {
      omniStore.saveContentMaster({
        ...existing,
        editingStatus: editingStatus as ContentMasterRecord['editingStatus'],
        editSubmissionUrl: safeSubUrl || undefined,
        reviewNotes: pickCell(row, 'Review_Notes') || existing.reviewNotes,
        remarks: pickCell(row, 'Remarks') || existing.remarks,
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Editor Workspace Row ${rowNum}: ${err?.message || 'Update failed'}`);
    }
  });
  if (count > 0) result.details.push(`Updated ${count} Editor Workspace item(s)`);
}

function importEditorCapacityRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = pickCell(row, 'Name', 'Editor_Name');
    if (!name) {
      result.skippedCount++;
      result.errors.push(`Editor Capacity Row ${rowNum}: Missing required "Name".`);
      return;
    }

    try {
      omniStore.saveEditorProfile({
        id: pickCell(row, 'Editor_ID', 'ID') || undefined,
        name,
        email: pickCell(row, 'Email'),
        department: pickCell(row, 'Department') || 'Video Production',
        status: pickCell(row, 'Status').toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
        workingDays: pickNumber(row, 'Working_Days') || 22,
        leaveDays: pickNumber(row, 'Leave_Days') || 0,
        dailyCapacityPoints: pickNumber(row, 'Daily_Capacity_Points') || 5,
        longVideoTarget: pickNumber(row, 'Long_Video_Target') || 12,
        shortsTarget: pickNumber(row, 'Shorts_Target') || 28,
        monthlyTargetVideos: pickNumber(row, 'Monthly_Target_Videos') || 25,
        assignedChannels: splitList(pickCell(row, 'Assigned_Channels')),
        shiftSchedule: pickCell(row, 'Shift_Schedule') || 'Day Shift',
        skills: splitList(pickCell(row, 'Skills')),
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Editor Capacity Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Editor profile & capacity record(s)`);
}

function importChannelScheduleRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const contentTitle = pickCell(row, 'Content_Title', 'Title');
    const channelName = pickCell(row, 'Channel_Name', 'Channel');
    if (!contentTitle || !channelName) {
      result.skippedCount++;
      result.errors.push(`Channel Schedules Row ${rowNum}: Missing required "Content_Title" or "Channel_Name".`);
      return;
    }

    const rawUrl = pickCell(row, 'Published_URL', 'URL');
    const safeUrl = rawUrl ? sanitizeExternalUrl(rawUrl) : undefined;
    if (rawUrl && !safeUrl) {
      result.skippedCount++;
      result.errors.push(`Channel Schedules Row ${rowNum}: Invalid URL "${rawUrl}".`);
      return;
    }

    try {
      omniStore.saveChannelSchedule({
        contentId: pickCell(row, 'Content_ID', 'Topic_ID'),
        contentTitle,
        channelName,
        scheduledDate: normalizeDate(pickCell(row, 'Scheduled_Date', 'Date'), new Date().toISOString().slice(0, 10)),
        scheduledTime: pickCell(row, 'Scheduled_Time', 'Time') || '18:00',
        status: (pickCell(row, 'Status') || 'Scheduled') as ChannelScheduleTask['status'],
        publishedUrl: safeUrl || undefined,
        views: pickNumber(row, 'Views') || undefined,
        likes: pickNumber(row, 'Likes') || undefined,
        delayReason: pickCell(row, 'Delay_Reason') || undefined,
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Channel Schedules Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Channel Schedule task(s)`);
}

function importAnchorScheduleRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const anchorName = pickCell(row, 'Anchor_Name', 'Anchor');
    const topicTitle = pickCell(row, 'Topic_Title', 'Title');
    if (!anchorName || !topicTitle) {
      result.skippedCount++;
      result.errors.push(`Anchor Schedules Row ${rowNum}: Missing required "Anchor_Name" or "Topic_Title".`);
      return;
    }

    try {
      omniStore.saveAnchorSchedule({
        anchorName,
        shootDate: normalizeDate(pickCell(row, 'Shoot_Date', 'Date'), new Date().toISOString().slice(0, 10)),
        shootTimeSlot: pickCell(row, 'Shoot_Time_Slot', 'Time_Slot') || '10:00 AM - 01:00 PM',
        topicTitle,
        department: pickCell(row, 'Department') || 'Production',
        studioOrLocation: pickCell(row, 'Studio_Or_Location', 'Studio', 'Location') || 'Main Studio Floor',
        status: (pickCell(row, 'Status') || 'Assigned') as AnchorScheduleRecord['status'],
        managerNotes: pickCell(row, 'Manager_Notes', 'Notes') || undefined,
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Anchor Schedules Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Imported ${count} Anchor Schedule(s)`);
}

function importUserRows(rows: Record<string, any>[], result: ExcelImportResult) {
  let count = 0;
  const allowedRoles: UserRole[] = [
    'Super Admin',
    'Campaign Manager',
    'Finance & Approver',
    'Content Coordinator',
    'Video Editor',
    'Anchor & Presenter',
  ];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const name = pickCell(row, 'Name');
    const email = pickCell(row, 'Email').toLowerCase();
    const rawRole = pickCell(row, 'Role');
    if (!name || !email || !email.includes('@')) {
      result.skippedCount++;
      result.errors.push(`Users Row ${rowNum}: Missing valid "Name" or "Email".`);
      return;
    }

    const role = allowedRoles.find(r => r.toLowerCase() === rawRole.toLowerCase()) || 'Content Coordinator';
    const rawDepts = splitList(pickCell(row, 'Departments')).map(d => d.toLowerCase());
    const departments: SystemType[] = [];
    if (rawDepts.some(d => d.includes('inf'))) departments.push('influencer');
    if (rawDepts.some(d => d.includes('dig'))) departments.push('digital');

    try {
      omniStore.saveUser({
        name,
        email,
        role,
        status: pickCell(row, 'Status').toLowerCase() === 'suspended' ? 'Suspended' : 'Active',
        departments: departments.length > 0 ? departments : undefined,
      });
      count++;
      result.importedCount++;
    } catch (err: any) {
      result.skippedCount++;
      result.errors.push(`Users Row ${rowNum}: ${err?.message || 'Save failed'}`);
    }
  });
  if (count > 0) result.details.push(`Provisioned ${count} User account(s)`);
}

function importAuditNoteRows(rows: Record<string, any>[], result: ExcelImportResult) {
  const activeUser = omniStore.getCurrentUser();
  if (activeUser.role !== 'Super Admin') {
    result.skippedCount += rows.length;
    result.errors.push('Unauthorized: Only Super Administrators can import compliance audit notes.');
    return;
  }

  let count = 0;
  rows.forEach((row, idx) => {
    const rowNum = idx + 2;
    const entityType = pickCell(row, 'Entity_Type') || 'ComplianceReview';
    const entityId = pickCell(row, 'Entity_ID') || `AUD-IMP-${rowNum}`;
    const note = pickCell(row, 'Reason_Or_Note', 'Note', 'Reason');
    if (!note) {
      result.skippedCount++;
      result.errors.push(`Audit Row ${rowNum}: Missing required "Reason_Or_Note".`);
      return;
    }
    const sysRaw = pickCell(row, 'System').toLowerCase();
    const sys: SystemType = sysRaw === 'digital' ? 'digital' : 'influencer';
    omniStore.logAudit(sys, entityType, entityId, 'UPDATE', [{ field: 'complianceNote', before: null, after: note }], note);
    count++;
    result.importedCount++;
  });
  if (count > 0) result.details.push(`Logged ${count} compliance Audit note(s)`);
}

// ---------------------------------------------------------------------------
// MAIN DISPATCHER
// ---------------------------------------------------------------------------

export function importExcelData(
  moduleId: string,
  activeSystem: SystemType,
  sheets: ParsedExcelSheet[]
): ExcelImportResult {
  const result: ExcelImportResult = {
    importedCount: 0,
    skippedCount: 0,
    errors: [],
    details: [],
  };

  const activeUser = omniStore.getCurrentUser();
  if (!canUserImportModule(moduleId, activeSystem, activeUser)) {
    result.errors.push('Unauthorized: Your account does not have permission to import Excel data in this module.');
    return result;
  }

  const nonEmptySheets = sheets.filter(s => s.rows.length > 0);
  if (nonEmptySheets.length === 0) {
    result.errors.push('No data rows found in the uploaded Excel file. Fill rows beneath the header row and try again.');
    return result;
  }

  // Multi-sheet dispatch for Dashboards, Sync, and Campaigns & Deliverables
  if (moduleId === 'dashboard' || (moduleId === 'sync' && activeSystem === 'influencer')) {
    // Import in dependency order: Influencers -> Campaigns -> Deliverables -> Payments -> FollowUps -> Performance
    const findSheet = (...names: string[]) =>
      nonEmptySheets.find(s => names.some(n => s.name.toLowerCase().includes(n)));

    const infSheet = findSheet('influencer');
    const campSheet = findSheet('campaign');
    const delSheet = findSheet('deliverable', 'link');
    const paySheet = findSheet('payment');
    const folSheet = findSheet('follow');
    const perfSheet = findSheet('perf');

    if (infSheet) importInfluencerRows(infSheet.rows, result);
    if (campSheet) importCampaignRows(campSheet.rows, result);
    if (delSheet) importDeliverableAndLinkRows(delSheet.rows, result);
    if (paySheet) importPaymentRows(paySheet.rows, result);
    if (folSheet) importFollowUpRows(folSheet.rows, result);
    if (perfSheet) importPerformanceRows(perfSheet.rows, result);

    if (!infSheet && !campSheet && !delSheet && !paySheet && !folSheet && !perfSheet) {
      result.errors.push('Could not match worksheet names. Please use the downloaded Influencer Master Excel Template.');
    }
    return result;
  }

  if (moduleId === 'digital_dashboard' || (moduleId === 'sync' && activeSystem === 'digital')) {
    const findSheet = (...names: string[]) =>
      nonEmptySheets.find(s => names.some(n => s.name.toLowerCase().includes(n)));

    const contentSheet = findSheet('content');
    const editorSheet = findSheet('editor');
    const chanSheet = findSheet('channel');
    const anchorSheet = findSheet('anchor');

    if (editorSheet) importEditorCapacityRows(editorSheet.rows, result);
    if (contentSheet) importContentMasterRows(contentSheet.rows, result);
    if (chanSheet) importChannelScheduleRows(chanSheet.rows, result);
    if (anchorSheet) importAnchorScheduleRows(anchorSheet.rows, result);

    if (!contentSheet && !editorSheet && !chanSheet && !anchorSheet) {
      result.errors.push('Could not match worksheet names. Please use the downloaded Digital Studio Excel Template.');
    }
    return result;
  }

  if (moduleId === 'campaigns') {
    const campSheet = nonEmptySheets.find(s => s.name.toLowerCase().includes('campaign'));
    const delSheet = nonEmptySheets.find(s => s.name.toLowerCase().includes('deliverable') || s.name.toLowerCase().includes('link'));

    if (campSheet) importCampaignRows(campSheet.rows, result);
    if (delSheet) importDeliverableAndLinkRows(delSheet.rows, result);

    // Fallback: single-sheet upload with arbitrary sheet name (detect by headers)
    if (!campSheet && !delSheet) {
      const first = nonEmptySheets[0];
      const lowerHeaders = first.headers.map(h => h.toLowerCase());
      if (lowerHeaders.some(h => h.includes('reel') || h.includes('posted_link'))) {
        importDeliverableAndLinkRows(first.rows, result);
      } else {
        importCampaignRows(first.rows, result);
      }
    }
    return result;
  }

  // Single-sheet operational modules
  const primaryRows = nonEmptySheets[0].rows;
  switch (moduleId) {
    case 'influencers':
      importInfluencerRows(primaryRows, result);
      break;
    case 'payments':
      importPaymentRows(primaryRows, result, false);
      break;
    case 'followups':
      importFollowUpRows(primaryRows, result);
      break;
    case 'performance':
      importPerformanceRows(primaryRows, result);
      break;
    case 'content_master':
      importContentMasterRows(primaryRows, result);
      break;
    case 'editor_workspace':
      importEditorWorkspaceRows(primaryRows, result);
      break;
    case 'editor_capacity':
      importEditorCapacityRows(primaryRows, result);
      break;
    case 'channel_schedules':
      importChannelScheduleRows(primaryRows, result);
      break;
    case 'anchor_schedules':
      importAnchorScheduleRows(primaryRows, result);
      break;
    case 'users':
      importUserRows(primaryRows, result);
      break;
    case 'audit':
      importAuditNoteRows(primaryRows, result);
      break;
    case 'quarantine':
      importPaymentRows(primaryRows, result, true);
      break;
    default:
      result.errors.push(`Unsupported import module: ${moduleId}`);
  }

  return result;
}
