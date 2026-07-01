// src/lib/copupEvents.js

export const COPUP_EVENTS = {
  AUTH_CHANGED: "copup:auth-changed",
  BALANCE_UPDATED: "copup:balance-updated",
};

export function emitAuthChanged() {
  window.dispatchEvent(new Event(COPUP_EVENTS.AUTH_CHANGED));
}

export function emitBalanceUpdated() {
  window.dispatchEvent(new Event(COPUP_EVENTS.BALANCE_UPDATED));
}