'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['/', 'Polling units', '01'],
  ['/lga', 'LGA totals', '02'],
  ['/new', 'Add a unit', '03'],
];

export default function Nav() {
  const path = usePathname();
  return (
    <div className="nav-shell">
      <Link className="brand" href="/" aria-label="Delta results home">
        <span className="brand-mark" aria-hidden="true">D</span>
        <span className="brand-copy"><strong>Delta results</strong><small>2011 · ELECTION ARCHIVE</small></span>
      </Link>
      <nav aria-label="Main navigation">
        {links.map(([href, label, number]) => (
          <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
            <span className="nav-number">{number}</span>{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
