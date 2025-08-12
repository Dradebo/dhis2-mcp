/**
 * DHIS2 Development Debugging and Troubleshooting Functions
 * Based on DHIS2 community issues and best practices
 */

export function diagnoseCORSIssues(args: any): string {
  const { dhis2Instance, localDevelopmentUrl, browser, errorMessage = '', symptoms = [] } = args;

  const diagnosis = [];
  const solutions = [];

  // Analyze browser-specific issues
  if (browser === 'chrome') {
    diagnosis.push('Chrome has strict SameSite cookie policies since version 94+');
    solutions.push('Use the --proxy flag when starting your DHIS2 app: `yarn start --proxy`');
    solutions.push('Alternative: Start Chrome with disabled security for development: `google-chrome --disable-web-security --user-data-dir=/tmp/chrome-dev`');
  } else if (browser === 'firefox') {
    diagnosis.push('Firefox recently changed SameSite cookie behavior to be more strict');
    solutions.push('Temporarily modify Firefox settings:');
    solutions.push('  1. Open about:config');
    solutions.push('  2. Set `network.cookie.sameSite.laxByDefault` to `false`');
    solutions.push('  3. Set `network.cookie.sameSite.noneRequiresSecure` to `false`');
  }

  // Analyze specific symptoms
  symptoms.forEach((symptom: string) => {
    switch (symptom) {
      case 'login_fails':
        diagnosis.push('Authentication requests are being blocked by CORS policy');
        solutions.push('Add your development URL to DHIS2 CORS allowlist');
        solutions.push('Check if DHIS2 instance supports cross-origin authentication');
        break;
      case 'api_requests_blocked':
        diagnosis.push('API calls are failing due to cross-origin restrictions');
        solutions.push('Configure proxy to route requests through same origin');
        break;
      case 'cookies_not_sent':
        diagnosis.push('Browser is not sending cookies with cross-origin requests');
        solutions.push('Use credentials: "include" in fetch requests');
        solutions.push('Ensure SameSite cookie settings allow cross-origin');
        break;
      case '302_errors':
        diagnosis.push('Login endpoint is redirecting, causing CORS preflight failure');
        solutions.push('Use direct API authentication instead of login forms');
        break;
      case 'preflight_failed':
        diagnosis.push('CORS preflight OPTIONS requests are failing');
        solutions.push('Check DHIS2 server CORS configuration');
        break;
    }
  });

  // DHIS2 Play server specific issues
  if (dhis2Instance.includes('play.dhis2.org')) {
    diagnosis.push('DHIS2 Play instances use nginx with hardened security settings');
    solutions.push('⚠️  DHIS2 Play instances prevent cross-site cookies completely');
    solutions.push('Recommended: Use local DHIS2 instance for development');
    solutions.push('Alternative: Run DHIS2 locally with Docker: `d2 cluster up`');
  }

  return `# CORS Issues Diagnosis

## Configuration Details
- **DHIS2 Instance**: ${dhis2Instance}
- **Local Development**: ${localDevelopmentUrl}
- **Browser**: ${browser.toUpperCase()}
- **Error Message**: ${errorMessage}
- **Symptoms**: ${symptoms.join(', ')}

## Diagnosis
${diagnosis.map(d => `- ${d}`).join('\n')}

## Recommended Solutions

### Immediate Solutions
${solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Long-term Solutions
1. **Configure CORS Allowlist**
   - Login to your DHIS2 instance as admin
   - Go to Apps → System Settings → Access
   - Add your development URL to "CORS allowlist"

2. **Use Proxy Configuration**
   \`\`\`bash
   # Start with proxy (recommended)
   yarn start --proxy
   \`\`\`

3. **Local Development Instance**
   \`\`\`bash
   # Set up local DHIS2 instance
   npx @dhis2/cli cluster init
   d2 cluster up
   \`\`\`

## Testing CORS Configuration
\`\`\`bash
# Test CORS headers
curl -H "Origin: ${localDevelopmentUrl}" \\
     -H "Access-Control-Request-Method: GET" \\
     -H "Access-Control-Request-Headers: X-Requested-With" \\
     -X OPTIONS \\
     ${dhis2Instance}/api/me

# Expected response should include:
# Access-Control-Allow-Origin: ${localDevelopmentUrl}
# Access-Control-Allow-Credentials: true
\`\`\`

## Browser Dev Tools Checklist
1. Open Network tab and check for:
   - OPTIONS requests (preflight)
   - Response headers with Access-Control-*
   - Cookie header presence in requests

2. Console errors related to:
   - "Cross-Origin Request Blocked"
   - "CORS policy" messages
   - SameSite warnings

## Alternative Development Approaches
${dhis2Instance.includes('play.dhis2.org') ? `
⚠️  Since you're using DHIS2 Play, consider these alternatives:

1. **Local DHIS2 Instance (Recommended)**
   \`\`\`bash
   # Quick setup with Docker
   docker run -d -p 8080:8080 dhis2/core:2.40.4
   \`\`\`

2. **Use DHIS2 CLI Cluster**
   \`\`\`bash
   npx @dhis2/cli cluster init my-cluster
   cd my-cluster
   d2 cluster up
   \`\`\`

3. **Request Dedicated Development Instance**
   - Contact your DHIS2 administrator
   - Request CORS configuration for development URLs
` : ''}

## Security Considerations
⚠️  **Development Only**: Never disable browser security in production
⚠️  **Temporary**: Revert Firefox settings after development
⚠️  **Credentials**: Use separate development credentials
`;
}

export function generateCORSConfiguration(args: any): string {
  const { allowedOrigins, dhis2Version = '2.40.4', includeSteps = true } = args;

  return `# DHIS2 CORS Configuration Guide

## System Settings Configuration

${includeSteps ? `
### Step-by-Step Instructions
1. **Login to DHIS2** as a user with system administration privileges
2. **Navigate to System Settings**
   - Click on the Apps icon (grid icon)
   - Search for "System Settings"
   - Click on the System Settings app
3. **Configure CORS**
   - In the left sidebar, click "Access"
   - Scroll down to find "CORS allowlist"
   - Add your development URLs
4. **Save Changes**
   - Click "Save" at the bottom of the page
   - Wait for confirmation message
` : ''}

## CORS Allowlist Configuration

### URLs to Add
${allowedOrigins.map((url: string) => `- ${url}`).join('\n')}

### Configuration Format
\`\`\`
${allowedOrigins.join('\n')}
\`\`\`

## Advanced CORS Configuration (System Properties)

For system administrators, you can also configure CORS via system properties:

### dhis.conf Configuration
\`\`\`properties
# CORS Configuration
cors.allowedOrigins=${allowedOrigins.join(',')}
cors.allowCredentials=true
cors.allowedMethods=GET,POST,PUT,DELETE,OPTIONS,PATCH
cors.allowedHeaders=Accept,Content-Type,Origin,X-Requested-With,Authorization
cors.maxAge=3600
\`\`\`

## Environment-Specific Configurations

### Development Environment
\`\`\`
# Local development
http://localhost:3000
http://localhost:3001
http://127.0.0.1:3000

# Common development ports
http://localhost:8080
http://localhost:9000
\`\`\`

### Staging Environment  
\`\`\`
https://staging-app.yourdomain.com
https://test-app.yourdomain.com
\`\`\`

### Production Environment
\`\`\`
https://app.yourdomain.com
https://health-dashboard.yourdomain.com
\`\`\`

## Validation Commands

### Test CORS Configuration
\`\`\`bash
# Test basic CORS
curl -H "Origin: ${allowedOrigins[0]}" \\
     ${dhis2Version ? `https://your-dhis2-instance.com/api/system/info` : 'https://your-dhis2-instance.com/api/system/info'}

# Test with authentication
curl -H "Origin: ${allowedOrigins[0]}" \\
     -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
     https://your-dhis2-instance.com/api/me

