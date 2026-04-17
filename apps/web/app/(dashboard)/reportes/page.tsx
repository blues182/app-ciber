'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type Dataset = 'trips' | 'maintenance' | 'inventory';
type Format = 'xlsx' | 'pdf';

interface Overview {
  trips: { total: number; totalIncome: number; totalExpenses: number; totalUtility: number };
  maintenance: { total: number; totalCost: number; closed: number };
  inventory: { totalMovements: number; stockOutUnits: number };
}

interface ReportCard {
  label: string;
  value: string | number;
  hint: string;
}

export default function ReportesPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string>('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      setOverview(await apiFetch<Overview>(`/reports/overview?${params.toString()}`, { token }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function download(dataset: Dataset, format: Format) {
    if (!token) return;
    const key = `${dataset}-${format}`;
    setDownloading(key);
    try {
      const params = new URLSearchParams({ dataset, format });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await fetch(`${API_BASE}/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error((err as { message?: string }).message ?? 'Error al exportar');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataset}-report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDownloading('');
    }
  }

  const cards: ReportCard[] = overview ? [
    { label: 'Viajes', value: overview.trips.total, hint: `Utilidad ${money(overview.trips.totalUtility)}` },
    { label: 'Ingresos', value: money(overview.trips.totalIncome), hint: `Gastos ${money(overview.trips.totalExpenses)}` },
    { label: 'Mantenimiento', value: money(overview.maintenance.totalCost), hint: `${overview.maintenance.closed} cerrados` },
    { label: 'Movimientos inventario', value: overview.inventory.totalMovements, hint: `Salidas ${overview.inventory.stockOutUnits}` },
  ] : [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel">
          <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Fase 4</p>
          <h1 className="mt-2 text-3xl font-semibold">Reportes</h1>
          <p className="mt-2 max-w-2xl text-sm text-sand/80">Vista consolidada de operación y exportación directa a Excel o PDF para viajes, mantenimiento e inventario.</p>
        </header>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink/50">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink/50">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink" />
          </div>
          <button onClick={() => void load()} className="rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">Actualizar</button>
          <button onClick={() => { setFrom(''); setTo(''); }} className="rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
        </div>

        {error && <div className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {loading ? Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-2xl border border-black/10 bg-white p-5 shadow-panel">
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 w-24 rounded bg-sand" />
                  <div className="h-8 w-28 rounded bg-sand" />
                  <div className="h-3 w-32 rounded bg-sand" />
                </div>
            </article>
          )) : cards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-panel">
                <>
                  <p className="text-sm uppercase tracking-wider text-ink/45">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{card.value}</p>
                  <p className="mt-2 text-sm text-ink/55">{card.hint}</p>
                </>
            </article>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {([
            { dataset: 'trips', title: 'Viajes', text: 'Rentabilidad, ingresos, gastos y estado operativo.' },
            { dataset: 'maintenance', title: 'Mantenimiento', text: 'Costos, estatus y carga de trabajo por unidad.' },
            { dataset: 'inventory', title: 'Inventario', text: 'Entradas, salidas y consumo de refacciones.' },
          ] as const).map((item) => (
            <article key={item.dataset} className="rounded-2xl border border-black/10 bg-white p-5 shadow-panel">
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Exportación</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 text-sm text-ink/60">{item.text}</p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => void download(item.dataset, 'xlsx')} disabled={!!downloading} className="flex-1 rounded-xl bg-clay/50 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-clay transition disabled:opacity-50">{downloading === `${item.dataset}-xlsx` ? 'Generando…' : 'Excel'}</button>
                <button onClick={() => void download(item.dataset, 'pdf')} disabled={!!downloading} className="flex-1 rounded-xl bg-steel px-4 py-2.5 text-sm font-semibold text-sand hover:bg-steel/85 transition disabled:opacity-50">{downloading === `${item.dataset}-pdf` ? 'Generando…' : 'PDF'}</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function money(value: number) {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
