import mongoose, { Schema, Document, Model } from 'mongoose';
import type { SettingKeyType } from '@/lib/types';

export interface ISetting extends Document {
  _id: mongoose.Types.ObjectId;
  key: SettingKeyType;
  value: string;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const Setting: Model<ISetting> =
  mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
export default Setting;
