const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://lion-digital-237-app.onrender.com/api";

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("lionToken");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      clearTimeout(timeout);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");
      return data;
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("Le serveur met trop de temps à répondre. Réessaie.");
      }
      if (err.message === "Failed to fetch") {
        throw new Error("Impossible de contacter le serveur.");
      }
      throw err;
    }
  },

  /* ===== AUTH ===== */
  register: (username, phone, password, referralCode) =>
    api.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, phone, password, referralCode }),
    }),

  login: (username, password) =>
    api.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getProfile: () => api.request("/auth/profile"),

  /* ===== WALLET ===== */
  getBalance: () => api.request("/wallet/balance"),

  deposit: (amount, method, phone) =>
    api.request("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ amount, method, phone }),
    }),

  confirmDeposit: (depositId, transactionCode) =>
    api.request("/wallet/confirm-deposit", {
      method: "POST",
      body: JSON.stringify({ depositId, transactionCode }),
    }),

  withdraw: (amount, method, phone) =>
    api.request("/wallet/withdraw", {
      method: "POST",
      body: JSON.stringify({ amount, method, phone }),
    }),

  getHistory: () => api.request("/wallet/history"),

  /* ===== PRODUCTS ===== */
  getCatalog: () => api.request("/products/catalog"),
  buyProduct: (productId) =>
    api.request("/products/buy", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  getActiveProducts: () => api.request("/products/active"),

  /* ===== PARRAINAGE ===== */
  getReferralStats: () => api.request("/referrals/stats"),
  getReferrals: () => api.request("/referrals/list"),

  /* ===== ADMIN ===== */
  adminStats: async () => {
    const [statsRes, usersRes] = await Promise.all([
      api.request("/admin/stats"),
      api.request("/admin/users"),
    ]);
    return { stats: statsRes, users: usersRes.users || [] };
  },

  adminAction: (userId, action) =>
    api.request("/admin/action", {
      method: "POST",
      body: JSON.stringify({ userId, action }),
    }),

  // NOUVEAU : confirmer / refuser un dépôt depuis l'espace admin
  adminApproveDeposit: (depositId) =>
    api.request("/admin/deposits/approve", {
      method: "POST",
      body: JSON.stringify({ depositId }),
    }),

  adminRejectDeposit: (depositId) =>
    api.request("/admin/deposits/reject", {
      method: "POST",
      body: JSON.stringify({ depositId }),
    }),
};

export default api;
