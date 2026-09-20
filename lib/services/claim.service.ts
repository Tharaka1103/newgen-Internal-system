import connectDB from '@/lib/db/mongoose';
import { ClaimRequest, LoyaltyLedger, User } from '@/lib/db/models';
import { createNotification } from './notification.service';
import { getNumericSetting } from './settings.service';
import { SettingKey } from '@/lib/types';
import type { SubmitClaimInput } from '@/lib/validations/claim';
import mongoose, { type Types } from 'mongoose';

/**
 * Compute an agent's current LoyaltyPoint balance (sum of all ledger entries)
 */
export async function getLoyaltyBalance(agentId: string | Types.ObjectId): Promise<number> {
  await connectDB();
  const objId = typeof agentId === 'string' ? new mongoose.Types.ObjectId(agentId) : agentId;
  const result = await LoyaltyLedger.aggregate([
    { $match: { agent: objId } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total ?? 0;
}

export async function submitClaim(
  agentId: string | Types.ObjectId,
  input: SubmitClaimInput
): Promise<InstanceType<typeof ClaimRequest>> {
  await connectDB();

  const minClaim = await getNumericSetting(SettingKey.MIN_CLAIM_AMOUNT);
  if (input.requestedAmount < minClaim) {
    throw new Error(`Minimum claim amount is Rs. ${minClaim}`);
  }

  const balance = await getLoyaltyBalance(agentId);
  if (input.requestedAmount > balance) {
    throw new Error(`Requested amount (Rs. ${input.requestedAmount}) exceeds your balance (Rs. ${balance})`);
  }

  // Check no pending claim already
  const pendingClaim = await ClaimRequest.findOne({ agent: agentId, status: 'pending' });
  if (pendingClaim) {
    throw new Error('You already have a pending claim request. Please wait for it to be processed.');
  }

  const claim = await ClaimRequest.create({
    agent: agentId,
    requestedAmount: input.requestedAmount,
    bankDetails: input.bankDetails,
    status: 'pending',
  });

  return claim;
}

export async function approveClaim(
  claimId: string,
  paidAmount: number,
  processedBy: string | Types.ObjectId,
  adminNote?: string
): Promise<InstanceType<typeof ClaimRequest>> {
  await connectDB();

  const claim = await ClaimRequest.findById(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'pending') throw new Error('Claim is not pending');

  const balance = await getLoyaltyBalance(claim.agent);
  if (paidAmount > balance) {
    throw new Error(`Paid amount (Rs. ${paidAmount.toLocaleString()}) exceeds agent balance (Rs. ${balance.toLocaleString()})`);
  }

  // Deduct from loyalty ledger (negative amount = claimed)
  await LoyaltyLedger.create({
    agent: claim.agent,
    type: 'claimed',
    amount: -paidAmount,
    referenceId: claim._id,
    referenceModel: 'ClaimRequest',
    description: `Claim payout approved: Rs. ${paidAmount}`,
  });

  claim.status = 'paid';
  claim.paidAmount = paidAmount;
  claim.paidAt = new Date();
  claim.processedBy = processedBy as Types.ObjectId;
  claim.adminNote = adminNote;
  await claim.save();

  await createNotification({
    recipientId: claim.agent,
    type: 'claim_approved',
    title: 'Claim Request Approved',
    message: `Your claim of Rs. ${paidAmount} has been approved and processed.`,
    referenceId: claim._id,
    entityType: 'ClaimRequest',
  });

  return claim;
}

export async function rejectClaim(
  claimId: string,
  adminNote: string,
  processedBy: string | Types.ObjectId
): Promise<InstanceType<typeof ClaimRequest>> {
  await connectDB();

  const claim = await ClaimRequest.findById(claimId);
  if (!claim) throw new Error('Claim not found');
  if (claim.status !== 'pending') throw new Error('Claim is not pending');

  claim.status = 'rejected';
  claim.adminNote = adminNote;
  claim.processedBy = processedBy as Types.ObjectId;
  await claim.save();

  await createNotification({
    recipientId: claim.agent,
    type: 'claim_rejected',
    title: 'Claim Request Rejected',
    message: `Your claim request has been rejected. Reason: ${adminNote}`,
    referenceId: claim._id,
    entityType: 'ClaimRequest',
  });

  return claim;
}

export interface ManualPayoutInput {
  amount: number;
  note?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branchName?: string;
  };
}

/**
 * Directly record a manual payout to an agent by Admin.
 * Creates a paid ClaimRequest record, creates a negative LoyaltyLedger entry,
 * sends notification to the agent, and reduces remaining balance immediately.
 */
export async function createManualPayout(
  agentId: string | Types.ObjectId,
  input: ManualPayoutInput,
  processedBy: string | Types.ObjectId
): Promise<{ claim: InstanceType<typeof ClaimRequest>; newBalance: number }> {
  await connectDB();
  const objAgentId = typeof agentId === 'string' ? new mongoose.Types.ObjectId(agentId) : agentId;
  const objAdminId = typeof processedBy === 'string' ? new mongoose.Types.ObjectId(processedBy) : processedBy;

  const agentUser = await User.findById(objAgentId);
  if (!agentUser) {
    throw new Error('Agent user not found');
  }

  const amount = Number(input.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Payout amount must be greater than 0');
  }

  const currentBalance = await getLoyaltyBalance(objAgentId);
  if (amount > currentBalance) {
    throw new Error(`Cannot pay Rs. ${amount.toLocaleString()}. Agent's payable balance is only Rs. ${currentBalance.toLocaleString()}`);
  }

  const bankDetails = {
    accountName: input.bankDetails?.accountName?.trim() || agentUser.name || 'Agent',
    accountNumber: input.bankDetails?.accountNumber?.trim() || 'Manual Payout',
    bankName: input.bankDetails?.bankName?.trim() || 'Direct Payment',
    branchName: input.bankDetails?.branchName?.trim() || '',
  };

  const claim = await ClaimRequest.create({
    agent: objAgentId,
    requestedAmount: amount,
    paidAmount: amount,
    status: 'paid',
    bankDetails,
    paidAt: new Date(),
    processedBy: objAdminId,
    adminNote: input.note ? `Manual Payout: ${input.note}` : 'Direct manual payout by Administrator',
  });

  await LoyaltyLedger.create({
    agent: objAgentId,
    type: 'claimed',
    amount: -amount,
    referenceId: claim._id,
    referenceModel: 'ClaimRequest',
    description: `Manual payout recorded by Admin: Rs. ${amount.toLocaleString()}${input.note ? ` (${input.note})` : ''}`,
  });

  const newBalance = currentBalance - amount;

  await createNotification({
    recipientId: objAgentId,
    type: 'claim_approved',
    title: 'Payment Received',
    message: `Administrator recorded a manual payout of Rs. ${amount.toLocaleString()} to your account.${input.note ? ` Note: ${input.note}` : ''}`,
    referenceId: claim._id,
    entityType: 'ClaimRequest',
  });

  return { claim, newBalance };
}
