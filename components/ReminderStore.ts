let payload: any = null;

export function setReminderPayload(p: any) {
  payload = p;
}

export function consumeReminderPayload() {
  const p = payload;
  payload = null;
  return p;
}
