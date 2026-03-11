import pool from "./db";

export default async function handler(req, res) {

  if (req.method === "GET") {

    const result = await pool.query(
      "SELECT * FROM patients ORDER BY id DESC"
    );

    return res.json(result.rows);

  }

  if (req.method === "POST") {

    const { name, phone, email } = req.body;

    const result = await pool.query(
      "INSERT INTO patients (name, phone, email) VALUES ($1,$2,$3) RETURNING *",
      [name, phone, email]
    );

    return res.json(result.rows[0]);

  }

  return res.status(405).json({ error: "Método não permitido" });

}
