#!/usr/bin/env node

/**
 * Test glob patterns to understand the issue
 */

import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testGlob() {
  console.log('Testing glob patterns...\n');
  
  const docsDir = path.join(__dirname, 'docs-cache');
  const testPath = 'workflow/upgrading-expo-sdk-walkthrough';
  
  console.log('Looking for file with path:', testPath);
  console.log('In directory:', docsDir);
  
  // Test current pattern (the one that doesn't work)
  const currentPattern = `/**/*${testPath}*` + '.{md,mdx}';
  console.log('\nCurrent pattern:', currentPattern);
  const currentFiles = await glob(currentPattern, { cwd: docsDir });
  console.log('Current pattern results:', currentFiles);
  
  // Test better patterns
  const patterns = [
    `**/*${testPath}*.{md,mdx}`,                          // Remove leading /**
    `**/*${testPath.replace(/\//g, '/')}*.{md,mdx}`,     // Keep as is
    `**/*${testPath.replace(/\//g, '*')}*.{md,mdx}`,     // Replace / with *
    `**/*${testPath.split('/').join('*')}*.{md,mdx}`,    // Split and join with *
    `**/workflow/*upgrading-expo-sdk-walkthrough*.{md,mdx}`, // Direct pattern
    `**/pages/workflow/*upgrading*.{md,mdx}`,            // Pages prefix
    `**/workflow/*upgrading*.{md,mdx}`,                  // Workflow only
    `**/*upgrading-expo-sdk-walkthrough*.{md,mdx}`,     // Just filename
  ];
  
  for (const pattern of patterns) {
    console.log(`\nTesting pattern: ${pattern}`);
    const files = await glob(pattern, { cwd: docsDir });
    console.log('Results:', files);
  }
  
  // Test the exact file path
  console.log('\nTesting exact file path:');
  const exactPath = 'pages/workflow/upgrading-expo-sdk-walkthrough.mdx';
  const exactFiles = await glob(exactPath, { cwd: docsDir });
  console.log('Exact path results:', exactFiles);
}

testGlob().catch(console.error);