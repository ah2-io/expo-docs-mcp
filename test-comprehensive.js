#!/usr/bin/env node

/**
 * Comprehensive test of the MCP server functionality
 */

import { OfflineDocsFetcher } from './dist/offline-docs-fetcher.js';

async function testComprehensive() {
  console.log('Running comprehensive tests...\n');
  
  const fetcher = new OfflineDocsFetcher();
  let testsRun = 0;
  let testsPassed = 0;
  
  // Helper function to run a test
  async function runTest(testName, testFunction) {
    testsRun++;
    console.log(`Test ${testsRun}: ${testName}`);
    try {
      await testFunction();
      testsPassed++;
      console.log('✓ PASSED\n');
    } catch (error) {
      console.log(`✗ FAILED: ${error.message}\n`);
    }
  }
  
  // Test 1: Get document by path (the main issue)
  await runTest('getDocByPath with "workflow/upgrading-expo-sdk-walkthrough"', async () => {
    const result = await fetcher.getDocByPath('workflow/upgrading-expo-sdk-walkthrough');
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Upgrade Expo SDK')) {
      throw new Error('Document content not as expected');
    }
  });
  
  // Test 2: Get document by URL path
  await runTest('getDocByPath with URL-extracted path', async () => {
    const urlPath = 'https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough'.replace('https://docs.expo.dev/', '').replace(/^\/+/, '');
    const result = await fetcher.getDocByPath(urlPath);
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Upgrade Expo SDK')) {
      throw new Error('Document content not as expected');
    }
  });
  
  // Test 3: Get document by filename only
  await runTest('getDocByPath with filename only', async () => {
    const result = await fetcher.getDocByPath('upgrading-expo-sdk-walkthrough');
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Upgrade Expo SDK')) {
      throw new Error('Document content not as expected');
    }
  });
  
  // Test 4: Search functionality
  await runTest('searchDocs for "upgrading"', async () => {
    const result = await fetcher.searchDocs('upgrading');
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Search Results')) {
      throw new Error('Search results not as expected');
    }
  });
  
  // Test 5: List sections
  await runTest('listSections', async () => {
    const result = await fetcher.listSections();
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Available sections')) {
      throw new Error('Sections list not as expected');
    }
  });
  
  // Test 6: Get API reference
  await runTest('getApiReference for "expo-camera"', async () => {
    const result = await fetcher.getApiReference('expo-camera');
    if (!result.content || !result.content[0] || result.content[0].text.length < 10) {
      throw new Error('API reference not found or too short');
    }
  });
  
  // Test 7: Get quick start
  await runTest('getQuickStart', async () => {
    const result = await fetcher.getQuickStart();
    if (!result.content || !result.content[0] || result.content[0].text.length < 10) {
      throw new Error('Quick start not found or too short');
    }
  });
  
  // Test 8: Test with version parameter
  await runTest('getDocByPath with version parameter', async () => {
    const result = await fetcher.getDocByPath('workflow/upgrading-expo-sdk-walkthrough', 'latest');
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Upgrade Expo SDK')) {
      throw new Error('Document content not as expected');
    }
  });
  
  // Test 9: Test error handling for non-existent path
  await runTest('getDocByPath with non-existent path', async () => {
    try {
      await fetcher.getDocByPath('non-existent-path-that-should-not-exist');
      throw new Error('Should have thrown an error for non-existent path');
    } catch (error) {
      if (!error.message.includes('Document not found')) {
        throw new Error('Unexpected error message');
      }
    }
  });
  
  // Test 10: Test direct file content retrieval
  await runTest('getDocContent with direct file path', async () => {
    const result = await fetcher.getDocContent('pages/workflow/upgrading-expo-sdk-walkthrough.mdx');
    if (!result.content || !result.content[0] || !result.content[0].text.includes('Upgrade Expo SDK')) {
      throw new Error('Document content not as expected');
    }
  });
  
  // Summary
  console.log('='.repeat(50));
  console.log(`Tests completed: ${testsRun}`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsRun - testsPassed}`);
  console.log(`Success rate: ${Math.round((testsPassed / testsRun) * 100)}%`);
  
  if (testsPassed === testsRun) {
    console.log('\n🎉 All tests passed! The MCP server is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

testComprehensive().catch(console.error);