import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import { supabase } from "../db/index.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

function paramString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function getTodayUtcRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  ).toISOString();
  return { start, end };
}

async function getRiderById(riderId: string) {
  const { data, error } = await supabase
    .from("riders")
    .select(
      `
        *,
        user:users(id, name, phone, email, role)
      `,
    )
    .eq("id", riderId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

async function getRiderIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("riders")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id ?? null;
}

function canAccessRider(
  req: Request,
  rider: { user_id: string },
): boolean {
  if (req.user!.role === "admin") {
    return true;
  }
  return req.user!.role === "rider" && req.user!.id === rider.user_id;
}

async function assertRiderSelfOrAdmin(
  req: Request,
  riderId: string,
): Promise<
  | { ok: true; rider: NonNullable<Awaited<ReturnType<typeof getRiderById>>> }
  | { ok: false; reason: "not_found" | "forbidden" }
> {
  const rider = await getRiderById(riderId);
  if (!rider) {
    return { ok: false, reason: "not_found" };
  }
  if (!canAccessRider(req, rider as { user_id: string })) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, rider };
}

function formatRiderResponse(rider: Record<string, unknown>) {
  const user = rider.user as
    | { id: string; name: string; phone: string; email: string | null }
    | undefined;

  const { user: _user, ...riderFields } = rider;
  return {
    ...riderFields,
    name: user?.name ?? null,
    phone: user?.phone ?? null,
    email: user?.email ?? null,
    user_id: user?.id ?? rider.user_id,
  };
}

async function countTodayDeliveriesByRider(): Promise<Map<string, number>> {
  const { start, end } = getTodayUtcRange();
  const { data } = await supabase
    .from("shipments")
    .select("rider_id")
    .eq("status", "delivered")
    .gte("updated_at", start)
    .lte("updated_at", end)
    .not("rider_id", "is", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.rider_id) {
      counts.set(row.rider_id, (counts.get(row.rider_id) ?? 0) + 1);
    }
  }
  return counts;
}

