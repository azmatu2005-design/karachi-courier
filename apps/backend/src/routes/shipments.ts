import { Router, type Request, type Response } from "express";
import { supabase } from "../db/index.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const SHIPMENT_STATUSES = [
  "pending",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
] as const;

const PAYMENT_METHODS = ["cod", "jazzcash", "easypaisa", "prepaid"] as const;

type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const router = Router();

function paramString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

function generateTrackingNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KHI-${suffix}`;
}

async function resolveClientId(
  userId: string,
  role: string,
  bodyClientId?: string,
): Promise<{ clientId: string | null; error?: string }> {
  if (role === "client") {
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { clientId: null, error: "Client profile not found for this user" };
    }
    return { clientId: data.id };
  }

  if (role === "admin") {
    if (!bodyClientId) {
      return { clientId: null, error: "client_id is required for admin" };
    }
    return { clientId: bodyClientId };
  }

  return { clientId: null, error: "Forbidden" };
}

async function getRiderIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("riders")
    .select("id")
    .eq("user_id", userId)
    .single();

  return data?.id ?? null;
}

function mapShipmentWithRiderName(shipment: Record<string, unknown>) {
  const rider = shipment.rider as
    | { user?: { name?: string } }
    | null
    | undefined;
  const client = shipment.client as
    | { business_name?: string }
    | null
    | undefined;

  const { rider: _rider, client: _client, ...rest } = shipment;
  return {
    ...rest,
    rider_name: rider?.user?.name ?? null,
    client_name: client?.business_name ?? null,
  };
}

async function insertStatusLog(
  shipmentId: string,
  status: ShipmentStatus,
  changedBy: string | null,
  note?: string,
): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from("shipment_status_log").insert({
    shipment_id: shipmentId,
    status,
    changed_by: changedBy,
    note: note ?? null,
  });

  return { error };
}

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "client"),
  async (req: Request, res: Response): Promise<void> => {
    const {
      client_id: bodyClientId,
      pickup_address,
      pickup_lat,
      pickup_lng,
      pickup_area,
      delivery_address,
      delivery_lat,
      delivery_lng,
      delivery_area,
      recipient_name,
      recipient_phone,
      payment_method,
      cod_amount,
      weight_kg,
      notes,
    } = req.body as Record<string, unknown>;

    if (
      !pickup_address ||
      !pickup_area ||
      !delivery_address ||
      !delivery_area ||
      !recipient_name ||
      !recipient_phone ||
      !payment_method
    ) {
      res.status(400).json({
        error:
          "pickup_address, pickup_area, delivery_address, delivery_area, recipient_name, recipient_phone, and payment_method are required",
      });
      return;
    }

    if (!PAYMENT_METHODS.includes(payment_method as PaymentMethod)) {
      res.status(400).json({ error: "Invalid payment_method" });
      return;
    }

    const { clientId, error: clientError } = await resolveClientId(
      req.user!.id,
      req.user!.role,
      bodyClientId as string | undefined,
    );

    if (!clientId) {
      res.status(clientError?.includes("required") ? 400 : 403).json({
        error: clientError ?? "Forbidden",
      });
      return;
    }

    let createdShipment = null;
    let lastError: { message: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const tracking_number = generateTrackingNumber();

      const { data, error } = await supabase
        .from("shipments")
        .insert({
          tracking_number,
          client_id: clientId,
          pickup_address,
          pickup_lat: pickup_lat ?? null,
          pickup_lng: pickup_lng ?? null,
          pickup_area,
          delivery_address,
          delivery_lat: delivery_lat ?? null,
          delivery_lng: delivery_lng ?? null,
          delivery_area,
          recipient_name,
          recipient_phone,
          payment_method,
          cod_amount: cod_amount ?? null,
          weight_kg: weight_kg ?? 0.5,
          notes: notes ?? null,
          status: "pending",
        })
        .select()
        .single();

      if (!error && data) {
        createdShipment = data;
        break;
      }

      lastError = error;
      if (error?.code !== "23505") {
        break;
      }
    }

    if (!createdShipment) {
      console.error("Create shipment error:", lastError);
      res.status(500).json({ error: "Failed to create shipment" });
      return;
    }

    const { error: logError } = await insertStatusLog(
      createdShipment.id,
      "pending",
      req.user!.id,
      "Shipment created",
    );

    if (logError) {
      console.error("Status log error:", logError);
    }

    res.status(201).json({ shipment: createdShipment });
  },
);

router.get(
  "/",
  authenticateToken,
  requireRole("admin", "client"),
  async (req: Request, res: Response): Promise<void> => {
    const { status, area, date, rider_id } = req.query as {
      status?: string;
      area?: string;
      date?: string;
      rider_id?: string;
    };

    let query = supabase.from("shipments").select(
      `
        *,
        rider:riders(
          id,
          user:users(name)
        ),
        client:clients(business_name)
      `,
    );

    if (req.user!.role === "client") {
      const { clientId, error: clientError } = await resolveClientId(
        req.user!.id,
        "client",
      );

      if (!clientId) {
        res.status(403).json({ error: clientError ?? "Forbidden" });
        return;
      }

      query = query.eq("client_id", clientId);
    }

    if (status) {
      if (!SHIPMENT_STATUSES.includes(status as ShipmentStatus)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      query = query.eq("status", status);
    }

    if (area) {
      query = query.or(`pickup_area.eq.${area},delivery_area.eq.${area}`);
    }

    if (date) {
      const start = `${date}T00:00:00.000Z`;
      const end = `${date}T23:59:59.999Z`;
      query = query.gte("created_at", start).lte("created_at", end);
    }

    if (rider_id && req.user!.role === "admin") {
      query = query.eq("rider_id", rider_id);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("List shipments error:", error);
      res.status(500).json({ error: "Failed to fetch shipments" });
      return;
    }

    res.json({
      shipments: (data ?? []).map((row) =>
        mapShipmentWithRiderName(row as Record<string, unknown>),
      ),
    });
  },
);

router.get(
  "/detail/:id",
  authenticateToken,
  requireRole("admin", "client"),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramString(req.params.id);

    const { data: shipment, error } = await supabase
      .from("shipments")
      .select(
        `
          *,
          rider:riders(id, user:users(name)),
          client:clients(business_name, address, area, city)
        `,
      )
      .eq("id", id)
      .single();

    if (error || !shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    if (req.user!.role === "client") {
      const { clientId, error: clientError } = await resolveClientId(
        req.user!.id,
        "client",
      );
      if (!clientId) {
        res.status(403).json({ error: clientError ?? "Forbidden" });
        return;
      }
      if ((shipment as { client_id: string }).client_id !== clientId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    const row = shipment as Record<string, unknown>;
    const client = row.client as
      | {
          business_name?: string;
          address?: string;
          area?: string;
          city?: string;
        }
      | null;

    res.json({
      shipment: {
        ...mapShipmentWithRiderName(row),
        client_address: client?.address ?? null,
        client_area: client?.area ?? null,
        client_city: client?.city ?? null,
      },
    });
  },
);

router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("admin", "rider"),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramString(req.params.id);
    const { status, note } = req.body as { status?: string; note?: string };

    if (!status || !SHIPMENT_STATUSES.includes(status as ShipmentStatus)) {
      res.status(400).json({ error: "Valid status is required" });
      return;
    }

    const { data: shipment, error: fetchError } = await supabase
      .from("shipments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    if (req.user!.role === "rider") {
      const riderId = await getRiderIdForUser(req.user!.id);
      if (!riderId || shipment.rider_id !== riderId) {
        res.status(403).json({ error: "Not assigned to this shipment" });
        return;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from("shipments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Update status error:", updateError);
      res.status(500).json({ error: "Failed to update shipment status" });
      return;
    }

    await insertStatusLog(
      id,
      status as ShipmentStatus,
      req.user!.id,
      note,
    );

    if (status === "delivered") {
      const isCod =
        shipment.payment_method === "cod" &&
        shipment.cod_amount != null &&
        Number(shipment.cod_amount) > 0;

      if (isCod && shipment.rider_id) {
        const { error: codError } = await supabase.from("cod_ledger").insert({
          rider_id: shipment.rider_id,
          shipment_id: id,
          amount: shipment.cod_amount,
        });

        if (codError && codError.code !== "23505") {
          console.error("COD ledger error:", codError);
        }
      }
    }

    res.json({ shipment: updated });
  },
);

router.patch(
  "/:id/assign",
  authenticateToken,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const id = paramString(req.params.id);
    const { rider_id } = req.body as { rider_id?: string };

    if (!rider_id) {
      res.status(400).json({ error: "rider_id is required" });
      return;
    }

    const { data: rider, error: riderError } = await supabase
      .from("riders")
      .select("id")
      .eq("id", rider_id)
      .single();

    if (riderError || !rider) {
      res.status(404).json({ error: "Rider not found" });
      return;
    }

    const { data: updated, error: updateError } = await supabase
      .from("shipments")
      .update({ rider_id, status: "assigned" })
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error("Assign rider error:", updateError);
      res.status(500).json({ error: "Failed to assign rider" });
      return;
    }

    await insertStatusLog(id, "assigned", req.user!.id, "Rider assigned");

    res.json({ shipment: updated });
  },
);

router.get(
  "/:trackingNumber",
  async (req: Request, res: Response): Promise<void> => {
    const trackingNumber = paramString(req.params.trackingNumber);

    const { data: shipment, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber.toUpperCase())
      .single();

    if (shipmentError || !shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }

    const { data: statusHistory } = await supabase
      .from("shipment_status_log")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: true });

    const { data: proofOfDelivery } = await supabase
      .from("proof_of_delivery")
      .select("*")
      .eq("shipment_id", shipment.id)
      .maybeSingle();

    res.json({
      shipment,
      status_history: statusHistory ?? [],
      proof_of_delivery: proofOfDelivery ?? null,
    });
  },
);

export default router;
