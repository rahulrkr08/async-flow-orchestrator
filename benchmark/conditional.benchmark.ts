/**
 * Conditional Execution Benchmark
 *
 * Tests performance with conditional process execution
 * Some processes will execute, some will be skipped based on conditions
 */

import { executeWorkflow, Process } from '../src';

export async function conditionalBenchmark(): Promise<void> {
  const processes: Process[] = [];

  // Root process that determines execution path
  processes.push({
    id: 'config',
    dependencies: [],
    execute: async (context) => ({
      enableFeatureA: true,
      enableFeatureB: false,
      threshold: 50,
    }),
    errorStrategy: 'throw',
  });

  // Conditional branches based on config
  for (let i = 0; i < 5; i++) {
    processes.push({
      id: `featureA_${i}`,
      dependencies: ['config'],
      condition: (context) => context.get('config').enableFeatureA,
      execute: async (context) => {
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        return { feature: 'A', step: i, value: sum };
      },
      errorStrategy: 'throw',
    });

    processes.push({
      id: `featureB_${i}`,
      dependencies: ['config'],
      condition: (context) => context.get('config').enableFeatureB,
      execute: async (context) => {
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        return { feature: 'B', step: i, value: sum };
      },
      errorStrategy: 'throw',
    });
  }

  // Processes with threshold conditions
  for (let i = 0; i < 5; i++) {
    processes.push({
      id: `threshold_${i}`,
      dependencies: ['config'],
      condition: (context) => {
        const threshold = context.get('config').threshold;
        return i * 10 >= threshold;
      },
      execute: async (context) => {
        return { thresholdMet: true, index: i };
      },
      errorStrategy: 'throw',
    });
  }

  await executeWorkflow({ processes });
}
