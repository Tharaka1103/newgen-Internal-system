import connectDB from '@/lib/db/mongoose';
import { User, LoyaltyLedger, ClaimRequest, Notification } from '@/lib/db/models';
import { createManualPayout, getLoyaltyBalance } from '@/lib/services/claim.service';
import mongoose from 'mongoose';

async function testManualPayout() {
  await connectDB();
  console.log('Connected to DB');

  // Find an active agent and an admin
  const agent = await User.findOne({ role: 'agent', status: 'active' });
  const admin = await User.findOne({ role: 'admin' });

  if (!agent || !admin) {
    console.error('Missing agent or admin user in DB');
    process.exit(1);
  }

  console.log(`Testing with Agent: ${agent.name} (${agent._id}) and Admin: ${admin.name} (${admin._id})`);

  // Record initial balance
  const initialBalance = await getLoyaltyBalance(agent._id);
  console.log(`Initial Balance: Rs. ${initialBalance}`);

  // If balance is 0 or low, add a temporary positive loyalty ledger entry for testing
  let testCreditAdded = false;
  if (initialBalance < 1000) {
    console.log('Adding Rs. 3,000 temporary loyalty credit for testing...');
    await LoyaltyLedger.create({
      agent: agent._id,
      type: 'earned',
      amount: 3000,
      referenceId: new mongoose.Types.ObjectId(),
      referenceModel: 'Student',
      description: 'Test loyalty credit for payout verification',
    });
    testCreditAdded = true;
  }

  const balanceBeforePayout = await getLoyaltyBalance(agent._id);
  console.log(`Balance before payout: Rs. ${balanceBeforePayout}`);

  // Test 1: Payout exceeding balance should fail
  try {
    await createManualPayout(agent._id, { amount: balanceBeforePayout + 5000 }, admin._id);
    console.error('FAIL: Expected payout exceeding balance to throw error, but it did not.');
    process.exit(1);
  } catch (err: any) {
    console.log(`PASS: Payout exceeding balance was properly blocked: "${err.message}"`);
  }

  // Test 2: Payout of 0 or negative should fail
  try {
    await createManualPayout(agent._id, { amount: 0 }, admin._id);
    console.error('FAIL: Expected payout of 0 to throw error, but it did not.');
    process.exit(1);
  } catch (err: any) {
    console.log(`PASS: Zero amount payout was properly blocked: "${err.message}"`);
  }

  // Test 3: Valid payout of Rs. 1,000
  const payoutAmount = 1000;
  const result = await createManualPayout(
    agent._id,
    {
      amount: payoutAmount,
      note: 'Automated test direct payout',
      bankDetails: {
        accountName: agent.name,
        accountNumber: '1234567890',
        bankName: 'Commercial Bank',
      },
    },
    admin._id
  );

  console.log(`Payout created successfully. Resulting balance: Rs. ${result.newBalance}`);
  if (result.newBalance !== balanceBeforePayout - payoutAmount) {
    console.error(`FAIL: Expected new balance to be ${balanceBeforePayout - payoutAmount}, got ${result.newBalance}`);
    process.exit(1);
  }

  // Check actual balance via getLoyaltyBalance
  const actualBalanceAfter = await getLoyaltyBalance(agent._id);
  console.log(`Actual balance from DB aggregation: Rs. ${actualBalanceAfter}`);
  if (actualBalanceAfter !== balanceBeforePayout - payoutAmount) {
    console.error(`FAIL: DB balance mismatch. Expected ${balanceBeforePayout - payoutAmount}, got ${actualBalanceAfter}`);
    process.exit(1);
  }

  // Verify ClaimRequest in DB
  const claimInDb = await ClaimRequest.findById(result.claim._id);
  if (!claimInDb || claimInDb.status !== 'paid' || claimInDb.paidAmount !== payoutAmount) {
    console.error('FAIL: ClaimRequest not saved with status paid or incorrect amount');
    process.exit(1);
  }
  console.log('PASS: ClaimRequest verified in DB with status: paid');

  // Verify Notification
  const notification = await Notification.findOne({
    recipient: agent._id,
    type: 'claim_approved',
  }).sort({ createdAt: -1 });
  if (!notification || !notification.message.includes(payoutAmount.toLocaleString())) {
    console.error('FAIL: Notification was not created or message incorrect');
    process.exit(1);
  }
  console.log(`PASS: Notification verified: "${notification.title} - ${notification.message}"`);

  // Clean up test data
  console.log('Cleaning up test payout records...');
  await LoyaltyLedger.deleteOne({ referenceId: result.claim._id });
  await ClaimRequest.findByIdAndDelete(result.claim._id);
  await Notification.findByIdAndDelete(notification._id);
  if (testCreditAdded) {
    await LoyaltyLedger.deleteOne({ description: 'Test loyalty credit for payout verification' });
  }

  const finalBalance = await getLoyaltyBalance(agent._id);
  console.log(`Final Balance restored to: Rs. ${finalBalance}`);
  if (finalBalance !== initialBalance) {
    console.error(`FAIL: Expected restored balance to be ${initialBalance}, got ${finalBalance}`);
    process.exit(1);
  }

  console.log('ALL MANUAL PAYOUT TESTS PASSED PERFECTLY!');
  process.exit(0);
}

testManualPayout().catch((err) => {
  console.error('Unexpected error during test:', err);
  process.exit(1);
});
