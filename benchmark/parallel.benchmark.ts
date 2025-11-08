/**
 * Parallel Execution Benchmark
 *
 * Tests performance when multiple processes run in parallel
 * 10 processes with no dependencies, then 1 aggregator
 */

import { executeWorkflow, Process } from '../src';

export async function parallelBenchmark(): Promise<void> {
  const processes: Process[] = [];

  // Create 10 parallel processes
  for (let i = 0; i < 10; i++) {
    processes.push({
      id: `parallel_${i}`,
      dependencies: [],
      execute: async (context) => {
        // Simulate some async work
        await new Promise(resolve => setImmediate(resolve));
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        return { value: sum, id: i };
      },
      errorStrategy: 'throw',
    });
  }

  // Add an aggregator that depends on all parallel processes
  const parallelDeps = processes.map(p => p.id);
  processes.push({
    id: 'aggregator',
    dependencies: parallelDeps,
    execute: async (context) => {
      const results = parallelDeps.map(id => context.get(id));
      return { total: results.length, aggregated: true };
    },
    errorStrategy: 'throw',
  });

  await executeWorkflow({ processes });
}
