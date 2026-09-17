import connectDB from '@/lib/db/mongoose';
import { ClaimRequest, LoyaltyLedger } from '@/lib/db/models';
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