# Test preflight request
curl -H "Origin: ${allowedOrigins[0]}" \\
     -H "Access-Control-Request-Method: POST" \\
     -H "Access-Control-Request-Headers: Content-Type" \\
     -X OPTIONS \\
     https://your-dhis2-instance.com/api/dataElements
\`\`\`

### Expected Response Headers
\`\`\`
Access-Control-Allow-Origin: ${allowedOrigins[0]}
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Headers: Accept, Content-Type, Origin, X-Requested-With, Authorization
Access-Control-Max-Age: 3600
\`\`\`

## Troubleshooting Common Issues

### Issue: "CORS allowlist not found"
**Solution**: Update to DHIS2 2.35+ (older versions use different settings)

### Issue: "Changes not taking effect"
**Solutions**:
1. Clear browser cache completely
2. Restart DHIS2 server (if self-hosted)
3. Wait 5-10 minutes for changes to propagate
4. Check if nginx/reverse proxy needs updating

### Issue: "Still getting CORS errors"
**Checklist**:
- [ ] URLs match exactly (including protocol)
- [ ] No trailing slashes mismatch
- [ ] Case sensitivity check
- [ ] Wildcard not used (DHIS2 doesn't support wildcards)
- [ ] Browser cache cleared

## Security Best Practices

### Development
- Only add localhost URLs for development
- Use specific ports, not wildcards
- Remove development URLs before production

### Production
- Only add your production domain(s)
- Use HTTPS URLs only
- Regularly audit allowed origins
- Document all entries with purpose

### Monitoring
\`\`\`bash
# Check current CORS settings via API
curl -u admin:password \\
  https://your-dhis2-instance.com/api/systemSettings/keyJsCorallowlist
\`\`\`

## Version-Specific Notes

${dhis2Version >= '2.38' ? `
### DHIS2 ${dhis2Version}+
- Full CORS support available
- GUI configuration available
- API endpoint for configuration
` : `
### DHIS2 ${dhis2Version}
- Limited CORS support
- May require manual configuration
- Check documentation for version-specific settings
`}
`;
}

export function debugAuthentication(args: any): string {
  const { issueType, dhis2Instance, authMethod, errorDetails = {}, browserSettings = {} } = args;

  const diagnosis = [];
  const solutions = [];
  
  // Analyze authentication issue type
  switch (issueType) {
    case 'login_failure':
      diagnosis.push('Authentication credentials may be invalid or endpoint unreachable');
      solutions.push('Verify username and password are correct');
      solutions.push('Test credentials directly in DHIS2 web interface');
      solutions.push('Check if account is locked or disabled');
      break;
      
    case 'session_timeout':
      diagnosis.push('User session has expired or is not being maintained');
      solutions.push('Implement session refresh mechanism');
      solutions.push('Check session timeout settings in DHIS2');
      solutions.push('Ensure cookies are being sent with requests');
      break;
      
    case 'cookie_issues':
      diagnosis.push('Browser cookie handling issues affecting authentication');
      solutions.push('Check SameSite cookie attributes');
      solutions.push('Ensure cookies are enabled in browser');
      solutions.push('Verify domain/path settings for cookies');
      break;
      
    case 'token_problems':
      diagnosis.push('Authentication token is invalid, expired, or malformed');
      solutions.push('Check token format and expiration');
      solutions.push('Implement token refresh logic');
      solutions.push('Verify token is included in Authorization header');
      break;
      
    case 'proxy_auth':
      diagnosis.push('Proxy server authentication issues');
      solutions.push('Check proxy credentials and configuration');
      solutions.push('Verify proxy target URL is correct');
      solutions.push('Ensure proxy is handling auth headers properly');
      break;
  }

  // Analyze HTTP status codes
  if (errorDetails.httpStatus) {
    switch (errorDetails.httpStatus) {
      case 401:
        diagnosis.push('HTTP 401: Unauthorized - Invalid credentials');
        solutions.push('Double-check username and password');
        solutions.push('Ensure Authorization header is properly formatted');
        break;
      case 403:
        diagnosis.push('HTTP 403: Forbidden - Valid credentials but insufficient permissions');
        solutions.push('Check user authorities/permissions in DHIS2');
        solutions.push('Verify user is assigned to appropriate user groups');
        break;
      case 302:
        diagnosis.push('HTTP 302: Redirect - Authentication endpoint is redirecting');
        solutions.push('Follow redirect chain to find final login endpoint');
        solutions.push('Use direct API authentication instead of login forms');
        break;
      case 404:
        diagnosis.push('HTTP 404: Not Found - Authentication endpoint does not exist');
        solutions.push('Verify DHIS2 instance URL is correct');
        solutions.push('Check if DHIS2 version supports the authentication method');
        break;
      case 500:
        diagnosis.push('HTTP 500: Server Error - DHIS2 server experiencing issues');
        solutions.push('Check DHIS2 server logs for detailed error information');
        solutions.push('Verify database connectivity and server health');
        break;
    }
  }

  return `# Authentication Debug Report

## Issue Details
- **Issue Type**: ${issueType.replace(/_/g, ' ').toUpperCase()}
- **DHIS2 Instance**: ${dhis2Instance}
- **Auth Method**: ${authMethod.toUpperCase()}
- **HTTP Status**: ${errorDetails.httpStatus || 'Not provided'}
- **Error Message**: ${errorDetails.errorMessage || 'Not provided'}

## Diagnosis
${diagnosis.map(d => `- ${d}`).join('\n')}

## Recommended Solutions
${solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Authentication Method Testing

${generateAuthMethodTests(authMethod, dhis2Instance)}

## Browser Settings Analysis
${browserSettings.cookiesEnabled !== undefined ? `- **Cookies Enabled**: ${browserSettings.cookiesEnabled ? 'Yes' : 'No'}` : ''}
${browserSettings.thirdPartyCookies !== undefined ? `- **Third-party Cookies**: ${browserSettings.thirdPartyCookies ? 'Enabled' : 'Disabled'}` : ''}
${browserSettings.sameSiteSettings ? `- **SameSite Settings**: ${browserSettings.sameSiteSettings}` : ''}

## Debug Commands

### Test Authentication Endpoint
\`\`\`bash
# Test basic authentication
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"username":"your-username","password":"your-password"}' \\
  ${dhis2Instance}/api/auth/login

# Test current user endpoint
curl -H "Authorization: Basic $(echo -n 'username:password' | base64)" \\
  ${dhis2Instance}/api/me
\`\`\`

### Network Analysis
\`\`\`javascript
// Browser console - check authentication headers
fetch('${dhis2Instance}/api/me', {
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + btoa('username:password')
  },
  credentials: 'include'
}).then(response => {
  console.log('Status:', response.status);
  console.log('Headers:', [...response.headers.entries()]);
  return response.json();
}).then(data => console.log('User data:', data))
.catch(err => console.error('Error:', err));
\`\`\`

## Browser Dev Tools Checklist
1. **Network Tab**:
   - [ ] Authentication request sent
   - [ ] Correct Authorization header present
   - [ ] Response status code
   - [ ] Set-Cookie headers in response

2. **Application Tab**:
   - [ ] Cookies stored correctly
   - [ ] Local/Session storage items
   - [ ] Cookie domain and path settings

3. **Console**:
   - [ ] No CORS errors
   - [ ] No cookie warnings
   - [ ] No security policy violations

## Common Authentication Patterns

### Basic Authentication
\`\`\`javascript
const credentials = btoa(\`\${username}:\${password}\`);
fetch('/api/me', {
  headers: {
    'Authorization': \`Basic \${credentials}\`
  }
});
\`\`\`

### Cookie-based Authentication
\`\`\`javascript
// Login
fetch('/dhis-web-commons-security/login.action', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: \`j_username=\${username}&j_password=\${password}\`,
  credentials: 'include'
});

// Subsequent requests
fetch('/api/me', {
  credentials: 'include'
});
\`\`\`

## Environment-Specific Issues

### Development Environment
- CORS configuration
- Proxy authentication
- Self-signed certificates
- Local network restrictions

### Production Environment
- Load balancer configuration
- SSL/TLS certificate issues
- Firewall restrictions
- Session persistence

## Session Management Best Practices
1. **Session Timeout**: Configure appropriate timeout values
2. **Session Refresh**: Implement automatic session renewal
3. **Secure Storage**: Store credentials/tokens securely
4. **Logout Cleanup**: Clear all auth data on logout

## Security Considerations
⚠️ **Never log credentials in production**
⚠️ **Use HTTPS for authentication in production**
⚠️ **Implement proper session management**
⚠️ **Regular security audits of authentication flow**
`;
}

