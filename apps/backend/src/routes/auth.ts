import bcrypt from "bcryptjs";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { supabase } from "../db/index.js";
import { authenticateToken } from "../middleware/auth.js";

interface UserRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  password_hash: string;
  role: string;
}

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

function toPublicUser(user: UserRow) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
  };
}

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { phone, password } = req.body as {
    phone?: string;
    password?: string;
  };

  if (!phone || !password) {
    res.status(400).json({ error: "phone and password are required" });
    return;
  }

  try {
    console.log("Login attempt:", { phone, password });

    const { data: allUsers, error: allUsersError } = await supabase
      .from("users")
      .select("id, phone");

    if (allUsersError) {
      console.error("All users query error:", allUsersError);
    } else {
      console.log("Total users in DB:", allUsers?.length ?? 0);
      console.log("All phones:", allUsers?.map((r) => r.phone) ?? []);
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();

    console.log("Query result rows:", user ? 1 : 0);

    if (error || !user) {
      console.log("No user found for phone:", phone);
      res.status(401).json({ error: "Invalid phone or password" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid phone or password" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone },
      getJwtSecret(),
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: toPublicUser(user as UserRow),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const { name, phone, email, password, role } = req.body as {
    name?: string;
    phone?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  if (!name || !phone || !password) {
    res.status(400).json({ error: "name, phone, and password are required" });
    return;
  }

  const userRole = role ?? "client";
  if (!["client", "rider", "admin"].includes(userRole)) {
    res.status(400).json({ error: "role must be client, rider, or admin" });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        name,
        phone,
        email: email ?? null,
        password_hash: passwordHash,
        role: userRole,
      })
      .select("id, name, phone, email, password_hash, role")
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Phone or email already registered" });
        return;
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone },
      getJwtSecret(),
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      user: toPublicUser(user as UserRow),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post(
  "/me",
  authenticateToken,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, phone, email, role")
        .eq("id", req.user!.id)
        .single();

      if (error || !user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const publicUser = toPublicUser(user as UserRow);

      if (publicUser.role === "client") {
        const { data: client } = await supabase
          .from("clients")
          .select("id, business_name, address, area, city")
          .eq("user_id", publicUser.id)
          .single();

        res.json({ user: publicUser, client: client ?? null });
        return;
      }

      res.json({ user: publicUser });
    } catch (err) {
      console.error("Me error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
