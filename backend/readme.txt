/* ------------------------------- GET rate ------------------------------- */
router.get("/rate", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT unit_price, currency, updated_at FROM coin_rate WHERE id = 1");
    const r = rows[0];
    res.json({ unit_price: Number(r?.unit_price || 0), currency: r?.currency || "NGN", updated_at: r?.updated_at });
  } catch (err) {
    console.error("get rate error:", err);
    res.status(500).json({ message: "Error fetching rate" });
  }
});


use this above unit price is a value so i need a route a return router for users to be able to return items 