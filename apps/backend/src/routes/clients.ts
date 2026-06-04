import { Router, type Request, type Response } from "express";
import { supabase } from "../db/index.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

router.get(
  "/me",
  authenticateToken,
  requireRole("client"),
  async (req: Request, res: Response): Promise<void> => {
    const { data: client, error } = await supabase
      .from("clients")
      .select("id, business_name, address, area, city")
      .eq("user_id", req.user!.id)
      .single();

    if (error || !client) {
      console.error("Client profile lookup error:", error);
      res.status(404).json({ error: "Client profile not found" });
      return;
    }

    res.json({ client });
  },
);

export default router;
