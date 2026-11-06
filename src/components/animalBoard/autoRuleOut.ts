// Auto rule-out setting: on unless the player turned it off (a stored 'off' wins; blocked storage: on); kept on this device.
const KEY = 'critter-connect:auto-rule-out:v1';

export function isAutoRuleOutOn(): boolean {
  try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setAutoRuleOutOn(value: boolean): void {
  try { window.localStorage.setItem(KEY, value ? 'on' : 'off'); } catch { /* kept for this visit only */ }
}
