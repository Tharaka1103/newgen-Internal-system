import mongoose, { Schema, Document, Model } from 'mongoose';
import type { CreditPointSource } from '@/lib/types';

export interface ICreditPoint extends Document {
  _id: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  source: CreditPointSource;
  referenceId: mongoose.Types.ObjectId; // PaymentRecord or Student id
  referenceModel: 'PaymentRecord' | 'Student';
  amount: number;
  /** Month this credit point belongs to (1st of month UTC) */
  month: Date;
  createdAt: Date;
}

const CreditPointSchema = new Schema<ICreditPoint>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['registration_match', 'payment_match'], required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    referenceModel: { type: String, enum: ['PaymentRecord', 'Student'], required: true },
    amount: { type: Number, required: true, min: 0 },
    month: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CreditPointSchema.index({ agent: 1, month: -1 });
CreditPointSchema.index({ agent: 1 });
CreditPointSchema.index({ month: -1, agent: 1 });
CreditPointSchema.index({ month: 1, source: 1 });

const CreditPoint: Model<ICreditPoint> =
  mongoose.models.CreditPoint || mongoose.model<ICreditPoint>('CreditPoint', CreditPointSchema);
export default CreditPoint;
