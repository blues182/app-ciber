'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface Remolque {
  id: string;
  economicNumber: string;
  plates: string | null;
  mileage: number | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}
interface Paginated { items: Remolque[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }

export default function RemolquesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Remolque | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      setData(await apiFetch<Paginated>(`/remolques?${params}`, { token }));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token, search, page]);

  useEffect(() => { void load(); }, [load]);

  async function removeRemolque(id: string) {
    if (!confirm('¿Eliminar este remolque por completo? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    setError('');
    try { await apiFetch(`/remolques/${id}`, { method: 'DELETE', token }); void load(); }
    catch (e) { setError((e as Error).message); }
    finally { setDeletingId(null); }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Catálogo</p>
            <h1 className="text-2xl font-bold">Remolques</h1>
          </div>
          <button onClick={() => setShowNew(true)} className="rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">+ Nuevo remolque</button>
        </header>

        <div className="flex gap-3">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por número económico..."
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50 w-64" />
          <button onClick={() => { setSearch(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
          {error && <div className="px-6 py-4 text-alert text-sm">{error}</div>}
          {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
            <table className="w-full text-sm text-left">
              <thead className="bg-sand/50 text-ink/70 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">No. económico</th>
                  <th className="px-4 py-3">Placas</th>
                  <th className="px-4 py-3">Marca</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Km</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Alta</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {!data?.items.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-ink/40">Sin remolques registrados.</td></tr>}
                {data?.items.map(r => (
                  <tr key={r.id} className="hover:bg-sand/10 transition">
                    <td className="px-4 py-3 font-medium">{r.economicNumber}</td>
                    <td className="px-4 py-3 text-ink/70">{r.plates ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{r.brand ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{r.model ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{r.color ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{r.mileage != null ? r.mileage.toLocaleString('es-MX') : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${r.status === 'ACTIVE' ? 'bg-moss/20 text-moss' : 'bg-black/10 text-ink/50'}`}>
                        {r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{r.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button type="button" onClick={() => setEditing(r)} className="text-xs text-steel hover:text-ink underline">Editar</button>
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={() => void removeRemolque(r.id)}
                        className="text-xs text-alert hover:text-alert/70 underline disabled:opacity-50"
                      >
                        {deletingId === r.id ? 'Eliminando…' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 text-sm text-ink/60">
              <span>{data.pagination.total} registros</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 hover:bg-sand/30 transition">Anterior</button>
                <span className="px-2 py-1">{page} / {data.pagination.totalPages}</span>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 hover:bg-sand/30 transition">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {(showNew || editing) && (
        <RemolqueModal token={token} remolque={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={() => { setShowNew(false); setEditing(null); void load(); }} />
      )}
    </main>
  );
}

function RemolqueModal({ token, remolque, onClose, onSaved }: { token: string | null; remolque: Remolque | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setSaving(true); setErr('');
    try {
      const mileage = (fd.get('mileage') as string) || '';
      const body = {
        economicNumber: fd.get('economicNumber') as string,
        plates: (fd.get('plates') as string) || undefined,
        brand: (fd.get('brand') as string) || undefined,
        model: (fd.get('model') as string) || undefined,
        color: (fd.get('color') as string) || undefined,
        mileage: mileage ? Number(mileage) : undefined,
      };
      if (remolque) { await apiFetch(`/remolques/${remolque.id}`, { method: 'PATCH', token, body }); }
      else { await apiFetch('/remolques', { method: 'POST', token, body }); }
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-bold text-ink text-lg">{remolque ? 'Editar remolque' : 'Nuevo remolque'}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <form ref={formRef} onSubmit={e => void submit(e)} className="px-6 py-5 space-y-4">
          {err && <p className="text-alert text-sm">{err}</p>}
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Número económico *</label>
            <input name="economicNumber" required defaultValue={remolque?.economicNumber}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Placas</label>
            <input name="plates" defaultValue={remolque?.plates ?? ''}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Marca</label>
            <input name="brand" defaultValue={remolque?.brand ?? ''}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Modelo</label>
            <input name="model" defaultValue={remolque?.model ?? ''}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Color</label>
            <input name="color" defaultValue={remolque?.color ?? ''}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Kilómetros</label>
            <input name="mileage" type="number" min="0" defaultValue={remolque?.mileage ?? ''}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm text-ink hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
