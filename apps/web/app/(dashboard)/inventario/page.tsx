'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface SparePart {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  stock: number;
  minimumStock: number;
  unitCost: string;
}
interface Movement {
  id: string;
  quantity: number;
  movementType: string;
  reason: string | null;
  createdAt: string;
}
interface Paginated<T> { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }

const MOV_COLOR: Record<string, string> = {
  IN: 'bg-moss/20 text-moss',
  OUT: 'bg-alert/20 text-alert',
  ADJUSTMENT: 'bg-clay/40 text-ink',
};

export default function InventarioPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated<SparePart> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [selected, setSelected] = useState<SparePart | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [lowStock, setLowStock] = useState<SparePart[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      const [pageData, alerts] = await Promise.all([
        apiFetch<Paginated<SparePart>>(`/inventory?${params}`, { token }),
        apiFetch<SparePart[]>('/inventory/alerts/low-stock', { token }),
      ]);
      setData(pageData);
      setLowStock(alerts);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [token, search, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Módulo</p>
            <h1 className="text-2xl font-bold">Inventario de Refacciones</h1>
          </div>
          <button onClick={() => setShowNew(true)} className="rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">+ Nueva refacción</button>
        </header>

        {/* Low stock alerts */}
        {lowStock.length > 0 && (
          <div className="rounded-xl border border-alert/30 bg-alert/5 px-5 py-4">
            <p className="text-sm font-semibold text-alert mb-2">⚠ Stock bajo ({lowStock.length} artículo{lowStock.length > 1 ? 's' : ''})</p>
            <ul className="text-sm text-ink/70 space-y-1">
              {lowStock.map(p => (
                <li key={p.id}><span className="font-medium">{p.sku}</span> — {p.name}: {p.stock} en stock (mínimo: {p.minimumStock})</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nombre o SKU..."
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50 w-64" />
          <button onClick={() => { setSearch(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
          {error && <div className="px-6 py-4 text-alert text-sm">{error}</div>}
          {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
            <table className="w-full text-sm text-left">
              <thead className="bg-sand/50 text-ink/70 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Código de barras</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Mínimo</th>
                  <th className="px-4 py-3">Costo unit.</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {!data?.items.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink/40">Sin refacciones registradas.</td></tr>}
                {data?.items.map(p => (
                  <tr key={p.id} className="hover:bg-sand/10 transition">
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{p.sku}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/70">{p.barcode ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.name}
                      {p.stock <= p.minimumStock && <span className="ml-2 rounded-full bg-alert/20 px-2 py-0.5 text-xs text-alert">Stock bajo</span>}
                    </td>
                    <td className="px-4 py-3">{p.stock}</td>
                    <td className="px-4 py-3 text-ink/50">{p.minimumStock}</td>
                    <td className="px-4 py-3">{Number(p.unitCost).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => setEditing(p)} className="text-xs text-steel hover:text-ink underline">Editar</button>
                      <button onClick={() => { setSelected(p); setShowAdjust(true); }} className="text-xs text-moss hover:text-moss/70 underline">Ajustar</button>
                      <button onClick={() => { setSelected(p); setShowAdjust(false); }} className="text-xs text-ink/50 hover:text-ink underline">Movimientos</button>
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

      {(showNew || editing) && (
        <SparePartModal token={token} part={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={() => { setShowNew(false); setEditing(null); void load(); }} />
      )}

      {selected && showAdjust && (
        <AdjustModal token={token} part={selected}
          onClose={() => { setSelected(null); setShowAdjust(false); }}
          onSaved={() => { void load(); setSelected(null); setShowAdjust(false); }} />
      )}

      {selected && !showAdjust && (
        <MovementsDrawer token={token} part={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

// ── SparePart Modal ───────────────────────────────────────────────────────────

function SparePartModal({ token, part, onClose, onSaved }: { token: string | null; part: SparePart | null; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setSaving(true); setErr('');
    try {
      const body: Record<string, unknown> = {
        sku: fd.get('sku'),
        barcode: (fd.get('barcode') as string) || undefined,
        name: fd.get('name'),
        description: (fd.get('description') as string) || undefined,
        minimumStock: Number(fd.get('minimumStock') || 0),
        unitCost: Number(fd.get('unitCost') || 0),
      };
      if (!part) body['stock'] = Number(fd.get('stock') || 0);
      if (part) await apiFetch(`/inventory/${part.id}`, { method: 'PATCH', token, body });
      else await apiFetch('/inventory', { method: 'POST', token, body });
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-bold text-ink text-lg">{part ? 'Editar refacción' : 'Nueva refacción'}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <form ref={formRef} onSubmit={e => void submit(e)} className="px-6 py-5 space-y-4">
          {err && <p className="text-alert text-sm">{err}</p>}
          {[
            { label: 'SKU *', name: 'sku', type: 'text', required: true, def: part?.sku },
            { label: 'Código de barras (opcional)', name: 'barcode', type: 'text', required: false, def: part?.barcode ?? '' },
            { label: 'Nombre *', name: 'name', type: 'text', required: true, def: part?.name },
            { label: 'Descripción', name: 'description', type: 'text', required: false, def: part?.description ?? '' },
            ...(!part ? [{ label: 'Stock inicial', name: 'stock', type: 'number', required: false, def: '0' }] : []),
            { label: 'Stock mínimo', name: 'minimumStock', type: 'number', required: false, def: String(part?.minimumStock ?? 0) },
            { label: 'Costo unitario ($)', name: 'unitCost', type: 'number', required: false, def: String(part ? Number(part.unitCost) : 0) },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-ink/70 mb-1">{f.label}</label>
              <input name={f.name} type={f.type} required={f.required} defaultValue={f.def as string} step={f.type === 'number' ? '0.01' : undefined}
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50" />
            </div>
          ))}
          {!part && <p className="text-xs text-ink/55">Si dejas vacío el código de barras, el sistema lo genera automáticamente con SKU y nombre.</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Adjust Modal ──────────────────────────────────────────────────────────────

function AdjustModal({ token, part, onClose, onSaved }: { token: string | null; part: SparePart; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [movType, setMovType] = useState('IN');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const quantity = movType === 'OUT' ? -Math.abs(qty) : Math.abs(qty);
      await apiFetch(`/inventory/${part.id}/adjust`, {
        method: 'POST', token,
        body: { quantity, movementType: movType, reason: reason || undefined },
      });
      onSaved();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-bold text-ink">Ajustar stock — {part.sku}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <form onSubmit={e => void submit(e)} className="px-6 py-5 space-y-4">
          {err && <p className="text-alert text-sm">{err}</p>}
          <p className="text-sm text-ink/70">Stock actual: <span className="font-semibold text-ink">{part.stock}</span></p>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Tipo de movimiento</label>
            <select value={movType} onChange={e => setMovType(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
              <option value="IN">Entrada (IN)</option>
              <option value="OUT">Salida (OUT)</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Cantidad</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Motivo</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Opcional" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 disabled:opacity-50">{saving ? '…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Movements Drawer ──────────────────────────────────────────────────────────

function MovementsDrawer({ token, part, onClose }: { token: string | null; part: SparePart; onClose: () => void }) {
  const [data, setData] = useState<Paginated<Movement> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!token) return;
    apiFetch<Paginated<Movement>>(`/inventory/${part.id}/movements?page=${page}`, { token })
      .then(setData).catch(() => {});
  }, [token, part.id, page]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="h-full w-full max-w-md bg-white shadow-panel overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-bold text-ink">Movimientos — {part.sku}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-2 text-sm">
          {!data?.items.length && <p className="text-ink/40 text-center py-8">Sin movimientos registrados.</p>}
          {data?.items.map(m => (
            <div key={m.id} className="flex items-start justify-between rounded-xl border border-black/5 px-4 py-3">
              <div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${MOV_COLOR[m.movementType] ?? 'bg-black/10 text-ink/50'}`}>{m.movementType}</span>
                {m.reason && <p className="mt-1 text-ink/60 text-xs">{m.reason}</p>}
                <p className="mt-1 text-ink/40 text-xs">{new Date(m.createdAt).toLocaleString('es-MX')}</p>
              </div>
              <span className={`text-base font-bold ${m.movementType === 'OUT' ? 'text-alert' : 'text-moss'}`}>
                {m.movementType === 'OUT' ? '-' : '+'}{m.quantity}
              </span>
            </div>
          ))}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 text-xs">Anterior</button>
              <span className="px-2 py-1 text-xs">{page} / {data.pagination.totalPages}</span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 text-xs">Siguiente</button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
