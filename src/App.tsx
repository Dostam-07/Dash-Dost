import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, loadDashboardFromIDB } from './store';
import { SavedDashboardsManager } from './components/SavedDashboardsManager';
import { parsePartialPayload } from './utils/jsonRepair';
import { filterComponentData, ActiveFilterState } from './utils/filterEngine';
import { normalizeGeoData } from './utils/dataNormalization';
import { ChartWrapper } from './components/ChartWrapper';
import { FiltersPanel } from './components/FiltersPanel';
import { SuggestionChips } from './components/SuggestionChips';
import { ConversationalPanel } from './components/ConversationalPanel';
import { validateDashboardPayload } from './utils/schemaValidation';
import { EditComponentModal } from './components/EditComponentModal';
import { EditFilterModal } from './components/EditFilterModal';
import { DashboardComponent, DashboardFilter, MasterDashboardPayload } from './types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
} catch(e) {}
import * as mammoth from 'mammoth';
import {
  Sparkles,
  Sun,
  Moon,
  Activity,
  Code,
  Share2,
  RefreshCcw,
  BarChart,
  Grid2X2,
  ListRestart,
  Undo,
  Redo,
  Upload,
  Download,
  Plus,
  Compass,
  CheckCircle,
  AlertOctagon,
  X,
  Camera,
  Database,
  GripVertical,
  History,
  MessageSquare,
  Search,
  LayoutTemplate
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';

interface SortableDashboardItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableDashboardItem({ id, children }: SortableDashboardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 40 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full relative group/draggable">
      <div 
        {...attributes} 
        {...listeners} 
        data-html2canvas-ignore
        className="absolute top-4 left-4 z-10 opacity-0 group-hover/draggable:opacity-100 transition-all p-1 bg-white/95 hover:bg-slate-50 dark:bg-zinc-900/95 dark:hover:bg-zinc-850 rounded border border-slate-200 dark:border-zinc-800 cursor-grab active:cursor-grabbing text-slate-450 hover:text-indigo-650 shadow-sm"
        title="Drag to reorder component"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      {children}
    </div>
  );
}

interface SortableTabItemProps {
  key: string | number;
  id: string;
  activeTab: string;
  onClick: () => void;
  onDuplicate: (tab: string) => void;
}

