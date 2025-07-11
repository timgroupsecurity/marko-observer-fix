// server.js
const express = require("express");
const path = require("path");

// ─── LowDB Setup ──────────────────────────────────────────────────────────────
// use the node-specific entrypoint for JSONFile in lowdb v3+
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data = db.data || { posts: [] };
  await db.write();
}
initDb();

// ─── App & Middleware ─────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── PIN CHECK (no rate-limit) ────────────────────────────────────────────────
const ADMIN_PIN = process.env.ADMIN_PIN || "4120";
const OBSERVER_PIN = process.env.OBSERVER_PIN || "5306";

app.post("/api/check-pin", (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN)    return res.json({ success: true, role: "admin" });
  if (pin === OBSERVER_PIN) return res.json({ success: true, role: "observer" });
  return res.status(401).json({ success: false, message: "Неправилан PIN." });
});

// ─── POSTS CRUD API ───────────────────────────────────────────────────────────
app.get("/api/posts", async (req, res) => {
  await db.read();
  res.json(db.data.posts);
});

app.post("/api/posts", async (req, res) => {
  const { text, img } = req.body;
  const newPost = {
    id: Date.now().toString(),
    text: text || "",
    img: img || null,
    pinned: false,
    timestamp: Date.now()
  };
  db.data.posts.unshift(newPost);
  await db.write();
  res.json(newPost);
});

app.put("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const post = db.data.posts.find(p => p.id === id);
  if (!post) return res.status(404).json({ error: "Not found" });

  Object.assign(post, req.body);
  await db.write();
  res.json(post);
});

app.delete("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  db.data.posts = db.data.posts.filter(p => p.id !== id);
  await db.write();
  res.json({ success: true });
});

// ─── FALLBACK & START ────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "posts.html"));
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
