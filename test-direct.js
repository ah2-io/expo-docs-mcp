#!/usr/bin/env node

/**
 * Direct test of the OfflineDocsFetcher
 */

import { OfflineDocsFetcher } from './dist/offline-docs-fetcher.js';

async function testDirectly() {
  console.log('Testing OfflineDocsFetcher directly...\n');
  
  try {
    const fetcher = new OfflineDocsFetcher();
    
    // Test 1: Test getDocByPath with the problematic path
    console.log('Test 1: Testing getDocByPath with "workflow/upgrading-expo-sdk-walkthrough"...');
    
    try {
      const result = await fetcher.getDocByPath('workflow/upgrading-expo-sdk-walkthrough');
      console.log('✓ Success! Document retrieved.');
      console.log('Preview:', result.content[0].text.substring(0, 200) + '...');
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
    
    console.log('');
    
    // Test 2: Test with just the filename
    console.log('Test 2: Testing getDocByPath with just "upgrading-expo-sdk-walkthrough"...');
    
    try {
      const result = await fetcher.getDocByPath('upgrading-expo-sdk-walkthrough');
      console.log('✓ Success! Document retrieved.');
      console.log('Preview:', result.content[0].text.substring(0, 200) + '...');
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
    
    console.log('');
    
    // Test 3: Test with direct file path
    console.log('Test 3: Testing getDocContent with direct path "pages/workflow/upgrading-expo-sdk-walkthrough.mdx"...');
    
    try {
      const result = await fetcher.getDocContent('pages/workflow/upgrading-expo-sdk-walkthrough.mdx');
      console.log('✓ Success! Document retrieved.');
      console.log('Preview:', result.content[0].text.substring(0, 200) + '...');
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
    
    console.log('');
    
    // Test 4: Test search functionality
    console.log('Test 4: Testing search for "upgrading"...');
    
    try {
      const result = await fetcher.searchDocs('upgrading');
      console.log('✓ Success! Search completed.');
      console.log('Preview:', result.content[0].text.substring(0, 300) + '...');
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
    
    console.log('');
    
    // Test 5: Test list sections
    console.log('Test 5: Testing listSections...');
    
    try {
      const result = await fetcher.listSections();
      console.log('✓ Success! Sections listed.');
      console.log('Preview:', result.content[0].text.substring(0, 300) + '...');
    } catch (error) {
      console.log('✗ Failed:', error.message);
    }
    
  } catch (error) {
    console.error('Overall test failed:', error.message);
  }
}

testDirectly().catch(console.error);