function generateAuthMethodTests(authMethod: string, dhis2Instance: string): string {
  switch (authMethod) {
    case 'basic':
      return `### Basic Authentication Test
\`\`\`bash
# Test basic auth credentials
curl -v -u username:password ${dhis2Instance}/api/me

# Check response headers
curl -I -u username:password ${dhis2Instance}/api/me
\`\`\``;

    case 'oauth2':
      return `### OAuth2 Authentication Test
\`\`\`bash
# Step 1: Get authorization code
open "${dhis2Instance}/uaa/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI"

# Step 2: Exchange code for token
curl -X POST \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code&code=AUTH_CODE&redirect_uri=YOUR_REDIRECT_URI" \\
  -u "CLIENT_ID:CLIENT_SECRET" \\
  ${dhis2Instance}/uaa/oauth/token
\`\`\``;

    case 'cookie':
      return `### Cookie-based Authentication Test
\`\`\`bash
# Test cookie authentication
curl -c cookies.txt -b cookies.txt \\
  -d "j_username=username&j_password=password" \\
  -X POST \\
  ${dhis2Instance}/dhis-web-commons-security/login.action

# Test with saved cookies
curl -b cookies.txt ${dhis2Instance}/api/me
\`\`\``;

    case 'token':
      return `### Token-based Authentication Test
\`\`\`bash
# Get token
TOKEN=$(curl -s -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"username":"your-username","password":"your-password"}' \\
  ${dhis2Instance}/api/auth/token | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" ${dhis2Instance}/api/me
\`\`\``;

    default:
      return '### Custom Authentication Test\n```bash\n# Add your authentication test commands here\n```';
  }
}

export function generateProxyConfiguration(args: any): string {
  const { proxyType, targetInstance, localPort = 3000, authentication, sslOptions = {} } = args;

  return `# Proxy Configuration for DHIS2 Development

## ${proxyType.replace(/_/g, ' ').toUpperCase()} Configuration

${generateProxyConfig(proxyType, targetInstance, localPort, authentication, sslOptions)}

## Testing Proxy Configuration

### Test Proxy Connection
\`\`\`bash
# Test direct connection to DHIS2
curl ${targetInstance}/api/me

# Test through proxy  
curl http://localhost:${localPort}/api/me
\`\`\`

### Browser Testing
1. Start your application with proxy enabled
2. Open browser dev tools Network tab
3. Navigate to your application
4. Check that API requests go to localhost:${localPort}
5. Verify requests are forwarded to ${targetInstance}

## Common Proxy Issues and Solutions

### Issue: 502 Bad Gateway
**Causes**:
- Target DHIS2 instance is unreachable
- Authentication credentials are incorrect
- SSL certificate verification failing

**Solutions**:
- Verify target instance URL: ${targetInstance}
- Check authentication credentials
- ${sslOptions.secure === false ? 'SSL verification is disabled (good for development)' : 'Consider disabling SSL verification for development'}

### Issue: Authentication Not Working
**Solutions**:
- Ensure credentials are correct: ${authentication?.username || '[username]'}
- Check if user account is locked
- Verify proxy is forwarding auth headers

### Issue: CORS Still Occurring  
**Solutions**:
- Restart development server after proxy configuration
- Clear browser cache completely
- Check proxy configuration syntax

## Security Considerations

### Development Environment
✅ **Safe for development**:
- Using proxy to avoid CORS issues
- Credentials stored in configuration files
${sslOptions.secure === false ? '- SSL verification disabled for development certificates' : ''}

⚠️ **Security reminders**:
- Never commit credentials to version control
- Use separate development credentials
- Enable SSL verification in production

### Production Environment
❌ **Not suitable for production**:
- This proxy configuration is for development only
- Production should use proper authentication flows
- Enable all security features for production deployment

## Environment Variables

Create a \`.env.local\` file:
\`\`\`bash
# Proxy configuration
DHIS2_PROXY_TARGET=${targetInstance}
DHIS2_PROXY_USERNAME=${authentication?.username || 'your-username'}
DHIS2_PROXY_PASSWORD=${authentication?.password || 'your-password'}
PROXY_PORT=${localPort}
\`\`\`

## Alternative Solutions

### 1. DHIS2 CLI Proxy
\`\`\`bash
# Use built-in DHIS2 CLI proxy
yarn start --proxy
\`\`\`

### 2. Local DHIS2 Instance
\`\`\`bash
# Set up local development instance
npx @dhis2/cli cluster init
d2 cluster up
\`\`\`

### 3. Browser Extension
- Use CORS browser extensions for development
- ⚠️ Remember to disable in production
`;
}

function generateProxyConfig(proxyType: string, targetInstance: string, localPort: number, authentication: any, sslOptions: any): string {
  switch (proxyType) {
    case 'webpack_dev_server':
      return `### Webpack Dev Server Configuration

\`\`\`javascript
// webpack.config.js
module.exports = {
  devServer: {
    port: ${localPort},
    proxy: {
      '/api': {
        target: '${targetInstance}',
        changeOrigin: true,
        secure: ${sslOptions.secure !== false},
        ${authentication ? `auth: '${authentication.username}:${authentication.password}',` : ''}
        headers: {
          'Authorization': 'Basic ' + Buffer.from('${authentication?.username || 'username'}:${authentication?.password || 'password'}').toString('base64')
        }
      }
    }
  }
};
\`\`\``;

    case 'create_react_app':
      return `### Create React App Configuration

#### Option 1: package.json proxy field
\`\`\`json
{
  "name": "my-dhis2-app",
  "proxy": "${targetInstance}",
  "scripts": {
    "start": "react-scripts start"
  }
}
\`\`\`

#### Option 2: setupProxy.js (for advanced configuration)
\`\`\`javascript
// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: '${targetInstance}',
      changeOrigin: true,
      secure: ${sslOptions.secure !== false},
      ${authentication ? `auth: '${authentication.username}:${authentication.password}',` : ''}
      headers: {
        'Authorization': 'Basic ' + Buffer.from('${authentication?.username || 'username'}:${authentication?.password || 'password'}').toString('base64')
      }
    })
  );
};
\`\`\`

#### Start with proxy
\`\`\`bash
npm start
\`\`\``;

    case 'vite':
      return `### Vite Configuration

\`\`\`javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: ${localPort},
    proxy: {
      '/api': {
        target: '${targetInstance}',
        changeOrigin: true,
        secure: ${sslOptions.secure !== false},
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const auth = Buffer.from('${authentication?.username || 'username'}:${authentication?.password || 'password'}').toString('base64');
            proxyReq.setHeader('Authorization', \`Basic \${auth}\`);
          });
        }
      }
    }
  }
});
\`\`\`

#### Start development server
\`\`\`bash
npm run dev
\`\`\``;

    case 'custom_express':
      return `### Custom Express Proxy Server

\`\`\`javascript
// proxy-server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

const proxyOptions = {
  target: '${targetInstance}',
  changeOrigin: true,
  secure: ${sslOptions.secure !== false},
  ${authentication ? `auth: '${authentication.username}:${authentication.password}',` : ''}
  pathRewrite: {
    '^/proxy': '', // Remove /proxy prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    const auth = Buffer.from('${authentication?.username || 'username'}:${authentication?.password || 'password'}').toString('base64');
    proxyReq.setHeader('Authorization', \`Basic \${auth}\`);
  },
  logLevel: 'debug'
};

app.use('/api', createProxyMiddleware(proxyOptions));

// Serve static files
app.use(express.static('public'));

app.listen(${localPort}, () => {
  console.log(\`Proxy server running on http://localhost:${localPort}\`);
  console.log(\`Forwarding to: ${targetInstance}\`);
});
\`\`\`

#### Start proxy server
\`\`\`bash
node proxy-server.js
\`\`\``;

    default:
      return '### Custom Proxy Configuration\n```javascript\n// Add your proxy configuration here\n```';
  }
}

