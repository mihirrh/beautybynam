// Checks .pages.yml against the real content files. Run: node scripts/check-cms.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';

const cfg = parse(readFileSync('.pages.yml', 'utf8'));
let problems = 0;
const fail = (m) => { problems++; console.error('✗', m); };

/** Compare configured fields to the keys present in a value. */
function compare(fields, value, where) {
  if (Array.isArray(value)) {
    if (value.length === 0) return;
    value.forEach((v) => compare(fields, v, where));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const names = fields.map((f) => f.name);
  for (const key of Object.keys(value)) {
    if (!names.includes(key)) fail(`${where}: data key "${key}" has no CMS field`);
  }
  for (const f of fields) {
    if (!(f.name in value)) {
      if (f.required && f.type !== 'rich-text') fail(`${where}: required field "${f.name}" missing from data`);
      continue;
    }
    if (f.type === 'object' && f.fields) compare(f.fields, value[f.name], `${where}.${f.name}`);
  }
}

for (const entry of cfg.content) {
  if (entry.type === 'file' && entry.format === 'json') {
    compare(entry.fields, JSON.parse(readFileSync(entry.path, 'utf8')), entry.name);
  } else if (entry.type === 'collection') {
    for (const file of readdirSync(entry.path).filter((f) => f.endsWith('.md'))) {
      const raw = readFileSync(`${entry.path}/${file}`, 'utf8');
      const fm = parse(raw.split('---')[1]);
      fm.body = 'x';
      compare(entry.fields, fm, `${entry.name}/${file}`);
    }
  } else if (entry.type === 'file') {
    const fm = parse(readFileSync(entry.path, 'utf8').split('---')[1]);
    fm.body = 'x';
    compare(entry.fields, fm, entry.name);
  }
}

// Gallery categories must match src/lib/site.ts
const site = readFileSync('src/lib/site.ts', 'utf8');
const siteCats = [...site.matchAll(/value: '([^']+)'/g)].map((m) => m[1]).sort().join();
const gallery = cfg.content.find((c) => c.name === 'gallery');
const cat = gallery.fields.find((f) => f.name === 'items').fields.find((f) => f.name === 'category');
const cmsCats = cat.options.values.map((v) => v.value).sort().join();
if (siteCats !== cmsCats) fail(`category mismatch: site=${siteCats} cms=${cmsCats}`);

console.log(problems ? `\n${problems} problem(s)` : '.pages.yml matches the content files.');
process.exit(problems ? 1 : 0);
