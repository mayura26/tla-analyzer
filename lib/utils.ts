import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const sessionTimes: { [key: string]: { start: string, end: string } } = {
  morning: { start: '08:40', end: '09:59' },
  main: { start: '10:00', end: '15:24' },
  end: { start: '15:25', end: '16:00' }
};

const subSessionTimes: { [key: string]: { start: string, end: string } } = {
  midday: { start: '10:00', end: '12:45' },
  afternoon: { start: '12:46', end: '15:24' },
};

export function getTradeSession(timestamp: string): string | null {
  const tradeTime = new Date(timestamp);
  const timeString = tradeTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });

  for (const session in sessionTimes) {
    const { start, end } = sessionTimes[session];
    if (timeString >= start && timeString <= end) {
      return session;
    }
  }
  return null;
}

export function getTradeSubSession(timestamp: string): string | null {
  const tradeTime = new Date(timestamp);
  const timeString = tradeTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });

  for (const session in subSessionTimes) {
    const { start, end } = subSessionTimes[session];
    if (timeString >= start && timeString <= end) {
      return session;
    }
  }
  return null;
}

export const getPnlColor = (value: number) => {
  if (value >= 0) {
    if (value < 100) return 'text-green-400';
    if (value < 300) return 'text-green-500';
    return 'text-green-600 font-bold';
  } else {
    if (value > -100) return 'text-red-400';
    if (value > -300) return 'text-red-500';
    return 'text-red-600 font-bold';
  }
}
