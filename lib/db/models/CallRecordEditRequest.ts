import mongoose, { Schema, Document, Model } from 'mongoose';

export type EditRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface ICallRecordEditRequest extends Document {
  _id: mongoose.Types.ObjectId;
  callRecord: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  reason: string;
  status: EditRequestStatus;
  adminNote?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallRecordEditRequestSchema = new Schema<ICallRecordEditRequest>(
  {
    callRecord: { type: Schema.Types.ObjectId, ref: 'CallRecord', required: true },
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    adminNote: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

CallRecordEditRequestSchema.index({ callRecord: 1, status: 1 });
CallRecordEditRequestSchema.index({ agent: 1, createdAt: -1 });
CallRecordEditRequestSchema.index({ status: 1, createdAt: -1 });

const CallRecordEditRequest: Model<ICallRecordEditRequest> =
  mongoose.models.CallRecordEditRequest ||
  mongoose.model<ICallRecordEditRequest>('CallRecordEditRequest', CallRecordEditRequestSchema);

export default CallRecordEditRequest;
