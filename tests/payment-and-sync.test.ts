/**
 * Automated Verification Suite:
 * 1. Two-Workbook Architecture Partitioning
 * 2. Payment Magnitude & Negative Number Validation
 * 3. Canonical Payment Type Normalization & Legacy Preservation
 * 4. Refund / Reversal Accounting & Outstanding Balance Consistency
 * 5. Overpayment Safeguards & Authorized Exception Overrides
 * 6. Quarantine Isolation & Authorized Reconciliation Workflow
 */

// Simple mock for localStorage in Node CLI environment
const storage: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storage[key] || null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

import { omniStore } from '../src/services/storageService';
import { 
  INFLUENCER_SHEET_TABS, 
  DIGITAL_SHEET_TABS,
  googleSheetsService 
} from '../src/services/googleSheetsService';
import { CANONICAL_PAYMENT_TYPES } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PAYMENT VALIDATION & DUAL-WORKBOOK TEST SUITE');
  console.log('======================================================\n');

  // Reset store to pristine state
  omniStore.resetAllToFactoryDemo();

  // -------------------------------------------------------------------------
  // TEST SUITE 1: Dual-Workbook Architecture Separation
  // -------------------------------------------------------------------------
  console.log('--- Suite 1: Two-Workbook Partitioning ---');
  
  assert(
    INFLUENCER_SHEET_TABS.length === 6,
    'Influencer Workbook contains exactly 6 operational worksheets',
    `Found ${INFLUENCER_SHEET_TABS.length}`
  );

  const infTabNames = INFLUENCER_SHEET_TABS.map(t => t.name);
  assert(
    infTabNames.includes('Influencer_Master') &&
    infTabNames.includes('Campaign_Master') &&
    infTabNames.includes('Deliverables') &&
    infTabNames.includes('Payments') &&
    infTabNames.includes('Follow_Ups') &&
    infTabNames.includes('Performance_Master'),
    'Influencer Workbook contains all 6 required operational tabs'
  );

  assert(
    DIGITAL_SHEET_TABS.length === 6,
    'Digital Data Workbook contains exactly 6 operational worksheets',
    `Found ${DIGITAL_SHEET_TABS.length}`
  );

  const digTabNames = DIGITAL_SHEET_TABS.map(t => t.name);
  assert(
    digTabNames.includes('Content_Master') &&
    digTabNames.includes('Editor_Capacity') &&
    digTabNames.includes('Channel_Schedules') &&
    digTabNames.includes('Anchor_Schedules') &&
    digTabNames.includes('Editor_Profiles') &&
    digTabNames.includes('Anchor_Profiles'),
    'Digital Data Workbook contains all 6 required operational tabs'
  );

  // Cross-system partition check: No overlap between Influencer and Digital tabs
  const overlap = infTabNames.filter(t => digTabNames.includes(t));
  assert(
    overlap.length === 0,
    'Strict separation preserved: Zero tab overlap between Influencer and Digital workbooks'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 2: Negative Payment Amount & Magnitude Validation
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 2: Payment Magnitude & Negative Amount Validation ---');

  const targetCampaign = omniStore.saveCampaign({
    name: 'Verification Fixture Campaign',
    agreedAmount: 220000,
    status: 'Active'
  });

  // Attempt to save negative payment amount (-85000)
  const negativeResult = omniStore.savePayment({
    campaignId: targetCampaign.id,
    amount: -85000,
    paymentType: 'Advance',
  });

  assert(
    negativeResult.error !== undefined && negativeResult.error.includes('cannot be negative (-85000)'),
    'Negative amount (-85000) is strictly rejected with explicit validation error',
    negativeResult.error
  );

  // Attempt to save zero amount
  const zeroResult = omniStore.savePayment({
    campaignId: targetCampaign.id,
    amount: 0,
    paymentType: 'Advance',
  });

  assert(
    zeroResult.error !== undefined,
    'Zero amount is strictly rejected with validation error',
    zeroResult.error
  );

  // Attempt to save valid positive magnitude amount
  const validResult = omniStore.savePayment({
    campaignId: targetCampaign.id,
    amount: 25000,
    paymentType: 'Milestone 2',
    status: 'Approved'
  });

  assert(
    validResult.error === undefined && validResult.payment.amount === 25000,
    'Valid positive payment amount (25,000) is accepted successfully'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 3: Canonical Payment Types & Normalization
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 3: Canonical Payment Types & Normalization ---');

  assert(
    CANONICAL_PAYMENT_TYPES.includes('Advance') &&
    CANONICAL_PAYMENT_TYPES.includes('Milestone 1') &&
    CANONICAL_PAYMENT_TYPES.includes('Milestone 2') &&
    CANONICAL_PAYMENT_TYPES.includes('Final Settlement') &&
    CANONICAL_PAYMENT_TYPES.includes('Reimbursement') &&
    CANONICAL_PAYMENT_TYPES.includes('Refund / Reversal') &&
    CANONICAL_PAYMENT_TYPES.includes('Correction'),
    'Canonical payment types list includes all supported lifecycle transaction types'
  );

  // Attempt to submit an unrecognized payment type for a new payment
  const unknownTypeResult = omniStore.savePayment({
    campaignId: targetCampaign.id,
    amount: 10000,
    paymentType: 'Unknown Type' as any
  });

  assert(
    unknownTypeResult.error !== undefined && unknownTypeResult.error.includes('"Unknown Type" is not a recognized Payment Type'),
    'Unrecognized payment type "Unknown Type" is rejected with explicit validation error',
    unknownTypeResult.error
  );

  // Normalization alias checks
  assert(
    omniStore.normalizePaymentType('advance') === 'Advance',
    'Case-insensitive normalization: "advance" -> "Advance"'
  );
  assert(
    omniStore.normalizePaymentType('reversal') === 'Refund / Reversal',
    'Alias normalization: "reversal" -> "Refund / Reversal"'
  );
  assert(
    omniStore.normalizePaymentType('final settlement') === 'Final Settlement',
    'Normalization: "final settlement" -> "Final Settlement"'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 4: Balance Calculations & Refund / Reversal Accounting
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 4: Balance Calculations & Refund Accounting ---');

  // Let's create a dedicated campaign for clean math testing
  const mathCamp = omniStore.saveCampaign({
    name: 'Math Balance Test Campaign',
    agreedAmount: 100000,
    status: 'Active'
  });

  // Initial balance
  let balanceState = omniStore.getCampaignOutstandingBalance(mathCamp.id);
  assert(
    balanceState.agreedAmount === 100000 && balanceState.totalPaid === 0 && balanceState.balance === 100000,
    'Initial campaign balance equals full agreed amount (₹100,000)'
  );

  // Advance paid: 30,000
  omniStore.savePayment({
    campaignId: mathCamp.id,
    amount: 30000,
    paymentType: 'Advance',
    status: 'Paid'
  });

  balanceState = omniStore.getCampaignOutstandingBalance(mathCamp.id);
  assert(
    balanceState.totalPaid === 30000 && balanceState.balance === 70000,
    'After ₹30,000 advance payout, remaining balance is ₹70,000'
  );

  // Milestone 1 paid: 40,000
  omniStore.savePayment({
    campaignId: mathCamp.id,
    amount: 40000,
    paymentType: 'Milestone 1',
    status: 'Paid'
  });

  balanceState = omniStore.getCampaignOutstandingBalance(mathCamp.id);
  assert(
    balanceState.totalPaid === 70000 && balanceState.balance === 30000,
    'After ₹40,000 Milestone 1 payout, remaining balance is ₹30,000'
  );

  // Process a Refund / Reversal of 10,000 (e.g. deliverable cancelled)
  omniStore.savePayment({
    campaignId: mathCamp.id,
    amount: 10000,
    paymentType: 'Refund / Reversal',
    status: 'Paid',
    remarks: 'Deliverable #2 cancelled by brand, creator refunded advance portion'
  });

  balanceState = omniStore.getCampaignOutstandingBalance(mathCamp.id);
  assert(
    balanceState.totalPaid === 60000 && balanceState.balance === 40000,
    'Refund / Reversal correctly reduces net disbursed (₹60,000) and restores outstanding balance (₹40,000)'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 5: Overpayment Safeguards & Exception Overrides
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 5: Overpayment Safeguards & Authorized Overrides ---');

  // Remaining balance is 40,000. Try to submit 50,000
  const overpayAttempt = omniStore.savePayment({
    campaignId: mathCamp.id,
    amount: 50000,
    paymentType: 'Final Settlement',
    status: 'Pending Approval'
  }, false);

  assert(
    overpayAttempt.error !== undefined && overpayAttempt.error.includes('Overpayment blocked'),
    'Overpayment attempt (₹50,000 with ₹40,000 balance) is blocked by default',
    overpayAttempt.error
  );

  // Authorized Super Admin exception override
  const overrideSuccess = omniStore.savePayment({
    campaignId: mathCamp.id,
    amount: 50000,
    paymentType: 'Final Settlement',
    status: 'Pending Approval',
    remarks: 'Authorized bonus inclusion approved by Super Admin'
  }, true);

  assert(
    overrideSuccess.error === undefined && overrideSuccess.payment.amount === 50000,
    'Authorized exception override allows payout above budget when authorized'
  );

  // -------------------------------------------------------------------------
  // TEST SUITE 6: Quarantine Isolation & Reconciliation
  // -------------------------------------------------------------------------
  console.log('\n--- Suite 6: Quarantine Isolation & Reconciliation ---');

  // Trigger simulated corrupt row (the exact -85000 / Unknown Type edit)
  const simResult = googleSheetsService.simulateDirectSheetEdit('invalid_quarantine');
  assert(
    simResult.message.includes('Quarantined'),
    'Direct corrupt sheet edit is isolated in Quarantine Console'
  );

  const pendingQuarantines = omniStore.getQuarantineRecords().filter(q => q.status === 'PENDING_REVIEW');
  const targetQ = pendingQuarantines.find(q => 
    q.validationErrors.some(e => e.includes('-85000')) &&
    q.validationErrors.some(e => e.includes('Unknown Type'))
  );

  assert(
    targetQ !== undefined,
    'Quarantined record exists with negative amount and unknown type errors preserved'
  );

  assert(
    targetQ?.rawPayload.Amount === '-85000' && targetQ?.rawPayload.Payment_Type === 'Unknown Type',
    'Raw incoming corrupted payload is preserved safely without altering the operational database'
  );

  // Perform authorized reconciliation
  const reconcileRes = omniStore.reconcileQuarantinedPayment(
    targetQ!.id,
    {
      campaignId: targetCampaign.id,
      amount: 85000,
      paymentType: 'Refund / Reversal',
      status: 'Paid',
      remarks: 'Normalized -85000 into positive magnitude Refund / Reversal per bank advice'
    },
    'Audited schema correction by Finance Approver'
  );

  assert(
    reconcileRes.error === undefined && reconcileRes.payment !== undefined,
    'Reconciliation workflow creates valid positive canonical ledger entry'
  );

  assert(
    reconcileRes.payment?.amount === 85000 && reconcileRes.payment?.paymentType === 'Refund / Reversal',
    'Reconciled payment has positive magnitude (85,000) and canonical type "Refund / Reversal"'
  );

  const updatedQ = omniStore.getQuarantineRecords().find(q => q.id === targetQ!.id);
  assert(
    updatedQ?.status === 'RECONCILED',
    'Quarantine record status updated to RECONCILED with audit trail'
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
