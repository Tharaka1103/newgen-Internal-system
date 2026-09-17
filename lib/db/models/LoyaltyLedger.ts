import mongoose, { Schema, Document, Model } from 'mongoose';
import type { LoyaltyLedgerType } from '@/lib/types';

export interface ILoyaltyLedger extends Document {
  _id: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  type: LoyaltyLedgerType;
  amount: number; // Positive = earned, Negative = claimed
  referenceId: mongoose.Types.ObjectId;
  referenceModel: 'Student' | 'ClaimRequest';
  description?: string;
  createdAt: Date;
}

const LoyaltyLedgerSchema = new Schema<ILoyaltyLedger>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['earned', 'claimed'], required: true },
    amount: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    referenceModel: { type: String, enum: ['Student', 'ClaimRequest'], required: true },
    description: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LoyaltyLedgerSchema.index({ agent: 1, createdAt: -1 });

const LoyaltyLedger: Model<ILoyaltyLedger> =
  mongoose.models.LoyaltyLedger || mongoose.model<ILoyaltyLedger>('LoyaltyLedger', LoyaltyLedgerSchema);
export default LoyaltyLedger;
