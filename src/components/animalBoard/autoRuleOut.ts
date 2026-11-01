// Auto rule-out setting: off until the player turns it on; kept on this device.
const KEY = 'critter-connect:auto-rule-out:v1';

export function isAutoRuleOutOn(): boolean {
  try { return window.localStorage.getItem(KEY) === 'on'; } catch { return false; }
}

export function setAutoRuleOutOn(value: boolean): void {
  try { window.localStorage.setItem(KEY, value ? 'on' : 'off'); } catch { /* kept for this visit only */ }
}
