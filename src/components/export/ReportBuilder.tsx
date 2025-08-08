'use client';

import React, { useState, useCallback } from 'react';
import { Row, Column } from '@/components/data-table/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Save, 
  Download, 
  Layout, 
  Type, 
  BarChart, 
  Table as TableIcon, 
  FileText, 
  Settings,
  Move,
  Copy
} from 'lucide-react';
import { 
  ReportTemplate, 
  ReportSection, 
  ReportStyling, 
  reportTemplates,
  ReportBuilder as Builder
} from '@/lib/export/reports';
import { templateEngine, DynamicTemplate, ConditionalSection } from '@/lib/export/template-engine';

export interface ReportBuilderProps<T> {
  data: Row<T>[];
  columns: Column<T>[];
  onSave: (template: ReportTemplate) => void;
  onPreview: (template: ReportTemplate) => void;
  onExport: (template: ReportTemplate) => void;
}

interface SectionEditor {
  section: ConditionalSection;
  isEditing: boolean;
}

const sectionTypes = [
  { id: 'title', label: 'Title', icon: Type, description: 'Main report title' },
  { id: 'summary', label: 'Summary', icon: FileText, description: 'Executive summary text' },
  { id: 'table', label: 'Data Table', icon: TableIcon, description: 'Data in table format' },
  { id: 'chart', label: 'Chart', icon: BarChart, description: 'Visual chart representation' },
  { id: 'text', label: 'Text Block', icon: FileText, description: 'Custom text content' },
  { id: 'pageBreak', label: 'Page Break', icon: Layout, description: 'Force new page' },
];

