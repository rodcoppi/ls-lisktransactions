// High-performance web worker for heavy computations and data processing
// This worker handles CPU-intensive tasks to keep the main thread responsive

// Worker state
const workerState = {
  id: Math.random().toString(36).substr(2, 9),
  startTime: Date.now(),
  tasksProcessed: 0,
  errors: 0,
  averageProcessingTime: 0,
};

// Performance monitoring
function recordPerformance(taskType, duration, success = true) {
  workerState.tasksProcessed++;
  if (!success) workerState.errors++;
  
  // Update average processing time
  workerState.averageProcessingTime = 
    (workerState.averageProcessingTime * (workerState.tasksProcessed - 1) + duration) / 
    workerState.tasksProcessed;

  // Send performance data back to main thread
  self.postMessage({
    type: 'PERFORMANCE_METRIC',
    data: {
      taskType,
      duration,
      success,
      workerId: workerState.id,
      totalTasks: workerState.tasksProcessed,
      errorRate: workerState.errors / workerState.tasksProcessed,
      averageTime: workerState.averageProcessingTime,
    },
  });
}

// Heavy computation tasks
const computationTasks = {
  // Process large datasets
  processLargeDataset: (data, options = {}) => {
    const startTime = performance.now();
    
    try {
      const {
        filterFn,
        mapFn,
        reduceFn,
        sortFn,
        chunkSize = 1000,
      } = options;

      let result = data;

      // Process in chunks to avoid blocking
      if (data.length > chunkSize) {
        result = [];
        for (let i = 0; i < data.length; i += chunkSize) {
          const chunk = data.slice(i, i + chunkSize);
          let processedChunk = chunk;

          if (filterFn) {
            processedChunk = processedChunk.filter(filterFn);
          }

          if (mapFn) {
            processedChunk = processedChunk.map(mapFn);
          }

          result = result.concat(processedChunk);

          // Yield control occasionally
          if (i % (chunkSize * 10) === 0) {
            self.postMessage({
              type: 'PROGRESS_UPDATE',
              data: {
                processed: i,
                total: data.length,
                percentage: Math.round((i / data.length) * 100),
              },
            });
          }
        }
      } else {
        // Process small datasets normally
        if (filterFn) result = result.filter(filterFn);
        if (mapFn) result = result.map(mapFn);
      }

      if (reduceFn) {
        result = result.reduce(reduceFn);
      }

      if (sortFn) {
        result = result.sort(sortFn);
      }

      const duration = performance.now() - startTime;
      recordPerformance('processLargeDataset', duration, true);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      recordPerformance('processLargeDataset', duration, false);
      throw error;
    }
  },

  // Statistical calculations
  calculateStatistics: (numbers) => {
    const startTime = performance.now();
    
    try {
      if (!Array.isArray(numbers) || numbers.length === 0) {
        throw new Error('Invalid input: expected non-empty array of numbers');
      }

      const sorted = [...numbers].sort((a, b) => a - b);
      const n = sorted.length;
      
      // Basic statistics
      const sum = sorted.reduce((acc, val) => acc + val, 0);
      const mean = sum / n;
      
      // Median
      const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];
      
      // Mode (most frequent value)
      const frequency = {};
      let maxFreq = 0;
      let mode = null;
      
      for (const num of numbers) {
        frequency[num] = (frequency[num] || 0) + 1;
        if (frequency[num] > maxFreq) {
          maxFreq = frequency[num];
          mode = num;
        }
      }
      
      // Variance and standard deviation
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
      const standardDeviation = Math.sqrt(variance);
      
      // Quartiles
      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      
      // Percentiles
      const percentiles = {};
      [10, 25, 50, 75, 90, 95, 99].forEach(p => {
        const index = Math.ceil((p / 100) * n) - 1;
        percentiles[`p${p}`] = sorted[Math.max(0, index)];
      });

      const result = {
        count: n,
        sum,
        mean,
        median,
        mode,
        min: sorted[0],
        max: sorted[n - 1],
        range: sorted[n - 1] - sorted[0],
        variance,
        standardDeviation,
        q1,
        q3,
        iqr,
        percentiles,
      };

      const duration = performance.now() - startTime;
      recordPerformance('calculateStatistics', duration, true);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      recordPerformance('calculateStatistics', duration, false);
      throw error;
    }
  },

  // Complex data transformations
  transformData: (data, transformations) => {
    const startTime = performance.now();
    
    try {
      let result = JSON.parse(JSON.stringify(data)); // Deep clone

      for (const transformation of transformations) {
        switch (transformation.type) {
          case 'groupBy':
            result = groupBy(result, transformation.key);
            break;
          
          case 'aggregate':
            result = aggregate(result, transformation.operations);
            break;
          
          case 'pivot':
            result = pivot(result, transformation.rowKey, transformation.columnKey, transformation.valueKey);
            break;
          
          case 'join':
            result = join(result, transformation.rightData, transformation.leftKey, transformation.rightKey);
            break;
          
          case 'normalize':
            result = normalize(result, transformation.schema);
            break;
          
          default:
            console.warn(`Unknown transformation type: ${transformation.type}`);
        }
      }

      const duration = performance.now() - startTime;
      recordPerformance('transformData', duration, true);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      recordPerformance('transformData', duration, false);
      throw error;
    }
  },

  // Image processing (basic operations)
  processImage: (imageData, operations) => {
    const startTime = performance.now();
    
    try {
      const { data, width, height } = imageData;
      const result = new Uint8ClampedArray(data);

      for (const operation of operations) {
        switch (operation.type) {
          case 'brightness':
            adjustBrightness(result, operation.value);
            break;
          
          case 'contrast':
            adjustContrast(result, operation.value);
            break;
          
          case 'grayscale':
            convertToGrayscale(result);
            break;
          
          case 'blur':
            // Simple box blur
            boxBlur(result, width, height, operation.radius || 1);
            break;
        }
      }

      const duration = performance.now() - startTime;
      recordPerformance('processImage', duration, true);

      return { data: result, width, height };
    } catch (error) {
      const duration = performance.now() - startTime;
      recordPerformance('processImage', duration, false);
      throw error;
    }
  },

  // Text analysis and processing
  analyzeText: (text, options = {}) => {
    const startTime = performance.now();
    
    try {
      const {
        includeSentiments = false,
        includeKeywords = false,
        includeStatistics = true,
      } = options;

      const result = {
        text,
        timestamp: Date.now(),
      };

      if (includeStatistics) {
        // Basic text statistics
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.toLowerCase().match(/\b\w+\b/g) || [];
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;
        
        // Word frequency
        const wordFreq = {};
        words.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        const topWords = Object.entries(wordFreq)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word, count]) => ({ word, count }));

        result.statistics = {
          sentences: sentences.length,
          words: words.length,
          characters,
          charactersNoSpaces,
          averageWordsPerSentence: words.length / sentences.length || 0,
          averageCharactersPerWord: characters / words.length || 0,
          topWords,
        };
      }

      if (includeKeywords) {
        // Simple keyword extraction
        result.keywords = extractKeywords(text);
      }

      if (includeSentiments) {
        // Basic sentiment analysis
        result.sentiment = analyzeSentiment(text);
      }

      const duration = performance.now() - startTime;
      recordPerformance('analyzeText', duration, true);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      recordPerformance('analyzeText', duration, false);
      throw error;
    }
  },
};

