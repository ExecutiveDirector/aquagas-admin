import React, { useState, useCallback, useRef, useEffect } from "react";
import { Search, Filter, X, ChevronDown, Users, UserCheck, UserX } from "lucide-react";

interface FilterBarProps {
  onSearch: (searchTerm: string) => void;
  onFilter: (status: string) => void;
  userCount?: number;
  activeCount?: number;
  inactiveCount?: number;
  isLoading?: boolean;
  placeholder?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({
  onSearch,
  onFilter,
  userCount = 0,
  activeCount = 0,
  inactiveCount = 0,
  isLoading = false,
  placeholder = "Search users by name, email, or phone..."
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search handler
  const debouncedSearch = useCallback((value: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(value);
      
      if (value.trim() && !searchHistory.includes(value.trim())) {
        setSearchHistory(prev => [value.trim(), ...prev].slice(0, 5));
      }
    }, 300);
  }, [onSearch, searchHistory]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
    onFilter(status);
    setIsFilterOpen(false);
  }, [onFilter]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    onSearch("");
    searchInputRef.current?.focus();
  }, [onSearch]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedStatus("");
    onSearch("");
    onFilter("");
  }, [onSearch, onFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'k':
            event.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'f':
            event.preventDefault();
            setIsFilterOpen(prev => !prev);
            break;
        }
      }
      
      if (event.key === 'Escape') {
        if (isFilterOpen) {
          setIsFilterOpen(false);
        } else if (searchTerm) {
          clearSearch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, isFilterOpen, clearSearch]);

  const hasActiveFilters = searchTerm || selectedStatus;
  const showStats = userCount > 0 || isLoading;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-xl">
      <div className="p-6">
        <div className="flex flex-col xl:flex-row xl:items-center gap-6">
          <div className="flex-1 max-w-2xl">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                <Search className={`h-5 w-5 transition-colors duration-200 ${
                  isFocused || searchTerm 
                    ? 'text-blue-500 dark:text-blue-400' 
                    : 'text-gray-400 dark:text-gray-500'
                }`} />
              </div>
              
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={isLoading}
                className={`block w-full pl-12 pr-12 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-gray-50 dark:bg-gray-700/50 border-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isFocused || searchTerm
                    ? 'border-blue-500 dark:border-blue-400 bg-white dark:bg-gray-700 shadow-lg'
                    : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              />
              
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
                  disabled={isLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              
              {isLoading && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              )}
              
              {!isFocused && !searchTerm && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                  <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded border">
                    ⌘K
                  </kbd>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between xl:justify-end gap-6">
            {showStats && (
              <div className="hidden lg:flex items-center gap-6">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    {isLoading ? '...' : userCount}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Total</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">
                    {isLoading ? '...' : activeCount}
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <UserX className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-300">
                    {isLoading ? '...' : inactiveCount}
                  </span>
                  <span className="text-xs text-red-600 dark:text-red-400">Inactive</span>
                </div>
              </div>
            )}

            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                disabled={isLoading}
                className={`inline-flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-700 border-2 rounded-xl shadow-sm text-sm font-medium transition-all duration-200 min-w-[140px] justify-between focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedStatus
                    ? 'border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30'
                    : isFilterOpen
                      ? 'border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="truncate">
                    {selectedStatus || 'All Status'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  isFilterOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                  <div className="p-2">
                    <div className="mb-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Filter by Status
                    </div>
                    
                    {[
                      { value: "", label: "All Status", count: userCount, icon: Users, color: "gray" },
                      { value: "Active", label: "Active", count: activeCount, icon: UserCheck, color: "green" },
                      { value: "Inactive", label: "Inactive", count: inactiveCount, icon: UserX, color: "red" }
                    ].map(({ value, label, count, icon: Icon, color }) => (
                      <button
                        key={value}
                        onClick={() => handleStatusChange(value)}
                        className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-all duration-150 ${
                          selectedStatus === value
                            ? `bg-${color}-50 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300`
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`h-4 w-4 ${
                            selectedStatus === value 
                              ? `text-${color}-600 dark:text-${color}-400` 
                              : 'text-gray-400'
                          }`} />
                          <span className="font-medium">{label}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          selectedStatus === value
                            ? `bg-${color}-100 dark:bg-${color}-800 text-${color}-700 dark:text-${color}-300`
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {isLoading ? '...' : count}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘F</kbd> to toggle filter, <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to close
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active filters:
            </span>
            
            {searchTerm && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-lg text-sm">
                <Search className="h-3 w-3" />
                <span className="font-medium">"{searchTerm}"</span>
                <button
                  onClick={clearSearch}
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedStatus && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-lg text-sm">
                <Filter className="h-3 w-3" />
                <span className="font-medium">Status: {selectedStatus}</span>
                <button
                  onClick={() => handleStatusChange("")}
                  className="ml-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline transition-colors"
              disabled={isLoading}
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;