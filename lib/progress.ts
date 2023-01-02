let handler: { cancel: () => void } = { cancel: () => {} };

export function progress(msg: string, options: NotificationOptions = {}) {
  handler.cancel();
  handler = figma.notify(msg, options);
}
