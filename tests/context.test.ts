import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Context, Logger } from '../src/context';

describe('Context', () => {
  it('should set and get values', () => {
    const context = new Context();
    context.set('test', 'value');
    assert.strictEqual(context.get('test'), 'value');
  });

  it('should check if key exists', () => {
    const context = new Context();
    context.set('test', 'value');
    assert.strictEqual(context.has('test'), true);
    assert.strictEqual(context.has('nonexistent'), false);
  });

  it('should throw error when getting non-existent key', () => {
    const context = new Context();
    assert.throws(
      () => context.get('nonexistent'),
      /Process "nonexistent" result not found in context/
    );
  });

  it('should get all data', () => {
    const context = new Context();
    context.set('key1', 'value1');
    context.set('key2', 'value2');
    const all = context.getAll();
    assert.deepStrictEqual(all, { key1: 'value1', key2: 'value2' });
  });

  it('should emit bind event when value is set', (t, done) => {
    const context = new Context();
    context.on('bind', (event) => {
      assert.strictEqual(event.processId, 'test');
      assert.strictEqual(event.status, 'completed');
      assert.strictEqual(event.result, 'value');
      done();
    });
    context.set('test', 'value', 'completed');
  });

  it('should log when process completes with logger', () => {
    const logs: string[] = [];
    const logger: Logger = {
      info: (msg: string) => logs.push(msg),
      debug: () => {},
    };
    const context = new Context();
    context.set('test', 'value', 'completed', logger);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0], 'Process "test" completed');
  });

  it('should not log when process is skipped', () => {
    const logs: string[] = [];
    const logger: Logger = {
      info: (msg: string) => logs.push(msg),
      debug: () => {},
    };
    const context = new Context();
    context.set('test', undefined, 'skipped', logger);
    assert.strictEqual(logs.length, 0);
  });

  it('should not log when process fails', () => {
    const logs: string[] = [];
    const logger: Logger = {
      info: (msg: string) => logs.push(msg),
      debug: () => {},
    };
    const context = new Context();
    context.set('test', undefined, 'failed', logger);
    assert.strictEqual(logs.length, 0);
  });

  it('should not log when logger is not provided', () => {
    const context = new Context();
    // Should not throw
    context.set('test', 'value', 'completed');
    assert.strictEqual(context.get('test'), 'value');
  });

  it('should handle different process statuses', () => {
    const context = new Context();
    context.set('pending', 'value', 'pending');
    context.set('running', 'value', 'running');
    context.set('completed', 'value', 'completed');
    context.set('skipped', 'value', 'skipped');
    context.set('failed', 'value', 'failed');

    assert.strictEqual(context.has('pending'), true);
    assert.strictEqual(context.has('running'), true);
    assert.strictEqual(context.has('completed'), true);
    assert.strictEqual(context.has('skipped'), true);
    assert.strictEqual(context.has('failed'), true);
  });
});
