import { Capacitor } from "@capacitor/core";

// On web (vite dev server in a desktop browser) "localhost" means
// your own machine, which is also where the backend runs -- fine.
//
// On a real Android emulator, "localhost" means the EMULATOR itself,
// not your dev machine, so Android's emulator reserves 10.0.2.2 as
// an alias back to the host. A physical phone needs your machine's
// LAN IP instead (e.g. 192.168.1.42) since it's not on the same box
// at all. Override API_BASE_URL below for that case.
function resolveApiBaseUrl(): string {
  const override = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (override) return override;

  if (Capacitor.getPlatform() === "android") {
    return "http://10.0.2.2:4000";
  }
  return "http://localhost:4000";
}

export const API_BASE_URL = resolveApiBaseUrl();
