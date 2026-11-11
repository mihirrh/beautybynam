/**
 * Tiny text helpers for CMS strings.
 * Wrapping words in *asterisks* in a heading sets them in italic gold, e.g.
 * "Bridal beauty, *softly considered.*" Everything else is HTML-escaped.
 */
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escapes text and turns *emphasis* into <em>. Safe for set:html. */
export function em(text: string): string {
  return escapeHtml(text).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

/** Removes the *asterisks*, for plain-text contexts (alt text, metadata). */
export const plain = (text: string) => text.replace(/\*/g, '');

/**
 * Splits a heading into masked words so Motion can lift them in one after
 * another. Words keep their natural spacing, so with no JavaScript (or with
 * reduced motion) the heading reads exactly as normal.
 */
export function splitWords(text: string): string {
  let italic = false;
  return text
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token.startsWith('*')) italic = true;
      const clean = escapeHtml(token.replace(/\*/g, ''));
      const inner = italic ? `<em>${clean}</em>` : clean;
      if (token.endsWith('*')) italic = false;
      return `<span class="word-mask"><span data-word>${inner}</span></span>`;
    })
    .join(' ');
}
