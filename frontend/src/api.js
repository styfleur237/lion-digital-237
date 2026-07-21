const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://lion-digital-237-app.onrender.com/api";

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem("lionToken");
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");
      return data;
    } catch (err) {
      if (err.message === "Failed to fetch") {
        throw new Error("Impossible de contacter le serveur.");
      }
      throw err;
    }
  },

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
  getCatalog: () => api.request("/products/catalog"),

  buyProduct: (productId) =>
    api.request("/products/buy", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),

  getActiveProducts: () => api.request("/products/active"),
  getReferralStats: () => api.request("/referrals/stats"),
  getReferrals: () => api.request("/referrals/list"),
};
// ============================================================
// DÉPÔTS
// ============================================================

/** Étape 1 : initier un dépôt */
async function deposit(amount, method, phone) {
  const res = await http.post("/wallet/deposit", { amount, method, phone });
  return res.data;
}

/** Étape 2 : confirmer avec le code de transaction SMS */
async function confirmDeposit(depositId, transactionCode) {
  const res = await http.post("/wallet/confirm-deposit", {
    depositId,
    transactionCode,
  });
  return res.data;
}

/** Récupérer l'historique des dépôts */
async function getDeposits() {
  const res = await http.get("/wallet/deposits");
  return res.data;
}

export default {
  api,
  deposit,
  confirmDeposit,
  getDeposits,
};
