import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split into lines/blocks
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let codeBlockIndex = 0;

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable) return;
    const key = `table-${renderedElements.length}`;
    renderedElements.push(
      <div key={key} className="my-4 overflow-x-auto rounded-lg border border-slate-700/60 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-200">
          {tableHeader.length > 0 && (
            <thead className="bg-slate-800/80 text-cyan-300 border-b border-slate-700 font-mono">
              <tr>
                {tableHeader.map((th, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold">
                    {parseInlineMarkdown(th)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-800">
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 text-slate-300">
                    {parseInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBlockLines.join('\n');
        const currIndex = codeBlockIndex++;
        renderedElements.push(
          <div key={`code-${currIndex}`} className="my-3 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950/90 shadow-md">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="uppercase font-medium text-cyan-400">{codeBlockLang || 'code'}</span>
              <button
                onClick={() => handleCopyCode(codeText, currIndex)}
                className="flex items-center gap-1 hover:text-cyan-300 transition-colors"
                title="Copy code"
              >
                {copiedIndex === currIndex ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 text-xs font-mono text-cyan-100 overflow-x-auto leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockLines = [];
        continue;
      } else {
        // Start code block
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.replace('```', '').trim();
        codeBlockLines = [];
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Table row detection (| cell | cell |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      // Check if it's separator line (e.g., |:---|:---|)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (isSeparator) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Rule
    if (/^---$|^\*\*\*$/.test(line.trim())) {
      renderedElements.push(<hr key={`hr-${i}`} className="my-4 border-slate-700/60" />);
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-base font-bold text-cyan-300 mt-4 mb-2 tracking-tight">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-white mt-5 mb-2.5 tracking-tight flex items-center gap-2">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-xl font-bold text-white mt-6 mb-3 tracking-tight">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      renderedElements.push(
        <h4 key={`h4-${i}`} className="text-xs font-semibold uppercase tracking-wider text-teal-300 mt-3.5 mb-1.5 font-mono">
          {parseInlineMarkdown(line.slice(5))}
        </h4>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      renderedElements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-3 pl-3.5 py-1.5 border-l-2 border-cyan-400 bg-cyan-950/20 text-slate-300 text-xs italic rounded-r"
        >
          {parseInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // List items (unordered: -, *, •)
    if (/^[-*•]\s+/.test(line.trim())) {
      const text = line.trim().replace(/^[-*•]\s+/, '');
      renderedElements.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-slate-200 text-xs sm:text-sm my-1 leading-relaxed">
          {parseInlineMarkdown(text)}
        </li>
      );
      continue;
    }

    // Ordered list item (e.g. 1. 2.)
    if (/^\d+\.\s+/.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (match) {
        renderedElements.push(
          <div key={`oli-${i}`} className="flex items-baseline gap-2 text-slate-200 text-xs sm:text-sm my-1.5 leading-relaxed">
            <span className="font-mono text-cyan-400 font-semibold text-xs shrink-0">{match[1]}.</span>
            <span>{parseInlineMarkdown(match[2])}</span>
          </div>
        );
        continue;
      }
    }

    // Empty lines
    if (!line.trim()) {
      renderedElements.push(<div key={`space-${i}`} className="h-2" />);
      continue;
    }

    // Standard paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-200 leading-relaxed my-1">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  if (inTable) {
    flushTable();
  }

  return <div className="space-y-1">{renderedElements}</div>;
};

/**
 * Security check: validate that link protocols are safe (http, https, mailto, relative).
 * Rejects javascript:, data:, and vbscript: execution vectors.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return false;
  }
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  );
}

/**
 * Handles bold (**text**) and italic (*text*) styling.
 */
function parseFormatting(text: string, baseKey: string): React.ReactNode[] {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((bPart, bIdx) => {
    if (bPart.startsWith('**') && bPart.endsWith('**') && bPart.length > 4) {
      return (
        <strong key={`${baseKey}-b-${bIdx}`} className="font-semibold text-white">
          {bPart.slice(2, -2)}
        </strong>
      );
    }

    const italicParts = bPart.split(/(\*[^*]+\*)/g);
    return italicParts.map((iPart, iIdx) => {
      if (iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) {
        return (
          <em key={`${baseKey}-b-${bIdx}-i-${iIdx}`} className="italic text-slate-300">
            {iPart.slice(1, -1)}
          </em>
        );
      }
      return iPart;
    });
  });
}

/**
 * Handles inline styles: bold (**text**), italic (*text*), inline code (`code`), and clickable markdown links ([text](url))
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  // 1. Split by inline code first: `code`
  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`code-${idx}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] sm:text-xs border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // 2. Parse markdown links: [label](url)
    const linkParts = part.split(/(\[[^\]]+\]\([^\s)]+\))/g);
    return linkParts.map((lPart, lIdx) => {
      const linkMatch = lPart.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        if (isSafeUrl(url)) {
          return (
            <a
              key={`link-${idx}-${lIdx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium"
            >
              {parseFormatting(label, `l-${idx}-${lIdx}`)}
            </a>
          );
        }
      }

      // 3. Parse bold & italic
      return parseFormatting(lPart, `txt-${idx}-${lIdx}`);
    });
  });
}
