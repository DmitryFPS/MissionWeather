'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getToken } from '@/lib/api';
import { useEffect, useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Панель' },
  { href: '/routes', label: 'Маршрут' },
  { href: '/profiles', label: 'Профили борта' },
  { href: '/weather', label: 'Погода' },
  { href: '/missions', label: 'Миссии' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken() && pathname !== '/login') router.replace('/login');
    else setReady(true);
  }, [pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!ready && pathname !== '/login') return null;

  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="shell">
      <header className="header">
        <strong>MissionWeather</strong>
        <button
          type="button"
          className="btn ghost nav-toggle"
          aria-label="Меню"
          onClick={() => setMenuOpen((v) => !v)}
        >
          ☰
        </button>
        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="btn ghost" onClick={() => { clearToken(); router.push('/login'); }}>
          Выйти
        </button>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
