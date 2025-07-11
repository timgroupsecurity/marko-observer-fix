// server.js
const express = require("express");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

// Constants
const DAY = 24 * 60 * 60 * 1000;  // 24h in ms
const MAX_ATTEMPTS = 3;
const ADMIN_PIN = process.env.ADMIN_PIN || "4120";
const OBSERVER_PIN = process.env.OBSERVER_PIN || "5306";

// In-memory tracking of failed attempts per IP
const failedLogins = {};

// Rate limiter for /api/check-pin
//const limiter = rateLimit({
 // windowMs: DAY,
  //max: MAX_ATTEMPTS,
  //handler: (req, res) => {
    //return res.status(429).json({
     // success: false,
     // message: "Превише неуспелих покушаја. Покушајте поново за 24 сата.",
    //  remaining: 0
   // });
 // }
//});
//app.use('/api/check-pin', limiter);

// PIN check endpoint
app.post("/api/check-pin", (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  let rec = failedLogins[ip] || { count: 0, firstTs: now };

  // reset count after 24h
  if (now - rec.firstTs > DAY) {
    rec = { count: 0, firstTs: now };
  }

  // ADMIN login
  if (req.body.pin === ADMIN_PIN) {
    delete failedLogins[ip];
    return res.json({ success: true, role: "admin" });
  }

  // OBSERVER login
  if (req.body.pin === OBSERVER_PIN) {
    delete failedLogins[ip];
    return res.json({ success: true, role: "observer" });
  }

  // Wrong PIN
  rec.count++;
  failedLogins[ip] = rec;
  const remaining = MAX_ATTEMPTS - rec.count;
  return res.status(401).json({
    success: false,
    message: `Неправилан PIN. Остава вам се ${remaining} покушаја.`,
    remaining
  });
});

// Serve static
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

