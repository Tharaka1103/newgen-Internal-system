import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaymentRecord extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  mobileNumber: string;
  amount: number;
  /** The month this payment is for (stored as 1st of month UTC) */
  paymentMonth: Date;
  attributedAgent?: mongoose.Types.ObjectId;
  creditPointsAwarded: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    mobileNumber: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMonth: { type: Date, required: true },
    attributedAgent: { type: Schema.Types.ObjectId, ref: 'User' },
    creditPointsAwarded: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PaymentRecordSchema.index({ student: 1, paymentMonth: 1 }, { unique: true });
PaymentRecordSchema.index({ attributedAgent: 1, paymentMonth: -1 });
PaymentRecordSchema.index({ paymentMonth: -1, createdAt: -1 });
PaymentRecordSchema.index({ paymentMonth: -1, attributedAgent: 1 });
PaymentRecordSchema.index({ createdAt: -1 });
PaymentRecordSchema.index({ mobileNumber: 1 });

if (mongoose.models.PaymentRecord) {
  const existing = mongoose.models.PaymentRecord;
  const hasUniqueIdx = Object.values(
    (existing.schema as any).indexes?.() ?? {}
  ).some((idx: any) => idx?.[0]?.student && idx?.[0]?.paymentMonth && idx?.[1]?.unique);
  if (!hasUniqueIdx) {
    delete (mongoose.models as any).PaymentRecord;
  }
}

const PaymentRecord: Model<IPaymentRecord> =
  mongoose.models.PaymentRecord || mongoose.model<IPaymentRecord>('PaymentRecord', PaymentRecordSchema);
export default PaymentRecord;
