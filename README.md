# async-flow-orchestrator

> Event-driven asynchronous workflow orchestration system

An event-driven workflow system that executes asynchronous processes based on their dependencies, conditions, and error handling strategies. Perfect for building data pipelines, API compositions, and complex async workflows.

## Installation

```bash
npm install async-flow-orchestrator
```

## Quick Start

```typescript
import { executeWorkflow, Process } from 'async-flow-orchestrator';

const processes: Process[] = [
  {
    id: 'fetchUser',
    dependencies: [],
    execute: async (context) => {
      return { userId: 123, name: 'John Doe' };
    },
    errorStrategy: 'throw',
  },
  {
    id: 'processUser',
    dependencies: ['fetchUser'],
    execute: async (context) => {
      // Access previous results using context.get()
      const user = context.get('fetchUser');
      return { message: `Processed ${user.name}` };
    },
    errorStrategy: 'throw',
  },
];

const result = await executeWorkflow({
  processes,
  output: { strategy: 'all' },  // optional, defaults to 'all'
});

console.log(result.result);
// { fetchUser: { userId: 123, name: 'John Doe' }, processUser: { message: 'Processed John Doe' } }
```

## Core Concepts

### Process Definition

```typescript
interface Process {
  id: string;                     // Unique identifier
  dependencies: string[];         // IDs of processes this depends on
  execute: ProcessFunction;       // Async function (receives context)
  condition?: ConditionFunction;  // Optional condition
  errorStrategy: ErrorStrategy;   // 'silent' or 'throw'
}
```

### Event-Driven Execution

```
Process A completes
  → context.set('A', result) called
  → 'bind' event emitted
  → Workflow engine checks dependent processes
  → Processes B and C (both depend on A) start immediately
```

## API Reference

### `executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult>`

Execute a workflow with the given configuration.

```typescript
interface OutputConfig {
  strategy: 'single' | 'multiple' | 'all';  // Defaults to 'all'
  processId?: string | string[];             // Required for 'single'/'multiple'
}

interface WorkflowConfig {
  processes: Process[];
  output?: OutputConfig;                    // Optional, defaults to { strategy: 'all' }
  initialContext?: Record<string, any>;
  logger?: Logger;                          // Optional custom logger
}

interface WorkflowResult {
  result: Record<string, any>;
  states: Record<string, ProcessStatus>;
  errors: Record<string, Error>;
}
```

### `WorkflowEngine`

Direct engine access for advanced usage:

```typescript
import { WorkflowEngine } from 'async-flow-orchestrator';

const engine = new WorkflowEngine(config);
const context = engine.getContext();

// Listen to events
context.on('bind', (event: BindEvent) => {
  // Handle bind event
});

const result = await engine.execute();
```

### Process Status

- `pending`: Not yet executed
- `running`: Currently executing
- `completed`: Successfully completed
- `skipped`: Skipped due to condition
- `failed`: Failed with an error

## Examples

### Sequential Flow

```typescript
const processes: Process[] = [
  {
    id: 'step1',
    dependencies: [],
    execute: async (context) => ({ value: 10 }),
    errorStrategy: 'throw',
  },
  {
    id: 'step2',
    dependencies: ['step1'],
    execute: async (context) => {
      const step1 = context.get('step1');
      return { value: step1.value * 2 };
    },
    errorStrategy: 'throw',
  },
];
```

### Parallel Execution

```typescript
const processes: Process[] = [
  {
    id: 'fetchUsers',
    dependencies: [],  // Starts immediately
    execute: async (context) => await api.getUsers(),
    errorStrategy: 'throw',
  },
  {
    id: 'fetchProducts',
    dependencies: [],  // Runs in parallel with fetchUsers
    execute: async (context) => await api.getProducts(),
    errorStrategy: 'throw',
  },
  {
    id: 'combineData',
    dependencies: ['fetchUsers', 'fetchProducts'],  // Runs after both complete
    execute: async (context) => {
      return {
        users: context.get('fetchUsers'),
        products: context.get('fetchProducts'),
      };
    },
    errorStrategy: 'throw',
  },
];
```

### Conditional Execution

