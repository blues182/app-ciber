'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

type EntityType = 'trailer' | 'remolque' | 'driver' | 'trip' | 'maintenance';

interface DocumentItem {
  id: string;
  fileName: string;
  mimeType: string;
  entityType: EntityType;
  entityId: string;
  createdAt: string;
}

interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface OptionItem { id: string; label: string }

export default function DocumentosPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated<DocumentItem> | null>(null);
  const [filterEntityType, setFilterEntityType] = useState<EntityType | ''>('');
  const [uploadEntityType, setUploadEntityType] = useState<EntityType | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refs, setRefs] = useState<Record<EntityType, OptionItem[]>>({ trailer: [], remolque: [], driver: [], trip: [], maintenance: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const currentOptions = useMemo(() => uploadEntityType ? refs[uploadEntityType] : [], [uploadEntityType, refs]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (filterEntityType) params.set('entityType', filterEntityType);
      if (search) params.set('search', search);
      setData(await apiFetch<Paginated<DocumentItem>>(`/documents?${params.toString()}`, { token }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, filterEntityType, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiFetch<{ items: { id: string; economicNumber: string }[] }>('/trailers?pageSize=200', { token }),
      apiFetch<{ items: { id: string; economicNumber: string }[] }>('/remolques?pageSize=200', { token }),
      apiFetch<{ items: { id: string; fullName: string }[] }>('/drivers?pageSize=200', { token }),
      apiFetch<{ items: { id: string; orderNumber: string }[] }>('/trips?pageSize=100', { token }),
      apiFetch<{ items: { id: string; type: string; maintenanceDate: string }[] }>('/maintenance?page=1', { token }),
    ]).then(([trailers, remolques, drivers, trips, maintenance]) => {
      setRefs({
        trailer: trailers.items.map((item) => ({ id: item.id, label: item.economicNumber })),
        remolque: remolques.items.map((item) => ({ id: item.id, label: item.economicNumber })),
        driver: drivers.items.map((item) => ({ id: item.id, label: item.fullName })),
        trip: trips.items.map((item) => ({ id: item.id, label: item.orderNumber })),
        maintenance: maintenance.items.map((item) => ({ id: item.id, label: `${item.type} - ${item.maintenanceDate.slice(0, 10)}` })),
      });
    }).catch(() => undefined);
  }, [token]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !formRef.current) return;
    const formData = new FormData(formRef.current);
    setUploading(true);
    setUploadError('');
    try {
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error((err as { message?: string }).message ?? 'Error al subir documento');
      }
      formRef.current.reset();
      setUploadEntityType('');
      setPage(1);
      void load();
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function download(item: DocumentItem) {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/documents/${item.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error((err as { message?: string }).message ?? 'Error al descargar');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel">
          <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Fase 4</p>
          <h1 className="mt-2 text-3xl font-semibold">Documentos</h1>
          <p className="mt-2 max-w-2xl text-sm text-sand/80">Carga y consulta de archivos ligados a unidades, remolques, conductores, viajes y mantenimientos.</p>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.6fr]">
          <form ref={formRef} onSubmit={(e) => void upload(e)} className="rounded-2xl border border-black/10 bg-white p-5 shadow-panel space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Subir archivo</p>
              <h2 className="mt-2 text-xl font-semibold text-ink">Nuevo documento</h2>
            </div>
            {uploadError && <p className="text-sm text-alert">{uploadError}</p>}
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink/50">Tipo de entidad</label>
              <select name="entityType" value={uploadEntityType} onChange={(e) => setUploadEntityType(e.target.value as EntityType | '')} required className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink">
                <option value="">Seleccionar…</option>
                <option value="trailer">Trailer</option>
                <option value="remolque">Remolque</option>
                <option value="driver">Conductor</option>
                <option value="trip">Viaje</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink/50">Registro</label>
              <select name="entityId" required disabled={!uploadEntityType} className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink disabled:bg-sand/40">
                <option value="">Seleccionar…</option>
                {currentOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink/50">Archivo</label>
              <input name="file" type="file" required className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-sand file:px-3 file:py-2 file:text-sm" />
            </div>
            <button type="submit" disabled={uploading} className="w-full rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition disabled:opacity-50">{uploading ? 'Subiendo…' : 'Subir documento'}</button>
          </form>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select value={filterEntityType} onChange={(e) => { setFilterEntityType(e.target.value as EntityType | ''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink">
                <option value="">Todos los tipos</option>
                <option value="trailer">Trailer</option>
                <option value="remolque">Remolque</option>
                <option value="driver">Conductor</option>
                <option value="trip">Viaje</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nombre de archivo..." className="w-72 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink" />
              <button onClick={() => { setFilterEntityType(''); setSearch(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
              {error && <div className="px-6 py-4 text-alert text-sm">{error}</div>}
              {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-sand/50 text-xs uppercase tracking-wider text-ink/70">
                    <tr>
                      <th className="px-4 py-3">Archivo</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">MIME</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {!data?.items.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/40">Sin documentos registrados.</td></tr>}
                    {data?.items.map((item) => (
                      <tr key={item.id} className="hover:bg-sand/10 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{item.fileName}</p>
                          <p className="text-xs text-ink/50">{item.entityId}</p>
                        </td>
                        <td className="px-4 py-3 uppercase text-ink/60">{item.entityType}</td>
                        <td className="px-4 py-3 text-ink/60">{item.mimeType}</td>
                        <td className="px-4 py-3 text-ink/60">{new Date(item.createdAt).toLocaleString('es-MX')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => void download(item)} className="text-xs text-steel underline hover:text-ink">Descargar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-black/5 px-6 py-3 text-sm text-ink/60">
                  <span>{data.pagination.total} documentos</span>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Anterior</button>
                    <span className="px-2 py-1">{page} / {data.pagination.totalPages}</span>
                    <button disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Siguiente</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
