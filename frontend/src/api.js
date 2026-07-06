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

  deposit: (amount, method) =>
    api.request("/wallet/deposit", {
      method: "POST",
      body: JSON.stringify({ amount, method }),
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
};

export default api;
