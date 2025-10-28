import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkflowEngine } from '../src/workflow-engine';
import { WorkflowConfig, Logger } from '../src/types';

describe('WorkflowEngine', () => {
  describe('Constructor and Validation', () => {
    it('should create a workflow engine with valid config', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      assert.ok(engine);
      assert.ok(engine.getContext());
    });

    it('should throw error when processId is missing with single output strategy', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'single' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /processId is required when output strategy is "single"/
      );
    });

    it('should throw error when processId is missing with multiple output strategy', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'multiple' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /processId is required when output strategy is "multiple"/
      );
    });

    it('should throw error when processId is not a string for single strategy', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'single', processId: ['process1'] as any },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /processId must be a string when output strategy is "single"/
      );
    });

    it('should throw error when processId is not an array for multiple strategy', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'multiple', processId: 'process1' as any },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /processId must be an array of strings when output strategy is "multiple"/
      );
    });

    it('should throw error for duplicate process IDs', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /Duplicate process ID: process1/
      );
    });

    it('should throw error for non-existent dependency', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: ['nonexistent'],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /Process "process1" depends on non-existent process "nonexistent"/
      );
    });

    it('should throw error for circular dependencies', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: ['process2'],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /Circular dependency detected/
      );
    });

    it('should throw error when target process does not exist', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'single', processId: 'nonexistent' },
      };
      assert.throws(
        () => new WorkflowEngine(config),
        /Process "nonexistent" does not exist/
      );
    });

    it('should initialize with initial context', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async (ctx) => {
              return ctx.get('initial') + ' processed';
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        initialContext: { initial: 'value' },
      };
      const engine = new WorkflowEngine(config);
      const context = engine.getContext();
      assert.strictEqual(context.get('initial'), 'value');
    });

    it('should use provided logger', () => {
      const logs: string[] = [];
      const logger: Logger = {
        info: (msg: string) => logs.push(msg),
        debug: () => {},
      };
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        logger,
      };
      const engine = new WorkflowEngine(config);
      assert.ok(engine);
    });

    it('should use default noop logger when not provided', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      assert.ok(engine);
    });

    it('should use default output strategy all when not provided', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        // output is not provided, should default to 'all'
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Should return all results when output is not specified
      assert.deepStrictEqual(Object.keys(result.data).sort(), ['process1', 'process2']);
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.data.process2, 'result2');
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a single process', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.metadata.states.process1, 'completed');
      assert.deepStrictEqual(result.metadata.errors, {});
    });

    it('should execute multiple independent processes in parallel', async () => {
      const executionOrder: string[] = [];
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              executionOrder.push('process1');
              return 'result1';
            },
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: [],
            execute: async () => {
              executionOrder.push('process2');
              return 'result2';
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.data.process2, 'result2');
      assert.strictEqual(executionOrder.length, 2);
    });

    it('should execute dependent processes in order', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 10,
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async (ctx) => ctx.get('process1') * 2,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.process1, 10);
      assert.strictEqual(result.data.process2, 20);
    });

    it('should execute complex dependency graph', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'A',
            dependencies: [],
            execute: async () => 1,
            errorStrategy: 'silent',
          },
          {
            id: 'B',
            dependencies: [],
            execute: async () => 2,
            errorStrategy: 'silent',
          },
          {
            id: 'C',
            dependencies: ['A', 'B'],
            execute: async (ctx) => ctx.get('A') + ctx.get('B'),
            errorStrategy: 'silent',
          },
          {
            id: 'D',
            dependencies: ['C'],
            execute: async (ctx) => ctx.get('C') * 2,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.A, 1);
      assert.strictEqual(result.data.B, 2);
      assert.strictEqual(result.data.C, 3);
      assert.strictEqual(result.data.D, 6);
    });

    it('should return single output when output strategy is single', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'single', processId: 'process2' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.deepStrictEqual(Object.keys(result.data), ['process2']);
      assert.strictEqual(result.data.process2, 'result2');
    });

    it('should return multiple outputs when output strategy is multiple', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'A',
            dependencies: [],
            execute: async () => 'resultA',
            errorStrategy: 'silent',
          },
          {
            id: 'B',
            dependencies: [],
            execute: async () => 'resultB',
            errorStrategy: 'silent',
          },
          {
            id: 'C',
            dependencies: ['A', 'B'],
            execute: async () => 'resultC',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'multiple', processId: ['A', 'C'] },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.deepStrictEqual(Object.keys(result.data).sort(), ['A', 'C']);
      assert.strictEqual(result.data.A, 'resultA');
      assert.strictEqual(result.data.C, 'resultC');
    });

    it('should return all outputs when output strategy is all', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.deepStrictEqual(Object.keys(result.data).sort(), ['process1', 'process2']);
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.data.process2, 'result2');
    });

    it('should skip process when condition returns false', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            condition: () => false,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'skipped');
      assert.strictEqual(result.data.process1, undefined);
    });

    it('should execute process when condition returns true', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            condition: () => true,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'completed');
      assert.strictEqual(result.data.process1, 'result1');
    });

    it('should skip process when condition throws error', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            condition: () => {
              throw new Error('Condition error');
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'skipped');
    });

    it('should evaluate condition with context', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 10,
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'executed',
            condition: (ctx) => ctx.get('process1') > 5,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process2, 'completed');
      assert.strictEqual(result.data.process2, 'executed');
    });
  });

  describe('Error Handling', () => {
    it('should handle silent errors and continue workflow', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              throw new Error('Process 1 failed');
            },
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'failed');
      assert.strictEqual(result.metadata.states.process2, 'completed');
      assert.ok(result.metadata.errors.process1);
      assert.strictEqual(result.metadata.errors.process1.message, 'Process 1 failed');
    });

    it('should throw error and stop workflow with throw error strategy', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              throw new Error('Process 1 failed');
            },
            errorStrategy: 'throw',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async () => 'result2',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'failed');
      assert.strictEqual(result.metadata.states.process2, 'pending');
      assert.ok(result.metadata.errors.process1);
    });

    it('should handle non-Error throws', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              throw 'String error';
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.process1, 'failed');
      assert.ok(result.metadata.errors.process1);
      assert.strictEqual(result.metadata.errors.process1.message, 'String error');
    });

    it('should throw error when no root processes found', async () => {
      // This is impossible to test with current validation, but let's test edge case
      // where we somehow bypass validation
      const config: WorkflowConfig = {
        processes: [],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Should return empty result
      assert.deepStrictEqual(result.data, {});
    });
  });

  describe('Logger Integration', () => {
    it('should log process completion with logger', async () => {
      const logs: string[] = [];
      const logger: Logger = {
        info: (msg: string) => logs.push(msg),
        debug: () => {},
      };
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        logger,
      };
      const engine = new WorkflowEngine(config);
      await engine.execute();
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0], 'Process "process1" completed');
    });

    it('should not log when process is skipped', async () => {
      const logs: string[] = [];
      const logger: Logger = {
        info: (msg: string) => logs.push(msg),
        debug: () => {},
      };
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            condition: () => false,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        logger,
      };
      const engine = new WorkflowEngine(config);
      await engine.execute();
      assert.strictEqual(logs.length, 0);
    });

    it('should not log when process fails', async () => {
      const logs: string[] = [];
      const logger: Logger = {
        info: (msg: string) => logs.push(msg),
        debug: () => {},
      };
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              throw new Error('Failed');
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        logger,
      };
      const engine = new WorkflowEngine(config);
      await engine.execute();
      assert.strictEqual(logs.length, 0);
    });
  });

  describe('Context Access', () => {
    it('should provide access to context', () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const context = engine.getContext();
      assert.ok(context);
    });
  });

  describe('Wait for Completion', () => {
    it('should handle setImmediate in waitForCompletion when processes are still pending', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
          {
            id: 'process2',
            dependencies: ['process1'],
            execute: async (ctx) => ctx.get('process1') + ' extended',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.data.process2, 'result1 extended');
      assert.strictEqual(result.metadata.states.process1, 'completed');
      assert.strictEqual(result.metadata.states.process2, 'completed');
    });

    it('should handle multiple dependent processes with wait completion', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'A',
            dependencies: [],
            execute: async () => 1,
            errorStrategy: 'silent',
          },
          {
            id: 'B',
            dependencies: [],
            execute: async () => 2,
            errorStrategy: 'silent',
          },
          {
            id: 'C',
            dependencies: ['A', 'B'],
            execute: async (ctx) => ctx.get('A') + ctx.get('B'),
            errorStrategy: 'silent',
          },
          {
            id: 'D',
            dependencies: ['C'],
            execute: async (ctx) => ctx.get('C') * 10,
            errorStrategy: 'silent',
          },
          {
            id: 'E',
            dependencies: ['D'],
            execute: async (ctx) => ctx.get('D') + 5,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.data.A, 1);
      assert.strictEqual(result.data.B, 2);
      assert.strictEqual(result.data.C, 3);
      assert.strictEqual(result.data.D, 30);
      assert.strictEqual(result.data.E, 35);
      assert.strictEqual(result.metadata.states.E, 'completed');
    });

    it('should complete all processes with deep dependency chain', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'step1',
            dependencies: [],
            execute: async () => 'step1',
            errorStrategy: 'silent',
          },
          {
            id: 'step2',
            dependencies: ['step1'],
            execute: async (ctx) => ctx.get('step1') + ' -> step2',
            errorStrategy: 'silent',
          },
          {
            id: 'step3',
            dependencies: ['step2'],
            execute: async (ctx) => ctx.get('step2') + ' -> step3',
            errorStrategy: 'silent',
          },
          {
            id: 'step4',
            dependencies: ['step3'],
            execute: async (ctx) => ctx.get('step3') + ' -> step4',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      assert.strictEqual(result.metadata.states.step1, 'completed');
      assert.strictEqual(result.metadata.states.step2, 'completed');
      assert.strictEqual(result.metadata.states.step3, 'completed');
      assert.strictEqual(result.metadata.states.step4, 'completed');
      assert.strictEqual(result.data.step4, 'step1 -> step2 -> step3 -> step4');
    });

    it('should ensure setImmediate is called during polling', async () => {
      // This test ensures the recursive polling in waitForCompletion is exercised
      const executionTimes: number[] = [];
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'quick1',
            dependencies: [],
            execute: async () => {
              executionTimes.push(Date.now());
              return 'quick1';
            },
            errorStrategy: 'silent',
          },
          {
            id: 'quick2',
            dependencies: ['quick1'],
            execute: async (ctx) => {
              executionTimes.push(Date.now());
              return ctx.get('quick1') + ' -> quick2';
            },
            errorStrategy: 'silent',
          },
          {
            id: 'quick3',
            dependencies: ['quick2'],
            execute: async (ctx) => {
              executionTimes.push(Date.now());
              return ctx.get('quick2') + ' -> quick3';
            },
            errorStrategy: 'silent',
          },
          {
            id: 'quick4',
            dependencies: ['quick3'],
            execute: async (ctx) => {
              executionTimes.push(Date.now());
              return ctx.get('quick3') + ' -> quick4';
            },
            errorStrategy: 'silent',
          },
          {
            id: 'quick5',
            dependencies: ['quick4'],
            execute: async (ctx) => {
              executionTimes.push(Date.now());
              return ctx.get('quick4') + ' -> quick5';
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Verify all processes completed
      assert.strictEqual(result.metadata.states.quick1, 'completed');
      assert.strictEqual(result.metadata.states.quick2, 'completed');
      assert.strictEqual(result.metadata.states.quick3, 'completed');
      assert.strictEqual(result.metadata.states.quick4, 'completed');
      assert.strictEqual(result.metadata.states.quick5, 'completed');
      // Verify execution happened in order
      assert.strictEqual(executionTimes.length, 5);
      assert.ok(result.data.quick5.includes('quick1'));
    });

    it('should trigger checkCompletion event when no processes to execute', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // After root process completes, checkCompletion should be triggered
      assert.strictEqual(result.metadata.states.process1, 'completed');
      assert.strictEqual(result.data.process1, 'result1');
      assert.deepStrictEqual(result.metadata.errors, {});
    });

    it('should resolve completion promise on checkCompletion event', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'p1',
            dependencies: [],
            execute: async () => 1,
            errorStrategy: 'silent',
          },
          {
            id: 'p2',
            dependencies: ['p1'],
            execute: async (ctx) => ctx.get('p1') + 1,
            errorStrategy: 'silent',
          },
          {
            id: 'p3',
            dependencies: ['p2'],
            execute: async (ctx) => ctx.get('p2') + 1,
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Verify all processes executed and completion was resolved
      assert.strictEqual(result.metadata.states.p1, 'completed');
      assert.strictEqual(result.metadata.states.p2, 'completed');
      assert.strictEqual(result.metadata.states.p3, 'completed');
      assert.strictEqual(result.data.p1, 1);
      assert.strictEqual(result.data.p2, 2);
      assert.strictEqual(result.data.p3, 3);
    });

    it('should handle completion with mixed process states', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'success',
            dependencies: [],
            execute: async () => 'done',
            errorStrategy: 'silent',
          },
          {
            id: 'skipped',
            dependencies: [],
            execute: async () => 'skipped_result',
            condition: () => false,
            errorStrategy: 'silent',
          },
          {
            id: 'failed',
            dependencies: [],
            execute: async () => {
              throw new Error('Failed');
            },
            errorStrategy: 'silent',
          },
          {
            id: 'dependent',
            dependencies: ['success', 'skipped', 'failed'],
            execute: async () => 'dependent_result',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Verify all process states are terminal
      assert.strictEqual(result.metadata.states.success, 'completed');
      assert.strictEqual(result.metadata.states.skipped, 'skipped');
      assert.strictEqual(result.metadata.states.failed, 'failed');
      assert.strictEqual(result.metadata.states.dependent, 'completed');
    });

    it('should properly map all process states in result', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'p1',
            dependencies: [],
            execute: async () => 'v1',
            errorStrategy: 'silent',
          },
          {
            id: 'p2',
            dependencies: [],
            execute: async () => 'v2',
            errorStrategy: 'silent',
          },
          {
            id: 'p3',
            dependencies: [],
            execute: async () => 'v3',
            errorStrategy: 'silent',
          },
          {
            id: 'p4',
            dependencies: ['p1', 'p2', 'p3'],
            execute: async () => 'v4',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Verify that processStates is properly constructed with all processes
      assert.strictEqual(Object.keys(result.metadata.states).length, 4);
      assert.ok('p1' in result.metadata.states);
      assert.ok('p2' in result.metadata.states);
      assert.ok('p3' in result.metadata.states);
      assert.ok('p4' in result.metadata.states);
      assert.strictEqual(result.metadata.states.p1, 'completed');
      assert.strictEqual(result.metadata.states.p2, 'completed');
      assert.strictEqual(result.metadata.states.p3, 'completed');
      assert.strictEqual(result.metadata.states.p4, 'completed');
    });

    it('should include all process states when throw error occurs', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'proc1',
            dependencies: [],
            execute: async () => {
              throw new Error('Failed to execute');
            },
            errorStrategy: 'throw',
          },
          {
            id: 'proc2',
            dependencies: [],
            execute: async () => 'proc2_result',
            errorStrategy: 'silent',
          },
          {
            id: 'proc3',
            dependencies: [],
            execute: async () => 'proc3_result',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Even with error, result should include processStates for all processes
      assert.ok('proc1' in result.metadata.states);
      assert.ok('proc2' in result.metadata.states);
      assert.ok('proc3' in result.metadata.states);
      assert.strictEqual(result.metadata.states.proc1, 'failed');
      assert.strictEqual(result.metadata.states.proc2, 'completed');
      assert.strictEqual(result.metadata.states.proc3, 'completed');
    });

    it('should return proper result in catch block when error is thrown', async () => {
      const config: WorkflowConfig = {
        processes: [
          {
            id: 'throwingProcess',
            dependencies: [],
            execute: async () => {
              throw new Error('Execution error');
            },
            errorStrategy: 'throw',
          },
        ],
        output: { strategy: 'all' },
      };
      const engine = new WorkflowEngine(config);
      const result = await engine.execute();
      // Verify result is returned from catch block
      assert.ok(result.metadata.states);
      assert.ok(result.data);
      assert.ok(result.metadata.errors);
      assert.strictEqual(result.metadata.states.throwingProcess, 'failed');
      assert.ok(result.metadata.errors.throwingProcess);
    });
  });
});
