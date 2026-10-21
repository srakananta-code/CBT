import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathFormulaProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Komponen cerdas untuk merender teks dengan formula matematika LaTeX ($...$ atau $$...$$)
 * serta mendukung tabel markdown dan pemformatan teks.
 */
export const MathFormula: React.FC<MathFormulaProps> = ({ content, className = '', inline = false }) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Function to render KaTeX formula safely
    const renderLatex = (latex: string, displayMode: boolean): string => {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode,
          throwOnError: false,
          output: 'htmlAndMathml'
        });
      } catch (err) {
        return `<span class="text-rose-500 font-mono text-xs">[Formula Error: ${latex}]</span>`;
      }
    };

    let processed = content;

    // 1. Process Block Math: $$...$$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const rendered = renderLatex(math, true);
      return `<div class="my-2.5 overflow-x-auto py-1 text-center font-serif">${rendered}</div>`;
    });

    // 2. Process Inline Math: $...$
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      const rendered = renderLatex(math, false);
      return `<span class="inline-block mx-0.5 font-serif align-middle">${rendered}</span>`;
    });

    // 3. Process Simple Table format: | a | b |
    if (processed.includes('|') && processed.includes('\n')) {
      const lines = processed.split('\n');
      const tableLines: string[] = [];
      let inTable = false;
      const resultLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          if (!inTable) inTable = true;
          tableLines.push(line);
        } else {
          if (inTable) {
            // Render accumulated table lines
            resultLines.push(renderMarkdownTable(tableLines));
            tableLines.length = 0;
            inTable = false;
          }
          resultLines.push(lines[i]);
        }
      }
      if (inTable && tableLines.length > 0) {
        resultLines.push(renderMarkdownTable(tableLines));
      }
      processed = resultLines.join('\n');
    }

    return processed;
  }, [content]);

  if (inline) {
    return (
      <span
        className={`leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    );
  }

  return (
    <div
      className={`leading-relaxed text-slate-800 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
};

function renderMarkdownTable(lines: string[]): string {
  if (lines.length < 2) return lines.join('\n');

  const rows = lines
    .filter(l => !l.match(/^\|[\s\-:]+\|$/)) // Filter out separator line |---|---|
    .map(line => {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      return cells;
    });

  if (rows.length === 0) return '';

  const headerRow = rows[0];
  const bodyRows = rows.slice(1);

  let html = '<div class="my-3 overflow-x-auto"><table class="min-w-full text-xs border border-slate-300 rounded-lg overflow-hidden">';
  html += '<thead class="bg-slate-100 border-b border-slate-300"><tr>';
  headerRow.forEach(cell => {
    html += `<th class="px-3 py-2 text-left font-bold text-slate-700 border-r border-slate-200 last:border-r-0">${cell}</th>`;
  });
  html += '</tr></thead><tbody class="divide-y divide-slate-200 bg-white">';
  bodyRows.forEach(row => {
    html += '<tr class="hover:bg-slate-50">';
    row.forEach(cell => {
      html += `<td class="px-3 py-2 text-slate-800 border-r border-slate-200 last:border-r-0">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  return html;
}
