import "server-only";
import { failedLocation, fromIpwhois, isReservedIp, privateLocation, type IpLocation } from "@/lib/ip-geo";

const ENDPOINT = "https://ipwho.is/";
const FIELDS = "success,message,country,country_code,region,city,latitude,longitude,timezone,connection";
const TTL_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 5;

// Locations rarely move, so repeat lookups within a day are answered from memory
// to stay well inside the free service's rate limits.
const cache = new Map<string, { at: number; value: IpLocation }>();

async function lookupOne(ip: string): Promise<IpLocation> {
  if (isReservedIp(ip)) return privateLocation(ip);
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const res = await fetch(`${ENDPOINT}${encodeURIComponent(ip)}?fields=${FIELDS}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return failedLocation(ip, `Lookup service returned HTTP ${res.status}.`);
    const value = fromIpwhois(ip, await res.json());
    if (value.status === "found") {
      if (cache.size > 5000) cache.clear();
      cache.set(ip, { at: Date.now(), value });
    }
    return value;
  } catch (error) {
    console.warn(JSON.stringify({ level: "warn", event: "ip_geo.lookup_failed", error: error instanceof Error ? error.message : String(error) }));
    return failedLocation(ip, "Couldn't reach the lookup service. Try again shortly.");
  }
}

/** Geolocates each address (a few at a time), keeping the input order. */
export async function locateIps(ips: string[]): Promise<IpLocation[]> {
  const results: IpLocation[] = new Array(ips.length);
  let next = 0;
  const worker = async () => {
    while (next < ips.length) {
      const i = next++;
      results[i] = await lookupOne(ips[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ips.length) }, worker));
  return results;
}
