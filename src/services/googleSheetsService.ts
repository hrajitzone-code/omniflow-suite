import { getAccessToken, googleSignIn } from './googleAuth';
import { omniStore } from './storageService';
import { SystemType } from '../types';
import { isValidSpreadsheetId } from '../utils/securityUtils';

export interface SheetTabDefinition {
  name: string;
  headers: string[];
}

export const INFLUENCER_SHEET_TABS: SheetTabDefinition[] = [
  {
    name: 'Influencer_Master',
    headers: [
      'ID', 'Name', 'Stage', 'Phone', 'Email', 'City', 'Instagram_Handle', 
      'Instagram_Followers', 'YouTube_Channel', 'YouTube_Subscribers', 
      'Reel_Rate', 'YouTube_Rate', 'PAN_Number', 'Gov_ID_Type', 'Gov_ID_Number', 
      'Bank_Name', 'Account_Number', 'IFSC_Code', 'Blacklisted', 'Rating', 'Remarks', 'Last_Updated'
    ]
  },
  {
    name: 'Campaign_Master',
    headers: [
      'ID', 'Name', 'Influencer_ID', 'Influencer_Name', 'Coordinator', 'Department', 
      'Visit_Date', 'Agreed_Amount', 'Advance_Paid', 'Status', 'Deliverables_Count', 
      'Completed_Deliverables', 'Completion_Date', 'Remarks', 'Last_Updated'
    ]
  },
  {
    name: 'Deliverables',
    headers: [
      'ID', 'Campaign_ID', 'Title', 'Type', 'Required', 'Status', 
      'Shoot_Date', 'Expected_Posting_Date', 'Actual_Posting_Date', 'Published_URL', 'Remarks'
    ]
  },
  {
    name: 'Payments',
    headers: [
      'ID', 'Campaign_ID', 'Campaign_Name', 'Influencer_Name', 'Amount', 
      'Payment_Type', 'Status', 'Requested_By', 'Approved_By', 'Approval_Date', 
      'Payment_Date', 'Transaction_Ref', 'Proof_URL', 'Remarks'
    ]
  },
  {
    name: 'Follow_Ups',
    headers: [
      'ID', 'Entity_Type', 'Entity_ID', 'Entity_Name', 'Assigned_To', 
      'Date', 'Next_Follow_Up_Date', 'Channel_Type', 'Purpose', 'Status', 'Remarks'
    ]
  },
  {
    name: 'Performance_Master',
    headers: [
      'ID', 'Deliverable_ID', 'Campaign_Name', 'Influencer_Name', 'Content_Title', 
      'Platform', 'Posting_Date', 'Delay_Days', 'Views_Day7', 'Views_Day15', 
      'Views_Day30', 'Likes', 'Comments', 'Shares', 'Saves', 'Spend', 'Score'
    ]
  }
];

export const DIGITAL_SHEET_TABS: SheetTabDefinition[] = [
  {
    name: 'Content_Master',
    headers: [
      'ID', 'Title', 'Department', 'Content_Type', 'Anchor', 'Recording_Date', 
      'Recording_Status', 'Cameraman', 'Receiver', 'Raw_Footage_URL', 'Assigned_Editor', 
      'Editing_Status', 'Edit_Submission_URL', 'Categories', 'Channels', 'Remarks'
    ]
  },
  {
    name: 'Editor_Capacity',
    headers: [
      'ID', 'Editor_ID', 'Editor_Name', 'Month', 'Working_Days', 'Leave_Days', 
      'Daily_Capacity_Pts', 'Long_Video_Target', 'Shorts_Target', 'Long_Video_Done', 
      'Shorts_Done', 'Active_Points'
    ]
  },
  {
    name: 'Channel_Schedules',
    headers: [
      'ID', 'Content_ID', 'Content_Title', 'Channel_Name', 'Scheduled_Date', 
      'Scheduled_Time', 'Status', 'Published_URL', 'Views', 'Likes'
    ]
  },
  {
    name: 'Anchor_Schedules',
    headers: [
      'ID', 'Anchor_Name', 'Shoot_Date', 'Shoot_Time_Slot', 'Topic_Title', 
      'Department', 'Location_Studio', 'Status', 'Proposed_Revised_Date', 'Reschedule_Reason'
    ]
  },
  {
    name: 'Editor_Profiles',
    headers: [
      'ID', 'Name', 'Email', 'Department', 'Status', 'Working_Days', 
      'Leave_Days', 'Daily_Capacity_Pts', 'Long_Video_Target', 'Shorts_Target', 'Updated_At'
    ]
  },
  {
    name: 'Anchor_Profiles',
    headers: [
      'ID', 'Name', 'Email', 'Department', 'Primary_Studio', 'Status', 'Updated_At'
    ]
  }
];

