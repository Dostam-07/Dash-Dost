import React, { useRef, useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Copy,
  Trash2,
  CornerDownLeft,
  FileJson,
  Check,
  Bot,
  User,
  Activity,
  History,
  Database,
  X,
} from 'lucide-react';
import { useAppStore } from '../store';
import { ChatMessage, MasterDashboardPayload } from '../types';
import { SavedDashboardsManager } from './SavedDashboardsManager';

interface ConversationalPanelProps {
  onRefine: (prompt: string, mode: 'edit' | 'new') => void;
  onClearWorkspace: () => void;
}

export const ConversationalPanel: React.FC<ConversationalPanelProps> = ({
  onRefine,
  onClearWorkspace,
}) => {
  const {
    chats,
    currentPayload,
    isStreaming,
    streamProgressText,
    saveDashboard,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'edit' | 'new'>('edit');
  const [copied, setCopied] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onRefine(input, mode);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isStreaming) {
        onRefine(input, mode);
        setInput('');
      }
    }
  };

  const handleCopyJSON = () => {
    if (!currentPayload) return;
    navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick helper to see progress stages based on token buffers
  const renderStreamingStages = () => {
    if (!isStreaming) return null;
    
    const componentsCount = currentPayload?.components?.length || 0;
    const filtersCount = currentPayload?.filters?.length || 0;
    const titleVal = currentPayload?.title || "";

    const hasTitle = titleVal && titleVal !== "Generating Dashboard...";
    const hasFilters = filtersCount > 0;
    const hasKPIs = currentPayload?.components?.some(c => c.type === 'kpi_card') || false;
    const hasCharts = currentPayload?.components?.some(c => c.type !== 'kpi_card') || false;

    return (
      <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/50 dark:bg-indigo-950/10 dark:border-indigo-900/40 space-y-3 font-mono text-[11px]">
        <div className="flex items-center gap-2 mb-1.5 text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider text-[10px]">
          <Activity className="h-3.5 w-3.5 animate-spin" />
          <span>Generative Compilation Stages</span>
        </div>

        <div className="space-y-2 text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasTitle ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-400 animate-bounce'}`} />
            <span className={hasTitle ? 'text-emerald-600 font-bold dark:text-emerald-400' : 'text-zinc-500'}>
              Phase 1: Metadata Framework {hasTitle ? '✓' : '...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasKPIs ? 'bg-emerald-500 animate-pulse' : hasTitle ? 'bg-indigo-400 animate-bounce' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            <span className={hasKPIs ? 'text-emerald-600 font-bold dark:text-emerald-400' : hasTitle ? 'text-zinc-500 animate-pulse' : 'text-zinc-400'}>
              Phase 2: High Aggregate KPIs {hasKPIs ? '✓' : '...'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${hasCharts ? 'bg-emerald-500 animate-pulse' : hasKPIs ? 'bg-indigo-400 animate-bounce' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            <span className={hasCharts ? 'text-emerald-600 font-bold dark:text-emerald-400' : hasKPIs ? 'text-zinc-500 animate-pulse' : 'text-zinc-400'}>
              Phase 3: High-Res Analytics Charts {hasCharts ? '✓' : '...'}
            </span>
          </div>
        </div>
        
        {streamProgressText && (
          <div className="border-t border-indigo-100 dark:border-indigo-950/60 pt-2 text-[10px] text-zinc-400 dark:text-zinc-500 italic truncate">
            {streamProgressText}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 dark:bg-zinc-950/60 dark:border-zinc-950/80">
      
      {/* Title / Gallery bar */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-90 w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 sm:h-5 w-4 sm:w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
            Dash-Dost AI Assistant
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 pointer-events-auto relative z-20">
          <div className="flex bg-slate-50 dark:bg-zinc-900 rounded-lg p-0.5 border border-slate-200 dark:border-zinc-800">
            <button
               onClick={() => setMode('edit')}
               className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${mode === 'edit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
            >
              EDIT
            </button>
            <button
               onClick={() => setMode('new')}
               className={`px-2 py-1 text-[9px] font-bold rounded transition-all ${mode === 'new' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'}`}
            >
              NEW
            </button>
          </div>
          <button
            onClick={() => {
              useAppStore.getState().loadSavedDashboardsList();
              setShowHistoryModal(!showHistoryModal);
            }}
            className="p-1.5 px-2.5 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:text-indigo-600 dark:hover:bg-zinc-900 dark:hover:text-indigo-400 inline-flex items-center gap-1 font-mono transition-all border border-transparent hover:border-slate-200 dark:hover:border-zinc-800 shadow-sm"
            title="Browse generated boards library"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Gallery</span>
          </button>
        </div>
      </div>

      {/* History view overlay inside the panel itself or on hover */}
      {showHistoryModal && (
        <div className="p-4 bg-zinc-100/60 dark:bg-zinc-950/40 border-b border-zinc-200/50 dark:border-zinc-900/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase font-mono tracking-wider">Historical Boards Library</span>
            <button 
              onClick={() => setShowHistoryModal(false)}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 underline"
            >
              Close
            </button>
          </div>
          <SavedDashboardsManager 
            onLoadDashboard={async (meta) => {
              const fullPayload = await useAppStore.getState().saveDashboard; // load from idb helper
              const fetched = await (async () => {
                const { get } = await import('idb-keyval');
                return await get(`dash_${meta.dashboardId}`) as MasterDashboardPayload;
              })();
              if (fetched) {
                useAppStore.getState().setCurrentPayload(fetched);
                // set associated conversation logs
                useAppStore.getState().setChats([
                  {
                    id: Math.random().toString(),
                    role: 'user',
                    content: meta.prompt,
                    timestamp: meta.savedAt
                  },
                  {
                    id: Math.random().toString(),
                    role: 'assistant',
                    content: `Loaded saved dashboard **${fetched.title}** from your local-first library storage successfully.`,
                    timestamp: new Date().toISOString(),
                    associatedPayload: fetched
                  }
                ]);
              }
              setShowHistoryModal(false);
            }}
          />
        </div>
      )}

      {/* Conversational Prompt Log area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/40">
        {chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4 space-y-2">
            <Sparkles className="h-8 w-8 text-slate-350 dark:text-zinc-750 animate-pulse" />
            <span className="text-xs font-semibold font-mono text-slate-500">Awaiting your design instructions</span>
            <p className="text-[11px] text-slate-400 max-w-[210px] leading-relaxed">
              Create a custom dashboard or click a suggestion below to begin.
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              className={`flex gap-3 max-w-[85%] ${
                chat.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`p-2.5 rounded-lg text-xs leading-relaxed border ${
                chat.role === 'user'
                  ? 'bg-indigo-600 border-indigo-600 text-white rounded-tr-none shadow-sm'
                  : 'bg-white border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800/80 dark:text-zinc-100 rounded-tl-none shadow-sm'
              }`}>
                {chat.content}
              </div>
            </div>
          ))
        )}

        {/* Streaming Animation Phases overlay */}
        {renderStreamingStages()}
      </div>

      {/* Persistent Quick Action Panel */}
      {currentPayload && (
        <div className="px-4 py-2 border-t border-slate-200 bg-white dark:bg-zinc-950 dark:border-zinc-900/65 grid grid-cols-2 gap-2 text-[10px]">
          <button
            onClick={handleCopyJSON}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/20 text-slate-600 hover:text-indigo-600 dark:border-zinc-800 dark:text-zinc-404 dark:hover:border-indigo-900/40 dark:hover:text-indigo-400 transition-all font-mono shadow-sm"
            title="Copy compiled JSON config"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <FileJson className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
          
          <button
            onClick={onClearWorkspace}
            className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50/20 text-slate-600 hover:text-rose-500 dark:border-zinc-800 dark:text-zinc-404 dark:hover:border-rose-950/20 dark:hover:text-rose-400 transition-all font-mono shadow-sm"
            title="Clean workspace and start fresh"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Canvas</span>
          </button>
        </div>
      )}

      {/* Prompt Enter Box */}
      <div className="p-4 border-t border-slate-200 bg-white dark:bg-zinc-950 dark:border-zinc-900/60 relative z-10">
        {useAppStore.getState().attachedData && (
          <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg w-max border border-indigo-100 dark:border-indigo-900/40 animate-fade-in relative -top-1">
            <Database className="h-3 w-3 text-indigo-500" />
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono">
              Data: {useAppStore.getState().attachedData?.fileName}
            </span>
            <button 
              type="button"
              onClick={() => useAppStore.getState().setAttachedData(null)}
              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 ml-1"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textAreaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? "Compiling layout..."
                : "Ask for refinements (e.g. 'Add a region filter and change chart colors to emerald')..."
            }
            className="w-full pl-3 pr-10 py-2.5 text-xs rounded-lg border border-slate-200 text-slate-700 bg-slate-50 focus:border-indigo-500 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-indigo-450 focus:outline-none transition-all resize-none shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={`absolute right-2 bottom-3 p-1.5 rounded-lg text-white transition-all ${
              input.trim() && !isStreaming
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/10 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                : 'bg-slate-200 dark:bg-zinc-800 text-slate-400'
            }`}
          >
            <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 text-center font-mono select-none">
          Use Shift+Enter for new line
        </p>
      </div>

    </div>
  );
};
