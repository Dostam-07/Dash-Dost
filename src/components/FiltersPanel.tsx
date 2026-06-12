import React, { useEffect } from 'react';
import { SlidersHorizontal, Calendar, Tag, RotateCcw, Plus, Edit2, Trash2 } from 'lucide-react';
import { MasterDashboardPayload, DashboardFilter } from '../types';
import { ActiveFilterState, getDashboardDateRangeLimits, getDashboardCategoryOptions } from '../utils/filterEngine';

interface FiltersPanelProps {
  payload: MasterDashboardPayload;
  filterState: ActiveFilterState;
  onFilterStateChange: (state: ActiveFilterState) => void;
  onResetFilters: () => void;
  onAddFilter?: () => void;
  onEditFilter?: (filter: DashboardFilter) => void;
  onDeleteFilter?: (id: string) => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  payload,
  filterState,
  onFilterStateChange,
  onResetFilters,
  onAddFilter,
  onEditFilter,
  onDeleteFilter,
}) => {
  const { filters } = payload;

  // Initialize date range and category options on load
  useEffect(() => {
    let amendedStateStr = JSON.stringify(filterState);
    const nextState = { ...filterState };
    
    let stateChanged = false;

    filters.forEach((f) => {
      if (f.type === 'date_range' && !filterState.dateRange) {
        const limits = getDashboardDateRangeLimits(payload, f);
        if (limits) {
          nextState.dateRange = { start: limits.min, end: limits.max };
          stateChanged = true;
        }
      }
      
      if (f.type === 'category_select' && !filterState.selectedCategories[f.id]) {
        nextState.selectedCategories[f.id] = [];
        stateChanged = true;
      }
    });

    if (stateChanged && JSON.stringify(nextState) !== amendedStateStr) {
      onFilterStateChange(nextState);
    }
  }, [payload, filters]);

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    const targetFilter = filters.find(f => f.type === 'date_range');
    if (!targetFilter) return;

    const currentRange = filterState.dateRange || { start: '', end: '' };
    const nextRange = {
      ...currentRange,
      [type]: val
    };

    onFilterStateChange({
      ...filterState,
      dateRange: nextRange
    });
  };

  const handleToggleCategory = (filterId: string, option: string) => {
    const currentList = filterState.selectedCategories[filterId] || [];
    let nextList: string[];

    if (currentList.includes(option)) {
      nextList = currentList.filter(o => o !== option);
    } else {
      nextList = [...currentList, option];
    }

    onFilterStateChange({
      ...filterState,
      selectedCategories: {
        ...filterState.selectedCategories,
        [filterId]: nextList
      }
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-zinc-950 dark:border-zinc-800 mb-8 transition-all relative">
      
      {/* Header bar */}
      <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-slate-100 dark:border-zinc-900 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-wide">
            Interactive Filters Engine
          </h4>
        </div>
        
        <div data-html2canvas-ignore className="flex items-center gap-2">
          {onAddFilter && (
            <button
              onClick={onAddFilter}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 bg-indigo-600 rounded-lg dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-all shadow-sm font-mono cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span>Add Filter</span>
            </button>
          )}

          {filters.length > 0 && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-lg dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/20 border border-slate-200 dark:border-zinc-800 transition-all shadow-sm font-mono"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {filters.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 dark:bg-zinc-900/10 dark:border-zinc-800 text-xs text-slate-400 dark:text-zinc-500 font-mono space-y-1">
          <span>No interactive filters configured yet.</span>
          <span className="text-[10px] text-slate-400">Click "+ Add Filter" above to wire dynamic dataset selections.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filters.map((filter, index) => {
            if (filter.type === 'date_range') {
              const limits = getDashboardDateRangeLimits(payload, filter);
              const activeRange = filterState.dateRange || { start: limits?.min || '', end: limits?.max || '' };

              return (
                <div key={`${filter.id}-${index}`} className="space-y-2 group relative p-1 rounded-xl hover:bg-slate-50/40 dark:hover:bg-zinc-900/10 transition-all">
                  
                  {/* Label & Actions wrapper */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1.5 tracking-wider font-mono">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                      {filter.label}
                    </label>
                    
                    {/* Inline actions */}
                    <div data-html2canvas-ignore className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditFilter && (
                        <button
                          onClick={() => onEditFilter(filter)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-indigo-600 transition-all"
                          title="Edit filter definition"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                      {onDeleteFilter && (
                        <button
                          onClick={() => onDeleteFilter(filter.id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-rose-600 transition-all"
                          title="Delete filter node"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 relative font-mono">
                      <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-400 uppercase">From</span>
                      <input
                        type="date"
                        value={activeRange.start}
                        min={limits?.min}
                        max={limits?.max}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="w-full pl-12 pr-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-705 bg-slate-50/30 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-indigo-400/20 focus:outline-none transition-all font-mono"
                      />
                    </div>
                    <span className="text-slate-300 dark:text-zinc-700 font-mono text-xs">-</span>
                    <div className="flex-1 relative font-mono">
                      <span className="absolute left-3 top-2.5 text-[9px] font-bold text-slate-400 uppercase">To</span>
                      <input
                        type="date"
                        value={activeRange.end}
                        min={limits?.min}
                        max={limits?.max}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-705 bg-slate-50/30 focus:bg-white focus:ring-1 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:ring-indigo-400/20 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                  {limits && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono pl-1">
                      Available range: {limits.min} to {limits.max}
                    </p>
                  )}
                </div>
              );
            }

            if (filter.type === 'category_select') {
              const options = getDashboardCategoryOptions(payload, filter);
              const selectedOpts = filterState.selectedCategories[filter.id] || [];

              return (
                <div key={`${filter.id}-${index}`} className="space-y-2 group relative p-1 rounded-xl hover:bg-slate-50/40 dark:hover:bg-zinc-900/10 transition-all">
                  
                  {/* Label & Actions wrapper */}
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1.5 tracking-wider font-mono">
                      <Tag className="h-3.5 w-3.5 text-indigo-500" />
                      {filter.label}
                    </label>
                    
                    {/* Inline actions */}
                    <div data-html2canvas-ignore className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEditFilter && (
                        <button
                          onClick={() => onEditFilter(filter)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-indigo-600 transition-all"
                          title="Edit filter definition"
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                      {onDeleteFilter && (
                        <button
                          onClick={() => onDeleteFilter(filter.id)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-400 hover:text-rose-600 transition-all"
                          title="Delete filter node"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-xl bg-slate-50/30 border border-slate-100 dark:bg-zinc-900/20 dark:border-zinc-900 custom-scrollbar">
                    {options.map((opt, optIndex) => {
                      const isSelected = selectedOpts.includes(opt);
                      return (
                        <button
                          key={`${opt}-${optIndex}`}
                          onClick={() => handleToggleCategory(filter.id, opt)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all duration-200 shadow-sm cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500 shadow-indigo-100 dark:shadow-none'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {options.length === 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono p-1">No options resolved in dataset</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono pl-1">
                    {selectedOpts.length === 0 
                      ? 'Showing all categories (click to filter)' 
                      : `Filtered to ${selectedOpts.length} active matching value${selectedOpts.length > 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