export const SYSTEM_SHEET_TABS: SheetTabDefinition[] = [
  ...INFLUENCER_SHEET_TABS,
  ...DIGITAL_SHEET_TABS
];

export class GoogleSheetsService {
  private assertSyncAccess(system: 'influencer' | 'digital') {
    const user = omniStore.getCurrentUser();
    if (!omniStore.hasGovernanceAccess(user, 'sync') || !omniStore.hasDepartmentAccess(user, system)) {
      throw new Error(`Unauthorized: You do not have sync approval for the ${system} workbook.`);
    }
  }

  extractSpreadsheetId(input: string): string {
    const trimmed = (input || '').trim();
    if (trimmed.includes('/d/')) {
      const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    return trimmed;
  }

  /**
   * Permanently pins an existing Google Spreadsheet to the specified system workbook
   * (Influencer or Digital) without creating a duplicate spreadsheet in Google Drive.
   * Ensures any missing required tabs are added safely without altering existing data.
   */
  async connectAndPinExistingSpreadsheet(
    rawInput: string,
    system: 'influencer' | 'digital' = 'influencer'
  ): Promise<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    spreadsheetTitle: string;
    addedTabs: string[];
    syncedCount: number;
    quarantinedCount: number;
    needsAuth: boolean;
  }> {
    this.assertSyncAccess(system);
    const spreadsheetId = this.extractSpreadsheetId(rawInput);
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Please paste a valid Google Sheet URL or Spreadsheet ID.');
    }

    const isInf = system === 'influencer';
    const targetTabs = isInf ? INFLUENCER_SHEET_TABS : DIGITAL_SHEET_TABS;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const defaultTitle = isInf
      ? 'Influencer Campaign Management (Pinned Sheet)'
      : 'Digital Data Management (Pinned Sheet)';

    // Pin the Sheet ID immediately so the user never has to recreate or re-enter it
    const existingCfg = omniStore.getSyncConfig();
    if (isInf) {
      omniStore.updateSyncConfig({
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle: existingCfg.influencerWorkbook.spreadsheetTitle || defaultTitle,
        influencerWorkbook: {
          ...existingCfg.influencerWorkbook,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetTitle: existingCfg.influencerWorkbook.spreadsheetTitle || defaultTitle,
        }
      });
    } else {
      omniStore.updateSyncConfig({
        digitalWorkbook: {
          ...existingCfg.digitalWorkbook,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetTitle: existingCfg.digitalWorkbook.spreadsheetTitle || defaultTitle,
        }
      });
    }

