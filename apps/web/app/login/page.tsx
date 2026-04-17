'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../contexts/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError((err as Error).message ?? 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-sand flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white border border-black/10 shadow-panel px-8 py-10 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-steel">App Ciber</h1>
            <p className="text-sm text-ink/50 mt-1">Control operativo de transporte</p>
          </div>

          {error && (
            <div className="rounded-lg bg-alert/10 border border-alert/30 px-4 py-3 text-sm text-alert">
              {error}
            </div>
          )}

          <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="usuario@empresa.com"
                className="w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-black/15 px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-moss/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-steel py-3 text-sm font-bold text-sand hover:bg-ink transition disabled:opacity-50"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-ink/30 mt-6">© 2026 App Ciber</p>
      </div>
    </main>
  );
}
