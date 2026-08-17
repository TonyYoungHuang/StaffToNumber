import { APP_ROUTES } from "@score/shared";

export const checkoutAvailable = process.env.NEXT_PUBLIC_CHECKOUT_AVAILABLE === "true";

export const accountActivationRoute = checkoutAvailable ? APP_ROUTES.checkout : APP_ROUTES.activate;