export function resolveBuildIssues(args: any): string {
  const { buildTool, issueType, errorMessage = '', packageManager = 'npm', nodeVersion, dependencies = {} } = args;

  const diagnosis = [];
  const solutions = [];

  // Analyze build tool specific issues
  if (buildTool === 'd2_cli_deprecated') {
    diagnosis.push('⚠️  The d2 CLI library has been deprecated');
    solutions.push('Migrate to @dhis2/app-platform for modern DHIS2 development');
    solutions.push('Use the migration assistant: `dhis2_migration_assistant` tool');
    solutions.push('Reference: https://developers.dhis2.org/docs/app-platform/getting-started');
  }

  // Analyze specific issue types
  switch (issueType) {
    case 'dependency_conflicts':
      diagnosis.push('Conflicting package versions or peer dependency issues');
      solutions.push('Clear node_modules and package lock file');
      solutions.push(`rm -rf node_modules ${packageManager === 'yarn' ? 'yarn.lock' : 'package-lock.json'}`);
      solutions.push(`${packageManager} install`);
      if (packageManager === 'yarn' && dependencies.dhis2Cli) {
        solutions.push('Ensure using yarn for DHIS2 projects (yarn.lock included)');
      }
      break;

    case 'module_resolution':
      diagnosis.push('Module resolution failing - TypeScript or import path issues');
      solutions.push('Check tsconfig.json paths configuration');
      solutions.push('Verify all imports use correct file extensions');
      solutions.push('Ensure moduleResolution is set to "node" in tsconfig.json');
      break;

    case 'bundle_size':
      diagnosis.push('Bundle size exceeding limits or performance issues');
      solutions.push('Implement code splitting with React.lazy()');
      solutions.push('Use tree shaking to eliminate dead code');
      solutions.push('Analyze bundle with: npm run build -- --analyze');
      break;

    case 'tree_shaking':
      diagnosis.push('Dead code elimination not working properly');
      solutions.push('Ensure using ES6 modules (import/export)');
      solutions.push('Check sideEffects configuration in package.json');
      solutions.push('Upgrade to latest @dhis2/cli-app-scripts version');
      break;

    case 'compilation_errors':
      diagnosis.push('TypeScript or JavaScript compilation failing');
      solutions.push('Check for TypeScript version compatibility');
      solutions.push('Verify all types are properly imported');
      solutions.push('Run type check separately: npm run type-check');
      break;

    case 'memory_issues':
      diagnosis.push('Build process running out of memory');
      solutions.push('Increase Node.js memory limit: --max-old-space-size=4096');
      solutions.push('Use incremental builds when possible');
      solutions.push('Consider splitting large applications');
      break;
  }

  // Node.js version specific issues
  if (nodeVersion) {
    const majorVersion = parseInt(nodeVersion.split('.')[0]);
    if (majorVersion < 16) {
      diagnosis.push(`Node.js version ${nodeVersion} may be too old for modern DHIS2 development`);
      solutions.push('Upgrade to Node.js 16+ (LTS recommended)');
      solutions.push('Use Node Version Manager (nvm) for easy version switching');
    } else if (majorVersion >= 18) {
      diagnosis.push('Node.js 18+ may have stricter module resolution');
      solutions.push('Ensure all dependencies support Node.js ' + majorVersion);
    }
  }

  return `# Build Issues Resolution

## Issue Analysis
- **Build Tool**: ${buildTool.replace(/_/g, ' ').toUpperCase()}
- **Issue Type**: ${issueType.replace(/_/g, ' ').toUpperCase()}
- **Package Manager**: ${packageManager.toUpperCase()}
- **Node Version**: ${nodeVersion || 'Not specified'}
- **Error**: ${errorMessage}

## Diagnosis
${diagnosis.map(d => `- ${d}`).join('\n')}

## Immediate Solutions
${solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Build Tool Specific Fixes

${generateBuildToolFixes(buildTool, dependencies)}

## Version Compatibility Check

### Current Dependencies
${Object.entries(dependencies).map(([key, version]) => `- **${key}**: ${version}`).join('\n')}

### Recommended Versions
- **@dhis2/cli-app-scripts**: ^10.3.0+
- **@dhis2/app-platform**: ^11.0.0+
- **Node.js**: 16.x or 18.x (LTS)
- **npm**: 8.x+
- **yarn**: 1.22.x+

## Generic Build Troubleshooting

### Clear Build Artifacts
\`\`\`bash
# Clear all caches and artifacts
rm -rf node_modules
rm -rf dist
rm -rf build
rm -rf .cache
${packageManager === 'yarn' ? 'rm yarn.lock' : 'rm package-lock.json'}

# Fresh install
${packageManager} install
\`\`\`

### Memory Issues
\`\`\`bash
# Increase memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Alternative: Set in package.json scripts
"build": "NODE_OPTIONS='--max-old-space-size=4096' react-scripts build"
\`\`\`

### Debug Build Process
\`\`\`bash
# Verbose build output
npm run build -- --verbose

# TypeScript compilation check
npx tsc --noEmit

# ESLint check
npx eslint src/
\`\`\`

## Performance Optimization

### Bundle Analysis
\`\`\`bash
# Analyze bundle size
npm run build -- --analyze

# Alternative tools
npx webpack-bundle-analyzer build/static/js/*.js
npx source-map-explorer build/static/js/*.js
\`\`\`

### Code Splitting Example
\`\`\`javascript
// Implement lazy loading
const LazyComponent = React.lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
\`\`\`

### Tree Shaking Configuration
\`\`\`json
// package.json
{
  "sideEffects": false,
  "main": "lib/index.js",
  "module": "es/index.js"
}
\`\`\`

## Environment-Specific Issues

### Development Build Issues
- Hot reload not working
- Slow compilation times
- Memory leaks in watch mode

### Production Build Issues
- Minification errors
- Missing environment variables
- Asset path issues

## Migration Recommendations

${buildTool === 'd2_cli_deprecated' ? `
### Migrate from d2 CLI to App Platform

1. **Install App Platform**
   \`\`\`bash
   npm install --save-dev @dhis2/cli-app-scripts
   \`\`\`

2. **Update package.json scripts**
   \`\`\`json
   {
     "scripts": {
       "start": "d2-app-scripts start",
       "build": "d2-app-scripts build",
       "test": "d2-app-scripts test",
       "deploy": "d2-app-scripts deploy"
     }
   }
   \`\`\`

3. **Create d2.config.js**
   \`\`\`javascript
   const config = {
     type: 'app',
     name: 'my-app',
     title: 'My DHIS2 App',
     description: 'A DHIS2 application'
   };
   
   module.exports = config;
   \`\`\`

4. **Update imports**
   - Replace d2 library imports
   - Use @dhis2/app-runtime for API calls
   - Update component imports to @dhis2/ui
` : ''}

## Support Resources

- **DHIS2 Developer Portal**: https://developers.dhis2.org
- **Community Forum**: https://community.dhis2.org/c/development
- **GitHub Issues**: https://github.com/dhis2/app-platform/issues
- **Documentation**: https://docs.dhis2.org

## Automated Diagnostics

