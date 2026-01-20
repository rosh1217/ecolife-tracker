import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

/* 🔑 Use environment variable for OpenAI API key */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY not set in environment variables!");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* DATABASE */
const db = new sqlite3.Database("database.db");
db.run(`
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    carbon REAL,
    water REAL,
    energy REAL,
    score REAL,
    date TEXT
  )
`);

/* SAVE USER DATA */
app.post("/save", (req, res) => {
  const { email, carbon, water, energy, score } = req.body;
  db.run(
    `INSERT INTO history VALUES (NULL,?,?,?,?,datetime('now'))`,
    [email, carbon, water, energy, score],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ status: "saved" });
    }
  );
});

/* GET USER HISTORY */
app.get("/history/:email", (req, res) => {
  db.all(
    `SELECT * FROM history WHERE email=? ORDER BY date`,
    [req.params.email],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

/* AI CHAT */
app.post("/ai", async (req, res) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an eco-friendly assistant." },
        { role: "user", content: req.body.message }
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
