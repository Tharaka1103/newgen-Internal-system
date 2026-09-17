import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { CallRecord, CreditPoint, PaymentRecord, Student, LoyaltyLedger, ClaimRequest } from '@/lib/db/models';
import Papa from 'papaparse';
import { toMonthStart, formatMonth } from './matching.service';

interface ReportParams {
  startMonth?: string; // YYYY-MM
  endMonth?: string;   // YYYY-MM
  agentId?: string;
}

// ── Agent Performance Report ──────────────────────────────────
export async function getAgentPerformanceReport(params: ReportParams = {}) {
  await connectDB();

  const matchStage: Record<string, unknown> = {};
  if (params.startMonth) matchStage.month = { $gte: toMonthStart(params.startMonth) };
  if (params.endMonth) {
    const end = toMonthStart(params.endMonth);
    end.setUTCMonth(end.getUTCMonth() + 1); // exclusive
    matchStage.month = { ...(matchStage.month as object), $lt: end };
  }
  if (params.agentId) {
    matchStage.agent = mongoose.Types.ObjectId.isValid(params.agentId)
      ? new mongoose.Types.ObjectId(params.agentId)
      : params.agentId;
  }

  const creditAgg = await CreditPoint.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$agent',
        totalPoints: { $sum: '$amount' },
        registrationMatches: {
          $sum: { $cond: [{ $eq: ['$source', 'registration_match'] }, 1, 0] },
        },
        paymentMatches: {
          $sum: { $cond: [{ $eq: ['$source', 'payment_match'] }, 1, 0] },
        },
      },
    },
    { $sort: { totalPoints: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'agent',
      },
    },
    { $unwind: '$agent' },
    {
      $project: {
        agentId: '$_id',
        agentName: '$agent.name',
        agentEmail: '$agent.email',
        totalPoints: 1,
        registrationMatches: 1,
        paymentMatches: 1,
      },
    },
  ]);

  return creditAgg;
}

// ── Registrations Over Time ───────────────────────────────────
export async function getRegistrationsOverTime(params: ReportParams = {}) {
  await connectDB();

  const matchStage: Record<string, unknown> = {};
  if (params.startMonth) matchStage.registrationDate = { $gte: toMonthStart(params.startMonth) };
  if (params.endMonth) {
    const end = toMonthStart(params.endMonth);
    end.setUTCMonth(end.getUTCMonth() + 1);
    matchStage.registrationDate = { ...(matchStage.registrationDate as object), $lt: end };
  }

  const agg = await Student.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$registrationDate' },
          month: { $month: '$registrationDate' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%Y-%m',
            date: {
              $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 },
            },
          },
        },
        count: 1,
        _id: 0,
      },
    },
  ]);

  return agg;
}

// ── Payments Over Time ────────────────────────────────────────
export async function getPaymentsOverTime(params: ReportParams = {}) {
  await connectDB();

  const matchStage: Record<string, unknown> = {};
  if (params.startMonth) matchStage.paymentMonth = { $gte: toMonthStart(params.startMonth) };
  if (params.endMonth) {
    const end = toMonthStart(params.endMonth);
    end.setUTCMonth(end.getUTCMonth() + 1);
    matchStage.paymentMonth = { ...(matchStage.paymentMonth as object), $lt: end };
  }

  const agg = await PaymentRecord.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$paymentMonth' },
          month: { $month: '$paymentMonth' },
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%Y-%m',
            date: {
              $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 },
            },
          },
        },
        totalAmount: 1,
        count: 1,
        _id: 0,
      },
    },
  ]);

  return agg;
}

// ── Loyalty Payouts Over Time ─────────────────────────────────
export async function getLoyaltyPayoutsOverTime(params: ReportParams = {}) {
  await connectDB();

  const matchStage: Record<string, unknown> = { type: 'claimed' };
  if (params.startMonth) matchStage.createdAt = { $gte: toMonthStart(params.startMonth) };
  if (params.endMonth) {
    const end = toMonthStart(params.endMonth);
    end.setUTCMonth(end.getUTCMonth() + 1);
    matchStage.createdAt = { ...(matchStage.createdAt as object), $lt: end };
  }

  const agg = await LoyaltyLedger.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        totalPaid: { $sum: { $abs: '$amount' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%Y-%m',
            date: {
              $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 },
            },
          },
        },
        totalPaid: 1,
        count: 1,
        _id: 0,
      },
    },
  ]);

  return agg;
}

// ── CSV Export ────────────────────────────────────────────────
export function exportToCSV(data: Record<string, unknown>[]): string {
  return Papa.unparse(data);
}