```typescript
{
  id: 'adminTask',
  dependencies: ['checkAuth'],
  condition: (context) => {
    const auth = context.get('checkAuth');
    return auth.isAdmin;  // Only run if user is admin
  },
  execute: async (context) => {
    return { message: 'Admin task completed' };
  },
  errorStrategy: 'throw',
}
```

### Error Handling

```typescript
const processes: Process[] = [
  {
    id: 'tryPrimary',
    dependencies: [],
    execute: async (context) => {
      throw new Error('Primary failed');
    },
    errorStrategy: 'silent',  // Continue despite error
  },
  {
    id: 'useFallback',
    dependencies: ['tryPrimary'],
    execute: async (context) => {
      // Check if primary succeeded
      const hasPrimary = context.has('tryPrimary') && 
                        context.get('tryPrimary') !== undefined;
      
      if (!hasPrimary) {
        return await fallbackService.getData();
      }
      return context.get('tryPrimary');
    },
    errorStrategy: 'throw',
  },
];
```

### Event Listening

```typescript
const engine = new WorkflowEngine({
  processes,
  output: { strategy: 'all' }  // optional
});
const context = engine.getContext();

context.on('bind', (event: BindEvent) => {
  console.log(`✓ ${event.processId} completed`);
  console.log(`  Status: ${event.status}`);
  console.log(`  Result:`, event.result);
});

await engine.execute();
```

### Initial Context

```typescript
const result = await executeWorkflow({
  processes,
  output: { strategy: 'all' },  // optional
  initialContext: {
    config: {
      apiKey: 'abc123',
      endpoint: 'https://api.example.com',
    },
    userId: 789,
  },
});
```

## Advanced Usage

### Data Pipeline (ETL)

```typescript
const processes: Process[] = [
  {
    id: 'extract',
    dependencies: [],
    execute: async (context) => {
      return { records: await source.extract() };
    },
    errorStrategy: 'throw',
  },
  {
    id: 'validate',
    dependencies: ['extract'],
    execute: async (context) => {
      const data = context.get('extract');
      return { isValid: validate(data.records) };
    },
    errorStrategy: 'throw',
  },
  {
    id: 'transform',
    dependencies: ['validate'],
    condition: (context) => context.get('validate').isValid,
    execute: async (context) => {
      const data = context.get('extract');
      return { transformed: transform(data.records) };
    },
    errorStrategy: 'throw',
  },
  {
    id: 'load',
    dependencies: ['transform'],
    execute: async (context) => {
      const data = context.get('transform');
      await destination.load(data.transformed);
      return { loaded: true };
    },
    errorStrategy: 'throw',
  },
];
```

## Configuration Options

### Output Strategies

**All** (Default): Returns all process results
```typescript
{ output: { strategy: 'all' } }
// or omit output entirely as 'all' is the default
// Returns: { process1: {...}, process2: {...}, ... }
```

**Single**: Returns only specified process result
```typescript
{ output: { strategy: 'single', processId: 'finalProcess' } }
// Returns: { finalProcess: {...} }
```

**Multiple**: Returns specified process results
```typescript
{ output: { strategy: 'multiple', processId: ['process1', 'process3'] } }
// Returns: { process1: {...}, process3: {...} }
```

### Error Strategies

**Silent**: Log error and continue workflow
```typescript
{ errorStrategy: 'silent' }
```

**Throw**: Stop workflow immediately on error
```typescript
{ errorStrategy: 'throw' }
```

## Validation

The system automatically validates:

- ✓ No duplicate process IDs
- ✓ All dependencies exist
- ✓ No circular dependencies (using DFS algorithm)
- ✓ Target process(es) exist (for single/multiple output strategies)
- ✓ Output configuration is valid

## Use Cases

- **Data Pipelines**: ETL workflows with complex dependencies
- **API Composition**: Combine multiple API calls efficiently
- **Microservice Orchestration**: Coordinate service calls with dependencies
- **Background Jobs**: Task processing with dependencies and error handling
- **Business Workflows**: Multi-step processes with conditions

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import { 
  executeWorkflow, 
  WorkflowEngine,
  Process,
  WorkflowConfig,
  WorkflowResult,
  Context,
  BindEvent 
} from 'async-flow-orchestrator';
```

## License

MIT
