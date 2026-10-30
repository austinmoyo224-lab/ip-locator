import { describe, expect, it } from "vitest";
import { countryFlag, extractIps, failedLocation, filterLocations, fromIpwhois, groupByCountry, isReservedIp, privateLocation } from "./ip-geo";

describe("extractIps", () => {
  it("finds IPv4 and IPv6 in lists and raw logs, without ports or duplicates", () => {
    const log = [
      '41.74.179.194 - - [30/Oct/2026:09:12:01 +0200] "GET /login HTTP/1.1" 200',
      "client=102.65.3.10:52344, upstream [2c0f:F4C0::1]:443",
      "41.74.179.194; fe80::1%eth0 then 8.8.8.8.",
      "not ips: 999.1.1.1 1.2.3 12:30:45 v1.2.3.4",
    ].join("\n");
    expect(extractIps(log)).toEqual(["41.74.179.194", "102.65.3.10", "2c0f:f4c0::1", "fe80::1", "8.8.8.8"]);
  });

  it("returns nothing for text without addresses", () => {
    expect(extractIps("")).toEqual([]);
    expect(extractIps("hello world")).toEqual([]);
  });
});

describe("isReservedIp", () => {
  it("flags private, loopback, link-local and documentation ranges", () => {
    for (const ip of [
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "127.0.0.1",
      "169.254.1.1",
      "100.64.0.1",
      "203.0.113.5",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:192.168.0.1",
    ]) {
      expect(isReservedIp(ip), ip).toBe(true);
    }
  });

  it("leaves public addresses alone", () => {
    for (const ip of ["41.74.179.194", "8.8.8.8", "172.32.0.1", "2c0f:f4c0::1", "::ffff:8.8.8.8"]) {
      expect(isReservedIp(ip), ip).toBe(false);
    }
  });
});

describe("fromIpwhois", () => {
  it("maps a successful response", () => {
    const loc = fromIpwhois("41.74.179.194", {
      success: true,
      country: "South Africa",
      country_code: "za",
      region: "Gauteng",
      city: "Johannesburg",
      latitude: -26.2,
      longitude: 28.04,
      timezone: { id: "Africa/Johannesburg" },
      connection: { asn: 37153, org: "Hetzner SA", isp: "xneelo" },
    });
    expect(loc).toMatchObject({
      status: "found",
      country: "South Africa",
      countryCode: "ZA",
      city: "Johannesburg",
      latitude: -26.2,
      timezone: "Africa/Johannesburg",
      isp: "xneelo",
      asn: 37153,
    });
  });

  it("reports failures from the service", () => {
    expect(fromIpwhois("1.1.1.1", { success: false, message: "Reserved range" })).toMatchObject({ status: "error", error: "Reserved range" });
    expect(fromIpwhois("1.1.1.1", null).status).toBe("error");
  });
});

const found = (ip: string, countryCode: string, country: string, city: string | null) => ({
  ...fromIpwhois(ip, { success: true, country, country_code: countryCode, city }),
});

const sample = [
  found("1.0.0.1", "ZA", "South Africa", "Johannesburg"),
  found("1.0.0.2", "ZA", "South Africa", "Cape Town"),
  found("1.0.0.3", "ZA", "South Africa", "Johannesburg"),
  found("1.0.0.4", "US", "United States", "Ashburn"),
  found("1.0.0.5", "GB", "United Kingdom", null),
  privateLocation("10.0.0.1"),
  failedLocation("1.0.0.6", "timeout"),
];

describe("groupByCountry", () => {
  it("counts countries and cities, busiest first", () => {
    expect(groupByCountry(sample)).toEqual([
      {
        code: "ZA",
        name: "South Africa",
        count: 3,
        cities: [
          { name: "Johannesburg", count: 2 },
          { name: "Cape Town", count: 1 },
        ],
      },
      { code: "GB", name: "United Kingdom", count: 1, cities: [] },
      { code: "US", name: "United States", count: 1, cities: [{ name: "Ashburn", count: 1 }] },
    ]);
  });
});

describe("filterLocations", () => {
  it("keeps everything without a filter", () => {
    expect(filterLocations(sample, {})).toHaveLength(sample.length);
  });

  it("filters by country and by city, case-insensitively", () => {
    expect(filterLocations(sample, { country: "za" }).map((r) => r.ip)).toEqual(["1.0.0.1", "1.0.0.2", "1.0.0.3"]);
    expect(filterLocations(sample, { country: "ZA", city: "johannesburg" }).map((r) => r.ip)).toEqual(["1.0.0.1", "1.0.0.3"]);
    expect(filterLocations(sample, { city: "Ashburn" }).map((r) => r.ip)).toEqual(["1.0.0.4"]);
    expect(filterLocations(sample, { country: "FR" })).toEqual([]);
  });
});

describe("countryFlag", () => {
  it("builds a flag from a country code", () => {
    expect(countryFlag("ZA")).toBe("🇿🇦");
    expect(countryFlag(null)).toBe("");
    expect(countryFlag("zz1")).toBe("");
  });
});
