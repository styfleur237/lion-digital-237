// Placeholder pour notifications push/SMS
// À connecter avec un service réel (Firebase, Twilio, etc.)

const sendNotification = async (userId, title, body) => {
  console.log(`[NOTIFICATION] User ${userId}: ${title} — ${body}`);
  // TODO: Implémenter Firebase Cloud Messaging ou Twilio SMS
};

const notifyDeposit = async (user, amount) => {
  await sendNotification(
    user._id,
    "Dépôt confirmé",
    `${amount.toLocaleString("fr-FR")} FCFA crédités avec succès.`,
  );
};

const notifyWithdrawal = async (user, amount, status) => {
  await sendNotification(
    user._id,
    "Retrait traité",
    `Votre retrait de ${amount.toLocaleString("fr-FR")} FCFA est ${status}.`,
  );
};

const notifyDailyEarnings = async (user, amount) => {
  await sendNotification(
    user._id,
    "Rendement quotidien",
    `${amount.toLocaleString("fr-FR")} FCFA crédités sur votre compte.`,
  );
};

module.exports = {
  sendNotification,
  notifyDeposit,
  notifyWithdrawal,
  notifyDailyEarnings,
};
