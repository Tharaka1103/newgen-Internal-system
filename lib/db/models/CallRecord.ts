import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Grade, CallOutcome } from '@/lib/types';

export interface ICallRecord extends Document {
  _id: mongoose.Types.ObjectId;
  mobileNumber: string;
  grade: Grade;
  /** Stored as the 1st day of the month (UTC midnight), e.g. 2025-09-01T00:00:00.000Z */
  month: Date;
  agent: mongoose.Types.ObjectId;
  outcome: CallOutcome;
  notes?: string;
  /** Soft-delete/correction tracking — admin-only edits */
  correctedBy?: mongoose.Types.ObjectId;
  correctedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallRecordSchema = new Schema<ICallRecord>(
  {
    mobileNumber: { type: String, required: true, trim: true },
    grade: {
      type: String,
      enum: [
        'grade_2', 'grade_3', 'grade_4', 'grade_5',
        'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11',
        'o_level', 'a_level'
      ],
      required: true,
    },
    month: { type: Date, required: true },
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    outcome: {
      type: String,
      enum: ['interested', 'not_interested', 'call_back_later', 'no_answer'],
      required: true,
    },
    notes: { type: String, trim: true },
    correctedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    correctedAt: { type: Date },
  },
  { timestamps: true }
);

// Core business constraint: one call record per (mobileNumber, month) across ALL agents
CallRecordSchema.index({ mobileNumber: 1, month: 1 }, { unique: true });
CallRecordSchema.index({ agent: 1, month: -1 });
CallRecordSchema.index({ mobileNumber: 1, month: -1 }); // for matching fallback query

const CallRecord: Model<ICallRecord> =
  mongoose.models.CallRecord || mongoose.model<ICallRecord>('CallRecord', CallRecordSchema);
export default CallRecord;
