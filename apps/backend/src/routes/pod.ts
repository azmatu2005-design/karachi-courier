import { Router, type Request, type Response } from "express";
import { supabase } from "../db/index.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

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

async function getRiderIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("riders")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id ?? null;
}

async function getClientIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id ?? null;
}

async function getShipmentById(shipmentId: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (error || !data) {
    return null;
  }
  return data;
}

async function canAccessShipment(
  req: Request,
  shipment: {
    client_id: string;
    rider_id: string | null;
  },
): Promise<boolean> {
  if (req.user!.role === "admin") {
    return true;
  }

  if (req.user!.role === "client") {
    const clientId = await getClientIdForUser(req.user!.id);
    return clientId === shipment.client_id;
  }

  if (req.user!.role === "rider") {
    const riderId = await getRiderIdForUser(req.user!.id);
    return riderId !== null && shipment.rider_id === riderId;
  }

  return false;
}

async function insertStatusLog(
  shipmentId: string,
  status: string,
  changedBy: string,
  note?: string,
): Promise<void> {
  await supabase.from("shipment_status_log").insert({
    shipment_id: shipmentId,
    status,
    changed_by: changedBy,
    note: note ?? null,
  });
}

// ---------------------------------------------------------------------------
// Proof of delivery routes → /api/pod
// ---------------------------------------------------------------------------

export const podRouter = Router();

podRouter.post(
  "/:shipmentId",
  authenticateToken,
  requireRole("rider"),
  async (req: Request, res: Response): Promise<void> => {
    const shipmentId = paramString(req.params.shipmentId);
    const { photo_url, signature_url, delivery_lat, delivery_lng, notes } =
      req.body as {
        photo_url?: string;
        signature_url?: string;
        delivery_lat?: number;
        delivery_lng?: number;
        notes?: string;
      };

    if (!photo_url) {
      res.status(400).json({ error: "photo_url is required" });
      return;
    }

    const shipment = await getShipmentById(shipmentId);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    const riderId = await getRiderIdForUser(req.user!.id);
    if (!riderId || shipment.rider_id !== riderId) {
      res.status(403).json({ error: "Shipment not assigned to this rider" });
      return;
    }

    const { data: existingPod } = await supabase
      .from("proof_of_delivery")
      .select("id")
      .eq("shipment_id", shipmentId)
      .maybeSingle();

    if (existingPod) {
      res.status(409).json({ error: "Proof of delivery already exists" });
      return;
    }

    const { data: pod, error: podError } = await supabase
      .from("proof_of_delivery")
      .insert({
        shipment_id: shipmentId,
        photo_url,
        signature_url: signature_url ?? null,
        delivery_lat: delivery_lat ?? null,
        delivery_lng: delivery_lng ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (podError || !pod) {
      console.error("Create POD error:", podError);
      res.status(500).json({ error: "Failed to create proof of delivery" });
      return;
    }

    const { error: statusError } = await supabase
      .from("shipments")
      .update({ status: "delivered" })
      .eq("id", shipmentId);

    if (statusError) {
      console.error("Update shipment delivered error:", statusError);
    }

    await insertStatusLog(
      shipmentId,
      "delivered",
      req.user!.id,
      "Proof of delivery submitted",
    );

    const isCod =
      shipment.payment_method === "cod" &&
      shipment.cod_amount != null &&
      Number(shipment.cod_amount) > 0;

    if (isCod && shipment.rider_id) {
      const { error: codError } = await supabase.from("cod_ledger").insert({
        rider_id: shipment.rider_id,
        shipment_id: shipmentId,
        amount: shipment.cod_amount,
        reconciled: false,
      });

      if (codError && codError.code !== "23505") {
        console.error("COD ledger insert error:", codError);
      }
    }

    res.status(201).json({ proof_of_delivery: pod });
  },
);

podRouter.get(
  "/:shipmentId",
  authenticateToken,
  requireRole("admin", "client", "rider"),
  async (req: Request, res: Response): Promise<void> => {
    const shipmentId = paramString(req.params.shipmentId);

    const shipment = await getShipmentById(shipmentId);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    const allowed = await canAccessShipment(req, shipment);
    if (!allowed) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { data: pod, error } = await supabase
      .from("proof_of_delivery")
      .select("*")
      .eq("shipment_id", shipmentId)
      .maybeSingle();

    if (error) {
      console.error("Get POD error:", error);
      res.status(500).json({ error: "Failed to fetch proof of delivery" });
      return;
    }

    if (!pod) {
      res.status(404).json({ error: "Proof of delivery not found" });
      return;
    }

    res.json({
      proof_of_delivery: pod,
      tracking_number: shipment.tracking_number,
      recipient_name: shipment.recipient_name,
    });
  },
);

// ---------------------------------------------------------------------------
// COD ledger routes → /api/cod
// ---------------------------------------------------------------------------

export const codRouter = Router();

codRouter.get(
  "/ledger",
  authenticateToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const { rider_id, reconciled, date } = req.query as {
      rider_id?: string;
      reconciled?: string;
      date?: string;
    };

    let query = supabase
      .from("cod_ledger")
      .select(
        `
          *,
          rider:riders(
            id,
            user:users(name)
          ),
          shipment:shipments(tracking_number, recipient_name)
        `,
      )
      .order("collected_at", { ascending: false });

    if (rider_id) {
      query = query.eq("rider_id", rider_id);
    }

    if (reconciled === "true" || reconciled === "false") {
      query = query.eq("reconciled", reconciled === "true");
    }

    if (date) {
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;
      query = query.gte("collected_at", start).lte("collected_at", end);
    }

    const { data, error } = await query;

    if (error) {
      console.error("COD ledger list error:", error);
      res.status(500).json({ error: "Failed to fetch COD ledger" });
      return;
    }

    const entries = (data ?? []).map((row) => {
      const entry = row as Record<string, unknown>;
      const rider = entry.rider as { user?: { name?: string } } | null;
      const shipment = entry.shipment as
        | { tracking_number?: string; recipient_name?: string }
        | null;

      const { rider: _r, shipment: _s, ...rest } = entry;
      return {
        ...rest,
        rider_name: rider?.user?.name ?? null,
        tracking_number: shipment?.tracking_number ?? null,
        recipient_name: shipment?.recipient_name ?? null,
      };
    });

    res.json({ entries });
  },
);

codRouter.patch(
  "/:id/reconcile",
  authenticateToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramString(req.params.id);

    const { data: updated, error } = await supabase
      .from("cod_ledger")
      .update({
        reconciled: true,
        reconciled_at: new Date().toISOString(),
        reconciled_by: req.user!.id,
      })
      .eq("id", id)
      .select(
        `
          *,
          rider:riders(user:users(name)),
          shipment:shipments(tracking_number)
        `,
      )
      .single();

    if (error || !updated) {
      res.status(404).json({ error: "COD entry not found" });
      return;
    }

    const row = updated as Record<string, unknown>;
    const rider = row.rider as { user?: { name?: string } } | null;
    const shipment = row.shipment as { tracking_number?: string } | null;

    res.json({
      entry: {
        ...row,
        rider_name: rider?.user?.name ?? null,
        tracking_number: shipment?.tracking_number ?? null,
      },
    });
  },
);

