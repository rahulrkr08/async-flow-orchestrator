# Benchmark Suite

Performance benchmarks for the async-flow-orchestrator library.

## Running Benchmarks

To run all benchmarks:

```bash
npm run benchmark
```

## Benchmark Categories

### 1. Sequential Workflow
**File:** `sequential.benchmark.ts`

Tests a linear chain of 10 dependent processes where each process depends on the previous one.

**Measures:**
- Sequential execution overhead
- Process chaining performance
- Context dependency resolution

### 2. Parallel Execution
**File:** `parallel.benchmark.ts`

Tests 10 processes running in parallel with no dependencies, followed by a single aggregator process.

**Measures:**
- Parallel execution efficiency
- Event-driven coordination
- Fan-in pattern performance

### 3. Complex Dependencies
**File:** `complex-dependency.benchmark.ts`

Tests a complex dependency graph with 20 processes across 4 levels, featuring both fan-out and fan-in patterns.

**Measures:**
- Complex graph traversal
- Multi-level dependency resolution
- Mixed parallel/sequential execution

### 4. Conditional Execution
**File:** `conditional.benchmark.ts`

Tests 15 processes with various conditions, where some processes execute and others are skipped based on runtime conditions.

**Measures:**
- Condition evaluation overhead
- Process skipping efficiency
- Branch execution performance

### 5. Error Handling
**File:** `error-handling.benchmark.ts`

Tests error handling with the 'silent' strategy where some processes fail but the workflow continues.

**Measures:**
- Error handling overhead
- Silent error strategy performance
- Fallback pattern efficiency

### 6. Context Operations
**File:** `context-operations.benchmark.ts`

Tests raw context operations: set, get, has, and getAll.

**Measures:**
- Context manipulation overhead
- Data storage/retrieval performance
- Memory efficiency

## Understanding Results

Each benchmark reports:

- **Total Time**: Total execution time for all iterations
- **Iterations**: Number of times the benchmark ran
- **Average Time**: Mean execution time per iteration
- **Min Time**: Fastest iteration
- **Max Time**: Slowest iteration
- **Ops/sec**: Operations per second (higher is better)

## Performance Tips

Based on these benchmarks, consider:

1. **Use Parallel Execution**: Processes with no dependencies run in parallel automatically
2. **Minimize Dependencies**: Only declare necessary dependencies
3. **Lightweight Conditions**: Keep condition functions simple and fast
4. **Error Strategy**: Use 'silent' for non-critical processes to avoid workflow interruption
5. **Context Access**: Context operations are fast; don't over-optimize

## Customizing Benchmarks

You can modify the iteration counts in `index.ts`:

```typescript
results.push(await runBenchmark(
  'Your Benchmark Name',
  yourBenchmarkFunction,
  1000  // Change iteration count here
));
```

## System Requirements

Benchmarks require:
- Node.js >= 20.0.0
- ts-node (included in devDependencies)

## Interpreting Results

Performance will vary based on:
- CPU speed and cores
- Available memory
- System load
- Node.js version

Run benchmarks multiple times and compare trends rather than absolute numbers.
