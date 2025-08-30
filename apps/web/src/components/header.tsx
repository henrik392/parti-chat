'use client';
import Link from 'next/link';
import { ModeToggle } from './mode-toggle';
import UserMenu from './user-menu';

export default function Header() {
  const links = [
    { to: '/' as const, label: 'AI Chat' },
    { to: '/dashboard' as const, label: 'Dashboard' },
  ];

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ to, label }) => {
            return (
              <Link href={to as string} key={to}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
