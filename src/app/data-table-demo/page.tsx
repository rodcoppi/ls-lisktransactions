'use client';

import React, { useMemo, useState } from 'react';
import { 
  DataTable, 
  Column, 
  createColumn, 
  createSelectColumn, 
  createActionsColumn,
  NumericCell,
  DateCell,
  StatusCell,
  ProgressCell,
  TagsCell,
  defaultBulkActions,
  defaultRowActions,
  generateSampleData,
} from '@/components/data-table';

// Sample data type
interface SampleUser {
  id: string;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive' | 'pending';
  role: string;
  department: string;
  salary: number;
  joinDate: Date;
  progress: number;
  tags: string[];
  avatar?: string;
  isVip: boolean;
  lastLogin: Date;
  projects: number;
  rating: number;
}

// Generate sample data
function generateUsers(count: number): SampleUser[] {
  const statuses = ['active', 'inactive', 'pending'] as const;
  const roles = ['Admin', 'Manager', 'Developer', 'Designer', 'Analyst'];
  const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'];
  const tags = ['Remote', 'Full-time', 'Part-time', 'Contractor', 'Senior', 'Junior', 'Lead'];

  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 22 + Math.floor(Math.random() * 40),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    role: roles[Math.floor(Math.random() * roles.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    salary: 30000 + Math.floor(Math.random() * 120000),
    joinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
    progress: Math.floor(Math.random() * 100),
    tags: tags.filter(() => Math.random() > 0.5).slice(0, 3),
    isVip: Math.random() > 0.8,
    lastLogin: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
    projects: Math.floor(Math.random() * 20),
    rating: Math.round((Math.random() * 4 + 1) * 10) / 10,
  }));
}

