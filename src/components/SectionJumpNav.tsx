'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export type SectionNavItem = { id: string; label: string };

/** Wrapped quick-link navbar to jump to sections. Hidden when fewer than 2 items. */
export function SectionJumpNav({ items, className = '' }: { items: SectionNavItem[]; className?: string }) {
  const { t } = useLanguage();
  if (items.length < 2) return null;

  function scrollTo(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.remove('section-jump-highlight');
    // Reflow so repeated clicks retrigger the animation.
    void target.offsetWidth;
    target.classList.add('section-jump-highlight');
    window.setTimeout(() => target.classList.remove('section-jump-highlight'), 1300);
  }

  return (
    <nav aria-label={t.common.sectionNav} className={className}>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.id} className="app-animate-in">
            <button
              type="button"
              onClick={() => scrollTo(item.id)}
              className="rounded-ios border border-ios-blue/40 bg-ios-blue/10 dark:bg-ios-blue/20 px-3 py-2 text-sm font-medium text-ios-blue shadow-sm transition-colors hover:bg-ios-blue/15 dark:hover:bg-ios-blue/25 focus:outline-none focus:ring-2 focus:ring-ios-blue/30 app-hover-lift app-press"
            >
              <span className="leading-snug block">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
