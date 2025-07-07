#!/usr/bin/env node

/**
 * Test script for the Expo MCP server
 * This script tests the get_expo_doc_content function with various paths
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to test MCP server communication
async function testMCPServer() {
  console.log('Starting MCP server test...\n');
  
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Helper function to send MCP request
  const sendRequest = (request) => {
    return new Promise((resolve, reject) => {
      let response = '';
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Request timeout'));
        }
      }, 5000);
      
      server.stdout.on('data', (data) => {
        response += data.toString();
        
        // Check if we have a complete JSON response
        const lines = response.split('\n');
        for (const line of lines) {
          if (line.trim() && line.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(line.trim());
              if (parsed.id === request.id) {
                clearTimeout(timeout);
                responseReceived = true;
                resolve(parsed);
                return;
              }
            } catch (e) {
              // Continue looking for complete JSON
            }
          }
        }
      });
      
      server.stdin.write(JSON.stringify(request) + '\n');
    });
  };

  try {
    // Test 1: List available tools
    console.log('Test 1: Listing available tools...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };
    
    const toolsResponse = await sendRequest(listToolsRequest);
    console.log('✓ Available tools:', toolsResponse.result.tools.map(t => t.name).join(', '));
    console.log('');

    // Test 2: Test get_expo_doc_content with path
    console.log('Test 2: Testing get_expo_doc_content with path "workflow/upgrading-expo-sdk-walkthrough"...');
    const getDocRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_expo_doc_content',
        arguments: {
          path: 'workflow/upgrading-expo-sdk-walkthrough'
        }
      }
    };
    
    const docResponse = await sendRequest(getDocRequest);
    if (docResponse.result && docResponse.result.content) {
      console.log('✓ Document retrieved successfully!');
      console.log('Preview:', docResponse.result.content[0].text.substring(0, 200) + '...');
    } else {
      console.log('✗ Failed to retrieve document');
      console.log('Response:', JSON.stringify(docResponse, null, 2));
    }
    console.log('');

    // Test 3: Test get_expo_doc_content with URL
    console.log('Test 3: Testing get_expo_doc_content with URL...');
    const getDocUrlRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_expo_doc_content',
        arguments: {
          url: 'https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough'
        }
      }
    };
    
    const docUrlResponse = await sendRequest(getDocUrlRequest);
    if (docUrlResponse.result && docUrlResponse.result.content) {
      console.log('✓ Document retrieved successfully via URL!');
      console.log('Preview:', docUrlResponse.result.content[0].text.substring(0, 200) + '...');
    } else {
      console.log('✗ Failed to retrieve document via URL');
      console.log('Response:', JSON.stringify(docUrlResponse, null, 2));
    }
    console.log('');

    // Test 4: Test list_expo_sections
    console.log('Test 4: Testing list_expo_sections...');
    const listSectionsRequest = {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'list_expo_sections',
        arguments: {}
      }
    };
    
    const sectionsResponse = await sendRequest(listSectionsRequest);
    if (sectionsResponse.result && sectionsResponse.result.content) {
      console.log('✓ Sections retrieved successfully!');
      console.log('Preview:', sectionsResponse.result.content[0].text.substring(0, 300) + '...');
    } else {
      console.log('✗ Failed to retrieve sections');
      console.log('Response:', JSON.stringify(sectionsResponse, null, 2));
    }
    console.log('');

    // Test 5: Test search_expo_docs
    console.log('Test 5: Testing search_expo_docs with "upgrading"...');
    const searchRequest = {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'search_expo_docs',
        arguments: {
          query: 'upgrading'
        }
      }
    };
    
    const searchResponse = await sendRequest(searchRequest);
    if (searchResponse.result && searchResponse.result.content) {
      console.log('✓ Search completed successfully!');
      console.log('Preview:', searchResponse.result.content[0].text.substring(0, 300) + '...');
    } else {
      console.log('✗ Search failed');
      console.log('Response:', JSON.stringify(searchResponse, null, 2));
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    server.kill();
    console.log('\nTest completed. Server terminated.');
  }
}

// Run the test
testMCPServer().catch(console.error);