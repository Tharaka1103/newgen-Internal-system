import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Grade } from '@/lib/types';

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  mobileNumber: string;
  grade: Grade;
  medium: 'sinhala' | 'english';
  registrationDate: Date;
  status: 'active' | 'inactive';
  autoCreated: boolean; // true if auto-created on registration entry
  createdBy?: mongoose.Types.ObjectId; // admin who manually created, if any
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, trim: true },
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
    medium: {
      type: String,
      enum: ['sinhala', 'english'],
      default: 'sinhala',
    },
    registrationDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    autoCreated: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound unique: one student per (mobileNumber + grade) pair.
// Same number across different grades is now allowed.
StudentSchema.index({ mobileNumber: 1, grade: 1 }, { unique: true });
StudentSchema.index({ grade: 1, status: 1 });
StudentSchema.index({ registrationDate: -1 });
StudentSchema.index({ name: 1, status: 1 });
StudentSchema.index({ createdAt: -1 });
StudentSchema.index({ registrationDate: -1, grade: 1 });
StudentSchema.index({ mobileNumber: 1 }); // non-unique, for attribution lookups

// Ensure cached model matches the updated schema (vital for Next.js hot module reloading)
// Re-register whenever the compound index definition changes.
if (mongoose.models.Student) {
  const existing = mongoose.models.Student;
  const hasCompoundIdx = Object.values(
    (existing.schema as any).indexes?.() ?? {}
  ).some((idx: any) => idx?.[0]?.mobileNumber && idx?.[0]?.grade);
  if (!hasCompoundIdx) {
    delete (mongoose.models as any).Student;
  }
}

const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
export default Student;

