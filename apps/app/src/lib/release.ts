import { APP_ROUTES } from "@score/shared";

export const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";

// Main-site access prompts use checkout. Shop activation is a direct URL entry.
export const accountActivationRoute = APP_ROUTES.checkout;
