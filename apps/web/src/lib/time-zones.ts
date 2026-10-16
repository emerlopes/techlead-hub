import { DEFAULT_TIMEZONE } from "@tlh/shared-contracts";

/** Fusos IANA suportados pelo runtime, garantindo o atual e o padrão na lista. */
export function listTimeZones(current: string = DEFAULT_TIMEZONE): string[] {
  const zones = new Set(Intl.supportedValuesOf("timeZone"));
  zones.add(current);
  zones.add(DEFAULT_TIMEZONE);
  return [...zones].sort((a, b) => a.localeCompare(b));
}
