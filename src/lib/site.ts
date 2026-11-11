import settings from '../content/site/settings.json';
import seo from '../content/site/seo.json';
import home from '../content/site/home.json';
import about from '../content/site/about.json';
import contact from '../content/site/contact.json';
import faqs from '../content/site/faqs.json';
import testimonialsData from '../content/site/testimonials.json';
import gallery from '../content/site/gallery.json';
import instagram from '../content/site/instagram.json';
import quote from '../content/site/quote.json';

export interface Testimonial {
  name: string;
  detail?: string;
  quote: string;
}

// Typed explicitly: the list ships empty, so it cannot be inferred from the JSON.
const testimonials = testimonialsData as { heading: string; intro: string; items: Testimonial[] };

export { settings, seo, home, about, contact, faqs, testimonials, gallery, instagram, quote };

export type PageKey = keyof typeof seo;

export const categories = [
  { value: 'bridal-makeup', label: 'Bridal makeup' },
  { value: 'bridal-hair', label: 'Bridal hair' },
  { value: 'occasion', label: 'Occasion looks' },
  { value: 'destination', label: 'Destination' },
] as const;

/** Splits a multi-paragraph CMS text field into paragraphs. */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** True when a contact field has been filled in. */
export const has = (value?: string | null) => Boolean(value && value.trim());

/** Phone number to a tel: href. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, '')}`;

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
