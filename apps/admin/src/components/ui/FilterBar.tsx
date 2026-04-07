import React from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  onSearch?: (val: string) => void;
  filters?: { label: string; options: Array<string | { label: string; value: string }> }[];
  onFilterChange?: (label: string, value: string) => void;
}

export const FilterBar = ({ onSearch, filters = [], onFilterChange }: FilterBarProps) => {
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-6 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800">
      <div className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-red-500 transition-colors" />
        <input 
          type="text"
          placeholder="Search by name, reference, or phone..."
          className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-stone-950 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-red-500/20 transition-all"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((f) => (
          <div key={f.label} className="relative group">
            <select 
              className="appearance-none pl-4 pr-10 py-3 bg-stone-50 dark:bg-stone-950 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-red-500/20 cursor-pointer"
              onChange={(e) => onFilterChange?.(f.label, e.target.value)}
            >
              <option value="">{f.label}</option>
              {f.options.map((option) => {
                const value = typeof option === 'string' ? option : option.value;
                const label = typeof option === 'string' ? option : option.label;
                return <option key={`${f.label}-${value}`} value={value}>{label}</option>;
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400 pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};
