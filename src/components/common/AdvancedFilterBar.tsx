import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, Check, RefreshCw, ArrowUpDown } from 'lucide-react';
import { FilterState, DEFAULT_DEPARTMENTS, DEFAULT_FRANCHISES } from '../../types';
import { omniStore } from '../../services/storageService';
import { INDIAN_STATES } from '../../data/indiaLocations';

interface AdvancedFilterBarProps {
  filterState: FilterState;
  onFilterChange: (updated: FilterState) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalMatching: number;
  showCampaignFilters?: boolean;
  showPaymentFilters?: boolean;
  showContentFilters?: boolean;
  onExportCSV?: () => void;
  onPrintReport?: () => void;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  filterState,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalMatching,
  showCampaignFilters = false,
  showPaymentFilters = false,
  showContentFilters = false,
  onExportCSV,
  onPrintReport,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const departments = omniStore.getDepartments();
  const franchises = omniStore.getFranchises();

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const current = (filterState[key] as string[]) || [];
    const next = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    onFilterChange({ ...filterState, [key]: next });
  };

  const handleClearAll = () => {
    onFilterChange({
      businessTypes: [],
      franchises: [],
      departments: [],
      statuses: [],
      influencerTypes: [],
      collaborationTypes: [],
      startDate: '',
      endDate: '',
      months: [],
      years: [],
      campaignStatuses: [],
      paymentStatuses: [],
      contentStatuses: [],
      states: [],
      genders: [],
      minBudget: undefined,
      maxBudget: undefined,
      minFollowers: undefined,
      maxFollowers: undefined,
      minEngagement: undefined,
      maxEngagement: undefined,
      sortBy: 'date',
      sortOrder: 'desc',
    });
    onSearchChange('');
  };

  // Active filter chips calculation
  const activeChips: { label: string; onRemove: () => void }[] = [];
  filterState.businessTypes.forEach(bt => activeChips.push({ label: `Business: ${bt}`, onRemove: () => toggleArrayFilter('businessTypes', bt) }));
  filterState.franchises.forEach(f => activeChips.push({ label: `Franchise: ${f}`, onRemove: () => toggleArrayFilter('franchises', f) }));
  filterState.departments.forEach(d => activeChips.push({ label: `Dept: ${d}`, onRemove: () => toggleArrayFilter('departments', d) }));
  filterState.statuses.forEach(s => activeChips.push({ label: `Status: ${s}`, onRemove: () => toggleArrayFilter('statuses', s) }));
  filterState.influencerTypes.forEach(t => activeChips.push({ label: `Platform: ${t}`, onRemove: () => toggleArrayFilter('influencerTypes', t) }));
  filterState.collaborationTypes.forEach(c => activeChips.push({ label: `Collab: ${c}`, onRemove: () => toggleArrayFilter('collaborationTypes', c) }));
  filterState.months.forEach(m => activeChips.push({ label: `Month: ${m}`, onRemove: () => toggleArrayFilter('months', m) }));
  filterState.years.forEach(y => activeChips.push({ label: `Year: ${y}`, onRemove: () => toggleArrayFilter('years', y) }));
  filterState.campaignStatuses.forEach(cs => activeChips.push({ label: `Campaign: ${cs}`, onRemove: () => toggleArrayFilter('campaignStatuses', cs) }));
  filterState.paymentStatuses.forEach(ps => activeChips.push({ label: `Payment: ${ps}`, onRemove: () => toggleArrayFilter('paymentStatuses', ps) }));
  filterState.contentStatuses.forEach(cts => activeChips.push({ label: `Content: ${cts}`, onRemove: () => toggleArrayFilter('contentStatuses', cts) }));
  filterState.states.forEach(st => activeChips.push({ label: `State: ${st}`, onRemove: () => toggleArrayFilter('states', st) }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Search and Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by influencer name, username, phone, or campaign..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isExpanded ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Filters</span>
            {activeChips.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center text-[10px] font-bold">
                {activeChips.length}
              </span>
            )}
          </button>

          {/* Sorting */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <select
              value={filterState.sortBy}
              onChange={(e) => onFilterChange({ ...filterState, sortBy: e.target.value as any })}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="date" className="bg-slate-900">Sort: Date</option>
              <option value="followers" className="bg-slate-900">Sort: Followers</option>
              <option value="engagement" className="bg-slate-900">Sort: Engagement</option>
              <option value="budget" className="bg-slate-900">Sort: Budget/Rate</option>
              <option value="performance" className="bg-slate-900">Sort: Performance</option>
              <option value="name" className="bg-slate-900">Sort: Name</option>
            </select>
          </div>

          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="px-3 py-2 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition"
              title="Export Filtered CSV"
            >
              Export CSV
            </button>
          )}

          {onPrintReport && (
            <button
              onClick={onPrintReport}
              className="px-3 py-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-semibold transition"
              title="Print / PDF Report"
            >
              Print Report
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 font-medium">Active Filters:</span>
          {activeChips.map((chip, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-violet-600/20 text-violet-300 border border-violet-500/30">
              {chip.label}
              <button onClick={chip.onRemove} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={handleClearAll}
            className="text-[11px] text-rose-400 hover:underline ml-2"
          >
            Clear All
          </button>
          <span className="ml-auto text-xs text-slate-400 font-semibold">
            Matching Records: <span className="text-white">{totalMatching}</span>
          </span>
        </div>
      )}

      {/* Expanded Advanced Filters Panel */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
          {/* Business Type */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Business Association</label>
            <div className="space-y-1">
              {['Ajit Zone', 'Franchise'].map(bt => (
                <label key={bt} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.businessTypes.includes(bt)}
                    onChange={() => toggleArrayFilter('businessTypes', bt)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {bt}
                </label>
              ))}
            </div>
          </div>

          {/* Franchise */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Franchise Outlet</label>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {franchises.map((fran: string) => (
                <label key={fran} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.franchises.includes(fran)}
                    onChange={() => toggleArrayFilter('franchises', fran)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  <span className="truncate" title={fran}>{fran}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Product Department</label>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {departments.map((dept: string) => (
                <label key={dept} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.departments.includes(dept)}
                    onChange={() => toggleArrayFilter('departments', dept)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {dept}
                </label>
              ))}
            </div>
          </div>

          {/* Influencer Status */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Influencer Status</label>
            <div className="space-y-1">
              {['Active', 'Inactive', 'Pending', 'On Hold', 'Blacklisted'].map(st => (
                <label key={st} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.statuses.includes(st)}
                    onChange={() => toggleArrayFilter('statuses', st)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {st}
                </label>
              ))}
            </div>
          </div>

          {/* Platform Type */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Platform Type</label>
            <div className="space-y-1">
              {['Instagram', 'YouTube', 'Facebook', 'Multi-Platform'].map(pt => (
                <label key={pt} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.influencerTypes.includes(pt)}
                    onChange={() => toggleArrayFilter('influencerTypes', pt)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {pt}
                </label>
              ))}
            </div>
          </div>

          {/* Collaboration Type */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Collaboration Type</label>
            <div className="space-y-1">
              {['Paid', 'Barter', 'Gifted', 'Affiliate', 'Exchange'].map(ct => (
                <label key={ct} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.collaborationTypes.includes(ct)}
                    onChange={() => toggleArrayFilter('collaborationTypes', ct)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {ct}
                </label>
              ))}
            </div>
          </div>

          {/* Month & Year */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">Month</label>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.months.includes(m)}
                    onChange={() => toggleArrayFilter('months', m)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          {/* State / Location */}
          <div>
            <label className="block font-bold text-slate-300 mb-1.5">State / Location</label>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {INDIAN_STATES.map(st => (
                <label key={st} className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterState.states.includes(st)}
                    onChange={() => toggleArrayFilter('states', st)}
                    className="rounded bg-slate-950 border-slate-700 text-violet-600"
                  />
                  <span className="truncate" title={st}>{st}</span>
                </label>
              ))}
            </div>
          </div>

          {showCampaignFilters && (
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Campaign Status</label>
              <div className="space-y-1">
                {['Planned', 'Active', 'Completed', 'Cancelled', 'On Hold', 'Draft'].map(cs => (
                  <label key={cs} className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={filterState.campaignStatuses.includes(cs)}
                      onChange={() => toggleArrayFilter('campaignStatuses', cs)}
                      className="rounded bg-slate-950 border-slate-700 text-violet-600"
                    />
                    {cs}
                  </label>
                ))}
              </div>
            </div>
          )}

          {showPaymentFilters && (
            <div>
              <label className="block font-bold text-slate-300 mb-1.5">Payment Status</label>
              <div className="space-y-1">
                {['Paid', 'Pending Approval', 'Approved', 'Rejected', 'Draft'].map(ps => (
                  <label key={ps} className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={filterState.paymentStatuses.includes(ps)}
                      onChange={() => toggleArrayFilter('paymentStatuses', ps)}
                      className="rounded bg-slate-950 border-slate-700 text-violet-600"
                    />
                    {ps}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
