/**
 * Benchmark Suite for async-flow-orchestrator
 *
 * Main runner that executes all benchmarks and reports results
 */

import { sequentialBenchmark } from './sequential.benchmark';
import { parallelBenchmark } from './parallel.benchmark';
import { complexDependencyBenchmark } from './complex-dependency.benchmark';
import { conditionalBenchmark } from './conditional.benchmark';
import { errorHandlingBenchmark } from './error-handling.benchmark';
import { contextOperationsBenchmark } from './context-operations.benchmark';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  opsPerSec: number;
  throughput?: string;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  const times: number[] = [];

  console.log(`\n📊 Running: ${name}`);
  console.log(`   Iterations: ${iterations}`);

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await fn();
  }

  // Actual benchmark
  const startTotal = process.hrtime.bigint();

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1_000_000); // Convert to milliseconds

    if ((i + 1) % 100 === 0) {
      process.stdout.write(`\r   Progress: ${i + 1}/${iterations}`);
    }
  }

  const endTotal = process.hrtime.bigint();
  process.stdout.write('\r');

  const totalTime = Number(endTotal - startTotal) / 1_000_000; // ms
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const opsPerSec = (iterations / totalTime) * 1000;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    opsPerSec,
  };
}

function printResults(results: BenchmarkResult[]): void {
  console.log('\n\n' + '='.repeat(80));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(80));

  results.forEach(result => {
    console.log(`\n${result.name}`);
    console.log('-'.repeat(80));
    console.log(`  Total Time:      ${result.totalTime.toFixed(2)} ms`);
    console.log(`  Iterations:      ${result.iterations.toLocaleString()}`);
    console.log(`  Average Time:    ${result.avgTime.toFixed(4)} ms`);
    console.log(`  Min Time:        ${result.minTime.toFixed(4)} ms`);
    console.log(`  Max Time:        ${result.maxTime.toFixed(4)} ms`);
    console.log(`  Ops/sec:         ${result.opsPerSec.toFixed(2)} ops/s`);
    if (result.throughput) {
      console.log(`  Throughput:      ${result.throughput}`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const sorted = [...results].sort((a, b) => b.opsPerSec - a.opsPerSec);
  sorted.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.name.padEnd(40)} ${result.opsPerSec.toFixed(2)} ops/s`);
  });

  console.log('='.repeat(80) + '\n');
}

async function main(): Promise<void> {
  console.log('🚀 async-flow-orchestrator Benchmark Suite');
  console.log('='.repeat(80));

  const results: BenchmarkResult[] = [];

  // Sequential workflow benchmark
  results.push(await runBenchmark(
    'Sequential Workflow (10 processes)',
    sequentialBenchmark,
    1000
  ));

  // Parallel execution benchmark
  results.push(await runBenchmark(
    'Parallel Execution (10 processes)',
    parallelBenchmark,
    1000
  ));

  // Complex dependency benchmark
  results.push(await runBenchmark(
    'Complex Dependencies (20 processes)',
    complexDependencyBenchmark,
    500
  ));

  // Conditional execution benchmark
  results.push(await runBenchmark(
    'Conditional Execution (15 processes)',
    conditionalBenchmark,
    1000
  ));

  // Error handling benchmark
  results.push(await runBenchmark(
    'Error Handling (silent strategy)',
    errorHandlingBenchmark,
    1000
  ));

  // Context operations benchmark
  results.push(await runBenchmark(
    'Context Operations (100 operations)',
    contextOperationsBenchmark,
    5000
  ));

  printResults(results);
}

// Run benchmarks
main().catch(console.error);