\`\`\`bash
# Run comprehensive diagnostics
npx @dhis2/cli-app-scripts doctor

# Check environment setup
npx envinfo --binaries --languages --utilities
\`\`\`
`;
}

function generateBuildToolFixes(buildTool: string, dependencies: any): string {
  switch (buildTool) {
    case 'app_platform':
      return `### DHIS2 App Platform Fixes

#### Update to Latest Version
\`\`\`bash
npm install --save-dev @dhis2/cli-app-scripts@latest
\`\`\`

#### Configuration Check
\`\`\`javascript
// d2.config.js validation
const config = {
  type: 'app',
  name: 'my-app', // Must be valid package name
  title: 'My App',
  description: 'App description',
  
  // Optional: Custom entry points
  entryPoints: {
    app: './src/App.js'
  }
};

module.exports = config;
\`\`\`

#### Common App Platform Issues
1. **Missing d2.config.js**: App Platform requires this configuration file
2. **Invalid app name**: Must follow npm package naming rules
3. **Missing manifest.webapp**: Required for DHIS2 app installation`;

    case 'webpack':
      return `### Webpack Configuration Fixes

#### Update Webpack
\`\`\`bash
npm install --save-dev webpack@latest webpack-cli@latest
\`\`\`

#### Basic webpack.config.js
\`\`\`javascript
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader'
      }
    ]
  }
};
\`\`\``;

    case 'vite':
      return `### Vite Configuration Fixes

#### Update Vite
\`\`\`bash
npm install --save-dev vite@latest @vitejs/plugin-react@latest
\`\`\`

#### vite.config.js
\`\`\`javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build'
  }
});
\`\`\``;

    default:
      return '### Custom Build Tool Fixes\n```bash\n# Add specific fixes for your build tool\n```';
  }
}

export function generatePerformanceOptimizations(args: any): string {
  const { performanceIssue, metrics = {}, targetMetrics = {}, appComplexity = 'moderate' } = args;

  return `# DHIS2 App Performance Optimization

## Current Performance Analysis
- **Issue Type**: ${performanceIssue.replace(/_/g, ' ').toUpperCase()}
- **App Complexity**: ${appComplexity.toUpperCase()}

### Current Metrics
${Object.entries(metrics).map(([key, value]) => `- **${key.replace(/_/g, ' ').toUpperCase()}**: ${value}${getMetricUnit(key)}`).join('\n')}

### Target Metrics
${Object.entries(targetMetrics).map(([key, value]) => `- **${key.replace(/target_/g, '').replace(/_/g, ' ').toUpperCase()}**: ${value}${getMetricUnit(key.replace('target_', ''))}`).join('\n')}

## Optimization Strategy

${generateOptimizationStrategy(performanceIssue, metrics, appComplexity)}

## Implementation Guide

${generateImplementationGuide(performanceIssue)}

## Monitoring and Measurement

### Performance Testing Setup
\`\`\`javascript
// Performance measurement utility
const measurePerformance = (name, fn) => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(\`\${name} took \${end - start} milliseconds\`);
  return result;
};

// Usage example
measurePerformance('Data Element Load', () => {
  // Load data elements
});
\`\`\`

### Browser Performance API
\`\`\`javascript
// Track Core Web Vitals
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
\`\`\`

## Performance Budget
${generatePerformanceBudget(appComplexity)}

## DHIS2-Specific Optimizations
${generateDHIS2Optimizations()}

## Monitoring Dashboard
\`\`\`javascript
// Simple performance dashboard component
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = React.useState({});
  
  React.useEffect(() => {
    // Collect performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      setMetrics(prev => ({
        ...prev,
        ...entries.reduce((acc, entry) => ({
          ...acc,
          [entry.name]: entry.duration
        }), {})
      }));
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div>
      <h3>Performance Metrics</h3>
      {Object.entries(metrics).map(([name, value]) => (
        <p key={name}>{name}: {value.toFixed(2)}ms</p>
      ))}
    </div>
  );
};
\`\`\`
`;
}

function getMetricUnit(metric: string): string {
  switch (metric) {
    case 'loadTime':
    case 'apiResponseTime':
      return 'ms';
    case 'bundleSize':
      return 'KB';
    case 'memoryUsage':
      return 'MB';
    default:
      return '';
  }
}

function generateOptimizationStrategy(issue: string, metrics: any, complexity: string): string {
  switch (issue) {
    case 'slow_loading':
      return `### Slow Loading Optimization Strategy

#### Immediate Actions (Quick Wins)
1. **Code Splitting**: Implement lazy loading for routes and components
2. **Bundle Analysis**: Identify and remove unnecessary dependencies
3. **Image Optimization**: Compress and lazy load images
4. **Preloading**: Preload critical resources

#### Medium-term Actions
1. **Service Worker**: Implement caching strategies
2. **CDN**: Use CDN for static assets
3. **Database Optimization**: Optimize DHIS2 queries
4. **Component Optimization**: Memoize expensive components

#### Long-term Actions
1. **Architecture Review**: Consider micro-frontends for complex apps
2. **Progressive Enhancement**: Implement progressive loading
3. **Performance Monitoring**: Set up continuous monitoring`;

    case 'memory_leaks':
      return `### Memory Leak Resolution Strategy

#### Detection
1. **Chrome DevTools**: Use Memory tab to identify leaks
2. **Component Profiling**: Use React Profiler
3. **Event Listener Audit**: Check for unremoved listeners

#### Common React Memory Leaks
1. **Unmounted Components**: Clean up subscriptions in useEffect
2. **Event Listeners**: Remove listeners in cleanup functions
3. **Timers**: Clear intervals and timeouts
4. **DOM References**: Avoid storing DOM nodes in state

#### DHIS2-Specific Leaks
1. **Data Query Subscriptions**: Properly cleanup useDataQuery
2. **WebSocket Connections**: Close connections on unmount
3. **Large Datasets**: Implement virtual scrolling`;

    case 'api_bottlenecks':
      return `### API Performance Optimization

#### Request Optimization
1. **Batch Requests**: Combine multiple API calls
2. **Pagination**: Implement proper pagination
3. **Field Selection**: Only request needed fields
4. **Caching**: Implement request caching

#### DHIS2 API Optimization
1. **Query Parameters**: Use optimal filter and field parameters
2. **Bulk Operations**: Use bulk endpoints for mass operations
3. **Analytics Optimization**: Optimize analytics queries
4. **Metadata Caching**: Cache metadata locally`;

    default:
      return '### Generic Performance Strategy\n- Identify bottlenecks\n- Implement optimizations\n- Monitor improvements';
  }
}

function generateImplementationGuide(issue: string): string {
  switch (issue) {
    case 'slow_loading':
      return `### Code Splitting Implementation

\`\`\`javascript
// Route-based code splitting
import { lazy, Suspense } from 'react';

const DataEntry = lazy(() => import('./pages/DataEntry'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/data-entry" element={<DataEntry />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
\`\`\`

### Bundle Optimization
\`\`\`javascript
// webpack.config.js optimization
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        dhis2: {
          test: /[\\\\/]node_modules[\\\\/]@dhis2[\\\\/]/,
          name: 'dhis2',
          chunks: 'all',
        },
      },
    },
  },
};
\`\`\``;

    case 'memory_leaks':
      return `### Memory Leak Prevention

\`\`\`javascript
// Proper cleanup in React hooks
function MyComponent() {
  React.useEffect(() => {
    const subscription = dataService.subscribe(handleData);
    const interval = setInterval(updateData, 1000);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);
  
  const handleData = React.useCallback((data) => {
    // Handle data
  }, []);
  
  return <div>Component content</div>;
}
\`\`\`

### DHIS2 Data Query Cleanup
\`\`\`javascript
// Proper useDataQuery usage
function DataComponent() {
  const { loading, error, data, refetch } = useDataQuery(query);
  
  React.useEffect(() => {
    return () => {
      // Cleanup is handled automatically by useDataQuery
      // but you can add custom cleanup here if needed
    };
  }, []);
  
  return loading ? <Loading /> : <DataDisplay data={data} />;
}
\`\`\``;

    default:
      return '### Implementation Guide\n```javascript\n// Add specific implementation details\n```';
  }
}

