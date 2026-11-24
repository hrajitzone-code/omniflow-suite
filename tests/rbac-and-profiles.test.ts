import * as XLSX from 'xlsx';
import { omniStore } from '../src/services/storageService';
import { INFLUENCER_SHEET_TABS, DIGITAL_SHEET_TABS, googleSheetsService } from '../src/services/googleSheetsService';
import {
  escapeHtml,
  sanitizeExternalUrl,
  escapeCsvCell,
  isValidSpreadsheetId,
  hashPassword,
  verifyPassword,
  generateStrongPassword,
} from '../src/utils/securityUtils';
import { EditorProfile, AnchorProfile, UserProfile, SystemType } from '../src/types';
import { INDIAN_STATES, getCitiesForState, findStateForCity } from '../src/data/indiaLocations';
import {
  buildExcelTemplateWorkbook,
  parseExcelBuffer,
  importExcelData,
  canUserImportModule,
} from '../src/services/excelService';

async function runTests() {
  console.log('=====================================================');
  console.log('RUNNING SYSTEM VERIFICATION SUITE: WORKBOOKS, PROFILES & RBAC');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      failed++;
    }
  }

  // Reset store to pristine clean state
  omniStore.resetAllToFactoryDemo();

  // -------------------------------------------------------------
  // TEST 0: Clean Empty State (Zero Dummy Operational Data)
  // -------------------------------------------------------------
  console.log('--- Test 0: Clean Empty Initial State ---');
  assert(omniStore.getInfluencers().length === 0, 'Initial influencers list is empty');
  assert(omniStore.getCampaigns().length === 0, 'Initial campaigns list is empty');
  assert(omniStore.getDeliverables().length === 0, 'Initial deliverables list is empty');
  assert(omniStore.getPayments().length === 0, 'Initial payments list is empty');
  assert(omniStore.getFollowUps().length === 0, 'Initial follow-ups list is empty');
  assert(omniStore.getPerformances().length === 0, 'Initial performances list is empty');
  assert(omniStore.getContentMaster().length === 0, 'Initial content master list is empty');
  assert(omniStore.getEditorCapacities().length === 0, 'Initial editor capacities list is empty');
  assert(omniStore.getChannelSchedules().length === 0, 'Initial channel schedules list is empty');
  assert(omniStore.getAnchorSchedules().length === 0, 'Initial anchor schedules list is empty');
  assert(omniStore.getEditorProfiles().length === 0, 'Initial editor profiles list is empty');
  assert(omniStore.getAnchorProfiles().length === 0, 'Initial anchor profiles list is empty');
  assert(omniStore.getAuditLogs().length === 0, 'Initial audit logs list is empty');
  assert(omniStore.getQuarantineRecords().length === 0, 'Initial quarantine records list is empty');
  assert(omniStore.getNotifications().length === 0, 'Initial notifications list is empty');
  assert(
    omniStore.getUsers().length === 1 && omniStore.getUsers()[0].role === 'Super Admin',
    'Initial users contains only 1 bootstrap Super Admin account'
  );

  // -------------------------------------------------------------
  // TEST 1: Two Separate Google Sheets Workbooks Configuration
  // -------------------------------------------------------------
  console.log('--- Test 1: Dual Google Sheets Workbook Partitioning ---');
  assert(
    Array.isArray(INFLUENCER_SHEET_TABS) && INFLUENCER_SHEET_TABS.length === 6,
    'Influencer Workbook has 6 distinct worksheets'
  );
  assert(
    Array.isArray(DIGITAL_SHEET_TABS) && DIGITAL_SHEET_TABS.length === 6,
    'Digital Data Management Workbook has 6 distinct worksheets'
  );

  const digitalTabNames = DIGITAL_SHEET_TABS.map(t => t.name);
  assert(
    digitalTabNames.includes('Editor_Profiles') && digitalTabNames.includes('Anchor_Profiles'),
    'Digital Data Management Workbook includes Editor_Profiles and Anchor_Profiles tabs'
  );

  const influencerTabNames = INFLUENCER_SHEET_TABS.map(t => t.name);
  assert(
    !influencerTabNames.includes('Editor_Profiles') && !influencerTabNames.includes('Anchor_Profiles'),
    'Influencer Workbook does NOT leak Digital Data profile tabs'
  );

  // -------------------------------------------------------------
  // TEST 2: Add Editor Profile (Without Granting Login Access)
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Add Editor Profile & Login Separation ---');
  const initialUserCount = omniStore.getUsers().length;

  const newEditor: EditorProfile = {
    id: 'ED-TEST-99',
    name: 'Rohan Sharma',
    email: 'rohan.editor@studio.com',
    department: 'Video Production',
    status: 'Active',
    workingDays: 22,
    leaveDays: 0,
    dailyCapacityPoints: 5,
    longVideoTarget: 12,
    shortsTarget: 28,
    monthlyTargetVideos: 25,
    assignedChannels: ['Tech Uncut', 'Daily Shorts'],
    shiftSchedule: 'Day Shift (10 AM - 6 PM)',
    skills: ['Premiere Pro', 'After Effects'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  omniStore.saveEditorProfile(newEditor);
  const fetchedEditors = omniStore.getEditorProfiles();
  const savedEditor = fetchedEditors.find(e => e.id === 'ED-TEST-99');

  assert(
    savedEditor !== undefined && savedEditor.monthlyTargetVideos === 25,
    'Editor Profile created and saved successfully'
  );

  const userCountAfterEditor = omniStore.getUsers().length;
  assert(
    userCountAfterEditor === initialUserCount,
    'CRITICAL: Creating Editor Profile did NOT automatically grant login access (User count unchanged)',
    `User count before: ${initialUserCount}, after: ${userCountAfterEditor}`
  );

  // Test toggle editor status
  omniStore.toggleEditorStatus('ED-TEST-99');
  const deactivatedEditor = omniStore.getEditorProfiles().find(e => e.id === 'ED-TEST-99');
  assert(
    deactivatedEditor?.status === 'Inactive',
    'Editor Profile status toggled to Inactive'
  );

  // -------------------------------------------------------------
  // TEST 3: Add Anchor Profile (Without Granting Login Access)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Add Anchor Profile & Login Separation ---');

  const newAnchor: AnchorProfile = {
    id: 'ANC-TEST-88',
    name: 'Priya Verma',
    email: 'priya.anchor@studio.com',
    department: 'Markets & Finance',
    primaryStudio: 'Studio Floor A',
    status: 'Active',
    primaryChannel: 'Hindi Tech Today',
    assignedCategory: 'Automotive & Tech',
    monthlyTargetShoots: 16,
    preferredShifts: ['Morning Live Shift (8 AM - 2 PM)'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  omniStore.saveAnchorProfile(newAnchor);
  const fetchedAnchors = omniStore.getAnchorProfiles();
  const savedAnchor = fetchedAnchors.find(a => a.id === 'ANC-TEST-88');

  assert(
    savedAnchor !== undefined && savedAnchor.monthlyTargetShoots === 16,
    'Anchor Profile created and saved successfully'
  );

  const userCountAfterAnchor = omniStore.getUsers().length;
  assert(
    userCountAfterAnchor === initialUserCount,
    'CRITICAL: Creating Anchor Profile did NOT automatically grant login access (User count unchanged)',
    `User count before: ${initialUserCount}, after: ${userCountAfterAnchor}`
  );

  // Test toggle anchor status
  omniStore.toggleAnchorStatus('ANC-TEST-88');
  const deactivatedAnchor = omniStore.getAnchorProfiles().find(a => a.id === 'ANC-TEST-88');
  assert(
    deactivatedAnchor?.status === 'Inactive',
    'Anchor Profile status toggled to Inactive'
  );

  // -------------------------------------------------------------
  // TEST 4: Separate Backend-Enforced RBAC & Department Isolation
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Separate RBAC & Fine-Grained Permissions ---');

  const allUsers = omniStore.getUsers();
  
  // Test Super Admin full access
  const admin = allUsers.find(u => u.role === 'Super Admin')!;
  assert(
    omniStore.hasDepartmentAccess(admin, 'influencer') && omniStore.hasDepartmentAccess(admin, 'digital'),
    'Super Admin has access to both departments'
  );
  assert(
    omniStore.hasPermission(admin, 'influencer', 'canCreate') &&
    omniStore.hasPermission(admin, 'influencer', 'viewSensitiveFields') &&
    omniStore.hasPermission(admin, 'digital', 'canApprove'),
    'Super Admin has all feature and sensitive permissions across departments'
  );

  // Test Influencer-only / dual-department Campaign Manager fixture
  const influencerManager = omniStore.saveUser({
    id: 'USR-FIXTURE-MGR',
    name: 'Test Manager',
    email: 'manager.test@company.com',
    role: 'Campaign Manager',
    status: 'Active',
  });
  assert(
    omniStore.hasDepartmentAccess(influencerManager, 'influencer') === true,
    'Campaign Manager has access to Influencer department'
  );
  assert(
    omniStore.hasDepartmentAccess(influencerManager, 'digital') === true,
    'Campaign Manager default config'
  );

  // Test Digital-only Video Editor fixture
  const videoEditorUser = omniStore.saveUser({
    id: 'USR-FIXTURE-ED',
    name: 'Test Editor',
    email: 'editor.test@company.com',
    role: 'Video Editor',
    status: 'Active',
  });
  assert(
    omniStore.hasDepartmentAccess(videoEditorUser, 'digital') === true,
    'Video Editor has access to Digital Data department'
  );
  assert(
    omniStore.hasDepartmentAccess(videoEditorUser, 'influencer') === false,
    'Video Editor is RESTRICTED from Influencer department'
  );
  assert(
    omniStore.hasPermission(videoEditorUser, 'digital', 'viewSensitiveFields') === false,
    'Video Editor is denied sensitive field viewing by default'
  );

  // Test Custom RBAC User Creation by Admin
  console.log('\n--- Test 5: Admin User Creation & Custom Granular RBAC Assignment ---');
  const customUser: UserProfile = {
    id: 'USR-CUSTOM-01',
    name: 'Neha Governance',
    email: 'neha.audit@company.com',
    role: 'Campaign Manager',
    status: 'Active',
    departments: ['influencer'],
    permissions: {
      influencer: {
        canAccess: true,
        canView: true,
        canCreate: true,
        canEdit: false,
        canApprove: false,
        canDelete: false,
        canExport: true,
        viewSensitiveFields: false,
      },
      digital: {
        canAccess: false,
        canView: false,
        canCreate: false,
        canEdit: false,
        canApprove: false,
        canDelete: false,
        canExport: false,
        viewSensitiveFields: false,
      },
    },
  };

  omniStore.saveUser(customUser);
  const fetchedCustom = omniStore.getUsers().find(u => u.id === 'USR-CUSTOM-01')!;

  assert(
    fetchedCustom !== undefined,
    'Custom user created by Admin successfully'
  );
  assert(
    omniStore.hasPermission(fetchedCustom, 'influencer', 'canCreate') === true &&
    omniStore.hasPermission(fetchedCustom, 'influencer', 'canEdit') === false,
    'Custom user permissions enforced (canCreate: true, canEdit: false)'
  );
  assert(
    omniStore.hasDepartmentAccess(fetchedCustom, 'digital') === false,
    'Custom user denied digital department access per RBAC schema'
  );

  // -------------------------------------------------------------
  // TEST 6: Influencer-Only User Normalization & Digital Isolation (Dhruvesh Case)
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Influencer-Only User Isolation & Stale Permission Sanitization ---');
  const dhruvesh = omniStore.saveUser({
    id: 'USR-DHRUVESH',
    name: 'Dhruvesh',
    email: 'dhruvesh@company.com',
    role: 'Campaign Manager',
    status: 'Active',
    departments: ['influencer'],
    permissions: {
      influencer: {
        canAccess: true,
        canView: true,
        canCreate: true,
        canEdit: true,
        canApprove: false,
        canDelete: false,
        canExport: false,
        viewSensitiveFields: false,
        allowedTabs: ['dashboard', 'influencers', 'campaigns'],
      },
      // Simulate stale digital permissions left over before unchecking Digital
      digital: {
        canAccess: true,
        canView: true,
        canCreate: true,
        canEdit: true,
        canApprove: true,
        canDelete: true,
        canExport: true,
        viewSensitiveFields: true,
        allowedTabs: ['digital_dashboard', 'content_master'],
      },
    },
    governanceTabs: [],
  });

  assert(
    omniStore.hasDepartmentAccess(dhruvesh, 'influencer') === true,
    'Dhruvesh has approved Influencer access'
  );
  assert(
    omniStore.hasDepartmentAccess(dhruvesh, 'digital') === false,
    'Dhruvesh is strictly denied Digital Data Management even when stale digital flags were submitted'
  );
  assert(
    omniStore.hasTabAccess(dhruvesh, 'digital', 'digital_dashboard') === false &&
    omniStore.hasTabAccess(dhruvesh, 'digital', 'content_master') === false,
    'Dhruvesh has zero tab access inside Digital Data Management'
  );
  assert(
    omniStore.hasTabAccess(dhruvesh, 'influencer', 'payments') === false &&
    omniStore.hasTabAccess(dhruvesh, 'influencer', 'campaigns') === true,
    'Dhruvesh per-module tab allowlist enforced (campaigns allowed, payments denied)'
  );
  assert(
    omniStore.hasGovernanceAccess(dhruvesh, 'users') === false &&
    omniStore.hasGovernanceAccess(dhruvesh, 'sync') === false,
    'Dhruvesh is denied Governance tabs (users, sync) by default'
  );
  const firstRoute = omniStore.getFirstAllowedRoute(dhruvesh);
  assert(
    firstRoute !== null && firstRoute.system === 'influencer' && firstRoute.tab === 'dashboard',
    'getFirstAllowedRoute resolves directly to approved Influencer workspace',
    `Got: ${JSON.stringify(firstRoute)}`
  );

  // -------------------------------------------------------------
  // TEST 7: Email Approval Gate & Non-Admin Session Lock
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Email Approval Gate & Privilege Escalation Prevention ---');
  assert(
    omniStore.resolveUserByEmail('DHRUVESH@company.com')?.id === 'USR-DHRUVESH',
    'resolveUserByEmail matches active approved user case-insensitively'
  );
  assert(
    omniStore.resolveUserByEmail('stranger@unknown.com') === null,
    'resolveUserByEmail denies unapproved email address'
  );

  const suspendedUser = omniStore.saveUser({
    id: 'USR-SUSPENDED',
    name: 'Suspended User',
    email: 'suspended@company.com',
    role: 'Content Coordinator',
    status: 'Suspended',
    departments: ['influencer'],
  });
  assert(
    omniStore.resolveUserByEmail(suspendedUser.email) === null,
    'resolveUserByEmail denies suspended accounts'
  );

  // Sign in as Dhruvesh (non-Super Admin) and verify cannot switch to Super Admin
  omniStore.setAuthenticatedUser(dhruvesh);
  let escalationBlocked = false;
  try {
    omniStore.setCurrentUser(admin);
  } catch (err: any) {
    escalationBlocked = err?.message?.includes('Unauthorized');
  }
  assert(
    escalationBlocked,
    'Non-Super Admin cannot escalate privileges via setCurrentUser(admin)'
  );

  // -------------------------------------------------------------
  // TEST 8: Service-Layer Mutation Guards
  // -------------------------------------------------------------
  console.log('\n--- Test 8: Service-Layer RBAC Mutation Guards ---');
  let blockedDigitalMutation = false;
  try {
    omniStore.saveContentMaster({ title: 'Unauthorized Digital Topic' });
  } catch (err: any) {
    blockedDigitalMutation = err?.message?.includes('Unauthorized');
  }
  assert(
    blockedDigitalMutation,
    'Influencer-only user is blocked from creating Digital Content Master records at service layer'
  );

  let blockedUserCreation = false;
  try {
    omniStore.saveUser({ name: 'Rogue Admin', email: 'rogue@evil.com', role: 'Super Admin', status: 'Active' });
  } catch (err: any) {
    blockedUserCreation = err?.message?.includes('Unauthorized');
  }
  assert(
    blockedUserCreation,
    'Non-Super Admin is blocked from creating or modifying User accounts at service layer'
  );

  const blockedPaymentApprove = omniStore.savePayment({
    campaignId: 'CMP-NONE',
    amount: 5000,
    paymentType: 'Advance',
    status: 'Approved',
  });
  assert(
    Boolean(blockedPaymentApprove.error && blockedPaymentApprove.error.includes('Unauthorized')),
    'User without canApprove is blocked from approving payments at service layer',
    blockedPaymentApprove.error
  );

  const blockedReconcile = omniStore.reconcileQuarantinedPayment(
    'QR-FAKE',
    { amount: 1000, paymentType: 'Advance' },
    'unauthorized attempt'
  );
  assert(
    Boolean(blockedReconcile.error && blockedReconcile.error.includes('Unauthorized')),
    'User without Quarantine governance access is blocked from reconciling quarantined rows',
    blockedReconcile.error
  );

  // Restore authenticated Super Admin for remaining checks
  omniStore.setAuthenticatedUser(admin);

  // -------------------------------------------------------------
  // TEST 9: Fixed Google Sheet URL Extraction & Validation
  // -------------------------------------------------------------
  console.log('\n--- Test 9: Fixed Google Sheet ID Extraction & Guardrails ---');
  const extracted = googleSheetsService.extractSpreadsheetId(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
  );
  assert(
    extracted === '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    'extractSpreadsheetId accurately parses ID from full Google Sheets URL',
    `Got: ${extracted}`
  );

  let invalidPinRejected = false;
  try {
    await googleSheetsService.connectAndPinExistingSpreadsheet('not-a-valid-sheet!!', 'influencer');
  } catch (err: any) {
    invalidPinRejected = err?.message?.includes('valid Google Sheet URL');
  }
  assert(
    invalidPinRejected,
    'connectAndPinExistingSpreadsheet rejects invalid Sheet URLs/IDs'
  );

  // Verify non-sync user cannot connect/pin sheets
  omniStore.setAuthenticatedUser(dhruvesh);
  let unauthorizedPinRejected = false;
  try {
    await googleSheetsService.connectAndPinExistingSpreadsheet(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      'influencer'
    );
  } catch (err: any) {
    unauthorizedPinRejected = err?.message?.includes('Unauthorized');
  }
  assert(
    unauthorizedPinRejected,
    'connectAndPinExistingSpreadsheet rejects users without Google Sheets Sync governance access'
  );
  omniStore.setAuthenticatedUser(admin);

  // -------------------------------------------------------------
  // TEST 10: Security Utilities (XSS, URL Validation, CSV Formula Neutralization)
  // -------------------------------------------------------------
  console.log('\n--- Test 10: Security Utilities ---');
  assert(
    escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;',
    'escapeHtml escapes HTML tags and prevents markup injection'
  );
  assert(
    sanitizeExternalUrl('javascript:alert(1)') === null &&
    sanitizeExternalUrl('data:text/html,<script>alert(1)</script>') === null &&
    sanitizeExternalUrl('https://docs.google.com/spreadsheets/d/abc') === 'https://docs.google.com/spreadsheets/d/abc',
    'sanitizeExternalUrl blocks javascript:/data: protocols and allows https:'
  );
  assert(
    escapeCsvCell('=CMD("calc")') === '"\'=CMD(""calc"")"',
    'escapeCsvCell neutralizes spreadsheet formula injection',
    `Got: ${escapeCsvCell('=CMD("calc")')}`
  );
  assert(
    isValidSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms') === true &&
    isValidSpreadsheetId('../etc/passwd') === false,
    'isValidSpreadsheetId validates genuine Sheet IDs and rejects path traversal'
  );

  // -------------------------------------------------------------
  // TEST 11: Post-Campaign Posted Links, Performance Upsert & India Locations
  // -------------------------------------------------------------
  console.log('\n--- Test 11: Post-Campaign Links, Performance Sync & Standardized Locations ---');
  const { record: testInf } = omniStore.saveInfluencer({
    name: 'Aarti Fashion',
    phone: '9876543210',
    email: 'aarti@fashion.in',
    city: 'Surat',
    state: 'Gujarat',
    influencerType: 'Instagram',
    influencerStatus: 'Active',
    collaborationType: 'Paid',
    engagementRate: 4.5,
    businessTypes: ['Ajit Zone'],
    departments: ['Saree', 'Lehenga'],
    socialPlatforms: {
      instagram: { handle: '@aartifashion', followers: 85000 },
    },
  });

  const testCampaign = omniStore.saveCampaign({
    name: 'Diwali Saree Launch',
    influencerId: testInf.id,
    businessTypes: ['Ajit Zone'],
    departments: ['Saree'],
    collaborationType: 'Paid',
    agreedAmount: 12000,
    status: 'Completed',
  });

  const testDel = omniStore.saveDeliverable({
    campaignId: testCampaign.id,
    title: 'Diwali Saree Reel',
    type: 'Instagram Reel',
    expectedPostingDate: '2025-11-01',
    status: 'Pending',
  });

  // Update deliverable with posted link even though campaign is already Completed
  const postedDel = omniStore.saveDeliverable({
    ...testDel,
    status: 'Posted',
    actualPostingDate: '2025-11-02',
    publishedUrl: 'https://www.instagram.com/reel/DIWALI123/',
  });
  assert(
    postedDel.status === 'Posted' && postedDel.publishedUrl === 'https://www.instagram.com/reel/DIWALI123/',
    'Deliverable posted link saved cleanly after campaign is Completed'
  );

  // Log initial performance (Day 7 - modest initial traction) linked to deliverableId
  const perf1 = omniStore.savePerformance({
    campaignId: testCampaign.id,
    deliverableId: postedDel.id,
    platform: 'Instagram',
    publishedUrl: postedDel.publishedUrl,
    viewsDay7: 3500,
    viewsDay15: 0,
    viewsDay30: 0,
    likes: 75,
    comments: 4,
    shares: 2,
    saves: 8,
    reach: 3200,
    allocatedSpend: 12000,
  });

  // Update performance (Day 30 - strong growth) WITHOUT passing perf1.id — must upsert by deliverableId (no duplicate row)
  const perf2 = omniStore.savePerformance({
    campaignId: testCampaign.id,
    deliverableId: postedDel.id,
    platform: 'Instagram',
    publishedUrl: postedDel.publishedUrl,
    viewsDay7: 3500,
    viewsDay15: 48000,
    viewsDay30: 75000,
    likes: 6200,
    comments: 310,
    shares: 520,
    saves: 890,
    reach: 68000,
    allocatedSpend: 12000,
  });

  const matchingPerfs = omniStore.getPerformances().filter(p => p.deliverableId === postedDel.id);
  assert(
    matchingPerfs.length === 1 && perf2.id === perf1.id && perf2.viewsDay30 === 75000,
    'savePerformance upserts by deliverableId without creating duplicate performance rows',
    `Count=${matchingPerfs.length}, id1=${perf1.id}, id2=${perf2.id}`
  );
  assert(
    perf2.performanceScore > perf1.performanceScore,
    'Performance score automatically recalculates upward when views/engagement increase',
    `Score1=${perf1.performanceScore}, Score2=${perf2.performanceScore}`
  );
  assert(
    omniStore.getPerformanceByDeliverableId(postedDel.id)?.id === perf1.id,
    'getPerformanceByDeliverableId resolves linked performance record'
  );

  // Edit-only user (canEdit: true, canCreate: false) can log post-publish performance on an existing deliverable
  const editOnlyUser = omniStore.saveUser({
    id: 'USR-EDIT-ONLY',
    name: 'Ops Updater',
    email: 'ops.updater@company.com',
    role: 'Content Coordinator',
    status: 'Active',
    departments: ['influencer'],
    permissions: {
      influencer: {
        canAccess: true,
        canView: true,
        canCreate: false,
        canEdit: true,
        canApprove: false,
        canDelete: false,
        canExport: false,
        viewSensitiveFields: false,
        allowedTabs: ['campaigns', 'performance'],
      },
      digital: {
        canAccess: false,
        canView: false,
        canCreate: false,
        canEdit: false,
        canApprove: false,
        canDelete: false,
        canExport: false,
        viewSensitiveFields: false,
        allowedTabs: [],
      },
    },
  });
  const secondDel = omniStore.saveDeliverable({
    campaignId: testCampaign.id,
    title: 'Diwali Shorts Clip',
    type: 'YouTube Short',
    expectedPostingDate: '2025-11-05',
    status: 'Posted',
    publishedUrl: 'https://youtube.com/shorts/ABC123',
  });
  omniStore.setAuthenticatedUser(editOnlyUser);
  const editAddedDel = omniStore.saveDeliverable({
    campaignId: testCampaign.id,
    title: 'Diwali Bonus Reel #3',
    type: 'Instagram Reel',
    expectedPostingDate: '2025-11-06',
    status: 'Posted',
    publishedUrl: 'https://www.instagram.com/reel/DIWALI_BONUS_3/',
  });
  const editOnlyPerf = omniStore.savePerformance({
    campaignId: testCampaign.id,
    deliverableId: editAddedDel.id,
    platform: 'Instagram',
    publishedUrl: editAddedDel.publishedUrl,
    viewsDay7: 14500,
    likes: 920,
    comments: 45,
    shares: 60,
    reach: 13000,
    allocatedSpend: 0,
  });
  assert(
    editOnlyPerf.viewsDay7 === 14500 && editOnlyPerf.deliverableId === editAddedDel.id,
    'Edit-only user can add a Reel posted link and log separate performance on a Completed campaign'
  );
  const campaignPerfs = omniStore.getPerformances().filter(p => p.campaignId === testCampaign.id);
  assert(
    campaignPerfs.length === 2 &&
    campaignPerfs.some(p => p.deliverableId === postedDel.id && p.viewsDay30 === 75000) &&
    campaignPerfs.some(p => p.deliverableId === editAddedDel.id && p.viewsDay7 === 14500),
    'Multiple Reels under the same campaign retain completely separate posted links and performance records',
    `Count=${campaignPerfs.length}`
  );

  // Add multiple distinct posted links & separate performances under the SAME deliverable (unlimited links)
  const extraLink2 = omniStore.savePerformance(
    {
      campaignId: testCampaign.id,
      deliverableId: postedDel.id,
      platform: 'Instagram',
      contentTitle: 'Diwali Saree Reel - Link #2',
      publishedUrl: 'https://www.instagram.com/reel/DIWALI_LINK_2/',
      viewsDay7: 18000,
      likes: 1100,
      comments: 64,
      shares: 90,
      reach: 16500,
    },
    { forceNew: true }
  );
  const extraLink3 = omniStore.savePerformance(
    {
      campaignId: testCampaign.id,
      deliverableId: '',
      platform: 'YouTube',
      contentTitle: 'Campaign Direct Video Link #3',
      publishedUrl: 'https://youtu.be/DIWALI_DIRECT_3',
      viewsDay7: 31000,
      likes: 2400,
      comments: 120,
      shares: 210,
      reach: 29000,
    },
    { forceNew: true }
  );
  const delLinks = omniStore.getPerformancesByDeliverableId(postedDel.id);
  assert(
    delLinks.length === 2 && delLinks.some(p => p.id === extraLink2.id) && delLinks.some(p => p.id === perf1.id),
    'Multiple distinct posted links can be saved under the same deliverable without overwriting',
    `delLinks=${delLinks.length}`
  );
  assert(
    omniStore.getPerformances().some(p => p.id === extraLink3.id && p.campaignId === testCampaign.id && p.deliverableId === ''),
    'Direct campaign-level posted links & performance can be added without limit'
  );
  omniStore.deletePerformance(extraLink2.id);
  assert(
    omniStore.getPerformancesByDeliverableId(postedDel.id).length === 1 &&
    omniStore.getPerformances().some(p => p.id === extraLink3.id),
    'deletePerformance removes only the selected posted link and preserves all other links'
  );
  omniStore.setAuthenticatedUser(admin);

  // Standardized India State & City Dropdown Dataset
  assert(
    INDIAN_STATES.length === 36,
    'INDIA_STATES_AND_CITIES covers all 28 States + 8 Union Territories (36 total)',
    `Got: ${INDIAN_STATES.length}`
  );
  const gujaratCities = getCitiesForState('Gujarat');
  assert(
    gujaratCities.includes('Surat') && gujaratCities.includes('Ahmedabad') && gujaratCities.includes('Vadodara'),
    'getCitiesForState returns standardized cities for Gujarat'
  );
  const allCitiesDeduplicatedAndSorted = INDIAN_STATES.every(st => {
    const cities = getCitiesForState(st);
    const uniqueSorted = Array.from(new Set(cities)).sort((a, b) => a.localeCompare(b));
    return cities.length > 0 && cities.length === uniqueSorted.length && cities.every((c, idx) => c === uniqueSorted[idx]);
  });
  assert(
    allCitiesDeduplicatedAndSorted,
    'All 36 States/UTs return non-empty, deduplicated, alphabetically sorted city lists'
  );
  assert(
    findStateForCity('Surat') === 'Gujarat' && findStateForCity('Mumbai') === 'Maharashtra' && findStateForCity('Jaipur') === 'Rajasthan',
    'findStateForCity resolves canonical State for existing city records'
  );

  // -------------------------------------------------------------
  // TEST 12: Per-Menu Excel Templates, Round-Trip .xlsx Import & RBAC
  // -------------------------------------------------------------
  console.log('\n--- Test 12: Excel Templates & Bulk Import Across All 16 Menu Options ---');
  const allMenuModules: Array<{ id: string; system: SystemType }> = [
    { id: 'dashboard', system: 'influencer' },
    { id: 'influencers', system: 'influencer' },
    { id: 'campaigns', system: 'influencer' },
    { id: 'payments', system: 'influencer' },
    { id: 'followups', system: 'influencer' },
    { id: 'performance', system: 'influencer' },
    { id: 'digital_dashboard', system: 'digital' },
    { id: 'content_master', system: 'digital' },
    { id: 'editor_workspace', system: 'digital' },
    { id: 'editor_capacity', system: 'digital' },
    { id: 'channel_schedules', system: 'digital' },
    { id: 'anchor_schedules', system: 'digital' },
    { id: 'users', system: 'influencer' },
    { id: 'sync', system: 'influencer' },
    { id: 'audit', system: 'influencer' },
    { id: 'quarantine', system: 'influencer' },
  ];

  const allTemplatesValid = allMenuModules.every(({ id, system }) => {
    const { workbook, fileName } = buildExcelTemplateWorkbook(id, system);
    const hasGuide = workbook.SheetNames.includes('Sample_And_Guide');
    const hasDataSheet = workbook.SheetNames.length >= 2;
    return fileName.endsWith('.xlsx') && hasGuide && hasDataSheet;
  });
  assert(
    allTemplatesValid,
    'All 16 menu options generate valid .xlsx templates with data sheet(s) and Sample_And_Guide'
  );

  // Round-trip 1: Influencer import with auto-inferred State from City ('Jaipur' -> 'Rajasthan')
  const infWb = XLSX.utils.book_new();
  const infSheet = XLSX.utils.json_to_sheet([
    {
      Name: 'Kavita Ethnic Studio',
      Phone: '9829011223',
      Email: 'kavita@ethnicstudio.in',
      State: '',
      City: 'Jaipur',
      Business_Types: 'Ajit Zone',
      Departments: 'Saree, Kurti',
      Instagram_Handle: '@kavitaethnic',
      Instagram_Followers: '64000',
      Reel_Rate: '9500',
    },
  ]);
  XLSX.utils.book_append_sheet(infWb, infSheet, 'Influencers');
  XLSX.utils.book_append_sheet(infWb, XLSX.utils.json_to_sheet([{ Note: 'Should be skipped' }]), 'Sample_And_Guide');
  const infBuf = XLSX.write(infWb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const parsedInf = parseExcelBuffer(infBuf, 'Influencers_Import.xlsx');
  assert(
    parsedInf.sheets.length === 1 && parsedInf.totalRows === 1,
    'parseExcelBuffer reads data sheets and automatically skips Sample_And_Guide',
    `sheets=${parsedInf.sheets.length}, totalRows=${parsedInf.totalRows}`
  );
  const infImportRes = importExcelData('influencers', 'influencer', parsedInf.sheets);
  const importedKavita = omniStore.getInfluencers().find(i => i.email === 'kavita@ethnicstudio.in');
  assert(
    infImportRes.importedCount === 1 && importedKavita !== undefined && importedKavita.state === 'Rajasthan',
    'Influencer Excel import persists record and auto-infers State (Jaipur -> Rajasthan)',
    `imported=${infImportRes.importedCount}, state=${importedKavita?.state}, errors=${infImportRes.errors.join('; ')}`
  );

  // Round-trip 2: Campaigns + Deliverables_And_Links (2-sheet workbook)
  const campWb = XLSX.utils.book_new();
  const campSheet = XLSX.utils.json_to_sheet([
    {
      Campaign_Name: 'Jaipur Festive Kurti Launch',
      Influencer_Name_Or_ID: 'Kavita Ethnic Studio',
      Business_Types: 'Ajit Zone',
      Departments: 'Kurti',
      Collaboration_Type: 'Paid',
      Status: 'Completed',
      Agreed_Amount: '18000',
      Month: 'November',
      Year: '2026',
    },
  ]);
  const delLinkSheet = XLSX.utils.json_to_sheet([
    {
      Campaign_Name_Or_ID: 'Jaipur Festive Kurti Launch',
      Reel_Video_Title: 'Festive Kurti Try-On Reel #1',
      Type: 'Instagram Reel',
      Status: 'Posted',
      Posted_Link_URL: 'https://www.instagram.com/reel/JAIPUR01/',
      Platform: 'Instagram',
      Views_Day7: '22000',
      Likes: '1850',
      Comments: '95',
      Shares: '140',
      Reach: '20500',
    },
  ]);
  XLSX.utils.book_append_sheet(campWb, campSheet, 'Campaigns');
  XLSX.utils.book_append_sheet(campWb, delLinkSheet, 'Deliverables_And_Links');
  const campBuf = XLSX.write(campWb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const parsedCamp = parseExcelBuffer(campBuf, 'Campaigns_Import.xlsx');
  const campImportRes = importExcelData('campaigns', 'influencer', parsedCamp.sheets);
  const importedCamp = omniStore.getCampaigns().find(c => c.name === 'Jaipur Festive Kurti Launch');
  const importedCampDels = importedCamp ? omniStore.getDeliverables().filter(d => d.campaignId === importedCamp.id) : [];
  const importedCampPerfs = importedCamp ? omniStore.getPerformances().filter(p => p.campaignId === importedCamp.id) : [];
  assert(
    campImportRes.importedCount >= 2 &&
    importedCamp !== undefined &&
    importedCampDels.length === 1 &&
    importedCampPerfs.length === 1 &&
    importedCampPerfs[0].viewsDay7 === 22000,
    '2-sheet Campaigns Excel import creates Campaign, Deliverable, and linked Posted Link Performance',
    `imported=${campImportRes.importedCount}, dels=${importedCampDels.length}, perfs=${importedCampPerfs.length}, errors=${campImportRes.errors.join('; ')}`
  );

  // Round-trip 3: Payments import validates positive vs negative amount
  const payWb = XLSX.utils.book_new();
  const paySheet = XLSX.utils.json_to_sheet([
    {
      Campaign_ID_Or_Name: 'Jaipur Festive Kurti Launch',
      Payment_Type: 'Advance',
      Amount: '9000',
      Status: 'Submitted',
      Payment_Mode: 'NEFT',
      Payment_Date: '2026-11-05',
    },
    {
      Campaign_ID_Or_Name: 'Jaipur Festive Kurti Launch',
      Payment_Type: 'Milestone 1',
      Amount: '-5000',
      Status: 'Submitted',
      Payment_Mode: 'UPI',
    },
  ]);
  XLSX.utils.book_append_sheet(payWb, paySheet, 'Payments');
  const payBuf = XLSX.write(payWb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const parsedPay = parseExcelBuffer(payBuf, 'Payments_Import.xlsx');
  const payImportRes = importExcelData('payments', 'influencer', parsedPay.sheets);
  assert(
    payImportRes.importedCount === 1 && payImportRes.skippedCount === 1 && payImportRes.errors.length === 1,
    'Payments Excel import saves valid positive row and rejects negative -5000 row with error',
    `imported=${payImportRes.importedCount}, skipped=${payImportRes.skippedCount}, errors=${payImportRes.errors.join('; ')}`
  );

  // Round-trip 4: Digital Content Master import
  const digitalWb = XLSX.utils.book_new();
  const contentSheet = XLSX.utils.json_to_sheet([
    {
      Title: 'Bridal Lehenga Shoot BTS 2026',
      Department: 'Textile & Fashion',
      Content_Type: 'Shorts / Reel',
      Anchor: 'Priya Verma',
      Recording_Date: '2026-11-12',
      Recording_Status: 'Recorded',
      Assigned_Editor_Name: 'Rohan Sharma',
      Editing_Status: 'Assigned',
      Categories: 'Lehenga, Bridal',
      Channels: 'Instagram Reels, YouTube Shorts',
    },
  ]);
  XLSX.utils.book_append_sheet(digitalWb, contentSheet, 'Content_Master');
  const digitalBuf = XLSX.write(digitalWb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
  const parsedDigital = parseExcelBuffer(digitalBuf, 'Content_Master_Import.xlsx');
  const digitalImportRes = importExcelData('content_master', 'digital', parsedDigital.sheets);
  assert(
    digitalImportRes.importedCount === 1 &&
    omniStore.getContentMaster().some(c => c.title === 'Bridal Lehenga Shoot BTS 2026'),
    'Digital Content Master Excel import persists studio content record',
    `imported=${digitalImportRes.importedCount}, errors=${digitalImportRes.errors.join('; ')}`
  );

  // Round-trip 5: RBAC blocks unauthorized Excel import (Influencer-only user dhruvesh)
  assert(
    canUserImportModule('content_master', 'digital', dhruvesh) === false &&
    canUserImportModule('users', 'influencer', dhruvesh) === false,
    'canUserImportModule blocks Digital and User Admin imports for Influencer-only user'
  );
  omniStore.setAuthenticatedUser(dhruvesh);
  const blockedDigitalRes = importExcelData('content_master', 'digital', parsedDigital.sheets);
  assert(
    blockedDigitalRes.importedCount === 0 && blockedDigitalRes.errors.some(e => e.includes('Unauthorized')),
    'importExcelData rejects unauthorized cross-module import attempts at service layer',
    `errors=${blockedDigitalRes.errors.join('; ')}`
  );
  omniStore.setAuthenticatedUser(admin);

  // -------------------------------------------------------------
  // TEST 13: Entry Deletion Across All Modules, RBAC & Google Sheets Clear+Sync
  // -------------------------------------------------------------
  console.log('\n--- Test 13: Deletion Operations, Cascade Cleanup, RBAC & Google Sheet Sync ---');

  // Create disposable test records across Influencer + Digital + Governance
  const { record: delInf } = omniStore.saveInfluencer({
    name: 'Delete Me Creator',
    phone: '9911223344',
    email: 'deleteme@creator.in',
    city: 'Mumbai',
    state: 'Maharashtra',
    businessTypes: ['Ajit Zone'],
    departments: ['Saree'],
  });
  const delCamp = omniStore.saveCampaign({
    name: 'Delete Me Campaign',
    influencerId: delInf.id,
    influencerName: delInf.name,
    agreedAmount: 20000,
    status: 'Active',
  });
  const delItem1 = omniStore.saveDeliverable({
    campaignId: delCamp.id,
    title: 'Delete Me Reel 1',
    type: 'Instagram Reel',
    status: 'Posted',
    publishedUrl: 'https://instagram.com/reel/DEL1',
  });
  const delItem2 = omniStore.saveDeliverable({
    campaignId: delCamp.id,
    title: 'Delete Me Reel 2',
    type: 'Instagram Reel',
    status: 'Pending',
  });
  const delPerf = omniStore.savePerformance(
    {
      campaignId: delCamp.id,
      deliverableId: delItem1.id,
      contentTitle: 'Delete Me Reel 1',
      platform: 'Instagram',
      publishedUrl: 'https://instagram.com/reel/DEL1',
      viewsDay7: 5000,
    },
    { forceNew: true }
  );
  const delPayRes = omniStore.savePayment({
    campaignId: delCamp.id,
    amount: 6000,
    paymentType: 'Advance',
    status: 'Approved',
  });
  const delFol = omniStore.saveFollowUp({
    entityType: 'campaign',
    entityId: delCamp.id,
    entityName: delCamp.name,
    purpose: 'Follow up to delete',
  });

  // RBAC: User without canDelete is strictly blocked from deleting Influencer/Campaign/Payment/FollowUp
  omniStore.setAuthenticatedUser(editOnlyUser);
  let blockedInfDelete = false;
  try {
    omniStore.deleteInfluencer(delInf.id);
  } catch (err: any) {
    blockedInfDelete = err?.message?.includes('Unauthorized');
  }
  assert(
    blockedInfDelete && omniStore.getInfluencers().some(i => i.id === delInf.id),
    'User without canDelete permission is blocked from deleting Influencer records'
  );
  omniStore.setAuthenticatedUser(admin);

  // Delete single deliverable -> removes deliverable + linked performance + recalculates campaign count
  omniStore.deleteDeliverable(delItem1.id);
  const campAfterDel1 = omniStore.getCampaigns().find(c => c.id === delCamp.id);
  assert(
    !omniStore.getDeliverables().some(d => d.id === delItem1.id) &&
    !omniStore.getPerformances().some(p => p.id === delPerf.id) &&
    campAfterDel1?.deliverablesCount === 1,
    'deleteDeliverable removes deliverable + linked performance and updates campaign deliverablesCount',
    `deliverablesCount=${campAfterDel1?.deliverablesCount}`
  );

  // Delete single payment -> updates campaign balance back to full agreed amount
  omniStore.deletePayment(delPayRes.payment.id);
  const balAfterPayDel = omniStore.getCampaignOutstandingBalance(delCamp.id);
  assert(
    !omniStore.getPayments().some(p => p.id === delPayRes.payment.id) &&
    balAfterPayDel.totalPaid === 0 &&
    balAfterPayDel.balance === 20000,
    'deletePayment removes ledger entry and restores campaign outstanding balance'
  );

  // Delete follow-up
  omniStore.deleteFollowUp(delFol.id);
  assert(
    !omniStore.getFollowUps().some(f => f.id === delFol.id),
    'deleteFollowUp removes follow-up entry cleanly'
  );

  // Delete campaign -> cascades remaining deliverables
  omniStore.deleteCampaign(delCamp.id);
  assert(
    !omniStore.getCampaigns().some(c => c.id === delCamp.id) &&
    !omniStore.getDeliverables().some(d => d.id === delItem2.id),
    'deleteCampaign removes campaign and cascades child deliverables'
  );

  // Delete influencer
  omniStore.deleteInfluencer(delInf.id);
  assert(
    !omniStore.getInfluencers().some(i => i.id === delInf.id),
    'deleteInfluencer removes creator profile cleanly'
  );

  // Digital records deletion + cascade
  const { record: delContent } = omniStore.saveContentMaster({ title: 'Delete Me Studio Video' });
  const delChanSched = omniStore.saveChannelSchedule({
    contentId: delContent.id,
    contentTitle: delContent.title,
    channelName: 'YouTube Main',
  });
  const delAncSched = omniStore.saveAnchorSchedule({
    anchorName: 'Temp Anchor',
    topicTitle: 'Delete Me Shoot',
  });
  const { profile: delEdProf } = omniStore.saveEditorProfile({ name: 'Temp Editor To Delete' });
  const { profile: delAncProf } = omniStore.saveAnchorProfile({ name: 'Temp Anchor Profile' });

  omniStore.deleteContentMaster(delContent.id);
  assert(
    !omniStore.getContentMaster().some(c => c.id === delContent.id) &&
    !omniStore.getChannelSchedules().some(cs => cs.id === delChanSched.id),
    'deleteContentMaster removes studio topic and cascades linked Channel Schedules'
  );
  omniStore.deleteAnchorSchedule(delAncSched.id);
  omniStore.deleteEditorProfile(delEdProf.id);
  omniStore.deleteAnchorProfile(delAncProf.id);
  assert(
    !omniStore.getAnchorSchedules().some(a => a.id === delAncSched.id) &&
    !omniStore.getEditorProfiles().some(e => e.id === delEdProf.id) &&
    !omniStore.getEditorCapacities().some(ec => ec.editorId === delEdProf.id) &&
    !omniStore.getAnchorProfiles().some(ap => ap.id === delAncProf.id),
    'Digital delete methods cleanly remove Anchor Schedules, Editor Profiles + Capacity, and Anchor Profiles'
  );

  // User deletion protection (cannot delete self; can delete secondary user)
  let selfDeleteBlocked = false;
  try {
    omniStore.deleteUser(admin.id);
  } catch (err: any) {
    selfDeleteBlocked = err?.message?.includes('currently signed-in');
  }
  assert(selfDeleteBlocked, 'deleteUser prevents deleting the currently signed-in admin account');

  const tempUser = omniStore.saveUser({
    id: 'USR-TEMP-DEL',
    name: 'Temp Delete User',
    email: 'temp.delete@company.com',
    role: 'Content Coordinator',
    departments: ['influencer'],
  });
  omniStore.deleteUser(tempUser.id);
  assert(
    !omniStore.getUsers().some(u => u.id === tempUser.id),
    'Super Admin can permanently delete secondary user accounts'
  );

  // Google Sheets deletion reflection verification:
  // 1. Payload excludes deleted rows
  const infSheetPayloads = googleSheetsService.buildSheetPushPayloads('influencer');
  const infMasterSheet = infSheetPayloads.find(p => p.range.startsWith('Influencer_Master!'));
  const campMasterSheet = infSheetPayloads.find(p => p.range.startsWith('Campaign_Master!'));
  assert(
    Boolean(infMasterSheet && !infMasterSheet.values.some(row => row[0] === delInf.id)) &&
    Boolean(campMasterSheet && !campMasterSheet.values.some(row => row[0] === delCamp.id)),
    'buildSheetPushPayloads excludes deleted Influencer and Campaign records from Google Sheet payload'
  );

  // 2. pushDatabaseToSheets calls values:batchClear FIRST and values:batchUpdate SECOND so deleted rows are wiped
  const fetchCalls: Array<{ url: string; body: any }> = [];
  const origFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string, init?: any) => {
    fetchCalls.push({
      url: String(url),
      body: init?.body ? JSON.parse(init.body) : null,
    });
    return {
      ok: true,
      json: async () => ({}),
    } as any;
  };
  try {
    await googleSheetsService.pushDatabaseToSheets(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      'influencer',
      'test-access-token'
    );
  } finally {
    globalThis.fetch = origFetch;
  }
  assert(
    fetchCalls.length === 2 &&
    fetchCalls[0].url.includes('/values:batchClear') &&
    Array.isArray(fetchCalls[0].body?.ranges) &&
    fetchCalls[0].body.ranges.length === 6 &&
    fetchCalls[1].url.includes('/values:batchUpdate') &&
    fetchCalls[1].body?.data?.length === 6,
    'Google Sheets sync executes values:batchClear BEFORE values:batchUpdate across all 6 tabs so deleted rows are wiped',
    `Calls: ${fetchCalls.map(c => c.url).join(' -> ')}`
  );

  // -------------------------------------------------------------
  // TEST 14: Per-User Password Auth, PBKDF2 Hashing & Account Isolation
  // -------------------------------------------------------------
  console.log('\n--- Test 14: Per-User Password Auth & Strict Account Isolation ---');
  omniStore.setAuthenticatedUser(admin);

  const generatedPwd = generateStrongPassword(12);
  assert(
    generatedPwd.length >= 12 &&
    /[A-Z]/.test(generatedPwd) &&
    /[a-z]/.test(generatedPwd) &&
    /[0-9]/.test(generatedPwd),
    'generateStrongPassword produces strong mixed-character credentials'
  );

  const hashA = await hashPassword('Dhruvesh@2026');
  const hashB = await hashPassword('Dhruvesh@2026');
  assert(
    hashA.startsWith('pbkdf2_sha256$100000$') &&
    hashA !== hashB &&
    !hashA.includes('Dhruvesh@2026') &&
    (await verifyPassword('Dhruvesh@2026', hashA)) === true &&
    (await verifyPassword('WrongPass@2026', hashA)) === false,
    'PBKDF2-SHA256 hashes passwords with unique random salts and verifies accurately'
  );

  // Super Admin creates Dhruvesh Rajpurohit with password (even attempting 'users' governance tab must be stripped)
  const dhruveshAcct = omniStore.saveUser({
    id: 'USR-DHRUVESH-PWD',
    name: 'Dhruvesh Rajpurohit',
    email: 'dhruvesh.rajpurohit@company.com',
    role: 'Campaign Manager',
    departments: ['influencer'],
    governanceTabs: ['users', 'audit'],
  });
  await omniStore.setUserPassword(dhruveshAcct.id, 'Dhruvesh#2026');

  // Verify editing permissions preserves the configured password
  omniStore.saveUser({
    ...dhruveshAcct,
    name: 'Dhruvesh Rajpurohit',
    departments: ['influencer'],
  });

  const authSuccess = await omniStore.authenticateWithPassword('dhruvesh.rajpurohit@company.com', 'Dhruvesh#2026');
  const authWrongPwd = await omniStore.authenticateWithPassword('dhruvesh.rajpurohit@company.com', 'WrongPassword99');
  assert(
    authSuccess !== null &&
    authSuccess.id === dhruveshAcct.id &&
    authSuccess.hasPassword === true &&
    authSuccess.passwordHash === undefined &&
    authWrongPwd === null,
    'authenticateWithPassword signs in active user with valid password, strips hash, and rejects wrong password'
  );

  assert(
    omniStore.hasGovernanceAccess(authSuccess!, 'users') === false &&
    !authSuccess!.governanceTabs?.includes('users'),
    'Non-Super Admin account is strictly stripped of and denied "users" governance access'
  );

  // Log in as Dhruvesh: must ONLY see his own account and CANNOT switch to or modify other accounts
  omniStore.setAuthenticatedUser(authSuccess!);
  const visibleToDhruvesh = omniStore.getUsers();
  assert(
    visibleToDhruvesh.length === 1 &&
    visibleToDhruvesh[0].id === dhruveshAcct.id &&
    visibleToDhruvesh[0].passwordHash === undefined,
    'Non-Super Admin getUsers() returns ONLY their own account with passwordHash stripped',
    `Visible count: ${visibleToDhruvesh.length}`
  );

  let switchToAdminBlocked = false;
  try {
    omniStore.setCurrentUser(admin);
  } catch (err: any) {
    switchToAdminBlocked = err?.message?.includes('Unauthorized');
  }
  assert(switchToAdminBlocked, 'Regular user cannot switch into Super Admin or any other user account');

  let resetOtherPwdBlocked = false;
  try {
    await omniStore.setUserPassword(admin.id, 'HackedPass123!');
  } catch (err: any) {
    resetOtherPwdBlocked = err?.message?.includes('Unauthorized');
  }
  assert(resetOtherPwdBlocked, 'Regular user is blocked from resetting another user password');

  // Regular user CAN change ONLY their own password (requiring current password first)
  let wrongCurrentBlocked = false;
  try {
    await omniStore.changeOwnPassword('WrongOldPass!', 'NewDhruvesh#2027');
  } catch (err: any) {
    wrongCurrentBlocked = err?.message?.includes('Current password is incorrect');
  }
  assert(wrongCurrentBlocked, 'changeOwnPassword rejects incorrect current password');

  await omniStore.changeOwnPassword('Dhruvesh#2026', 'NewDhruvesh#2027');
  const oldStillWorks = await omniStore.authenticateWithPassword('dhruvesh.rajpurohit@company.com', 'Dhruvesh#2026');
  const newWorks = await omniStore.authenticateWithPassword('dhruvesh.rajpurohit@company.com', 'NewDhruvesh#2027');
  assert(
    oldStillWorks === null && newWorks !== null && newWorks.id === dhruveshAcct.id,
    'changeOwnPassword updates user password cleanly and invalidates previous password'
  );

  // Switch back to Super Admin: can view all accounts and suspend Dhruvesh (blocking password login)
  omniStore.setAuthenticatedUser(admin);
  const visibleToAdmin = omniStore.getUsers();
  assert(
    visibleToAdmin.length >= 2 && visibleToAdmin.every(u => u.passwordHash === undefined),
    'Super Admin can access all user accounts while passwordHash remains stripped'
  );

  omniStore.toggleUserStatus(dhruveshAcct.id);
  const suspendedAuth = await omniStore.authenticateWithPassword('dhruvesh.rajpurohit@company.com', 'NewDhruvesh#2027');
  assert(suspendedAuth === null, 'Suspended account is blocked from Email + Password login');

  // Clean up test user
  omniStore.deleteUser(dhruveshAcct.id);

  console.log('\n=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});

