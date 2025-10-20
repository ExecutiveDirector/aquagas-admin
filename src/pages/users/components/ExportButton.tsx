import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Download, 
  FileText, 
  Database, 
  Settings, 
  Check, 
  AlertTriangle,
  ChevronDown,
  Info
} from "lucide-react";

// Tooltip component for accessibility
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  return (
    <div className="relative group">
      {children}
      <div className="absolute z-10 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg py-1 px-2 -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        {content}
      </div>
    </div>
  );
};

interface User {
  id: string;
  fullName?: string;
  email?: string;
  phone_number?: string;
  role?: string;
  status?: string;
  walletBalance?: number;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface ExportButtonProps {
  users: User[];
  filteredCount?: number;
  isLoading?: boolean;
  onExportStart?: () => void;
  onExportComplete?: (format: string, count: number) => void;
  onExportError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

type ExportFormat = 'csv' | 'json';
type ExportProgress = 'idle' | 'preparing' | 'processing' | 'complete' | 'error';

interface ExportOptions {
  includeHeaders: boolean;
  includeMetadata: boolean;
  dateFormat: 'iso' | 'readable';
  includeWalletBalance: boolean;
  includeTimestamps: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  users,
  filteredCount,
  isLoading = false,
  onExportStart,
  onExportComplete,
  onExportError,
  disabled = false,
  className = ""
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportProgress, setExportProgress] = useState<ExportProgress>('idle');
  const [showOptions, setShowOptions] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeHeaders: true,
    includeMetadata: true,
    dateFormat: 'readable',
    includeWalletBalance: true,
    includeTimestamps: true
  });
  const [lastExport, setLastExport] = useState<{
    timestamp: Date;
    format: string;
    count: number;
  } | null>(null);

  const optionsRef = useRef<HTMLDivElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const progressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
      if (formatMenuRef.current && !formatMenuRef.current.contains(event.target as Node)) {
        setShowFormatMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  const canExport = users && users.length > 0 && !isLoading && !disabled;
  const exportCount = filteredCount !== undefined ? filteredCount : users?.length || 0;
  const isExporting = exportProgress === 'preparing' || exportProgress === 'processing';

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return exportOptions.dateFormat === 'iso'
      ? date.toISOString()
      : date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
  }, [exportOptions.dateFormat]);

  const prepareExportData = useCallback(() => {
    const headers = [
      'ID',
      'First Name', 
      'Last Name',
      'Email',
      'Phone Number',
      'Role',
      'Status',
      ...(exportOptions.includeWalletBalance ? ['Wallet Balance'] : []),
      ...(exportOptions.includeTimestamps ? ['Last Login', 'Created At', 'Updated At'] : [])
    ];

    const data = users.map(user => [
      user.id || '',
      user.first_name || '', 
      user.last_name || '',
      user.email || '',
      user.phone_number || '',
      user.role || '',
      user.status || '',
      ...(exportOptions.includeWalletBalance ? [user.walletBalance?.toString() || '0'] : []),
      ...(exportOptions.includeTimestamps ? [
        formatDate(user.lastLogin),
        formatDate(user.createdAt),
        formatDate(user.updatedAt)
      ] : [])
    ]);

    return { headers, data };
  }, [users, exportOptions, formatDate]);

  const exportToCSV = useCallback(async () => {
    const { headers, data } = prepareExportData();
    
    const csvRows = [];
    
    if (exportOptions.includeHeaders) {
      csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));
    }
    
    data.forEach(row => {
      csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    });

    let csvContent = csvRows.join('\n');
    
    if (exportOptions.includeMetadata) {
      const metadata = [
        `# User Export Report`,
        `# Generated: ${new Date().toISOString()}`,
        `# Total Users: ${users.length}`,
        `# Export Format: CSV`,
        `# Date Format: ${exportOptions.dateFormat}`,
        ``,
        csvContent
      ].join('\n');
      csvContent = metadata;
    }

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });

    return { blob, filename: `users_export_${new Date().toISOString().split('T')[0]}.csv` };
  }, [prepareExportData, exportOptions, users.length]);

  const exportToJSON = useCallback(async () => {
    const exportData: any = { users };

    if (exportOptions.includeMetadata) {
      exportData.metadata = {
        exportDate: new Date().toISOString(),
        totalUsers: users.length,
        exportFormat: 'JSON',
        dateFormat: exportOptions.dateFormat,
        options: exportOptions
      };
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8;'
    });

    return { blob, filename: `users_export_${new Date().toISOString().split('T')[0]}.json` };
  }, [users, exportOptions]);

  const downloadFile = useCallback((blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async () => {
    if (!canExport) return;

    try {
      setExportProgress('preparing');
      onExportStart?.();

      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExportProgress('processing');
      
      let exportResult: { blob: Blob; filename: string };
      
      switch (exportFormat) {
        case 'csv':
          exportResult = await exportToCSV();
          break;
        case 'json':
          exportResult = await exportToJSON();
          break;
        default:
          throw new Error(`Unsupported export format: ${exportFormat}`);
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      
      downloadFile(exportResult.blob, exportResult.filename);
      
      setExportProgress('complete');
      setLastExport({
        timestamp: new Date(),
        format: exportFormat.toUpperCase(),
        count: exportCount
      });
      
      onExportComplete?.(exportFormat, exportCount);

      progressTimeoutRef.current = setTimeout(() => {
        setExportProgress('idle');
      }, 2000);
      
    } catch (error) {
      setExportProgress('error');
      const errorMessage = error instanceof Error ? error.message : 'Export failed. Please try again.';
      onExportError?.(errorMessage);
      
      progressTimeoutRef.current = setTimeout(() => {
        setExportProgress('idle');
      }, 3000);
    }
  }, [canExport, exportFormat, exportCount, onExportStart, onExportComplete, onExportError, exportToCSV, exportToJSON, downloadFile]);

  const getProgressInfo = useCallback(() => {
    switch (exportProgress) {
      case 'preparing':
        return { text: 'Preparing export...', color: 'blue' };
      case 'processing':
        return { text: 'Processing data...', color: 'blue' };
      case 'complete':
        return { text: 'Export completed!', color: 'green' };
      case 'error':
        return { text: 'Export failed', color: 'red' };
      default:
        return { text: `Export ${exportFormat.toUpperCase()}`, color: 'gray' };
    }
  }, [exportProgress, exportFormat]);

  const progressInfo = getProgressInfo();

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      {/* Main Export Button */}
      <div className="relative">
        <button
          onClick={handleExport}
          disabled={!canExport || isExporting}
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed min-w-[180px] justify-center ${
            !canExport
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
              : exportProgress === 'complete'
                ? 'bg-green-500 hover:bg-green-600 text-white border-green-500 focus:ring-green-500'
                : exportProgress === 'error'
                  ? 'bg-red-500 hover:bg-red-600 text-white border-red-500 focus:ring-red-500'
                  : isExporting
                    ? 'bg-blue-500 text-white border-blue-500 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 focus:ring-blue-500'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>{progressInfo.text}</span>
            </>
          ) : exportProgress === 'complete' ? (
            <>
              <Check className="h-4 w-4" />
              <span>{progressInfo.text}</span>
            </>
          ) : exportProgress === 'error' ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>{progressInfo.text}</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>{progressInfo.text}</span>
              {exportCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 text-xs rounded-full font-medium">
                  {exportCount}
                </span>
              )}
            </>
          )}
        </button>

        {isExporting && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-xl overflow-hidden">
            <div className="h-full bg-white animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Format Selection */}
      <div className="relative" ref={formatMenuRef}>
        <button
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          disabled={!canExport || isExporting}
          className={`inline-flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            !canExport
              ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
              : showFormatMenu
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
          } focus:ring-blue-500`}
        >
          {exportFormat === 'csv' && <FileText className="h-4 w-4" />}
          {exportFormat === 'json' && <Database className="h-4 w-4" />}
          <span className="font-medium">{exportFormat.toUpperCase()}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFormatMenu ? 'rotate-180' : ''}`} />
        </button>

        {showFormatMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-2">
              <div className="mb-2 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Export Format
              </div>
              
              {[
                { 
                  value: 'csv' as ExportFormat, 
                  label: 'CSV', 
                  description: 'Comma-separated values', 
                  icon: FileText,
                  recommended: true 
                },
                { 
                  value: 'json' as ExportFormat, 
                  label: 'JSON', 
                  description: 'JavaScript Object Notation', 
                  icon: Database,
                  recommended: false 
                }
              ].map(({ value, label, description, icon: Icon, recommended }) => (
                <button
                  key={value}
                  onClick={() => {
                    setExportFormat(value);
                    setShowFormatMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all duration-150 ${
                    exportFormat === value
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${
                    exportFormat === value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{label}</span>
                      {recommended && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{description}</div>
                  </div>
                  {exportFormat === value && (
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="relative" ref={optionsRef}>
        <Tooltip content="Export options">
          <button
            onClick={() => setShowOptions(!showOptions)}
            disabled={!canExport || isExporting}
            className={`inline-flex items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              !canExport
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400'
                : showOptions
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
            } focus:ring-blue-500`}
          >
            <Settings className="h-4 w-4" />
          </button>
        </Tooltip>

        {showOptions && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Export Options</span>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Headers</span>
                    <Tooltip content="Add column headers to exported file">
                      <span><Info className="h-3 w-3 text-gray-400" /></span>
                    </Tooltip>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeHeaders}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeHeaders: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Metadata</span>
                    <Tooltip content="Add export information and statistics">
                      <span><Info className="h-3 w-3 text-gray-400" /></span>
                    </Tooltip>
                  </div>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeMetadata: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include Wallet Balance</span>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeWalletBalance}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeWalletBalance: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Include Timestamps</span>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTimestamps}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeTimestamps: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Date Format
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="readable"
                        checked={exportOptions.dateFormat === 'readable'}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          dateFormat: e.target.value as 'readable' | 'iso'
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        Readable (Dec 25, 2023, 10:30 AM)
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="iso"
                        checked={exportOptions.dateFormat === 'iso'}
                        onChange={(e) => setExportOptions(prev => ({ 
                          ...prev, 
                          dateFormat: e.target.value as 'readable' | 'iso'
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ISO Format (2023-12-25T10:30:00Z)
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {lastExport && exportProgress === 'idle' && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs">
          <Check className="h-3 w-3" />
          <span>
            Last export: {lastExport.count} users as {lastExport.format}
          </span>
          <span className="text-green-600 dark:text-green-400">
            {lastExport.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      )}

      {!canExport && (
        <Tooltip content={
          users?.length === 0 
            ? 'No users available for export'
            : isLoading 
              ? 'Please wait for data to load'
              : disabled
                ? 'Export is currently disabled'
                : 'Export not available'
        }>
          <span className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-200 text-sm rounded-lg shadow-lg z-50 whitespace-nowrap">
            {users?.length === 0 
              ? 'No users available for export'
              : isLoading 
                ? 'Please wait for data to load'
                : disabled
                  ? 'Export is currently disabled'
                  : 'Export not available'
            }
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export default ExportButton;
