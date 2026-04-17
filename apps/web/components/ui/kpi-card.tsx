interface KpiCardProps {
  title: string;
  value: string;
  helper: string;
}

export function KpiCard({ title, value, helper }: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white/90 p-5 shadow-panel">
      <p className="text-sm text-black/65">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-steel">{value}</p>
      <p className="mt-1 text-xs text-moss">{helper}</p>
    </article>
  );
}
