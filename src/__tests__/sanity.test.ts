import type { OptimizedCacheV2 } from '../lib/types';
import {
  toUTCDateKey, 
  addUTCDays,
  formatDateLongUTC
} from '../lib/types';

import {
  isSuccess, 
  ensure24, 
  recomputeDayStatus, 
  findLatestCompleteDate,
  monthToDateTotals, 
  validateWeeklyWindow, 
  isAfterCursor, 
  mergeAndDedupeTxs,
  weeklyPeriodUTC,
  monthlyPeriodUTC
} from '../lib/logic';

describe('Normalização de status', () => {
  test('isSuccess cobre formatos comuns do Blockscout', () => {
    // Booleanos
    expect(isSuccess(true)).toBe(true);
    expect(isSuccess(false)).toBe(false);
    
    // Strings
    expect(isSuccess('ok')).toBe(true);
    expect(isSuccess('success')).toBe(true);
    expect(isSuccess('1')).toBe(true);
    expect(isSuccess('0')).toBe(false);
    expect(isSuccess('failed')).toBe(false);
    expect(isSuccess('error')).toBe(false);
    
    // Numbers
    expect(isSuccess(1)).toBe(true);
    expect(isSuccess(0)).toBe(false);
    
    // Edge cases
    expect(isSuccess(null)).toBe(false);
    expect(isSuccess(undefined)).toBe(false);
    expect(isSuccess('')).toBe(false);
  });
});

describe('Arrays horários sempre 24 slots', () => {
  test('ensure24 completa com zeros', () => {
    expect(ensure24([1, 2, 3])).toHaveLength(24);
    expect(ensure24([1, 2, 3])[0]).toBe(1);
    expect(ensure24([1, 2, 3])[3]).toBe(0); // preenchido com zero
    expect(ensure24([1, 2, 3])[23]).toBe(0); // último slot
  });

  test('ensure24 corta excedentes', () => {
    const longArray = new Array(30).fill(1);
    const result = ensure24(longArray);
    expect(result).toHaveLength(24);
    expect(result.every(x => x === 1)).toBe(true);
  });

  test('ensure24 com array undefined', () => {
    const result = ensure24();
    expect(result).toHaveLength(24);
    expect(result.every(x => x === 0)).toBe(true);
  });

  test('ensure24 com array exato de 24', () => {
    const exactArray = new Array(24).fill(5);
    const result = ensure24(exactArray);
    expect(result).toHaveLength(24);
    expect(result.every(x => x === 5)).toBe(true);
  });
});

describe('Status por dia', () => {
  const nowUTC = new Date(Date.UTC(2025, 7, 9, 12)); // 2025-08-09 12:00 UTC
  const todayKey = toUTCDateKey(nowUTC); // '2025-08-09'

  test('complete: 24 slots + soma === dailyTotal + dia anterior ao hoje', () => {
    const dateKey = '2025-08-07'; // não é hoje
    const hourly = new Array(24).fill(10); // 24 * 10 = 240
    const total = 240;
    const status = recomputeDayStatus(dateKey, total, hourly, todayKey);
    expect(status).toBe('complete');
  });

  test('partial: 24 slots mas soma != dailyTotal', () => {
    const dateKey = '2025-08-07';
    const hourly = new Array(24).fill(10); // 240
    const total = 241; // diferente da soma
    const status = recomputeDayStatus(dateKey, total, hourly, todayKey);
    expect(status).toBe('partial');
  });

  test('unknown: dia atual nunca é complete', () => {
    const hourly = new Array(24).fill(10); // 240
    const total = 240; // perfeito
    // Mas é o dia atual
    const status = recomputeDayStatus(todayKey, total, hourly, todayKey);
    expect(status).toBe('unknown');
  });

  test('unknown: sem dailyTotal', () => {
    const dateKey = '2025-08-07';
    const hourly = new Array(24).fill(10);
    const status = recomputeDayStatus(dateKey, undefined, hourly, todayKey);
    expect(status).toBe('unknown');
  });

  test('partial: array horário incompleto mas total existe', () => {
    const dateKey = '2025-08-07';
    const hourly = [1, 2, 3]; // será expandido para 24, soma = 6
    const total = 100; // diferente de 6
    const status = recomputeDayStatus(dateKey, total, hourly, todayKey);
    expect(status).toBe('partial');
  });
});

