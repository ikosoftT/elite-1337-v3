import { Star } from '@/components/icons';

/** Displays an administrator-assigned recognition label beside a student login. */
export function CustomBadge({ label }: { label: string }) {
  return <span className="cb-badge" title={`Custom badge: ${label}`}><Star size={11} weight="fill"/>{label}</span>;
}
