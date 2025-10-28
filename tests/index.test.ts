import { describe, it } from 'node:test';
import assert from 'node:assert';
import { executeWorkflow, WorkflowEngine, Context, Logger } from '../src/index';

describe('Index Exports', () => {
  it('should export executeWorkflow function', () => {
    assert.strictEqual(typeof executeWorkflow, 'function');
  });

  it('should export WorkflowEngine class', () => {
    assert.strictEqual(typeof WorkflowEngine, 'function');
  });

  it('should export Context class', () => {
    assert.strictEqual(typeof Context, 'function');
  });

  describe('executeWorkflow', () => {
    it('should execute a simple workflow', async () => {
      const result = await executeWorkflow({
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => 'result1',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      });
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.metadata.states.process1, 'completed');
    });

    it('should execute workflow with default output strategy (all)', async () => {
      const result = await executeWorkflow({
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
        // output not specified, should default to 'all'
      });
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(result.data.process2, 'result2');
      assert.deepStrictEqual(Object.keys(result.data).sort(), ['process1', 'process2']);
    });

    it('should execute workflow with logger', async () => {
      const logs: string[] = [];
      const logger: Logger = {
        info: (msg: string) => logs.push(msg),
        debug: () => {},
      };
      const result = await executeWorkflow({
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
      });
      assert.strictEqual(result.data.process1, 'result1');
      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0], 'Process "process1" completed');
    });

    it('should execute workflow with dependencies', async () => {
      const result = await executeWorkflow({
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
      });
      assert.strictEqual(result.data.process1, 10);
      assert.strictEqual(result.data.process2, 20);
    });

    it('should execute workflow with initial context', async () => {
      const result = await executeWorkflow({
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async (ctx) => ctx.get('initial') + ' processed',
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
        initialContext: { initial: 'value' },
      });
      assert.strictEqual(result.data.process1, 'value processed');
    });

    it('should execute workflow with single output strategy', async () => {
      const result = await executeWorkflow({
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
      });
      assert.deepStrictEqual(Object.keys(result.data), ['process2']);
      assert.strictEqual(result.data.process2, 'result2');
    });

    it('should execute workflow with multiple output strategy', async () => {
      const result = await executeWorkflow({
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
      });
      assert.deepStrictEqual(Object.keys(result.data).sort(), ['A', 'C']);
      assert.strictEqual(result.data.A, 'resultA');
      assert.strictEqual(result.data.C, 'resultC');
    });

    it('should handle errors in executeWorkflow', async () => {
      const result = await executeWorkflow({
        processes: [
          {
            id: 'process1',
            dependencies: [],
            execute: async () => {
              throw new Error('Test error');
            },
            errorStrategy: 'silent',
          },
        ],
        output: { strategy: 'all' },
      });
      assert.strictEqual(result.metadata.states.process1, 'failed');
      assert.ok(result.metadata.errors.process1);
      assert.strictEqual(result.metadata.errors.process1.message, 'Test error');
    });
  });
});
