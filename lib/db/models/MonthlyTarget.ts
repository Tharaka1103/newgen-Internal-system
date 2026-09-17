import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMonthlyTarget extends Document {
  _id: mongoose.Types.ObjectId;
  agent: mongoose.Types.ObjectId;
  /** The target month (1st of month UTC) */
  month: Date;
  callTarget: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyTargetSchema = new Schema<IMonthlyTarget>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Date, required: true },
    callTarget: { type: Number, required: true, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One target per (agent, month)
MonthlyTargetSchema.index({ agent: 1, month: 1 }, { unique: true });

const MonthlyTarget: Model<IMonthlyTarget> =
  mongoose.models.MonthlyTarget || mongoose.model<IMonthlyTarget>('MonthlyTarget', MonthlyTargetSchema);
export default MonthlyTarget;