export function ReportBuilder<T>({
  data,
  columns,
  onSave,
  onPreview,
  onExport,
}: ReportBuilderProps<T>) {
  const [template, setTemplate] = useState<Partial<ReportTemplate>>({
    id: `template-${Date.now()}`,
    name: 'New Report Template',
    description: 'Custom report template',
    category: 'custom',
    layout: {
      pageSize: 'a4',
      orientation: 'portrait',
      margins: { top: 60, right: 40, bottom: 60, left: 40 },
      header: { enabled: true, height: 30, content: 'Report Header' },
      footer: { enabled: true, height: 30, content: 'Page {{page}} of {{totalPages}}' },
    },
    sections: [],
    styling: {
      primaryColor: '#2563eb',
      secondaryColor: '#3b82f6',
      fontFamily: 'helvetica',
      titleFont: { size: 24, weight: 'bold', color: '#1f2937' },
      headerFont: { size: 16, weight: 'bold', color: '#374151' },
      bodyFont: { size: 11, weight: 'normal', color: '#4b5563' },
      tableStyle: {
        headerBackground: '#f3f4f6',
        alternateRows: true,
        alternateRowColor: '#f9fafb',
        borderColor: '#e5e7eb',
        borderWidth: 1,
      },
    },
  });

  const [activeTab, setActiveTab] = useState<'design' | 'layout' | 'styling' | 'variables'>('design');
  const [sectionEditors, setSectionEditors] = useState<SectionEditor[]>([]);
  const [draggedSection, setDraggedSection] = useState<number | null>(null);

  // Template Management
  const handleTemplateLoad = useCallback((templateId: string) => {
    const loadedTemplate = reportTemplates.find(t => t.id === templateId);
    if (loadedTemplate) {
      setTemplate(loadedTemplate);
      setSectionEditors(
        loadedTemplate.sections.map(section => ({
          section: section as ConditionalSection,
          isEditing: false,
        }))
      );
    }
  }, []);

  // Section Management
  const handleAddSection = useCallback((type: string) => {
    const newSection: ConditionalSection = {
      id: `section-${Date.now()}`,
      type: type as any,
      title: type === 'title' ? 'Report Title' : `New ${type}`,
      content: type === 'text' || type === 'summary' ? 'Add your content here...' : undefined,
    };

    const updatedSections = [...(template.sections || []), newSection];
    setTemplate({ ...template, sections: updatedSections });
    setSectionEditors([
      ...sectionEditors,
      { section: newSection, isEditing: true },
    ]);
  }, [template, sectionEditors]);

  const handleUpdateSection = useCallback((index: number, updatedSection: ConditionalSection) => {
    const updatedSections = [...(template.sections || [])];
    updatedSections[index] = updatedSection;
    setTemplate({ ...template, sections: updatedSections });

    const updatedEditors = [...sectionEditors];
    updatedEditors[index] = { ...updatedEditors[index], section: updatedSection };
    setSectionEditors(updatedEditors);
  }, [template, sectionEditors]);

  const handleDeleteSection = useCallback((index: number) => {
    const updatedSections = template.sections?.filter((_, i) => i !== index) || [];
    setTemplate({ ...template, sections: updatedSections });
    setSectionEditors(sectionEditors.filter((_, i) => i !== index));
  }, [template, sectionEditors]);

  const handleMoveSection = useCallback((fromIndex: number, toIndex: number) => {
    if (!template.sections) return;

    const updatedSections = [...template.sections];
    const [movedSection] = updatedSections.splice(fromIndex, 1);
    updatedSections.splice(toIndex, 0, movedSection);
    
    setTemplate({ ...template, sections: updatedSections });

    const updatedEditors = [...sectionEditors];
    const [movedEditor] = updatedEditors.splice(fromIndex, 1);
    updatedEditors.splice(toIndex, 0, movedEditor);
    setSectionEditors(updatedEditors);
  }, [template, sectionEditors]);

  // Drag and Drop
  const handleDragStart = (index: number) => {
    setDraggedSection(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedSection !== null && draggedSection !== dropIndex) {
      handleMoveSection(draggedSection, dropIndex);
    }
    setDraggedSection(null);
  };

  // Styling Updates
  const handleStylingUpdate = useCallback((field: string, value: any) => {
    setTemplate({
      ...template,
      styling: {
        ...template.styling,
        [field]: value,
      } as ReportStyling,
    });
  }, [template]);

  const handleLayoutUpdate = useCallback((field: string, value: any) => {
    setTemplate({
      ...template,
      layout: {
        ...template.layout,
        [field]: value,
      },
    });
  }, [template]);

  // Actions
  const handleSave = () => {
    if (template.id && template.name && template.sections && template.styling && template.layout) {
      onSave(template as ReportTemplate);
    }
  };

  const handlePreview = () => {
    if (template.id && template.name && template.sections && template.styling && template.layout) {
      onPreview(template as ReportTemplate);
    }
  };

  const handleExport = () => {
    if (template.id && template.name && template.sections && template.styling && template.layout) {
      onExport(template as ReportTemplate);
    }
  };

  const renderDesignTab = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Report Sections</h3>
          <div className="flex space-x-2">
            <select
              onChange={(e) => handleTemplateLoad(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded"
            >
              <option value="">Load Template...</option>
              {reportTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section Types */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {sectionTypes.map(type => (
            <Button
              key={type.id}
              variant="outline"
              size="sm"
              onClick={() => handleAddSection(type.id)}
              className="flex items-center space-x-2 h-auto p-3"
            >
              <type.icon className="w-4 h-4" />
              <div className="text-left">
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-gray-500">{type.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Section List */}
        <div className="space-y-3">
          {sectionEditors.map((editor, index) => (
            <Card
              key={editor.section.id}
              className={`p-4 ${draggedSection === index ? 'opacity-50' : ''}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <SectionEditor
                section={editor.section}
                isEditing={editor.isEditing}
                onUpdate={(updatedSection) => handleUpdateSection(index, updatedSection)}
                onDelete={() => handleDeleteSection(index)}
                onToggleEdit={() => {
                  const updatedEditors = [...sectionEditors];
                  updatedEditors[index].isEditing = !updatedEditors[index].isEditing;
                  setSectionEditors(updatedEditors);
                }}
              />
            </Card>
          ))}

          {sectionEditors.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No sections added yet. Add sections above to build your report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Page Layout</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Size
            </label>
            <select
              value={template.layout?.pageSize || 'a4'}
              onChange={(e) => handleLayoutUpdate('pageSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="a4">A4</option>
              <option value="a3">A3</option>
              <option value="letter">Letter</option>
              <option value="legal">Legal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orientation
            </label>
            <select
              value={template.layout?.orientation || 'portrait'}
              onChange={(e) => handleLayoutUpdate('orientation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Margins</h4>
          <div className="grid grid-cols-4 gap-4">
            {['top', 'right', 'bottom', 'left'].map(side => (
              <div key={side}>
                <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                  {side}
                </label>
                <Input
                  type="number"
                  value={template.layout?.margins?.[side as keyof typeof template.layout.margins] || 40}
                  onChange={(e) => handleLayoutUpdate('margins', {
                    ...template.layout?.margins,
                    [side]: parseInt(e.target.value) || 40
                  })}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Header & Footer</h4>
          <div className="space-y-4">
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={template.layout?.header?.enabled || false}
                  onChange={(e) => handleLayoutUpdate('header', {
                    ...template.layout?.header,
                    enabled: e.target.checked
                  })}
                  className="mr-2"
                />
                Enable Header
              </label>
              {template.layout?.header?.enabled && (
                <Input
                  value={template.layout.header.content || ''}
                  onChange={(e) => handleLayoutUpdate('header', {
                    ...template.layout.header,
                    content: e.target.value
                  })}
                  placeholder="Header content"
                />
              )}
            </div>

            <div>
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={template.layout?.footer?.enabled || false}
                  onChange={(e) => handleLayoutUpdate('footer', {
                    ...template.layout?.footer,
                    enabled: e.target.checked
                  })}
                  className="mr-2"
                />
                Enable Footer
              </label>
              {template.layout?.footer?.enabled && (
                <Input
                  value={template.layout.footer.content || ''}
                  onChange={(e) => handleLayoutUpdate('footer', {
                    ...template.layout.footer,
                    content: e.target.value
                  })}
                  placeholder="Footer content (use {{page}} for page numbers)"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStylingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Visual Styling</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <Input
              type="color"
              value={template.styling?.primaryColor || '#2563eb'}
              onChange={(e) => handleStylingUpdate('primaryColor', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <Input
              type="color"
              value={template.styling?.secondaryColor || '#3b82f6'}
              onChange={(e) => handleStylingUpdate('secondaryColor', e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Typography</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font Family
              </label>
              <select
                value={template.styling?.fontFamily || 'helvetica'}
                onChange={(e) => handleStylingUpdate('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="helvetica">Helvetica</option>
                <option value="times">Times</option>
                <option value="courier">Courier</option>
                <option value="symbol">Symbol</option>
              </select>
            </div>

            {/* Font Size Controls */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title Font Size
                </label>
                <Input
                  type="number"
                  value={template.styling?.titleFont?.size || 24}
                  onChange={(e) => handleStylingUpdate('titleFont', {
                    ...template.styling?.titleFont,
                    size: parseInt(e.target.value) || 24
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Header Font Size
                </label>
                <Input
                  type="number"
                  value={template.styling?.headerFont?.size || 16}
                  onChange={(e) => handleStylingUpdate('headerFont', {
                    ...template.styling?.headerFont,
                    size: parseInt(e.target.value) || 16
                  })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Font Size
                </label>
                <Input
                  type="number"
                  value={template.styling?.bodyFont?.size || 11}
                  onChange={(e) => handleStylingUpdate('bodyFont', {
                    ...template.styling?.bodyFont,
                    size: parseInt(e.target.value) || 11
                  })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Table Styling</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header Background
              </label>
              <Input
                type="color"
                value={template.styling?.tableStyle?.headerBackground || '#f3f4f6'}
                onChange={(e) => handleStylingUpdate('tableStyle', {
                  ...template.styling?.tableStyle,
                  headerBackground: e.target.value
                })}
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={template.styling?.tableStyle?.alternateRows || false}
                onChange={(e) => handleStylingUpdate('tableStyle', {
                  ...template.styling?.tableStyle,
                  alternateRows: e.target.checked
                })}
                className="mr-2"
              />
              Alternate Row Colors
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-gray-600 mt-1">Create professional reports with customizable layouts</p>
        </div>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <Input
              value={template.name || ''}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              placeholder="Enter template name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Input
              value={template.description || ''}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Enter template description"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Sidebar - Tabs */}
        <div className="col-span-1">
          <nav className="space-y-2">
            {[
              { id: 'design', label: 'Design', icon: Layout },
              { id: 'layout', label: 'Layout', icon: FileText },
              { id: 'styling', label: 'Styling', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-left rounded-md transition-colors ${
                  activeTab === id
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="col-span-3">
          <Card className="p-6">
            {activeTab === 'design' && renderDesignTab()}
            {activeTab === 'layout' && renderLayoutTab()}
            {activeTab === 'styling' && renderStylingTab()}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Section Editor Component
interface SectionEditorProps {
  section: ConditionalSection;
  isEditing: boolean;
  onUpdate: (section: ConditionalSection) => void;
  onDelete: () => void;
  onToggleEdit: () => void;
}

function SectionEditor({ section, isEditing, onUpdate, onDelete, onToggleEdit }: SectionEditorProps) {
  const sectionType = sectionTypes.find(t => t.id === section.type);
  const Icon = sectionType?.icon || FileText;

  const handleUpdate = (field: string, value: any) => {
    onUpdate({ ...section, [field]: value });
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">
        <Icon className="w-5 h-5 text-gray-600" />
      </div>
      
      <div className="flex-1">
        {isEditing ? (
          <div className="space-y-3">
            <Input
              value={section.title || ''}
              onChange={(e) => handleUpdate('title', e.target.value)}
              placeholder="Section title"
            />
            
            {(section.type === 'text' || section.type === 'summary') && (
              <textarea
                value={section.content || ''}
                onChange={(e) => handleUpdate('content', e.target.value)}
                placeholder="Section content"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            )}
          </div>
        ) : (
          <div>
            <h4 className="font-medium text-gray-900">{section.title || sectionType?.label}</h4>
            <p className="text-sm text-gray-600">{sectionType?.description}</p>
            {section.content && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{section.content}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center space-x-2">
        <Button size="sm" variant="ghost" onClick={onToggleEdit}>
          {isEditing ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
        <div className="cursor-move text-gray-400">
          <Move className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}