export default function DataTableDemo() {
  const [dataSize, setDataSize] = useState(1000);
  const [selectedDemo, setSelectedDemo] = useState<'basic' | 'advanced' | 'mobile'>('basic');

  // Generate sample data
  const data = useMemo(() => generateUsers(dataSize), [dataSize]);

  // Define columns
  const columns: Column<SampleUser>[] = useMemo(() => [
    createSelectColumn<SampleUser>(),
    createColumn<SampleUser>({
      id: 'name',
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      cell: ({ getValue }) => (
        <div className="font-medium">{getValue()}</div>
      ),
    }),
    createColumn<SampleUser>({
      id: 'email',
      accessorKey: 'email',
      header: 'Email',
      size: 250,
    }),
    createColumn<SampleUser>({
      id: 'age',
      accessorKey: 'age',
      header: 'Age',
      size: 80,
      align: 'center',
      cell: ({ getValue }) => (
        <NumericCell value={getValue()} format="number" precision={0} />
      ),
    }),
    createColumn<SampleUser>({
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: ({ getValue }) => {
        const status = getValue() as SampleUser['status'];
        const variant = status === 'active' ? 'success' : 
                      status === 'inactive' ? 'error' : 'warning';
        return <StatusCell status={status} variant={variant} />;
      },
    }),
    createColumn<SampleUser>({
      id: 'role',
      accessorKey: 'role',
      header: 'Role',
      size: 120,
    }),
    createColumn<SampleUser>({
      id: 'department',
      accessorKey: 'department',
      header: 'Department',
      size: 130,
    }),
    createColumn<SampleUser>({
      id: 'salary',
      accessorKey: 'salary',
      header: 'Salary',
      size: 120,
      align: 'right',
      cell: ({ getValue }) => (
        <NumericCell value={getValue()} format="currency" />
      ),
    }),
    createColumn<SampleUser>({
      id: 'joinDate',
      accessorKey: 'joinDate',
      header: 'Join Date',
      size: 120,
      cell: ({ getValue }) => (
        <DateCell value={getValue()} />
      ),
    }),
    createColumn<SampleUser>({
      id: 'progress',
      accessorKey: 'progress',
      header: 'Progress',
      size: 120,
      cell: ({ getValue }) => (
        <ProgressCell value={getValue()} max={100} />
      ),
    }),
    createColumn<SampleUser>({
      id: 'tags',
      accessorKey: 'tags',
      header: 'Tags',
      size: 150,
      enableSorting: false,
      cell: ({ getValue }) => (
        <TagsCell tags={getValue()} maxVisible={2} />
      ),
    }),
    createColumn<SampleUser>({
      id: 'rating',
      accessorKey: 'rating',
      header: 'Rating',
      size: 100,
      align: 'center',
      cell: ({ getValue }) => (
        <div className="flex items-center space-x-1">
          <span>{getValue()}</span>
          <span className="text-yellow-500">★</span>
        </div>
      ),
    }),
    createActionsColumn<SampleUser>([
      ...defaultRowActions,
      {
        id: 'promote',
        label: 'Promote',
        icon: <div className="w-4 h-4">↗️</div>,
        action: (row) => {
          alert(`Promoting ${row.original.name}`);
        },
        visible: (row) => row.original.status === 'active',
      },
    ]),
  ], []);

  const mobileColumns = columns.slice(0, 6); // Fewer columns for mobile demo

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Data Table Demo</h1>
        <p className="text-muted-foreground">
          A comprehensive data table implementation with virtualization, sorting, filtering, 
          export capabilities, and mobile responsiveness.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Demo Type:</label>
          <select
            value={selectedDemo}
            onChange={(e) => setSelectedDemo(e.target.value as any)}
            className="px-3 py-1 border rounded"
          >
            <option value="basic">Basic Features</option>
            <option value="advanced">Advanced Features</option>
            <option value="mobile">Mobile View</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Data Size:</label>
          <select
            value={dataSize}
            onChange={(e) => setDataSize(Number(e.target.value))}
            className="px-3 py-1 border rounded"
          >
            <option value={100}>100 rows</option>
            <option value={1000}>1,000 rows</option>
            <option value={10000}>10,000 rows</option>
            <option value={100000}>100,000 rows</option>
          </select>
        </div>

        <div className="text-sm text-muted-foreground">
          Current: {data.length.toLocaleString()} rows, {columns.length} columns
        </div>
      </div>

      {/* Demo Tables */}
      <div className="space-y-6">
        {selectedDemo === 'basic' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Basic Features</h2>
            <p className="text-muted-foreground">
              Basic table with sorting, filtering, and row selection.
            </p>
            <DataTable
              data={data}
              columns={columns}
              enableVirtualization={dataSize > 1000}
              enableSorting={true}
              enableFiltering={true}
              enableRowSelection={true}
              enableExport={true}
              bulkActions={[
                ...defaultBulkActions,
                {
                  id: 'export-selected',
                  label: 'Export Selected',
                  icon: <div className="w-4 h-4">📄</div>,
                  action: (rows) => {
                    console.log('Exporting', rows.length, 'rows');
                  },
                },
              ]}
              className="border"
            />
          </div>
        )}

        {selectedDemo === 'advanced' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Advanced Features</h2>
            <p className="text-muted-foreground">
              Advanced table with all features enabled including column resizing, ordering, and pinning.
            </p>
            <DataTable
              data={data}
              columns={columns}
              enableVirtualization={true}
              enableSorting={true}
              enableMultiSort={true}
              enableFiltering={true}
              enableColumnFilters={true}
              enableGlobalFilter={true}
              enableRowSelection={true}
              enableMultiRowSelection={true}
              enableColumnResizing={true}
              enableColumnOrdering={true}
              enableColumnPinning={true}
              enablePagination={dataSize > 1000}
              enableExport={true}
              bulkActions={[
                ...defaultBulkActions,
                {
                  id: 'bulk-edit',
                  label: 'Bulk Edit',
                  icon: <div className="w-4 h-4">✏️</div>,
                  action: (rows) => {
                    alert(`Bulk editing ${rows.length} rows`);
                  },
                },
                {
                  id: 'send-email',
                  label: 'Send Email',
                  icon: <div className="w-4 h-4">📧</div>,
                  action: (rows) => {
                    alert(`Sending email to ${rows.length} users`);
                  },
                },
              ]}
              debugTable={true}
              className="border"
            />
          </div>
        )}

        {selectedDemo === 'mobile' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Mobile View</h2>
            <p className="text-muted-foreground">
              Mobile-optimized card view with touch interactions. Resize your window or view on mobile.
            </p>
            <DataTable
              data={data.slice(0, 100)} // Limit for mobile demo
              columns={mobileColumns}
              enableMobile={true}
              mobileBreakpoint={1024} // Force mobile view on desktop
              enableRowSelection={true}
              enableGlobalFilter={true}
              bulkActions={[
                {
                  id: 'call',
                  label: 'Call',
                  icon: <div className="w-4 h-4">📞</div>,
                  action: (rows) => {
                    alert(`Calling ${rows.length} users`);
                  },
                },
                {
                  id: 'message',
                  label: 'Message',
                  icon: <div className="w-4 h-4">💬</div>,
                  action: (rows) => {
                    alert(`Messaging ${rows.length} users`);
                  },
                },
              ]}
              rowActions={[
                {
                  id: 'call',
                  label: 'Call',
                  icon: <div className="w-4 h-4">📞</div>,
                  action: (row) => {
                    alert(`Calling ${row.original.name}`);
                  },
                },
                {
                  id: 'message',
                  label: 'Message',
                  icon: <div className="w-4 h-4">💬</div>,
                  action: (row) => {
                    alert(`Messaging ${row.original.name}`);
                  },
                },
              ]}
              cardRenderer={(row) => (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{row.original.name}</div>
                    <StatusCell 
                      status={row.original.status} 
                      variant={row.original.status === 'active' ? 'success' : 'warning'}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">{row.original.email}</div>
                  <div className="text-sm">{row.original.role} • {row.original.department}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      Salary: <NumericCell value={row.original.salary} format="currency" />
                    </div>
                    <div className="text-sm">
                      Rating: {row.original.rating} ★
                    </div>
                  </div>
                </div>
              )}
              className="border"
            />
          </div>
        )}
      </div>

      {/* Features List */}
      <div className="mt-12 space-y-6">
        <h2 className="text-2xl font-semibold">Features Implemented</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Core Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Virtual scrolling for 100k+ rows</li>
              <li>✅ Fixed headers and columns</li>
              <li>✅ Dynamic row height calculation</li>
              <li>✅ Horizontal scrolling with sticky columns</li>
              <li>✅ Intersection observer optimization</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Advanced Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Multi-column sorting with priority</li>
              <li>✅ Advanced filtering with conditions</li>
              <li>✅ Global search with highlighting</li>
              <li>✅ Column resizing with drag handles</li>
              <li>✅ Column reordering with drag & drop</li>
              <li>✅ Column pinning (left/right sticky)</li>
              <li>✅ Row grouping and expansion</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Export Capabilities</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ CSV export with custom formatting</li>
              <li>✅ Excel export with formulas and styling</li>
              <li>✅ PDF export with pagination and headers</li>
              <li>✅ JSON export with schema validation</li>
              <li>✅ Clipboard copy functionality</li>
              <li>✅ Print-optimized layouts</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Responsive Design</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Mobile table with horizontal scroll</li>
              <li>✅ Card view for mobile devices</li>
              <li>✅ Adaptive column hiding</li>
              <li>✅ Touch-friendly interaction elements</li>
              <li>✅ Swipe actions for mobile operations</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Selection & Actions</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Row selection with checkboxes</li>
              <li>✅ Bulk actions toolbar</li>
              <li>✅ Context menu with right-click</li>
              <li>✅ Keyboard navigation</li>
              <li>✅ Row editing with validation</li>
              <li>✅ Undo/redo functionality</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-medium">Accessibility</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✅ Full keyboard navigation</li>
              <li>✅ Screen reader support</li>
              <li>✅ ARIA attributes</li>
              <li>✅ Focus management</li>
              <li>✅ High contrast mode support</li>
              <li>✅ Reduced motion support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}