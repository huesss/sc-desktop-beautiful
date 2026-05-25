import { LOCAL_PREMIUM_UNLOCK } from './constants';

let cachedPremium = LOCAL_PREMIUM_UNLOCK;

export function getIsPremium(): boolean {
  return LOCAL_PREMIUM_UNLOCK || cachedPremium;
}

export function setIsPremium(value: boolean): void {
  cachedPremium = value;
}