describe('Detecção de último dia completo', () => {
  test('findLatestCompleteDate ignora hoje e pega o mais recente válido', () => {
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals: {
        '2025-08-06': 100,
        '2025-08-07': 240, 
        '2025-08-08': 407
      },
      dailyStatus: {
        '2025-08-06': 'complete',
        '2025-08-07': 'complete',
        '2025-08-08': 'partial' // não vai pegar este
      },
      monthlyTotals: { '2025-08': 747 },
      recentHourly: {
        '2025-08-06': new Array(24).fill(Math.floor(100/24)),
        '2025-08-07': new Array(24).fill(10), // 24*10 = 240
        '2025-08-08': new Array(24).fill(0).map((_, i) => i < 5 ? 80 : 0) // parcial
      },
      cursor: { lastBlockNumber: 19946055, lastTxIndex: 0, lastTxHash: '0xabc' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 747,
      totalDaysActive: 3
    };

    const nowUTC = new Date('2025-08-09T12:00:00Z');
    const latest = findLatestCompleteDate(cache, nowUTC);
    expect(latest).toBe('2025-08-07'); // mais recente completo
  });

  test('findLatestCompleteDate retorna null se não encontrar nada', () => {
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals: {},
      dailyStatus: {},
      monthlyTotals: {},
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 0,
      totalDaysActive: 0
    };

    const nowUTC = new Date('2025-08-09T12:00:00Z');
    const latest = findLatestCompleteDate(cache, nowUTC);
    expect(latest).toBeNull();
  });
});

describe('KPIs mês-to-date', () => {
  test('Somente dias complete no denominador', () => {
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals: {
        '2025-08-05': 100,
        '2025-08-06': 200, 
        '2025-08-07': 300, 
        '2025-08-08': 400, // partial
        '2025-07-31': 50   // mês diferente
      },
      dailyStatus: {
        '2025-08-05': 'complete',
        '2025-08-06': 'complete',
        '2025-08-07': 'complete',
        '2025-08-08': 'partial', // será ignorado
        '2025-07-31': 'complete'  // mês diferente, será ignorado
      },
      monthlyTotals: { '2025-08': 1000 },
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 1050,
      totalDaysActive: 4
    };

    const result = monthToDateTotals(cache, '2025-08-07');
    
    // Só deve contar os 3 dias complete de agosto
    expect(result.sum).toBe(600); // 100 + 200 + 300
    expect(result.days).toBe(3);
    expect(result.avgPerCompleteDay).toBe(200); // Math.round(600/3)
  });

  test('Sem dias complete no mês', () => {
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals: {
        '2025-08-08': 400
      },
      dailyStatus: {
        '2025-08-08': 'partial' // não é complete
      },
      monthlyTotals: {},
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 400,
      totalDaysActive: 1
    };

    const result = monthToDateTotals(cache, '2025-08-08');
    expect(result.sum).toBe(0);
    expect(result.days).toBe(0);
    expect(result.avgPerCompleteDay).toBe(0);
  });
});

describe('Janela semanal', () => {
  test('Valida 7 dias consecutivos complete', () => {
    const dailyStatus: Record<string, any> = {};
    const dailyTotals: Record<string, number> = {};
    const recentHourly: Record<string, number[]> = {};
    
    // Criar 7 dias completos terminando em 2025-08-07
    const endDate = new Date(Date.UTC(2025, 7, 7)); // 2025-08-07
    for (let i = 0; i < 7; i++) {
      const day = addUTCDays(endDate, -6 + i); // 01, 02, ..., 07
      const key = toUTCDateKey(day);
      dailyStatus[key] = 'complete';
      dailyTotals[key] = 24;
      recentHourly[key] = new Array(24).fill(1);
    }

    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals, 
      dailyStatus, 
      monthlyTotals: { '2025-08': 168 },
      recentHourly,
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 168,
      totalDaysActive: 7
    };

    const result = validateWeeklyWindow(cache, '2025-08-07');
    expect(result.ok).toBe(true);
    expect(result.dates).toHaveLength(7);
    expect(result.dates[0]).toBe('2025-08-01'); // primeiro dia da semana
    expect(result.dates[6]).toBe('2025-08-07'); // último dia da semana
  });

  test('Falha se um dia não for complete', () => {
    const dailyStatus: Record<string, any> = {};
    const dailyTotals: Record<string, number> = {};
    
    // 7 dias, mas um será partial
    const endDate = new Date(Date.UTC(2025, 7, 7));
    for (let i = 0; i < 7; i++) {
      const day = addUTCDays(endDate, -6 + i);
      const key = toUTCDateKey(day);
      dailyStatus[key] = i === 3 ? 'partial' : 'complete'; // meio da semana partial
      dailyTotals[key] = 24;
    }

    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'blockscout/lisk.com',
      integrity: 'sha256:test',
      dailyTotals, 
      dailyStatus,
      monthlyTotals: {},
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 168,
      totalDaysActive: 7
    };

    const result = validateWeeklyWindow(cache, '2025-08-07');
    expect(result.ok).toBe(false);
    expect(result.dates).toHaveLength(7); // ainda retorna as datas
  });
});

