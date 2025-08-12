#!/usr/bin/env node

import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🚀 Testing DHIS2 MCP Server...\n');
  
  // Start the MCP server
  const server = spawn('dhis2-mcp', [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Function to send MCP message and get response
  function sendMCPMessage(message) {
    return new Promise((resolve, reject) => {
      let response = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for response'));
      }, 10000);
      
      server.stdout.on('data', (data) => {
        response += data.toString();
        
        // Look for complete JSON response
        try {
          const lines = response.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('{') && line.includes('"result"')) {
              clearTimeout(timeout);
              resolve(JSON.parse(line));
              return;
            }
          }
        } catch (e) {
          // Not complete JSON yet, continue waiting
        }
      });
      
      server.stdin.write(JSON.stringify(message) + '\n');
    });
  }

  try {
    // Test 1: List available tools
    console.log('📋 Testing: List Tools');
    const listToolsMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };
    
    const toolsResponse = await sendMCPMessage(listToolsMessage);
    console.log(`✅ Found ${toolsResponse.result.tools.length} tools available`);
    
    // Find the dhis2_init_webapp tool
    const initWebappTool = toolsResponse.result.tools.find(tool => tool.name === 'dhis2_init_webapp');
    if (initWebappTool) {
      console.log('✅ dhis2_init_webapp tool found!');
    } else {
      console.log('❌ dhis2_init_webapp tool not found');
      return;
    }

    // Test 2: Use the dhis2_init_webapp tool
    console.log('\n🛠️ Testing: Create Web App Boilerplate');
    const webappMessage = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'dhis2_init_webapp',
        arguments: {
          appName: 'test-health-dashboard',
          appTitle: 'Test Health Dashboard',
          appDescription: 'A test DHIS2 health dashboard application',
          appType: 'app',
          template: 'basic',
          typescript: true,
          pwa: false,
          outputPath: './test-health-dashboard'
        }
      }
    };
    
    const webappResponse = await sendMCPMessage(webappMessage);
    console.log('✅ Web app boilerplate generated!');
    console.log('📄 Response:', webappResponse.result.content[0].text.substring(0, 200) + '...');

  } catch (error) {
    console.error('❌ Error testing MCP server:', error.message);
  } finally {
    server.kill();
  }
}

testMCPServer();