/**
 * Context Operations Benchmark
 *
 * Tests performance of context get/set/has operations
 * Measures raw context manipulation overhead
 */

import { Context } from '../src';

export async function contextOperationsBenchmark(): Promise<void> {
  const context = new Context();

  // Set operations
  for (let i = 0; i < 50; i++) {
    context.set(`key_${i}`, { value: i, data: `data_${i}` }, 'completed');
  }

  // Get operations
  for (let i = 0; i < 50; i++) {
    const value = context.get(`key_${i}`);
    if (!value) {
      throw new Error(`Expected value for key_${i}`);
    }
  }

  // Has operations
  for (let i = 0; i < 50; i++) {
    const exists = context.has(`key_${i}`);
    if (!exists) {
      throw new Error(`Expected key_${i} to exist`);
    }
  }

  // GetAll operation
  const all = context.getAll();
  if (Object.keys(all).length !== 50) {
    throw new Error(`Expected 50 keys, got ${Object.keys(all).length}`);
  }
}
