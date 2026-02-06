import React, { useState, useEffect } from 'react';
import { parseHtml } from './utils/parser';
import { JsonViewer } from './components/JsonViewer';
import { StructureEditor } from './components/StructureEditor';
import { JsonOutput } from './types';
import { Code2, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [inputHtml, setInputHtml] = useState<string>('');
  const [outputJson, setOutputJson] = useState<JsonOutput | null>(null);

  // Initial parse effect
  useEffect(() => {
    if (!inputHtml.trim()) {
      // Don't clear output if we are editing, only on clear
      if (inputHtml === '') setOutputJson(null);
      return;
    }
    try {
      // Only parse if we don't have data, or if the user intends to reset (not handled here fully automatically to prevent overwriting edits)
      // For this simple version, we parse whenever HTML changes.
      const result = parseHtml(inputHtml);
      setOutputJson(result);
    } catch (e) {
      console.error("Parsing error", e);
    }
  }, [inputHtml]);

  const handleJsonUpdate = (newData: JsonOutput) => {
    setOutputJson(newData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 bg-slate-900 border-b border-slate-800 h-[80px]">
        <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
          <Code2 size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">RPG HTML to JSON Parser</h1>
          <p className="text-xs text-slate-400">Algorithmic parser (No AI involved)</p>
        </div>
      </header>

      {/* Main Content - Grid Layout */}
      <main className="flex-1 p-4 overflow-hidden h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          
          {/* Column 1: Input */}
          <section className="flex flex-col gap-2 h-full overflow-hidden">
            <label className="text-sm font-medium text-slate-400 ml-1">
              1. Input HTML
            </label>
            <div className="flex-1 relative rounded-lg border border-slate-700 bg-slate-900 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all overflow-hidden">
              <textarea
                className="w-full h-full p-4 bg-transparent resize-none outline-none font-mono text-xs sm:text-sm text-slate-300 placeholder-slate-600"
                placeholder="Paste character sheet HTML here..."
                value={inputHtml}
                onChange={(e) => setInputHtml(e.target.value)}
                spellCheck={false}
              />
            </div>
          </section>

          {/* Column 2: Editor */}
          <section className="flex flex-col gap-2 h-full overflow-hidden">
            <label className="text-sm font-medium text-slate-400 ml-1">
              2. Edit & Organize
            </label>
            {outputJson ? (
              <StructureEditor data={outputJson} onUpdate={handleJsonUpdate} />
            ) : (
              <div className="flex-1 flex items-center justify-center border border-slate-800 border-dashed rounded-lg bg-slate-900/50">
                <span className="text-slate-500 text-sm">Waiting for input...</span>
              </div>
            )}
          </section>

          {/* Column 3: Output */}
          <section className="flex flex-col gap-2 h-full overflow-hidden">
            <label className="text-sm font-medium text-slate-400 ml-1">
              3. Result JSON
            </label>
            {outputJson ? (
              <JsonViewer data={outputJson} />
            ) : (
              <div className="flex-1 flex items-center justify-center border border-slate-800 border-dashed rounded-lg bg-slate-900/50">
                <span className="text-slate-500 text-sm">JSON preview</span>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;