// Helper functions for data transformations
function groupBy(data, key) {
  return data.reduce((groups, item) => {
    const groupKey = item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
}

function aggregate(data, operations) {
  const result = {};
  
  operations.forEach(op => {
    const values = data.map(item => item[op.field]).filter(val => val != null);
    
    switch (op.operation) {
      case 'sum':
        result[op.alias || `sum_${op.field}`] = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result[op.alias || `avg_${op.field}`] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'count':
        result[op.alias || `count_${op.field}`] = values.length;
        break;
      case 'min':
        result[op.alias || `min_${op.field}`] = Math.min(...values);
        break;
      case 'max':
        result[op.alias || `max_${op.field}`] = Math.max(...values);
        break;
    }
  });
  
  return result;
}

function pivot(data, rowKey, columnKey, valueKey) {
  const result = {};
  
  data.forEach(item => {
    const row = item[rowKey];
    const col = item[columnKey];
    const val = item[valueKey];
    
    if (!result[row]) {
      result[row] = {};
    }
    result[row][col] = val;
  });
  
  return result;
}

function join(leftData, rightData, leftKey, rightKey) {
  const rightMap = new Map();
  rightData.forEach(item => {
    rightMap.set(item[rightKey], item);
  });
  
  return leftData.map(leftItem => {
    const rightItem = rightMap.get(leftItem[leftKey]);
    return rightItem ? { ...leftItem, ...rightItem } : leftItem;
  });
}

function normalize(data, schema) {
  return data.map(item => {
    const normalized = {};
    Object.entries(schema).forEach(([key, config]) => {
      const value = item[config.source || key];
      
      if (config.type === 'number') {
        normalized[key] = parseFloat(value) || 0;
      } else if (config.type === 'date') {
        normalized[key] = new Date(value).toISOString();
      } else {
        normalized[key] = String(value || '');
      }
    });
    return normalized;
  });
}

// Image processing helpers
function adjustBrightness(data, value) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + value));     // Red
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + value)); // Green
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + value)); // Blue
    // Alpha channel (i + 3) remains unchanged
  }
}

