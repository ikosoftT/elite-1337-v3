'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Calculator, ChartNoAxesCombined, Corrections, Survival, Trophy, UserRound } from '@/components/icons';
import { cn } from '@/lib/utils';

// Short label: the top bar only fits a word as wide as "Offers"; longer ones push "Me" onto a second line.
const xp = { href: '/xp', label: 'XP', icon: Calculator };
const shared = [
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
  { href: '/stats', label: 'Stats', icon: ChartNoAxesCombined },
  { href: '/corrections', label: 'Corrections', icon: Corrections },
  xp,
];
const race = { href: '/me', label: 'Race', icon: Survival };

const HIGHLIGHT_AFTER_MS = 1000, HIGHLIGHT_UNTIL_CLICKS = 2;
const highlightKey = (href: string) => `feature-highlight-clicks:${href}`;
const highlightClicks = (href: string) => { try { return Number(localStorage.getItem(highlightKey(href)) ?? 0); } catch { return 0; } };

/** Main navigation highlights newly shipped destinations until each has been opened twice. */
export function NavLinks({ variant, login }: { variant: 'top' | 'bottom'; login: string }) {
  const current = usePathname();
  const profile = { href: `/students/${encodeURIComponent(login)}`, label: 'Profile', icon: UserRound };
  const newFeatures = [xp.href, profile.href];
  // Light up the tapped tab right away; the real path takes over once the page arrives.
  const [clicked, setClicked] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<string[]>([]);
  useEffect(() => setClicked(null), [current]);
  const pathname = clicked ?? current;

  useEffect(() => {
    const fresh = newFeatures.filter((href) => current !== href && (process.env.NODE_ENV === 'development' || highlightClicks(href) < HIGHLIGHT_UNTIL_CLICKS));
    if (!fresh.length) return;
    const timer = setTimeout(() => setHighlights(fresh), HIGHLIGHT_AFTER_MS);
    return () => { clearTimeout(timer); setHighlights([]); };
  }, [current, profile.href]);

  const open = (href: string) => {
    if (!newFeatures.includes(href)) return;
    setHighlights((items) => items.filter((item) => item !== href));
    try { localStorage.setItem(highlightKey(href), String(highlightClicks(href) + 1)); } catch { /* nothing to remember */ }
  };

  const links = variant === 'bottom' ? [...shared, race, profile] : [...shared, profile];
  return <>{links.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`) || (href === '/leaderboard' && pathname.startsWith('/piscines'));
    const glowing = highlights.includes(href) && !active;
    return <Link key={href} href={href} className={cn(active && 'is-active', glowing && 'is-new')} aria-current={active ? 'page' : undefined} aria-label={href === xp.href ? 'XP calculator' : href === profile.href ? 'Student profile' : undefined} title={href === xp.href ? 'XP calculator' : href === profile.href ? 'Student profile' : undefined}
      onClick={(event) => { open(href); if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) setClicked(href); }}>
      {variant === 'bottom' && <Icon size={24} strokeWidth={1.7} fill={active && href === '/leaderboard' ? 'currentColor' : 'none'} aria-hidden="true"/>}
      <span>{label}</span>
      {glowing && <em className="nav-new" aria-label="New feature">New!</em>}
    </Link>;
  })}</>;
}
