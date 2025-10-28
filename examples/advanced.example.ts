/**
 * Advanced Examples for Async Workflow System
 */

import { executeWorkflow, WorkflowEngine, Process, Context } from '../src';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Example 1: Complex Dependency Graph
// ============================================================================

async function example1_ComplexGraph() {
  console.log('=== Example 1: Complex Dependency Graph ===\n');

  const processes: Process[] = [
    {
      id: 'A',
      dependencies: [],
      execute: async (context) => {
        console.log('  Process A');
        await delay(30);
        return { value: 1 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'B',
      dependencies: ['A'],
      execute: async (context) => {
        const a = context.get('A');
        console.log('  Process B (depends on A)');
        await delay(25);
        return { value: a.value * 2 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'C',
      dependencies: ['A'],
      execute: async (context) => {
        const a = context.get('A');
        console.log('  Process C (depends on A)');
        await delay(20);
        return { value: a.value * 3 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'D',
      dependencies: ['B', 'C'],
      execute: async (context) => {
        const b = context.get('B');
        const c = context.get('C');
        console.log('  Process D (depends on B and C)');
        await delay(30);
        return { value: b.value + c.value };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'E',
      dependencies: ['C'],
      execute: async (context) => {
        const c = context.get('C');
        console.log('  Process E (depends on C)');
        await delay(20);
        return { value: c.value * 10 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'F',
      dependencies: ['D', 'E'],
      execute: async (context) => {
        const d = context.get('D');
        const e = context.get('E');
        console.log('  Process F (final)');
        await delay(25);
        return {
          final: d.value + e.value,
          breakdown: { d: d.value, e: e.value },
        };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
    outputStrategy: 'single',
    targetProcessId: 'F',
  });

  console.log('\n✅ Result:', JSON.stringify(result.result, null, 2));
  console.log('\n');
}

// ============================================================================
// Example 2: Data Pipeline (ETL)
// ============================================================================

async function example2_DataPipeline() {
  console.log('=== Example 2: Data Pipeline (ETL) ===\n');

  const processes: Process[] = [
    {
      id: 'extract',
      dependencies: [],
      execute: async (context) => {
        console.log('  [ETL] Extracting data from source...');
        await delay(100);
        return {
          records: [
            { id: 1, value: 100, category: 'A' },
            { id: 2, value: 200, category: 'B' },
            { id: 3, value: 150, category: 'A' },
            { id: 4, value: 300, category: 'C' },
          ],
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'validate',
      dependencies: ['extract'],
      execute: async (context) => {
        console.log('  [ETL] Validating data...');
        const data = context.get('extract');
        await delay(50);
        
        const valid = data.records.every((r: any) => r.value > 0);
        return {
          isValid: valid,
          recordCount: data.records.length,
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'transform',
      dependencies: ['validate'],
      condition: (context) => context.get('validate').isValid,
      execute: async (context) => {
        console.log('  [ETL] Transforming data...');
        const data = context.get('extract');
        await delay(80);
        
        return {
          transformed: data.records.map((r: any) => ({
            ...r,
            doubleValue: r.value * 2,
            timestamp: new Date().toISOString(),
          })),
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'calculateStats',
      dependencies: ['transform'],
      execute: async (context) => {
        console.log('  [ETL] Calculating statistics...');
        const data = context.get('transform');
        await delay(40);
        
        const total = data.transformed.reduce((sum: number, r: any) => sum + r.doubleValue, 0);
        const byCategory: any = {};
        
        data.transformed.forEach((r: any) => {
          if (!byCategory[r.category]) {
            byCategory[r.category] = { count: 0, total: 0 };
          }
          byCategory[r.category].count++;
          byCategory[r.category].total += r.doubleValue;
        });
        
        return {
          total,
          average: total / data.transformed.length,
          count: data.transformed.length,
          byCategory,
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'load',
      dependencies: ['transform'],
      execute: async (context) => {
        console.log('  [ETL] Loading data to destination...');
        const data = context.get('transform');
        await delay(60);
        
        // Simulate loading to database
        return {
          loaded: true,
          recordsLoaded: data.transformed.length,
          timestamp: new Date().toISOString(),
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'generateReport',
      dependencies: ['calculateStats', 'load'],
      execute: async (context) => {
        console.log('  [ETL] Generating report...');
        const stats = context.get('calculateStats');
        const loadInfo = context.get('load');
        await delay(30);
        
        return {
          report: {
            summary: `Processed ${stats.count} records`,
            statistics: stats,
            loadStatus: loadInfo,
            completedAt: new Date().toISOString(),
          },
        };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
    outputStrategy: 'single',
    targetProcessId: 'generateReport',
  });

  console.log('\n✅ ETL Report:', JSON.stringify(result.result, null, 2));
  console.log('\n');
}

// ============================================================================
// Example 3: API Composition
// ============================================================================

async function example3_APIComposition() {
  console.log('=== Example 3: API Composition ===\n');

  const processes: Process[] = [
    {
      id: 'fetchUserProfile',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching user profile...');
        await delay(80);
        return {
          userId: 123,
          name: 'Jane Doe',
          email: 'jane@example.com',
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'fetchUserOrders',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching user orders...');
        await delay(100);
        return {
          orders: [
            { id: 1, total: 99.99, status: 'delivered' },
            { id: 2, total: 149.99, status: 'pending' },
          ],
        };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'fetchUserReviews',
      dependencies: [],
      execute: async (context) => {
        console.log('  Fetching user reviews...');
        await delay(70);
        return {
          reviews: [
            { productId: 1, rating: 5, comment: 'Great!' },
            { productId: 2, rating: 4, comment: 'Good' },
          ],
        };
      },
      errorStrategy: 'silent', // Optional data
    },
    {
      id: 'calculateTotalSpent',
      dependencies: ['fetchUserOrders'],
      execute: async (context) => {
        console.log('  Calculating total spent...');
        const orders = context.get('fetchUserOrders');
        await delay(20);
        
        const total = orders.orders.reduce((sum: number, o: any) => sum + o.total, 0);
        return { totalSpent: total };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'buildUserDashboard',
      dependencies: ['fetchUserProfile', 'fetchUserOrders', 'fetchUserReviews', 'calculateTotalSpent'],
      execute: async (context) => {
        console.log('  Building user dashboard...');
        const profile = context.get('fetchUserProfile');
        const orders = context.get('fetchUserOrders');
        const spending = context.get('calculateTotalSpent');
        
        // Reviews might have failed (silent error)
        const hasReviews = context.has('fetchUserReviews') && 
                          context.get('fetchUserReviews') !== undefined;
        
        await delay(30);
        
        return {
          dashboard: {
            user: profile,
            orderCount: orders.orders.length,
            totalSpent: spending.totalSpent,
            reviewCount: hasReviews ? context.get('fetchUserReviews').reviews.length : 0,
            hasReviews,
          },
        };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
    outputStrategy: 'single',
    targetProcessId: 'buildUserDashboard',
  });

  console.log('\n✅ Dashboard:', JSON.stringify(result.result, null, 2));
  console.log('\n');
}

// ============================================================================
// Example 4: Initial Context Usage
// ============================================================================

async function example4_InitialContext() {
  console.log('=== Example 4: Initial Context Usage ===\n');

  const processes: Process[] = [
    {
      id: 'validateConfig',
      dependencies: [],
      execute: async (context) => {
        const config = context.get('config');
        console.log(`  Validating config (env: ${config.environment})...`);
        await delay(30);
        return { valid: config.apiKey.length > 0 };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'initializeService',
      dependencies: ['validateConfig'],
      condition: (context) => context.get('validateConfig').valid,
      execute: async (context) => {
        const config = context.get('config');
        console.log(`  Initializing service with endpoint: ${config.endpoint}...`);
        await delay(50);
        return { initialized: true, endpoint: config.endpoint };
      },
      errorStrategy: 'throw',
    },
    {
      id: 'fetchData',
      dependencies: ['initializeService'],
      execute: async (context) => {
        const userId = context.get('userId');
        const service = context.get('initializeService');
        console.log(`  Fetching data for user ${userId}...`);
        await delay(60);
        return {
          userId,
          data: `Data from ${service.endpoint}`,
        };
      },
      errorStrategy: 'throw',
    },
  ];

  const result = await executeWorkflow({
    processes,
    outputStrategy: 'combined',
    initialContext: {
      config: {
        apiKey: 'secret-key-123',
        endpoint: 'https://api.example.com',
        environment: 'production',
      },
      userId: 789,
    },
  });

  console.log('\n✅ Result:', JSON.stringify(result.result.fetchData, null, 2));
  console.log('\n');
}

// ============================================================================
// Run All Examples
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('Advanced Examples');
  console.log('========================================\n');

  await example1_ComplexGraph();
  await example2_DataPipeline();
  await example3_APIComposition();
  await example4_InitialContext();

  console.log('========================================');
  console.log('Done!');
  console.log('========================================\n');
}

if (require.main === module) {
  main().catch(console.error);
}
