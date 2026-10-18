import { normalizePaddleBillingEvent, normalizeStripeBillingEvent } from "./billing-events.js";
import { retrievePaddleSubscription, retrieveStripeSubscription } from "./payments.js";
import { billingSubscriptionVersion, BillingSnapshotRequiredError, processBillingWebhookEvent, type NormalizedBillingEvent } from "../repositories/billing-repository.js";
import type { RuntimeDatabaseLike } from "@score/runtime-database";

/** Notifications describe past observations. Rebuild subscription access from
 * the provider's current resource, retaining notification time as the ordering
 * fence so a slower, older HTTP request cannot overwrite a newer projection. */
export async function reconcileBillingSubscription(event: NormalizedBillingEvent, services = {
  stripe: retrieveStripeSubscription,
  paddle: retrievePaddleSubscription,
}, expectedSubscriptionVersion?: string | null): Promise<NormalizedBillingEvent> {
  if (!event.subscription) return event;
  const id = event.subscription.providerSubscriptionId;
  const snapshot = event.provider === "stripe"
    ? normalizeStripeBillingEvent({ id: event.eventId, type: "customer.subscription.updated",
      data: { object: await services.stripe(id) } }, Buffer.alloc(0))
    : normalizePaddleBillingEvent({ event_id: event.eventId, event_type: "subscription.updated",
      data: await services.paddle(id) }, Buffer.alloc(0));
  if (!snapshot?.subscription || snapshot.subscription.providerSubscriptionId !== id) {
    throw new Error("The provider subscription snapshot could not be verified.");
  }
  return { ...event, eventAt: event.eventAt ?? new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(), authoritativeSubscription: true,
    expectedSubscriptionVersion,
    subscription: { ...event.subscription, ...snapshot.subscription,
      userId: snapshot.subscription.userId ?? event.subscription.userId,
      organizationId: snapshot.subscription.organizationId ?? event.subscription.organizationId },
  };
}

export async function processReconciledBillingWebhook(database: RuntimeDatabaseLike, event: NormalizedBillingEvent,
  services?: Parameters<typeof reconcileBillingSubscription>[1]) {
  for (let attempt = 0; ; attempt++) {
    const expected = event.subscription ? billingSubscriptionVersion(database, event.provider, event.subscription.providerSubscriptionId) : undefined;
    const reconciled = await reconcileBillingSubscription(event, services, expected);
    try { return processBillingWebhookEvent(database, reconciled); }
    catch (error) {
      // Another connection committed while the network read was in flight.
      // Retrieve again against that committed version rather than applying an
      // earlier response. Persistent contention is retried by the provider.
      if (!(error instanceof BillingSnapshotRequiredError) || attempt >= 2) throw error;
    }
  }
}
