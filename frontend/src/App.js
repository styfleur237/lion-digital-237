import React, { useState, useCallback, useEffect } from "react";
import {
  Home,
  Package,
  Wallet,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  Bell,
  MessageCircle,
  Mail,
  Phone,
  Settings,
  LogOut,
  Gift,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck,
  ChevronDown,
  X,
  Megaphone,
  CircleDollarSign,
  Smartphone,
  Crown,
  Award,
  Star,
  Sparkles,
} from "lucide-react";
import api from "./api";

/* ============================================================
   DESIGN TOKENS — Lion Digital 237
   ============================================================ */
const T = {
  green: "#0A8F3D",
  greenDark: "#076B2E",
  greenSoft: "#E6F4EA",
  gold: "#D4AF37",
  goldSoft: "#FBF3DD",
  white: "#FFFFFF",
  grayBg: "#F5F5F5",
  ink: "#16241B",
  inkSoft: "#5B6B61",
  danger: "#C0392B",
  border: "#E4E9E4",
};
/* ============================================================
   CONFIGURATION MARCHANDE — Modifie ici tes numéros
   ============================================================ */
const MERCHANT = {
  mtn: {
    name: "MTN Mobile Money",
    number: "654157406",
    color: "#FFCC00",
    bgSoft: "#FFF9E6",
  },
  orange: {
    name: "Orange Money",
    number: "693850310",
    color: "#FF6600",
    bgSoft: "#FFF0E6",
  },
};
/* ============================================================
   MOCK DATA
   ============================================================ */
const PRODUCTS = [
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    daily: 250,
    days: 30,
    tier: 1,
    desc: "Le point d'entrée idéal pour découvrir la plateforme et générer vos premiers revenus.",
    features: [
      "Rendement journalier : 250 FCFA",
      "Durée : 30 jours",
      "Retour total : 7 500 FCFA",
    ],
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 10000,
    daily: 550,
    days: 30,
    tier: 2,
    desc: "Un palier équilibré pour les utilisateurs qui veulent accélérer leurs gains.",
    features: [
      "Rendement journalier : 550 FCFA",
      "Durée : 30 jours",
      "Retour total : 16 500 FCFA",
    ],
  },
  {
    id: "argent",
    name: "Argent",
    price: 25000,
    daily: 1450,
    days: 30,
    tier: 3,
    desc: "Pensé pour les investisseurs réguliers cherchant un rendement supérieur.",
    features: [
      "Rendement journalier : 1 450 FCFA",
      "Durée : 30 jours",
      "Retour total : 43 500 FCFA",
    ],
  },
  {
    id: "or",
    name: "Or",
    price: 50000,
    daily: 3100,
    days: 30,
    tier: 4,
    desc: "Le palier premium pour maximiser vos revenus passifs au quotidien.",
    features: [
      "Rendement journalier : 3 100 FCFA",
      "Durée : 30 jours",
      "Retour total : 93 000 FCFA",
    ],
  },
  {
    id: "platine",
    name: "Platine",
    price: 100000,
    daily: 6800,
    days: 30,
    tier: 5,
    desc: "Notre offre la plus exclusive, réservée aux membres les plus engagés.",
    features: [
      "Rendement journalier : 6 800 FCFA",
      "Durée : 30 jours",
      "Retour total : 204 000 FCFA",
    ],
  },
];

const TIER_ICON = { 1: Star, 2: Award, 3: ShieldCheck, 4: Crown, 5: Sparkles };

const NEWS = [
  {
    id: 1,
    title: "Nouvelle promotion",
    body: "Bonus de +10% sur tout dépôt MTN Mobile Money ce week-end.",
    tag: "Promo",
  },
  {
    id: 2,
    title: "Nouveau produit disponible",
    body: "Le palier Platine est maintenant ouvert à tous les membres.",
    tag: "Produit",
  },
  {
    id: 3,
    title: "Maintenance programmée",
    body: "Une maintenance aura lieu le 22 juin de 02h à 04h.",
    tag: "Info",
  },
];

const NOTIFS = [
  {
    id: 1,
    icon: Package,
    title: "Nouveau produit disponible",
    time: "Il y a 2 h",
    read: false,
  },
  {
    id: 2,
    icon: ArrowDownToLine,
    title: "Dépôt confirmé — 25 000 FCFA",
    time: "Hier, 14:32",
    read: false,
  },
  {
    id: 3,
    icon: ArrowUpFromLine,
    title: "Retrait traité — 10 000 FCFA",
    time: "Hier, 09:10",
    read: true,
  },
  {
    id: 4,
    icon: Megaphone,
    title: "Promotion active ce week-end",
    time: "Il y a 2 jours",
    read: true,
  },
];

