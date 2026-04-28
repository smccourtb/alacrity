import { getSectionWikitext, getPageSections } from '../server/src/services/mediawiki.ts';

const sections = await getPageSections('Alpha Pokémon');
// "Fixed alpha Pokémon" is the parent section containing all area subsections
const target = sections.find(s => /Fixed alpha/i.test(s.title));
if (!target) throw new Error('Could not locate fixed alpha section');
const wikitext = await getSectionWikitext('Alpha Pokémon', target.index);
// Pokemon names are in {{p|Name}} template form on this page
const seen = new Set<string>();
const out: { name: string }[] = [];
for (const m of wikitext.matchAll(/\{\{p\|([^}|]+)(?:\|[^}]*)?\}\}/g)) {
  const name = m[1].trim();
  if (!seen.has(name)) {
    seen.add(name);
    out.push({ name });
  }
}
console.log(JSON.stringify(out, null, 2));
