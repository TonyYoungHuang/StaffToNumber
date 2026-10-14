type NotificationLog = {
  warn: (fields: object, message: string) => void;
};

// Best effort only: checkout/payment responses must never await this promise.
// Each send must have its own deadline so the bounded retry can make progress.
export async function retryOperatorNotification(input: {
  send: () => Promise<unknown>;
  log: NotificationLog;
  orderId: string;
  retryDelayMs?: number;
}) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await input.send();
      return;
    } catch (error) {
      input.log.warn({ err: error, orderId: input.orderId, attempt }, "Operator notification failed; checkout/payment remains available.");
      if (attempt < 2) await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, input.retryDelayMs ?? 2_000);
        timer.unref();
      });
    }
  }
}
