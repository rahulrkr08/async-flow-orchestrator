/**
 * Context class that manages workflow data and emits events
 */

import { EventEmitter } from 'events';

/**
 * Process status
 */
export type ProcessStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

/**
 * Logger interface
 */
export interface Logger {
  info: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Bind event emitted when context.set() is called
 */
export interface BindEvent {
  processId: string;
  status: ProcessStatus;
  result: any;
}

/**
 * Context class - manages workflow state and emits 'bind' events
 */
export class Context extends EventEmitter {
  private data: Record<string, any> = {};

  /**
   * Set a value in context and emit 'bind' event
   *
   * @param processId - Process identifier
   * @param result - Process result
   * @param status - Process status
   * @param logger - Optional logger instance
   */
  set(processId: string, result: any, status: ProcessStatus = 'completed', logger?: Logger): void {
    this.data[processId] = result;

    // Log when process completes
    if (status === 'completed' && logger?.info) {
      logger.info(`Process "${processId}" completed`);
    }

    // Emit 'bind' event when value is set
    const event: BindEvent = { processId, status, result };
    this.emit('bind', event);
  }

  /**
   * Get a value from context
   * 
   * @param processId - Process identifier
   * @returns The stored value
   * @throws Error if process result not found
   */
  get<T = any>(processId: string): T {
    if (!(processId in this.data)) {
      throw new Error(
        `Process "${processId}" result not found in context. ` +
        `Available: ${Object.keys(this.data).join(', ')}`
      );
    }
    return this.data[processId] as T;
  }

  /**
   * Check if a key exists in context
   * 
   * @param processId - Process identifier
   * @returns True if the key exists
   */
  has(processId: string): boolean {
    return processId in this.data;
  }

  /**
   * Get all data from context
   * 
   * @returns Copy of all context data
   */
  getAll(): Record<string, any> {
    return { ...this.data };
  }
}