function generatePerformanceBudget(complexity: string): string {
  let budgets;
  
  switch (complexity) {
    case 'simple':
      budgets = {
        'Bundle Size': '< 200KB',
        'Load Time': '< 2 seconds',
        'API Response': '< 500ms',
        'Memory Usage': '< 50MB'
      };
      break;
    case 'moderate':
      budgets = {
        'Bundle Size': '< 500KB',
        'Load Time': '< 3 seconds',
        'API Response': '< 1 second',
        'Memory Usage': '< 100MB'
      };
      break;
    case 'complex':
      budgets = {
        'Bundle Size': '< 1MB',
        'Load Time': '< 5 seconds',
        'API Response': '< 2 seconds',
        'Memory Usage': '< 200MB'
      };
      break;
    default:
      budgets = {
        'Bundle Size': '< 500KB',
        'Load Time': '< 3 seconds',
        'API Response': '< 1 second',
        'Memory Usage': '< 100MB'
      };
  }

  return `### Performance Budget for ${complexity.toUpperCase()} App
${Object.entries(budgets).map(([metric, target]) => `- **${metric}**: ${target}`).join('\n')}

### Budget Configuration (webpack-bundle-analyzer)
\`\`\`json
{
  "budgets": [
    {
      "type": "bundle",
      "name": "main",
      "maximumError": "${budgets['Bundle Size'].replace('< ', '').replace('KB', '').replace('MB', '000')}kb"
    }
  ]
}
\`\`\``;
}

function generateDHIS2Optimizations(): string {
  return `### API Request Optimization
\`\`\`javascript
// Optimize DHIS2 API requests
const optimizedQuery = {
  dataElements: {
    resource: 'dataElements',
    params: {
      fields: 'id,displayName,valueType', // Only request needed fields
      filter: 'domainType:eq:AGGREGATE',   // Filter server-side
      pageSize: 50,                        // Reasonable page size
      paging: true                         // Enable pagination
    }
  }
};
\`\`\`

### Metadata Caching
\`\`\`javascript
// Cache metadata for performance
const MetadataCache = {
  cache: new Map(),
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }
    return null;
  },
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
};
\`\`\`

### Virtual Scrolling for Large Lists
\`\`\`javascript
// Use react-window for large datasets
import { VariableSizeList } from 'react-window';

const VirtualizedDataElementList = ({ dataElements }) => {
  const getItemSize = (index) => 60; // Height of each item
  
  const renderItem = ({ index, style }) => (
    <div style={style}>
      {dataElements[index].displayName}
    </div>
  );
  
  return (
    <VariableSizeList
      height={400}
      itemCount={dataElements.length}
      itemSize={getItemSize}
      itemData={dataElements}
    >
      {renderItem}
    </VariableSizeList>
  );
};
\`\`\`

### Debounced Search
\`\`\`javascript
// Debounce search requests
import { useDebounce } from 'use-debounce';

const SearchableList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  
  const query = {
    dataElements: {
      resource: 'dataElements',
      params: {
        filter: debouncedSearchTerm ? \`name:ilike:\${debouncedSearchTerm}\` : undefined
      }
    }
  };
  
  const { data } = useDataQuery(query, { 
    enabled: debouncedSearchTerm.length > 2 
  });
  
  return (
    <div>
      <input 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      {/* Render results */}
    </div>
  );
};
\`\`\``;
}

export function validateEnvironment(args: any): string {
  const { checkAll = false, components = [], nodeVersion, dhis2Instance, operatingSystem = 'unknown' } = args;

  const checks = checkAll ? [
    'node_version', 'npm_yarn', 'dhis2_cli', 'browser_settings', 'network_connectivity', 'cors_config'
  ] : components;

  return `# DHIS2 Development Environment Validation

## Environment Information
- **Operating System**: ${operatingSystem.toUpperCase()}
- **Node Version**: ${nodeVersion || 'Not provided'}
- **DHIS2 Instance**: ${dhis2Instance || 'Not provided'}

## Validation Results

${checks.map((check: string) => generateEnvironmentCheck(check, { nodeVersion, dhis2Instance, operatingSystem })).join('\n\n')}

## Automated Validation Script

\`\`\`bash
#!/bin/bash
# DHIS2 Environment Validator

echo "🔍 DHIS2 Development Environment Validation"
echo "============================================"

# Node.js version check
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "Node.js: $NODE_VERSION"

if [[ "$NODE_VERSION" < "v16" ]]; then
  echo "❌ Node.js 16+ required"
else
  echo "✅ Node.js version OK"
fi

# Package manager check
echo "📦 Checking package managers..."
if command -v npm &> /dev/null; then
  echo "✅ npm: $(npm --version)"
else
  echo "❌ npm not found"
fi

if command -v yarn &> /dev/null; then
  echo "✅ yarn: $(yarn --version)"
else
  echo "⚠️  yarn not found (recommended for DHIS2)"
fi

# DHIS2 CLI check
echo "🔧 Checking DHIS2 CLI tools..."
if command -v d2 &> /dev/null; then
  echo "✅ d2 CLI: $(d2 --version)"
else
  echo "❌ d2 CLI not found"
  echo "Install: npm install -g @dhis2/cli"
fi

# Network connectivity check
${dhis2Instance ? `
echo "🌐 Testing DHIS2 instance connectivity..."
if curl -Is "${dhis2Instance}/api/system/info" | head -n 1 | grep -q "200 OK"; then
  echo "✅ DHIS2 instance reachable"
else
  echo "❌ Cannot reach DHIS2 instance"
fi
` : ''}

echo "✅ Environment validation complete"
\`\`\`

## Fix Common Issues

### Node.js Version Issues
\`\`\`bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18 LTS
nvm install 18
nvm use 18
nvm alias default 18
\`\`\`

### Package Manager Issues
\`\`\`bash
# Install/Update yarn (recommended for DHIS2)
npm install -g yarn

# Clear package caches
npm cache clean --force
yarn cache clean
\`\`\`

### DHIS2 CLI Issues
\`\`\`bash
# Install DHIS2 CLI tools
npm install -g @dhis2/cli

# Verify installation
d2 --version
d2 --help
\`\`\`

## Development Environment Setup

### Complete Setup Script
\`\`\`bash
#!/bin/bash
# Complete DHIS2 development environment setup

echo "🚀 Setting up DHIS2 development environment..."

# Install Node.js 18 LTS (if using nvm)
nvm install 18
nvm use 18

# Install global tools
npm install -g @dhis2/cli yarn

# Verify installations
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "yarn: $(yarn --version)"
echo "DHIS2 CLI: $(d2 --version)"

# Create development project
mkdir my-dhis2-app
cd my-dhis2-app

# Initialize DHIS2 app
d2 app scripts init my-app
cd my-app

# Install dependencies
yarn install

echo "✅ DHIS2 development environment ready!"
echo "Run 'yarn start' to begin development"
\`\`\`

## IDE Configuration

### VS Code Extensions
\`\`\`json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
\`\`\`

### VS Code Settings
\`\`\`json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
\`\`\`

## Troubleshooting Common Environment Issues

### Permission Issues (macOS/Linux)
\`\`\`bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Alternative: Use nvm to avoid sudo
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
\`\`\`

### Windows-Specific Issues
\`\`\`powershell
# Set execution policy (Windows PowerShell as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install Node.js via Chocolatey
choco install nodejs

# Install yarn
choco install yarn
\`\`\`

### Network/Corporate Firewall Issues
\`\`\`bash
# Configure npm proxy (if behind corporate firewall)
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Configure yarn proxy
yarn config set proxy http://proxy.company.com:8080
yarn config set https-proxy http://proxy.company.com:8080
\`\`\`
`;
}

