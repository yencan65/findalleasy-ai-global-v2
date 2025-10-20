
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: (origin, cb) => cb(null, true) }));
app.use(morgan("tiny"));
app.use(express.json({ limit: "2mb" }));

// Static
app.use(express.static(path.join(__dirname, "..", "public")));

// Basic rate limit
app.use("/api/", rateLimit({ windowMs: 60 * 1000, limit: 120 }));

// Language detect via Accept-Language
app.get("/api/detect-lang", (req, res) => {
  const accept = req.headers["accept-language"] || "";
  res.json({ acceptLanguage: accept });
});

// Basic search API stub - Here is where you'd fan out to feeds or your AI ranker
app.post("/api/search", async (req, res) => {
  const { query, locale } = req.body || {};
  // Return demo results for now (frontend renders nicely)
  const mock = [
    { title: "iPhone 15 Pro 128GB", price: 1299.90, currency: "USD", merchant: "Amazon", url:"#", img:"/img/demo-iphone.jpg", country:"US" },
    { title: "iPhone 15 Pro 128GB", price: 42399.00, currency: "TRY", merchant: "Hepsiburada", url:"#", img:"/img/demo-iphone.jpg", country:"TR" },
    { title: "iPhone 15 Pro 256GB", price: 1399.90, currency: "USD", merchant: "BestBuy", url:"#", img:"/img/demo-iphone.jpg", country:"US" }
  ];
  res.json({ ok:true, query, locale, results: mock });
});

// Image search endpoint (placeholder). In production, send image to your vision API.
const upload = multer({ storage: multer.memoryStorage() });
app.post("/api/image-search", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false, error:"no-file" });
  // For demo we just echo back size
  res.json({ ok:true, bytes: req.file.size, note: "Integrate with vision API (e.g., Google Vision, AWS Rekognition)." });
});

// Health
app.get("/healthz", (_, res) => res.json({ ok:true }));

app.listen(PORT, () => {
  console.log(`FindAllEasy AI Server running on port ${PORT}`);
});