const REWARDS = [
  {
    id: 1,
    title: "Bonus de bienvenue",
    amount: 1000,
    status: "Crédité",
    icon: Gift,
  },
  {
    id: 2,
    title: "Récompense d'achat",
    amount: 2500,
    status: "Crédité",
    icon: Award,
  },
  {
    id: 3,
    title: "Récompense de fidélité",
    amount: 1500,
    status: "En attente",
    icon: Crown,
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function formatFCFA(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function todayStr() {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ============================================================
   GLOBAL APP STATE — version avec API backend
   ============================================================ */
function useAppState() {
  const [screen, setScreen] = useState("welcome");
  const [tab, setTab] = useState("home");
  const [subScreen, setSubScreen] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const [auth, setAuth] = useState(null);
  const [toast, setToast] = useState(null);

  const [balance, setBalance] = useState(0);
  const [activeProducts, setActiveProducts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [referralStats, setReferralStats] = useState({
    direct: 0,
    validated: 0,
    rewards: 0,
    referralCode: "",
    referrals: [],
  });

  const showToast = useCallback((message, kind = "success") => {
    setToast({ message, kind, id: Math.random().toString(36).slice(2) });
    window.clearTimeout(window.__lionToastTimer);
    window.__lionToastTimer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const navigate = useCallback(
    (nextTab, nextSub = null) => {
      setHistory((h) => [...h, { tab, subScreen }]);
      setTab(nextTab);
      setSubScreen(nextSub);
    },
    [tab, subScreen],
  );

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        setSubScreen(null);
        return h;
      }
      const prev = h[h.length - 1];
      setTab(prev.tab);
      setSubScreen(prev.subScreen);
      return h.slice(0, -1);
    });
  }, []);

  const openSub = useCallback(
    (sub) => {
      setHistory((h) => [...h, { tab, subScreen }]);
      setSubScreen(sub);
    },
    [tab, subScreen],
  );

  // ===== CHARGER LES DONNÉES AU DÉMARRAGE =====
  const loadUserData = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setBalance(profile.balance);
      setActiveProducts(profile.activeProducts || []);
      setAuth({
        username: profile.username,
        phone: profile.phone,
        role: profile.role,
      });
    } catch (err) {
      console.error("Erreur chargement profil:", err);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const historyData = await api.getHistory();
      setDeposits(historyData.deposits || []);
      setWithdrawals(historyData.withdrawals || []);
      setPurchases(historyData.purchases || []);
    } catch (err) {
      console.error("Erreur chargement historique:", err);
    }
  }, []);

  const loadReferralStats = useCallback(async () => {
    try {
      const stats = await api.getReferralStats();
      setReferralStats(stats);
    } catch (err) {
      console.error("Erreur chargement parrainage:", err);
    }
  }, []);

  // ===== AUTH =====
  const register = useCallback(
    async (username, phone, password) => {
      setLoading(true);
      try {
        const data = await api.register(username, phone, password);
        localStorage.setItem("lionToken", data.token);
        setAuth(data.user);
        setBalance(data.user.balance);
        setScreen("app");
        setTab("home");
        showToast(`Bienvenue ${username} ! Compte créé avec succès.`);
        await loadHistory();
        await loadReferralStats();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast, loadHistory, loadReferralStats],
  );

  const login = useCallback(
    async (username, password) => {
      setLoading(true);
      try {
        const data = await api.login(username, password);
        localStorage.setItem("lionToken", data.token);
        setAuth(data.user);
        setBalance(data.user.balance);
        setScreen("app");
        setTab("home");
        showToast(`Content de vous revoir, ${username} !`);
        await loadUserData();
        await loadHistory();
        await loadReferralStats();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast, loadUserData, loadHistory, loadReferralStats],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("lionToken");
    setAuth(null);
    setScreen("welcome");
    setTab("home");
    setSubScreen(null);
    setHistory([]);
    setBalance(0);
    setActiveProducts([]);
    setDeposits([]);
    setWithdrawals([]);
    setPurchases([]);
    showToast("Déconnexion réussie.");
  }, [showToast]);

  // ===== WALLET =====
  const makeDeposit = useCallback(
    async (amount, method) => {
      try {
        const data = await api.deposit(amount, method);
        setBalance(data.balance);
        setDeposits((d) => [data.deposit, ...d]);
        showToast(
          `Dépôt de ${Number(amount).toLocaleString("fr-FR")} FCFA effectué.`,
        );
        return true;
      } catch (err) {
        showToast(err.message, "error");
        return false;
      }
    },
    [showToast],
  );

  const makeWithdrawal = useCallback(
    async (amount, method, phone) => {
      try {
        const data = await api.withdraw(amount, method, phone);
        setBalance(data.balance);
        setWithdrawals((w) => [data.withdrawal, ...w]);
        showToast(
          `Demande de retrait de ${Number(amount).toLocaleString("fr-FR")} FCFA envoyée.`,
        );
        return true;
      } catch (err) {
        showToast(err.message, "error");
        return false;
      }
    },
    [showToast],
  );

  // ===== PRODUCTS =====
  const buyProduct = useCallback(
    async (product) => {
      try {
        const data = await api.buyProduct(product.id);
        setBalance(data.balance);
        setActiveProducts(data.activeProducts || []);
        setPurchases((p) => [
          {
            id: Math.random().toString(36).slice(2),
            date: todayStr(),
            product: product.name,
            amount: product.price,
          },
          ...p,
        ]);
        showToast(`Produit ${product.name} acheté avec succès !`);
        return true;
      } catch (err) {
        showToast(err.message, "error");
        return false;
      }
    },
    [showToast],
  );

  // ===== VÉRIFIER LE TOKEN AU CHARGEMENT =====
  useEffect(() => {
    const token = localStorage.getItem("lionToken");
    if (token) {
      (async () => {
        try {
          await loadUserData();
          await loadHistory();
          await loadReferralStats();
          setScreen("app");
        } catch (err) {
          localStorage.removeItem("lionToken");
          setScreen("welcome");
        }
      })();
    }
  }, []);

  return {
    screen,
    setScreen,
    tab,
    setTab,
    subScreen,
    setSubScreen,
    navigate,
    goBack,
    openSub,
    loading,
    auth,
    register,
    login,
    logout,
    balance,
    activeProducts,
    deposits,
    withdrawals,
    purchases,
    referralCode: referralStats.referralCode || "LD237-XXXXX",
    referralLink: `https://liondigital237.com/ref/${referralStats.referralCode || "XXXXX"}`,
    referralStats,
    makeDeposit,
    makeWithdrawal,
    buyProduct,
    toast,
    showToast,
    loadHistory,
    loadReferralStats,
  };
}

/* ============================================================
   SHARED UI ATOMS
   ============================================================ */
