import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Location from "expo-location";
import { apiFetch } from "../lib/api";
import { getRiderId } from "../lib/auth";
import type { RiderProfile, Shift } from "../types";

interface RiderContextValue {
  rider: RiderProfile | null;
  activeShift: Shift | null;
  todayDeliveries: number;
  todayCodCollected: number;
  jobsCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setJobsCount: React.Dispatch<React.SetStateAction<number>>;
}

const RiderContext = createContext<RiderContextValue | null>(null);

export function RiderProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<RiderProfile | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayCodCollected, setTodayCodCollected] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const riderId = await getRiderId();
    if (!riderId) return;

    try {
      const data = await apiFetch<{
        rider: RiderProfile;
        active_shift: Shift | null;
        today_deliveries: number;
        today_cod_collected: number;
      }>("/api/riders/me");

      setRider(data.rider);
      setActiveShift(data.active_shift);
      setTodayDeliveries(data.today_deliveries);
      setTodayCodCollected(data.today_cod_collected);

      const jobs = await apiFetch<{ jobs: unknown[] }>(
        `/api/riders/${riderId}/jobs`,
      );
      setJobsCount(jobs.jobs.length);
    } catch {
      /* handled by screens */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!rider?.is_on_shift || !rider?.id) return;

    let cancelled = false;

    async function sendLocation() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;

        await apiFetch(`/api/riders/${rider!.id}/location`, {
          method: "PATCH",
          body: JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }),
        });
      } catch {
        /* non-blocking */
      }
    }

    sendLocation();
    const id = setInterval(sendLocation, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [rider?.is_on_shift, rider?.id]);

  const value = useMemo(
    () => ({
      rider,
      activeShift,
      todayDeliveries,
      todayCodCollected,
      jobsCount,
      loading,
      refresh,
      setJobsCount,
    }),
    [
      rider,
      activeShift,
      todayDeliveries,
      todayCodCollected,
      jobsCount,
      loading,
      refresh,
    ],
  );

  return (
    <RiderContext.Provider value={value}>{children}</RiderContext.Provider>
  );
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error("useRider must be used within RiderProvider");
  return ctx;
}
