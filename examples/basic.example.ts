/**
 * Basic Examples for Async Workflow System
 */

import { executeWorkflow, WorkflowEngine, Process, Context, BindEvent } from '../src';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example 1: Simple Sequential Flow
async function example1_SimpleFlow() {
  console.log('=== Example 1: Simple Sequential Flow ===\n');

  const processes: Process[] = [
    {
      id: 'fetchUser',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching user...');
        await delay(100);
        return { userId: 123, name: 'John Doe', role: 'admin' };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'processUser',
      dependencies: ['fetchUser'],
      execute: async (context) => {
        const user = context.get('fetchUser');
        console.log(`  Processing user: ${user.name}`);
        await delay(50);
        return { message: `Processed ${user.name}`, userId: user.userId };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
  });

  console.log('\n✅ Result:', JSON.stringify(result, null, 2));
  console.log('\n');
}

// Example 2: Parallel Execution
async function example2_ParallelFlow() {
  console.log('=== Example 2: Parallel Execution ===\n');

  const processes: Process[] = [
    {
      id: 'fetchUsers',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching users...');
        await delay(100);
        return [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      },
      errorStrategy: 'throw',
    },
    {
      id: 'fetchProducts',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching products...');
        await delay(80);
        return [{ id: 1, name: 'Product A' }, { id: 2, name: 'Product B' }];
      },
      errorStrategy: 'throw',
    },
    {
      id: 'mergeData',
      dependencies: ['fetchUsers', 'fetchProducts'],
      execute: async (context) => {
        console.log('  Merging data...');
        const users = context.get('fetchUsers');
        const products = context.get('fetchProducts');
        await delay(30);
        return {
          totalUsers: users.length,
          totalProducts: products.length,
        };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
  });

  console.log('\n✅ Result:', JSON.stringify(result.data, null, 2));
  console.log('\n');
}

// Example 3: Conditional Execution
async function example3_ConditionalFlow() {
  console.log('=== Example 3: Conditional Execution ===\n');

  const processes: Process[] = [
    {
      id: 'checkAuth',
      dependencies: [],
      execute: async (context) => {
        console.log('  Checking authentication...');
        await delay(50);
        return { isAuthenticated: true, isAdmin: false };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'adminTask',
      dependencies: ['checkAuth'],
      condition: (context) => {
        const auth = context.get('checkAuth');
        console.log(`  Condition: isAdmin=${auth.isAdmin}`);
        return auth.isAdmin;
      },
      execute: async (context) => {
        console.log('  Executing admin task...');
        await delay(30);
        return { message: 'Admin task completed' };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'userTask',
      dependencies: ['checkAuth'],
      condition: (context) => {
        const auth = context.get('checkAuth');
        console.log(`  Condition: isAuthenticated=${auth.isAuthenticated}`);
        return auth.isAuthenticated;
      },
      execute: async (context) => {
        console.log('  Executing user task...');
        await delay(30);
        return { message: 'User task completed' };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
  });

  console.log('\n✅ Result:', JSON.stringify(result.data, null, 2));
  console.log('📊 States:', result.metadata.states);
  console.log('\n');
}

// Example 4: Error Handling
async function example4_ErrorHandling() {
  console.log('=== Example 4: Error Handling ===\n');

  const processes: Process[] = [
    {
      id: 'step1',
      dependencies: [],
      execute: async (context) => {
        console.log('  Step 1: Success');
        await delay(50);
        return { data: 'Step 1 complete' };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'step2',
      dependencies: ['step1'],
      execute: async (context) => {
        console.log('  Step 2: Will fail');
        await delay(30);
        throw new Error('Step 2 failed');
      },
      errorStrategy: 'silent',
    },
    {
      id: 'step3',
      dependencies: ['step2'],
      execute: async (context) => {
        console.log('  Step 3: Executing despite step2 failure');
        await delay(20);
        return { message: 'Completed' };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
  });

  console.log('\n✅ Result:', JSON.stringify(result.data.step3, null, 2));
  console.log('📊 States:', result.metadata.states);
  console.log('❌ Errors:', Object.keys(result.metadata.errors));
  console.log('\n');
}

// Example 5: Event Listening
async function example5_EventListening() {
  console.log('=== Example 5: Event Listening ===\n');

  const processes: Process[] = [
    {
      id: 'step1',
      dependencies: [],
      execute: async (context) => {
        await delay(50);
        return { value: 10 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'step2',
      dependencies: ['step1'],
      execute: async (context) => {
        const step1 = context.get('step1');
        await delay(40);
        return { value: step1.value * 2 };
      },
      errorStrategy: 'throw',
    },
  ];

  const engine = new WorkflowEngine({
    processes,
  });

  const context = engine.getContext();

  // Listen to bind events
  context.on('bind', (event: BindEvent) => {
    console.log(`  🔗 BIND: "${event.processId}" (status: ${event.status})`);
    console.log(`     Result:`, JSON.stringify(event.result));
  });

  const result = await engine.execute();

  console.log('\n✅ Final:', JSON.stringify(result.data, null, 2));
  console.log('\n');
}

// Run All Examples
async function main() {
  console.log('========================================');
  console.log('Basic Examples');
  console.log('========================================\n');

  await example1_SimpleFlow();
  // await example2_ParallelFlow();
  // await example3_ConditionalFlow();
  // await example4_ErrorHandling();
  // await example5_EventListening();

  console.log('========================================');
  console.log('Done!');
  console.log('========================================\n');
}

if (require.main === module) {
  main().catch(console.error);
}
