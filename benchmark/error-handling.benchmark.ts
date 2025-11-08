/**
 * Error Handling Benchmark
 *
 * Tests performance when errors occur and are handled with 'silent' strategy
 * Measures overhead of error handling in workflows
 */

import { executeWorkflow, Process } from '../src';

export async function errorHandlingBenchmark(): Promise<void> {
  const processes: Process[] = [];

  // Create processes that alternate between success and failure
  for (let i = 0; i < 10; i++) {
    const shouldFail = i % 3 === 0;

    processes.push({
      id: `process_${i}`,
      dependencies: i === 0 ? [] : [`process_${i - 1}`],
      execute: async (context) => {
        if (shouldFail) {
          throw new Error(`Simulated error in process_${i}`);
        }
        let sum = 0;
        for (let j = 0; j < 100; j++) {
          sum += j;
        }
        return { value: sum, step: i };
      },
      errorStrategy: 'silent', // Continue despite errors
    });
  }

  // Add fallback processes that check for errors
  for (let i = 0; i < 5; i++) {
    const primaryId = `process_${i * 2}`;
    processes.push({
      id: `fallback_${i}`,
      dependencies: [primaryId],
      execute: async (context) => {
        const hasResult = context.has(primaryId) && context.get(primaryId) !== undefined;
        if (!hasResult) {
          // Use fallback value
          return { fallback: true, value: 0 };
        }
        return context.get(primaryId);
      },
      errorStrategy: 'throw',
    });
  }

  await executeWorkflow({ processes });
}