codRouter.get(
  "/client",
  authenticateToken,
  requireRole("client"),
  async (req: Request, res: Response): Promise<void> => {
    const clientId = await getClientIdForUser(req.user!.id);
    if (!clientId) {
      res.status(403).json({ error: "Client profile not found" });
      return;
    }

    const { data: shipments, error: shipError } = await supabase
      .from("shipments")
      .select("id")
      .eq("client_id", clientId);

    if (shipError) {
      res.status(500).json({ error: "Failed to fetch shipments" });
      return;
    }

    const shipmentIds = (shipments ?? []).map((s) => s.id);
    if (shipmentIds.length === 0) {
      res.json({
        entries: [],
        total_reconciled: 0,
        total_unreconciled: 0,
        unreconciled_count: 0,
        reconciled_count: 0,
      });
      return;
    }

    const { data: ledger, error: ledgerError } = await supabase
      .from("cod_ledger")
      .select(
        `
          *,
          shipment:shipments(tracking_number, recipient_name)
        `,
      )
      .in("shipment_id", shipmentIds)
      .order("collected_at", { ascending: false });

    if (ledgerError) {
      res.status(500).json({ error: "Failed to fetch COD ledger" });
      return;
    }

    let totalReconciled = 0;
    let totalUnreconciled = 0;
    let unreconciledCount = 0;
    let reconciledCount = 0;

    const entries = (ledger ?? []).map((row) => {
      const entry = row as Record<string, unknown>;
      const shipment = entry.shipment as
        | { tracking_number?: string; recipient_name?: string }
        | null;
      const amount = Number(entry.amount ?? 0);
      const reconciled = Boolean(entry.reconciled);

      if (reconciled) {
        totalReconciled += amount;
        reconciledCount += 1;
      } else {
        totalUnreconciled += amount;
        unreconciledCount += 1;
      }

      const { shipment: _s, ...rest } = entry;
      return {
        ...rest,
        tracking_number: shipment?.tracking_number ?? null,
        recipient_name: shipment?.recipient_name ?? null,
      };
    });

    res.json({
      entries,
      total_reconciled: totalReconciled,
      total_unreconciled: totalUnreconciled,
      unreconciled_count: unreconciledCount,
      reconciled_count: reconciledCount,
    });
  },
);

codRouter.get(
  "/summary",
  authenticateToken,
  requireRole("admin"),
  async (_req: Request, res: Response): Promise<void> => {
    const { start, end } = getTodayUtcRange();

    const { data: riders, error: ridersError } = await supabase
      .from("riders")
      .select(
        `
          id,
          user:users(name)
        `,
      );

    if (ridersError) {
      console.error("COD summary riders error:", ridersError);
      res.status(500).json({ error: "Failed to fetch rider summary" });
      return;
    }

    const { data: ledger, error: ledgerError } = await supabase
      .from("cod_ledger")
      .select("rider_id, amount, collected_at, reconciled");

    if (ledgerError) {
      console.error("COD summary ledger error:", ledgerError);
      res.status(500).json({ error: "Failed to fetch COD data" });
      return;
    }

    const summary = (riders ?? []).map((rider) => {
      const riderRow = rider as Record<string, unknown>;
      const riderId = riderRow.id as string;
      const user = riderRow.user as { name?: string } | null | undefined;
      const riderEntries = (ledger ?? []).filter((e) => e.rider_id === riderId);

      let totalCollectedToday = 0;
      let totalUnreconciled = 0;
      let unreconciledCount = 0;

      for (const entry of riderEntries) {
        const amount = Number(entry.amount ?? 0);
        if (entry.collected_at >= start && entry.collected_at <= end) {
          totalCollectedToday += amount;
        }
        if (!entry.reconciled) {
          totalUnreconciled += amount;
          unreconciledCount += 1;
        }
      }

      return {
        rider_id: riderId,
        rider_name: user?.name ?? null,
        total_collected_today: totalCollectedToday,
        total_unreconciled_amount: totalUnreconciled,
        unreconciled_deliveries_count: unreconciledCount,
      };
    });

    res.json({ summary });
  },
);
