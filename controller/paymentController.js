const { supabase } = require('../config/supabase');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (order_id) => {
  try {
    // Récupérer la commande depuis Supabase
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        id,
        user_id,
        total,
        status,
        items_order (
          id,
          product_id,
          quantity,
          products (
            name,
            price
          )
        )
      `
      )
      .eq("id", order_id)
      .single();

    if (error || !order) {
      throw new Error("Commande introuvable");
    }

    // Calcul du total à payer (en centimes)
    const totalAmount =
      order.items_order.reduce(
        (acc, item) => acc + item.products.price * item.quantity,
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
