import type { Metadata } from 'next';
import { AuthProvider } from '../contexts/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'App Ciber | Operación de Transporte',
  description: 'Plataforma administrativa logística',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
