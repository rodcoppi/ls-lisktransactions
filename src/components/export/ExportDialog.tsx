'use client';

import React, { useState, useCallback } from 'react';
import { Row, Column, ExportFormat } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Download, FileText, Table, Image, Code, Settings, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getExportFormats, estimateExportSize, ExportProgress } from '@/lib/export';
import { reportTemplates } from '@/lib/export/reports';
import { AdvancedExportOptions } from '@/lib/export/advanced-formats';

export interface ExportDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  data: Row<T>[];
  columns: Column<T>[];
  onExport: (
    format: ExportFormat | 'xml' | 'sql' | 'yaml',
    options: any,
    filename?: string
  ) => Promise<void>;
}

interface ExportOption {
  format: ExportFormat | 'xml' | 'sql' | 'yaml' | 'jsonl';
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'basic' | 'advanced' | 'professional';
  features: string[];
}

const exportOptions: ExportOption[] = [
  {
    format: 'csv',
    label: 'CSV',
    description: 'Comma-separated values for spreadsheet applications',
    icon: Table,
    category: 'basic',
    features: ['Universal compatibility', 'Small file size', 'Fast export'],
  },
  {
    format: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation for web applications',
    icon: Code,
    category: 'basic',
    features: ['Web-friendly', 'Structured data', 'API compatible'],
  },
  {
    format: 'excel',
    label: 'Excel Professional',
    description: 'Advanced Excel with formulas, charts, and multiple sheets',
    icon: Table,
    category: 'professional',
    features: ['Multiple worksheets', 'Formulas & charts', 'Professional formatting'],
  },
  {
    format: 'pdf',
    label: 'PDF Professional',
    description: 'Professional PDF reports with charts and branding',
    icon: FileText,
    category: 'professional',
    features: ['Executive reports', 'Charts & graphics', 'Print-ready'],
  },
  {
    format: 'xml',
    label: 'XML',
    description: 'Extensible Markup Language with schema validation',
    icon: Code,
    category: 'advanced',
    features: ['Schema validation', 'Hierarchical data', 'Enterprise systems'],
  },
  {
    format: 'sql',
    label: 'SQL',
    description: 'Database INSERT statements for direct import',
    icon: Code,
    category: 'advanced',
    features: ['Direct database import', 'Multiple dialects', 'Batch processing'],
  },
  {
    format: 'yaml',
    label: 'YAML',
    description: 'Human-readable data serialization for configuration',
    icon: Code,
    category: 'advanced',
    features: ['Human-readable', 'Configuration files', 'DevOps friendly'],
  },
  {
    format: 'jsonl',
    label: 'JSON Lines',
    description: 'Streaming JSON format for big data processing',
    icon: Code,
    category: 'advanced',
    features: ['Streaming support', 'Big data', 'Line-by-line processing'],
  },
];

