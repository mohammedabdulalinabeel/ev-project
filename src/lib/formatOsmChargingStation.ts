/** Map Overpass/OSM charging_station elements to UI-friendly strings. */

export type OsmTags = Record<string, string | undefined>;

const EV_FALLBACK_NAME = "EV Charging Station";

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function chargingStationDisplayName(tags: OsmTags | undefined): string {
  if (!tags) return EV_FALLBACK_NAME;

  const name = tags.name || tags["name:en"] || tags.official_name;
  const brand = tags.brand;
  const operator = tags.operator;
  const network = tags.network;
  const ref = tags.ref;
  const shortName = tags.short_name;
  const description = tags.description;
  const owner = tags.owner;

  if (name) {
    if (brand && brand !== name) return `${name} (${brand})`;
    if (operator && operator !== name) return `${name} (${operator})`;
    return name;
  }

  if (shortName) return shortName;

  if (operator && brand && operator.trim() !== brand.trim()) {
    return `${operator.trim()} · ${brand.trim()}`;
  }
  if (operator) return operator.trim();
  if (owner && (!brand || owner.trim() !== brand.trim())) {
    if (brand) return `${owner.trim()} · ${brand.trim()}`;
    return owner.trim();
  }
  if (brand) return brand.trim();
  if (network) return `${network.trim()} (${EV_FALLBACK_NAME})`;
  if (ref) return `${EV_FALLBACK_NAME} (${ref})`;

  if (description) {
    const line = description.split(/[\n\r]/)[0]?.trim();
    if (line) return truncate(line, 72);
  }

  return EV_FALLBACK_NAME;
}

export function chargingStationAddress(tags: OsmTags | undefined): string {
  if (!tags) return "Address not mapped in OSM";

  if (tags["addr:full"]) return tags["addr:full"];

  const line1 = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ")
    .trim();

  const line2 = [
    tags["addr:neighbourhood"],
    tags["addr:suburb"],
    tags["addr:district"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ]
    .filter(Boolean)
    .join(", ");

  const combined = [line1, line2].filter(Boolean).join(" · ");
  if (combined) return combined;
  if (tags["addr:place"]) return tags["addr:place"];
  return "Address not mapped in OSM";
}

/** Summarize socket:* keys and basic electrical tags. */
export function chargingStationConnectors(tags: OsmTags | undefined): string {
  if (!tags) return "Connectors not mapped in OSM";

  const socketEntries = Object.entries(tags)
    .filter(([k]) => k.startsWith("socket:"))
    .map(([k, v]) => {
      const label = k
        .replace(/^socket:/, "")
        .replace(/_/g, " ")
        .toUpperCase();
      const val = (v || "").trim();
      return val && val !== "yes" ? `${label} (${val})` : label;
    });

  if (socketEntries.length > 0) {
    return socketEntries.slice(0, 5).join(" · ");
  }

  const bits: string[] = [];
  if (tags.voltage) bits.push(`${tags.voltage} V`);
  if (tags.amperage) bits.push(`${tags.amperage} A`);
  if (tags.capacity) bits.push(`${tags.capacity} bay(s)`);
  if (tags.access && tags.access !== "yes")
    bits.push(`access: ${tags.access}`);

  if (bits.length) return bits.join(" · ");
  return "Connectors not mapped in OSM";
}
