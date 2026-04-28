import { Fragment, type ReactNode } from 'react';

/**
 * Tiny inline-markdown renderer for notes/descriptions/titles.
 *
 * Supports:
 *   [text](url)                     → <a>text</a>
 *   ![](items/poke-ball.png)        → inline item sprite
 *   ![](pokemon/versions/…/201-a.png) → inline pokémon sprite
 *
 * Image "src" is a path rooted at /sprites/; first path segment selects
 * the sprite-kind folder so both kinds work through the same syntax.
 * Everything else is rendered as plain text, preserving line breaks.
 */

// Matches either ![alt](path) or [text](url). Image wins (leading '!').
const TOKEN_RE = /(!?\[([^\]]*)\]\(([^)\s]+)\))/g;

function renderLine(line: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(line.slice(last, start));
    const [full, , labelText, target] = m;
    const isImage = full.startsWith('!');
    if (isImage) {
      out.push(
        <img
          key={`${keyBase}-i-${i++}`}
          src={`/sprites/${target.replace(/^\/+/, '')}`}
          alt={labelText || ''}
          className="inline-block align-middle w-4 h-4 mx-0.5"
          style={{ imageRendering: 'pixelated' }}
        />,
      );
    } else {
      const href = target;
      const isExternal = /^https?:\/\//i.test(href);
      out.push(
        <a
          key={`${keyBase}-a-${i++}`}
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          onClick={e => e.stopPropagation()}
        >
          {labelText || href}
        </a>,
      );
    }
    last = start + full.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export default function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <span className={className}>
      {lines.map((ln, i) => (
        <Fragment key={i}>
          {renderLine(ln, String(i))}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </span>
  );
}
