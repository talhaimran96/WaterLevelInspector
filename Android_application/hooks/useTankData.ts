import { useState, useEffect, useCallback, useRef } from 'react';
import { TankConfig } from '@/constants/tankConfig';

export type TankStatus = 'ok' | 'offline' | 'loading';

export interface TankReading {
  percentage: number;    // 0–100
  rawDistance: number;   // adjusted distance in cm (after offset)
  status: TankStatus;
}

export interface TankData {
  tank1: TankReading;
  tank2: TankReading;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  error: string | null;
}

const defaultReading: TankReading = {
  percentage: 0,
  rawDistance: -1,
  status: 'loading',
};

/** Fetch raw cm distance from an ESP8266 endpoint. */
async function fetchDistance(url: string, signal: AbortSignal): Promise<number> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const val = parseFloat(text.trim());
  if (isNaN(val)) throw new Error('Non-numeric payload');
  return val;
}

/** Apply the same math as the Arduino sketch. */
function computeReading(
  rawDist: number,
  maxLevelDistance: number,
  tankHeight: number,
): TankReading {
  const dist = rawDist - maxLevelDistance;
  if (dist < 0) {
    // Sensor is closer than max-fill distance → treat as 100 %
    return { percentage: 100, rawDistance: 0, status: 'ok' };
  }
  const pct = Math.min(100, Math.max(0, ((tankHeight - dist) / tankHeight) * 100));
  return { percentage: pct, rawDistance: dist, status: 'ok' };
}

export function useTankData(config: TankConfig): [TankData, () => void] {
  const [data, setData] = useState<TankData>({
    tank1: defaultReading,
    tank2: defaultReading,
    lastUpdated: null,
    isRefreshing: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setData((prev) => ({ ...prev, isRefreshing: true, error: null }));

    const results = await Promise.allSettled([
      fetchDistance(config.tank1Url, controller.signal),
      fetchDistance(config.tank2Url, controller.signal),
    ]);

    if (controller.signal.aborted) return;

    const [r1, r2] = results;

    const tank1: TankReading =
      r1.status === 'fulfilled'
        ? computeReading(r1.value, config.tank1MaxLevelDistance, config.tank1Height)
        : { percentage: 0, rawDistance: -1, status: 'offline' };

    const tank2: TankReading =
      r2.status === 'fulfilled'
        ? computeReading(r2.value, config.tank2MaxLevelDistance, config.tank2Height)
        : { percentage: 0, rawDistance: -1, status: 'offline' };

    const bothFailed = tank1.status === 'offline' && tank2.status === 'offline';

    setData({
      tank1,
      tank2,
      lastUpdated: new Date(),
      isRefreshing: false,
      error: bothFailed ? 'Both sensors are offline. Check your network.' : null,
    });
  }, [config]);

  // Auto-refresh on mount and when config changes
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, config.refreshInterval);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [refresh, config.refreshInterval]);

  return [data, refresh];
}
