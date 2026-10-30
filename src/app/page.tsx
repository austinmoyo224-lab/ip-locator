import { Globe2, LogOut, MapPin } from "lucide-react";
import Link from "next/link";
import { logout, scanIps } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, CardHeader, cn, Empty, fieldClass, Notice, Stat } from "@/components/ui";
import { countryFlag, extractIps, filterLocations, groupByCountry, MAX_IPS, type IpLocation } from "@/lib/ip-geo";
import { locateIps } from "@/lib/locate";

const chip = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors";
const chipOn = "border-ink bg-ink text-white";
const chipOff = "border-line bg-white hover:border-ink/30";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function place(r: IpLocation): string {
  return [r.city, r.region !== r.city ? r.region : null, r.country].filter(Boolean).join(", ");
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const ips = extractIps(first(params.ips) ?? "").slice(0, MAX_IPS);
  const country = first(params.country)?.toUpperCase() ?? null;
  const city = first(params.city) ?? null;
  const skipped = Number(first(params.skipped)) || 0;

  const results = ips.length ? await locateIps(ips) : [];
  const groups = groupByCountry(results);
  const shown = filterLocations(results, { country, city });
  const selected = groups.find((g) => g.code === country) ?? null;
  const located = results.filter((r) => r.status === "found").length;
  const privateCount = results.filter((r) => r.status === "private").length;
  const failed = results.length - located - privateCount;

  const href = (next: { country?: string | null; city?: string | null }) => {
    const q = new URLSearchParams({ ips: ips.join(",") });
    if (next.country) q.set("country", next.country);
    if (next.city) q.set("city", next.city);
    return `/?${q}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lime">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">IP Locator</h1>
            <p className="text-sm text-muted">Paste IP addresses or raw logs, see where each one is, then pick a country or city.</p>
          </div>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm text-muted hover:bg-mist hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </header>

      <Card className="mb-6">
        <form action={scanIps} className="space-y-3 p-5">
          <label htmlFor="text" className="text-sm font-medium">
            Addresses or log text
          </label>
          <textarea
            id="text"
            name="text"
            required
            defaultValue={ips.join("\n")}
            placeholder={"41.74.179.194\n2c0f:f4c0::1\n[30/Oct/2026:09:12:01] 102.65.3.10 GET /login 200"}
            className={cn(fieldClass, "min-h-36 py-3 font-mono text-xs leading-relaxed")}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">IPv4 and IPv6, ports and duplicates ignored. Up to {MAX_IPS} addresses per scan.</p>
            <SubmitButton pendingLabel="Locating…">Scan &amp; locate</SubmitButton>
          </div>
        </form>
      </Card>

      {first(params.empty) && <Notice>No IP addresses were found in that text.</Notice>}
      {skipped > 0 && (
        <Notice>
          Only the first {MAX_IPS} addresses were located; {skipped} more were skipped. Scan them in another batch.
        </Notice>
      )}

      {results.length === 0 ? (
        <Card>
          <Empty icon={<Globe2 />} title="Nothing scanned yet" description="Results show here with country, city, network and a map link." />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Addresses" value={results.length} accent />
            <Stat label="Located" value={located} hint={`${groups.length} ${groups.length === 1 ? "country" : "countries"}`} />
            <Stat label="Private / local" value={privateCount} hint="No public location" />
            <Stat label="Not found" value={failed} />
          </div>

          {groups.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="Pick a country" description="Choose a country to see only its addresses, then narrow to a city." />
              <nav aria-label="Filter by country" className="flex flex-wrap gap-2 p-5">
                <Link href={href({})} className={cn(chip, !country ? chipOn : chipOff)} aria-current={!country ? "true" : undefined}>
                  All countries <span className="opacity-70">{located}</span>
                </Link>
                {groups.map((g) => (
                  <Link
                    key={g.code}
                    href={href({ country: g.code })}
                    className={cn(chip, country === g.code ? chipOn : chipOff)}
                    aria-current={country === g.code ? "true" : undefined}
                  >
                    <span aria-hidden>{countryFlag(g.code)}</span> {g.name} <span className="opacity-70">{g.count}</span>
                  </Link>
                ))}
              </nav>
              {selected && selected.cities.length > 0 && (
                <nav aria-label={`Filter ${selected.name} by city`} className="flex flex-wrap gap-2 border-t border-line p-5">
                  <span className="self-center text-xs font-medium uppercase tracking-wider text-muted">Cities in {selected.name}</span>
                  <Link href={href({ country: selected.code })} className={cn(chip, !city ? chipOn : chipOff)}>
                    All cities
                  </Link>
                  {selected.cities.map((c) => {
                    const on = city?.toLowerCase() === c.name.toLowerCase();
                    return (
                      <Link
                        key={c.name}
                        href={href({ country: selected.code, city: c.name })}
                        className={cn(chip, on ? chipOn : chipOff)}
                        aria-current={on ? "true" : undefined}
                      >
                        <MapPin className="size-3.5" aria-hidden /> {c.name} <span className="opacity-70">{c.count}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </Card>
          )}

          <Card>
            <CardHeader
              title={city ? `Addresses in ${city}` : selected ? `Addresses in ${selected.name}` : "All addresses"}
              description={`${shown.length} of ${results.length}`}
            />
            {shown.length === 0 ? (
              <Empty icon={<MapPin />} title="No addresses match" description="Pick another country or city." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm [&_td]:px-5 [&_td]:py-3.5 [&_th]:px-5 [&_th]:py-3 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted">
                  <caption className="sr-only">IP address locations</caption>
                  <thead className="border-b border-line">
                    <tr>
                      <th>IP address</th>
                      <th>Location</th>
                      <th>Network</th>
                      <th>Time zone</th>
                      <th>
                        <span className="sr-only">Map</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr]:border-b [&_tr]:border-line/70 [&_tr:last-child]:border-0">
                    {shown.map((r) => (
                      <tr key={r.ip}>
                        <td className="font-mono text-xs">{r.ip}</td>
                        <td>
                          {r.status === "found" ? (
                            <span>
                              <span aria-hidden>{countryFlag(r.countryCode)} </span>
                              {place(r) || "Unknown"}
                            </span>
                          ) : r.status === "private" ? (
                            <Badge>Private / local network</Badge>
                          ) : (
                            <Badge tone="danger" title={r.error ?? undefined}>
                              {r.error ?? "Not found"}
                            </Badge>
                          )}
                        </td>
                        <td className="text-muted">
                          {r.isp ?? "—"}
                          {r.asn && <span className="block text-xs">AS{r.asn}</span>}
                        </td>
                        <td className="text-muted">{r.timezone ?? "—"}</td>
                        <td className="text-right">
                          {r.latitude !== null && r.longitude !== null && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=11/${r.latitude}/${r.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium underline-offset-4 hover:underline"
                            >
                              Map
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="border-t border-line px-5 py-3 text-xs text-muted">
              Locations come from ipwho.is and are approximate: usually right for the country, often the nearest large city for mobile and business
              networks, and the VPN exit for VPN users.
            </p>
          </Card>
        </>
      )}
    </main>
  );
}
