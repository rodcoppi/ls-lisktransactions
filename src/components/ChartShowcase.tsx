'use client';

import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  AreaChart, 
  BarChart, 
  ComposedChart, 
  PieChart 
} from '@/components/charts';
import { 
  TimeSeriesData, 
  VolumeAnalysisData, 
  ComparisonData, 
  MultiMetricData, 
  TransactionTypeDistribution 
} from '@/types';

/**
 * Chart Showcase Component
 * Demonstrates all high-performance chart components with sample data
 */
export const ChartShowcase: React.FC = () => {
  const [selectedDemo, setSelectedDemo] = useState<string>('line');

  // Generate sample time series data for LineChart
  const timeSeriesData: TimeSeriesData[] = useMemo(() => {
    const data: TimeSeriesData[] = [];
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (let i = 0; i < 100; i++) {
      const timestamp = now - (99 - i) * oneHour;
      data.push({
        timestamp,
        transactions: Math.floor(Math.random() * 1000) + 500,
        volume: Math.floor(Math.random() * 50000) + 10000,
        fees: Math.floor(Math.random() * 100) + 50,
        uniqueAddresses: Math.floor(Math.random() * 200) + 100
      });
    }
    
    return data;
  }, []);

  // Generate sample volume analysis data for AreaChart
  const volumeAnalysisData: VolumeAnalysisData[] = useMemo(() => {
    const data: VolumeAnalysisData[] = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 30; i++) {
      const timestamp = now - (29 - i) * oneDay;
      const totalVolume = Math.floor(Math.random() * 100000) + 50000;
      const incomingVolume = Math.floor(totalVolume * (0.4 + Math.random() * 0.2));
      const outgoingVolume = totalVolume - incomingVolume;
      
      data.push({
        timestamp,
        totalVolume,
        incomingVolume,
        outgoingVolume,
        volumeChange: Math.floor((Math.random() - 0.5) * 20000),
        transactionCount: Math.floor(Math.random() * 5000) + 1000
      });
    }
    
    return data;
  }, []);

  // Generate sample comparison data for BarChart
  const comparisonData: ComparisonData[] = useMemo(() => {
    const periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return periods.map(period => {
      const current = Math.floor(Math.random() * 10000) + 5000;
      const previous = Math.floor(Math.random() * 10000) + 5000;
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      
      return {
        period,
        current,
        previous,
        change,
        changePercent,
        label: `${period} 2024`
      };
    });
  }, []);

  // Generate sample multi-metric data for ComposedChart
  const multiMetricData: MultiMetricData[] = useMemo(() => {
    const data: MultiMetricData[] = [];
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 12; i++) {
      const timestamp = now - (11 - i) * oneWeek;
      
      data.push({
        timestamp,
        primary: Math.floor(Math.random() * 1000) + 500,
        secondary: Math.floor(Math.random() * 50) + 25,
        tertiary: Math.floor(Math.random() * 200) + 100,
        quaternary: Math.floor(Math.random() * 10) + 5
      });
    }
    
    return data;
  }, []);

  // Generate sample distribution data for PieChart
  const distributionData: TransactionTypeDistribution[] = useMemo(() => {
    const types = ['Transfer', 'Smart Contract', 'Delegate Registration', 'Vote', 'Multisignature', 'Other'];
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];
    
    const rawData = types.map((type, index) => ({
      type,
      count: Math.floor(Math.random() * 5000) + 1000,
      value: Math.floor(Math.random() * 100000) + 10000,
      color: colors[index]
    }));
    
    const total = rawData.reduce((sum, item) => sum + item.value, 0);
    
    return rawData.map(item => ({
      ...item,
      percentage: (item.value / total) * 100
    }));
  }, []);

  const demos = [
    {
      id: 'line',
      title: 'LineChart - Time Series Analysis',
      description: 'High-performance line chart with zoom/pan, 60 FPS with 10,000+ points'
    },
    {
      id: 'area',
      title: 'AreaChart - Volume Analysis',
      description: 'Gradient-filled area chart for volume visualization with stacking support'
    },
    {
      id: 'bar',
      title: 'BarChart - Period Comparisons',
      description: 'Responsive bar chart for comparing metrics across time periods'
    },
    {
      id: 'composed',
      title: 'ComposedChart - Multi-Metric Dashboard',
      description: 'Mixed chart types with dual Y-axes for complex data analysis'
    },
    {
      id: 'pie',
      title: 'PieChart - Distribution Analysis',
      description: 'Interactive pie/donut chart for categorical data distribution'
    }
  ];

  const renderSelectedChart = () => {
    switch (selectedDemo) {
      case 'line':
        return (
          <LineChart
            data={timeSeriesData}
            xAxisKey="timestamp"
            yAxisKey="transactions"
            additionalLines={[
              { key: 'volume', color: '#10b981', strokeWidth: 2 },
              { key: 'fees', color: '#f59e0b', strokeWidth: 2 },
              { key: 'uniqueAddresses', color: '#ef4444', strokeWidth: 2 }
            ]}
            title="Lisk Blockchain Activity"
            subtitle="Real-time transaction metrics with performance optimization"
            height={400}
            enableZoom={true}
            enablePan={true}
            enableBrush={true}
            enableCrosshair={true}
            smoothCurve={true}
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            animate={true}
            exportEnabled={true}
            responsive={true}
            onDataPointClick={(data, index) => {
              console.log('Data point clicked:', data, index);
            }}
            onZoom={(domain) => {
              console.log('Chart zoomed:', domain);
            }}
          />
        );

      case 'area':
        return (
          <AreaChart
            data={volumeAnalysisData}
            areas={[
              { dataKey: 'incomingVolume', color: '#10b981', gradient: true },
              { dataKey: 'outgoingVolume', color: '#ef4444', gradient: true },
            ]}
            title="Transaction Volume Analysis"
            subtitle="Daily volume breakdown with gradient fills"
            height={400}
            stacked={true}
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            animate={true}
            exportEnabled={true}
            responsive={true}
            onBrushChange={(range) => {
              console.log('Brush selection:', range);
            }}
          />
        );

      case 'bar':
        return (
          <BarChart
            data={comparisonData}
            xAxisKey="period"
            yAxisKey="current"
            title="Monthly Transaction Comparison"
            subtitle="Current vs previous period with change indicators"
            height={400}
            orientation="vertical"
            showComparison={true}
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            animate={true}
            exportEnabled={true}
            responsive={true}
            barRadius={6}
            maxBarSize={60}
            onDataPointClick={(data, index) => {
              console.log('Bar clicked:', data, index);
            }}
          />
        );

      case 'composed':
        return (
          <ComposedChart
            data={multiMetricData}
            components={[
              { type: 'line', dataKey: 'primary', color: '#0ea5e9', yAxisId: 'left' },
              { type: 'bar', dataKey: 'secondary', color: '#10b981', yAxisId: 'right' },
              { type: 'area', dataKey: 'tertiary', color: '#f59e0b', yAxisId: 'left' },
              { type: 'line', dataKey: 'quaternary', color: '#ef4444', yAxisId: 'right', strokeDasharray: '5 5' }
            ]}
            title="Multi-Metric Analysis Dashboard"
            subtitle="Combined visualization with dual Y-axes"
            height={450}
            enableDualYAxis={true}
            showGrid={true}
            showTooltip={true}
            showLegend={true}
            animate={true}
            exportEnabled={true}
            responsive={true}
            onBrushChange={(range) => {
              console.log('Composed chart brush:', range);
            }}
          />
        );

      case 'pie':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PieChart
              data={distributionData}
              valueKey="value"
              labelKey="type"
              title="Transaction Types (Standard)"
              subtitle="Distribution by value"
              height={350}
              showLabels={true}
              showValues={false}
              showTooltip={true}
              showLegend={true}
              animate={true}
              exportEnabled={true}
              responsive={true}
              startAngle={90}
              endAngle={450}
              onDataPointClick={(data, index) => {
                console.log('Pie segment clicked:', data, index);
              }}
            />
            
            <PieChart
              data={distributionData}
              valueKey="count"
              labelKey="type"
              title="Transaction Types (Donut)"
              subtitle="Distribution by count"
              height={350}
              donut={true}
              innerRadius={60}
              showLabels={false}
              showValues={true}
              showTooltip={true}
              showLegend={true}
              animate={true}
              exportEnabled={true}
              responsive={true}
              startAngle={0}
              endAngle={360}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          High-Performance Chart System
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Enterprise-grade visualization with 60 FPS performance and full accessibility
        </p>
      </div>

      {/* Chart Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Chart Type Demonstrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {demos.map((demo) => (
            <button
              key={demo.id}
              onClick={() => setSelectedDemo(demo.id)}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedDemo === demo.id
                  ? 'bg-blue-500 text-white shadow-md ring-2 ring-blue-300'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="font-medium text-sm mb-1">{demo.title.split(' - ')[1]}</div>
              <div className="text-xs opacity-90">{demo.description.split(',')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Chart Demo */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {demos.find(d => d.id === selectedDemo)?.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {demos.find(d => d.id === selectedDemo)?.description}
          </p>
        </div>
        
        {renderSelectedChart()}
      </div>

      {/* Performance Features */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Performance & Accessibility Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Performance</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 60 FPS with 10,000+ data points</li>
              <li>• Intelligent data decimation (LTTB)</li>
              <li>• Canvas rendering for large datasets</li>
              <li>• Memory optimization & caching</li>
              <li>• Virtual scrolling support</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Interactivity</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Zoom and pan functionality</li>
              <li>• Brush selection for filtering</li>
              <li>• Crosshair cursor with details</li>
              <li>• Legend toggling</li>
              <li>• Smooth animations & transitions</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Accessibility</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Screen reader support</li>
              <li>• Keyboard navigation</li>
              <li>• High contrast mode</li>
              <li>• Mobile-responsive design</li>
              <li>• Export functionality (PNG, SVG)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Technical Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Chart Types</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• <strong>LineChart:</strong> Time series with zoom/pan</li>
              <li>• <strong>AreaChart:</strong> Volume analysis with gradients</li>
              <li>• <strong>BarChart:</strong> Comparisons (vertical/horizontal)</li>
              <li>• <strong>ComposedChart:</strong> Multi-metric with dual axes</li>
              <li>• <strong>PieChart:</strong> Distribution (standard/donut)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Data Processing</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• <strong>Max Data Points:</strong> 10,000+ optimized</li>
              <li>• <strong>Update Rate:</strong> Real-time (60 FPS target)</li>
              <li>• <strong>Memory Usage:</strong> Optimized with cleanup</li>
              <li>• <strong>Bundle Size:</strong> Tree-shaken imports</li>
              <li>• <strong>TypeScript:</strong> 100% type safety</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};