function LionMark({ size = 56 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(155deg, ${T.green} 0%, ${T.greenDark} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 8px 24px -8px rgba(10,143,61,0.55)`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2c1.2 1.6 1.8 2.7 3.2 3.4.9-.6 1.6-1.6 1.9-2.6.6 1.4.6 3-.1 4.3 1.1.4 2 1.2 2.6 2.3-1.4-.2-2.6 0-3.6.7.7 1 1 2.2.9 3.5-.9-.8-1.9-1.2-3.1-1.3.3 1.2.1 2.5-.6 3.6-.4-1.2-1.1-2.1-2.1-2.7-1 .6-1.7 1.5-2.1 2.7-.7-1.1-.9-2.4-.6-3.6-1.2.1-2.2.5-3.1 1.3-.1-1.3.2-2.5.9-3.5-1-.7-2.2-.9-3.6-.7.6-1.1 1.5-1.9 2.6-2.3-.7-1.3-.7-2.9-.1-4.3.3 1 1 2 1.9 2.6C8 4.7 8.6 3.6 9.8 2c.5 1 .9 1.7 1.1 2.4.2-.7.6-1.4 1.1-2.4z"
          fill={T.gold}
        />
        <circle cx="12" cy="14.5" r="2.1" fill={T.white} />
      </svg>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  variant = "green",
  style,
  disabled,
  type = "button",
}) {
  const bg =
    variant === "green" ? T.green : variant === "gold" ? T.gold : T.white;
  const color = variant === "white" ? T.green : T.white;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "14px 20px",
        borderRadius: 14,
        border: variant === "white" ? `1.5px solid ${T.green}` : "none",
        background: disabled ? "#B9C9BD" : bg,
        color: disabled ? "#fff" : color,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 0.2,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : variant === "green"
            ? "0 10px 20px -8px rgba(10,143,61,0.5)"
            : variant === "gold"
              ? "0 10px 20px -8px rgba(212,175,55,0.55)"
              : "none",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.98)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {children}
    </button>
  );
}

function TextField({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: T.inkSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <input
        {...props}
        style={{
          width: "100%",
          padding: "13px 14px",
          borderRadius: 12,
          border: `1.5px solid ${T.border}`,
          fontSize: 15,
          color: T.ink,
          background: T.white,
          boxSizing: "border-box",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = T.green;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = T.border;
        }}
      />
    </label>
  );
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: T.inkSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "13px 44px 13px 14px",
            borderRadius: 12,
            border: `1.5px solid ${T.border}`,
            fontSize: 15,
            color: T.ink,
            background: T.white,
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = T.green;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = T.border;
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: T.inkSoft,
            padding: 4,
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function ScreenShell({ children, bg = T.grayBg }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 430,
          minHeight: "100vh",
          background: T.white,
          position: "relative",
          boxShadow: "0 0 60px rgba(0,0,0,0.06)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 18px",
        borderBottom: `1px solid ${T.border}`,
        position: "sticky",
        top: 0,
        background: T.white,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background: T.grayBg,
              border: "none",
              borderRadius: 10,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.ink,
            }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <span style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.kind === "error";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 96,
        left: 18,
        right: 18,
        zIndex: 200,
        background: isError ? "#FDECEA" : T.greenSoft,
        border: `1.5px solid ${isError ? T.danger : T.green}`,
        color: isError ? T.danger : T.greenDark,
        borderRadius: 14,
        padding: "13px 16px",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: "0 12px 28px -10px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "lionFadeUp 0.25s ease",
        maxWidth: 394,
        margin: "0 auto",
      }}
    >
      {isError ? <X size={18} /> : <Check size={18} />}
      {toast.message}
    </div>
  );
}

/* ============================================================
   WELCOME SCREEN
   ============================================================ */
function WelcomeScreen({ state }) {
  return (
    <ScreenShell bg={T.green}>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          background: `radial-gradient(circle at 50% 0%, ${T.greenDark} 0%, ${T.green} 55%)`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 22,
          }}
        >
          <LionMark size={92} />
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                color: T.white,
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                letterSpacing: 0.2,
              }}
            >
              Lion Digital <span style={{ color: T.gold }}>237</span>
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: 14,
                marginTop: 8,
                fontWeight: 500,
              }}
            >
              La plateforme numérique du Cameroun
            </p>
          </div>
        </div>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            paddingBottom: 8,
          }}
        >
          <PrimaryButton
            variant="gold"
            onClick={() => state.setScreen("login")}
          >
            Se connecter
          </PrimaryButton>
          <PrimaryButton
            variant="white"
            onClick={() => state.setScreen("register")}
          >
            S'inscrire
          </PrimaryButton>
        </div>
      </div>
    </ScreenShell>
  );
}

/* ============================================================
   REGISTER SCREEN
   ============================================================ */
function RegisterScreen({ state }) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !phone || !pwd || !pwd2) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (pwd.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (pwd !== pwd2) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!agree) {
      setError("Vous devez accepter les Conditions Générales.");
      return;
    }
    setError("");
    await state.register(username, phone, pwd);
  };

  return (
    <ScreenShell>
      <TopBar title="" onBack={() => state.setScreen("welcome")} />
      <form onSubmit={submit} style={{ padding: "8px 22px 32px" }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: T.ink,
            margin: "10px 0 4px",
          }}
        >
          Créer un compte
        </h1>
        <p style={{ fontSize: 14, color: T.inkSoft, marginBottom: 24 }}>
          Rejoignez la plateforme en quelques secondes.
        </p>

        <TextField
          label="Nom d'utilisateur"
          placeholder="Ex : jeanc237"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Numéro de téléphone"
          placeholder="6XX XXX XXX"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Code de parrainage (facultatif)"
          placeholder="LD237-XXXXX"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <PasswordField
          label="Mot de passe"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="6 caractères minimum"
        />
        <PasswordField
          label="Confirmer le mot de passe"
          value={pwd2}
          onChange={(e) => setPwd2(e.target.value)}
          placeholder="Répétez le mot de passe"
        />

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            style={{
              marginTop: 3,
              width: 17,
              height: 17,
              accentColor: T.green,
            }}
          />
          <span style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.4 }}>
            J'accepte les{" "}
            <span style={{ color: T.green, fontWeight: 700 }}>
              Conditions Générales
            </span>{" "}
            d'utilisation de Lion Digital 237
          </span>
        </label>

        {error && (
          <p
            style={{
              color: T.danger,
              fontSize: 13,
              fontWeight: 600,
              margin: "8px 0",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginTop: 18 }}>
          <PrimaryButton type="submit" disabled={state.loading}>
            {state.loading ? "Inscription..." : "S'inscrire"}
          </PrimaryButton>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13.5,
            color: T.inkSoft,
            marginTop: 20,
          }}
        >
          Déjà un compte ?{" "}
          <span
            onClick={() => state.setScreen("login")}
            style={{ color: T.green, fontWeight: 700, cursor: "pointer" }}
          >
            Se connecter
          </span>
        </p>
      </form>
    </ScreenShell>
  );
}

/* ============================================================
   LOGIN SCREEN
   ============================================================ */
function LoginScreen({ state }) {
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!username || !pwd) {
      setError("Veuillez entrer votre nom d'utilisateur et mot de passe.");
      return;
    }
    setError("");
    await state.login(username, pwd);
  };

  return (
    <ScreenShell>
      <TopBar title="" onBack={() => state.setScreen("welcome")} />
      <div
        style={{
          padding: "24px 22px 32px",
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <LionMark size={64} />
        </div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: T.ink,
            margin: "0 0 4px",
            textAlign: "center",
          }}
        >
          Bon retour
        </h1>
        <p
          style={{
            fontSize: 14,
            color: T.inkSoft,
            marginBottom: 26,
            textAlign: "center",
          }}
        >
          Connectez-vous pour accéder à votre compte.
        </p>

        <form onSubmit={submit} style={{ flex: 1 }}>
          <TextField
            label="Nom d'utilisateur"
            placeholder="Votre nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <PasswordField
            label="Mot de passe"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Votre mot de passe"
          />

          {error && (
            <p
              style={{
                color: T.danger,
                fontSize: 13,
                fontWeight: 600,
                margin: "0 0 8px",
              }}
            >
              {error}
            </p>
          )}

          <p
            style={{
              textAlign: "right",
              fontSize: 13.5,
              color: T.green,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 22,
            }}
          >
            Mot de passe oublié ?
          </p>

          <PrimaryButton type="submit" disabled={state.loading}>
            {state.loading ? "Connexion..." : "Connexion"}
          </PrimaryButton>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 13.5,
            color: T.inkSoft,
            marginTop: 24,
          }}
        >
          Pas encore de compte ?{" "}
          <span
            onClick={() => state.setScreen("register")}
            style={{ color: T.green, fontWeight: 700, cursor: "pointer" }}
          >
            Créer un compte
          </span>
        </p>
      </div>
    </ScreenShell>
  );
}

/* ============================================================
   MAIN APP SHELL
   ============================================================ */
const NAV_ITEMS = [
  { key: "home", label: "Accueil", icon: Home },
  { key: "products", label: "Produits", icon: Package },
  { key: "wallet", label: "Portefeuille", icon: Wallet },
  { key: "referral", label: "Parrainage", icon: Users },
  { key: "profile", label: "Profil", icon: User },
];

function MainApp({ state }) {
  const { tab, subScreen } = state;

  let content = null;
  if (subScreen === "deposit") content = <DepositScreen state={state} />;
  else if (subScreen === "withdraw") content = <WithdrawScreen state={state} />;
  else if (subScreen === "history") content = <HistoryScreen state={state} />;
  else if (subScreen === "notifications")
    content = <NotificationsScreen state={state} />;
  else if (subScreen === "support") content = <SupportScreen state={state} />;
  else if (subScreen === "rewards") content = <RewardsScreen state={state} />;
  else if (subScreen === "admin") content = <AdminScreen state={state} />;
  else if (subScreen?.type === "product-detail")
    content = <ProductDetailScreen state={state} product={subScreen.product} />;
  else if (tab === "home") content = <HomeScreen state={state} />;
  else if (tab === "products") content = <ProductsScreen state={state} />;
  else if (tab === "wallet") content = <WalletScreen state={state} />;
  else if (tab === "referral") content = <ReferralScreen state={state} />;
  else if (tab === "profile") content = <ProfileScreen state={state} />;

  const showBottomNav = !subScreen;

  return (
    <ScreenShell>
      <div
        style={{ paddingBottom: showBottomNav ? 78 : 0, minHeight: "100vh" }}
      >
        {content}
      </div>
      <Toast toast={state.toast} />
      {showBottomNav && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 430,
            background: T.white,
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-around",
            padding: "10px 6px 14px",
            zIndex: 100,
            boxShadow: "0 -8px 24px -16px rgba(0,0,0,0.15)",
          }}
        >
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => {
                  state.setSubScreen(null);
                  state.setTab(key);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  color: active ? T.green : T.inkSoft,
                  flex: 1,
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}

// ============================================================
// HOME SCREEN
// ============================================================
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      style={{
        flex: 1,
        background: T.white,
        borderRadius: 16,
        padding: "16px 14px",
        border: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accent + "1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>
          {label}
        </div>
        <div
          style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginTop: 2 }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ state }) {
  const username = state.auth?.username || "Utilisateur";
  return (
    <div>
      <div
        style={{
          padding: "20px 20px 28px",
          background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LionMark size={38} />
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Lion Digital 237
              </div>
              <div style={{ color: T.white, fontSize: 16, fontWeight: 700 }}>
                Bonjour {username} 👋
              </div>
            </div>
          </div>
          <button
            onClick={() => state.openSub("notifications")}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "none",
              borderRadius: 12,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: T.white,
              position: "relative",
            }}
          >
            <Bell size={19} />
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                background: T.gold,
              }}
            />
          </button>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            borderRadius: 18,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Solde principal
          </div>
          <div
            style={{
              color: T.white,
              fontSize: 28,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {formatFCFA(state.balance)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => state.openSub("deposit")}
              style={{
                flex: 1,
                background: T.gold,
                color: T.ink,
                border: "none",
                borderRadius: 12,
                padding: "10px 0",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Déposer
            </button>
            <button
              onClick={() => state.openSub("withdraw")}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.18)",
                color: T.white,
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: 12,
                padding: "10px 0",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
              }}
            >
              Retirer
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 8px", display: "flex", gap: 12 }}>
        <StatCard
          icon={Package}
          label="Produits actifs"
          value={state.activeProducts.length}
          accent={T.green}
        />
        <StatCard
          icon={Users}
          label="Filleuls"
          value={state.referralStats.direct}
          accent={T.gold}
        />
      </div>
      <div style={{ padding: "0 20px 8px", display: "flex", gap: 12 }}>
        <StatCard
          icon={Gift}
          label="Récompenses"
          value={formatFCFA(REWARDS.reduce((s, r) => s + r.amount, 0))}
          accent={T.green}
        />
        <StatCard
          icon={TrendingUp}
          label="Solde principal"
          value={formatFCFA(state.balance)}
          accent={T.gold}
        />
      </div>

      <div style={{ padding: "16px 20px 4px" }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 12px",
          }}
        >
          Raccourcis
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 10,
          }}
        >
          {[
            {
              icon: CircleDollarSign,
              label: "Dépôt",
              action: () => state.openSub("deposit"),
            },
            {
              icon: ArrowUpFromLine,
              label: "Retrait",
              action: () => state.openSub("withdraw"),
            },
            {
              icon: Package,
              label: "Produits",
              action: () => {
                state.setSubScreen(null);
                state.setTab("products");
              },
            },
            {
              icon: Users,
              label: "Parrainage",
              action: () => {
                state.setSubScreen(null);
                state.setTab("referral");
              },
            },
          ].map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "14px 4px",
                background: T.greenSoft,
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              <Icon size={20} color={T.green} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.ink }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 20px 28px" }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 12px",
          }}
        >
          Actualités
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {NEWS.map((n) => (
            <div
              key={n.id}
              style={{
                background: T.grayBg,
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 6,
                  borderRadius: 3,
                  background:
                    n.tag === "Promo"
                      ? T.gold
                      : n.tag === "Produit"
                        ? T.green
                        : T.inkSoft,
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  {n.title}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: T.inkSoft,
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {n.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRODUCTS SCREEN
// ============================================================
function ProductCard({ product, onOpen }) {
  const Icon = TIER_ICON[product.tier] || Package;
  return (
    <div
      onClick={onOpen}
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: 16,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          height: 84,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${T.greenSoft}, ${T.goldSoft})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={34} color={T.green} />
      </div>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink }}>
            {product.name}
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: T.gold,
              background: T.goldSoft,
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            Palier {product.tier}
          </span>
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.green,
            marginTop: 4,
          }}
        >
          {formatFCFA(product.price)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.inkSoft,
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          {product.desc}
        </div>
      </div>
      <PrimaryButton
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        style={{ padding: "10px 0", fontSize: 13.5 }}
      >
        Acheter
      </PrimaryButton>
    </div>
  );
}

function ProductsScreen({ state }) {
  return (
    <div>
      <TopBar title="Produits disponibles" />
      <div
        style={{
          padding: "18px 20px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        {PRODUCTS.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onOpen={() => state.openSub({ type: "product-detail", product: p })}
          />
        ))}
      </div>
    </div>
  );
}

function ProductDetailScreen({ state, product }) {
  const Icon = TIER_ICON[product.tier] || Package;
  const handleBuy = async () => {
    const ok = await state.buyProduct(product);
    if (ok) state.goBack();
  };
  return (
    <div>
      <TopBar title={product.name} onBack={state.goBack} />
      <div style={{ padding: "20px" }}>
        <div
          style={{
            height: 180,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${T.greenSoft}, ${T.goldSoft})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <Icon size={64} color={T.green} />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 6,
          }}
        >
          <h1
            style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: 0 }}
          >
            {product.name}
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.gold,
              background: T.goldSoft,
              padding: "4px 10px",
              borderRadius: 10,
            }}
          >
            Palier {product.tier}
          </span>
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: T.green,
            marginBottom: 16,
          }}
        >
          {formatFCFA(product.price)}
        </div>
        <p
          style={{
            fontSize: 14,
            color: T.inkSoft,
            lineHeight: 1.6,
            marginBottom: 18,
          }}
        >
          {product.desc}
        </p>
        <div
          style={{
            background: T.grayBg,
            borderRadius: 16,
            padding: "16px 18px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: T.ink,
              marginBottom: 10,
            }}
          >
            Caractéristiques
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {product.features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: T.inkSoft,
                }}
              >
                <Check size={15} color={T.green} /> {f}
              </div>
            ))}
          </div>
        </div>
        <PrimaryButton onClick={handleBuy} disabled={state.loading}>
          {state.loading ? "Achat en cours..." : "Acheter maintenant"}
        </PrimaryButton>
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: T.inkSoft,
            marginTop: 12,
          }}
        >
          Solde disponible : {formatFCFA(state.balance)}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// WALLET SCREEN
// ============================================================
function WalletScreen({ state }) {
  return (
    <div>
      <TopBar title="Portefeuille" />
      <div style={{ padding: "18px 20px" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
            borderRadius: 20,
            padding: "22px 20px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.78)",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            Solde principal
          </div>
          <div
            style={{
              color: T.white,
              fontSize: 30,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {formatFCFA(state.balance)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => state.openSub("deposit")}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "16px 0",
              background: T.greenSoft,
              border: "none",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            <ArrowDownToLine size={22} color={T.green} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
              Dépôt
            </span>
          </button>
          <button
            onClick={() => state.openSub("withdraw")}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "16px 0",
              background: T.goldSoft,
              border: "none",
              borderRadius: 16,
              cursor: "pointer",
            }}
          >
            <ArrowUpFromLine size={22} color={T.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
              Retrait
            </span>
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3
            style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}
          >
            Produits actifs
          </h3>
          <span
            onClick={() => {
              state.setSubScreen(null);
              state.setTab("products");
            }}
            style={{
              fontSize: 12.5,
              color: T.green,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Voir tout
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {state.activeProducts.map((ap) => {
            const p = PRODUCTS.find((x) => x.id === ap.productId);
            if (!p) return null;
            const Icon = TIER_ICON[p.tier] || Package;
            return (
              <div
                key={ap.id || ap._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: T.grayBg,
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: T.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon size={18} color={T.green} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}
                  >
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    Acheté le{" "}
                    {new Date(ap.purchasedAt).toLocaleDateString("fr-FR")} ·{" "}
                    {ap.daysLeft} j restants
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.green }}>
                  +{formatFCFA(p.daily)}/j
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => state.openSub("history")}
          style={{
            width: "100%",
            background: "none",
            border: `1.5px solid ${T.border}`,
            borderRadius: 14,
            padding: "13px 0",
            fontSize: 13.5,
            fontWeight: 700,
            color: T.ink,
            cursor: "pointer",
          }}
        >
          Voir tout l'historique
        </button>
      </div>
    </div>
  );
}

// ============================================================
// DEPOSIT SCREEN
// ============================================================
/* ============================================================
   DEPOSIT SCREEN — Avec vrais numéros marchands
   ============================================================ */
function DepositScreen({ state }) {
  const [method, setMethod] = useState("mtn");
  const [amount, setAmount] = useState("");
  const [number, setNumber] = useState("");

  const submit = async () => {
    if (!amount || amount < 500) {
      state.showToast("Montant minimum : 500 FCFA", "error");
      return;
    }
    if (!number) {
      state.showToast("Veuillez entrer votre numéro de paiement", "error");
      return;
    }
    const ok = await state.makeDeposit(amount, MERCHANT[method].name);
    if (ok) {
      setAmount("");
      setNumber("");
    }
  };

  const current = MERCHANT[method];

  return (
    <div>
      <TopBar title="Recharger mon compte" onBack={state.goBack} />
      <div style={{ padding: "18px 20px 32px" }}>
        {/* Sélection méthode */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {Object.entries(MERCHANT).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              style={{
                flex: 1,
                padding: "14px 8px",
                borderRadius: 14,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                border:
                  method === key
                    ? `2px solid ${m.color}`
                    : `1.5px solid ${T.border}`,
                background: method === key ? m.bgSoft : T.white,
                color: T.ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Smartphone size={16} color={m.color} />
              {m.name}
            </button>
          ))}
        </div>

        {/* Carte marchande avec le vrai numéro */}
        <div
          style={{
            background: `linear-gradient(135deg, ${current.bgSoft}, ${T.white})`,
            borderRadius: 18,
            padding: "20px",
            marginBottom: 20,
            border: `1.5px solid ${current.color}33`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 15,
              background: current.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              color: T.white,
            }}
          >
            <Smartphone size={24} />
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: T.inkSoft,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Envoyez l'argent à ce numéro
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: T.ink,
              letterSpacing: 1,
              fontFamily: "'Courier New', monospace",
            }}
          >
            {current.number}
          </div>
          <div
            style={{
              fontSize: 12,
              color: current.color,
              fontWeight: 700,
              marginTop: 6,
              background: current.bgSoft,
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: 20,
            }}
          >
            {current.name}
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            background: T.grayBg,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: T.inkSoft,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: T.ink }}>Comment faire ?</strong>
          <br />
          1. Ouvre ton application {current.name}
          <br />
          2. Envoie le montant au <strong>{current.number}</strong>
          <br />
          3. Saisis le montant et ton numéro ci-dessous
          <br />
          4. Clique sur "Effectuer le dépôt"
        </div>

        <TextField
          label="Votre numéro de paiement"
          placeholder="Ex : 654157406"
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <TextField
          label="Montant à déposer (FCFA)"
          placeholder="Ex : 10000"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {[5000, 10000, 25000, 50000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              style={{
                flex: "1 0 auto",
                padding: "10px 14px",
                borderRadius: 10,
                border: `1.5px solid ${T.border}`,
                background: Number(amount) === v ? T.greenSoft : T.white,
                fontSize: 12.5,
                fontWeight: 700,
                color: Number(amount) === v ? T.green : T.ink,
                cursor: "pointer",
              }}
            >
              {v.toLocaleString("fr-FR")} FCFA
            </button>
          ))}
        </div>

        <PrimaryButton onClick={submit} disabled={state.loading}>
          {state.loading
            ? "Traitement..."
            : `Effectuer le dépôt via ${current.name}`}
        </PrimaryButton>

        {/* Historique des dépôts */}
        <div style={{ marginTop: 28 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 12px",
            }}
          >
            Mes derniers dépôts
          </h3>
          {state.deposits.slice(0, 10).map((d) => (
            <div
              key={d.id || d._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: T.grayBg,
                borderRadius: 14,
                padding: "12px 16px",
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  {formatFCFA(d.amount)}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>
                  {new Date(d.date).toLocaleDateString("fr-FR")} · {d.method}
                </div>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.green,
                  background: T.greenSoft,
                  padding: "4px 10px",
                  borderRadius: 8,
                }}
              >
                {d.status}
              </span>
            </div>
          ))}
          {state.deposits.length === 0 && (
            <p
              style={{
                fontSize: 13,
                color: T.inkSoft,
                textAlign: "center",
                padding: 16,
              }}
            >
              Aucun dépôt pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// WITHDRAW SCREEN
// ============================================================
function WithdrawScreen({ state }) {
  const [method, setMethod] = useState("mtn");
  const [amount, setAmount] = useState("");
  const [number, setNumber] = useState("");

  const submit = async () => {
    const ok = await state.makeWithdrawal(
      amount,
      method === "mtn" ? "MTN Mobile Money" : "Orange Money",
      number,
    );
    if (ok) {
      setAmount("");
      setNumber("");
    }
  };

  return (
    <div>
      <TopBar title="Demande de retrait" onBack={state.goBack} />
      <div style={{ padding: "18px 20px 32px" }}>
        <div
          style={{
            background: T.greenSoft,
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 13,
            color: T.greenDark,
            fontWeight: 600,
          }}
        >
          Solde disponible : {formatFCFA(state.balance)}
        </div>
        <TextField
          label="Montant à retirer (FCFA)"
          placeholder="Ex : 5000"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: T.inkSoft,
              marginBottom: 8,
            }}
          >
            Choix du moyen
          </span>
          {[
            { key: "mtn", label: "MTN Mobile Money" },
            { key: "orange", label: "Orange Money" },
          ].map((m) => (
            <label
              key={m.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 14px",
                borderRadius: 12,
                border:
                  method === m.key
                    ? `2px solid ${T.green}`
                    : `1.5px solid ${T.border}`,
                marginBottom: 10,
                cursor: "pointer",
                background: method === m.key ? T.greenSoft : T.white,
              }}
            >
              <input
                type="radio"
                name="wmethod"
                checked={method === m.key}
                onChange={() => setMethod(m.key)}
                style={{ accentColor: T.green, width: 17, height: 17 }}
              />
              <Smartphone size={16} color={T.green} />
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                {m.label}
              </span>
            </label>
          ))}
        </div>
        <TextField
          label="Numéro de réception"
          placeholder="6XX XXX XXX"
          type="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <PrimaryButton onClick={submit} disabled={state.loading}>
          {state.loading ? "Traitement..." : "Confirmer"}
        </PrimaryButton>
        <div style={{ marginTop: 28 }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 12px",
            }}
          >
            Historique des retraits
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {state.withdrawals.map((w) => (
              <div
                key={w.id || w._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: T.grayBg,
                  borderRadius: 14,
                  padding: "12px 16px",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}
                  >
                    {formatFCFA(w.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    {new Date(w.date).toLocaleDateString("fr-FR")} · {w.method}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: w.status === "Traité" ? T.green : T.gold,
                    background:
                      w.status === "Traité" ? T.greenSoft : T.goldSoft,
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REFERRAL SCREEN
// ============================================================
function CopyRow({ value, label }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (e) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: T.inkSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: T.grayBg,
          borderRadius: 12,
          padding: "12px 14px",
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 13.5,
            fontWeight: 700,
            color: T.ink,
            wordBreak: "break-all",
          }}
        >
          {value}
        </span>
        <button
          onClick={doCopy}
          style={{
            background: copied ? T.green : T.white,
            border: `1.5px solid ${T.green}`,
            borderRadius: 9,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: copied ? T.white : T.green,
            flexShrink: 0,
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

function ReferralScreen({ state }) {
  return (
    <div>
      <TopBar title="Parrainage" />
      <div style={{ padding: "18px 20px 32px" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.gold}, #B8932A)`,
            borderRadius: 20,
            padding: "20px 18px",
            marginBottom: 22,
            textAlign: "center",
          }}
        >
          <Users size={28} color={T.white} style={{ marginBottom: 8 }} />
          <div style={{ color: T.white, fontSize: 14, fontWeight: 700 }}>
            Invitez vos amis et gagnez des récompenses
          </div>
        </div>
        <CopyRow label="Mon code" value={state.referralCode} />
        <CopyRow label="Mon lien" value={state.referralLink} />
        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.ink,
            margin: "8px 0 12px",
          }}
        >
          Statistiques
        </h3>
        <div style={{ display: "flex", gap: 12 }}>
          <StatCard
            icon={Users}
            label="Filleuls directs"
            value={state.referralStats.direct}
            accent={T.green}
          />
          <StatCard
            icon={Check}
            label="Achats validés"
            value={state.referralStats.validated}
            accent={T.gold}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <StatCard
            icon={Gift}
            label="Récompenses obtenues"
            value={formatFCFA(state.referralStats.rewards)}
            accent={T.green}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REWARDS SCREEN
