interface LegendItem {
  label: string;
  value?: string;
  color: string;
  ariaLabel?: string;
}

interface ChartLegendProps {
  items: LegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      role="list"
      className={`grid gap-3 text-sm text-slate-600 sm:grid-cols-2 ${className ?? ""}`.trim()}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2"
          aria-label={item.ariaLabel ?? item.label}
        >
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
          {item.value ? (
            <span className="font-medium text-slate-900">{item.value}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
