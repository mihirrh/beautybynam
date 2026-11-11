import { animate, inView, scroll, stagger } from 'motion';

const root = document.documentElement;
const motionOk = root.classList.contains('motion-ok');
const ease = [0.22, 0.7, 0.2, 1] as const;

/* ----------------------------------------------------------- header state */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* ------------------------------------------------------------ mobile menu */
const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const menu = document.querySelector<HTMLElement>('[data-menu]');

if (toggle && menu) {
  const items = menu.querySelectorAll<HTMLElement>('[data-menu-item]');
  const focusable = () => Array.from(menu.querySelectorAll<HTMLElement>('a[href], button'));

  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.classList.remove('hidden');
      if (motionOk) {
        animate(menu, { opacity: [0, 1] }, { duration: 0.35, ease });
        animate(items, { opacity: [0, 1], y: [18, 0] }, { duration: 0.6, ease, delay: stagger(0.06, { startDelay: 0.1 }) });
      }
      focusable()[0]?.focus();
    } else {
      menu.classList.add('hidden');
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') return setOpen(false);
    if (e.key !== 'Tab') return;
    // Keep keyboard focus inside the open menu (toggle stays reachable).
    const list = [toggle, ...focusable()];
    const first = list[0];
    const last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
    if (e.matches && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
  });
}

/* ---------------------------------------------------------------- reveals */
if (motionOk) {
  // Text and blocks: gentle rise + fade. Siblings sharing a data-stagger
  // parent are revealed one after another.
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    inView(
      el,
      () => {
        const parent = el.closest('[data-stagger]');
        const index = parent ? Array.from(parent.querySelectorAll('[data-reveal]')).indexOf(el) : 0;
        animate(el, { opacity: [0, 1], y: [22, 0] }, { duration: 0.9, ease, delay: Math.min(index, 6) * 0.09 });
      },
      { amount: 0.25, margin: '0px 0px -8% 0px' },
    );
  });

  // Photographs: clip-path wipe with a slow settle on the image.
  document.querySelectorAll<HTMLElement>('[data-reveal-img]').forEach((el) => {
    const img = el.querySelector('img');
    const pic = el.querySelector('picture') ?? el;
    inView(
      el,
      () => {
        animate(pic, { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'] }, { duration: 1.1, ease });
        if (img) animate(img, { scale: [1.08, 1] }, { duration: 1.6, ease });
      },
      { amount: 0.15 },
    );
  });

  // The brushstroke ring draws itself once.
  document.querySelectorAll<SVGElement>('[data-ring]').forEach((svg) => {
    const path = svg.querySelector('path');
    if (!path) return;
    inView(svg, () => {
      animate(path, { strokeDashoffset: [1, 0] }, { duration: 2.2, ease });
    });
  });

  // Hero: a very small parallax on the photograph only.
  const parallax = document.querySelector<HTMLElement>('[data-parallax]');
  if (parallax) {
    scroll(animate(parallax, { y: [0, 60] }, { ease: 'linear' }), {
      target: parallax.parentElement as HTMLElement,
      offset: ['start start', 'end start'],
    });
  }
}