function generateEnvironmentCheck(check: string, context: any): string {
  switch (check) {
    case 'node_version':
      return `### Node.js Version Check
${context.nodeVersion ? `
- **Current Version**: ${context.nodeVersion}
- **Status**: ${context.nodeVersion ? checkNodeVersion(context.nodeVersion) : '❌ Not available'}
` : `
- **Status**: ❌ Node.js version not provided
- **Action**: Run \`node --version\` to check current version
`}
- **Recommended**: Node.js 16.x or 18.x LTS
- **Minimum**: Node.js 14.x`;

    case 'npm_yarn':
      return `### Package Manager Check
\`\`\`bash
# Check package manager versions
node --version
npm --version
yarn --version
\`\`\`

- **npm**: Required for Node.js package management
- **yarn**: Recommended for DHIS2 projects (includes yarn.lock files)
- **Status**: Run commands above to verify installation`;

    case 'dhis2_cli':
      return `### DHIS2 CLI Tools Check
\`\`\`bash
# Install DHIS2 CLI
npm install -g @dhis2/cli

# Verify installation
d2 --version
d2 app --help
d2 cluster --help
\`\`\`

- **Required for**: App scaffolding, development server, deployment
- **Alternative**: Use npx if global installation is not preferred`;

    case 'browser_settings':
      return `### Browser Settings Check
#### Chrome (Recommended for Development)
- [ ] Developer Tools accessible (F12)
- [ ] Allow cross-origin requests (for development)
- [ ] Extensions disabled for testing

#### Firefox  
- [ ] about:config accessible
- [ ] CORS settings configurable
- [ ] Developer Tools available

#### Settings to verify:
- Cookies enabled
- JavaScript enabled  
- Local storage available
- Network tab in dev tools functional`;

    case 'network_connectivity':
      return `### Network Connectivity Check
${context.dhis2Instance ? `
\`\`\`bash
# Test DHIS2 instance connectivity
curl -I ${context.dhis2Instance}/api/system/info

# Test with authentication
curl -u username:password ${context.dhis2Instance}/api/me
\`\`\`

- **Target Instance**: ${context.dhis2Instance}
- **Expected Response**: 200 OK with JSON content
` : `
\`\`\`bash
# Test general connectivity
ping google.com
curl -I https://github.com

# Test npm registry
npm ping
\`\`\`

- **Status**: Verify internet connectivity and npm registry access
`}`;

    case 'cors_config':
      return `### CORS Configuration Check
${context.dhis2Instance ? `
#### Test CORS Headers
\`\`\`bash
# Test CORS preflight
curl -H "Origin: http://localhost:3000" \\
     -H "Access-Control-Request-Method: GET" \\
     -H "Access-Control-Request-Headers: Content-Type" \\
     -X OPTIONS \\
     ${context.dhis2Instance}/api/me
\`\`\`

#### Expected Headers
- \`Access-Control-Allow-Origin: http://localhost:3000\`
- \`Access-Control-Allow-Credentials: true\`
- \`Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\`

#### Configuration Steps
1. Login to DHIS2 as administrator
2. Navigate to System Settings → Access  
3. Add development URLs to CORS allowlist
` : `
#### CORS Configuration Requirements
- DHIS2 instance must allow cross-origin requests
- Development URLs must be in CORS allowlist
- Proper preflight handling required

#### Common Issues
- Missing CORS allowlist entries
- Incorrect URL formats (protocol, port)
- Browser cache preventing updates
`}`;

    default:
      return `### ${check.replace(/_/g, ' ').toUpperCase()} Check
- Status: Not implemented
- Action: Add specific validation for this component`;
  }
}

function checkNodeVersion(version: string): string {
  // Simplified version check to avoid TypeScript issues
  if (version.includes('16.') || version.includes('18.')) return '✅ Compatible';
  if (version.includes('14.') || version.includes('15.')) return '⚠️  Older version (recommend: 16.x+)';
  if (version.includes('19.') || version.includes('20.')) return '⚠️  Very new (test compatibility)';
  return '❓ Unknown version format';
}

export function generateMigrationGuide(args: any): string {
  const { currentStack, targetPlatform = {}, migrationScope = 'incremental', codeComplexity = 'moderate' } = args;

  return `# DHIS2 Migration Guide: d2 Library to App Platform

## Migration Overview
- **Current Stack**: d2 ${currentStack?.d2Version || 'unknown'}, React ${currentStack?.reactVersion || 'unknown'}, ${currentStack?.buildSystem || 'unknown'}
- **Target Platform**: App Platform ${targetPlatform?.appPlatformVersion || 'latest'}
- **Migration Scope**: ${migrationScope.replace(/_/g, ' ').toUpperCase()}
- **Code Complexity**: ${codeComplexity.toUpperCase()}

⚠️  **Important**: The d2 library is deprecated. Modern DHIS2 development uses @dhis2/app-platform.

## Pre-Migration Checklist
- [ ] Backup current codebase
- [ ] Document current dependencies
- [ ] Test current functionality thoroughly
- [ ] Review breaking changes in target platform
- [ ] Plan rollback strategy

## Step-by-Step Migration

### 1. Environment Setup
\`\`\`bash
# Install modern DHIS2 tooling
npm install -g @dhis2/cli

# Create new App Platform project (for reference)
d2 app scripts init migration-reference
\`\`\`

### 2. Package.json Updates
${generatePackageJsonMigration(currentStack, targetPlatform)}

### 3. Configuration Migration
${generateConfigMigration(currentStack)}

### 4. Code Migration
${generateCodeMigration(migrationScope, codeComplexity)}

### 5. API Migration
${generateAPIMigration(targetPlatform.features)}

## Migration Phases

${generateMigrationPhases(migrationScope, codeComplexity)}

## Testing Strategy
${generateTestingStrategy(codeComplexity)}

## Rollback Plan
\`\`\`bash
# If migration fails, rollback strategy:
git stash
git checkout pre-migration-branch
npm install
npm start
\`\`\`

## Post-Migration Validation
- [ ] All features working correctly
- [ ] Performance comparable or better
- [ ] Bundle size acceptable
- [ ] Tests passing
- [ ] No console errors
- [ ] Authentication working
- [ ] API calls functioning

## Common Migration Issues

### Dependency Conflicts
**Issue**: Conflicting versions between d2 and App Platform dependencies
**Solution**: Remove all d2-related dependencies and use App Platform equivalents

### API Changes  
**Issue**: d2.Api methods don't exist in App Runtime
**Solution**: Replace with useDataQuery/useDataMutation hooks

### Styling Conflicts
**Issue**: d2-ui styles conflict with @dhis2/ui components  
**Solution**: Gradually replace d2-ui components with @dhis2/ui

### Build Configuration
**Issue**: Custom webpack config no longer works
**Solution**: Use d2.config.js for App Platform configuration

## Resources and Support
- **Migration Documentation**: https://developers.dhis2.org/docs/app-platform/migration
- **App Platform Guide**: https://developers.dhis2.org/docs/app-platform/getting-started  
- **Community Forum**: https://community.dhis2.org/c/development
- **Code Examples**: https://github.com/dhis2/app-platform

## Success Metrics
After migration, you should have:
- ✅ Modern, maintainable codebase
- ✅ Better development experience
- ✅ Improved performance
- ✅ Future-proof architecture
- ✅ Access to latest DHIS2 features
`;
}

