'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from '../../../components/ui/sidebar';
import { useAuth } from '../../../contexts/auth-context';
import { apiFetch } from '../../../lib/api';

interface RolePermission {
  id: string;
  module: string;
  action: string;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  usersCount: number;
  permissions: RolePermission[];
  createdAt: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleId: string;
  role: { id: string; name: string };
  createdAt: string;
}

interface UsersPageData {
  items: UserItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export default function UsuariosPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UsersPageData | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search) params.set('search', search);
      const [usersData, rolesData, permissionsData] = await Promise.all([
        apiFetch<UsersPageData>(`/users?${params.toString()}`, { token }),
        apiFetch<RoleItem[]>('/users/roles', { token }),
        apiFetch<RolePermission[]>('/users/permissions', { token }),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, RolePermission[]>>((acc, permission) => {
      acc[permission.module] ??= [];
      acc[permission.module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-6 p-6 lg:p-8">
      <Sidebar />
      <section className="flex-1 space-y-6">
        <header className="rounded-2xl border border-black/10 bg-steel p-6 text-sand shadow-panel">
          <p className="text-sm uppercase tracking-[0.2em] text-sand/70">Fase 5</p>
          <h1 className="mt-2 text-3xl font-semibold">Usuarios y Roles</h1>
          <p className="mt-2 max-w-2xl text-sm text-sand/80">Administración de usuarios internos, asignación de rol y edición granular de permisos por rol.</p>
        </header>

        {error && <div className="rounded-xl border border-alert/30 bg-alert/5 px-4 py-3 text-sm text-alert">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Administración</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Usuarios</h2>
              </div>
              <button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="rounded-xl bg-moss px-4 py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition">+ Nuevo usuario</button>
            </div>

            <div className="flex gap-3">
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nombre, correo o rol..." className="w-80 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink" />
              <button onClick={() => { setSearch(''); setPage(1); }} className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-ink hover:bg-sand/30 transition">Limpiar</button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-black/5">
              {loading ? <div className="px-6 py-8 text-center text-sm text-ink/50">Cargando...</div> : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-sand/50 text-xs uppercase tracking-wider text-ink/70">
                    <tr>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Creado</th>
                      <th className="px-4 py-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {!users?.items.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/40">Sin usuarios registrados.</td></tr>}
                    {users?.items.map((user) => (
                      <tr key={user.id} className="hover:bg-sand/10 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{user.name}</p>
                          <p className="text-xs text-ink/50">{user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-ink/70">{user.role.name}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.isActive ? 'bg-moss/20 text-moss' : 'bg-black/10 text-ink/50'}`}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink/60">{new Date(user.createdAt).toLocaleDateString('es-MX')}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => { setEditingUser(user); setShowUserModal(true); }} className="text-xs text-steel underline hover:text-ink">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {users && users.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-ink/60">
                <span>{users.pagination.total} usuarios</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Anterior</button>
                  <span className="px-2 py-1">{page} / {users.pagination.totalPages}</span>
                  <button disabled={page >= users.pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded border border-black/10 px-3 py-1 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Seguridad</p>
                <h2 className="mt-2 text-xl font-semibold text-ink">Roles y permisos</h2>
              </div>
              <button onClick={() => { setEditingRole(null); setShowRoleModal(true); }} className="rounded-xl bg-clay/70 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-clay transition">+ Nuevo rol</button>
            </div>

            <div className="space-y-3">
              {roles.map((role) => (
                <article key={role.id} className="rounded-xl border border-black/8 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-ink">{role.name}</h3>
                      <p className="mt-1 text-xs text-ink/50">{role.usersCount} usuario(s) asignado(s)</p>
                    </div>
                    <button onClick={() => { setEditingRole(role); setShowRoleModal(true); }} className="text-xs text-steel underline hover:text-ink">Editar</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <span key={permission.id} className="rounded-full bg-steel/10 px-2.5 py-1 text-xs text-steel">
                        {permission.module}.{permission.action}
                      </span>
                    ))}
                    {role.permissions.length === 0 && <span className="text-xs text-ink/40">Sin permisos asignados</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      {showUserModal && (
        <UserModal
          token={token}
          roles={roles}
          user={editingUser}
          onClose={() => { setShowUserModal(false); setEditingUser(null); }}
          onSaved={() => { setShowUserModal(false); setEditingUser(null); void load(); }}
        />
      )}

      {showRoleModal && (
        <RoleModal
          token={token}
          role={editingRole}
          groupedPermissions={groupedPermissions}
          onClose={() => { setShowRoleModal(false); setEditingRole(null); }}
          onSaved={() => { setShowRoleModal(false); setEditingRole(null); void load(); }}
        />
      )}
    </main>
  );
}

function UserModal({
  token,
  roles,
  user,
  onClose,
  onSaved,
}: {
  token: string | null;
  roles: RoleItem[];
  user: UserItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const body: Record<string, unknown> = {
      name: formData.get('name'),
      email: formData.get('email'),
      roleId: formData.get('roleId'),
    };

    const password = (formData.get('password') as string) || '';
    if (password) body['password'] = password;
    if (user) {
      body['isActive'] = formData.get('isActive') === 'on';
    }

    setSaving(true);
    setError('');
    try {
      if (user) {
        await apiFetch(`/users/${user.id}`, { method: 'PATCH', token, body });
      } else {
        await apiFetch('/users', { method: 'POST', token, body });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <h2 className="text-lg font-bold text-ink">{user ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onClose} className="text-xl text-ink/40 hover:text-ink">×</button>
        </div>
        <form ref={formRef} onSubmit={(event) => void submit(event)} className="space-y-4 px-6 py-5">
          {error && <p className="text-sm text-alert">{error}</p>}
          <Field label="Nombre" name="name" defaultValue={user?.name ?? ''} required />
          <Field label="Correo" name="email" type="email" defaultValue={user?.email ?? ''} required />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70">Rol</label>
            <select name="roleId" defaultValue={user?.roleId ?? ''} required className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink">
              <option value="">Seleccionar…</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </div>
          <Field label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'} name="password" type="password" required={!user} />
          {user && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input name="isActive" type="checkbox" defaultChecked={user.isActive} />
              Usuario activo
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm text-ink hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-moss py-2.5 text-sm font-semibold text-sand hover:bg-moss/80 transition disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleModal({
  token,
  role,
  groupedPermissions,
  onClose,
  onSaved,
}: {
  token: string | null;
  role: RoleItem | null;
  groupedPermissions: Record<string, RolePermission[]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const permissionIds = formData.getAll('permissionIds').map((value) => String(value));
    const body = {
      name: formData.get('name'),
      permissionIds,
    };

    setSaving(true);
    setError('');
    try {
      if (role) {
        await apiFetch(`/users/roles/${role.id}`, { method: 'PATCH', token, body });
      } else {
        await apiFetch('/users/roles', { method: 'POST', token, body });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const selected = new Set(role?.permissions.map((permission) => permission.id) ?? []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
          <h2 className="text-lg font-bold text-ink">{role ? 'Editar rol' : 'Nuevo rol'}</h2>
          <button onClick={onClose} className="text-xl text-ink/40 hover:text-ink">×</button>
        </div>
        <form ref={formRef} onSubmit={(event) => void submit(event)} className="space-y-4 px-6 py-5">
          {error && <p className="text-sm text-alert">{error}</p>}
          <Field label="Nombre del rol" name="name" defaultValue={role?.name ?? ''} required />
          <div className="max-h-[420px] space-y-4 overflow-y-auto rounded-xl border border-black/10 p-4">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
              <section key={module} className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/55">{module}</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {modulePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 rounded-lg border border-black/8 px-3 py-2 text-sm text-ink">
                      <input
                        name="permissionIds"
                        type="checkbox"
                        value={permission.id}
                        defaultChecked={selected.has(permission.id)}
                      />
                      <span>{permission.module}.{permission.action}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-black/15 py-2.5 text-sm text-ink hover:bg-sand/30 transition">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-steel py-2.5 text-sm font-semibold text-sand hover:bg-steel/85 transition disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/70">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm text-ink"
      />
    </div>
  );
}
