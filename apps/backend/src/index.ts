import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env") });

const { default: cors } = await import("cors");
const { default: express } = await import("express");
const { testConnection } = await import("./db/index.js");
const { default: authRoutes } = await import("./routes/auth.js");
const { default: clientRoutes } = await import("./routes/clients.js");
const { default: shipmentRoutes } = await import("./routes/shipments.js");
const { default: riderRoutes } = await import("./routes/riders.js");
const { podRouter, codRouter } = await import("./routes/pod.js");

const PORT = Number(process.env.PORT) || 4000;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/api/auth", authRoutes);
console.log("Auth routes registered");

app.use("/api/clients", clientRoutes);
console.log("Client routes registered");

app.use("/api/shipments", shipmentRoutes);
console.log("Shipment routes registered");

app.use("/api/riders", riderRoutes);
console.log("Rider routes registered");

app.use("/api/pod", podRouter);
console.log("POD routes registered");

app.use("/api/cod", codRouter);
console.log("COD routes registered");

async function start(): Promise<void> {
  try {
    await testConnection();
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Karachi Courier API listening on http://localhost:${PORT}`);
  });
}

start();
