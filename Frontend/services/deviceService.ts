import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { DAILY_MATCH_LIMIT } from "../constants";

const DAILY_SPECIFIC_USAGE_KEY = 'klymo_daily_specific_usage';
const FALLBACK_ID_KEY = 'klymo_fallback_id';

export const getStableDeviceId = async (): Promise<string> => {
  // Hackathon Mode: Use simple UUID in LocalStorage.
  // This ensures that "Reset Identity" actually works and different tabs can matches.
  // FingerprintJS was too stable (preventing self-matching tests).

  let id = localStorage.getItem(FALLBACK_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(FALLBACK_ID_KEY, id);
  }
  return id;
};

interface UsageRecord {
  date: string;
  count: number;
}

const getSpecificUsage = (): UsageRecord => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(DAILY_SPECIFIC_USAGE_KEY);

  if (stored) {
    const usage: UsageRecord = JSON.parse(stored);
    if (usage.date === today) {
      return usage;
    }
  }

  // Reset or new
  return { date: today, count: 0 };
};

export const checkSpecificLimit = (): boolean => {
  const usage = getSpecificUsage();
  return usage.count < DAILY_MATCH_LIMIT;
};

export const incrementSpecificUsage = () => {
  const usage = getSpecificUsage();
  usage.count += 1;
  localStorage.setItem(DAILY_SPECIFIC_USAGE_KEY, JSON.stringify(usage));
};

export const getRemainingSpecificMatches = (): number => {
  const usage = getSpecificUsage();
  return Math.max(0, DAILY_MATCH_LIMIT - usage.count);
};

export const resetDeviceId = () => {
  localStorage.removeItem(FALLBACK_ID_KEY);
  localStorage.removeItem(DAILY_SPECIFIC_USAGE_KEY);
  localStorage.removeItem('visitorId'); // FingerprintJS standard key if used
};