/**
 * Workflow Engine - orchestrates process execution
 */

import { EventEmitter } from 'events';
import { Context, BindEvent } from './context';
import {
  Process,
  ProcessState,
  WorkflowConfig,
  WorkflowResult,
  Logger,
  ProcessError,
} from './types';

/**
 * Workflow Engine class
 */
export class WorkflowEngine extends EventEmitter {
  private processes: Map<string, Process>;
  private processStates: Map<string, ProcessState>;
  private context: Context;
  private config: WorkflowConfig;
  private errors: Map<string, Error>;
  private logger: Logger;

  private completedProcesses: string[] = [];
  private processesInProgress: Set<string> = new Set();
  private completionResolver: (() => void) | null = null;

  constructor(config: WorkflowConfig) {
    super();
    this.config = config;
    this.processes = new Map();
    this.processStates = new Map();
    this.context = new Context();
    this.errors = new Map();
    this.logger = config.logger || { info: () => {}, debug: () => {} };

    // Set initial context values
    if (config.initialContext) {
      for (const [key, value] of Object.entries(config.initialContext)) {
        this.context.set(key, value, 'completed');
      }
    }

    this.validateAndInitialize();
    this.setupBindListener();
  }

  /**
   * Get the context instance
   */
  getContext(): Context {
    return this.context;
  }

  /**
   * Setup listener for 'bind' events to trigger dependent processes
   */
  private setupBindListener(): void {
    this.context.on('bind', async (event: BindEvent) => {
      const { processId } = event;

      // Only track if it's a process completion (not initial context)
      if (this.processes.has(processId)) {
        this.completedProcesses.push(processId);
      }

      // Find processes that can now execute
      const processesToExecute = this.findReadyProcesses();

      if (processesToExecute.length > 0) {
        // Execute all ready processes in parallel
        await Promise.all(
          processesToExecute.map(id => this.executeProcess(id))
        );
      } else {
        // No processes to execute, check if workflow is complete
        this.context.emit('checkCompletion');
      }
    });

    // Listen for checkCompletion event to resolve when all processes are done
    this.context.on('checkCompletion', () => {
      const allProcessed = Array.from(this.processStates.values()).every(
        state => state.status === 'completed' ||
                 state.status === 'skipped' ||
                 state.status === 'failed'
      );

      if (allProcessed && this.completionResolver) {
        this.completionResolver();
        this.completionResolver = null;
      }
    });
  }

  /**
   * Find processes that are ready to execute
   */
  private findReadyProcesses(): string[] {
    const ready: string[] = [];

    for (const [processId, state] of this.processStates) {

      if (
        state.status === 'pending' &&
        !this.processesInProgress.has(processId) &&
        this.areDependenciesSatisfied(processId)
      ) {
        ready.push(processId);
      }
    }

    return ready;
  }

  /**
   * Validates configuration and initializes process states
   */
  private validateAndInitialize(): void {
    for (const process of this.config.processes) {
      if (this.processes.has(process.id)) {
        throw new Error(`Duplicate process ID: ${process.id}`);
      }
      this.processes.set(process.id, process);
    }

    for (const process of this.config.processes) {
      for (const depId of process.dependencies) {
        if (!this.processes.has(depId)) {
          throw new Error(
            `Process "${process.id}" depends on non-existent process "${depId}"`
          );
        }
      }
    }

    this.detectCircularDependencies();

    for (const process of this.config.processes) {
      this.processStates.set(process.id, {
        id: process.id,
        status: 'pending',
        dependencies: [...process.dependencies],
        dependents: [],
      });
    }

    for (const process of this.config.processes) {
      for (const depId of process.dependencies) {
        const depState = this.processStates.get(depId)!;
        depState.dependents.push(process.id);
      }
    }
  }

  /**
   * Detects circular dependencies using DFS
   */
  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (processId: string): boolean => {
      visited.add(processId);
      recursionStack.add(processId);

      const process = this.processes.get(processId)!;
      for (const depId of process.dependencies) {
        if (!visited.has(depId)) {
          if (hasCycle(depId)) return true;
        } else if (recursionStack.has(depId)) {
          return true;
        }
      }

      recursionStack.delete(processId);
      return false;
    };