function adjustContrast(data, value) {
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
}

function convertToGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;     // Red
    data[i + 1] = gray; // Green
    data[i + 2] = gray; // Blue
  }
}

function boxBlur(data, width, height, radius) {
  const original = new Uint8ClampedArray(data);
  const size = (radius * 2 + 1) * (radius * 2 + 1);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const idx = (ny * width + nx) * 4;
          
          r += original[idx];
          g += original[idx + 1];
          b += original[idx + 2];
          a += original[idx + 3];
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = r / size;
      data[idx + 1] = g / size;
      data[idx + 2] = b / size;
      data[idx + 3] = a / size;
    }
  }
}

// Text analysis helpers
function extractKeywords(text) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function analyzeSentiment(text) {
  // Very basic sentiment analysis
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy'];
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'disappointed'];
  
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  let sentiment = 'neutral';
  if (score > 0) sentiment = 'positive';
  if (score < 0) sentiment = 'negative';
  
  return {
    score,
    sentiment,
    confidence: Math.abs(score) / words.length,
  };
}

// Main message handler
self.onmessage = async function(event) {
  const { type, data, taskId } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'PROCESS_DATASET':
        result = computationTasks.processLargeDataset(data.dataset, data.options);
        break;
      
      case 'CALCULATE_STATISTICS':
        result = computationTasks.calculateStatistics(data.numbers);
        break;
      
      case 'TRANSFORM_DATA':
        result = computationTasks.transformData(data.data, data.transformations);
        break;
      
      case 'PROCESS_IMAGE':
        result = computationTasks.processImage(data.imageData, data.operations);
        break;
      
      case 'ANALYZE_TEXT':
        result = computationTasks.analyzeText(data.text, data.options);
        break;
      
      case 'GET_WORKER_STATS':
        result = {
          ...workerState,
          uptime: Date.now() - workerState.startTime,
        };
        break;
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    // Send successful result
    self.postMessage({
      type: 'TASK_COMPLETE',
      taskId,
      success: true,
      result,
    });
    
  } catch (error) {
    // Send error result
    self.postMessage({
      type: 'TASK_COMPLETE',
      taskId,
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
};

// Send ready signal
self.postMessage({
  type: 'WORKER_READY',
  workerId: workerState.id,
});