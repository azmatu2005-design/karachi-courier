import cors from "cors";
import express, { type Express } from "express";
import { formatTrackingId, type Shipment } from "@karachi-courier/shared";
import { routes } from "./routes/index.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "karachi-courier-api" });
  });

  app.use("/api", routes);

  return app;
}

export function createSampleShipment(id: string): Shipment {
  const now = new Date().toISOString();
  return {
    id,
    trackingId: formatTrackingId(id),
    status: "pending",
    pickup: {
      line1: "Shop 12, Saddar",
      area: "Saddar",
      city: "Karachi",
    },
    dropoff: {
      line1: "House 45, DHA Phase 5",
      area: "DHA",
      city: "Karachi",
    },
    createdAt: now,
    updatedAt: now,
  };
}
