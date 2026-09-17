import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ClaimStatus } from '@/lib/types';

export interface IBankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  branchName?: string;
}

export interface IClaimRequest extends Document {
  _id: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  requestedAmount: number;
  bankDetails: IBankDetails;
  status: ClaimStatus;
  adminNote?: string;
  paidAmount?: number;
  paidAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    bankName: { type: String, required: true },
    branchName: { type: String },
  },
  { _id: false }
);

const ClaimRequestSchema = new Schema<IClaimRequest>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAmount: { type: Number, required: true, min: 0 },
    bankDetails: { type: BankDetailsSchema, required: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    adminNote: { type: String },
    paidAmount: { type: Number },
    paidAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ClaimRequestSchema.index({ agent: 1, status: 1 });
ClaimRequestSchema.index({ status: 1, createdAt: -1 });

const ClaimRequest: Model<IClaimRequest> =
  mongoose.models.ClaimRequest || mongoose.model<IClaimRequest>('ClaimRequest', ClaimRequestSchema);
export default ClaimRequest;
