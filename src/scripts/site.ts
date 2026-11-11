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
  window.matchMedia('(min-width: 1280px)').addEventListener('change', (e) => {
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
        animate(el, { opacity: [0, 1], y: [26, 0] }, { duration: 1, ease, delay: Math.min(index, 6) * 0.1 });
      },
      { amount: 0.2, margin: '0px 0px -8% 0px' },
    );
  });

  // Headlines: each word rises out of its own mask, left to right.
  document.querySelectorAll<HTMLElement>('[data-words]').forEach((heading) => {
    const words = heading.querySelectorAll<HTMLElement>('[data-word]');
    const run = () => animate(words, { y: ['112%', '0%'] }, { duration: 1.1, ease, delay: stagger(0.07, { startDelay: Number(heading.dataset.delay ?? 0) }) });
    if (heading.hasAttribute('data-onload')) run();
    else inView(heading, () => void run(), { amount: 0.4 });
  });

  // Hero entrance on load (the photograph itself is already painted).
  document.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
    animate(el, { opacity: [0, 1], y: [18, 0] }, { duration: 1.1, ease, delay: 0.55 + Number(el.dataset.fade || 0) * 0.12 });
  });
  document.querySelectorAll<HTMLElement>('[data-hero-photo] img').forEach((img) => {
    animate(img, { scale: [1.1, 1] }, { duration: 2.2, ease });
  });

  // Photographs: a soft wipe with a slow settle on the image.
  document.querySelectorAll<HTMLElement>('[data-reveal-img]').forEach((el) => {
    const img = el.querySelector('img');
    const pic = el.querySelector('picture') ?? el;
    inView(
      el,
      () => {
        animate(pic, { clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'] }, { duration: 1.3, ease });
        if (img && !el.hasAttribute('data-drift')) animate(img, { scale: [1.08, 1] }, { duration: 1.8, ease });
      },
      { amount: 0.15 },
    );
  });

  // The brushstroke ring draws itself once.
  document.querySelectorAll<SVGElement>('[data-ring]').forEach((svg) => {
    const path = svg.querySelector('path');
    if (!path) return;
    inView(svg, () => {
      animate(path, { strokeDashoffset: [1, 0] }, { duration: 2.4, ease });
    });
  });

  // Parallax. Hero: the whole frame lifts slowly as you scroll away.
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const speed = Number(el.dataset.parallax || 60);
    scroll(animate(el, { y: [0, speed] }, { ease: 'linear' }), {
      target: el.parentElement as HTMLElement,
      offset: ['start start', 'end start'],
    });
  });
  // Drift: the picture slides a few percent inside its fixed frame.
  document.querySelectorAll<HTMLElement>('[data-drift]').forEach((frame) => {
    const img = frame.querySelector('img');
    if (!img) return;
    scroll(animate(img, { y: ['-6%', '6%'] }, { ease: 'linear' }), { target: frame, offset: ['start end', 'end start'] });
  });
  // Floating pieces (e.g. the small overlapping photograph) move a little faster than the page.
  document.querySelectorAll<HTMLElement>('[data-float]').forEach((el) => {
    const amount = Number(el.dataset.float || 40);
    scroll(animate(el, { y: [amount, -amount] }, { ease: 'linear' }), { target: el, offset: ['start end', 'end start'] });
  });
}

/* ------------------------------------------------- instagram card stack */
document.querySelectorAll<HTMLElement>('[data-cards]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('[data-track]');
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-card]'));
  const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-next]');
  const count = root.querySelector<HTMLElement>('[data-count]');
  const bar = root.querySelector<HTMLElement>('[data-bar]');
  if (!track || cards.length === 0) return;

  root.querySelectorAll<HTMLElement>('[data-controls]').forEach((c) => c.removeAttribute('hidden'));

  let ticking = false;
  const update = () => {
    ticking = false;
    const box = track.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let nearest = 0;
    let best = Infinity;
    cards.forEach((card, i) => {
      const r = card.getBoundingClientRect();
      const offset = (r.left + r.width / 2 - mid) / box.width; // -1…1 around the centre
      const d = Math.abs(offset);
      if (d < best) {
        best = d;
        nearest = i;
      }
      if (motionOk) {
        // The card in the middle sits upright and full size; its neighbours tuck back and tilt.
        card.style.setProperty('--s', String(Math.max(0.9, 1 - d * 0.1)));
        card.style.setProperty('--r', `${Math.max(-3, Math.min(3, offset * 3)).toFixed(2)}deg`);
      }
    });
    if (count) count.textContent = `${String(nearest + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
    const max = track.scrollWidth - track.clientWidth;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.max(0.08, track.scrollLeft / max) : 1})`;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
  };
  const queue = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  const step = (dir: number) => {
    const w = cards[0].getBoundingClientRect().width + 24;
    track.scrollBy({ left: dir * w * (window.innerWidth > 900 ? 2 : 1), behavior: motionOk ? 'smooth' : 'auto' });
  };
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  track.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
});
