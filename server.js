// server.js
import express from "express";
import path, { resolve } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// ─── __dirname shim ───────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Ensure db.json exists ────────────────────────────────────────────────────
const dbFile = path.join(__dirname, "db.json");
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify({ posts: [] }, null, 2));
}

// ─── LowDB Setup ──────────────────────────────────────────────────────────────
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { posts: [] });

await db.read();
await db.write();

// ─── App & Middleware ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// ─── PIN CHECK ────────────────────────────────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || "4120";
const OBSERVER_PIN = process.env.OBSERVER_PIN || "5306";

app.post("/api/check-pin", (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) return res.json({ success: true, role: "admin" });
  if (pin === OBSERVER_PIN) return res.json({ success: true, role: "observer" });
  return res.status(401).json({ success: false, message: "Неправилан PIN." });
});

// ─── POSTS CRUD API ───────────────────────────────────────────────────────────
app.get("/api/posts", async (req, res) => {
  await db.read();
  res.json(db.data.posts);
});

app.post("/api/posts", async (req, res) => {
  const { text = "", img = null } = req.body;
  const newPost = {
    id: Date.now().toString(),
    text,
    img,
    pinned: false,
    timestamp: Date.now()
  };
  db.data.posts.unshift(newPost);
  await db.write();
  res.json(newPost);
});

app.put("/api/posts/:id", async (req, res) => {
  await db.read();
  const post = db.data.posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  Object.assign(post, req.body);
  await db.write();
  res.json(post);
});

app.delete("/api/posts/:id", async (req, res) => {
  await db.read();
  db.data.posts = db.data.posts.filter((p) => p.id !== req.params.id);
  await db.write();
  res.json({ success: true });
});

// ─── SAFER FALLBACK ROUTE ─────────────────────────────────────────────────────
app.get("*", (req, res) => {
  const htmlPath = resolve(__dirname, "posts.html");
  res.sendFile(htmlPath, (err) => {
    if (err) {
      console.error("❌ Failed to send posts.html:", err.message);
      res.status(500).send("posts.html missing or cannot be loaded.");
    }
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running on port ${PORT}`)
);
