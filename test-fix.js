#!/usr/bin/env node

/**
 * Test the fix for getDocByPath
 */

import { OfflineDocsFetcher } from './dist/offline-docs-fetcher.js';

async function testFix() {
  console.log('Testing the fix for getDocByPath...\n');
  
  try {
    const fetcher = new OfflineDocsFetcher();
    
    // Test the problematic path
    const testPath = 'workflow/upgrading-expo-sdk-walkthrough';
    console.log(`Testing path: "${testPath}"`);
    
    const result = await fetcher.getDocByPath(testPath);
    console.log('✓ Success! Document retrieved.');
    console.log('Title:', result.content[0].text.split('\n')[0]);
    console.log('Content preview:', result.content[0].text.substring(0, 300) + '...');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  }
}

testFix().catch(console.error);