function SortableTabItem({ id, activeTab, onClick, onDuplicate }: SortableTabItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 40 : 'auto',
  };

  const [showMenu, setShowMenu] = useState(false);

  return (
    <div ref={setNodeRef} style={style} className="relative group/tab flex items-center pr-1 pl-1">
      <button
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={`px-3 py-1.5 text-xs font-bold rounded-l-lg transition-all border font-mono select-none flex items-center gap-1.5 cursor-pointer shrink-0 ${
          activeTab === id
            ? 'bg-indigo-50 border-y-indigo-200 border-l-indigo-200 border-r-transparent text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'
            : 'bg-white border-y-slate-200 border-l-slate-200 border-r-transparent text-slate-500 hover:bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === id ? 'bg-indigo-505 animate-pulse' : 'bg-slate-300 dark:bg-zinc-650'}`}></span>
        {id}
      </button>
      <div 
         className={`relative px-1.5 py-1.5 border-y border-r rounded-r-lg cursor-pointer ${
          activeTab === id
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
        }`}
        onClick={() => setShowMenu(!showMenu)}
        onMouseLeave={() => setShowMenu(false)}
      >
        <GripVertical className="h-3.5 w-3.5 opacity-50" />
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDuplicate(id);
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Duplicate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const {
    theme,
    setTheme,
    toggleTheme,
    chats,
    addChatMessage,
    setChats,
    clearChats,
    currentPayload,
    setCurrentPayload,
    isStreaming,
    setIsStreaming,
    setStreamProgressText,
    saveDashboard,
    loadSavedDashboardsList,
    
    // Undo/Redo structure de-structures
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo
  } = useAppStore();

  const [promptInput, setPromptInput] = useState('');
  const [filterState, setFilterState] = useState<ActiveFilterState>({
    selectedCategories: {}
  });

  // Slide-in premium inline notification
  const [notify, setNotify] = useState<{ message: string; type: 'success' | 'refuse' } | null>(null);

  // Hidden JSON files collector ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to target the active dashboard canvas for html2canvas screenshot execution
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Modular editing states
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<DashboardComponent | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<DashboardFilter | null>(null);

  // Multipage / Active Tab indexing
  const [activeTab, setActiveTab] = useState<string>('');

  // Full viewport deep analysis state
  const [fullscreenComponentId, setFullscreenComponentId] = useState<string | null>(null);

  // Responsive mobile active section selector ('history' | 'dashboard' | 'chat')
  const [mobileTab, setMobileTab] = useState<'history' | 'dashboard' | 'chat'>('dashboard');

  // Add-on 1: Global Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const savedDashboards = useAppStore(state => state.savedDashboards);

  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return savedDashboards.filter(dash => 
      (dash.title || '').toLowerCase().includes(term) ||
      (dash.subtitle || '').toLowerCase().includes(term) ||
      (dash.prompt || '').toLowerCase().includes(term)
    );
  }, [searchTerm, savedDashboards]);

  // Add-on 2: Live Mode States
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Add-on 3: AI Insights States
  const [insightsPromptOpen, setInsightsPromptOpen] = useState(false);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsText, setInsightsText] = useState<string | null>(null);

  // Add-on 4: Dashboard Layout Presets
  interface PresetConfig {
    id: string;
    name: string;
    description: string;
  }
  const [layoutPresets] = useState<PresetConfig[]>([
    {
      id: 'preset_bento',
      name: 'Bento Grid',
      description: 'Balanced arrangement with KPIs at top and side-by-side charts'
    },
    {
      id: 'preset_kpi',
      name: 'KPI Focus',
      description: 'Prioritizes KPIs as wider cards and compacts secondary charts'
    },
    {
      id: 'preset_analytic',
      name: 'Analytical Exp',
      description: 'Stretches all components to 12-column full widths for deep details'
    }
  ]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Add-on 5: Visual Section Groupings
  interface VisualSection {
    id: string;
    title: string;
    description?: string;
    componentIds: string[];
  }
  const [sections, setSections] = useState<VisualSection[]>([]);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [selectedSectionComponentIds, setSelectedSectionComponentIds] = useState<string[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Template Gallery
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const dashboardTemplates = [
    {
      id: 'template_sales',
      title: 'Sales & Revenue Overview',
      subtitle: 'Track essential business sales, ARR, and recurring revenue',
      icon: <BarChart className="h-4 w-4 text-emerald-500" />
    },
    {
      id: 'template_marketing',
      title: 'Marketing Campaign Tracking',
      subtitle: 'Web traffic, conversions, and ad performance overview',
      icon: <Activity className="h-4 w-4 text-blue-500" />
    },
    {
      id: 'template_server',
      title: 'Infrastructure & DevOps',
      subtitle: 'System load, uptime, networking and server resource telemetry',
      icon: <Database className="h-4 w-4 text-indigo-500" />
    }
  ];

  const applyTemplate = async (templateId: string) => {
    let payloadStr = "";
    
    if (templateId === "template_sales") {
      payloadStr = JSON.stringify({
        title: "Sales & Revenue Overview",
        subtitle: "Track essential business sales metrics, MRR, and returning users",
        tabOrder: ["Overview"],
        filters: [
          { id: "date_1", type: "date_range", label: "Date Range", targetKeys: ["date"] }
        ],
        components: [
          {
            id: "sales_kpi_1",
            title: "Total Revenue",
            type: "kpi_card",
            colSpan: { sm: 12, md: 4 },
            tab: "Overview",
            seriesData: [],
            kpiValue: "$145,200",
            kpiTrend: { direction: "up", label: "+12.5% MoM" }
          },
          {
            id: "sales_kpi_2",
            title: "Average Deal Size",
            type: "kpi_card",
            colSpan: { sm: 12, md: 4 },
            tab: "Overview",
            seriesData: [],
            kpiValue: "$4,250",
            kpiTrend: { direction: "up", label: "+2.1% MoM" }
          },
          {
            id: "sales_kpi_3",
            title: "New Customers",
            type: "kpi_card",
            colSpan: { sm: 12, md: 4 },
            tab: "Overview",
            seriesData: [],
            kpiValue: "842",
            kpiTrend: { direction: "down", label: "-4.2% MoM" }
          },
          {
            id: "sales_chart_1",
            title: "Revenue by Region",
            type: "bar_chart",
            colSpan: { sm: 12, md: 12 },
            tab: "Overview",
            seriesData: [
              { region: "North America", revenue: 65000, target: 60000 },
              { region: "Europe", revenue: 45000, target: 50000 },
              { region: "Asia Pacific", revenue: 25000, target: 20000 },
              { region: "Latin America", revenue: 10200, target: 15000 }
            ],
            xAxisKey: "region",
            yAxisKeys: ["revenue", "target"]
          }
        ]
      });
    }

    if (templateId === "template_marketing") {
      payloadStr = JSON.stringify({
        title: "Marketing Campaign Tracking",
        subtitle: "Web traffic, conversions, and ad performance overview",
        tabOrder: ["Traffic", "Social"],
        filters: [],
        components: [
          {
            id: "mkt_kpi_1",
            title: "Total Visitors",
            type: "kpi_card",
            colSpan: { sm: 12, md: 6 },
            tab: "Traffic",
            seriesData: [],
            kpiValue: "1.2M",
            kpiTrend: { direction: "up", label: "+18% vs Last Month" }
          },
          {
            id: "mkt_chart_1",
            title: "Visitor Traffic Sources",
            type: "pie_chart",
            colSpan: { sm: 12, md: 6 },
            tab: "Traffic",
            seriesData: [
              { source: "Direct", visitors: 400000 },
              { source: "Organic Search", visitors: 500000 },
              { source: "Social", visitors: 200000 },
              { source: "Referral", visitors: 100000 }
            ],
            xAxisKey: "source",
            yAxisKeys: ["visitors"]
          }
        ]
      });
    }

    if (templateId === "template_server") {
      payloadStr = JSON.stringify({
        title: "Infrastructure & DevOps",
        subtitle: "System load, uptime, networking and server resource telemetry",
        tabOrder: ["System Resources"],
        filters: [],
        components: [
          {
            id: "devops_chart_1",
            title: "CPU & Memory Load",
            type: "line_chart",
            colSpan: { sm: 12, md: 12 },
            tab: "System Resources",
            seriesData: Array.from({length: 24}).map((_, i) => ({
              time: `${String(i).padStart(2, '0')}:00`,
              cpu: 40 + Math.random() * 40,
              memory: 60 + Math.random() * 20
            })),
            xAxisKey: "time",
            yAxisKeys: ["cpu", "memory"]
          }
        ]
      });
    }

    if (payloadStr) {
      try {
        const payloadObj = JSON.parse(payloadStr) as MasterDashboardPayload;
        validateDashboardPayload(payloadObj);
        
        // Setup new session ID and overwrite
        const newDId = crypto.randomUUID();
        const updatedPayload = { ...payloadObj, dashboardId: newDId };
        
        // Reset state
        setCurrentPayload(updatedPayload);
        useAppStore.getState().undoStack.length = 0;
        useAppStore.getState().redoStack.length = 0;
        setChats([]);
        setPromptInput('');
        
        // Push initial state
        await pushState(updatedPayload);
        showNotification("Template applied successfully as a new layout configuration.", "success");
        setIsTemplateGalleryOpen(false);
      } catch (err: any) {
        showNotification(`Failed to load template payload: ${err.message}`, "refuse");
      }
    }
  };

  // Sync / Cache Add-ons for the active Dashboard ID
  useEffect(() => {
    if (!currentPayload?.dashboardId) {
      setSections([]);
      setActivePresetId(null);
      return;
    }
    try {
      const stored = localStorage.getItem(`dost_addons_${currentPayload.dashboardId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.sections) setSections(parsed.sections);
        if (parsed.activePresetId) setActivePresetId(parsed.activePresetId);
      } else {
        setSections([]);
        setActivePresetId(null);
      }
    } catch (_) {
      setSections([]);
      setActivePresetId(null);
    }
  }, [currentPayload?.dashboardId]);

  const saveAddons = (newSections: VisualSection[], presetId: string | null = activePresetId) => {
    if (!currentPayload?.dashboardId) return;
    try {
      localStorage.setItem(`dost_addons_${currentPayload.dashboardId}`, JSON.stringify({
        sections: newSections,
        activePresetId: presetId
      }));
    } catch (e) {
      console.warn("Failed caching addons", e);
    }
  };

  // Live Mode Tick Interval Runner
  useEffect(() => {
    if (!refreshInterval || !currentPayload) return;
    const intervalId = setInterval(() => {
      handleRefreshData();
    }, refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [refreshInterval, currentPayload]);

  // Live Refresh Mutator
  const handleRefreshData = () => {
    if (!currentPayload) return;
    setLastRefreshTime(new Date());
    
    const nextComponents = (currentPayload.components || []).map(comp => {
      // 1. Mutate KPI Values slightly
      let nextConfig = { ...comp.config };
      if (comp.type === 'kpi_card' && comp.config?.kpiValue) {
        const rawNum = parseFloat(comp.config.kpiValue.replace(/[^0-9.-]/g, ''));
        if (!isNaN(rawNum)) {
          const delta = (Math.random() - 0.5) * 0.08; // +/- 4% fluctuation
          const nextVal = Math.max(0, rawNum * (1 + delta));
          if (comp.config.kpiValue.includes('$')) {
            nextConfig.kpiValue = `$${nextVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
          } else if (comp.config.kpiValue.includes('%')) {
            nextConfig.kpiValue = `${nextVal.toFixed(1)}%`;
          } else {
            nextConfig.kpiValue = nextVal.toLocaleString(undefined, { maximumFractionDigits: 0 });
          }
        }
      }
      
      // 2. Mutate chart series points
      const nextSeries = (comp.seriesData || []).map(row => {
        const updatedRow = { ...row };
        Object.keys(updatedRow).forEach(k => {
          if (k !== comp.config?.xAxisKey && typeof updatedRow[k] === 'number') {
            const deltaPercent = (Math.random() - 0.5) * 0.12; // +/- 6% change
            const fluctuated = Math.max(0, updatedRow[k] * (1 + deltaPercent));
            updatedRow[k] = Number(Number(fluctuated).toFixed(0));
          }
        });
        return updatedRow;
      });

      return {
        ...comp,
        config: nextConfig,
        seriesData: nextSeries
      };
    });
    
    const nextPayload = {
      ...currentPayload,
      components: nextComponents
    };
    setCurrentPayload(nextPayload);
    showNotification("Refreshed components data with latest stream metrics!", "success");
  };

  // AI Insights Client Fetcher
  const fetchAIInsights = async () => {
    if (!currentPayload) return;
    setInsightsLoading(true);
    setInsightsText(null);
    setInsightsPromptOpen(true);
    
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: currentPayload })
      });
      if (response.ok) {
        const data = await response.json();
        setInsightsText(data.insights);
      } else {
        const errData = await response.json();
        setInsightsText(`### Analysis Failed\n\nFailed to compile metrics. Details: ${errData.error || response.statusText}`);
      }
    } catch (e: any) {
      setInsightsText(`### Network Timeout\n\nConnection timed out generating AI summary. Please check your connectivity.`);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Apply layout presets modifying components structure
  const applyPresetLayout = (presetId: string) => {
    if (!currentPayload) return;
    setActivePresetId(presetId);
    
    const updatedComponents = currentPayload.components.map((comp) => {
      let nextLayout = { ...comp.layout };
      if (presetId === 'preset_bento') {
        nextLayout = {
          sm: 12,
          md: comp.type === 'kpi_card' ? 6 : 12,
          lg: comp.type === 'kpi_card' ? 3 : 6
        };
      } else if (presetId === 'preset_kpi') {
        nextLayout = {
          sm: 12,
          md: comp.type === 'kpi_card' ? 12 : 6,
          lg: comp.type === 'kpi_card' ? 4 : 4
        };
      } else if (presetId === 'preset_analytic') {
        nextLayout = {
          sm: 12,
          md: 12,
          lg: 12
        };
      }
      return { ...comp, layout: nextLayout };
    });
    
    const nextPayload = { ...currentPayload, components: updatedComponents };
    setCurrentPayload(nextPayload);
    pushState(nextPayload);
    saveAddons(sections, presetId);
    showNotification(`Applied preset layout: ${presetId === 'preset_bento' ? 'Bento Grid' : presetId === 'preset_kpi' ? 'KPI Focus' : 'Analytical Expanded'}!`, "success");
  };

  // Section managers
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSec: VisualSection = {
      id: editingSectionId || `section_${Date.now()}`,
      title: newSectionTitle,
      description: newSectionDesc,
      componentIds: selectedSectionComponentIds
    };
    
    let nextSections = [...sections];
    if (editingSectionId) {
      nextSections = nextSections.map(s => s.id === editingSectionId ? newSec : s);
    } else {
      nextSections.push(newSec);
    }
    
    setSections(nextSections);
    saveAddons(nextSections);
    
    setNewSectionTitle('');
    setNewSectionDesc('');
    setSelectedSectionComponentIds([]);
    setEditingSectionId(null);
    setIsSectionModalOpen(false);
    showNotification(editingSectionId ? "Visual section updated!" : "New grouping container section created!", "success");
  };

  const handleDeleteSection = (secId: string) => {
    const nextSections = sections.filter(s => s.id !== secId);
    setSections(nextSections);
    saveAddons(nextSections);
    showNotification("Visual container section disbanded.", "success");
  };

  // DND Sensors definition
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTabDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentPayload) return;

    const oldIndex = orderedTabs.indexOf(active.id.toString());
    const newIndex = orderedTabs.indexOf(over.id.toString());

    if (oldIndex === -1 || newIndex === -1) return;

    const newTabOrder = arrayMove(orderedTabs, oldIndex, newIndex);
    const nextPayload = {
      ...currentPayload,
      tabOrder: newTabOrder
    };

    await pushState(nextPayload);
    showNotification("Tab reordered", "success");
  };

  const handleDuplicateTab = async (tabName: string) => {
    if (!currentPayload) return;
    
    // Find all components in this tab
    const tabComponents = currentPayload.components.filter(c => c.tab === tabName);
    const newTabName = `${tabName} (Copy)`;
    
    // Create duplicated components with new IDs and new tabname
    const duplicatedComponents = tabComponents.map(c => ({
      ...c,
      id: `${c.id}_copy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${c.title} (Copy)`,
      tab: newTabName
    }));
    
    const newComponents = [...currentPayload.components, ...duplicatedComponents];
    
    const newTabOrder = [...orderedTabs];
    const insertIndex = newTabOrder.indexOf(tabName);
    if (insertIndex !== -1) {
      newTabOrder.splice(insertIndex + 1, 0, newTabName);
    } else {
      newTabOrder.push(newTabName);
    }
    
    const nextPayload = {
      ...currentPayload,
      components: newComponents,
      tabOrder: newTabOrder
    };
    
    await pushState(nextPayload);
    setActiveTab(newTabName);
    showNotification(`Duplicated tab '${tabName}' to '${newTabName}'`);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = componentsToRender.findIndex((c) => c.id === active.id);
    const newIndex = componentsToRender.findIndex((c) => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTabComponents = arrayMove(componentsToRender, oldIndex, newIndex);

    if (!currentPayload) return;

    const resultComponents: DashboardComponent[] = [];
    let tabCompIndex = 0;
    
    currentPayload.components.forEach((originalComp) => {
      const isFromActiveTab = componentsToRender.some((tr) => tr.id === originalComp.id);
      if (isFromActiveTab) {
        resultComponents.push(reorderedTabComponents[tabCompIndex++]);
      } else {
        resultComponents.push(originalComp);
      }
    });

    const nextPayload = {
      ...currentPayload,
      components: resultComponents,
    };

    await pushState(nextPayload);
    showNotification("Dashboard layout updated!", 'success');
  };

  // Extract unique custom pagination pages/tabs
  const uniqueTabs = Array.from(new Set(
    currentPayload?.components
      ?.map(c => c.tab)
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0) || []
  ));

  const orderedTabs = currentPayload?.tabOrder
    ? [...uniqueTabs].sort((a, b) => {
        const idxA = currentPayload.tabOrder!.indexOf(a);
        const idxB = currentPayload.tabOrder!.indexOf(b);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      })
    : uniqueTabs;

  // Initialize active tab slice default
  useEffect(() => {
    if (orderedTabs.length > 0) {
      if (!activeTab || !orderedTabs.includes(activeTab)) {
        setActiveTab(orderedTabs[0]);
      }
    } else {
      setActiveTab('');
    }
  }, [currentPayload?.components, activeTab, orderedTabs]);

  // Synchronize theme on load
  useEffect(() => {
    const storedTheme = localStorage.getItem('luminate_theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      setTheme('light');
    }

    // Load saved list
    loadSavedDashboardsList();

    // Auto-save: Reload last active session dashboard state from IndexedDB
    const activeId = localStorage.getItem('luminate_active_dashboard_id');
    if (activeId) {
      loadDashboardFromIDB(activeId).then((payload) => {
        if (payload) {
          setCurrentPayload(payload);
          showNotification(`Restored active session: "${payload.title}"`);
        }
      }).catch((err) => {
        console.warn("Could not restore active dashboard session from IndexedDB", err);
      });
    }
  }, [setTheme, setChats, loadSavedDashboardsList, setCurrentPayload]);

  // Attach keyboard shortcuts for Z & Y history manipulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut inputs inside input tags
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) {
          undo();
          showNotification("Undid layout change.");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) {
          redo();
          showNotification("Redid layout change.");
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canRedo) {
          redo();
          showNotification("Redid layout change.");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const showNotification = (message: string, type: 'success' | 'refuse' = 'success') => {
    setNotify({ message, type });
    setTimeout(() => {
      setNotify((current) => current?.message === message ? null : current);
    }, 4500);
  };

  const handleResetFilters = () => {
    setFilterState({
      selectedCategories: {}
    });
  };

  const handleNewDashboard = async () => {
    const rawId = `dash_${Date.now()}`;
    const newPayload: MasterDashboardPayload = {
      dashboardId: rawId,
      title: "New Custom Dashboard",
      subtitle: "Dynamic workspace configured in real-time. Start by typing prompts in the chatbot on the right!",
      filters: [],
      components: []
    };
    setCurrentPayload(newPayload);
    await pushState(newPayload);
    showNotification("Start building! Tell the SaaS chatbot on the right what you want to add.");
    setMobileTab('dashboard');
  };

  const handleLoadDashboardMeta = async (meta: any) => {
    const payload = await loadDashboardFromIDB(meta.dashboardId);
    if (payload) {
      setCurrentPayload(payload);
      showNotification(`Restored workspace "${payload.title}"!`);
      setMobileTab('dashboard');
    } else {
      showNotification("Failed to restore dashboard session", "refuse");
    }
  };

  const handleClearWorkspace = () => {
    setCurrentPayload(null);
    clearChats();
    handleResetFilters();
    setActiveTab('');
  };

  // component editing actions
  const handleSaveComponent = async (component: DashboardComponent) => {
    if (!currentPayload) return;

    let updatedComponents = [...(currentPayload.components || [])];
    if (editingComponent) {
      updatedComponents = updatedComponents.map(c => c.id === component.id ? component : c);
    } else {
      updatedComponents.push(component);
    }

    const nextPayload = {
      ...currentPayload,
      components: updatedComponents
    };

    await pushState(nextPayload);
    setIsComponentModalOpen(false);
    setEditingComponent(null);
    showNotification(`Component "${component.title}" saved successfully!`);
  };

  const handleDeleteComponent = async (componentId: string) => {
    if (!currentPayload) return;

    const targetComp = currentPayload.components?.find(c => c.id === componentId);
    const updatedComponents = (currentPayload.components || []).filter(c => c.id !== componentId);

    const nextPayload = {
      ...currentPayload,
      components: updatedComponents
    };

    await pushState(nextPayload);
    showNotification(`Removed component "${targetComp?.title || 'Chart'}".`);
  };

  // filter editing actions
  const handleSaveFilter = async (filter: DashboardFilter) => {
    if (!currentPayload) return;

    let updatedFilters = [...(currentPayload.filters || [])];
    if (editingFilter) {
      updatedFilters = updatedFilters.map(f => f.id === filter.id ? filter : f);
    } else {
      updatedFilters.push(filter);
    }

    const nextPayload = {
      ...currentPayload,
      filters: updatedFilters
    };

    await pushState(nextPayload);
    setIsFilterModalOpen(false);
    setEditingFilter(null);
    showNotification(`Filter "${filter.label}" created successfully.`);
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!currentPayload) return;

    const targetFilter = currentPayload.filters?.find(f => f.id === filterId);
    const updatedFilters = (currentPayload.filters || []).filter(f => f.id !== filterId);

    const nextPayload = {
      ...currentPayload,
      filters: updatedFilters
    };

    await pushState(nextPayload);
    showNotification(`Removed filter logic "${targetFilter?.label || 'Condition'}".`);
  };

  // Export current configuration config to JSON file
  const handleExportDashboard = () => {
    if (!currentPayload) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const safeTitle = currentPayload.title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      downloadAnchor.setAttribute("download", `luminate_dashboard_${safeTitle}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification("JSON Schema configuration exported.");
    } catch (e: any) {
      showNotification("Failed to export JSON.", "refuse");
    }
  };

  // Import configuration or data files
  const handleImportDashboard = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJSON = fileName.endsWith('.json');
    const isCSV = fileName.endsWith('.csv');
    const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isDOCX = fileName.endsWith('.docx');
    const isPDF = fileName.endsWith('.pdf');

    if (isJSON) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          const parsed = JSON.parse(text);
          const validated = validateDashboardPayload(parsed);
          await pushState(validated);
          handleResetFilters();
          showNotification(`Success: Recreated board "${validated.title}"!`);
        } catch (err: any) {
          showNotification(`Restore failed: ${err.message || "Invalid payload"}`, "refuse");
        }
      };
      reader.readAsText(file);
      return;
    }

    try {
      showNotification(`Processing attached data: ${file.name}...`);
      let extractedContent = "";

      if (isCSV) {
        extractedContent = await new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => resolve(JSON.stringify(normalizeGeoData(results.data, 'country').slice(0, 500))),
            error: (err) => reject(err),
          });
        });
      } else if (isXLSX) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        extractedContent = JSON.stringify(normalizeGeoData(rows, 'country').slice(0, 500));
      } else if (isDOCX) {
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        extractedContent = result.value.slice(0, 50000); // limit to 50k chars
      } else if (isPDF) {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let fullText = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((s: any) => s.str).join(' ') + '\n';
        }
        extractedContent = fullText.slice(0, 50000);
      } else {
        extractedContent = await file.text();
      }

      useAppStore.getState().setAttachedData({
        fileName: file.name,
        content: extractedContent
      });
      showNotification(`File attached successfully. Ask a question or generate a dashboard to use it.`);
      if (promptInput === '') {
        setPromptInput(`Generate a dashboard analyzing ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      showNotification(`Failed to load data: ${err.message}`, "refuse");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (e.target) e.target.value = '';
    }
  };

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) {
      showNotification("No workspace active to export to PDF.", "refuse");
      return;
    }

    try {
      showNotification("Generating PDF report...");
      
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: theme === 'dark' ? '#09090b' : '#FAFAFA',
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions (A4 portrait)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multi-page
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Dost_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification("PDF report downloaded successfully!", "success");
    } catch (err) {
      console.error(err);
      showNotification("Failed to generate PDF.", "refuse");
    }
  };

  // Capture active dashboard canvas and download as high-fidelity PNG screenshot
  const handleDownloadScreenshot = async () => {
    if (!dashboardRef.current) {
      showNotification("No workspace active to screenshot.", "refuse");
      return;
    }

    try {
      showNotification("Capturing high-fidelity dashboard png...");
      
      const element = dashboardRef.current;
      
      // Execute camera rendering
      const canvas = await html2canvas(element, {
        scale: 2, // retina 2x density
        useCORS: true,
        logging: false,
        backgroundColor: theme === 'dark' ? '#09090b' : '#FAFAFA', // background color matching zinc-950/slate-50
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const safeTitle = currentPayload?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'dashboard';
      link.download = `luminate_${safeTitle}_screenshot.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification("Dashboard screenshot downloaded successfully!");
    } catch (err: any) {
      console.error("Screenshot rendering failed:", err);
      showNotification(`Capture failed: ${err.message || "Canvas error"}`, "refuse");
    }
  };

  const executeGeneration = async (promptText: string, isIterative = false, editMode = false) => {
    if (isStreaming) return;

    setIsStreaming(true);
    setStreamProgressText("Connecting to Dash-Dost engine...");
    
    const userMsgId = Math.random().toString();
    const assistantMsgId = Math.random().toString();
    
    const attachedData = useAppStore.getState().attachedData;
    const currentPayload = useAppStore.getState().currentPayload;

    let finalPrompt = promptText;
    if (attachedData) {
      finalPrompt = `${promptText}\n\n[SYSTEM INSTRUCTION: The user has attached a new dataset. Try to update existing charts/components if they share the same data structure/columns, or create new ones if necessary. Map to existing dashboard structure if possible instead of completely replacing it, unless explicitly asked to rebuild.]\n\n[ATTACHED DATA - File: ${attachedData.fileName}]:\n${attachedData.content}`;
    } else if (editMode && currentPayload) {
      finalPrompt = `${promptText}\n\n[SYSTEM INSTRUCTION: The user wants to EDIT the existing dashboard. Use the following current dashboard state as the context/basis for your modifications. Update only the necessary components and maintain the existing structure if not requested otherwise. Here is the current dashboard:\n${JSON.stringify(currentPayload)}]`;
    }

    const userMsg = {
      id: userMsgId,
      role: 'user' as const,
      content: promptText + (attachedData ? ` (Attached: ${attachedData.fileName})` : ''),
      timestamp: new Date().toISOString()
    };
    
    // Clear the attached data after first use? We might want to keep it or let user clear it?
    // User usually expects it to apply only once unless they re-upload, or keep it stateful.
    // We'll clear it after use.
    useAppStore.getState().setAttachedData(null);
    
    addChatMessage(userMsg);

    const historyPayload = isIterative 
      ? chats.map(c => ({ role: c.role, content: c.content })) 
      : [];

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          history: historyPayload
        })
      });

      if (!res.ok) {
        let errorMsg = "Failed connection to Gemini server";
        try {
          const errObj = await res.json();
          errorMsg = errObj.error || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let streamedBuffer = "";

      if (reader) {
        setStreamProgressText("Compiling structural schema...");
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          streamedBuffer += chunk;

          const parsed = parsePartialPayload(streamedBuffer);
          if (parsed) {
            // Live update visual elements without committing history until final
            setCurrentPayload(parsed);
            
            const count = parsed.components?.length || 0;
            if (count > 0) {
              setStreamProgressText(`Assembled ${count} dynamic KPI & analytic containers...`);
            }
          }
        }

        const finalPayload = parsePartialPayload(streamedBuffer);
        if (finalPayload) {
          // Final state is complete! Save to store and push state history
          await pushState(finalPayload);
          setStreamProgressText("");
          
          addChatMessage({
            id: assistantMsgId,
            role: 'assistant',
            content: `Interactive dashboard **${finalPayload.title}** generated successfully! Try toggle standard or category dropdown filters inside the toolbox below.`,
            timestamp: new Date().toISOString(),
            associatedPayload: finalPayload
          });
        } else {
          throw new Error("Unable to construct valid dashboard structure. Please try again with different keywords!");
        }
      }
    } catch (error: any) {
      console.error("Streaming error:", error);
      setStreamProgressText("");
      
      addChatMessage({
        id: assistantMsgId,
        role: 'assistant',
        content: `Error: ${error.message || "Something went wrong while generating details. Check server connection."}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleLandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isStreaming) return;
    executeGeneration(promptInput, false);
    setPromptInput('');
  };

  // Slices coordinates filtered components rendering inside canvas
  const componentsToRender = currentPayload?.components?.filter(comp => {
    if (uniqueTabs.length === 0) return true;
    const compTab = comp.tab ? comp.tab.trim() : '';
    const currentSelectedTab = activeTab ? activeTab.trim() : '';
    if (!compTab) {
      // Fallback: assign components without a tab to the first tab
      return currentSelectedTab === uniqueTabs[0];
    }
    return compTab === currentSelectedTab;
  }) || [];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 transition-colors duration-300 flex flex-col antialiased">
      
      {/* PERSISTENT APP HEADER BAR */}
      <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200 bg-white dark:border-zinc-900/60 dark:bg-zinc-950/80 shadow-sm">
        <div className="flex h-16 items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 shadow-sm animate-pulse">
              <div className="w-4 h-4 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                Dash-Dost
              </span>
              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 mx-3.5"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 font-mono">
                Builder Studio
              </span>
            </div>
          </div>

          {/* GLOBAL DASHBOARD SEARCH */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search dashboards by title or Prompt keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 255)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-900/60 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 transition-all font-sans"
              />
              {/* Dropdown Results Box */}
              {isSearchFocused && searchTerm.trim() && (
                <div className="absolute top-11 left-0 right-0 z-50 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar animate-fade-in">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono border-b border-slate-100 dark:border-zinc-900/80 mb-1">
                    SAVED DASHBOARDS ({searchResults.length})
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400 font-mono">
                      No matching dashboards found
                    </div>
                  ) : (
                    searchResults.map((dash) => (
                      <button
                        key={dash.dashboardId}
                        onClick={() => {
                          handleLoadDashboardMeta(dash);
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-2.5 py-2 hover:bg-indigo-50/55 dark:hover:bg-indigo-950/20 rounded-lg transition-all flex flex-col gap-0.5 cursor-pointer select-none group"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-sans truncate">
                          {dash.title || "Untitled"}
                        </span>
                        {dash.subtitle && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                            {dash.subtitle}
                          </span>
                        )}
                        {dash.prompt && (
                          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono truncate mt-0.5 opacity-80">
                            Keyphrase: {dash.prompt}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isStreaming && (
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-zinc-900 dark:text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-100 dark:border-zinc-800/80">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1"></div>
                <span>Streaming Ready</span>
              </div>
            )}
            
            {/* Theme switcher toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-800 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all cursor-pointer inline-flex items-center justify-center h-9 w-9"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC PUSH NOTIFICATION BANNER */}
      {notify && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border bg-white dark:bg-zinc-900 shadow-2xl transition-all duration-300 ease-out border-slate-250 animate-bounce">
          {notify.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-105 font-mono">
            {notify.message}
          </span>
          <button 
            onClick={() => setNotify(null)}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-zinc-105 ml-1.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* CORE WORKSPACE GRID */}
      <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-0 relative">
        
        {/* PANEL A: LEFT SIDEBAR - HISTORY & NEW DASHBOARD */}
        <div className={`col-span-12 lg:col-span-3 lg:border-r border-slate-200 dark:border-zinc-800 bg-[#FCFDFE] dark:bg-zinc-950 p-4 lg:p-5 overflow-y-auto max-h-[calc(100vh-4rem)] flex flex-col justify-start custom-scrollbar shrink-0 ${mobileTab === 'history' ? 'block' : 'hidden lg:block'}`}>
          <div className="mb-4 space-y-3">
            <button
              onClick={handleNewDashboard}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-600 transition-all font-sans cursor-pointer shadow-md inline-flex items-center justify-center group"
              title="Start a fresh blank dashboard session"
            >
              <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
              <span>+ New Dashboard</span>
            </button>
          </div>
          
          <div className="flex-1">
            <SavedDashboardsManager onLoadDashboard={handleLoadDashboardMeta} />
          </div>
        </div>

        {/* PANEL B: MIDDLE DISPLAY CANVAS - CORE DASHBOARD VIEWPORT */}
        <main className={`col-span-12 lg:col-span-6 p-4 sm:p-5 md:p-6 flex flex-col justify-start overflow-y-auto max-h-[calc(100vh-4rem)] custom-scrollbar ${mobileTab === 'dashboard' ? 'block' : 'hidden lg:block'}`}>
          
          {!currentPayload ? (
            
            /* INTRO EXPERIENCE */
            <div className="max-w-2xl mx-auto w-full my-auto py-12 sm:py-20 flex flex-col items-center">
              <div className="text-center space-y-3.5 mb-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/40 font-mono">
                  <Activity className="h-3 w-3" />
                  <span>Interactive Dashboard Generator</span>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-zinc-50 font-sans">
                  Turn plain English into high-performance analytical dashboards
                </h2>
                
                <p className="text-slate-500 dark:text-zinc-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                  Dash-Dost streams gorgeous KPIs, interactive responsive charts, and client-side filters. Import, export or undo changes instantly.
                </p>
              </div>

              {/* Central landing prompt input */}
              <form onSubmit={handleLandingSubmit} className="w-full relative mb-12">
                {useAppStore.getState().attachedData && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg w-max border border-indigo-100 dark:border-indigo-900/40 animate-fade-in">
                    <Database className="h-3 w-3 text-indigo-500" />
                    <span className="text-xs text-indigo-700 dark:text-indigo-400 font-mono">
                      Data Attached: {useAppStore.getState().attachedData?.fileName}
                    </span>
                    <button 
                      type="button"
                      onClick={() => useAppStore.getState().setAttachedData(null)}
                      className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 ml-2"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-zinc-950 dark:border-zinc-800">
                  <input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    disabled={isStreaming}
                    placeholder="E.g., Global logistics cargo shipping tracker showing delay volumes..."
                    className="flex-1 px-4 py-3 text-sm text-slate-800 dark:text-zinc-100 placeholder-teal-600/30 bg-transparent outline-none border-none focus:ring-0"
                  />
                  <div className="flex items-center gap-2 px-1">
                    {/* Inline Import on landing */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-slate-700 transition-all font-mono text-xs inline-flex items-center gap-1.5 border border-slate-200 dark:border-zinc-800 h-10 px-3 shrink-0"
                      title="Upload config or datasets (CSV/Excel/PDF)"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Attach File</span>
                    </button>
                    
                    <button
                      type="submit"
                      disabled={!promptInput.trim() || isStreaming}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 rounded-xl shadow-md cursor-pointer transition-all font-sans h-10 shrink-0"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </form>

              {/* QUICK CHIP SUGGESTIONS */}
              <div className="w-full space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono text-center block">
                  Select a starter dataset template
                </span>
                <SuggestionChips onSelected={(p) => executeGeneration(p, false)} />
              </div>
            </div>

          ) : (

            /* ACTIVE LAYOUT */
            <div ref={dashboardRef} className="space-y-6">
              
              {/* Dashboard Title & Quick Actions Toolbelt */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6 mb-8">
                <div className="space-y-1">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-mono">Active Dashboard Workspace</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/40 dark:border-emerald-900/30 font-mono select-none">
                        <Database className="h-2.5 w-2.5 text-emerald-500" /> Auto-Saved
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 font-sans flex items-center gap-2 mt-0.5">
                      <span>{currentPayload.title}</span>
                      {isStreaming && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 inline-block animate-ping" />
                      )}
                    </h1>
                  </div>
                  {currentPayload.subtitle && (
                    <p className="text-slate-400 dark:text-zinc-400 text-xs sm:text-sm">
                      {currentPayload.subtitle}
                    </p>
                  )}
                </div>

                {/* Operations cluster */}
                <div data-html2canvas-ignore className="flex flex-wrap items-center gap-2 self-start xl:self-center shrink-0">
                  {/* Undo Button */}
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:text-zinc-400 transition-all cursor-pointer h-9 w-9 inline-flex items-center justify-center shadow-sm"
                    title="Undo design change (Ctrl+Z)"
                  >
                    <Undo className="h-4 w-4" />
                  </button>

                  {/* Redo Button */}
                  <button
                    onClick={redo}
                    disabled={!canRedo}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:text-zinc-400 transition-all cursor-pointer h-9 w-9 inline-flex items-center justify-center shadow-sm"
                    title="Redo design change (Ctrl+Y)"
                  >
                    <Redo className="h-4 w-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

                  {/* Import Config file launcher */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Attach CSV/Excel/PDF or upload JSON template"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Attach Data</span>
                  </button>

                  {/* Export Config button */}
                  <button
                    onClick={handleExportDashboard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Export and download dashboard JSON configuration"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Dashboard</span>
                  </button>

                  {/* Capture PDF Screenshot button */}
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Download active dashboard layout view as a multi-page PDF"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span>PDF</span>
                  </button>

                  {/* Capture Screenshot button */}
                  <button
                    onClick={handleDownloadScreenshot}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Download active dashboard layout view as a PNG image"
                  >
                    <Camera className="h-3.5 w-3.5 text-slate-400" />
                    <span>Snapshot</span>
                  </button>

                  <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

                  {/* Add-on 2: Live Mode Selector */}
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg h-9 dark:bg-zinc-950 dark:border-zinc-800 shrink-0 shadow-sm" title="Periodically refresh components data simulating telemetry feeds">
                    <span className="relative flex h-2 w-2 mr-1">
                      <span className={`${refreshInterval ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono">LIVE:</span>
                    <select
                      value={refreshInterval || 'off'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'off') {
                          setRefreshInterval(null);
                        } else {
                          setRefreshInterval(parseInt(val));
                        }
                      }}
                      className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-zinc-350 focus:outline-none border-none py-0.5 cursor-pointer pr-1"
                    >
                      <option value="off">Off</option>
                      <option value="5">5s (Demo)</option>
                      <option value="30">30s</option>
                      <option value="60">1m</option>
                      <option value="300">5m</option>
                    </select>
                  </div>

                  {/* Add-on 3: AI Insights */}
                  <button
                    onClick={fetchAIInsights}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-400 border border-indigo-150 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Generate intelligent automated executive advice and business summaries from active metrics"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI Insights</span>
                  </button>

                  <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

                  {/* Add-on 4: Preset Layout Selector */}
                  <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg h-9 dark:bg-zinc-900/60 dark:border-zinc-800 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 font-mono mr-1">PRESET:</span>
                    {layoutPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPresetLayout(preset.id)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all border cursor-pointer select-none ${
                          activePresetId === preset.id
                            ? 'bg-white border-slate-300 text-indigo-650 dark:bg-zinc-950 dark:border-zinc-800 dark:text-indigo-400 shadow-sm'
                            : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                        }`}
                        title={preset.description}
                      >
                        {preset.name.split(' ')[0]} {/* shortened */}
                      </button>
                    ))}
                  </div>

                  <div className="h-5 w-px bg-slate-200 dark:bg-zinc-800 mx-1"></div>

                  {/* Template Gallery Button */}
                  <button
                    onClick={() => setIsTemplateGalleryOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-900 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Browse and apply pre-configured dashboard templates"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 text-slate-400" />
                    <span>Templates</span>
                  </button>

                  {/* Add-on 5: Create Visual Section Button */}
                  <button
                    onClick={() => {
                      setEditingSectionId(null);
                      setNewSectionTitle('');
                      setNewSectionDesc('');
                      setSelectedSectionComponentIds([]);
                      setIsSectionModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-350 dark:hover:bg-zinc-900 rounded-lg transition-all h-9 shadow-sm cursor-pointer"
                    title="Group related widgets together inside a cozy Visual Container"
                  >
                    <Grid2X2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>Group Link</span>
                  </button>

                  {/* Add Component Action */}
                  <button
                    onClick={() => {
                      setEditingComponent(null);
                      setIsComponentModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-600 rounded-lg transition-all h-9 shadow-md cursor-pointer shadow-indigo-500/10"
                    title="Assemble customized chart/KPI"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Widget</span>
                  </button>
                </div>
              </div>

              {/* FILTERS TOOLBOX */}
              <FiltersPanel
                payload={currentPayload}
                filterState={filterState}
                onFilterStateChange={setFilterState}
                onResetFilters={handleResetFilters}
                onAddFilter={() => {
                  setEditingFilter(null);
                  setIsFilterModalOpen(true);
                }}
                onEditFilter={(f) => {
                  setEditingFilter(f);
                  setIsFilterModalOpen(true);
                }}
                onDeleteFilter={handleDeleteFilter}
              />

              {/* RESPONSIVE SUBPAGES / TAB SELECTOR */}
              {orderedTabs.length > 0 && (
                <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-zinc-800/80 pb-2.5 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mr-1 shrink-0 flex items-center gap-1">
                    <Compass className="h-3.5 w-3.5" /> Pages:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 pb-1">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleTabDragEnd}
                    >
                      <SortableContext
                        items={orderedTabs}
                        strategy={horizontalListSortingStrategy}
                      >
                        {orderedTabs.map(tabName => (
                          <SortableTabItem
                            key={tabName}
                            id={tabName}
                            activeTab={activeTab}
                            onClick={() => setActiveTab(tabName)}
                            onDuplicate={handleDuplicateTab}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              )}

              {/* CANVAS CHART GRID */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={componentsToRender.map((c) => c.id)}
                  strategy={rectSortingStrategy}
                >
                  <motion.div 
                    layout
                    variants={{
                      hidden: { opacity: 0 },
                      show: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1,
                        }
                      }
                    }}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch relative w-full"
                  >
                    {/* Visual Sections Group Cards */}
                    {sections.map((sec) => {
                      const secComps = componentsToRender.filter(c => sec.componentIds.includes(c.id));
                      if (secComps.length === 0) return null;

                      return (
                        <div
                          key={sec.id}
                          className="col-span-12 bg-slate-50 border border-slate-200/80 rounded-2xl p-5 dark:bg-zinc-950/20 dark:border-zinc-800/80 space-y-4 shadow-sm animate-fade-in relative"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5 dark:border-zinc-800/50">
                            <div>
                              <h4 className="text-xs font-mono uppercase tracking-widest text-indigo-650 dark:text-indigo-400 font-bold mb-0.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-pulse"></span>
                                Section Group: {sec.title}
                              </h4>
                              {sec.description && (
                                <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium">
                                  {sec.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 z-10">
                              <button
                                onClick={() => {
                                  setEditingSectionId(sec.id);
                                  setNewSectionTitle(sec.title);
                                  setNewSectionDesc(sec.description || '');
                                  setSelectedSectionComponentIds(sec.componentIds);
                                  setIsSectionModalOpen(true);
                                }}
                                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-all border border-slate-200 hover:border-indigo-200 bg-white dark:bg-zinc-950 dark:border-zinc-800 rounded-lg cursor-pointer"
                              >
                                Edit Group
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sec.id)}
                                className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-all shrink-0"
                              >
                                Ungroup
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch relative">
                            {secComps.map((component) => {
                              const smCol = component.layout?.sm || 12;
                              const mdCol = component.layout?.md || 12;
                              const lgCol = component.layout?.lg || 6;
                              const colSpanClass = `col-span-${smCol} md:col-span-${mdCol} lg:col-span-${lgCol}`;
                              const filteredRows = filterComponentData(component, currentPayload.filters || [], filterState);

                              return (
                                <div key={component.id} className={colSpanClass}>
                                  <ChartWrapper
                                    component={component}
                                    filteredData={filteredRows}
                                    filterState={filterState}
                                    onEditComponent={(comp) => {
                                      setEditingComponent(comp);
                                      setIsComponentModalOpen(true);
                                    }}
                                    onDeleteComponent={handleDeleteComponent}
                                    isFullscreen={false}
                                    onToggleFullscreen={(id) => setFullscreenComponentId(id)}
                                    onDrillDown={(key, val) => {
                                      const normalizedKey = key.toLowerCase();
                                      const existingFilter = currentPayload.filters?.find(f => 
                                        f.targetKeys.some(tk => tk.toLowerCase() === normalizedKey)
                                      );
                                      if (existingFilter) {
                                        setFilterState(prev => {
                                          const prevVals = prev.selectedCategories[existingFilter.id] || [];
                                          const isSelected = prevVals.includes(val);
                                          const newVals = isSelected ? prevVals.filter(v => v !== val) : [...prevVals, val];
                                          return { ...prev, selectedCategories: { ...prev.selectedCategories, [existingFilter.id]: newVals } };
                                        });
                                      } else {
                                        const newFilterId = `f_${key}_${Date.now()}`;
                                        const nextPayload = { ...currentPayload, filters: [...(currentPayload.filters||[]), { id: newFilterId, label: key.toUpperCase(), type: 'category_select' as const, targetKeys: [key] }] };
                                        pushState(nextPayload).then(() => setFilterState(prev => ({ ...prev, selectedCategories: { ...prev.selectedCategories, [newFilterId]: [val] } })));
                                      }
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Standalone Visual Components */}
                    {componentsToRender.filter(c => !sections.some(s => s.componentIds.includes(c.id))).map((component) => {
                      const smCol = component.layout?.sm || 12;
                      const mdCol = component.layout?.md || 12;
                      const lgCol = component.layout?.lg || 6;
                      
                      const colSpanClass = `col-span-${smCol} md:col-span-${mdCol} lg:col-span-${lgCol}`;

                      // Slice dataset rows by dynamic configuration limit parameters
                      const filteredRows = filterComponentData(component, currentPayload.filters || [], filterState);

                      return (
                        <motion.div
                          key={component.id}
                          layout
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { 
                              opacity: 1, 
                              y: 0,
                              transition: {
                                type: "spring",
                                stiffness: 90,
                                damping: 15
                              }
                            }
                          }}
                          className={colSpanClass}
                        >
                          <SortableDashboardItem id={component.id}>
                            <ChartWrapper
                              component={component}
                              filteredData={filteredRows}
                              onEditComponent={(comp) => {
                                setEditingComponent(comp);
                                setIsComponentModalOpen(true);
                              }}
                              onDeleteComponent={handleDeleteComponent}
                              isFullscreen={false}
                              onToggleFullscreen={(id) => setFullscreenComponentId(id)}
                              onDrillDown={(key, val) => {
                                const existingFilter = currentPayload.filters?.find(f => f.targetKeys.includes(key));
                                if (existingFilter) {
                                  setFilterState(prev => ({ ...prev, selectedCategories: { ...prev.selectedCategories, [existingFilter.id]: [val] } }));
                                } else {
                                  const newFilterId = `f_${key}_${Date.now()}`;
                                  const nextPayload = { ...currentPayload, filters: [...(currentPayload.filters||[]), { id: newFilterId, label: key.toUpperCase(), type: 'category_select' as const, targetKeys: [key] }] };
                                  pushState(nextPayload).then(() => setFilterState(prev => ({ ...prev, selectedCategories: { ...prev.selectedCategories, [newFilterId]: [val] } })));
                                }
                              }}
                            />
                          </SortableDashboardItem>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </SortableContext>
              </DndContext>

              {componentsToRender.length === 0 && currentPayload.components?.length > 0 && (
                <div className="flex h-48 flex-col items-center justify-center text-center p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 dark:bg-zinc-900/10">
                  <Grid2X2 className="h-6 w-6 text-slate-350 dark:text-zinc-700 mb-2" />
                  <span className="text-xs font-semibold text-slate-500 font-mono">Page Empty</span>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                    No components have been assigned to page "{activeTab}". Customize or create a new widget specifically for this tab scope.
                  </p>
                </div>
              )}

              {currentPayload.components?.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/5">
                  <Grid2X2 className="h-10 w-10 text-slate-300 dark:text-zinc-700 animate-pulse mb-3" />
                  <span className="text-xs font-semibold text-slate-500 font-mono">Empty Canvas Grid</span>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1 max-w-[240px]">
                    Create custom KPI aggregates or analytical graphs using "+ Add Component" above!
                  </p>
                </div>
              )}

            </div>
          )}
        </main>

        {/* PANEL C: RIGHT SIDEBAR - SUGGESTIONS, REMOVABLE PINS & CHATBOT INPUT */}
        <div className={`col-span-12 lg:col-span-3 lg:border-l border-slate-200 dark:border-zinc-800 bg-[#FCFDFE] dark:bg-zinc-950 p-4 lg:p-5 overflow-y-auto max-h-[calc(100vh-4rem)] flex flex-col justify-start custom-scrollbar shrink-0 ${mobileTab === 'chat' ? 'block' : 'hidden lg:block'}`}>
          
          {/* Active removable tag chips */}
          {Object.keys(filterState.selectedCategories).length > 0 && (
            <div className="mb-4 p-3 bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-900 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Active Filters</span>
                <button 
                  onClick={handleResetFilters}
                  className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-805 dark:text-indigo-400 font-mono transition-all cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(filterState.selectedCategories).map(([filterId, val]) => {
                  if (!val) return null;
                  const filterObj = currentPayload?.filters?.find(f => f.id === filterId);
                  const filterLabel = filterObj ? filterObj.label : filterId;
                  return (
                    <span 
                      key={filterId}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/45 select-none animate-fade-in"
                    >
                      <span className="opacity-80 truncate max-w-[80px]">{filterLabel}:</span>
                      <span className="truncate max-w-[80px] font-bold">{val}</span>
                      <button
                        onClick={() => {
                          setFilterState(current => {
                            const next = { ...current.selectedCategories };
                            delete next[filterId];
                            return { selectedCategories: next };
                          });
                        }}
                        className="hover:text-rose-500 cursor-pointer p-0.5 ml-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick suggestions dataset starter list */}
          <div className="mb-5">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1.5">Prompt Starters</span>
            <SuggestionChips onSelected={(p) => executeGeneration(p, false)} />
          </div>

          {/* Dynamic conversational AI Chatbot Panel */}
          <div className="flex-1 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-205 dark:border-zinc-850 overflow-hidden relative min-h-[300px]">
            <ConversationalPanel
              onRefine={(promptText, mode) => executeGeneration(promptText, true, mode === 'edit')}
              onClearWorkspace={handleClearWorkspace}
            />
          </div>
        </div>

      </div>

      {/* MOBILE RESPONSIVE BOTTOM TAB SELECTOR BAR */}
      <div className="lg:hidden shrink-0 h-16 border-t border-slate-200 bg-white/90 dark:border-zinc-900 dark:bg-zinc-950/90 backdrop-blur-md flex items-center justify-around px-2 sticky bottom-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] pb-safe-bottom">
        <button
          onClick={() => setMobileTab('history')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'history' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <History className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold font-sans">History</span>
        </button>

        <button
          onClick={() => setMobileTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${mobileTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <BarChart className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold font-sans">Dashboard</span>
          {isStreaming && (
            <span className="absolute top-1 right-3.5 h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${mobileTab === 'chat' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/10' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <MessageSquare className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold font-sans">Chat & Tags</span>
        </button>
      </div>

      {/* COMPONENT MODAL */}
      <EditComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => {
          setIsComponentModalOpen(false);
          setEditingComponent(null);
        }}
        onSave={handleSaveComponent}
        componentToEdit={editingComponent}
      />

      {/* FILTER MODAL */}
      <EditFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => {
          setIsFilterModalOpen(false);
          setEditingFilter(null);
        }}
        onSave={handleSaveFilter}
        filterToEdit={editingFilter}
      />

      {/* FULLSCREEN COMPONENT VIEW OVERLAY */}
      {fullscreenComponentId && (() => {
        const comp = currentPayload?.components?.find(c => c.id === fullscreenComponentId);
        if (!comp) return null;
        const filteredRows = filterComponentData(comp, currentPayload?.filters || [], filterState);
        return (
          <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 p-6 md:p-10 flex flex-col w-screen h-screen overflow-auto">
            <div className="flex-1 flex flex-col h-full">
              <ChartWrapper
                component={comp}
                filteredData={filteredRows}
                onEditComponent={(comp) => {
                  setEditingComponent(comp);
                  setIsComponentModalOpen(true);
                }}
                onDeleteComponent={(id) => {
                  handleDeleteComponent(id);
                  setFullscreenComponentId(null);
                }}
                isFullscreen={true}
                onToggleFullscreen={() => setFullscreenComponentId(null)}
                onDrillDown={(key, val) => {
                  const existingFilter = currentPayload?.filters?.find(f => f.targetKeys.includes(key));
                  if (existingFilter) {
                    setFilterState(prev => ({ ...prev, selectedCategories: { ...prev.selectedCategories, [existingFilter.id]: [val] } }));
                  } else if (currentPayload) {
                    const newFilterId = `f_${key}_${Date.now()}`;
                    const nextPayload = { ...currentPayload, filters: [...(currentPayload.filters||[]), { id: newFilterId, label: key.toUpperCase(), type: 'category_select' as const, targetKeys: [key] }] };
                    pushState(nextPayload).then(() => setFilterState(prev => ({ ...prev, selectedCategories: { ...prev.selectedCategories, [newFilterId]: [val] } })));
                  }
                  setFullscreenComponentId(null); // exit fullscreen on drill down
                }}
              />
            </div>
          </div>
        );
      })()}

      {/* AI INSIGHTS DIALOG VIEW OVERLAY */}
      {insightsPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col justify-start overflow-hidden font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1 text-indigo-600 bg-indigo-50 border border-indigo-120 rounded-lg dark:bg-indigo-950/20 dark:text-indigo-400">
                  <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-tight uppercase">AI executive insights</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Powered by Gemini 3.5 Flash</p>
                </div>
              </div>
              <button
                onClick={() => setInsightsPromptOpen(false)}
                className="p-1 rounded-lg text-slate-455 hover:text-slate-650 dark:hover:text-zinc-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 custom-scrollbar text-xs leading-relaxed font-sans text-slate-700 dark:text-zinc-350">
              {insightsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3.5">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-semibold text-slate-500 font-mono animate-pulse">Analyzing dashboard metrics...</span>
                </div>
              ) : insightsText ? (
                <div className="space-y-4">
                  {insightsText.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) {
                      return <h4 key={idx} className="font-bold text-zinc-900 dark:text-white text-xs tracking-tight uppercase mt-3 mb-1">{line.replace('###', '').trim()}</h4>;
                    }
                    if (line.startsWith('-') || line.startsWith('*')) {
                      return (
                        <div key={idx} className="flex gap-2.5 items-start pl-2">
                          <span className="text-indigo-600 shrink-0 font-extrabold">•</span>
                          <span className="text-slate-600 dark:text-zinc-350">{line.substring(2).trim()}</span>
                        </div>
                      );
                    }
                    if (line.trim() === '') return <div key={idx} className="h-1" />;
                    return <p key={idx} className="text-slate-600 dark:text-zinc-300">{line}</p>;
                  })}
                </div>
              ) : (
                <p className="text-center text-slate-400">No telemetry insights compiled yet.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 pt-3 dark:border-zinc-800">
              {insightsText && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(insightsText);
                    showNotification("AI Insights copied to clipboard!", "success");
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:border-zinc-850 rounded-xl cursor-pointer shadow-sm"
                >
                  Copy Advice
                </button>
              )}
              <button
                onClick={() => setInsightsPromptOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-650 rounded-xl cursor-pointer"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION GROUP CREATION OVERLAY */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <h3 className="font-bold text-slate-900 dark:text-zinc-50 text-sm tracking-tight uppercase">
                {editingSectionId ? 'Configure Group Container' : 'Create Visual Section'}
              </h3>
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Title</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Sales Metrics, Server Telemetry"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Description (Optional)</label>
                <input
                  type="text"
                  value={newSectionDesc}
                  onChange={(e) => setNewSectionDesc(e.target.value)}
                  placeholder="Briefly describe what this custom section groups together..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-mono text-[10px]">Select Components to Group</label>
                <p className="text-[10px] text-slate-400 font-mono">Assigned widgets will pack snugly inside this custom bordered panel group container card.</p>
                <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-zinc-800 rounded-xl p-2.5 bg-slate-50/50 dark:bg-zinc-950/20 space-y-1.5 custom-scrollbar">
                  {(currentPayload?.components || []).length === 0 ? (
                    <p className="text-center text-slate-400 py-3 font-mono">No widgets created yet</p>
                  ) : (
                    (currentPayload?.components || []).map((c) => {
                      const isSelected = selectedSectionComponentIds.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2.5 py-1 px-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer text-slate-700 dark:text-zinc-200 select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedSectionComponentIds(selectedSectionComponentIds.filter(id => id !== c.id));
                              } else {
                                setSelectedSectionComponentIds([...selectedSectionComponentIds, c.id]);
                              }
                            }}
                            className="h-3.5 w-3.5 accent-indigo-650 text-white"
                          />
                          <span>{c.title} <span className="text-[9px] text-slate-450 font-mono opacity-60">({c.type})</span></span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pb-1 text-xs font-sans">
              <button
                onClick={() => setIsSectionModalOpen(false)}
                className="px-3.5 py-1.5 text-slate-550 hover:text-slate-850 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSection}
                disabled={!newSectionTitle.trim()}
                className="px-4 py-2 font-bold text-white bg-indigo-600 disabled:opacity-40 disabled:pointer-events-none hover:bg-indigo-700 dark:bg-indigo-505 dark:hover:bg-indigo-600 rounded-xl cursor-pointer"
              >
                {editingSectionId ? 'Update Group' : 'Assemble Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE GALLERY OVERLAY */}
      {isTemplateGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col justify-start overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-lg text-slate-500 dark:text-zinc-400">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-zinc-100 text-sm tracking-tight uppercase">Dashboard Template Gallery</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Apply pre-configured JSON templates as a starting point</p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateGalleryOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:text-slate-650 dark:hover:text-zinc-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 custom-scrollbar text-xs leading-relaxed font-sans grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50 hover:bg-white dark:bg-zinc-900/60 dark:hover:bg-zinc-900 hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col gap-2 cursor-pointer group"
                  onClick={() => applyTemplate(template.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white dark:bg-zinc-950 shadow-sm rounded-lg border border-slate-100 dark:border-zinc-800">
                      {template.icon}
                    </div>
                    <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      Apply Template
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-zinc-100 mt-2">{template.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">{template.subtitle}</p>
                </div>
              ))}
              
              <div className="border border-slate-200 border-dashed dark:border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 text-slate-400 dark:text-zinc-500">
                <Plus className="h-6 w-6 mb-1 opacity-50" />
                <h4 className="font-bold text-[12px]">More Templates Coming Soon</h4>
                <p className="text-[10px] max-w-[200px]">We're constantly adding new use-case templates to the registry.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file uploader collector */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportDashboard}
        accept=".json,.csv,.xlsx,.xls,.pdf,.docx"
        className="hidden"
      />
    </div>
  );
}
