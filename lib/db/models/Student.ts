import mongoose, { Schema, Document, Model } from 'mongoose';
import type { Grade } from '@/lib/types';

export interface IStudent extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  mobileNumber: string;
  grade: Grade;
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
    registrationDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    autoCreated: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

StudentSchema.index({ mobileNumber: 1 }, { unique: true });
StudentSchema.index({ grade: 1, status: 1 });
StudentSchema.index({ registrationDate: -1 });

const Student: Model<IStudent> = mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
export default Student;
