import React from 'react';

export const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let listItemsBuffer: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const renderInline = (textSegment: string): React.ReactNode => {
    // Regex splits: Code (`...`), Bold (**...**), Italic (*...*)
    const parts = textSegment.split(/(`[^`]+`|\*\*.*?\*\*|\*[^*]+\*)/g);
    
    return (
      <React.Fragment>
        {parts.map((part, index) => {
          // Inline Code
          if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
              <code key={index} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200">
                {part.slice(1, -1)}
              </code>
            );
          }
          // Bold
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
              <strong key={index} className="font-bold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          // Italic
          if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return (
              <em key={index} className="italic text-slate-800">
                {part.slice(1, -1)}
              </em>
            );
          }
          // Plain Text
          return <span key={index}>{part}</span>;
        })}
      </React.Fragment>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle Code Blocks (```)
    if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
            // End of code block
            renderedElements.push(
                <div key={`codeblock-${i}`} className="bg-slate-800 text-slate-50 p-3 rounded-lg my-3 overflow-x-auto text-xs font-mono shadow-sm">
                    <pre>{codeBlockBuffer.join('\n')}</pre>
                </div>
            );
            codeBlockBuffer = [];
            inCodeBlock = false;
        } else {
            // Start of code block - flush lists first
            if (listItemsBuffer.length > 0) {
                 renderedElements.push(
                    <ul key={`ul-${i}`} className="list-disc pl-5 mb-4 space-y-1">
                        {listItemsBuffer}
                    </ul>
                 );
                 listItemsBuffer = [];
            }
            inCodeBlock = true;
        }
        continue;
    }

    if (inCodeBlock) {
        codeBlockBuffer.push(line);
        continue;
    }

    // Detect Lists
    const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');

    if (isListItem) {
      const content = trimmedLine.replace(/^[-*]\s+/, '');
      listItemsBuffer.push(
        <li key={`li-${i}`} className="mb-1 pl-1 leading-relaxed text-slate-700">
          {renderInline(content)}
        </li>
      );
    } else {
      // Flush previous list if any
      if (listItemsBuffer.length > 0) {
        renderedElements.push(
          <ul key={`ul-prev-${i}`} className="list-disc pl-5 mb-4 space-y-1">
            {listItemsBuffer}
          </ul>
        );
        listItemsBuffer = [];
      }

      if (trimmedLine.length > 0) {
        renderedElements.push(
          <p key={`p-${i}`} className="mb-4 text-slate-700 leading-relaxed last:mb-0">
            {renderInline(trimmedLine)}
          </p>
        );
      }
    }
  }

  // Flush remaining list items
  if (listItemsBuffer.length > 0) {
    renderedElements.push(
      <ul key="ul-end" className="list-disc pl-5 mb-0 space-y-1">
        {listItemsBuffer}
      </ul>
    );
  }
  
  // Flush open code block (edge case)
  if (inCodeBlock && codeBlockBuffer.length > 0) {
      renderedElements.push(
          <div key={`codeblock-end`} className="bg-slate-800 text-slate-50 p-3 rounded-lg my-3 overflow-x-auto text-xs font-mono shadow-sm">
              <pre>{codeBlockBuffer.join('\n')}</pre>
          </div>
      );
  }

  return <div className="text-sm text-slate-700">{renderedElements}</div>;
};