// ============================================================
function RewardsScreen({ state }) {
  return (
    <div>
      <TopBar title="Mes récompenses" onBack={state.goBack} />
      <div
        style={{
          padding: "18px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {REWARDS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: T.grayBg,
                borderRadius: 16,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: T.goldSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={20} color={T.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                  {r.status}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.green }}>
                +{formatFCFA(r.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   HISTORY (global, tabbed)
   ============================================================ */
function HistoryScreen({ state }) {
  const [sub, setSub] = useState("deposits");
  const tabs = [
    { key: "deposits", label: "Dépôts" },
    { key: "withdrawals", label: "Retraits" },
    { key: "purchases", label: "Achats" },
  ];
  return (
    <div>
      <TopBar title="Toutes les opérations" onBack={state.goBack} />
      <div style={{ padding: "16px 20px 0", display: "flex", gap: 8 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: sub === t.key ? "none" : `1.5px solid ${T.border}`,
              background: sub === t.key ? T.green : T.white,
              color: sub === t.key ? T.white : T.ink,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        style={{
          padding: "18px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {sub === "deposits" &&
          state.deposits.map((d) => (
            <div
              key={d.id || d._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                background: T.grayBg,
                borderRadius: 14,
                padding: "12px 16px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
                  {new Date(d.date).toLocaleDateString("fr-FR")}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>{d.method}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{ fontWeight: 800, fontSize: 13.5, color: T.green }}
                >
                  +{formatFCFA(d.amount)}
                </div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>
                  {d.status}
                </div>
              </div>
            </div>
          ))}
        {sub === "withdrawals" &&
          state.withdrawals.map((w) => (
            <div
              key={w.id || w._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                background: T.grayBg,
                borderRadius: 14,
                padding: "12px 16px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
                  {new Date(w.date).toLocaleDateString("fr-FR")}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>{w.method}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{ fontWeight: 800, fontSize: 13.5, color: T.danger }}
                >
                  -{formatFCFA(w.amount)}
                </div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>
                  {w.status}
                </div>
              </div>
            </div>
          ))}
        {sub === "purchases" &&
          state.purchases.map((p) => (
            <div
              key={p.id || p._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                background: T.grayBg,
                borderRadius: 14,
                padding: "12px 16px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>
                  {p.product}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>
                  {new Date(p.date).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: T.ink }}>
                {formatFCFA(p.amount)}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function NotificationsScreen({ state }) {
  return (
    <div>
      <TopBar title="Notifications" onBack={state.goBack} />
      <div
        style={{
          padding: "18px 20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {NOTIFS.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "14px 16px",
                borderRadius: 14,
                background: n.read ? T.white : T.greenSoft,
                border: `1px solid ${T.border}`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: T.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={17} color={T.green} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: n.read ? 600 : 700,
                    color: T.ink,
                  }}
                >
                  {n.title}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                  {n.time}
                </div>
              </div>
              {!n.read && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: T.gold,
                    marginTop: 4,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PROFILE
   ============================================================ */
function ProfileRow({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "15px 4px",
        background: "none",
        border: "none",
        borderBottom: `1px solid ${T.border}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: danger ? "#FDECEA" : T.greenSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={17} color={danger ? T.danger : T.green} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: danger ? T.danger : T.ink,
          }}
        >
          {label}
        </div>
        {value && (
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 1 }}>
            {value}
          </div>
        )}
      </div>
      {!danger && <ChevronRight size={18} color={T.inkSoft} />}
    </button>
  );
}

function ProfileScreen({ state }) {
  const username = state.auth?.username || "Utilisateur";
  const phone = state.auth?.phone || "+237 6XX XXX XXX";
  return (
    <div>
      <TopBar title="Profil" />
      <div style={{ padding: "18px 20px 32px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              boxShadow: "0 10px 24px -10px rgba(10,143,61,0.5)",
            }}
          >
            <span style={{ color: T.white, fontSize: 28, fontWeight: 800 }}>
              {username[0]?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ink }}>
            {username}
          </div>
          <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>
            Membre depuis le 12/06/2026
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <ProfileRow
            icon={Phone}
            label="Téléphone"
            value={phone}
            onClick={() => {}}
          />
          <ProfileRow
            icon={Package}
            label="Date d'inscription"
            value="12/06/2026"
            onClick={() => {}}
          />
          <ProfileRow
            icon={Gift}
            label="Mes récompenses"
            onClick={() => state.openSub("rewards")}
          />
          <ProfileRow
            icon={Bell}
            label="Notifications"
            onClick={() => state.openSub("notifications")}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <ProfileRow
            icon={ShieldCheck}
            label="Modifier mot de passe"
            onClick={() =>
              state.showToast(
                "Lien envoyé par SMS pour modifier le mot de passe.",
              )
            }
          />
          <ProfileRow
            icon={Smartphone}
            label="Modifier téléphone"
            onClick={() =>
              state.showToast(
                "Vérification SMS requise pour modifier le téléphone.",
              )
            }
          />
          <ProfileRow
            icon={MessageCircle}
            label="Assistance"
            onClick={() => state.openSub("support")}
          />
        </div>

        {state.auth?.role === "admin" && (
          <div style={{ marginBottom: 24 }}>
            <ProfileRow
              icon={Settings}
              label="Espace Administration"
              onClick={() => state.openSub("admin")}
            />
          </div>
        )}

        <ProfileRow
          icon={LogOut}
          label="Déconnexion"
          onClick={state.logout}
          danger
        />
      </div>
    </div>
  );
}

/* ============================================================
   SUPPORT
   ============================================================ */
const FAQ = [
  {
    q: "Comment effectuer un dépôt ?",
    a: "Rendez-vous dans Portefeuille > Dépôt, choisissez MTN ou Orange Money, puis suivez les instructions.",
  },
  {
    q: "Combien de temps prend un retrait ?",
    a: "Les retraits sont généralement traités sous 24h ouvrées.",
  },
  {
    q: "Comment fonctionne le parrainage ?",
    a: "Partagez votre code ou lien : vous gagnez une récompense à chaque achat validé de vos filleuls.",
  },
];

function SupportScreen({ state }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div>
      <TopBar title="Assistance" onBack={state.goBack} />
      <div style={{ padding: "18px 20px 32px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginBottom: 26,
          }}
        >
          {[
            {
              icon: MessageCircle,
              label: "Chat en ligne",
              sub: "Réponse en quelques minutes",
            },
            { icon: Mail, label: "E-mail", sub: "support@liondigital237.com" },
            { icon: Phone, label: "WhatsApp", sub: "+237 6XX XXX XXX" },
          ].map(({ icon: Icon, label, sub }) => (
            <button
              key={label}
              onClick={() => state.showToast(`Ouverture de ${label}...`)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: T.grayBg,
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  background: T.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={18} color={T.green} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
                  {label}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>

        <h3
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: T.ink,
            margin: "0 0 12px",
          }}
        >
          FAQ
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((f, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  background: T.white,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink }}>
                  {f.q}
                </span>
                <ChevronDown
                  size={18}
                  color={T.inkSoft}
                  style={{
                    transform: openIdx === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
              {openIdx === i && (
                <div
                  style={{
                    padding: "0 16px 14px",
                    fontSize: 13,
                    color: T.inkSoft,
                    lineHeight: 1.5,
                  }}
                >
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
/* ============================================================
   ADMIN DASHBOARD — 100% FONCTIONNEL
   ============================================================ */
function AdminScreen({ state }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // Charger les stats
  useEffect(() => {
    (async () => {
      try {
        const data = await api.request("/admin/stats");
        setStats(data);
      } catch (err) {
        state.showToast("Erreur chargement stats", "error");
      }
    })();
  }, []);

  // Charger les utilisateurs
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.request("/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      state.showToast("Erreur chargement utilisateurs", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, loadUsers]);

  // Traiter un retrait
  const processWithdrawal = async (withdrawalId, status) => {
    try {
      await api.request(`/admin/withdraw/${withdrawalId}/process`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      state.showToast(
        `Retrait ${status === "Refusé" ? "refusé" : "traité"} avec succès.`,
      );
      // Recharger historique
      await state.loadHistory();
    } catch (err) {
      state.showToast(err.message, "error");
    }
  };

  // Récupérer les retraits en attente
  const pendingWithdrawals = state.withdrawals.filter(
    (w) => w.status === "En cours",
  );

  // Dashboard
  if (tab === "dashboard") {
    return (
      <div>
        <TopBar title="Administration" onBack={state.goBack} />
        <div
          style={{
            padding: "18px 20px 16px",
            display: "flex",
            gap: 8,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          {[
            { key: "dashboard", label: "Stats" },
            { key: "users", label: "Utilisateurs" },
            {
              key: "withdrawals",
              label: `Retraits (${pendingWithdrawals.length})`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: tab === t.key ? "none" : `1.5px solid ${T.border}`,
                background: tab === t.key ? T.green : T.white,
                color: tab === t.key ? T.white : T.ink,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "18px 20px 32px" }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 14px",
            }}
          >
            Statistiques de la plateforme
          </h3>
          {!stats ? (
            <p style={{ color: T.inkSoft }}>Chargement...</p>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    background: T.greenSoft,
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <Users
                    size={24}
                    color={T.green}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>
                    {stats.totalUsers}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    Utilisateurs
                  </div>
                </div>
                <div
                  style={{
                    background: T.goldSoft,
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <Package
                    size={24}
                    color={T.gold}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.ink }}>
                    {stats.activeProductCount}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    Produits actifs
                  </div>
                </div>
                <div
                  style={{
                    background: "#E6F4EA",
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <ArrowDownToLine
                    size={24}
                    color={T.green}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.ink }}>
                    {formatFCFA(stats.totalDeposits)}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    Total dépôts
                  </div>
                </div>
                <div
                  style={{
                    background: "#FDEAEA",
                    borderRadius: 16,
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <ArrowUpFromLine
                    size={24}
                    color={T.danger}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.ink }}>
                    {formatFCFA(stats.totalWithdrawals)}
                  </div>
                  <div style={{ fontSize: 12, color: T.inkSoft }}>
                    Total retraits
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: T.grayBg,
                  borderRadius: 16,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>
                    Solde total plateforme
                  </span>
                  <span
                    style={{ fontSize: 18, fontWeight: 800, color: T.green }}
                  >
                    {formatFCFA(stats.totalBalance)}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>
                  Dernière mise à jour : {new Date().toLocaleString("fr-FR")}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Liste des utilisateurs
  if (tab === "users") {
    return (
      <div>
        <TopBar
          title="Utilisateurs"
          onBack={state.goBack}
          right={
            <button
              onClick={loadUsers}
              style={{
                background: T.greenSoft,
                border: "none",
                borderRadius: 10,
                width: 36,
                height: 36,
                cursor: "pointer",
                color: T.green,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          }
        />
        <div
          style={{
            padding: "0 20px 16px",
            display: "flex",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            { key: "dashboard", label: "Stats" },
            { key: "users", label: "Utilisateurs" },
            {
              key: "withdrawals",
              label: `Retraits (${pendingWithdrawals.length})`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: tab === t.key ? "none" : `1.5px solid ${T.border}`,
                background: tab === t.key ? T.green : T.white,
                color: tab === t.key ? T.white : T.ink,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 20px 32px" }}>
          {loading ? (
            <p style={{ color: T.inkSoft, textAlign: "center", padding: 20 }}>
              Chargement...
            </p>
          ) : users.length === 0 ? (
            <p style={{ color: T.inkSoft, textAlign: "center", padding: 20 }}>
              Aucun utilisateur trouvé.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: T.grayBg,
                    borderRadius: 14,
                    padding: "14px 16px",
                    borderLeft: `4px solid ${u.role === "admin" ? T.gold : T.green}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 14, fontWeight: 700, color: T.ink }}
                      >
                        {u.username}
                        {u.role === "admin" && (
                          <span
                            style={{
                              fontSize: 10,
                              background: T.gold,
                              color: T.ink,
                              padding: "2px 6px",
                              borderRadius: 6,
                              marginLeft: 8,
                            }}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}
                      >
                        {u.phone} · Inscrit le{" "}
                        {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: T.green,
                        }}
                      >
                        {formatFCFA(u.balance)}
                      </div>
                      <div style={{ fontSize: 11, color: T.inkSoft }}>
                        Récompenses: {formatFCFA(u.referralRewards)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Retraits en attente
  if (tab === "withdrawals") {
    return (
      <div>
        <TopBar title="Retraits en attente" onBack={state.goBack} />
        <div
          style={{
            padding: "0 20px 16px",
            display: "flex",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[
            { key: "dashboard", label: "Stats" },
            { key: "users", label: "Utilisateurs" },
            {
              key: "withdrawals",
              label: `Retraits (${pendingWithdrawals.length})`,
            },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                border: tab === t.key ? "none" : `1.5px solid ${T.border}`,
                background: tab === t.key ? T.green : T.white,
                color: tab === t.key ? T.white : T.ink,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 20px 32px" }}>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: T.ink,
              margin: "0 0 14px",
            }}
          >
            Retraits en attente ({pendingWithdrawals.length})
          </h3>
          {pendingWithdrawals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Check size={40} color={T.green} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: T.inkSoft }}>
                Aucun retrait en attente de traitement.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingWithdrawals.map((w) => (
                <div
                  key={w.id}
                  style={{
                    background: T.grayBg,
                    borderRadius: 14,
                    padding: "14px 16px",
                    borderLeft: `4px solid ${T.gold}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 15, fontWeight: 800, color: T.ink }}
                      >
                        {formatFCFA(w.amount)}
                      </div>
                      <div
                        style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}
                      >
                        {w.method} · {new Date(w.date).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.gold,
                        background: T.goldSoft,
                        padding: "4px 10px",
                        borderRadius: 8,
                      }}
                    >
                      En attente
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => processWithdrawal(w.id, "Traité")}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 10,
                        border: "none",
                        background: T.green,
                        color: T.white,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Valider le retrait
                    </button>
                    <button
                      onClick={() => processWithdrawal(w.id, "Refusé")}
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 10,
                        border: `1.5px solid ${T.danger}`,
                        background: T.white,
                        color: T.danger,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

/* ============================================================
   GLOBAL KEYFRAMES
   ============================================================ */
const styleTagId = "lion-digital-keyframes";
if (typeof document !== "undefined" && !document.getElementById(styleTagId)) {
  const tag = document.createElement("style");
  tag.id = styleTagId;
  tag.innerHTML = `
    @keyframes lionFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    * { box-sizing: border-box; }
    button:focus-visible, input:focus-visible { outline: 2px solid #0A8F3D; outline-offset: 2px; }
  `;
  document.head.appendChild(tag);
}

/* ============================================================
   EXPORT PRINCIPAL — TOUT À LA FIN
   ============================================================ */
export default function App() {
  const state = useAppState();
  if (state.screen === "welcome") return <WelcomeScreen state={state} />;
  if (state.screen === "register") return <RegisterScreen state={state} />;
  if (state.screen === "login") return <LoginScreen state={state} />;
  return <MainApp state={state} />;
}
