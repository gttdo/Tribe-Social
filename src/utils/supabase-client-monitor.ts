/**
 * Supabase Client Monitor - Helps debug multiple client instance issues
 */

// Track client creation attempts
let clientCreationCount = 0;
const clientInstances = new Set();

export function incrementClientCreationCount() {
  clientCreationCount++;
  console.log(`🔍 Supabase client creation count: ${clientCreationCount}`);
  
  if (clientCreationCount > 1) {
    console.warn(`⚠️ Multiple Supabase client creation detected! Count: ${clientCreationCount}`);
    console.trace('Client creation stack trace:');
  }
}

export function registerClientInstance(client: any) {
  clientInstances.add(client);
  console.log(`📊 Total client instances: ${clientInstances.size}`);
  
  if (clientInstances.size > 1) {
    console.warn(`⚠️ Multiple Supabase client instances detected! Count: ${clientInstances.size}`);
  }
}

export function getClientStats() {
  return {
    creationCount: clientCreationCount,
    instanceCount: clientInstances.size,
    hasMultipleInstances: clientInstances.size > 1
  };
}

export function resetClientMonitor() {
  clientCreationCount = 0;
  clientInstances.clear();
  console.log('🔄 Client monitor reset');
}