router.get(
  "/me",
  authenticateToken,
  requireRole("rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = await getRiderIdForUser(req.user!.id);
    if (!riderId) {
      res.status(404).json({ error: "Rider profile not found" });
      return;
    }

    const rider = await getRiderById(riderId);
    if (!rider) {
      res.status(404).json({ error: "Rider profile not found" });
      return;
    }

    const { start, end } = getTodayUtcRange();

    const { data: todayShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("rider_id", riderId)
      .gte("started_at", start)
      .lte("started_at", end)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("rider_id", riderId)
      .eq("status", "active")
      .maybeSingle();

    const deliveryCounts = await countTodayDeliveriesByRider();
    const todayDeliveries = deliveryCounts.get(riderId) ?? 0;

    const { data: codToday } = await supabase
      .from("cod_ledger")
      .select("amount")
      .eq("rider_id", riderId)
      .gte("collected_at", start)
      .lte("collected_at", end);

    const todayCodCollected =
      codToday?.reduce((sum, row) => sum + Number(row.amount ?? 0), 0) ?? 0;

    res.json({
      rider: formatRiderResponse(rider as Record<string, unknown>),
      today_shift: todayShift ?? null,
      active_shift: activeShift ?? null,
      today_deliveries: todayDeliveries,
      today_cod_collected: todayCodCollected,
    });
  },
);

router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const { name, phone, email, password, cnic, bike_number, zone } =
      req.body as Record<string, string | undefined>;

    if (!name || !phone || !password || !cnic || !bike_number) {
      res.status(400).json({
        error: "name, phone, password, cnic, and bike_number are required",
      });
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          name,
          phone,
          email: email ?? null,
          password_hash: passwordHash,
          role: "rider",
        })
        .select("id, name, phone, email, role")
        .single();

      if (userError || !user) {
        if (userError?.code === "23505") {
          res.status(409).json({ error: "Phone or email already registered" });
          return;
        }
        console.error("Create rider user error:", userError);
        res.status(500).json({ error: "Failed to create rider user" });
        return;
      }

      const { data: rider, error: riderError } = await supabase
        .from("riders")
        .insert({
          user_id: user.id,
          cnic,
          bike_number,
          zone: zone ?? null,
        })
        .select("*")
        .single();

      if (riderError || !rider) {
        await supabase.from("users").delete().eq("id", user.id);
        if (riderError?.code === "23505") {
          res.status(409).json({ error: "CNIC or bike number already exists" });
          return;
        }
        console.error("Create rider error:", riderError);
        res.status(500).json({ error: "Failed to create rider profile" });
        return;
      }

      res.status(201).json({
        rider: {
          ...rider,
          name: user.name,
          phone: user.phone,
          email: user.email,
        },
      });
    } catch (err) {
      console.error("Create rider error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/",
  authenticateToken,
  requireRole("admin"),
  async (_req: Request, res: Response): Promise<void> => {
    const { data: riders, error } = await supabase
      .from("riders")
      .select(
        `
          *,
          user:users(id, name, phone, email)
        `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List riders error:", error);
      res.status(500).json({ error: "Failed to fetch riders" });
      return;
    }

    const deliveryCounts = await countTodayDeliveriesByRider();

    res.json({
      riders: (riders ?? []).map((rider) => ({
        ...formatRiderResponse(rider as Record<string, unknown>),
        today_deliveries: deliveryCounts.get(rider.id) ?? 0,
      })),
    });
  },
);

router.patch(
  "/:id/location",
  authenticateToken,
  requireRole("rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = paramString(req.params.id);
    const { lat, lng } = req.body as { lat?: number; lng?: number };

    if (lat == null || lng == null) {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    const ownRiderId = await getRiderIdForUser(req.user!.id);
    if (!ownRiderId || ownRiderId !== riderId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { data, error } = await supabase
      .from("riders")
      .update({ current_lat: lat, current_lng: lng })
      .eq("id", riderId)
      .select("id, current_lat, current_lng")
      .single();

    if (error || !data) {
      console.error("Update location error:", error);
      res.status(500).json({ error: "Failed to update location" });
      return;
    }

    res.json({ location: data });
  },
);

router.post(
  "/:id/shift/start",
  authenticateToken,
  requireRole("rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = paramString(req.params.id);
    const ownRiderId = await getRiderIdForUser(req.user!.id);

    if (!ownRiderId || ownRiderId !== riderId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { data: activeShift } = await supabase
      .from("shifts")
      .select("id")
      .eq("rider_id", riderId)
      .eq("status", "active")
      .maybeSingle();

    if (activeShift) {
      res.status(409).json({ error: "An active shift already exists" });
      return;
    }

    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .insert({
        rider_id: riderId,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (shiftError || !shift) {
      console.error("Start shift error:", shiftError);
      res.status(500).json({ error: "Failed to start shift" });
      return;
    }

    await supabase
      .from("riders")
      .update({ is_on_shift: true })
      .eq("id", riderId);

    res.status(201).json({ shift });
  },
);

router.post(
  "/:id/shift/end",
  authenticateToken,
  requireRole("rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = paramString(req.params.id);
    const ownRiderId = await getRiderIdForUser(req.user!.id);

    if (!ownRiderId || ownRiderId !== riderId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { data: activeShift, error: fetchError } = await supabase
      .from("shifts")
      .select("*")
      .eq("rider_id", riderId)
      .eq("status", "active")
      .single();

    if (fetchError || !activeShift) {
      res.status(404).json({ error: "No active shift found" });
      return;
    }

    const endedAt = new Date().toISOString();
    const startedAt = activeShift.started_at as string;

    const { data: deliveredShipments } = await supabase
      .from("shipments")
      .select("id")
      .eq("rider_id", riderId)
      .eq("status", "delivered")
      .gte("updated_at", startedAt)
      .lte("updated_at", endedAt);

    const { data: codEntries } = await supabase
      .from("cod_ledger")
      .select("amount")
      .eq("rider_id", riderId)
      .gte("collected_at", startedAt)
      .lte("collected_at", endedAt);

    const totalDeliveries = deliveredShipments?.length ?? 0;
    const totalCodCollected =
      codEntries?.reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      ) ?? 0;

    const { data: shift, error: updateError } = await supabase
      .from("shifts")
      .update({
        ended_at: endedAt,
        status: "ended",
        total_deliveries: totalDeliveries,
        total_cod_collected: totalCodCollected,
      })
      .eq("id", activeShift.id)
      .select()
      .single();

    if (updateError || !shift) {
      console.error("End shift error:", updateError);
      res.status(500).json({ error: "Failed to end shift" });
      return;
    }

    await supabase
      .from("riders")
      .update({ is_on_shift: false })
      .eq("id", riderId);

    res.json({ shift });
  },
);

router.get(
  "/:id/jobs",
  authenticateToken,
  requireRole("admin", "rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = paramString(req.params.id);

    if (req.user!.role === "rider") {
      const ownRiderId = await getRiderIdForUser(req.user!.id);
      if (!ownRiderId || ownRiderId !== riderId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const { data: jobs, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("rider_id", riderId)
      .in("status", ["assigned", "picked_up", "in_transit"])
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Rider jobs error:", error);
      res.status(500).json({ error: "Failed to fetch jobs" });
      return;
    }

    res.json({ jobs: jobs ?? [] });
  },
);

router.get(
  "/:id",
  authenticateToken,
  requireRole("admin", "rider"),
  async (req: Request, res: Response): Promise<void> => {
    const riderId = paramString(req.params.id);
    const access = await assertRiderSelfOrAdmin(req, riderId);

    if (!access.ok) {
      res.status(access.reason === "not_found" ? 404 : 403).json({
        error: access.reason === "not_found" ? "Rider not found" : "Forbidden",
      });
      return;
    }

    const { start, end } = getTodayUtcRange();

    const { data: todayShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("rider_id", riderId)
      .gte("started_at", start)
      .lte("started_at", end)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: activeShift } = await supabase
      .from("shifts")
      .select("*")
      .eq("rider_id", riderId)
      .eq("status", "active")
      .maybeSingle();

    res.json({
      rider: formatRiderResponse(access.rider as Record<string, unknown>),
      today_shift: todayShift ?? null,
      active_shift: activeShift ?? null,
    });
  },
);

export default router;
