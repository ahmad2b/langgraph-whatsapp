import type { IconComponent } from "@/components/icons";

/**
 * A single bordered strip of cells: one short title and one line each. Used for "What's included",
 * "Limits" and "Take it further" so all three read the same way. `tone` sets the icon tile colour.
 */
export type StripItem = { icon: IconComponent; t: string; d: string };

export function Strip({
  items,
  label,
  tone = "accent",
  columns = 4,
}: {
  items: StripItem[];
  label: string;
  tone?: "accent" | "neutral" | "idea";
  columns?: 3 | 4;
}) {
  return (
    <ul
      className={columns === 3 ? "wa-strip wa-strip-3" : "wa-strip"}
      aria-label={label}
      data-tone={tone}
    >
      {items.map((it, i) => (
        <li key={it.t}>
          <span className="wa-strip-icon">
            <it.icon aria-hidden="true" animate delay={i * 0.12} />
          </span>
          <h3>{it.t}</h3>
          <p>{it.d}</p>
        </li>
      ))}
    </ul>
  );
}
