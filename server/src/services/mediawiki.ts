/**
 * mediawiki.ts
 *
 * Thin wrapper around Bulbapedia's MediaWiki API with caching and rate limiting.
 *
 * Usage:
 *   import { getPageSections, getSectionWikitext, wikitextToMarkdown } from './mediawiki.js';
 */

import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";

const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname);
const CACHE_DIR = join(SCRIPT_DIR, "../scripts/.cache/bulbapedia/api");
const API_BASE = "https://bulbapedia.bulbagarden.net/w/api.php";
const RATE_LIMIT_MS = 1000;
const RETRY_DELAY_MS = 5000;

mkdirSync(CACHE_DIR, { recursive: true });

// --- Types ---

export interface WikiSection {
  index: string;
  title: string;
  level: string;
}

// --- Rate limiting ---

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const resp = await fetch(url);

  if (resp.status === 429) {
    console.error(`  Rate limited (429), waiting ${RETRY_DELAY_MS}ms and retrying...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    lastRequestTime = Date.now();
    return fetch(url);
  }

  return resp;
}

// --- Cache helpers ---

function sanitizeKey(s: string): string {
  return s.replace(/[^\w-]/g, "_");
}

function cacheGet(key: string): unknown | null {
  const file = join(CACHE_DIR, `${key}.json`);
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function cacheSet(key: string, data: unknown): void {
  const file = join(CACHE_DIR, `${key}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

// --- Public API ---

/**
 * Fetch the section table of contents for a Bulbapedia page.
 */
export async function getPageSections(pageTitle: string): Promise<WikiSection[]> {
  const key = `sections__${sanitizeKey(pageTitle)}`;
  const cached = cacheGet(key);
  if (cached) {
    return cached as WikiSection[];
  }

  const url =
    `${API_BASE}?action=parse&page=${encodeURIComponent(pageTitle)}` +
    `&prop=sections&format=json&origin=*`;

  console.error(`  Fetching sections for: ${pageTitle}`);
  const resp = await rateLimitedFetch(url);
  if (!resp.ok) {
    throw new Error(`MediaWiki API error ${resp.status} for page: ${pageTitle}`);
  }

  const json = (await resp.json()) as {
    parse?: { sections?: Array<{ index: string; line: string; level: string }> };
    error?: { info: string };
  };

  if (json.error) {
    throw new Error(`MediaWiki API error: ${json.error.info}`);
  }

  const sections: WikiSection[] = (json.parse?.sections ?? []).map((s) => ({
    index: s.index,
    title: s.line,
    level: s.level,
  }));

  cacheSet(key, sections);
  return sections;
}

/**
 * Fetch the raw wikitext for a specific section of a Bulbapedia page.
 */
export async function getSectionWikitext(
  pageTitle: string,
  sectionIndex: string
): Promise<string> {
  const key = `wikitext__${sanitizeKey(pageTitle)}__${sanitizeKey(sectionIndex)}`;
  const cached = cacheGet(key);
  if (cached) {
    return cached as string;
  }

  const url =
    `${API_BASE}?action=parse&page=${encodeURIComponent(pageTitle)}` +
    `&prop=wikitext&section=${encodeURIComponent(sectionIndex)}&format=json&origin=*`;

  console.error(`  Fetching wikitext for: ${pageTitle} §${sectionIndex}`);
  const resp = await rateLimitedFetch(url);
  if (!resp.ok) {
    throw new Error(
      `MediaWiki API error ${resp.status} for page: ${pageTitle}, section: ${sectionIndex}`
    );
  }

  const json = (await resp.json()) as {
    parse?: { wikitext?: { "*": string } };
    error?: { info: string };
  };

  if (json.error) {
    throw new Error(`MediaWiki API error: ${json.error.info}`);
  }

  const wikitext = json.parse?.wikitext?.["*"] ?? "";
  cacheSet(key, wikitext);
  return wikitext;
}

/**
 * Convert wikitext to clean markdown.
 */
export function wikitextToMarkdown(wikitext: string): string {
  let text = wikitext;

  // Remove [[File:...]] and [[Image:...]] (may span to ]] which could be nested)
  text = text.replace(/\[\[(?:File|Image):[^\]]*(?:\]\][^\]]*)*?\]\]/gi, "");
  // Simpler fallback for single-bracket file links
  text = text.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, "");

  // Remove [[Category:...]]
  text = text.replace(/\[\[Category:[^\]]+\]\]/gi, "");

  // {{m|Move}} → *Move*
  text = text.replace(/\{\{m\|([^}|]+)(?:\|[^}]*)?\}\}/gi, "*$1*");

  // {{p|Pokemon}} → Pokemon
  text = text.replace(/\{\{p\|([^}|]+)(?:\|[^}]*)?\}\}/gi, "$1");

  // {{i|Item}} → Item
  text = text.replace(/\{\{i\|([^}|]+)(?:\|[^}]*)?\}\}/gi, "$1");

  // {{DL|Page|display}} → display
  text = text.replace(/\{\{DL\|[^|]+\|([^}]+)\}\}/gi, "$1");

  // {{Gen|I}} / {{gen|III}} → "Generation I" / "Generation III"
  text = text.replace(/\{\{[Gg]en\|([^}]+)\}\}/g, "Generation $1");

  // {{HM|01|Cut}} → "Cut", {{TM|24|Thunderbolt}} → "Thunderbolt"
  text = text.replace(/\{\{[HT]M\|\d+\|([^}]+)\}\}/gi, "$1");

  // {{badge|Cascade}} → "Cascade Badge"
  text = text.replace(/\{\{badge\|([^}]+)\}\}/gi, "$1 Badge");

  // {{sup/N}}, {{sup/N|text}} — superscript game markers → remove
  text = text.replace(/\{\{sup\/\d+(?:\|[^}]*)?\}\}/gi, "");

  // {{tt|text|tooltip}} → text
  text = text.replace(/\{\{tt\|([^|]+)\|[^}]*\}\}/gi, "$1");

  // Remove wiki tables {| ... |}
  text = text.replace(/\{\|[\s\S]*?\|\}/g, "");

  // Remove remaining templates {{...}} — infoboxes, navboxes, etc.
  // Use iterative approach to handle nested templates
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, "");
  }

  // Clean up orphaned commas from removed templates: "Generations , , , and" → "Generations"
  text = text.replace(/(\w)(?:\s*,\s*){2,}/g, "$1, ");
  text = text.replace(/,\s+and\s*\./g, ".");
  text = text.replace(/,\s+or\s*\./g, ".");
  text = text.replace(/\s+,/g, ",");

  // Remove indented italic markers ":*" at line start (Bulbapedia description blocks)
  text = text.replace(/^:\s*/gm, "");

  // [[Page|display]] → display
  text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2");

  // [[Page]] → Page
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Headings: order matters — longest prefix first (====, ===, ==)
  text = text.replace(/^====\s*(.+?)\s*====\s*$/gm, "#### $1");
  text = text.replace(/^===\s*(.+?)\s*===\s*$/gm, "### $1");
  text = text.replace(/^==\s*(.+?)\s*==\s*$/gm, "## $1");

  // Bullet lists: run BEFORE bold/italic so "**" list markers aren't confused with bold.
  // Wikitext bullets use "* " or "** " at line start.
  text = text.replace(/^\*\*\s+/gm, "  - ");
  text = text.replace(/^\*\s+/gm, "- ");
  // Also handle bare * or ** at end of line (empty list items)
  text = text.replace(/^\*\*$/gm, "  -");
  text = text.replace(/^\*$/gm, "-");

  // '''''bold+italic''''' → ***bold+italic***
  text = text.replace(/'''''(.+?)'''''/g, "***$1***");

  // '''bold''' → **bold**
  text = text.replace(/'''(.+?)'''/g, "**$1**");

  // ''italic'' → *italic*
  text = text.replace(/''(.+?)''/g, "*$1*");

  // Collapse 3+ blank lines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
