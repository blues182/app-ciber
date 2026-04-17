"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';

const navItems: { label: string; href: string }[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Usuarios', href: '/usuarios' },
  { label: 'Viajes', href: '/viajes' },
  { label: 'Trailers', href: '/trailers' },
  { label: 'Remolques', href: '/remolques' },
  { label: 'Conductores', href: '/conductores' },
  { label: 'Clientes', href: '/clientes' },
  { label: 'Proveedores', href: '/proveedores' },
  { label: 'Inventario', href: '/inventario' },
  { label: 'Mantenimiento', href: '/mantenimiento' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Auditoría', href: '/auditoria' },
  { label: 'Documentos', href: '/documentos' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="w-full max-w-72 shrink-0 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-panel backdrop-blur flex flex-col">
      <h1 className="text-xl font-bold tracking-tight text-steel">App Ciber</h1>
      <p className="mt-1 text-sm text-black/65">Control operativo integral</p>
      {user && <p className="mt-2 text-xs text-ink/50">Sesión: {user.email}</p>}

      <nav className="mt-6 space-y-1 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-steel transition hover:bg-sand hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 w-full rounded-xl border border-alert/30 bg-alert/10 px-3 py-2.5 text-sm font-semibold text-alert transition hover:bg-alert/20"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
