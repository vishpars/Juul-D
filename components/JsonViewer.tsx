import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  data: any;
}

export const JsonViewer: React.FC<Props> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-sm font-semibold text-slate-300">JSON Output</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs sm:text-sm font-mono text-emerald-400 whitespace-pre-wrap">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};