/**
 * Async Workflow System
 * 
 * Event-driven asynchronous workflow orchestration system
 */

export { Context, BindEvent, ProcessStatus } from './context';
export {
  ErrorStrategy,
  ProcessFunction,
  ConditionFunction,
  Process,
  WorkflowConfig,
  ProcessState,
  WorkflowResult,
  Logger,
  WorkflowError,
  ProcessError,
} from './types';
export { WorkflowEngine } from './workflow-engine';

import { WorkflowEngine } from './workflow-engine';
import { WorkflowConfig, WorkflowResult } from './types';

/**
 * Execute a workflow with the given configuration
 *
 * @param config - Workflow configuration
 * @returns Workflow execution result containing all process results
 *
 * @example
 * ```typescript
 * const result = await executeWorkflow({
 *   processes: [
 *     {
 *       id: 'fetchData',
 *       dependencies: [],
 *       execute: async (context) => ({ data: 'Hello' }),
 *       errorStrategy: 'throw',
 *     },
 *   ],
 * });
 * ```
 */
export async function executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
  const engine = new WorkflowEngine(config);
  return engine.execute();
}
