import { Router } from "express";
import { createSampleShipment } from "../app.js";

export const routes = Router();

routes.get("/shipments/:id", (req, res) => {
  const shipment = createSampleShipment(req.params.id);
  res.json(shipment);
});
