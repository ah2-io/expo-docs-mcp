#!/usr/bin/env node

/**
 * Simple test to understand the path resolution issue
 */

import { OfflineDocsFetcher } from './dist/offline-docs-fetcher.js';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSimple() {
  console.log('Testing path resolution...\n');
  
  try {
    const docsDir = path.join(__dirname, 'docs-cache');
    console.log('Docs directory:', docsDir);
    
    // First, let's see what files exist related to "upgrading"
    console.log('\nSearching for files with "upgrading" in name...');
    const files = await glob('**/*upgrading*', { cwd: docsDir });
    console.log('Found files:', files);
    
    // Now let's test the actual path resolution logic
    console.log('\nTesting path resolution with getDocByPath...');
    
    const fetcher = new OfflineDocsFetcher();
    
    // Test the specific problematic path
    const testPath = 'workflow/upgrading-expo-sdk-walkthrough';
    console.log(`\nTesting path: "${testPath}"`);
    
    // Let's simulate what getDocByPath does
    let searchPath = '';
    searchPath += `/**/*${testPath}*`;
    searchPath += '.{md,mdx}';
    console.log('Generated search pattern:', searchPath);
    
    // Test the glob pattern
    const matchedFiles = await glob(searchPath, { cwd: docsDir });
    console.log('Matched files:', matchedFiles);
    
    if (matchedFiles.length > 0) {
      console.log('\n✓ Files found! Testing document retrieval...');
      try {
        const result = await fetcher.getDocByPath(testPath);
        console.log('✓ Success! Document retrieved.');
        console.log('Title extract:', result.content[0].text.substring(0, 100));
      } catch (error) {
        console.log('✗ Failed to retrieve document:', error.message);
      }
    } else {
      console.log('\n✗ No files matched the pattern');
      
      // Let's try a different approach
      console.log('\nTrying alternative patterns...');
      
      const alternativePatterns = [
        `**/*upgrading-expo-sdk-walkthrough*`,
        `**/workflow/*upgrading*`,
        `**/pages/workflow/*upgrading*`,
        `**/*upgrading*walkthrough*`
      ];
      
      for (const pattern of alternativePatterns) {
        const altFiles = await glob(pattern + '.{md,mdx}', { cwd: docsDir });
        console.log(`Pattern "${pattern}":`, altFiles);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSimple().catch(console.error);