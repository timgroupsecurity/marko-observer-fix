// server.js
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// Environment-configured PINs (defaults kept for local dev)
const ADMIN_PIN = process.env.ADMIN_PIN || "4120";
const OBSERVER_PIN = process.env.OBSERVER_PIN || "5306";

// PIN check endpoint (no tracking or rate-limit)
app.post("/api/check-pin", (req, res) => {
  const { pin } = req.body;

  if (pin === ADMIN_PIN) {
    return res.json({ success: true, role: "admin" });
  }

  if (pin === OBSERVER_PIN) {
    return res.json({ success: true, role: "observer" });
  }

  return res.status(401).json({
    success: false,
    message: "Неправилан PIN."
  });
});

// Serve static files (your HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