export function ExportDialog<T>({
  isOpen,
  onClose,
  data,
  columns,
  onExport,
}: ExportDialogProps<T>) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | 'xml' | 'sql' | 'yaml' | 'jsonl'>('csv');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [filename, setFilename] = useState('');
  const [activeTab, setActiveTab] = useState<'format' | 'options' | 'advanced'>('format');
  const [exportProgress, setExportProgress] = useState<{
    isExporting: boolean;
    progress: number;
    status: string;
    error?: string;
  }>({
    isExporting: false,
    progress: 0,
    status: 'idle',
  });

  // Format-specific options
  const [csvOptions, setCsvOptions] = useState({
    delimiter: ',',
    includeHeaders: true,
    encoding: 'utf-8',
  });

  const [pdfOptions, setPdfOptions] = useState({
    orientation: 'portrait' as 'portrait' | 'landscape',
    pageSize: 'a4' as 'a4' | 'a3' | 'letter' | 'legal',
    includeCharts: true,
    showSummary: true,
    watermark: '',
  });

  const [excelOptions, setExcelOptions] = useState({
    includeFormulas: true,
    includeCharts: true,
    freezePanes: true,
    autoFilter: true,
    multipleSheets: false,
  });

  const [advancedOptions, setAdvancedOptions] = useState({
    visibleColumnsOnly: true,
    selectedRowsOnly: false,
    includeMetadata: true,
    compression: false,
    batchSize: 1000,
  });

  const selectedOption = exportOptions.find(option => option.format === selectedFormat);
  const sizeEstimate = estimateExportSize(data, columns, selectedFormat as ExportFormat);

  const handleExport = useCallback(async () => {
    if (!selectedFormat || exportProgress.isExporting) return;

    setExportProgress({
      isExporting: true,
      progress: 0,
      status: 'Initializing export...',
    });

    try {
      let options: any = {
        filename: filename || `export-${selectedFormat}-${Date.now()}`,
        ...advancedOptions,
      };

      // Add format-specific options
      switch (selectedFormat) {
        case 'csv':
          options = { ...options, ...csvOptions };
          break;
        case 'pdf':
          options = {
            ...options,
            ...pdfOptions,
            template: selectedTemplate,
            metadata: {
              title: `Data Export - ${new Date().toLocaleDateString()}`,
              author: 'LiskCounter Analytics',
              subject: 'Professional Data Export',
            },
          };
          break;
        case 'excel':
          options = { ...options, ...excelOptions };
          break;
        case 'xml':
          options = {
            ...options,
            xmlOptions: {
              rootElement: 'data',
              recordElement: 'record',
              includeSchema: true,
              prettyPrint: true,
            },
          } as AdvancedExportOptions;
          break;
        case 'sql':
          options = {
            ...options,
            sqlOptions: {
              tableName: 'exported_data',
              includeCreateTable: true,
              batchSize: advancedOptions.batchSize,
              dialect: 'postgresql',
            },
          } as AdvancedExportOptions;
          break;
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90),
          status: prev.progress < 30 
            ? 'Processing data...' 
            : prev.progress < 70 
              ? `Generating ${selectedFormat.toUpperCase()}...`
              : 'Finalizing export...',
        }));
      }, 300);

      await onExport(selectedFormat, options, options.filename);

      clearInterval(progressInterval);
      setExportProgress({
        isExporting: false,
        progress: 100,
        status: 'Export completed successfully!',
      });

      // Auto-close after successful export
      setTimeout(() => {
        onClose();
        setExportProgress({
          isExporting: false,
          progress: 0,
          status: 'idle',
        });
      }, 2000);
    } catch (error) {
      setExportProgress({
        isExporting: false,
        progress: 0,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Export failed',
      });
    }
  }, [
    selectedFormat,
    filename,
    csvOptions,
    pdfOptions,
    excelOptions,
    advancedOptions,
    selectedTemplate,
    exportProgress.isExporting,
    onExport,
    onClose,
    data,
    columns,
  ]);

  const renderFormatSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose Export Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportOptions.map((option) => (
            <Card
              key={option.format}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedFormat === option.format
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedFormat(option.format)}
            >
              <div className="flex items-start space-x-3">
                <option.icon className="w-6 h-6 text-gray-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{option.label}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      option.category === 'professional'
                        ? 'bg-purple-100 text-purple-800'
                        : option.category === 'advanced'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {option.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.features.map((feature, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedOption && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Estimated file size: {sizeEstimate.formattedSize}</span>
            <span>{data.length} records × {columns.length} columns</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderFormatOptions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Export Options</h3>
        
        {/* Common Options */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filename
            </label>
            <Input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder={`export-${selectedFormat}-${Date.now()}`}
            />
          </div>
        </div>

        {/* Format-specific options */}
        {selectedFormat === 'csv' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">CSV Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delimiter
                </label>
                <select
                  value={csvOptions.delimiter}
                  onChange={(e) => setCsvOptions({...csvOptions, delimiter: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Encoding
                </label>
                <select
                  value={csvOptions.encoding}
                  onChange={(e) => setCsvOptions({...csvOptions, encoding: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="utf-16">UTF-16</option>
                  <option value="iso-8859-1">ISO-8859-1</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {selectedFormat === 'pdf' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">PDF Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orientation
                </label>
                <select
                  value={pdfOptions.orientation}
                  onChange={(e) => setPdfOptions({...pdfOptions, orientation: e.target.value as 'portrait' | 'landscape'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Size
                </label>
                <select
                  value={pdfOptions.pageSize}
                  onChange={(e) => setPdfOptions({...pdfOptions, pageSize: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="a4">A4</option>
                  <option value="a3">A3</option>
                  <option value="letter">Letter</option>
                  <option value="legal">Legal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Default Template</option>
                {reportTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pdfOptions.includeCharts}
                  onChange={(e) => setPdfOptions({...pdfOptions, includeCharts: e.target.checked})}
                  className="mr-2"
                />
                Include Charts
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={pdfOptions.showSummary}
                  onChange={(e) => setPdfOptions({...pdfOptions, showSummary: e.target.checked})}
                  className="mr-2"
                />
                Show Summary Section
              </label>
            </div>
          </div>
        )}

        {selectedFormat === 'excel' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Excel Options</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.includeFormulas}
                  onChange={(e) => setExcelOptions({...excelOptions, includeFormulas: e.target.checked})}
                  className="mr-2"
                />
                Include Summary Formulas
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.includeCharts}
                  onChange={(e) => setExcelOptions({...excelOptions, includeCharts: e.target.checked})}
                  className="mr-2"
                />
                Include Charts
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.freezePanes}
                  onChange={(e) => setExcelOptions({...excelOptions, freezePanes: e.target.checked})}
                  className="mr-2"
                />
                Freeze Header Row
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.autoFilter}
                  onChange={(e) => setExcelOptions({...excelOptions, autoFilter: e.target.checked})}
                  className="mr-2"
                />
                Enable Auto Filter
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={excelOptions.multipleSheets}
                  onChange={(e) => setExcelOptions({...excelOptions, multipleSheets: e.target.checked})}
                  className="mr-2"
                />
                Create Multiple Sheets
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdvancedOptions = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data Selection</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={advancedOptions.visibleColumnsOnly}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, visibleColumnsOnly: e.target.checked})}
                  className="mr-2"
                />
                Export visible columns only
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={advancedOptions.selectedRowsOnly}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, selectedRowsOnly: e.target.checked})}
                  className="mr-2"
                />
                Export selected rows only
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={advancedOptions.includeMetadata}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, includeMetadata: e.target.checked})}
                  className="mr-2"
                />
                Include metadata
              </label>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Size
                </label>
                <Input
                  type="number"
                  value={advancedOptions.batchSize}
                  onChange={(e) => setAdvancedOptions({...advancedOptions, batchSize: parseInt(e.target.value) || 1000})}
                  min="100"
                  max="10000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Records per batch (affects memory usage)
                </p>
              </div>
              <div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    checked={advancedOptions.compression}
                    onChange={(e) => setAdvancedOptions({...advancedOptions, compression: e.target.checked})}
                    className="mr-2"
                  />
                  Enable compression
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Progress Indicator */}
        {exportProgress.isExporting && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-blue-900">
                    {exportProgress.status}
                  </span>
                  <span className="text-sm text-blue-700">
                    {Math.round(exportProgress.progress)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {exportProgress.status === 'Export completed successfully!' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Export completed successfully! Download will start shortly.
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {exportProgress.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <span className="text-sm font-medium text-red-900">
                  Export failed
                </span>
                <p className="text-sm text-red-700 mt-1">{exportProgress.error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'format', label: 'Format', icon: FileText },
              { id: 'options', label: 'Options', icon: Settings },
              { id: 'advanced', label: 'Advanced', icon: Code },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'format' && renderFormatSelection()}
          {activeTab === 'options' && renderFormatOptions()}
          {activeTab === 'advanced' && renderAdvancedOptions()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedOption && `Selected: ${selectedOption.label}`}
            {data.length > 0 && ` • ${data.length} records`}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={!selectedFormat || exportProgress.isExporting}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>
                {exportProgress.isExporting ? 'Exporting...' : 'Export Data'}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}