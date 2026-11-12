const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret }      = require("firebase-functions/params");
const { default: fetch }    = require("node-fetch");

// Secretos — se configuran UNA vez con:
//   firebase functions:secrets:set WA_PHONE
//   firebase functions:secrets:set WA_APIKEY
const WA_PHONE  = defineSecret("WA_PHONE");
const WA_APIKEY = defineSecret("WA_APIKEY");

/**
 * alertaResenaNegatva
 * Se dispara cada vez que se crea un documento en /resenas.
 * Si el promedio de atencion + producto es <= 2, manda un WhatsApp.
 */
exports.alertaResenaNegativa = onDocumentCreated(
  { document: "resenas/{resenaId}", secrets: [WA_PHONE, WA_APIKEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const atencion = data.atencion || 0;
    const producto = data.producto || 0;
    const promedio = (atencion + producto) / 2;

    // Solo alertar si promedio <= 2 estrellas
    if (promedio > 2) return;

    const estrellas = "⭐".repeat(Math.round(promedio)) || "—";
    const comentario = data.comentario?.trim() || "Sin comentario";
    const fecha = data.fecha?.toDate
      ? data.fecha.toDate().toLocaleString("es-MX", { timeZone: "America/Guadalajara" })
      : "Ahora";

    const mensaje =
      `⚠️ *Reseña negativa — Roel Joyas*\n` +
      `${estrellas} *${promedio.toFixed(1)} / 5*\n\n` +
      `👤 Atención: ${atencion} ⭐\n` +
      `💎 Producto: ${producto} ⭐\n\n` +
      `💬 "${comentario}"\n\n` +
      `🕐 ${fecha}`;

    const phone  = WA_PHONE.value();
    const apikey = WA_APIKEY.value();
    const url    = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(mensaje)}&apikey=${encodeURIComponent(apikey)}`;

    try {
      const res = await fetch(url);
      console.log(`[alertaResenaNegativa] CallMeBot status: ${res.status}`);
    } catch (err) {
      console.error("[alertaResenaNegativa] Error al enviar WhatsApp:", err.message);
    }
  }
);
