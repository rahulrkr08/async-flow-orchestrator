/**
 * Type definitions for the workflow system
 */

import { Context } from './context';

/**
 * Logger interface
 */
export interface Logger {
  info: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Workflow error - base class for all workflow-related errors
 */
export class WorkflowError extends Error {
  readonly code: string;

  constructor(message: string, code: string = 'WORKFLOW_ERROR') {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    Object.setPrototypeOf(this, WorkflowError.prototype);
  }
}

/**
 * Process execution error - thrown when a process fails
 */
export class ProcessError extends WorkflowError {
  readonly processId: string;
  readonly originalError: Error;
  readonly strategy: ErrorStrategy;

  constructor(processId: string, originalError: Error, strategy: ErrorStrategy) {
    super(
      `Process "${processId}" failed: ${originalError.message}`,
      'PROCESS_ERROR'
    );
    this.name = 'ProcessError';
    this.processId = processId;
    this.originalError = originalError;
    this.strategy = strategy;
    this.cause = originalError;
    Object.setPrototypeOf(this, ProcessError.prototype);
  }
}

/**
 * Error handling strategy
 */
export type ErrorStrategy = 'silent' | 'throw';

/**
 * Process status
 */
export type ProcessStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

/**
 * Process function that executes the work
 */
export type ProcessFunction<T = any> = (context: Context) => Promise<T>;

/**
 * Condition function to determine if process should run
 */
export type ConditionFunction = (context: Context) => boolean;

/**
 * Process definition
 */
export interface Process {
  /** Unique process identifier */
  id: string;
  
  /** Array of process IDs this process depends on */
  dependencies: string[];
  
  /** Async function to execute */
  execute: ProcessFunction;
  
  /** Optional condition to determine if process should run */
  condition?: ConditionFunction;
  
  /** Error handling strategy: 'silent' continues workflow, 'throw' stops it */
  errorStrategy: ErrorStrategy;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig {
  /** Array of process definitions */
  processes: Process[];

  /** Initial context values */
  initialContext?: Record<string, any>;

  /** Logger instance (defaults to noop logger) */
  logger?: Logger;

  /** Maximum number of concurrent processes (defaults to 10) */
  concurrency?: number;
}

/**
 * Internal process state
 */
export interface ProcessState {
  id: string;
  status: ProcessStatus;
  dependencies: string[];
  dependents: string[];
  error?: ProcessError | Error;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {
  /** All process results */
  data: Record<string, any>;

  /** Metadata about workflow execution */
  metadata: {
    /** Status of each process */
    states: Record<string, ProcessStatus>;

    /** Any errors that occurred */
    errors: Record<string, Error>;
  };
}
