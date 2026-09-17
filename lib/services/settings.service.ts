import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongoose';
import { Setting } from '@/lib/db/models';
import { DEFAULT_SETTINGS, type SettingKeyType } from '@/lib/types';

/**
 * Get a single setting value. Falls back to DEFAULT_SETTINGS if not in DB.
 */
export async function getSetting(key: SettingKeyType): Promise<string> {
  await connectDB();
  const setting = await Setting.findOne({ key }).lean();
  if (setting) return setting.value;
  return DEFAULT_SETTINGS[key] ?? '';
}

/**
 * Get multiple settings at once as a key-value map.
 */
export async function getSettings(keys: SettingKeyType[]): Promise<Record<SettingKeyType, string>> {
  await connectDB();
  const settings = await Setting.find({ key: { $in: keys } }).lean();
  const map = { ...DEFAULT_SETTINGS } as Record<SettingKeyType, string>;
  for (const setting of settings) {
    map[setting.key as SettingKeyType] = setting.value;
  }
  // Return only requested keys
  const result = {} as Record<SettingKeyType, string>;
  for (const key of keys) {
    result[key] = map[key];
  }
  return result;
}

/**
 * Get ALL settings, merging DB values over defaults.
 */
export async function getAllSettings(): Promise<Record<SettingKeyType, string>> {
  await connectDB();
  const settings = await Setting.find({}).lean();
  const result = { ...DEFAULT_SETTINGS } as Record<SettingKeyType, string>;
  for (const setting of settings) {
    result[setting.key as SettingKeyType] = setting.value;
  }
  return result;
}

/**
 * Upsert one setting. Returns the updated value.
 */
export async function setSetting(
  key: SettingKeyType,
  value: string,
  updatedBy: string
): Promise<void> {
  await connectDB();
  const updatedById = mongoose.isValidObjectId(updatedBy) ? new mongoose.Types.ObjectId(updatedBy) : undefined;
  await Setting.findOneAndUpdate(
    { key },
    { value, ...(updatedById && { updatedBy: updatedById }) },
    { upsert: true, new: true }
  );
}

/**
 * Upsert multiple settings in one call.
 */
export async function setSettings(
  entries: { key: SettingKeyType; value: string }[],
  updatedBy: string
): Promise<void> {
  await connectDB();
  const updatedById = mongoose.isValidObjectId(updatedBy) ? new mongoose.Types.ObjectId(updatedBy) : undefined;
  const ops = entries.map((e) => ({
    updateOne: {
      filter: { key: e.key },
      update: { $set: { value: e.value, ...(updatedById && { updatedBy: updatedById }) } },
      upsert: true,
    },
  }));
  await Setting.bulkWrite(ops as any);
}

/** Helper: get numeric setting */
export async function getNumericSetting(key: SettingKeyType): Promise<number> {
  const val = await getSetting(key);
  return parseFloat(val) || 0;
}

/** Helper: get boolean setting */
export async function getBooleanSetting(key: SettingKeyType): Promise<boolean> {
  const val = await getSetting(key);
  return val === 'true';
}
