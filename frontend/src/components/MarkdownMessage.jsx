import React from 'react';

function Inline({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={i}>{part.slice(2, -2)}</del>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function MarkdownMessage({ content }) {
  const lines = String(content || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [], items = [], code = [], table = [], inCode = false, ordered = false;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={'p' + blocks.length}>{paragraph.map((line, i) => <React.Fragment key={i}>{i > 0 && <br />}<Inline text={line} /></React.Fragment>)}</p>);
    paragraph = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter(row => !row.every(cell => /^:?-{3,}:?$/.test(cell.trim())));
    if (rows.length) blocks.push(<div className="dg-markdown-table-wrap" key={'t' + blocks.length}><table className="dg-markdown-table"><thead><tr>{rows[0].map((cell, i) => <th key={i}><Inline text={cell.trim()} /></th>)}</tr></thead><tbody>{rows.slice(1).map((row, ri) => <tr key={ri}>{rows[0].map((_, ci) => <td key={ci}><Inline text={(row[ci] || '').trim()} /></td>)}</tr>)}</tbody></table></div>);
    table = [];
  };
  const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
  const flushList = () => {
    if (!items.length) return;
    const listItems = items;
    blocks.push(ordered ? <ol key={'l' + blocks.length}>{listItems.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ol> : <ul key={'l' + blocks.length}>{listItems.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>);
    items = [];
  };
  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      flushParagraph(); flushList();
      if (inCode) { blocks.push(<pre key={'c' + blocks.length}><code>{code.join('\n')}</code></pre>); code = []; inCode = false; }
      else inCode = true;
      return;
    }
    if (inCode) { code.push(line); return; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const listItem = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/);
    if (heading) {
      flushParagraph(); flushList(); flushTable();
      blocks.push(React.createElement('h' + heading[1].length, { key: 'h' + i }, <Inline text={heading[2]} />));
      return;
    }
    if (listItem) {
      flushParagraph(); flushTable();
      const nextOrdered = /^\s*\d/.test(line);
      if (items.length && ordered !== nextOrdered) flushList();
      ordered = nextOrdered; items.push(listItem[1]); return;
    }
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      flushParagraph(); flushList(); table.push(cells(line)); return;
    }
    if (table.length) flushTable();
    if (!line.trim()) { flushParagraph(); flushList(); flushTable(); return; }
    flushList(); paragraph.push(line);
  });
  if (inCode) blocks.push(<pre key="code-tail"><code>{code.join('\n')}</code></pre>);
  flushParagraph(); flushList(); flushTable();
  return <div className="dg-markdown">{blocks}</div>;
}