function generatePackageJsonMigration(currentStack: any, targetPlatform: any): string {
  return `
#### Remove Deprecated Dependencies
\`\`\`bash
# Remove d2 library and related packages
npm uninstall d2 d2-ui d2-utilizr

# Remove old build tools
npm uninstall @dhis2/d2-app-scripts
\`\`\`

#### Add App Platform Dependencies
\`\`\`bash
# Install App Platform
npm install --save-dev @dhis2/cli-app-scripts@${targetPlatform.appPlatformVersion || 'latest'}

# Install runtime dependencies
npm install @dhis2/app-runtime @dhis2/ui
\`\`\`

#### Update Scripts
\`\`\`json
{
  "scripts": {
    "start": "d2-app-scripts start",
    "build": "d2-app-scripts build", 
    "test": "d2-app-scripts test",
    "deploy": "d2-app-scripts deploy"
  }
}
\`\`\``;
}

function generateConfigMigration(currentStack: any): string {
  return `
#### Create d2.config.js
\`\`\`javascript
// d2.config.js (replaces custom webpack config)
const config = {
  type: 'app',
  name: 'my-migrated-app',
  title: 'My Migrated DHIS2 App',
  description: 'Migrated from d2 library to App Platform',
  
  // Entry point (if custom)
  entryPoints: {
    app: './src/App.js'
  },
  
  // Custom authorities
  authorities: [
    'F_METADATA_IMPORT',
    'F_DATA_VALUE_ADD'
  ]
};

module.exports = config;
\`\`\`

#### Update Manifest
\`\`\`json
// public/manifest.webapp
{
  "version": "1.0.0",
  "name": "My Migrated App",
  "description": "Migrated DHIS2 application",
  "developer": {
    "name": "Your Organization"
  },
  "activities": {
    "dhis": {
      "href": "./index.html"
    }
  }
}
\`\`\``;
}

function generateCodeMigration(scope: string, complexity: string): string {
  switch (scope) {
    case 'full_migration':
      return `
#### Complete Code Rewrite
\`\`\`javascript
// Before (d2 library)
import { getInstance } from 'd2';

const d2 = await getInstance();
const dataElements = await d2.models.dataElements.list();

// After (App Platform)
import { useDataQuery } from '@dhis2/app-runtime';

const DATA_ELEMENTS_QUERY = {
  dataElements: {
    resource: 'dataElements',
    params: {
      fields: 'id,displayName,valueType',
      paging: false
    }
  }
};

function DataElementsList() {
  const { loading, error, data } = useDataQuery(DATA_ELEMENTS_QUERY);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {data.dataElements.dataElements.map(de => (
        <li key={de.id}>{de.displayName}</li>
      ))}
    </ul>
  );
}
\`\`\``;

    case 'incremental':
      return `
#### Incremental Migration Strategy
1. **Phase 1**: Replace d2.Api calls with useDataQuery
2. **Phase 2**: Migrate UI components to @dhis2/ui
3. **Phase 3**: Update routing and navigation
4. **Phase 4**: Remove remaining d2 dependencies

\`\`\`javascript
// Step-by-step API migration
// Phase 1: Replace simple GET requests
const { data } = useDataQuery({
  systemInfo: {
    resource: 'system/info'
  }
});

// Phase 2: Replace POST/PUT requests
const [mutate] = useDataMutation({
  resource: 'dataElements',
  type: 'create',
  data: formData => formData
});
\`\`\``;

    default:
      return '#### Custom Migration Strategy\n- Define your migration approach\n- Plan incremental changes\n- Test each phase thoroughly';
  }
}

function generateAPIMigration(features: string[] = []): string {
  return `
#### API Call Migration Patterns

##### GET Requests (Read Operations)
\`\`\`javascript
// d2 library approach
const dataElements = await d2.models.dataElements.list({
  paging: false,
  fields: 'id,displayName,valueType'
});

// App Platform approach  
const { data } = useDataQuery({
  dataElements: {
    resource: 'dataElements',
    params: {
      paging: false,
      fields: 'id,displayName,valueType'
    }
  }
});
\`\`\`

##### POST/PUT Requests (Write Operations)
\`\`\`javascript
// d2 library approach
const dataElement = d2.models.dataElements.create(payload);
await dataElement.save();

// App Platform approach
const [createDataElement] = useDataMutation({
  resource: 'dataElements',
  type: 'create',
  data: payload => payload
});

await createDataElement(payload);
\`\`\`

##### Complex Queries with Filters
\`\`\`javascript
// App Platform advanced queries
const FILTERED_QUERY = {
  filteredElements: {
    resource: 'dataElements',
    params: ({ searchTerm, domainType }) => ({
      filter: [
        \`name:ilike:\${searchTerm}\`,
        \`domainType:eq:\${domainType}\`
      ],
      fields: 'id,displayName,valueType,domainType'
    })
  }
};

const { data } = useDataQuery(FILTERED_QUERY, {
  variables: { searchTerm: 'population', domainType: 'AGGREGATE' }
});
\`\`\`

${features.includes('data_query') ? '✅ Data Query enabled' : ''}
${features.includes('data_mutation') ? '✅ Data Mutation enabled' : ''}
${features.includes('alerts') ? '✅ Alerts system enabled' : ''}
${features.includes('offline') ? '✅ Offline support enabled' : ''}
`;
}

function generateMigrationPhases(scope: string, complexity: string): string {
  if (scope === 'full_migration') {
    return `
### Full Migration Timeline (${complexity} complexity)

#### Phase 1: Foundation (Week 1)
- [ ] Set up App Platform environment
- [ ] Create new project structure
- [ ] Migrate basic configuration
- [ ] Set up development workflow

#### Phase 2: Core Migration (Week 2-3)
- [ ] Replace d2.Api with App Runtime hooks
- [ ] Migrate authentication system
- [ ] Update routing configuration
- [ ] Replace d2-ui components

#### Phase 3: Feature Migration (Week 3-4)  
- [ ] Migrate all application features
- [ ] Update tests
- [ ] Performance optimization
- [ ] UI/UX improvements

#### Phase 4: Testing & Deployment (Week 5)
- [ ] Comprehensive testing
- [ ] User acceptance testing
- [ ] Performance benchmarking
- [ ] Production deployment
`;
  } else {
    return `
### Incremental Migration Timeline

#### Phase 1: Setup & Planning (Week 1)
- [ ] Install App Platform alongside d2
- [ ] Create migration plan
- [ ] Set up dual build system
- [ ] Identify migration priorities

#### Phase 2: API Migration (Week 2-4)
- [ ] Replace critical API calls
- [ ] Migrate authentication
- [ ] Update data fetching logic
- [ ] Test API compatibility

#### Phase 3: UI Migration (Week 5-8)
- [ ] Replace d2-ui components gradually
- [ ] Update styling system
- [ ] Migrate forms and interactions
- [ ] Test UI consistency

#### Phase 4: Cleanup (Week 9-10)
- [ ] Remove d2 dependencies
- [ ] Clean up configuration
- [ ] Final testing
- [ ] Documentation updates
`;
  }
}

function generateTestingStrategy(complexity: string): string {
  return `
### Testing Strategy for ${complexity.toUpperCase()} Migration

#### Pre-Migration Tests
\`\`\`bash
# Document current functionality
npm test
npm run e2e:test
npm run build
\`\`\`

#### Migration Testing
\`\`\`javascript
// API compatibility tests
describe('API Migration', () => {
  it('should maintain data fetching functionality', () => {
    // Test data queries work as expected
  });
  
  it('should handle authentication correctly', () => {
    // Test auth flow
  });
});

// UI compatibility tests  
describe('UI Migration', () => {
  it('should maintain visual consistency', () => {
    // Visual regression tests
  });
  
  it('should preserve user interactions', () => {
    // Interaction tests
  });
});
\`\`\`

#### Post-Migration Validation
- [ ] All existing features work
- [ ] Performance is maintained or improved
- [ ] No new console errors
- [ ] Authentication flows correctly
- [ ] Data persistence works
- [ ] UI is visually consistent

#### Automated Testing Setup
\`\`\`bash
# Set up comprehensive testing
npm install --save-dev jest @testing-library/react
npm install --save-dev cypress # for e2e testing

# Run migration validation suite
npm run test:migration
npm run test:e2e:migration
\`\`\`
`;
}