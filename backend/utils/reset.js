const resetDaily = (db) => {
  try {
    const users = db.prepare("SELECT id, username, role FROM users").all();
    let resetCount = 0;
    let earningsCount = 0;

    const PRODUCTS = [
      { id: "starter", daily: 250 },
      { id: "bronze", daily: 550 },
      { id: "argent", daily: 1450 },
      { id: "or", daily: 3100 },
      { id: "platine", daily: 6800 },
    ];

    const now = new Date();

    for (const user of users) {
      if (user.role === "admin") continue;

      // Réduire daysLeft et créditer les rendements
      const activeProducts = db
        .prepare("SELECT * FROM active_products WHERE userId = ?")
        .all(user.id);
      let dailyEarnings = 0;

      for (const ap of activeProducts) {
        const product = PRODUCTS.find((p) => p.id === ap.productId);
        if (product) dailyEarnings += product.daily;

        if (ap.daysLeft <= 1) {
          db.prepare("DELETE FROM active_products WHERE id = ?").run(ap.id);
        } else {
          db.prepare(
            "UPDATE active_products SET daysLeft = daysLeft - 1 WHERE id = ?",
          ).run(ap.id);
        }
      }

      if (dailyEarnings > 0) {
        db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(
          dailyEarnings,
          user.id,
        );
        earningsCount++;
      }

      // Reset complet si dernier reset > 24h
      const lastReset = db
        .prepare("SELECT lastReset FROM users WHERE id = ?")
        .get(user.id);
      if (lastReset && lastReset.lastReset) {
        const lastDate = new Date(lastReset.lastReset);
        const diffHours = Math.abs(now - lastDate) / 36e5;
        if (diffHours >= 24) {
          db.prepare("UPDATE users SET balance = 0 WHERE id = ?").run(user.id);
          db.prepare("DELETE FROM active_products WHERE userId = ?").run(
            user.id,
          );
          db.prepare("UPDATE users SET lastReset = ? WHERE id = ?").run(
            now.toISOString(),
            user.id,
          );
          resetCount++;
        }
      }
    }

    console.log(
      `[Reset] ${resetCount} comptes réinitialisés, ${earningsCount} comptes crédités des rendements.`,
    );
  } catch (err) {
    console.error("[Reset] Erreur:", err);
  }
};

module.exports = { resetDaily };
