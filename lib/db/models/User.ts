import mongoose, { Schema, Document, Model } from 'mongoose';
import type { UserRole, UserStatus, PermissionKey } from '@/lib/types';

export interface IUserSession {
  sessionToken: string;
  ip?: string;
  userAgent?: string;
  lastSeen: Date;
  createdAt: Date;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: PermissionKey[];
  status: UserStatus;
  failedLoginCount: number;
  lockedUntil?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  sessions: IUserSession[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>({
  sessionToken: { type: String, required: true },
  ip: { type: String },
  userAgent: { type: String },
  lastSeen: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'agent'], required: true, default: 'agent' },
    permissions: [{ type: String }],
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    sessions: [UserSessionSchema],
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, status: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
