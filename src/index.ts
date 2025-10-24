/**
 * Async Workflow System
 * 
 * Event-driven asynchronous workflow orchestration system
 */

export { Context, BindEvent, ProcessStatus } from './context';
export {
  ErrorStrategy,
  OutputStrategy,
  ProcessFunction,
  ConditionFunction,
  Process,
  WorkflowConfig,
  ProcessState,
  WorkflowResult,
  Logger,
} from './types';
export { WorkflowEngine } from './workflow-engine';

import { WorkflowEngine } from './workflow-engine';
import { WorkflowConfig, WorkflowResult } from './types';

/**
 * Execute a workflow with the given configuration
 * 
 * @param config - Workflow configuration
 * @returns Workflow execution result
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
 *   outputStrategy: 'combined',
 * });
 * ```
 */
export async function executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
  const engine = new WorkflowEngine(config);
  return engine.execute();
}
