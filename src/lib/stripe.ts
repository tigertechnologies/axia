import Stripe from "stripe";

// Instanciação preguiçosa: não quebra o build se a env não estiver setada.
let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
  }
  return _stripe;
}