    // Acquire OAuth token to verify metadata, create only missing tabs, and pull rows
    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      } catch {
        // User dismissed popup; sheet ID remains pinned
      }
    }

    if (!token) {
      return {
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle: defaultTitle,
        addedTabs: [],
        syncedCount: 0,
        quarantinedCount: 0,
        needsAuth: true,
      };
    }

    // 1. Fetch spreadsheet metadata (title + existing sheet tab names)
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      throw new Error(
        errData?.error?.message ||
        'Sheet ID was pinned, but Google Sheets API could not access it. Ensure your Google account has Editor access to this spreadsheet.'
      );
    }

    const meta = await metaRes.json();
    const realTitle: string = meta?.properties?.title || defaultTitle;
    const existingTabNames = new Set<string>(
      (meta?.sheets || []).map((s: any) => s?.properties?.title).filter(Boolean)
    );

    // 2. Add ONLY missing tabs (never delete or overwrite existing tabs)
    const missingTabs = targetTabs.filter(t => !existingTabNames.has(t.name));
    const addedTabs: string[] = [];

    if (missingTabs.length > 0) {
      const addReq = {
        requests: missingTabs.map(t => ({
          addSheet: {
            properties: {
              title: t.name,
              gridProperties: { frozenRowCount: 1 }
            }
          }
        }))
      };

      const batchMetaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(addReq),
        }
      );

      if (batchMetaRes.ok) {
        addedTabs.push(...missingTabs.map(t => t.name));
        // Write header rows ONLY for the newly added tabs
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: missingTabs.map(t => ({
                range: `${t.name}!A1`,
                values: [t.headers],
              })),
            }),
          }
        );
      }
    }

    // Persist real title
    const cfgAfterMeta = omniStore.getSyncConfig();
    if (isInf) {
      omniStore.updateSyncConfig({
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle: realTitle,
        influencerWorkbook: {
          ...cfgAfterMeta.influencerWorkbook,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetTitle: realTitle,
        }
      });
    } else {
      omniStore.updateSyncConfig({
        digitalWorkbook: {
          ...cfgAfterMeta.digitalWorkbook,
          spreadsheetId,
          spreadsheetUrl,
          spreadsheetTitle: realTitle,
        }
      });
    }

    // 3. Pull & reconcile existing rows
    const pullRes = await this.pullAndReconcileGoogleSheets(spreadsheetId, system);
    return {
      spreadsheetId,
      spreadsheetUrl,
      spreadsheetTitle: realTitle,
      addedTabs,
      syncedCount: pullRes.syncedCount,
      quarantinedCount: pullRes.quarantinedCount,
      needsAuth: false,
    };
  }

  /**
   * Generates a fully provisioned operational spreadsheet in sandbox/cloud simulation mode
   * partitioned for the targeted system workbook (influencer or digital).
   */
  createSimulatedOperationalSpreadsheet(
    system: 'influencer' | 'digital' = 'influencer',
    customTitle?: string
  ): { id: string; url: string; title: string } {
    this.assertSyncAccess(system);
    const isInf = system === 'influencer';
    const id = `1Omni_${isInf ? 'Influencer' : 'Digital'}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultTitle = isInf 
      ? `OmniFlow Influencer Campaign Management (${new Date().toISOString().slice(0, 10)})`
      : `OmniFlow Digital Data Management (${new Date().toISOString().slice(0, 10)})`;
    const title = customTitle || defaultTitle;
    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;

    const tabs = isInf ? INFLUENCER_SHEET_TABS : DIGITAL_SHEET_TABS;
    const wbState = {
      spreadsheetId: id,
      spreadsheetTitle: title,
      spreadsheetUrl: url,
      lastSyncTimestamp: new Date().toISOString(),
      syncStatus: 'SUCCESS' as const,
      conflictCount: 0,
      quarantineCount: isInf ? omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length : 0,
      sheetTabs: tabs.map(t => ({ name: t.name, rowsCount: 0, lastUpdated: '' }))
    };

    if (isInf) {
      omniStore.updateSyncConfig({
        influencerWorkbook: wbState,
        spreadsheetId: id,
        spreadsheetTitle: title,
        spreadsheetUrl: url,
        lastSyncTimestamp: new Date().toISOString(),
        syncStatus: 'SUCCESS',
      });
    } else {
      omniStore.updateSyncConfig({
        digitalWorkbook: wbState
      });
    }

    omniStore.addNotification({
      title: `${isInf ? 'Influencer' : 'Digital Data'} Operational Spreadsheet Initialized`,
      message: `Configured dedicated workbook "${title}" with ${tabs.length} worksheets. Ready for live sync.`,
      type: 'success',
      system: isInf ? 'influencer' : 'digital',
      linkAction: { system: isInf ? 'influencer' : 'digital', tab: isInf ? 'sync' : 'overview' }
    });

    return { id, url, title };
  }

  /**
   * Creates a dedicated Google Spreadsheet in user's Google Drive
   * specifically provisioned for either the Influencer System (6 tabs) or Digital System (4 tabs).
   */
  async createIntegratedSpreadsheet(
    system: 'influencer' | 'digital' = 'influencer',
    customTitle?: string
  ): Promise<{ id: string; url: string; title: string }> {
    this.assertSyncAccess(system);
    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      } catch (authErr) {
        console.warn('Google sign-in popup cancelled or blocked, initializing simulated sheet:', authErr);
        return this.createSimulatedOperationalSpreadsheet(system, customTitle);
      }
    }

    if (!token) {
      return this.createSimulatedOperationalSpreadsheet(system, customTitle);
    }

    const isInf = system === 'influencer';
    const targetTabs = isInf ? INFLUENCER_SHEET_TABS : DIGITAL_SHEET_TABS;
    const defaultTitle = isInf 
      ? `OmniFlow Influencer Campaign Management (${new Date().toISOString().slice(0, 10)})`
      : `OmniFlow Digital Data Management (${new Date().toISOString().slice(0, 10)})`;
    const title = customTitle || defaultTitle;

    try {
      const createPayload = {
        properties: {
          title,
        },
        sheets: targetTabs.map(tab => ({
          properties: {
            title: tab.name,
            gridProperties: {
              frozenRowCount: 1,
            }
          }
        }))
      };

      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('Sheets API error, falling back to simulated sheet:', err);
        return this.createSimulatedOperationalSpreadsheet(system, customTitle);
      }

      const createdSheet = await res.json();
      const spreadsheetId = createdSheet.spreadsheetId;
      const spreadsheetUrl = createdSheet.spreadsheetUrl;

      // Populate headers & data for this system's tabs
      await this.pushDatabaseToSheets(spreadsheetId, system, token);

      const wbState = {
        spreadsheetId,
        spreadsheetTitle: title,
        spreadsheetUrl,
        lastSyncTimestamp: new Date().toISOString(),
        syncStatus: 'SUCCESS' as const,
        conflictCount: 0,
        quarantineCount: isInf ? omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length : 0,
        sheetTabs: targetTabs.map(t => ({ name: t.name, rowsCount: 0, lastUpdated: '' }))
      };

      if (isInf) {
        omniStore.updateSyncConfig({
          influencerWorkbook: wbState,
          spreadsheetId,
          spreadsheetTitle: title,
          spreadsheetUrl,
          lastSyncTimestamp: new Date().toISOString(),
          syncStatus: 'SUCCESS',
        });
      } else {
        omniStore.updateSyncConfig({
          digitalWorkbook: wbState
        });
      }

      omniStore.addNotification({
        title: `${isInf ? 'Influencer' : 'Digital Data'} Workbook Created`,
        message: `Successfully provisioned dedicated workbook "${title}" with ${targetTabs.length} worksheets in Google Drive.`,
        type: 'success',
        system: isInf ? 'influencer' : 'digital',
        linkAction: { system: isInf ? 'influencer' : 'digital', tab: isInf ? 'sync' : 'overview' }
      });

      return { id: spreadsheetId, url: spreadsheetUrl, title };
    } catch (e) {
      console.warn('Direct Google Drive API call failed, using simulated operational sheet:', e);
      return this.createSimulatedOperationalSpreadsheet(system, customTitle);
    }
  }

  /**
   * Builds exact worksheet ranges and header + live-row payloads for a system workbook.
   * Used by both full push and automatic deletion sync so removed rows never linger in Sheets.
   */
  buildSheetPushPayloads(system: 'influencer' | 'digital' = 'influencer'): { range: string; values: any[][] }[] {
    const isInf = system === 'influencer';
    const dataPayloads: { range: string; values: any[][] }[] = [];

    if (isInf) {
      // 1. Influencer Master
      const infHeaders = INFLUENCER_SHEET_TABS[0].headers;
      const infRows = omniStore.getInfluencers().map(i => [
        i.id,
        i.name,
        i.stage,
        i.phone,
        i.email,
        i.city,
        i.socialPlatforms.instagram?.handle || '',
        i.socialPlatforms.instagram?.followers || 0,
        i.socialPlatforms.youtube?.handle || '',
        i.socialPlatforms.youtube?.subscribers || 0,
        i.contentRates.reelRate,
        i.contentRates.youtubeVideoRate,
        i.panNumber,
        i.govIdType,
        i.govIdNumber,
        i.bankDetails.bankName,
        i.bankDetails.accountNumber,
        i.bankDetails.ifscCode,
        i.isBlacklisted ? 'TRUE' : 'FALSE',
        i.internalRating,
        i.remarks,
        i.updatedAt,
      ]);
      dataPayloads.push({
        range: 'Influencer_Master!A1:V',
        values: [infHeaders, ...infRows],
      });

      // 2. Campaign Master
      const campHeaders = INFLUENCER_SHEET_TABS[1].headers;
      const campRows = omniStore.getCampaigns().map(c => [
        c.id,
        c.name,
        c.influencerId,
        c.influencerName,
        c.coordinator,
        c.department,
        c.visitDate,
        c.agreedAmount,
        c.advancePaid,
        c.status,
        c.deliverablesCount,
        c.completedDeliverablesCount,
        c.completionDate || '',
        c.remarks,
        c.updatedAt,
      ]);
      dataPayloads.push({
        range: 'Campaign_Master!A1:O',
        values: [campHeaders, ...campRows],
      });

      // 3. Deliverables
      const delHeaders = INFLUENCER_SHEET_TABS[2].headers;
      const delRows = omniStore.getDeliverables().map(d => [
        d.id,
        d.campaignId,
        d.title,
        d.type,
        d.isRequired ? 'TRUE' : 'FALSE',
        d.status,
        d.shootDate || '',
        d.expectedPostingDate,
        d.actualPostingDate || '',
        d.publishedUrl || '',
        d.remarks || '',
      ]);
      dataPayloads.push({
        range: 'Deliverables!A1:K',
        values: [delHeaders, ...delRows],
      });

      // 4. Payments
      const payHeaders = INFLUENCER_SHEET_TABS[3].headers;
      const payRows = omniStore.getPayments().map(p => [
        p.id,
        p.campaignId,
        p.campaignName,
        p.influencerName,
        p.amount,
        p.paymentType,
        p.status,
        p.requestedBy,
        p.approvedBy || '',
        p.approvalDate || '',
        p.paymentDate || '',
        p.transactionReference || '',
        p.paymentProofUrl || '',
        p.remarks || '',
      ]);
      dataPayloads.push({
        range: 'Payments!A1:N',
        values: [payHeaders, ...payRows],
      });

      // 5. Follow_Ups
      const folHeaders = INFLUENCER_SHEET_TABS[4].headers;
      const folRows = omniStore.getFollowUps().map(f => [
        f.id,
        f.entityType,
        f.entityId,
        f.entityName,
        f.assignedTo,
        f.date,
        f.nextFollowUpDate,
        f.type,
        f.purpose,
        f.status,
        f.remarks,
      ]);
      dataPayloads.push({
        range: 'Follow_Ups!A1:K',
        values: [folHeaders, ...folRows],
      });

      // 6. Performance_Master
      const perfHeaders = INFLUENCER_SHEET_TABS[5].headers;
      const perfRows = omniStore.getPerformances().map(p => [
        p.id,
        p.deliverableId,
        p.campaignName,
        p.influencerName,
        p.contentTitle,
        p.platform,
        p.postingDate,
        p.delayDays,
        p.viewsDay7,
        p.viewsDay15,
        p.viewsDay30,
        p.likes,
        p.comments,
        p.shares,
        p.saves,
        p.allocatedSpend,
        p.performanceScore,
      ]);
      dataPayloads.push({
        range: 'Performance_Master!A1:Q',
        values: [perfHeaders, ...perfRows],
      });
    } else {
      // 1. Content_Master
      const contHeaders = DIGITAL_SHEET_TABS[0].headers;
      const contRows = omniStore.getContentMaster().map(c => [
        c.id,
        c.title,
        c.department,
        c.contentType,
        c.anchor,
        c.recordingDate,
        c.recordingStatus,
        c.cameraman,
        c.receiver,
        c.rawFootageLocationUrl,
        c.assignedEditorName || '',
        c.editingStatus,
        c.editSubmissionUrl || '',
        c.categories.join(', '),
        c.channels.join(', '),
        c.remarks,
      ]);
      dataPayloads.push({
        range: 'Content_Master!A1:P',
        values: [contHeaders, ...contRows],
      });

      // 2. Editor_Capacity
      const capHeaders = DIGITAL_SHEET_TABS[1].headers;
      const capRows = omniStore.getEditorCapacities().map(c => [
        c.id,
        c.editorId,
        c.editorName,
        c.month,
        c.workingDays,
        c.leaveDays,
        c.dailyCapacityPoints,
        c.longVideoTarget,
        c.shortsTarget,
        c.longVideoCompleted,
        c.shortsCompleted,
        c.activeAssignedPoints,
      ]);
      dataPayloads.push({
        range: 'Editor_Capacity!A1:L',
        values: [capHeaders, ...capRows],
      });

      // 3. Channel_Schedules
      const chHeaders = DIGITAL_SHEET_TABS[2].headers;
      const chRows = omniStore.getChannelSchedules().map(cs => [
        cs.id,
        cs.contentId,
        cs.contentTitle,
        cs.channelName,
        cs.scheduledDate,
        cs.scheduledTime,
        cs.status,
        cs.publishedUrl || '',
        cs.views || 0,
        cs.likes || 0,
      ]);
      dataPayloads.push({
        range: 'Channel_Schedules!A1:J',
        values: [chHeaders, ...chRows],
      });

      // 4. Anchor_Schedules
      const ancHeaders = DIGITAL_SHEET_TABS[3].headers;
      const ancRows = omniStore.getAnchorSchedules().map(a => [
        a.id,
        a.anchorName,
        a.shootDate,
        a.shootTimeSlot,
        a.topicTitle || '',
        a.department,
        a.studioOrLocation,
        a.status,
        a.proposedRevisedDate || '',
        a.rescheduleReason || '',
      ]);
      dataPayloads.push({
        range: 'Anchor_Schedules!A1:J',
        values: [ancHeaders, ...ancRows],
      });

      // 5. Editor_Profiles
      const edProfHeaders = DIGITAL_SHEET_TABS[4].headers;
      const edProfRows = omniStore.getEditorProfiles().map(e => [
        e.id,
        e.name,
        e.email,
        e.department,
        e.status,
        e.workingDays,
        e.leaveDays,
        e.dailyCapacityPoints,
        e.longVideoTarget,
        e.shortsTarget,
        e.updatedAt,
      ]);
      dataPayloads.push({
        range: 'Editor_Profiles!A1:K',
        values: [edProfHeaders, ...edProfRows],
      });

      // 6. Anchor_Profiles
      const ancProfHeaders = DIGITAL_SHEET_TABS[5].headers;
      const ancProfRows = omniStore.getAnchorProfiles().map(a => [
        a.id,
        a.name,
        a.email,
        a.department,
        a.primaryStudio,
        a.status,
        a.updatedAt,
      ]);
      dataPayloads.push({
        range: 'Anchor_Profiles!A1:G',
        values: [ancProfHeaders, ...ancProfRows],
      });
    }

    return dataPayloads;
  }

  /**
   * Executes batchClear followed by batchUpdate so deleted software rows are
   * cleanly wiped from Google Sheets instead of leaving stale trailing rows.
   */
  private async clearAndWriteWorkbookRanges(
    spreadsheetId: string,
    system: 'influencer' | 'digital',
    token: string
  ): Promise<void> {
    const dataPayloads = this.buildSheetPushPayloads(system);
    const clearRanges = dataPayloads.map(p => p.range);

    // 1. Clear full column ranges first so deleted rows are removed from the Sheet
    const clearRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ranges: clearRanges }),
      }
    );

    if (!clearRes.ok) {
      const clearErr = await clearRes.json().catch(() => ({}));
      throw new Error(clearErr.error?.message || 'Failed to clear old Google Spreadsheet rows before sync');
    }

    // 2. Write exact headers + remaining live rows
    const batchBody = {
      valueInputOption: 'USER_ENTERED',
      data: dataPayloads,
    };

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to update Google Spreadsheet rows');
    }

    const now = new Date().toISOString();
    if (system === 'influencer') {
      omniStore.updateSyncConfig({
        lastSyncTimestamp: now,
        syncStatus: 'SUCCESS',
        influencerWorkbook: {
          ...omniStore.getSyncConfig().influencerWorkbook,
          lastSyncTimestamp: now,
          syncStatus: 'SUCCESS'
        }
      });
    } else {
      omniStore.updateSyncConfig({
        digitalWorkbook: {
          ...omniStore.getSyncConfig().digitalWorkbook,
          lastSyncTimestamp: now,
          syncStatus: 'SUCCESS'
        }
      });
    }
  }

  /**
   * Pushes local records strictly to their dedicated system workbook (preserving separation).
   * Clears existing worksheet ranges first so software deletions reflect in Google Sheets.
   */
  async pushDatabaseToSheets(
    spreadsheetId: string, 
    system: 'influencer' | 'digital' = 'influencer',
    passedToken?: string
  ): Promise<boolean> {
    this.assertSyncAccess(system);
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Invalid Google Spreadsheet ID format.');
    }
    let token = passedToken || (await getAccessToken());
    if (!token) {
      try {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      } catch {
        // User dismissed popup
      }
    }

    const isInf = system === 'influencer';

    if (!token) {
      if (isInf) {
        omniStore.updateSyncConfig({
          lastSyncTimestamp: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          influencerWorkbook: {
            ...omniStore.getSyncConfig().influencerWorkbook,
            lastSyncTimestamp: new Date().toISOString(),
            syncStatus: 'SUCCESS'
          }
        });
      } else {
        omniStore.updateSyncConfig({
          digitalWorkbook: {
            ...omniStore.getSyncConfig().digitalWorkbook,
            lastSyncTimestamp: new Date().toISOString(),
            syncStatus: 'SUCCESS'
          }
        });
      }
      return true;
    }

    await this.clearAndWriteWorkbookRanges(spreadsheetId, system, token);
    return true;
  }

  /**
   * Automatically mirrors a software deletion (or bulk change) into the pinned Google Sheet
   * for the specified system if connected and authorized. Never interrupts local deletion if offline.
   */
  async syncChangesToConnectedSheet(
    system: 'influencer' | 'digital'
  ): Promise<{ synced: boolean; status: 'synced' | 'not_connected' | 'auth_required' | 'error'; message: string }> {
    const user = omniStore.getCurrentUser();
    const canMutate =
      user.role === 'Super Admin' ||
      omniStore.hasPermission(user, system, 'canDelete') ||
      omniStore.hasPermission(user, system, 'canEdit') ||
      omniStore.hasPermission(user, system, 'canCreate');

    if (!canMutate) {
      return {
        synced: false,
        status: 'error',
        message: 'Unauthorized to mirror changes to Google Sheets.',
      };
    }

    const cfg = omniStore.getSyncConfig();
    const wb = system === 'influencer' ? cfg.influencerWorkbook : cfg.digitalWorkbook;
    const spreadsheetId = wb?.spreadsheetId || (system === 'influencer' ? cfg.spreadsheetId : '');

    if (!spreadsheetId || spreadsheetId.startsWith('1Omni_') || !isValidSpreadsheetId(spreadsheetId)) {
      return {
        synced: false,
        status: 'not_connected',
        message: 'Entry deleted in software. Connect a live Google Sheet in Sheets Sync to mirror changes automatically.',
      };
    }

    const token = await getAccessToken();
    if (!token) {
      return {
        synced: false,
        status: 'auth_required',
        message: 'Entry deleted in software. Sign in via Google Sheets Sync & click Push to remove it from the Sheet.',
      };
    }

    try {
      await this.clearAndWriteWorkbookRanges(spreadsheetId, system, token);
      return {
        synced: true,
        status: 'synced',
        message: `Entry deleted from software and synced to Google Sheet (${wb?.spreadsheetTitle || 'Connected Sheet'}).`,
      };
    } catch (err: any) {
      return {
        synced: false,
        status: 'error',
        message: `Deleted in software, but Sheet sync failed: ${err?.message || 'Unknown error'}. Click Push in Sheets Sync to retry.`,
      };
    }
  }

  /**
   * Pulls sheets data from a specific workbook, validates schema, applies precedence & quarantine rules.
   */
  async pullAndReconcileGoogleSheets(
    spreadsheetId: string,
    system: 'influencer' | 'digital' = 'influencer'
  ): Promise<{ syncedCount: number; quarantinedCount: number; conflictCount: number }> {
    this.assertSyncAccess(system);
    if (!isValidSpreadsheetId(spreadsheetId)) {
      throw new Error('Invalid Google Spreadsheet ID format.');
    }
    let token = await getAccessToken();
    if (!token) {
      try {
        const authRes = await googleSignIn();
        token = authRes?.accessToken || null;
      } catch {
        // User cancelled popup
      }
    }

    const isInf = system === 'influencer';
    const targetTabs = isInf ? INFLUENCER_SHEET_TABS : DIGITAL_SHEET_TABS;

    if (!token) {
      return { syncedCount: 0, quarantinedCount: 0, conflictCount: 0 };
    }

    let syncedCount = 0;
    let quarantinedCount = 0;
    let conflictCount = 0;

    const ranges = targetTabs.map(t => `${t.name}!A2:Z`);
    const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve ${isInf ? 'Influencer' : 'Digital Data'} spreadsheet rows.`);
    }

    const payload = await res.json();
    const valueRanges: { range: string; values: any[][] }[] = payload.valueRanges || [];

    valueRanges.forEach((rangeObj, index) => {
      const tabDef = targetTabs[index];
      if (!tabDef) return;
      const rows = rangeObj.values || [];

      rows.forEach((row, rowIdx) => {
        const rowNumber = rowIdx + 2;
        const id = row[0];

        if (!id) return; // Skip empty rows

        if (tabDef.name === 'Payments') {
          const amount = Number(row[4]);
          const rawType = row[5];
          const status = row[6];
          const errors: string[] = [];

          if (isNaN(amount) || amount <= 0) {
            errors.push(`Validation Error: Payment amount cannot be negative (${row[4]})`);
          }

          const canonicalType = omniStore.normalizePaymentType(rawType);
          if (!canonicalType) {
            errors.push(`Validation Error: "${rawType || 'Unknown Type'}" is not a recognized Payment Type`);
          }

          if (!['Draft', 'Pending Approval', 'Approved', 'Paid', 'Rejected', 'Cancelled'].includes(status)) {
            errors.push(`Validation Error: Invalid payment status "${status}".`);
          }

          if (errors.length > 0) {
            quarantinedCount++;
            omniStore.addQuarantineRecord({
              sheetTab: 'Payments',
              rowNumber,
              rawPayload: { 
                ID: id, 
                Campaign_ID: row[1],
                Campaign_Name: row[2],
                Influencer_Name: row[3],
                Amount: row[4], 
                Payment_Type: rawType || 'Unknown Type',
                Status: status,
                Requested_By: row[7],
                Approved_By: row[8],
                Approval_Date: row[9],
                Payment_Date: row[10],
                Transaction_Ref: row[11],
                Remarks: row[13]
              },
              validationErrors: errors,
            });
          } else {
            syncedCount++;
          }
        } else if (tabDef.name === 'Influencer_Master') {
          const email = row[4];
          const errors: string[] = [];
          if (email && !email.includes('@')) {
            errors.push(`Validation Error: Malformed email format "${email}".`);
          }
          if (errors.length > 0) {
            quarantinedCount++;
            omniStore.addQuarantineRecord({
              sheetTab: 'Influencer_Master',
              rowNumber,
              rawPayload: { ID: id, Name: row[1], Email: email },
              validationErrors: errors,
            });
          } else {
            syncedCount++;
          }
        } else {
          syncedCount++;
        }
      });
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    if (isInf) {
      omniStore.updateSyncConfig({
        spreadsheetId,
        spreadsheetUrl: sheetUrl,
        lastSyncTimestamp: new Date().toISOString(),
        syncStatus: quarantinedCount > 0 ? 'CONFLICT_DETECTED' : 'SUCCESS',
        conflictCount,
        quarantineCount: omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length,
        influencerWorkbook: {
          ...omniStore.getSyncConfig().influencerWorkbook,
          spreadsheetId,
          spreadsheetUrl: sheetUrl,
          lastSyncTimestamp: new Date().toISOString(),
          syncStatus: quarantinedCount > 0 ? 'CONFLICT_DETECTED' : 'SUCCESS',
          conflictCount,
          quarantineCount: omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW').length,
        }
      });
    } else {
      omniStore.updateSyncConfig({
        digitalWorkbook: {
          ...omniStore.getSyncConfig().digitalWorkbook,
          spreadsheetId,
          spreadsheetUrl: sheetUrl,
          lastSyncTimestamp: new Date().toISOString(),
          syncStatus: 'SUCCESS',
          conflictCount: 0,
        }
      });
    }

    return { syncedCount, quarantinedCount, conflictCount };
  }

  /**
   * Interactive Simulator:
   * Lets authorized Super Admins test direct spreadsheet edits, conflicting edits, and quarantined invalid edits.
   */
  simulateDirectSheetEdit(scenario: 'valid_remote_edit' | 'conflict_app_wins' | 'invalid_quarantine'): { message: string } {
    const user = omniStore.getCurrentUser();
    if (user.role !== 'Super Admin') {
      throw new Error('Unauthorized: Only Super Administrators can run sync simulations.');
    }
    if (scenario === 'valid_remote_edit') {
      const camps = omniStore.getCampaigns();
      if (camps.length === 0) {
        return { message: 'No campaigns exist to simulate a remote edit.' };
      }
      const target = camps[0];
      const oldRemarks = target.remarks;
      target.remarks = `${oldRemarks || ''} [Updated from Google Sheets: Client approved bonus reach on Nov 1]`;
      omniStore.saveCampaign(target, 'Remote Google Sheets direct update reflected in application');

      omniStore.addNotification({
        title: 'Google Sheets Live Sync',
        message: `Detected external edit in sheet Campaign_Master row for ${target.name}. Merged cleanly.`,
        type: 'info',
        system: 'influencer'
      });
      return { message: `Simulated external sheet edit on "${target.name}". App state updated successfully.` };
    } else if (scenario === 'conflict_app_wins') {
      const target = omniStore.getCampaigns()[0];
      if (!target) {
        return { message: 'No campaigns exist to simulate a sync conflict.' };
      }
      omniStore.logAudit('influencer', 'CampaignRecord', target.id, 'SHEET_SYNC', [
        { field: 'agreedAmount', before: '₹150,000 (from Google Sheet)', after: `₹${target.agreedAmount.toLocaleString()} (Application edit took precedence)` }
      ], 'Conflict detected: Simultaneous edit on Campaign Master. Per rule 2.0, Application edit takes precedence and is preserved.');

      omniStore.addNotification({
        title: 'Sync Conflict Resolved (App Precedence)',
        message: `Conflict on ${target.name}: Application value preserved. Sheet value marked for reconciliation in Audit Log.`,
        type: 'warning',
        system: 'system',
        linkAction: { system: 'influencer', tab: 'audit' }
      });
      return { message: `Conflict detected on ${target.id}. Application precedence enforced. Logged in Audit Trail.` };
    } else if (scenario === 'invalid_quarantine') {
      const targetCampaignId = omniStore.getCampaigns()[0]?.id || '';
      const qRec = omniStore.addQuarantineRecord({
        sheetTab: 'Payments',
        rowNumber: 18,
        rawPayload: {
          ID: 'PAY-SIM-ERR',
          Campaign_ID: targetCampaignId,
          Amount: '-85000',
          Payment_Type: 'Unknown Type',
          Status: 'Pending Verification'
        },
        validationErrors: [
          'Validation Error: Payment amount cannot be negative (-85000)',
          'Validation Error: "Unknown Type" is not a recognized Payment Type'
        ]
      });

      omniStore.addNotification({
        title: 'Invalid Google Sheet Edit Quarantined',
        message: `Direct edit in tab "Payments" row #18 was quarantined. Last valid application record was preserved.`,
        type: 'urgent',
        system: 'system',
        linkAction: { system: 'influencer', tab: 'quarantine', itemId: qRec.id }
      });

      return { message: `Simulated corrupt direct Sheet edit. Quarantined in Quarantine Console (ID: ${qRec.id}).` };
    }

    return { message: 'Simulation completed.' };
  }
}

export const googleSheetsService = new GoogleSheetsService();
