import { BlockList, isIP } from "node:net";

/** Most addresses one lookup will geolocate; the rest are reported as skipped. */
export const MAX_IPS = 100;

export type IpLocation = {
  ip: string;
  status: "found" | "private" | "error";
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  isp: string | null;
  asn: number | null;
  error: string | null;
};

export type CountryGroup = { code: string; name: string; count: number; cities: { name: string; count: number }[] };

/** Ranges that never resolve to a physical location: private, loopback, link-local, multicast, documentation. */
const reserved = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
] as const) {
  reserved.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 127],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
] as const) {
  reserved.addSubnet(net, prefix, "ipv6");
}

/** True for addresses with no public location (private networks, localhost and the like). */
export function isReservedIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return false;
  const mapped = family === 6 && /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped) return reserved.check(mapped[1], "ipv4");
  return reserved.check(ip, family === 4 ? "ipv4" : "ipv6");
}

/**
 * Pulls every IPv4/IPv6 address out of free text (a list, a CSV column or raw
 * server logs), dropping ports and duplicates and keeping first-seen order.
 */
export function extractIps(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,;|"'`()[\]<>{}=]+/)) {
    let token = raw.replace(/^[.:]+|[.]+$/g, "");
    // 203.0.113.9:443 → 203.0.113.9 (an IPv6 port only appears in brackets, which the split removes)
    const v4port = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(token);
    if (v4port) token = v4port[1];
    token = token.replace(/%.*$/, ""); // fe80::1%eth0 zone id
    const family = isIP(token);
    if (family === 0) continue;
    seen.add(family === 6 ? token.toLowerCase() : token);
  }
  return [...seen];
}

const blank = (ip: string): IpLocation => ({
  ip,
  status: "error",
  country: null,
  countryCode: null,
  region: null,
  city: null,
  latitude: null,
  longitude: null,
  timezone: null,
  isp: null,
  asn: null,
  error: null,
});

export function privateLocation(ip: string): IpLocation {
  return { ...blank(ip), status: "private" };
}

export function failedLocation(ip: string, error: string): IpLocation {
  return { ...blank(ip), error };
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Maps an ipwho.is response body onto our shape. */
export function fromIpwhois(ip: string, body: unknown): IpLocation {
  if (!body || typeof body !== "object") return failedLocation(ip, "Unexpected response from the lookup service.");
  const b = body as Record<string, unknown>;
  if (b.success !== true) return failedLocation(ip, str(b.message) ?? "The lookup service couldn't locate this address.");
  const connection = (b.connection ?? {}) as Record<string, unknown>;
  const timezone = (b.timezone ?? {}) as Record<string, unknown>;
  const code = str(b.country_code);
  return {
    ...blank(ip),
    status: "found",
    country: str(b.country),
    countryCode: code ? code.toUpperCase() : null,
    region: str(b.region),
    city: str(b.city),
    latitude: num(b.latitude),
    longitude: num(b.longitude),
    timezone: str(timezone.id),
    isp: str(connection.isp) ?? str(connection.org),
    asn: num(connection.asn),
  };
}

/** Countries (most addresses first) with their cities, for the "pick a country / city" filter. */
export function groupByCountry(results: IpLocation[]): CountryGroup[] {
  const countries = new Map<string, { name: string; count: number; cities: Map<string, number> }>();
  for (const r of results) {
    if (r.status !== "found" || !r.countryCode) continue;
    const c = countries.get(r.countryCode) ?? { name: r.country ?? r.countryCode, count: 0, cities: new Map() };
    c.count += 1;
    if (r.city) c.cities.set(r.city, (c.cities.get(r.city) ?? 0) + 1);
    countries.set(r.countryCode, c);
  }
  const byCount = <T extends { name: string; count: number }>(a: T, b: T) => b.count - a.count || a.name.localeCompare(b.name);
  return [...countries]
    .map(([code, c]) => ({
      code,
      name: c.name,
      count: c.count,
      cities: [...c.cities].map(([name, count]) => ({ name, count })).sort(byCount),
    }))
    .sort(byCount);
}

/** Keeps the addresses in the chosen country and, optionally, city (case-insensitive). */
export function filterLocations(results: IpLocation[], filter: { country?: string | null; city?: string | null }): IpLocation[] {
  const country = filter.country?.trim().toUpperCase() || null;
  const city = filter.city?.trim().toLowerCase() || null;
  if (!country && !city) return results;
  return results.filter((r) => r.status === "found" && (!country || r.countryCode === country) && (!city || r.city?.toLowerCase() === city));
}

/** Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code. */
export function countryFlag(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}
