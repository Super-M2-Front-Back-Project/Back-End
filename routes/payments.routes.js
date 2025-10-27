const express = require("express");
const { supabase } = require("../config/supabase");
const Stripe = require("stripe");
const dotenv = require("dotenv");

dotenv.config();

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/checkout/payment-intent", async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: "un ID de commande est requis" });
    }

    // Récupérer la commande depuis Supabase
    const { data: order, error } = await supabase
      .from("commandes")
      .select(
        `
        id,
        user_id,
        total,
        statut,
        items_commande (
          id,
          produit_id,
          quantite,
          produits (
            nom,
            prix
          )
        )
      `
      )
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    // Calcul du total à payer (en centimes)
    const totalAmount =
      order.items_commande.reduce(
        (acc, item) => acc + item.produits.prix * item.quantite,
        0
      ) * 100;

    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount),
      currency: "eur",
      metadata: { order_id: order.id },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      order_id: order.id,
      amount: totalAmount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
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
