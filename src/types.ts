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
 * Error handling strategy
 */
export type ErrorStrategy = 'silent' | 'throw';

/**
 * Output strategy for workflow results
 */
export type OutputStrategy = 'single' | 'multiple' | 'all';

/**
 * Output configuration
 */
export interface OutputConfig {
  /** Output strategy: 'single' returns specific process, 'multiple' returns specific processes, 'all' returns all results */
  strategy: OutputStrategy;

  /** Process ID (required for 'single' strategy) or array of process IDs (for 'multiple' strategy) */
  processId?: string | string[];
}

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

  /** Output configuration (optional, defaults to { strategy: 'all' }) */
  output?: OutputConfig;

  /** Initial context values */
  initialContext?: Record<string, any>;

  /** Logger instance (defaults to noop logger) */
  logger?: Logger;
}

/**
 * Internal process state
 */
export interface ProcessState {
  id: string;
  status: ProcessStatus;
  dependencies: string[];
  dependents: string[];
  error?: Error;
}

/**
 * Workflow execution result
 */
export interface WorkflowResult {

  /** Process results based on output strategy */
  result: Record<string, any>;

  /** Status of each process */
  states: Record<string, ProcessStatus>;

  /** Any errors that occurred */
  errors: Record<string, Error>;
}