describe('Cursor triplo + dedupe', () => {
  test('isAfterCursor ordena por bn, idx, hash', () => {
    const cursor = { bn: 100, idx: 5, hash: '0xaaa' };
    
    // Bloco maior
    expect(isAfterCursor({ bn: 101, idx: 0, hash: '0x000' }, cursor)).toBe(true);
    
    // Mesmo bloco, índice maior
    expect(isAfterCursor({ bn: 100, idx: 6, hash: '0x000' }, cursor)).toBe(true);
    
    // Mesmo bloco e índice, hash maior
    expect(isAfterCursor({ bn: 100, idx: 5, hash: '0xaab' }, cursor)).toBe(true);
    
    // Exatamente igual
    expect(isAfterCursor({ bn: 100, idx: 5, hash: '0xaaa' }, cursor)).toBe(false);
    
    // Menor em qualquer componente
    expect(isAfterCursor({ bn: 99, idx: 99, hash: '0xfff' }, cursor)).toBe(false);
    expect(isAfterCursor({ bn: 100, idx: 4, hash: '0xfff' }, cursor)).toBe(false);
    expect(isAfterCursor({ bn: 100, idx: 5, hash: '0xaa9' }, cursor)).toBe(false);
  });

  test('mergeAndDedupeTxs remove duplicatas e ordena', () => {
    const existing = new Map([
      ['hash1', { 
        hash: 'hash1', 
        block: 1, 
        txIndex: 1, 
        timestamp: '2025-08-07T12:00:00Z',
        method: 'test',
        gas_used: '21000',
        fee: { value: '1000' },
        to: '0xtest',
        status: true
      }]
    ]);
    
    const incoming = [
      { 
        hash: 'hash2', 
        block: 1, 
        txIndex: 2,
        timestamp: '2025-08-07T12:01:00Z',
        method: 'test',
        gas_used: '21000',
        fee: { value: '1000' },
        to: '0xtest',
        status: true
      },
      { 
        hash: 'hash1', 
        block: 1, 
        txIndex: 1,
        timestamp: '2025-08-07T12:00:00Z',
        method: 'test',
        gas_used: '21000',
        fee: { value: '1000' },
        to: '0xtest',
        status: true
      },
      { 
        hash: 'hash0', 
        block: 0, 
        txIndex: 9,
        timestamp: '2025-08-07T11:00:00Z',
        method: 'test',
        gas_used: '21000',
        fee: { value: '1000' },
        to: '0xtest',
        status: true
      }
    ];

    const result = mergeAndDedupeTxs(existing, incoming);
    
    // Deve ter 3 únicos, ordenados por block, txIndex, hash
    expect(result).toHaveLength(3);
    expect(result.map(x => x.hash)).toEqual(['hash0', 'hash1', 'hash2']);
    
    // Verificar ordenação por bloco
    expect(result[0].block).toBe(0);
    expect(result[1].block).toBe(1);
    expect(result[2].block).toBe(1);
    
    // Verificar ordenação por txIndex dentro do mesmo bloco
    expect(result[1].txIndex).toBe(1);
    expect(result[2].txIndex).toBe(2);
  });
});

describe('Formatação de períodos UTC', () => {
  test('weeklyPeriodUTC com semana completa', () => {
    // Criar cache com 7 dias completos
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'test',
      integrity: 'test',
      dailyTotals: {},
      dailyStatus: {
        '2025-08-01': 'complete',
        '2025-08-02': 'complete', 
        '2025-08-03': 'complete',
        '2025-08-04': 'complete',
        '2025-08-05': 'complete',
        '2025-08-06': 'complete',
        '2025-08-07': 'complete'
      },
      monthlyTotals: {},
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 0,
      totalDaysActive: 7
    };

    const period = weeklyPeriodUTC(cache, '2025-08-07');
    expect(period).toContain('01 August, 2025 - 07 August, 2025');
  });

  test('weeklyPeriodUTC com semana parcial', () => {
    const cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: '2025-08-09T12:00:00Z',
      source: 'test',
      integrity: 'test',
      dailyTotals: {},
      dailyStatus: {
        '2025-08-01': 'complete',
        '2025-08-02': 'partial', // quebra a sequência
        '2025-08-03': 'complete',
        '2025-08-04': 'complete',
        '2025-08-05': 'complete',
        '2025-08-06': 'complete',
        '2025-08-07': 'complete'
      },
      monthlyTotals: {},
      recentHourly: {},
      cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
      lastUpdate: '2025-08-09T12:00:00Z',
      totalTransactions: 0,
      totalDaysActive: 6
    };

    const period = weeklyPeriodUTC(cache, '2025-08-07');
    expect(period).toContain('Week-to-date:');
  });

  test('monthlyPeriodUTC formata corretamente', () => {
    const period = monthlyPeriodUTC('2025-08-07');
    expect(period).toBe('August 2025 (through 07)');
  });
});