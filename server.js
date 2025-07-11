import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

// __dirname shim
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, "firebase-service-account.json"); // <- replace with your actual filename

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error("Firebase service account JSON not found! Place your key file in the root folder.");
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Express app
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// PINs
const ADMIN_PIN = process.env.ADMIN_PIN || "4120";
const OBSERVER_PIN = process.env.OBSERVER_PIN || "5306";

// Check PIN
app.post("/api/check-pin", (req, res) => {
  const { pin } = req.body;
  if (pin === ADMIN_PIN) return res.json({ success: true, role: "admin" });
  if (pin === OBSERVER_PIN) return res.json({ success: true, role: "observer" });
  res.status(401).json({ success: false, message: "Неправилан PIN." });
});

// Get posts
app.get("/api/posts", async (req, res) => {
  try {
    const postsRef = db.collection("posts");
    const snapshot = await postsRef.orderBy("timestamp", "desc").get();

    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Create post
app.post("/api/posts", async (req, res) => {
  try {
    const { text = "", img = null } = req.body;
    const newPost = {
      text,
      img,
      pinned: false,
      timestamp: Date.now(),
    };

    const docRef = await db.collection("posts").add(newPost);

    res.json({ id: docRef.id, ...newPost });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// Update post
app.put("/api/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const postRef = db.collection("posts").doc(postId);
    const doc = await postRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Post not found" });
    }

    await postRef.update(req.body);
    const updatedDoc = await postRef.get();

    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// Delete post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    await db.collection("posts").doc(postId).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// Fallback to posts.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "posts.html"));
});

// Start server
const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running on port ${PORT}`)
);
