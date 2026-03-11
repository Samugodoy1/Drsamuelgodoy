import pool from "./db";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { email, password } = req.body;

  try {

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND password=$2",
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário inválido" });
    }

    res.json(result.rows[0]);

  } catch (err) {

    res.status(500).json({ error: "Erro no servidor" });

  }

}
