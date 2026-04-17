'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../contexts/auth-context';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token === null) {
      router.replace('/login');
    }
  }, [token, router]);

  if (!token) return null;
  return <>{children}</>;
}
