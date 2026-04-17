'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { KpiCard } from '../components/ui/kpi-card';
import { Sidebar } from '../components/ui/sidebar';
import { useAuth } from '../contexts/auth-context';
import { apiFetch } from '../lib/api';

interface Stats {
  activeTrips: number;
  completedTrips: number;
  monthIncome: number;
  monthExpenses: number;
  monthUtility: number;
  unitsInMaintenance?: number;
}

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<Stats>('/trips/dashboard-stats', { token })
      .then(setStats)
      .catch(() => null);
  }, [token]);

  const kpis = stats
    ? [
        { title: 'Viajes activos', value: String(stats.activeTrips), helper: 'En curso o por iniciar' },
        { title: 'Viajes completados', value: String(stats.completedTrips), helper: 'Mes actual' },
        { title: 'Ingresos del mes', value: fmt(stats.monthIncome), helper: 'Viajes cerrados' },
        { title: 'Gastos del mes', value: fmt(stats.monthExpenses), helper: 'Viajes cerrados + mantenimiento cerrado' },
        { title: 'Utilidad del mes', value: fmt(stats.monthUtility), helper: stats.monthUtility >= 0 ? 'Ingresos menos viajes y mantenimiento' : 'Ingresos por debajo de gastos operativos' },
        { title: 'Unidades en mant.', value: String(stats.unitsInMaintenance ?? 0), helper: 'Mantenimientos abiertos/en proceso' },
      ]
    : [
        { title: 'Viajes activos', value: '—', helper: '' },
        { title: 'Viajes completados', value: '—', helper: '' },
        { title: 'Ingresos del mes', value: '—', helper: '' },
        { title: 'Gastos del mes', value: '—', helper: '' },
        { title: 'Utilidad del mes', value: '—', helper: '' },
        { title: 'Unidades en mant.', value: '—', helper: '' },
      ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />

      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel">
          <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Dashboard operativo</p>
          <h2 className="mt-2 text-3xl font-semibold">Control central de operación logística</h2>
          <p className="mt-2 max-w-2xl text-sm text-sand/80">
            Vista inicial con indicadores clave, alertas y consulta rápida de viajes.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/90 p-6 shadow-panel flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-ink text-base">Módulo de Viajes</h3>
            <p className="text-sm text-ink/60 mt-1">Consulta, registra y gestiona viajes con gastos y utilidad en tiempo real.</p>
          </div>
          <Link
            href="/viajes"
            className="rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition"
          >
            Ver viajes →
          </Link>
        </div>
      </section>
    </main>
  );
}
