/**
 * Sequential Workflow Benchmark
 *
 * Tests performance of a linear chain of dependent processes
 * Each process depends on the previous one
 */

import { executeWorkflow, Process } from '../src';

export async function sequentialBenchmark(): Promise<void> {
  const processes: Process[] = [];

  // Create a chain of 10 sequential processes
  for (let i = 0; i < 10; i++) {
    processes.push({
      id: `process_${i}`,
      dependencies: i === 0 ? [] : [`process_${i - 1}`],
      execute: async (context) => {
        // Simulate some light work
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        return { value: sum, step: i };
      },
      errorStrategy: 'throw',
    });
  }

  await executeWorkflow({ processes });
}