    for (const processId of this.processes.keys()) {
      if (!visited.has(processId)) {
        if (hasCycle(processId)) {
          throw new Error(`Circular dependency detected involving process "${processId}"`);
        }
      }
    }
  }

  /**
   * Check if all dependencies are satisfied
   */
  private areDependenciesSatisfied(processId: string): boolean {
    const state = this.processStates.get(processId)!;
    
    for (const depId of state.dependencies) {
      const depState = this.processStates.get(depId)!;
      if (depState.status !== 'completed' && depState.status !== 'skipped' && depState.status !== 'failed') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Evaluate condition for a process
   */
  private shouldExecuteProcess(processId: string): boolean {
    const process = this.processes.get(processId)!;

    if (!process.condition) {
      return true;
    }

    try {
      return process.condition(this.context);
    } catch (error) {
      return false;
    }
  }

  /**
   * Normalize unknown error to Error instance
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error('Unknown error occurred');
    }
  }

  /**
   * Execute a single process
   */
  private async executeProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId)!;
    const state = this.processStates.get(processId)!;

    this.processesInProgress.add(processId);

    try {
      // Check condition
      if (!this.shouldExecuteProcess(processId)) {
        state.status = 'skipped';

        // Set undefined in context to trigger bind event
        this.context.set(processId, undefined, 'skipped', this.logger);
        return;
      }

      state.status = 'running';

      // Execute process with context
      const result = await process.execute(this.context);

      state.status = 'completed';

      // Set result in context - this emits 'bind' event
      this.context.set(processId, result, 'completed', this.logger);

    } catch (error) {
      const err = this.normalizeError(error);
      state.status = 'failed';
      state.error = err;
      this.errors.set(processId, err);

      // Emit error event for external listeners
      this.emit('processError', {
        processId,
        error: err,
        strategy: process.errorStrategy,
      });

      if (process.errorStrategy === 'throw') {
        throw new ProcessError(processId, err, 'throw');
      }

      // For silent errors, still set undefined to unblock dependents
      this.context.set(processId, undefined, 'failed', this.logger);
    } finally {
      this.processesInProgress.delete(processId);
    }
  }

  /**
   * Find root processes (no dependencies)
   */
  private getRootProcesses(): string[] {
    const roots: string[] = [];
    
    for (const [id, process] of this.processes) {
      if (process.dependencies.length === 0) {
        roots.push(id);
      }
    }
    
    return roots;
  }

  /**
   * Execute the workflow
   */
  async execute(): Promise<WorkflowResult> {
    try {
      const rootProcesses = this.getRootProcesses();

      if (rootProcesses.length === 0) {
        throw new Error('No root processes found');
      }

      // Create a promise that resolves when all processes complete
      const completionPromise = new Promise<void>((resolve) => {
        this.completionResolver = resolve;
      });

      // Execute all root processes - they will trigger dependents via bind events
      await Promise.all(
        rootProcesses.map(processId => this.executeProcess(processId))
      );

      // Check if there are no ready processes after root execution
      const processesToExecute = this.findReadyProcesses();
      if (processesToExecute.length === 0) {
        // Manually trigger checkCompletion if no processes are ready
        this.context.emit('checkCompletion');
      }

      // Wait for all processes to complete
      await completionPromise;

      // Return all process results
      return this.buildResult(this.context.getAll());
    } catch (error) {
      /* c8 ignore next 2 */
      return this.buildResult(this.context.getAll());
    }
  }

  /**
   * Build the result object with data and metadata
   */
  private buildResult(resultContext: Record<string, any>): WorkflowResult {
    return {
      data: resultContext,
      metadata: {
        states: Object.fromEntries(
          Array.from(this.processStates.entries()).map(([id, state]) => [id, state.status])
        ),
        errors: Object.fromEntries(this.errors),
      },
    };
  }
}
