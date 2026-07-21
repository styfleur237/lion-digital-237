import React, { useState } from "react";
import { ArrowLeft, Copy, CheckCircle, Loader, AlertCircle, Smartphone, ChevronRight } from "lucide-react";
import api from "../api";

const MERCHANT = {
  MTN: { name: "MTN Mobile Money", number: "654157406", dollar: "237" },
  ORANGE: { name: "Orange Money", number: "693850310", dollar: "237" },
};

export default function DepositScreen({ state }) {
  const [step, setStep] = useState("form"); // form → instructions → confirmation
  const [method, setMethod] = useState("MTN");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [depositId, setDepositId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const merchant = MERCHANT[method];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || parseInt(amount) < 100) {
      setError("Le montant minimum est de 100 FCFA");
      return;
    }
    if (!phone || phone.length < 9) {
      setError("Saisis ton numéro de téléphone");
      return;
    }

    setLoading(true);
    try {
      const res = await api.deposit(parseInt(amount), method, phone);
      setDepositId(res.deposit?.id || res.id);
      setStep("instructions");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError("");
    if (!transactionCode || transactionCode.length < 4) {
      setError("Saisis le code de transaction reçu par SMS");
      return;
    }

    setLoading(true);
    try {
      await api.confirmDeposit(depositId, transactionCode);
      setSuccess(true);
      setStep("confirmation");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    state.showToast("Copié !", "success");
  };

  const ussdCode = method === "MTN"
    ? `*126*${merchant.number}*${amount}#`
    : `#144#*${merchant.number}*${amount}#`;

  // Style commun
  const s = {
    container: { minHeight: "100vh", background: "#f5f7fa", paddingBottom: 40 },
    header: {
      background: `linear-gradient(135deg, #0f9d58, #f4b400)`,
      padding: "20px 20px 40px",
      color: "#fff",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    backBtn: { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    card: { background: "#fff", borderRadius: 16, padding: 20, margin: "-20px 16px 0", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" },
    input: { width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "0.2s" },
    label: { fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" },
    btn: (disabled) => ({
      width: "100%", padding: "14px", borderRadius: 12, border: "none",
      background: disabled ? "#cbd5e1" : "#0f9d58",
      color: "#fff", fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "0.2s",
    }),
    methodBtn: (active) => ({
      flex: 1, padding: "12px", borderRadius: 12, border: active ? "2px solid #0f9d58" : "1.5px solid #e2e8f0",
      background: active ? "#e6f4ea" : "#fff", cursor: "pointer",
      textAlign: "center", transition: "0.2s",
    }),
  };

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <button onClick={() => state.goBack()} style={s.backBtn}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Dépôt</h1>
            <p style={{ fontSize: 13, opacity: 0.85, margin: "2px 0 0" }}>Ajouter des fonds à ton compte</p>
          </div>
        </div>
      </div>

      {/* ÉTAPE 1 : Formulaire */}
      {step === "form" && (
        <div style={s.card}>
          <form onSubmit={handleSubmit}>
            {/* Montant */}
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Montant (FCFA)</label>
              <input
                type="number"
                placeholder="Ex: 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={s.input}
                min="100"
              />
            </div>

            {/* Méthode */}
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Méthode de paiement</label>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setMethod("MTN")} style={s.methodBtn(method === "MTN")}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>📱</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: method === "MTN" ? "#0f9d58" : "#475569" }}>MTN</div>
                </button>
                <button type="button" onClick={() => setMethod("ORANGE")} style={s.methodBtn(method === "ORANGE")}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>📱</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: method === "ORANGE" ? "#0f9d58" : "#475569" }}>Orange</div>
                </button>
              </div>
            </div>

            {/* Numéro */}
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Ton numéro {method} (celui avec lequel tu paies)</label>
              <input
                type="tel"
                placeholder="Ex: 691234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={s.input}
                maxLength="9"
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={s.btn(loading)}>
              {loading ? <Loader size={18} className="spin" /> : <Smartphone size={18} />}
              {loading ? "Traitement..." : "Obtenir les instructions"}
            </button>
          </form>
        </div>
      )}

      {/* ÉTAPE 2 : Instructions de paiement */}
      {step === "instructions" && (
        <div>
          <div style={s.card}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#e6f4ea", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Smartphone size={28} color="#0f9d58" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>Effectue le paiement</h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Suis les étapes ci-dessous</p>
            </div>

            {/* Étape 1 */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#0f9d58", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Envoie {parseInt(amount).toLocaleString()} FCFA au</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#0f9d58" }}>{merchant.number}</span>
                    <button onClick={() => copyToClipboard(merchant.number)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>({merchant.name})</div>
                </div>
              </div>
            </div>

            {/* Étape 2 */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f4b400", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Compose le code USSD suivant :</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <code style={{ fontSize: 16, fontWeight: 900, color: "#1e293b", background: "#e2e8f0", padding: "4px 10px", borderRadius: 8 }}>{ussdCode}</code>
                    <button onClick={() => copyToClipboard(ussdCode)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Depuis ton numéro <strong>{phone}</strong></div>
                </div>
              </div>
            </div>

            {/* Étape 3 */}
            <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Reviens ici et saisis le code reçu par SMS</div>
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginBottom: 14 }}>
              <label style={s.label}>Code de transaction (reçu par SMS)</label>
              <input
                type="text"
                placeholder="Ex: C9F6B2A1"
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                style={s.input}
                maxLength="20"
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button onClick={handleConfirm} disabled={loading} style={s.btn(loading)}>
              {loading ? <Loader size={18} className="spin" /> : <CheckCircle size={18} />}
              {loading ? "Vérification..." : "J'ai payé, valider"}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAPE 3 : Confirmation / En attente */}
      {step === "confirmation" && success && (
        <div style={s.card}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#e6f4ea", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size= {36} color="#0f9d58" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>Dépôt soumis !</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>
              Ton dépôt de <strong>{parseInt(amount).toLocaleString()} FCFA</strong> est en attente de validation.
            </p>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              L'administrateur va vérifier et créditer ton compte sous peu.
            </p>

            <div style={{
              background: "#f8fafc", borderRadius: 12, padding: 14, marginTop: 20,
              border: `1px dashed #cbd5e1`, textAlign: "left",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Récapitulatif</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
                <span>Montant</span>
                <span style={{ fontWeight: 700 }}>{parseInt(amount).toLocaleString()} FCFA</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569", marginBottom: 4 }}>
                <span>Méthode</span>
                <span style={{ fontWeight: 700 }}>{merchant.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#475569" }}>
                <span>Code transaction</span>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{transactionCode}</span>
              </div>
            </div>

            <button onClick={() => state.goTo("dashboard")} style={{
              marginTop: 24, width: "100%", padding: "14px", borderRadius: 12,
              border: "none", background: "#0f9d58", color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>
              Retour au tableau de bord
            </button>
          </div>
        </div>
      )}
    </div>
  );
}