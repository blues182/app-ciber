'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface AuditLogItem {
  id: string;
  module: string;
  action: string;
  recordId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface Paginated {
  items: AuditLogItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const MODULES = ['', 'users', 'trips', 'trailers', 'drivers', 'clients', 'providers', 'maintenance', 'inventory', 'documents'];
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE', 'TRIP_CLOSE', 'MAINTENANCE_CLOSE', 'INVENTORY_MOVEMENT'];

export default function AuditoriaPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated | null>(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' });
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      setData(await apiFetch<Paginated>(`/audit?${params.toString()}`, { token }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, moduleFilter, actionFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel">
          <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Fase 4</p>
          <h1 className="mt-2 text-3xl font-semibold">Auditoría</h1>
          <p className="mt-2 max-w-2xl text-sm text-sand/80">Consulta centralizada de eventos críticos del sistema con filtros por módulo y acción.</p>
        </header>

        <div className="flex flex-wrap gap-3">
          <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink">
            {MODULES.map((value) => <option key={value || 'all'} value={value}>{value || 'Todos los módulos'}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink">
            {ACTIONS.map((value) => <option key={value || 'all'} value={value}>{value || 'Todas las acciones'}</option>)}
          </select>
          <button onClick={() => { setModuleFilter(''); setActionFilter(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
          {error && <div className="px-6 py-4 text-alert text-sm">{error}</div>}
          {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
            <table className="w-full text-left text-sm">
              <thead className="bg-sand/50 text-xs uppercase tracking-wider text-ink/70">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {!data?.items.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink/40">Sin eventos registrados.</td></tr>}
                {data?.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-sand/10 transition">
                    <td className="px-4 py-3 text-ink/60">{new Date(item.createdAt).toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{item.user.name}</p>
                      <p className="text-xs text-ink/50">{item.user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium uppercase text-ink/70">{item.module}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-steel/10 px-2.5 py-1 text-xs font-medium text-steel">{item.action}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{item.recordId}</td>
                    <td className="px-4 py-3 text-xs text-ink/70">{item.metadata ? JSON.stringify(item.metadata) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-ink/60">
              <span>{data.pagination.total} eventos</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Anterior</button>
                <span className="px-2 py-1">{page} / {data.pagination.totalPages}</span>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
