'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface Maintenance {
  id: string;
  type: string;
  description: string;
  maintenanceDate: string;
  mileage: number | null;
  workshop: string | null;
  laborCost: string;
  partsCost: string;
  totalCost: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED';
  trailer: { economicNumber: string } | null;
  remolque: { economicNumber: string } | null;
  provider: { businessName: string } | null;
  partsUsed: { quantity: number; unitCost: string; sparePart: { sku: string; name: string } }[];
}
interface Paginated { items: Maintenance[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }
interface SparePart { id: string; sku: string; name: string; stock: number }
interface Trailer { id: string; economicNumber: string }
interface Remolque { id: string; economicNumber: string }
interface Provider { id: string; businessName: string }

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto', IN_PROGRESS: 'En proceso', CLOSED: 'Cerrado', CANCELED: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: 'bg-clay/40 text-ink',
  IN_PROGRESS: 'bg-moss/20 text-moss',
  CLOSED: 'bg-black/10 text-ink/50',
  CANCELED: 'bg-alert/20 text-alert',
};

export default function MantenimientoPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Maintenance | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      setData(await apiFetch<Paginated>(`/maintenance?${params}`, { token }));
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token, search, statusFilter, page]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(id: string, status: string) {
    try {
      await apiFetch(`/maintenance/${id}/status`, { method: 'PATCH', token, body: { status } });
      void load();
      if (detail?.id === id) setDetail(null);
    } catch (e) { alert((e as Error).message); }
  }

  async function removeMaintenance(id: string) {
    if (!confirm('¿Eliminar este mantenimiento por completo? Esta acción no se puede deshacer.')) return;
    setDeletingId(id);
    setError('');
    try {
      await apiFetch(`/maintenance/${id}`, { method: 'DELETE', token });
      if (detail?.id === id) setDetail(null);
      void load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Módulo</p>
            <h1 className="text-2xl font-bold">Mantenimiento</h1>
          </div>
          <button onClick={() => setShowNew(true)} className="rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">+ Nuevo mantenimiento</button>
        </header>

        <div className="flex gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por número económico..."
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50 w-64"
          />
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
          {error && <div className="px-6 py-4 text-alert text-sm">{error}</div>}
          {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
            <table className="w-full text-sm text-left">
              <thead className="bg-sand/50 text-ink/70 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Taller</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Costo total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {!data?.items.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/40">Sin mantenimientos registrados.</td></tr>}
                {data?.items.map(m => (
                  <tr key={m.id} className="hover:bg-sand/10 transition">
                    <td className="px-4 py-3 font-medium">{m.type}</td>
                    <td className="px-4 py-3 text-ink/70">{m.trailer?.economicNumber ?? m.remolque?.economicNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{m.workshop ?? '—'}</td>
                    <td className="px-4 py-3 text-ink/70">{m.maintenanceDate.slice(0, 10)}</td>
                    <td className="px-4 py-3">{Number(m.totalCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[m.status]}`}>{STATUS_LABELS[m.status]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setDetail(m)} className="text-xs text-steel hover:text-ink underline">Ver detalle</button>
                        <button
                          type="button"
                          disabled={deletingId === m.id}
                          onClick={() => void removeMaintenance(m.id)}
                          className="text-xs text-alert hover:text-alert/70 underline disabled:opacity-50"
                        >
                          {deletingId === m.id ? 'Eliminando…' : 'Eliminar'}
                        </button>
                      </div>
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
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40">Anterior</button>
                <span className="px-2 py-1">{page} / {data.pagination.totalPages}</span>
                <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showNew && (
        <MaintenanceModal token={token}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); void load(); }} />
      )}

      {detail && (
        <MaintenanceDetail token={token} maintenance={detail}
          onClose={() => setDetail(null)}
          onStatusChange={(id, s) => void changeStatus(id, s)}
          deletingId={deletingId}
          onDelete={(id) => void removeMaintenance(id)}
          onPartAdded={() => void load()} />
      )}
    </main>
  );
}

// ── Create Modal ─────────────────────────────────────────────────────────────

function MaintenanceModal({ token, onClose, onSaved }: { token: string | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [unitType, setUnitType] = useState<'trailer' | 'remolque'>('trailer');
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [remolques, setRemolques] = useState<Remolque[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<{ items: Trailer[] }>('/trailers?pageSize=200', { token }),
      apiFetch<{ items: Remolque[] }>('/remolques?pageSize=200', { token }),
      apiFetch<{ items: Provider[] }>('/providers?pageSize=200', { token }),
    ]).then(([t, r, p]) => { setTrailers(t.items); setRemolques(r.items); setProviders(p.items); }).catch(() => {});
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = {
        type: fd.get('type'),
        description: fd.get('description'),
        maintenanceDate: fd.get('maintenanceDate'),
        laborCost: Number(fd.get('laborCost') || 0),
      };
      const mileage = fd.get('mileage') as string;
      if (mileage) body['mileage'] = Number(mileage);
      const workshop = fd.get('workshop') as string;
      if (workshop) body['workshop'] = workshop;
      const trailerId = fd.get('trailerId') as string;
      if (trailerId) body['trailerId'] = trailerId;
      const providerId = fd.get('providerId') as string;
      if (providerId) body['providerId'] = providerId;
      await apiFetch('/maintenance', { method: 'POST', token, body });
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-bold text-ink text-lg">Nuevo mantenimiento</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <form ref={formRef} onSubmit={e => void submit(e)} className="px-6 py-5 space-y-4">
          {err && <p className="text-alert text-sm">{err}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Tipo *</label>
              <input name="type" required className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Preventivo, Correctivo…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Fecha *</label>
              <input name="maintenanceDate" type="date" required className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Descripción *</label>
            <textarea name="description" required rows={2} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Taller</label>
              <input name="workshop" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Km / Millas</label>
              <input name="mileage" type="number" min="0" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Costo de mano de obra ($)</label>
            <input name="laborCost" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-ink/70">Unidad a mantener</label>
            <div className="inline-flex rounded-lg border border-black/15 p-1">
              <button
                type="button"
                onClick={() => setUnitType('trailer')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${unitType === 'trailer' ? 'bg-steel text-sand' : 'text-ink/70 hover:bg-sand/30'}`}
              >
                Carro
              </button>
              <button
                type="button"
                onClick={() => setUnitType('remolque')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${unitType === 'remolque' ? 'bg-steel text-sand' : 'text-ink/70 hover:bg-sand/30'}`}
              >
                Remolque
              </button>
            </div>

            {unitType === 'trailer' ? (
              <>
                <input type="hidden" name="remolqueId" value="" />
                <select name="trailerId" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
                  <option value="">— Sin asignar —</option>
                  {trailers.map(t => <option key={t.id} value={t.id}>{t.economicNumber}</option>)}
                </select>
              </>
            ) : (
              <>
                <input type="hidden" name="trailerId" value="" />
                <select name="remolqueId" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
                  <option value="">— Sin asignar —</option>
                  {remolques.map(r => <option key={r.id} value={r.id}>{r.economicNumber}</option>)}
                </select>
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Proveedor / Taller externo</label>
            <select name="providerId" className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
              <option value="">— Sin asignar —</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.businessName}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function MaintenanceDetail({
  token, maintenance, onClose, onStatusChange, deletingId, onDelete, onPartAdded,
}: {
  token: string | null;
  maintenance: Maintenance;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
  deletingId: string | null;
  onDelete: (id: string) => void;
  onPartAdded: () => void;
}) {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [sparePartId, setSparePartId] = useState('');
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');

  useEffect(() => {
    if (!token) return;
    apiFetch<{ items: SparePart[] }>('/inventory?pageSize=200', { token })
      .then(r => setParts(r.items)).catch(() => {});
  }, [token]);

  async function addPart() {
    if (!sparePartId) return;
    setAdding(true); setAddErr('');
    try {
      await apiFetch(`/maintenance/${maintenance.id}/parts`, {
        method: 'POST', token, body: { sparePartId, quantity: qty },
      });
      onPartAdded();
      setSparePartId(''); setQty(1);
    } catch (e) { setAddErr((e as Error).message); }
    finally { setAdding(false); }
  }

  const isClosed = maintenance.status === 'CLOSED' || maintenance.status === 'CANCELED';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="h-full w-full max-w-lg bg-white shadow-panel overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-bold text-ink text-lg">Detalle mantenimiento</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Info grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Tipo</dt><dd className="font-medium mt-0.5">{maintenance.type}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Estado</dt><dd className="mt-0.5"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[maintenance.status]}`}>{STATUS_LABELS[maintenance.status]}</span></dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Fecha</dt><dd className="mt-0.5">{maintenance.maintenanceDate.slice(0, 10)}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Unidad</dt><dd className="mt-0.5">{maintenance.trailer?.economicNumber ?? maintenance.remolque?.economicNumber ?? '—'}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Taller</dt><dd className="mt-0.5">{maintenance.workshop ?? '—'}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Proveedor</dt><dd className="mt-0.5">{maintenance.provider?.businessName ?? '—'}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Mano de obra</dt><dd className="mt-0.5">{Number(maintenance.laborCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd></div>
            <div><dt className="text-ink/50 text-xs uppercase tracking-wider">Piezas</dt><dd className="mt-0.5">{Number(maintenance.partsCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd></div>
            <div className="col-span-2"><dt className="text-ink/50 text-xs uppercase tracking-wider">Total</dt><dd className="mt-0.5 text-lg font-bold text-ink">{Number(maintenance.totalCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</dd></div>
          </dl>

          {/* Description */}
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-1">Descripción</p>
            <p className="text-sm text-ink">{maintenance.description}</p>
          </div>

          {/* Parts used */}
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Refacciones utilizadas</p>
            {maintenance.partsUsed.length === 0
              ? <p className="text-sm text-ink/40">Sin refacciones registradas.</p>
              : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-ink/50 uppercase">
                    <tr><th className="text-left py-1">SKU</th><th className="text-left py-1">Nombre</th><th className="text-right py-1">Cant.</th><th className="text-right py-1">C/u</th></tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {maintenance.partsUsed.map(p => (
                      <tr key={p.sparePart.sku}>
                        <td className="py-1.5 text-ink/60">{p.sparePart.sku}</td>
                        <td className="py-1.5">{p.sparePart.name}</td>
                        <td className="py-1.5 text-right">{p.quantity}</td>
                        <td className="py-1.5 text-right">{Number(p.unitCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>

          {/* Add part form */}
          {!isClosed && (
            <div className="rounded-xl border border-black/10 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Agregar refacción</p>
              {addErr && <p className="text-alert text-xs">{addErr}</p>}
              <div className="flex gap-3">
                <select value={sparePartId} onChange={e => setSparePartId(e.target.value)}
                  className="flex-1 rounded-lg border border-black/15 px-3 py-2 text-sm">
                  <option value="">— Seleccionar —</option>
                  {parts.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (stock: {p.stock})</option>)}
                </select>
                <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))}
                  className="w-20 rounded-lg border border-black/15 px-3 py-2 text-sm text-center" />
                <button disabled={adding || !sparePartId} onClick={() => void addPart()}
                  className="rounded-xl bg-moss px-4 py-2 text-sm font-semibold text-sand disabled:opacity-50">
                  {adding ? '…' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Status actions */}
          {!isClosed && (
            <div className="flex gap-3 pt-2">
              {maintenance.status === 'OPEN' && (
                <button onClick={() => onStatusChange(maintenance.id, 'IN_PROGRESS')}
                  className="flex-1 rounded-xl bg-clay/60 py-2.5 text-sm font-semibold text-ink hover:bg-clay transition">
                  Iniciar
                </button>
              )}
              {(maintenance.status === 'OPEN' || maintenance.status === 'IN_PROGRESS') && (
                <>
                  <button onClick={() => onStatusChange(maintenance.id, 'CLOSED')}
                    className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">
                    Cerrar
                  </button>
                  <button onClick={() => onStatusChange(maintenance.id, 'CANCELED')}
                    className="flex-1 rounded-xl bg-alert/20 py-2.5 text-sm font-semibold text-alert hover:bg-alert/30 transition">
                    Cancelar
                  </button>
                </>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={deletingId === maintenance.id}
            onClick={() => onDelete(maintenance.id)}
            className="w-full rounded-xl bg-alert/20 py-2.5 text-sm font-semibold text-alert hover:bg-alert/30 transition disabled:opacity-50"
          >
            {deletingId === maintenance.id ? 'Eliminando mantenimiento…' : 'Eliminar mantenimiento'}
          </button>
        </div>
      </aside>
    </div>
  );
}
