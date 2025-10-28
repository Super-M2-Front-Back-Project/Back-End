const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (order_id) => {
  try {
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

    return {
      clientSecret: paymentIntent.client_secret,
      order_id: order.id,
      amount: totalAmount,
    };
  } catch (err) {
    console.error(err);
    return { error: err.message };
  }
};

module.exports = {
  createPaymentIntent,
};
