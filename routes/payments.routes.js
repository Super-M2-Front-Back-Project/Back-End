const express = require("express");
const { supabase } = require("../config/supabase");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const { createPaymentIntent } = require("../controller/paymentController");

dotenv.config();

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/checkout/payment-intent", async (req, res) => {
  const { order_id } = req.body;
  
  try {
    if (!order_id) {
      return res.status(400).json({ error: "un ID de commande est requis" });
    }

    const result = await createPaymentIntent(order_id);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.status(201).json({ message: "PaymentIntent créé avec succès", data: result });

  } catch (error) {
    console.error("Erreur lors de la création du PaymentIntent :", error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

router.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Signature invalide :", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 🎯 Gérer uniquement les événements utiles
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log("✅ Paiement réussi :", paymentIntent.id);

        // Récupérer l’ID de commande stocké dans metadata
        const orderId = paymentIntent.metadata?.order_id;

        if (orderId) {
          const { error } = await supabase
            .from("commandes")
            .update({
              statut: "payée",
              stripe_payment_id: paymentIntent.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          if (error) console.error("❌ Erreur Supabase :", error.message);
          else console.log(`✅ Commande ${orderId} mise à jour`);
        }
        break;

      case "payment_intent.payment_failed":
        const failedIntent = event.data.object;
        console.log("❌ Paiement échoué :", failedIntent.id);
        break;

      default:
        console.log(`⚠️ Événement non géré : ${event.type}`);
    }

    // Réponse obligatoire
    res.status(200).json({ received: true });
  }
);

module.exports = router;
