// src/lib/copupEvents.js

export const COPUP_EVENTS = {
  AUTH_CHANGED: "copup:auth-changed",
  BALANCE_UPDATED: "copup:balance-updated",
  CART_UPDATED: "copup:cart-updated",
};

export function emitAuthChanged() {
  window.dispatchEvent(new Event(COPUP_EVENTS.AUTH_CHANGED));
}

export function emitBalanceUpdated(detail = undefined) {
  window.dispatchEvent(new CustomEvent(COPUP_EVENTS.BALANCE_UPDATED, { detail }));
}

export function emitCartUpdated(detail = undefined) {
  window.dispatchEvent(new CustomEvent(COPUP_EVENTS.CART_UPDATED, { detail }));
}
