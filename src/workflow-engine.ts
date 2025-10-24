/**
 * Workflow Engine - orchestrates process execution
 */

import { Context, BindEvent } from './context';
import {
  Process,
  ProcessState,
  ProcessStatus,
  WorkflowConfig,
  WorkflowResult,
} from './types';

/**
 * Workflow Engine class
 */
export class WorkflowEngine {
  private processes: Map<string, Process>;
  private processStates: Map<string, ProcessState>;
  private context: Context;
  private config: WorkflowConfig;
  private errors: Map<string, Error>;
  
  private completedProcesses: string[] = [];
  private processesInProgress: string[] = [];

  constructor(config: WorkflowConfig) {
    this.config = config;
    this.processes = new Map();
    this.processStates = new Map();
    this.context = new Context();
    this.errors = new Map();

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
        !this.processesInProgress.includes(processId) &&
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
    if (this.config.outputStrategy === 'single' && !this.config.targetProcessId) {
      throw new Error('targetProcessId is required when outputStrategy is "single"');
    }

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

    if (this.config.targetProcessId && !this.processes.has(this.config.targetProcessId)) {
      throw new Error(`Target process "${this.config.targetProcessId}" does not exist`);
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
      console.error(`Error evaluating condition for process "${processId}":`, error);
      return false;
    }
  }

  /**
   * Execute a single process
   */
  private async executeProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId)!;
    const state = this.processStates.get(processId)!;

    this.processesInProgress.push(processId);

    // Check condition
    if (!this.shouldExecuteProcess(processId)) {
      state.status = 'skipped';
      console.log(`Process "${processId}" skipped due to condition`);
      
      // Set undefined in context to trigger bind event
      this.context.set(processId, undefined, 'skipped');
      return;
    }

    state.status = 'running';
    console.log(`Process "${processId}" started`);

    try {
      // Execute process with context
      const result = await process.execute(this.context);
      
      state.status = 'completed';
      console.log(`Process "${processId}" completed`);
      
      // Set result in context - this emits 'bind' event
      this.context.set(processId, result, 'completed');
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      state.status = 'failed';
      state.error = err;
      this.errors.set(processId, err);

      console.error(`Process "${processId}" failed:`, err.message);

      if (process.errorStrategy === 'throw') {
        throw new Error(
          `Process "${processId}" failed with "throw" error strategy: ${err.message}`
        );
      }
      
      // For silent errors, still set undefined to unblock dependents
      this.context.set(processId, undefined, 'failed');
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
    console.log('Starting workflow execution...\n');
    
    try {
      const rootProcesses = this.getRootProcesses();
      
      if (rootProcesses.length === 0) {
        throw new Error('No root processes found');
      }

      console.log(`Starting ${rootProcesses.length} root process(es): ${rootProcesses.join(', ')}\n`);

      // Execute all root processes - they will trigger dependents via bind events
      await Promise.all(
        rootProcesses.map(processId => this.executeProcess(processId))
      );

      // Wait for all processes to complete
      await this.waitForCompletion();

      let resultContext: Record<string, any>;
      
      if (this.config.outputStrategy === 'single') {
        const targetId = this.config.targetProcessId!;
        resultContext = { [targetId]: this.context.get(targetId) };
      } else {
        resultContext = this.context.getAll();
      }

      return {
        context: resultContext,
        processStates: Object.fromEntries(
          Array.from(this.processStates.entries()).map(([id, state]) => [id, state.status])
        ),
        errors: Object.fromEntries(this.errors),
      };
    } catch (error) {
      console.error('Workflow execution failed:', error);
      
      return {
        context: this.context.getAll(),
        processStates: Object.fromEntries(
          Array.from(this.processStates.entries()).map(([id, state]) => [id, state.status])
        ),
        errors: Object.fromEntries(this.errors),
      };
    }
  }

  /**
   * Wait for all processes to reach terminal state
   */
  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        const allProcessed = Array.from(this.processStates.values()).every(
          state => state.status === 'completed' || 
                   state.status === 'skipped' || 
                   state.status === 'failed'
        );
        
        if (allProcessed) {
          resolve();
        } else {
          setImmediate(checkCompletion);
        }
      };
      
      checkCompletion();
    });
  }
}
