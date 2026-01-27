
import React, { useState, useEffect } from 'react';
import { LogEntry, BattleParticipant } from '../types';
import { ChevronLeft, ChevronRight, Clipboard, Save, BarChart3, ScrollText, ListEnd, RotateCcw } from 'lucide-react';
import { generateSummary, generateStatsText } from '../engine/formatters';

interface Props {
  logs: LogEntry[];
  currentRound: number;
  participants: BattleParticipant[];
  onUpdateLogs: (logs: LogEntry[]) => void;
  onUpdateParticipant?: (id: string, updates: any) => void;
  onRollback?: (round: number) => void;
}

// Tabs
type Tab = 'stats' | 'log' | 'summary';

const BattleLog: React.FC<Props> = ({ logs, currentRound, participants, onUpdateLogs, onUpdateParticipant, onRollback }) => {
  const [activeTab, setActiveTab] = useState<Tab>('log'); 
  const [viewRound, setViewRound] = useState(currentRound);
  
  // Text Areas State
  const [summaryText, setSummaryText] = useState("");
  const [localLogText, setLocalLogText] = useState("");
  const [localStatsText, setLocalStatsText] = useState("");
  
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
      setViewRound(currentRound);
  }, [currentRound]);

  // Sync Data on Round Change or Mount
  useEffect(() => {
      // 1. LOG TEXT
      const roundEntries = logs.filter(l => l.round === viewRound && l.type !== 'system');
      const joinedText = roundEntries.map(l => l.text_formatted).join('\n\n');
      setLocalLogText(joinedText);

      // 2. FIND SNAPSHOT
      const snapshotLog = logs.find(l => l.round === viewRound && l.details?.participants_snapshot);

      // 3. SUMMARY
      const allEntriesForRound = logs.filter(l => l.round === viewRound);
      const entryWithSummary = allEntriesForRound.reverse().find(l => l.summary !== undefined && l.summary !== null && l.type !== 'system');

      if (entryWithSummary) {
          setSummaryText(entryWithSummary.summary || "");
      } else if (snapshotLog && snapshotLog.summary) {
          setSummaryText(snapshotLog.summary);
      } else {
          if (viewRound === currentRound) {
              setSummaryText(generateSummary(participants, currentRound));
          } else {
              setSummaryText("(Нет сохраненного итога)"); 
          }
      }
      
      // 4. STATS
      if (!isDirty) {
          if (viewRound === currentRound) {
              setLocalStatsText(generateStatsText(participants));
          } else if (snapshotLog && snapshotLog.details?.stats_snapshot) {
              setLocalStatsText(snapshotLog.details.stats_snapshot);
          } else {
              setLocalStatsText("(Нет сохраненных характеристик)");
          }
      }

      setIsDirty(false);
  }, [viewRound, logs, participants, currentRound]); 

  const handleTextChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setter(e.target.value);
      setIsDirty(true);
  };

  const parseAndSaveStats = () => {
      if (!onUpdateParticipant) return;

      const blocks = localStatsText.split(/\n\s*\n/);

      blocks.forEach(block => {
          const lines = block.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length === 0) return;

          const headerMatch = lines[0].match(/^(.+)\s\(\d+\s*ур\.\)$/i);
          const name = headerMatch ? headerMatch[1].trim() : lines[0].trim();
          
          const participant = participants.find(p => p.profile.name === name);
          if (participant) {
              const newStats = { ...participant.stats };
              
              lines.forEach(line => {
                  const lower = line.toLowerCase();
                  const matchVal = line.match(/:\s*(-?\d+)/);
                  
                  if (matchVal) {
                      const val = parseInt(matchVal[1]);
                      if (!isNaN(val)) {
                          if (lower.startsWith('физ')) newStats.phys = val;
                          else if (lower.startsWith('маг')) newStats.magic = val;
                          else if (lower.startsWith('уник')) newStats.unique = val;
                      }
                  }
              });

              onUpdateParticipant(participant.instance_id, { stats: newStats });
          }
      });
  };

  const saveChanges = () => {
      const otherRoundLogs = logs.filter(l => l.round !== viewRound);
      const systemLogs = logs.filter(l => l.round === viewRound && l.type === 'system'); 
      
      const newEntry: LogEntry = {
          id: `edited-${viewRound}-${Date.now()}`,
          round: viewRound,
          timestamp: new Date().toISOString(),
          type: 'action',
          text_formatted: localLogText,
          summary: summaryText 
      };

      const newLogs = [...otherRoundLogs, ...systemLogs];
      if (localLogText.trim()) {
          newLogs.push(newEntry);
      }
      
      newLogs.sort((a, b) => {
           if (a.round !== b.round) return a.round - b.round;
           return 0; 
      });

      onUpdateLogs(newLogs);

      if (activeTab === 'stats') {
          parseAndSaveStats();
      }
      
      setIsDirty(false);
  };

  const canRollback = viewRound < currentRound && logs.some(l => l.round === viewRound && l.details?.participants_snapshot);

  const getLineColor = (line: string) => {
      const trim = line.trim();
      
      // System (Start/End) -> Vertical Purple
      if (trim.includes('НАЧАЛО РАУНДА') || trim.includes('ЗАВЕРШЕНИЕ')) {
          return 'bg-violet-500 shadow-[0_0_8px_#8b5cf6] h-3 w-1 rounded-full';
      } 
      
      // Form (Gold) -> Starts with > <
      else if (trim.startsWith('> <')) {
          return 'bg-amber-400 shadow-[0_0_5px_#fbbf24] h-3 w-1 rounded-full';
      }
      
      // Buff (Emerald) -> Starts with > (
      else if (trim.startsWith('> (')) {
          return 'bg-emerald-500 shadow-[0_0_5px_#10b981] h-3 w-1 rounded-full';
      } 
      
      // Combo (Bright Blue) -> Starts with > [
      else if (trim.startsWith('> [')) {
          return 'bg-blue-500 shadow-[0_0_5px_#3b82f6] h-3 w-1 rounded-full';
      } 
      
      // Logic (Dark Blue) -> Starts with > { or Condition
      else if (trim.startsWith('> {') || trim.startsWith('{') || trim.includes('Condition:') || trim.includes('Если')) {
          return 'bg-indigo-500 shadow-[0_0_5px_#6366f1] h-3 w-1 rounded-full';
      } 
      
      // Attack (Red) -> Default > 
      else if (trim.startsWith('>')) {
          return 'bg-red-600 shadow-[0_0_5px_#dc2626] h-3 w-1 rounded-full';
      }
      
      return 'bg-transparent';
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/85 backdrop-blur-sm rounded-lg shadow-xl border border-violet-900/30 overflow-hidden">
      
      {/* 1. TABS HEADER */}
      <div className="flex border-b border-violet-900/30 bg-[#020408]/50">
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'stats' ? 'bg-violet-900/20 text-violet-300 border-b-2 border-violet-500' : 'text-slate-500 hover:text-white'}`}
          >
              <BarChart3 size={14} /> Характеристики
          </button>
          <button 
            onClick={() => setActiveTab('log')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'log' ? 'bg-violet-900/20 text-violet-300 border-b-2 border-violet-500' : 'text-slate-500 hover:text-white'}`}
          >
              <ScrollText size={14} /> Лог
          </button>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'summary' ? 'bg-violet-900/20 text-violet-300 border-b-2 border-violet-500' : 'text-slate-500 hover:text-white'}`}
          >
              <ListEnd size={14} /> Итог
          </button>
      </div>

      {/* 2. ROUND CONTROLS */}
      <div className="bg-[#050b14]/50 border-b border-violet-900/20 p-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewRound(Math.max(0, viewRound - 1))}
                disabled={viewRound <= 0}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 hover:text-white"
              >
                  <ChevronLeft size={16} />
              </button>
              <span className="font-bold text-violet-400 uppercase font-rune tracking-widest">{viewRound === 0 ? "Подготовка" : `Раунд ${viewRound}`}</span>
              <button 
                onClick={() => setViewRound(Math.min(currentRound, viewRound + 1))}
                disabled={viewRound >= currentRound}
                className="p-1 hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 hover:text-white"
              >
                  <ChevronRight size={16} />
              </button>
          </div>
          <div className="flex items-center gap-2">
              {canRollback && onRollback && (
                  <button 
                    onClick={() => onRollback(viewRound)}
                    className="flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded px-2 py-1 text-[10px] uppercase font-bold transition-all mr-2"
                    title="Вернуться к состоянию на конец этого раунда"
                  >
                      <RotateCcw size={10} /> Переиграть сл.
                  </button>
              )}

              {isDirty && (
                  <button 
                    onClick={saveChanges}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold animate-pulse uppercase text-[10px] tracking-wider"
                  >
                      <Save size={12} /> Сохранить
                  </button>
              )}
          </div>
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 bg-[#020408]/30 relative overflow-hidden flex flex-col">
         
         {activeTab === 'stats' && (
             <div className="h-full flex flex-col">
                 <textarea 
                    className="flex-1 bg-transparent text-slate-300 p-4 outline-none resize-none font-mono text-xs leading-relaxed selection:bg-violet-900/50"
                    value={localStatsText}
                    onChange={handleTextChange(setLocalStatsText)}
                    spellCheck={false}
                    placeholder="Данные участников..."
                 />
             </div>
         )}
         
         {activeTab === 'log' && (
             <div className="flex-1 overflow-y-auto custom-scrollbar relative pl-2">
                 {/* 
                    Stacked Layout for Auto-Growing Input with Visual Markers.
                    The bottom 'div' creates the structure and height based on text content.
                    The top 'textarea' is absolute and fills that height, allowing editing.
                 */}
                 <div className="relative min-h-full">
                     
                     {/* Layer 1: Visual Backdrop (Determines Height) */}
                     <div className="p-4 font-mono text-xs leading-6 whitespace-pre-wrap break-words pointer-events-none w-full border-none">
                        {localLogText.split('\n').map((line, i) => (
                            <div key={i} className="relative">
                                {/* The Marker */}
                                <div className={`absolute -left-3 top-1.5 transition-all duration-300 ${getLineColor(line)}`}></div>
                                {/* Invisible text to force height/width match */}
                                <span className="opacity-0">{line || ' '}</span> 
                            </div>
                        ))}
                        {/* Extra character to ensure height captures trailing newline cursor position if needed */}
                        <span className="opacity-0">.</span>
                     </div>

                     {/* Layer 2: Actual Editor */}
                     <textarea 
                        className="absolute inset-0 w-full h-full bg-transparent text-slate-300 p-4 font-mono text-xs leading-6 whitespace-pre-wrap break-words outline-none resize-none overflow-hidden selection:bg-violet-900/50 placeholder-slate-700"
                        value={localLogText}
                        onChange={handleTextChange(setLocalLogText)}
                        spellCheck={false}
                        placeholder="Лог раунда пуст..."
                     />
                 </div>
             </div>
         )}

         {activeTab === 'summary' && (
             <div className="h-full flex flex-col">
                 <div className="p-2 bg-violet-900/10 text-[10px] text-slate-500 uppercase tracking-widest border-b border-violet-900/20 flex justify-between items-center">
                     <span>Сводка (Раунд {viewRound})</span>
                     <button onClick={() => navigator.clipboard.writeText(summaryText)} title="Копировать" className="hover:text-white"><Clipboard size={12}/></button>
                 </div>
                 <textarea 
                    className="flex-1 bg-transparent text-slate-300 p-4 text-xs font-mono outline-none resize-none selection:bg-emerald-900/50"
                    value={summaryText}
                    onChange={handleTextChange(setSummaryText)}
                    placeholder={viewRound < currentRound && !summaryText ? "(Нет сохраненного итога)" : "Здесь будет сводка раунда..."}
                    spellCheck={false}
                 />
             </div>
         )}
      </div>
    </div>
  );
};

export default BattleLog;
