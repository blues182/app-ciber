'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface Trip {
  id: string;
  orderNumber: string;
  folio: string | null;
  cargoType: string | null;
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED';
  startDate: string;
  distanceKm: string;
  dieselLiters: string;
  dieselCost: string;
  tollsCost: string;
  operatorSalary: string;
  otherExpenses: string;
  income: string;
  expenses: string;
  utility: string;
  client: { id: string; businessName: string } | null;
  driver: { id: string; fullName: string } | null;
  trailer: { id: string; economicNumber: string } | null;
}

interface Paginated {
  items: Trip[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface CatalogResponse<T> {
  items: T[];
}

interface ClientOption {
  id: string;
  businessName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface DriverOption {
  id: string;
  fullName: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface TrailerOption {
  id: string;
  economicNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const STATUS_LABEL: Record<Trip['status'], string> = {
  CREATED: 'Creado',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELED: 'Cancelado',
};

const STATUS_COLOR: Record<Trip['status'], string> = {
  CREATED: 'bg-sand/30 text-ink',
  IN_PROGRESS: 'bg-moss/20 text-moss',
  COMPLETED: 'bg-clay/30 text-ink',
  CANCELED: 'bg-alert/20 text-alert',
};

function fmt(n: string | number) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function ViajesPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Paginated | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orderNumber, setOrderNumber] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Trip | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (orderNumber) params.set('orderNumber', orderNumber);
      if (status) params.set('status', status);
      params.set('page', String(page));
      const res = await apiFetch<Paginated>(`/trips?${params}`, { token });
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, orderNumber, status, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Módulo de viajes</p>
            <h1 className="text-2xl font-bold">Viajes</h1>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-xl bg-moss px-5 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition"
          >
            + Nuevo viaje
          </button>
        </header>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            value={orderNumber}
            onChange={e => { setOrderNumber(e.target.value); setPage(1); }}
            placeholder="Orden..."
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50 w-44"
          />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
          >
            <option value="">Todos los estados</option>
            <option value="CREATED">Creado</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELED">Cancelado</option>
          </select>
          <button
            onClick={() => { setOrderNumber(''); setStatus(''); setPage(1); }}
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition"
          >
            Limpiar
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-black/10 bg-white shadow-panel overflow-x-auto">
          {error && (
            <div className="px-6 py-4 text-alert text-sm">{error}</div>
          )}
          {loading ? (
            <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-sand/50 text-ink/70 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Conductor</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Fecha inicio</th>
                  <th className="px-4 py-3">Ingreso</th>
                  <th className="px-4 py-3">Gastos</th>
                  <th className="px-4 py-3">Utilidad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-ink/40">
                      Sin viajes registrados.
                    </td>
                  </tr>
                )}
                {data?.items.map(trip => (
                  <tr
                    key={trip.id}
                    onClick={() => setSelected(trip)}
                    className="hover:bg-sand/20 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-ink">{trip.orderNumber}</td>
                    <td className="px-4 py-3 text-ink/70">{trip.folio ?? '-'}</td>
                    <td className="px-4 py-3">{trip.client?.businessName ?? '-'}</td>
                    <td className="px-4 py-3">{trip.driver?.fullName ?? '-'}</td>
                    <td className="px-4 py-3">{trip.trailer?.economicNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-ink/70">{trip.startDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-moss font-medium">{fmt(trip.income)}</td>
                    <td className="px-4 py-3 text-alert">{fmt(trip.expenses)}</td>
                    <td className={`px-4 py-3 font-semibold ${Number(trip.utility) >= 0 ? 'text-moss' : 'text-alert'}`}>
                      {fmt(trip.utility)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[trip.status]}`}>
                        {STATUS_LABEL[trip.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 text-sm text-ink/60">
              <span>{data.pagination.total} registros</span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 hover:bg-sand/30 transition"
                >Anterior</button>
                <span className="px-2 py-1">{page} / {data.pagination.totalPages}</span>
                <button
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 rounded border border-black/10 disabled:opacity-40 hover:bg-sand/30 transition"
                >Siguiente</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modal: New trip */}
      {showNew && (
        <NewTripModal
          token={token}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); void load(); }}
        />
      )}

      {editingTrip && (
        <NewTripModal
          token={token}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onCreated={(updatedTrip) => {
            setEditingTrip(null);
            setSelected(updatedTrip);
            void load();
          }}
        />
      )}

      {/* Drawer: Trip detail */}
      {selected && (
        <TripDetail
          trip={selected}
          token={token}
          onClose={() => setSelected(null)}
          onEdit={() => setEditingTrip(selected)}
          onDeleted={() => {
            setSelected(null);
            void load();
          }}
          onUpdated={(t) => {
            setSelected(t);
            void load();
          }}
        />
      )}
    </main>
  );
}

/* ──────────────────────────── NEW TRIP MODAL ─────────────────────────── */
function NewTripModal({
  token,
  trip,
  onClose,
  onCreated,
}: {
  token: string | null;
  trip?: Trip;
  onClose: () => void;
  onCreated: (trip: Trip) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [trailers, setTrailers] = useState<TrailerOption[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!token) return;
    setLoadingCatalogs(true);
    setErr('');
    Promise.all([
      apiFetch<CatalogResponse<ClientOption>>('/clients?page=1&pageSize=200', { token }),
      apiFetch<CatalogResponse<DriverOption>>('/drivers?page=1&pageSize=200', { token }),
      apiFetch<CatalogResponse<TrailerOption>>('/trailers?page=1&pageSize=200', { token }),
    ])
      .then(([c, d, t]) => {
        setClients(c.items.filter((item) => item.status === 'ACTIVE'));
        setDrivers(d.items.filter((item) => item.status === 'ACTIVE'));
        setTrailers(t.items.filter((item) => item.status === 'ACTIVE'));
      })
      .catch((e: unknown) => {
        setErr((e as Error).message || 'No se pudieron cargar los catálogos.');
      })
      .finally(() => setLoadingCatalogs(false));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loadingCatalogs) {
      setErr('Espera a que carguen cliente, conductor y unidad.');
      return;
    }
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setSaving(true);
    setErr('');
    try {
      const savedTrip = await apiFetch<Trip>(trip ? `/trips/${trip.id}` : '/trips', {
        method: trip ? 'PATCH' : 'POST',
        token,
        body: {
          orderNumber: fd.get('orderNumber'),
          folio: fd.get('folio') || undefined,
          cargoType: fd.get('cargoType') || undefined,
          startDate: fd.get('startDate'),
          clientId: fd.get('clientId'),
          driverId: fd.get('driverId'),
          trailerId: fd.get('trailerId'),
          income: Number(fd.get('income') ?? 0),
          distanceKm: Number(fd.get('distanceKm') ?? 0),
          dieselLiters: Number(fd.get('dieselLiters') ?? 0),
          dieselCost: Number(fd.get('dieselCost') ?? 0),
          tollsCost: Number(fd.get('tollsCost') ?? 0),
          operatorSalary: Number(fd.get('operatorSalary') ?? 0),
        },
      });
      onCreated(savedTrip);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-panel w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <h2 className="font-bold text-ink text-lg">{trip ? 'Editar viaje' : 'Nuevo viaje'}</h2>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-xl leading-none">×</button>
        </div>
        <form ref={formRef} onSubmit={e => void submit(e)} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && <p className="text-alert text-sm">{err}</p>}
          <Field label="Número de orden *" name="orderNumber" required defaultValue={trip?.orderNumber ?? ''} />
          <Field label="Folio" name="folio" defaultValue={trip?.folio ?? ''} />
          <Field label="Tipo de carga" name="cargoType" defaultValue={trip?.cargoType ?? ''} placeholder="Ej. Cemento, Acero, Contenedor" />
          <Field label="Fecha de inicio *" name="startDate" type="date" required defaultValue={trip?.startDate.slice(0, 10) ?? ''} />

          <SelectField
            label="Cliente *"
            name="clientId"
            required
            disabled={loadingCatalogs || clients.length === 0}
            defaultValue={trip?.client?.id ?? ''}
            options={clients.map((item) => ({ value: item.id, label: item.businessName }))}
            placeholder={loadingCatalogs ? 'Cargando clientes...' : 'Selecciona cliente'}
          />
          <SelectField
            label="Conductor *"
            name="driverId"
            required
            disabled={loadingCatalogs || drivers.length === 0}
            defaultValue={trip?.driver?.id ?? ''}
            options={drivers.map((item) => ({ value: item.id, label: item.fullName }))}
            placeholder={loadingCatalogs ? 'Cargando conductores...' : 'Selecciona conductor'}
          />
          <SelectField
            label="Unidad (trailer) *"
            name="trailerId"
            required
            disabled={loadingCatalogs || trailers.length === 0}
            defaultValue={trip?.trailer?.id ?? ''}
            options={trailers.map((item) => ({ value: item.id, label: item.economicNumber }))}
            placeholder={loadingCatalogs ? 'Cargando unidades...' : 'Selecciona unidad'}
          />

          <Field label="Flete pactado ($)" name="income" type="number" defaultValue={trip?.income ?? '0'} />
          <Field label="Kilómetros recorridos" name="distanceKm" type="number" defaultValue={trip?.distanceKm ?? '0'} />
          <Field label="Litros de diésel" name="dieselLiters" type="number" defaultValue={trip?.dieselLiters ?? '0'} />
          <Field label="Costo de diésel ($)" name="dieselCost" type="number" defaultValue={trip?.dieselCost ?? '0'} />
          <Field label="Casetas ($)" name="tollsCost" type="number" defaultValue={trip?.tollsCost ?? '0'} />
          <Field label="Sueldo del operador ($)" name="operatorSalary" type="number" defaultValue={trip?.operatorSalary ?? '0'} />
          <p className="text-xs text-ink/55">Tip: usa el scroll del formulario para subir o bajar entre campos.</p>
          <div className="sticky bottom-0 bg-white pt-3 pb-1 flex gap-3 border-t border-black/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm text-ink hover:bg-sand/30 transition"
            >Cancelar</button>
            <button
              type="submit"
              disabled={
                saving ||
                loadingCatalogs ||
                clients.length === 0 ||
                drivers.length === 0 ||
                trailers.length === 0
              }
              className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition disabled:opacity-50"
            >{saving ? 'Guardando…' : trip ? 'Guardar cambios' : 'Crear viaje'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  required,
  disabled,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink/70 mb-1">{label}</label>
      <select
        name={name}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-moss/50 disabled:bg-sand/30 disabled:text-ink/50"
      >
        <option value="" disabled>
          {placeholder ?? 'Selecciona una opción'}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ──────────────────────────── TRIP DETAIL DRAWER ─────────────────────── */
function TripDetail({
  trip,
  token,
  onClose,
  onEdit,
  onDeleted,
  onUpdated,
}: {
  trip: Trip;
  token: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onUpdated: (t: Trip) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [expConcept, setExpConcept] = useState('');
  const [expAmount, setExpAmount] = useState('');

  async function changeStatus(status: Trip['status']) {
    setBusy(true);
    setErr('');
    try {
      const updated = await apiFetch<Trip>(`/trips/${trip.id}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      });
      onUpdated(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      const updated = await apiFetch<Trip>(`/trips/${trip.id}/expenses`, {
        method: 'POST',
        token,
        body: { concept: expConcept, amount: Number(expAmount) },
      });
      setExpConcept('');
      setExpAmount('');
      onUpdated(updated);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTrip() {
    setBusy(true);
    setErr('');
    try {
      await apiFetch(`/trips/${trip.id}`, {
        method: 'DELETE',
        token,
      });
      onDeleted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isEditable = trip.status !== 'COMPLETED' && trip.status !== 'CANCELED';

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-steel">
        <div>
          <p className="text-xs text-sand/70 uppercase tracking-wider">Viaje</p>
          <h2 className="text-sand font-bold text-lg">{trip.orderNumber}</h2>
        </div>
        <button onClick={onClose} className="text-sand/60 hover:text-sand text-2xl leading-none">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {err && <p className="text-alert text-sm">{err}</p>}

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Folio" value={trip.folio ?? '-'} />
          <InfoRow label="Tipo de carga" value={trip.cargoType ?? '-'} />
          <InfoRow label="Estado" value={STATUS_LABEL[trip.status]} />
          <InfoRow label="Cliente" value={trip.client?.businessName ?? '-'} />
          <InfoRow label="Conductor" value={trip.driver?.fullName ?? '-'} />
          <InfoRow label="Unidad" value={trip.trailer?.economicNumber ?? '-'} />
          <InfoRow label="Inicio" value={trip.startDate.slice(0, 10)} />
        </div>

        {/* Financials */}
        <div className="rounded-xl border border-black/10 p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/50">Financiero</h3>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Flete pactado</span>
            <span className="font-semibold text-moss">{fmt(trip.income)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Kilómetros recorridos</span>
            <span className="font-semibold text-ink">{Number(trip.distanceKm).toLocaleString('es-MX')} km</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Diésel (litros)</span>
            <span className="font-semibold text-ink">{Number(trip.dieselLiters).toLocaleString('es-MX')} L</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Costo de diésel</span>
            <span className="font-semibold text-alert">{fmt(trip.dieselCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Casetas</span>
            <span className="font-semibold text-alert">{fmt(trip.tollsCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Sueldo del operador</span>
            <span className="font-semibold text-alert">{fmt(trip.operatorSalary)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Otros gastos</span>
            <span className="font-semibold text-alert">{fmt(trip.otherExpenses)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink/70">Gastos acumulados</span>
            <span className="font-semibold text-alert">{fmt(trip.expenses)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-black/5 pt-2">
            <span className="text-ink font-medium">Utilidad estimada</span>
            <span className={`font-bold ${Number(trip.utility) >= 0 ? 'text-moss' : 'text-alert'}`}>
              {fmt(trip.utility)}
            </span>
          </div>
        </div>

        {/* Add expense */}
        {isEditable && (
          <div className="rounded-xl border border-black/10 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/50">Registrar gasto</h3>
            <form onSubmit={e => void addExpense(e)} className="space-y-3">
              <input
                value={expConcept}
                onChange={e => setExpConcept(e.target.value)}
                placeholder="Concepto del gasto"
                required
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
              />
              <input
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto ($)"
                required
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-clay/70 py-2 text-sm font-medium text-ink hover:bg-clay transition disabled:opacity-50"
              >Agregar gasto</button>
            </form>
          </div>
        )}

        {/* Status actions */}
        <div className="rounded-xl border border-black/10 p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/50">Acciones</h3>
          <div className="flex gap-2 flex-wrap">
            {isEditable && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg px-4 py-2 text-sm font-medium transition border border-black/10 text-ink hover:bg-sand/30"
              >
                Editar viaje
              </button>
            )}
            {trip.status === 'CREATED' && (
              <StatusBtn label="Iniciar viaje" onClick={() => void changeStatus('IN_PROGRESS')} busy={busy} color="moss" />
            )}
            {trip.status === 'IN_PROGRESS' && (
              <StatusBtn label="Cerrar viaje" onClick={() => void changeStatus('COMPLETED')} busy={busy} color="clay" />
            )}
            <StatusBtn
              label="Eliminar viaje"
              onClick={() => {
                if (window.confirm('¿Eliminar este viaje por completo? Esta acción no se puede deshacer.')) {
                  void removeTrip();
                }
              }}
              busy={busy}
              color="alert"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink/50 uppercase tracking-wider">{label}</p>
      <p className="font-medium text-ink mt-0.5">{value}</p>
    </div>
  );
}

function StatusBtn({
  label,
  onClick,
  busy,
  color,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
  color: 'moss' | 'clay' | 'alert';
}) {
  const cls = {
    moss: 'bg-moss text-sand hover:bg-moss/80',
    clay: 'bg-clay text-ink hover:bg-clay/80',
    alert: 'bg-alert/10 text-alert border border-alert/30 hover:bg-alert/20',
  }[color];
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${cls}`}
    >{label}</button>
  );
}
