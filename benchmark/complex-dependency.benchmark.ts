/**
 * Complex Dependency Graph Benchmark
 *
 * Tests performance with a complex dependency graph
 * Simulates a realistic workflow with multiple levels and fan-out/fan-in patterns
 */

import { executeWorkflow, Process } from '../src';

export async function complexDependencyBenchmark(): Promise<void> {
  const processes: Process[] = [];

  // Level 1: 2 root processes
  processes.push(
    {
      id: 'root_1',
      dependencies: [],
      execute: async (context) => ({ data: 'root_1', value: 1 }),
      errorStrategy: 'throw',
    },
    {
      id: 'root_2',
      dependencies: [],
      execute: async (context) => ({ data: 'root_2', value: 2 }),
      errorStrategy: 'throw',
    }
  );

  // Level 2: 4 processes (each depends on one root)
  for (let i = 0; i < 4; i++) {
    const rootDep = i < 2 ? 'root_1' : 'root_2';
    processes.push({
      id: `level2_${i}`,
      dependencies: [rootDep],
      execute: async (context) => {
        const parent = context.get(rootDep);
        return { data: `level2_${i}`, parentValue: parent.value };
      },
      errorStrategy: 'throw',
    });
  }

  // Level 3: 6 processes (various dependencies)
  for (let i = 0; i < 6; i++) {
    const deps = i < 3
      ? [`level2_${i}`, `level2_${i + 1}`]
      : [`level2_${i - 3}`];

    processes.push({
      id: `level3_${i}`,
      dependencies: deps,
      execute: async (context) => {
        const values = deps.map(d => context.get(d));
        return { data: `level3_${i}`, count: values.length };
      },
      errorStrategy: 'throw',
    });
  }

  // Level 4: 4 processes
  for (let i = 0; i < 4; i++) {
    const deps = i < 2
      ? [`level3_${i}`, `level3_${i + 2}`]
      : [`level3_${i + 1}`];

    processes.push({
      id: `level4_${i}`,
      dependencies: deps,
      execute: async (context) => {
        const values = deps.map(d => context.get(d));
        return { data: `level4_${i}`, count: values.length };
      },
      errorStrategy: 'throw',
    });
  }

  // Final aggregator: depends on all level 4 processes
  processes.push({
    id: 'final_aggregator',
    dependencies: ['level4_0', 'level4_1', 'level4_2', 'level4_3'],
    execute: async (context) => {
      const results = [
        context.get('level4_0'),
        context.get('level4_1'),
        context.get('level4_2'),
        context.get('level4_3'),
      ];
      return { total: results.length, completed: true };
    },
    errorStrategy: 'throw',
  });

  await executeWorkflow({ processes });
}
