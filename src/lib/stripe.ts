import Stripe from "stripe";
import { requireStripeSecretKey } from "@/src/lib/env";

let stripeSingleton: Stripe | null = null;

export function getStripe() {
  if (stripeSingleton) return stripeSingleton;
  stripeSingleton = new Stripe(requireStripeSecretKey());
  return stripeSingleton;
}

