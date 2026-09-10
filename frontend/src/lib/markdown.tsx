/* Minimal, dependency-free Markdown renderer — enough for RAG answers:
   headings, bold/italic, inline code, links, ordered/unordered lists,
   fenced code blocks and blockquotes. Renders to React nodes (no innerHTML). */

import { Fragment, type ReactNode } from 'react'

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Order matters: code first so ** inside code is left alone.
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = pattern.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const token = m[0]
    const key = `${keyBase}-${i++}`
    if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer noopener">
            {linkMatch[1]}
          </a>,
        )
      }
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>)
    }
    last = m.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code
    if (line.trimStart().startsWith('```')) {
      const buf: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      blocks.push(
        <pre key={key++}>
          <code>{buf.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // Blank
    if (!line.trim()) {
      i++
      continue
    }

    // Headings
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const Tag = (`h${Math.min(level + 1, 4)}` as 'h2' | 'h3' | 'h4')
      blocks.push(<Tag key={key++}>{renderInline(h[2], `h${key}`)}</Tag>)
      i++
      continue
    }

    // Table: a header row of pipes followed by a |---|---| divider
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes('-')
    ) {
      const splitRow = (r: string) =>
        r
          .trim()
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
      const headers = splitRow(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i++
      }
      const tKey = key++
      blocks.push(
        <table className="md-table" key={tKey}>
          <thead>
            <tr>
              {headers.map((h, hi) => (
                <th key={hi}>{renderInline(h, `th${tKey}-${hi}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci}>{renderInline(c, `td${tKey}-${ri}-${ci}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      )
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const buf: string[] = []
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2))
        i++
      }
      blocks.push(
        <blockquote key={key++}>{renderInline(buf.join(' '), `q${key}`)}</blockquote>,
      )
      continue
    }

    // Lists
    const isUl = /^\s*[-*]\s+/.test(line)
    const isOl = /^\s*\d+\.\s+/.test(line)
    if (isUl || isOl) {
      const items: string[] = []
      const re = isUl ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/
      while (i < lines.length && re.test(lines[i])) {
        items.push(lines[i].replace(re, ''))
        i++
      }
      const listKey = key++
      const children = items.map((it, idx) => (
        <li key={idx}>{renderInline(it, `li${listKey}-${idx}`)}</li>
      ))
      blocks.push(
        isUl ? <ul key={listKey}>{children}</ul> : <ol key={listKey}>{children}</ol>,
      )
      continue
    }

    // Paragraph (join consecutive non-blank, non-special lines)
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    blocks.push(<p key={key++}>{renderInline(buf.join(' '), `p${key}`)}</p>)
  }

  return <div className="md">{blocks.map((b, idx) => <Fragment key={idx}>{b}</Fragment>)}</div>
}
