/**
 * DHIS2 Web App Platform Integration and Debugging Functions
 * Phase 2 implementation for DHIS2 MCP Server
 */

export function generateWebAppInitInstructions(
  appName: string, 
  appTitle: string, 
  appDescription: string,
  options: any = {}
): string {
  const { namespace, appType = 'app', template = 'basic', typescript = true, pwa = false, outputPath = './' } = options;

  return `# DHIS2 Web App Initialization Guide

## App Configuration
- **App Name**: ${appName}
- **App Title**: ${appTitle}
- **Description**: ${appDescription || 'A DHIS2 web application'}
- **Namespace**: ${namespace || appName}
- **App Type**: ${appType}
- **Template**: ${template}
- **TypeScript**: ${typescript ? 'Yes' : 'No'}
- **PWA Enabled**: ${pwa ? 'Yes' : 'No'}
- **Output Path**: ${outputPath}

## Quick Start Commands

\`\`\`bash
# Initialize new DHIS2 app using App Platform
npx @dhis2/cli-app-scripts init ${appName}

# Navigate to project directory
cd ${appName}

# Install dependencies
yarn install

# Start development server
yarn start
\`\`\`

## Project Structure
\`\`\`
${appName}/
├── src/
│   ├── App.js${typescript ? 'x' : ''}
│   ├── components/
│   └── index.js${typescript ? 'x' : ''}
├── public/
│   └── manifest.webapp
├── d2.config.js
├── package.json
${typescript ? '├── tsconfig.json' : ''}
${pwa ? '├── workbox.config.js' : ''}
└── README.md
\`\`\`

## Next Steps
1. Configure your DHIS2 instance connection
2. Set up proxy for development
3. Add CORS allowlist configuration
4. Implement your app components
5. Test with different DHIS2 versions

## Template-Specific Features
${generateTemplateFeatures(template)}

${pwa ? generatePWAConfiguration() : ''}
`;
}

function generateTemplateFeatures(template: string): string {
  switch (template) {
    case 'with-ui-library':
      return `### UI Library Template Features
- @dhis2/ui components pre-configured
- Design system tokens
- Responsive layout patterns
- Form validation helpers
- Data table components`;
    
    case 'with-analytics':
      return `### Analytics Template Features
- Analytics API integration
- Chart.js / D3.js setup
- Dashboard components
- Visualization helpers
- Data export utilities`;
    
    case 'tracker-capture':
      return `### Tracker Capture Template Features
- Event capture forms
- Tracked entity registration
- Program rules integration
- Offline data sync
- GPS coordinate capture`;
    
    default:
      return `### Basic Template Features
- Clean React application structure
- DHIS2 App Runtime integration
- Basic routing setup
- Authentication handling
- API client configuration`;
  }
}

function generatePWAConfiguration(): string {
  return `
## PWA Configuration

### Service Worker Setup
\`\`\`javascript
// workbox.config.js
module.exports = {
  globDirectory: 'build/',
  globPatterns: ['**/*.{js,css,html,png,jpg,svg}'],
  swDest: 'build/sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https:\\/\\/.*\\/api\\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'dhis2-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300, // 5 minutes
        },
      },
    },
  ],
};
\`\`\`

### App Manifest Features
- Offline capability
- Install prompts
- Background sync
- Push notifications (if supported)
`;
}

export function generateManifestContent(args: any): string {
  const { name, version, description, developer, icons, activities, authorities, appType, launch_path } = args;

  const manifest = {
    version: version || '1.0.0',
    name: name,
    description: description,
    developer: {
      name: developer.name,
      ...(developer.email && { email: developer.email })
    },
    icons: icons || {
      "48": "./icon-48.png",
      "128": "./icon-128.png"
    },
    activities: activities,
    ...(authorities && { authorities }),
    ...(appType && { appType }),
    ...(launch_path && { launch_path })
  };

  return `# DHIS2 App Manifest Configuration

## Generated manifest.webapp
\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`

## Installation Instructions
1. Save the above content as \`public/manifest.webapp\` in your app directory
2. Ensure icon files exist at the specified paths
3. Update authorities array with required permissions
4. Customize the launch_path if needed

## Authority Examples
\`\`\`json
"authorities": [
  "F_METADATA_IMPORT",
  "F_METADATA_EXPORT", 
  "F_DATA_VALUE_ADD",
  "F_DATAVALUE_ADD_WITHIN_ASSIGNED_ORGUNIT",
  "F_TRACKED_ENTITY_INSTANCE_ADD",
  "F_PROGRAM_ENROLLMENT"
]
\`\`\`

## App Type Options
- **APP**: Standard DHIS2 application
- **DASHBOARD_WIDGET**: Dashboard plugin/widget
- **TRACKER_DASHBOARD_WIDGET**: Tracker-specific dashboard widget
`;
}

export function generateBuildSystemConfig(args: any): string {
  const { appName, entryPoints, customAuthorities, pwa, publicPath, proxy } = args;

  const d2Config = {
    type: 'app',
    name: appName,
    title: appName.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    ...(entryPoints && { entryPoints }),
    ...(customAuthorities && { authorities: customAuthorities }),
    ...(pwa && { pwa }),
    ...(publicPath && { publicPath })
  };

  return `# DHIS2 Build System Configuration

## d2.config.js
\`\`\`javascript
const config = ${JSON.stringify(d2Config, null, 2)};

module.exports = config;
\`\`\`

## Build Commands
\`\`\`bash
# Development server
yarn start

# Production build
yarn build

# Deploy to DHIS2 instance
yarn deploy

# Build and analyze bundle
yarn build --analyze
\`\`\`

${proxy ? generateProxyConfig(proxy) : ''}

${pwa ? generatePWABuildConfig() : ''}

## Environment Configuration
\`\`\`bash
# .env.local
REACT_APP_DHIS2_BASE_URL=https://your-dhis2-instance.com
REACT_APP_DHIS2_API_VERSION=40
\`\`\`
`;
}

function generateProxyConfig(proxy: any): string {
  return `
## Proxy Configuration
\`\`\`javascript
// In d2.config.js
module.exports = {
  // ... other config
  proxy: {
    target: '${proxy.target}',
    auth: {
      username: '${proxy.auth?.username || 'your-username'}',
      password: '${proxy.auth?.password || 'your-password'}'
    }
  }
};
\`\`\`
`;
}

function generatePWABuildConfig(): string {
  return `
## PWA Build Configuration
\`\`\`javascript
// In d2.config.js
module.exports = {
  // ... other config
  pwa: {
    enabled: true,
    caching: {
      patterns: [
        'api/**',
        'apps/**'
      ],
      exclude: [
        '/api/me/authorization'
      ]
    }
  }
};
\`\`\`
`;
}

export function generateDevEnvironmentConfig(args: any): string {
  const { dhis2Instance, username, password, port = 3000, https = false, envFile = '.env.local' } = args;

  return `# DHIS2 Development Environment Setup

## Environment File (${envFile})
\`\`\`bash
# DHIS2 Instance Configuration
REACT_APP_DHIS2_BASE_URL=${dhis2Instance}
DHIS2_CORE_HOST=${dhis2Instance}
DHIS2_CORE_USERNAME=${username}
DHIS2_CORE_PASSWORD=${password}

# Development Server Configuration
PORT=${port}
${https ? 'HTTPS=true' : '# HTTPS=false'}

# API Configuration
REACT_APP_DHIS2_API_VERSION=40
GENERATE_SOURCEMAP=true
\`\`\`

## Development Commands
\`\`\`bash
# Start with proxy
yarn start --proxy

# Start with specific port
yarn start --port ${port}

# Start with HTTPS${https ? '' : ' (if needed)'}
${https ? 'yarn start --https' : '# yarn start --https'}
\`\`\`

## Browser Configuration for CORS
### Chrome (recommended for development)
\`\`\`bash
# Start Chrome with disabled security (development only!)
google-chrome --disable-web-security --user-data-dir=/tmp/chrome-dev
\`\`\`

### Firefox
1. Open about:config
2. Set \`network.cookie.sameSite.laxByDefault\` to \`false\`
3. Set \`network.cookie.sameSite.noneRequiresSecure\` to \`false\`

## Troubleshooting Tips
- Clear browser cache if authentication fails
- Check DHIS2 CORS allowlist settings
- Verify DHIS2 instance is accessible
- Use browser dev tools Network tab for debugging

## Security Notes
⚠️ **Never commit credentials to version control!**
- Add ${envFile} to .gitignore
- Use different credentials for development
- Rotate passwords regularly
`;
}

export function generateAppRuntimeConfig(args: any): string {
  const { apiVersion = 40, appName, features = {}, errorBoundary = true, loadingMask = true } = args;

  return `# DHIS2 App Runtime Configuration

## Provider Setup
\`\`\`jsx
import { DataProvider } from '@dhis2/app-runtime';
import { CssReset } from '@dhis2/ui';

const config = {
  baseUrl: process.env.REACT_APP_DHIS2_BASE_URL,
  apiVersion: ${apiVersion}
};

function App() {
  return (
    <DataProvider config={config}>
      <CssReset />
      ${errorBoundary ? '<ErrorBoundary>' : ''}
      ${loadingMask ? '<LoadingMask>' : ''}
      <${appName}App />
      ${loadingMask ? '</LoadingMask>' : ''}
      ${errorBoundary ? '</ErrorBoundary>' : ''}
    </DataProvider>
  );
}
\`\`\`

${features.dataQuery ? generateDataQueryExamples() : ''}
${features.dataMutation ? generateDataMutationExamples() : ''}
${features.alerts ? generateAlertsExample() : ''}
${features.offline ? generateOfflineExample() : ''}
${features.pwa ? generatePWAExample() : ''}

## Configuration Options
\`\`\`javascript
const config = {
  baseUrl: 'https://your-dhis2-instance.com',
  apiVersion: ${apiVersion},
  timeout: 30000,
  retries: 3,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
};
\`\`\`
`;
}

function generateDataQueryExamples(): string {
  return `
## Data Query Examples
\`\`\`jsx
import { useDataQuery } from '@dhis2/app-runtime';

const DATA_ELEMENTS_QUERY = {
  dataElements: {
    resource: 'dataElements',
    params: {
      fields: 'id,displayName,valueType',
      paging: false,
    },
  },
};

function DataElementsList() {
  const { loading, error, data } = useDataQuery(DATA_ELEMENTS_QUERY);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.dataElements.dataElements.map(de => (
        <li key={de.id}>{de.displayName} ({de.valueType})</li>
      ))}
    </ul>
  );
}
\`\`\`
`;
}

function generateDataMutationExamples(): string {
  return `
## Data Mutation Examples  
\`\`\`jsx
import { useDataMutation } from '@dhis2/app-runtime';

const CREATE_DATA_ELEMENT_MUTATION = {
  resource: 'dataElements',
  type: 'create',
  data: ({ name, valueType }) => ({
    name,
    shortName: name.substring(0, 50),
    valueType,
    domainType: 'AGGREGATE',
    aggregationType: 'SUM'
  })
};

function CreateDataElementForm() {
  const [mutate, { loading, error }] = useDataMutation(CREATE_DATA_ELEMENT_MUTATION);

  const handleSubmit = async (formData) => {
    try {
      const result = await mutate(formData);
      console.log('Created:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
\`\`\`
`;
}

function generateAlertsExample(): string {
  return `
## Alerts Integration
\`\`\`jsx
import { useAlert } from '@dhis2/app-runtime';

function MyComponent() {
  const { show } = useAlert((message) => message, { 
    success: true,
    duration: 3000 
  });

  const handleSuccess = () => {
    show('Operation completed successfully!');
  };

  return <button onClick={handleSuccess}>Save</button>;
}
\`\`\`
`;
}

function generateOfflineExample(): string {
  return `
## Offline Configuration
\`\`\`jsx
import { OfflineProvider } from '@dhis2/app-runtime';

const offlineConfig = {
  dhis2: {
    baseUrl: process.env.REACT_APP_DHIS2_BASE_URL,
    apiVersion: 40
  },
  pwa: {
    enabled: true,
    caching: {
      patterns: ['api/dataElements', 'api/organisationUnits']
    }
  }
};

function App() {
  return (
    <OfflineProvider config={offlineConfig}>
      <MyApp />
    </OfflineProvider>
  );
}
\`\`\`
`;
}

function generatePWAExample(): string {
  return `
## PWA Configuration
\`\`\`jsx
import { PWAProvider } from '@dhis2/app-runtime';

function App() {
  return (
    <PWAProvider>
      <MyApp />
    </PWAProvider>
  );
}
\`\`\`
`;
}

export function generateAuthenticationPatterns(args: any): string {
  const { authType, providers = [], sessionManagement = {}, securityFeatures = {}, redirectUrls = {} } = args;

  return `# DHIS2 Authentication Patterns

## ${authType.toUpperCase()} Authentication Setup

${generateAuthTypeImplementation(authType)}

${providers.length > 0 ? generateProviderIntegration(providers) : ''}

## Session Management
\`\`\`javascript
const sessionConfig = {
  timeout: ${sessionManagement.timeout || 30}, // minutes
  refreshTokens: ${sessionManagement.refreshTokens || false},
  rememberUser: ${sessionManagement.rememberUser || false}
};
\`\`\`

${Object.keys(securityFeatures).length > 0 ? generateSecurityConfiguration(securityFeatures) : ''}

## Redirect Configuration
\`\`\`javascript
const redirectConfig = {
  success: '${redirectUrls.success || '/dashboard'}',
  failure: '${redirectUrls.failure || '/login'}',
  logout: '${redirectUrls.logout || '/login'}'
};
\`\`\`

## Testing Authentication
\`\`\`bash
# Test login endpoint
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"district"}' \\
  https://your-dhis2-instance.com/api/auth/login

# Test current user endpoint
curl -H "Cookie: JSESSIONID=your-session-id" \\
  https://your-dhis2-instance.com/api/me
\`\`\`
`;
}

function generateAuthTypeImplementation(authType: string): string {
  switch (authType) {
    case 'basic':
      return `### Basic Authentication
\`\`\`jsx
import { useConfig } from '@dhis2/app-runtime';

const LoginForm = () => {
  const { baseUrl } = useConfig();
  
  const handleLogin = async (username, password) => {
    const response = await fetch(\`\${baseUrl}/api/me\`, {
      headers: {
        'Authorization': \`Basic \${btoa(\`\${username}:\${password}\`)}\`
      }
    });
    
    if (response.ok) {
      // Store credentials securely
      localStorage.setItem('dhis2.username', username);
      // Navigate to app
    }
  };
  
  return (
    <form onSubmit={handleLogin}>
      <input name="username" type="text" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  );
};
\`\`\``;

    case 'oauth2':
      return `### OAuth2 Authentication
\`\`\`jsx
import { useConfig } from '@dhis2/app-runtime';

const OAuth2Login = () => {
  const { baseUrl } = useConfig();
  
  const handleOAuth2Login = () => {
    const clientId = process.env.REACT_APP_OAUTH2_CLIENT_ID;
    const redirectUri = window.location.origin + '/oauth/callback';
    
    const oauthUrl = \`\${baseUrl}/uaa/oauth/authorize?response_type=code&client_id=\${clientId}&redirect_uri=\${redirectUri}\`;
    
    window.location.href = oauthUrl;
  };
  
  return <button onClick={handleOAuth2Login}>Login with DHIS2</button>;
};
\`\`\``;

    case 'cookie':
      return `### Cookie-based Authentication
\`\`\`jsx
const CookieAuth = () => {
  const handleLogin = async (username, password) => {
    const response = await fetch(\`\${baseUrl}/dhis-web-commons-security/login.action\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: \`j_username=\${username}&j_password=\${password}\`,
      credentials: 'include'
    });
    
    if (response.ok) {
      // Cookie is automatically handled by browser
      window.location.href = '/';
    }
  };
  
  return (
    // Login form implementation
  );
};
\`\`\``;

    case 'token':
      return `### Token-based Authentication
\`\`\`jsx
const TokenAuth = () => {
  const handleLogin = async (username, password) => {
    const response = await fetch(\`\${baseUrl}/api/auth/token\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const { token } = await response.json();
    
    // Store token securely
    localStorage.setItem('dhis2.token', token);
    
    // Set default header for future requests
    axios.defaults.headers.common['Authorization'] = \`Bearer \${token}\`;
  };
  
  return (
    // Login form implementation
  );
};
\`\`\``;

    default:
      return '### Custom Authentication Implementation';
  }
}

function generateProviderIntegration(providers: string[]): string {
  return `
## Identity Providers
${providers.map(provider => {
    switch (provider) {
      case 'google':
        return `### Google SSO Integration
\`\`\`jsx
import { GoogleLogin } from '@react-oauth/google';

const GoogleSSO = () => {
  const handleGoogleSuccess = (credentialResponse) => {
    // Send Google token to DHIS2 for validation
    fetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: credentialResponse.credential })
    });
  };
  
  return (
    <GoogleLogin
      onSuccess={handleGoogleSuccess}
      onError={() => console.log('Login Failed')}
    />
  );
};
\`\`\``;
      case 'facebook':
        return `### Facebook SSO Integration
\`\`\`jsx
import FacebookLogin from 'react-facebook-login';

const FacebookSSO = () => {
  const handleFacebookResponse = (response) => {
    // Send Facebook token to DHIS2
  };
  
  return (
    <FacebookLogin
      appId="your-facebook-app-id"
      autoLoad={false}
      fields="name,email,picture"
      callback={handleFacebookResponse}
    />
  );
};
\`\`\``;
      case 'custom':
        return `### Custom Identity Provider
\`\`\`jsx
const CustomSSO = () => {
  const handleCustomAuth = () => {
    // Implement custom authentication flow
    window.location.href = '/auth/custom-provider';
  };
  
  return <button onClick={handleCustomAuth}>Login with Custom Provider</button>;
};
\`\`\``;
      default:
        return '';
    }
  }).join('\n')}
`;
}

function generateSecurityConfiguration(securityFeatures: any): string {
  return `
## Security Configuration
\`\`\`javascript
// Security middleware
const securityConfig = {
  csrfProtection: ${securityFeatures.csrfProtection || false},
  httpOnly: ${securityFeatures.httpOnly || true},
  secure: ${securityFeatures.secure || true}, // HTTPS only
  sameSite: 'strict'
};

${securityFeatures.csrfProtection ? `
// CSRF Token handling
const getCSRFToken = async () => {
  const response = await fetch('/api/csrf-token');
  const { token } = await response.json();
  return token;
};
` : ''}
\`\`\`
`;
}

export function generateUIComponents(args: any): string {
  const { componentType, componentName, features = {}, dataIntegration = {}, styling = {} } = args;

  return `# DHIS2 UI Component: ${componentName}

## Component Implementation

${generateComponentCode(componentType, componentName, features, dataIntegration, styling)}

## Usage Example
\`\`\`jsx
import { ${componentName} } from './components/${componentName}';

function App() {
  return (
    <div>
      <${componentName} />
    </div>
  );
}
\`\`\`

## Features Included
${Object.entries(features).map(([feature, enabled]) => 
  enabled ? `- ✅ ${feature.replace(/_/g, ' ').toUpperCase()}` : `- ❌ ${feature.replace(/_/g, ' ').toUpperCase()}`
).join('\n')}

## Styling Options
- **Theme**: ${styling.theme || 'default'}
- **Custom CSS**: ${styling.customCss ? 'Enabled' : 'Disabled'}

${dataIntegration.apiEndpoint ? `
## API Integration
- **Endpoint**: ${dataIntegration.apiEndpoint}
- **Data Query**: ${dataIntegration.useDataQuery ? 'Enabled' : 'Disabled'}  
- **Data Mutation**: ${dataIntegration.useDataMutation ? 'Enabled' : 'Disabled'}
` : ''}
`;
}

function generateComponentCode(componentType: string, componentName: string, features: any, dataIntegration: any, styling: any): string {
  const baseImports = [
    "import React from 'react';",
    ...(dataIntegration.useDataQuery ? ["import { useDataQuery } from '@dhis2/app-runtime';"] : []),
    ...(dataIntegration.useDataMutation ? ["import { useDataMutation } from '@dhis2/app-runtime';"] : [])
  ];

  switch (componentType) {
    case 'form':
      return generateFormComponent(componentName, features, dataIntegration, baseImports);
    case 'table':
      return generateTableComponent(componentName, features, dataIntegration, baseImports);
    case 'dashboard':
      return generateDashboardComponent(componentName, features, dataIntegration, baseImports);
    case 'modal':
      return generateModalComponent(componentName, features, dataIntegration, baseImports);
    case 'navigation':
      return generateNavigationComponent(componentName, features, dataIntegration, baseImports);
    case 'chart':
      return generateChartComponent(componentName, features, dataIntegration, baseImports);
    case 'list':
      return generateListComponent(componentName, features, dataIntegration, baseImports);
    default:
      return generateGenericComponent(componentName, baseImports);
  }
}

function generateFormComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  const uiImports = [
    "import { Button, Field, Input, TextArea } from '@dhis2/ui';"
  ];

  return `${[...imports, ...uiImports].join('\n')}

${dataIntegration.useDataMutation ? `
const SAVE_MUTATION = {
  resource: '${dataIntegration.apiEndpoint || 'dataElements'}',
  type: 'create',
  data: (formData) => formData
};
` : ''}

export const ${name} = () => {
  const [formData, setFormData] = React.useState({});
  ${features.validation ? 'const [errors, setErrors] = React.useState({});' : ''}
  ${dataIntegration.useDataMutation ? 'const [mutate, { loading, error }] = useDataMutation(SAVE_MUTATION);' : ''}

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    ${features.validation ? `
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    ` : ''}
    
    ${dataIntegration.useDataMutation ? `
    try {
      await mutate(formData);
      // Handle success
    } catch (err) {
      console.error('Save failed:', err);
    }
    ` : '// Handle form submission'}
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    ${features.validation ? 'if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));' : ''}
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Name" error={${features.validation ? 'errors.name' : 'null'}}>
        <Input 
          value={formData.name || ''}
          onChange={({ value }) => handleChange('name', value)}
        />
      </Field>
      
      <Field label="Description">
        <TextArea
          value={formData.description || ''}
          onChange={({ value }) => handleChange('description', value)}
          rows={4}
        />
      </Field>
      
      <Button primary type="submit" ${dataIntegration.useDataMutation ? 'loading={loading}' : ''}>
        Save
      </Button>
    </form>
  );
};

${features.validation ? `
const validateForm = (data) => {
  const errors = {};
  
  if (!data.name || data.name.trim().length === 0) {
    errors.name = 'Name is required';
  }
  
  if (data.name && data.name.length > 50) {
    errors.name = 'Name must be less than 50 characters';
  }
  
  return errors;
};
` : ''}`;
}

function generateTableComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  const uiImports = [
    "import { DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell } from '@dhis2/ui';"
  ];

  return `${[...imports, ...uiImports].join('\n')}

${dataIntegration.useDataQuery ? `
const DATA_QUERY = {
  data: {
    resource: '${dataIntegration.apiEndpoint || 'dataElements'}',
    params: {
      fields: 'id,displayName,valueType',
      ${features.pagination ? 'pageSize: 25,' : 'paging: false,'}
    }
  }
};
` : ''}

export const ${name} = () => {
  ${dataIntegration.useDataQuery ? 'const { loading, error, data } = useDataQuery(DATA_QUERY);' : ''}
  ${features.search ? 'const [searchTerm, setSearchTerm] = React.useState("");' : ''}
  ${features.pagination ? 'const [currentPage, setCurrentPage] = React.useState(1);' : ''}

  ${dataIntegration.useDataQuery ? `
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const items = data?.data?.${dataIntegration.apiEndpoint?.slice(-1) === 's' ? dataIntegration.apiEndpoint : 'dataElements'} || [];
  ` : 'const items = [];'}

  ${features.search ? `
  const filteredItems = items.filter(item =>
    item.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  ` : 'const filteredItems = items;'}

  return (
    <div>
      ${features.search ? `
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ marginBottom: '16px', padding: '8px' }}
      />
      ` : ''}
      
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableColumnHeader>Name</DataTableColumnHeader>
            <DataTableColumnHeader>Type</DataTableColumnHeader>
            <DataTableColumnHeader>Actions</DataTableColumnHeader>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {filteredItems.map(item => (
            <DataTableRow key={item.id}>
              <DataTableCell>{item.displayName}</DataTableCell>
              <DataTableCell>{item.valueType}</DataTableCell>
              <DataTableCell>
                <button>Edit</button>
                <button>Delete</button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      
      ${features.pagination ? `
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</button>
        <span style={{ margin: '0 16px' }}>Page {currentPage}</span>
        <button onClick={() => setCurrentPage(p => p + 1)}>Next</button>
      </div>
      ` : ''}
    </div>
  );
};`;
}

function generateDashboardComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  return `${imports.join('\n')}
import { Card } from '@dhis2/ui';

export const ${name} = () => {
  return (
    <div className="dashboard-grid">
      <Card>
        <h3>Dashboard Widget 1</h3>
        <p>Content goes here</p>
      </Card>
      
      <Card>
        <h3>Dashboard Widget 2</h3>  
        <p>More content</p>
      </Card>
    </div>
  );
};

// Add corresponding CSS
const styles = \`
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

${features.responsive ? `
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
` : ''}
\`;`;
}

function generateModalComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  return `${imports.join('\n')}
import { Modal, ModalTitle, ModalContent, ModalActions, Button } from '@dhis2/ui';

export const ${name} = ({ open, onClose, title, children }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <ModalContent>
        {children}
      </ModalContent>
      <ModalActions>
        <Button secondary onClick={onClose}>
          Cancel
        </Button>
        <Button primary onClick={() => console.log('Confirm')}>
          Confirm
        </Button>
      </ModalActions>
    </Modal>
  );
};`;
}

function generateNavigationComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  return `${imports.join('\n')}
import { Menu, MenuItem } from '@dhis2/ui';

export const ${name} = ({ activeItem, onItemClick }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'data-entry', label: 'Data Entry' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <Menu>
      {menuItems.map(item => (
        <MenuItem
          key={item.id}
          active={activeItem === item.id}
          onClick={() => onItemClick(item.id)}
          label={item.label}
        />
      ))}
    </Menu>
  );
};`;
}

function generateChartComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  return `${imports.join('\n')}

export const ${name} = ({ data, type = 'bar' }) => {
  // Chart implementation would go here
  // You might use Chart.js, D3.js, or DHIS2's visualization components
  
  return (
    <div className="chart-container">
      <canvas id="chart" width="400" height="200"></canvas>
    </div>
  );
};`;
}

function generateListComponent(name: string, features: any, dataIntegration: any, imports: string[]): string {
  return `${imports.join('\n')}
import { SingleSelect, SingleSelectOption } from '@dhis2/ui';

${dataIntegration.useDataQuery ? `
const LIST_QUERY = {
  items: {
    resource: '${dataIntegration.apiEndpoint || 'dataElements'}',
    params: {
      fields: 'id,displayName',
      paging: false
    }
  }
};
` : ''}

export const ${name} = ({ onSelectionChange }) => {
  ${dataIntegration.useDataQuery ? 'const { loading, error, data } = useDataQuery(LIST_QUERY);' : ''}
  const [selected, setSelected] = React.useState(null);

  ${dataIntegration.useDataQuery ? `
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  const items = data?.items?.${dataIntegration.apiEndpoint?.slice(-1) === 's' ? dataIntegration.apiEndpoint : 'dataElements'} || [];
  ` : 'const items = [];'}

  const handleChange = ({ selected }) => {
    setSelected(selected);
    onSelectionChange?.(selected);
  };

  return (
    <SingleSelect
      selected={selected}
      onChange={handleChange}
      placeholder="Select an item"
    >
      {items.map(item => (
        <SingleSelectOption
          key={item.id}
          value={item.id}
          label={item.displayName}
        />
      ))}
    </SingleSelect>
  );
};`;
}

function generateGenericComponent(name: string, imports: string[]): string {
  return `${imports.join('\n')}

export const ${name} = ({ children, ...props }) => {
  return (
    <div className="${name.toLowerCase()}" {...props}>
      {children}
    </div>
  );
};`;
}

export function generateTestSetup(args: any): string {
  const { testFramework, testTypes = [], coverage = {}, mockSetup = {} } = args;

  return `# DHIS2 Testing Setup

## ${testFramework.toUpperCase()} Configuration

${generateTestFrameworkConfig(testFramework, coverage)}

${testTypes.includes('unit') ? generateUnitTestExamples() : ''}
${testTypes.includes('integration') ? generateIntegrationTestExamples() : ''}
${testTypes.includes('e2e') ? generateE2ETestExamples(testFramework) : ''}
${testTypes.includes('visual') ? generateVisualTestExamples() : ''}

${Object.keys(mockSetup).length > 0 ? generateMockConfiguration(mockSetup) : ''}

## Test Commands
\`\`\`bash
# Run all tests
${testFramework === 'jest' ? 'npm test' : testFramework === 'cypress' ? 'npx cypress open' : 'npx playwright test'}

# Run with coverage
${testFramework === 'jest' ? 'npm test -- --coverage' : 'npm run test:coverage'}

# Run specific test file
${testFramework === 'jest' ? 'npm test -- MyComponent.test.js' : testFramework === 'cypress' ? 'npx cypress run --spec "cypress/integration/MyComponent.spec.js"' : 'npx playwright test tests/MyComponent.spec.ts'}

# Watch mode
${testFramework === 'jest' ? 'npm test -- --watch' : 'npm run test:watch'}
\`\`\`
`;
}

// Phase 4: UI Library Integration – Advanced Generators

export function generateUIFormPatterns(args: any): string {
  const { 
    componentName = 'AdvancedForm',
    includeValidation = true,
    includeDatePicker = true,
    includeFileUpload = true,
    includeMultiSelect = true,
    includeSelects = true
  } = args;

  return `# @dhis2/ui Form Patterns: ${componentName}

## Implementation
\`\`\`jsx
import React from 'react';
import {
  Button,
  Field,
  InputField,
  TextAreaField,
  SingleSelectField,
  SingleSelectOption,
  ${includeMultiSelect ? 'MultiSelectField, MultiSelectOption,' : ''}
  ${includeDatePicker ? 'DatePicker,' : ''}
  ${includeFileUpload ? 'FileInput,' : ''}
} from '@dhis2/ui';
${includeValidation ? "import { useState } from 'react';" : ''}

export const ${componentName} = () => {
  ${includeValidation ? 'const [errors, setErrors] = useState<Record<string, string | null>>({});' : ''}
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    valueType: 'NUMBER',
    date: '',
    ${includeMultiSelect ? 'options: [],' : ''}
  });

  const onChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    ${includeValidation ? `
    const nextErrors: Record<string, string | null> = {};
    if (!form.name?.trim()) nextErrors.name = 'Name is required';
    if (form.name && form.name.length > 50) nextErrors.name = 'Max 50 characters';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    ` : ''}
    // Submit logic here
    console.log('Submitting form', form);
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      <InputField
        label="Name"
        name="name"
        value={form.name}
        onChange={({ value }) => onChange('name', value)}
        ${includeValidation ? 'validationText={errors.name || undefined}' : ''}
        ${includeValidation ? 'error={Boolean(errors.name)}' : ''}
        required
      />

      <TextAreaField
        label="Description"
        name="description"
        value={form.description}
        onChange={({ value }) => onChange('description', value)}
        rows={4}
      />

      ${includeSelects ? `
      <SingleSelectField
        label="Value type"
        selected={form.valueType}
        onChange={({ selected }) => onChange('valueType', selected)}
      >
        <SingleSelectOption value="NUMBER" label="Number" />
        <SingleSelectOption value="INTEGER" label="Integer" />
        <SingleSelectOption value="TEXT" label="Text" />
      </SingleSelectField>
      ` : ''}

      ${includeMultiSelect ? `
      <MultiSelectField
        label="Categories"
        selected={form.options}
        onChange={({ selected }) => onChange('options', selected)}
      >
        <MultiSelectOption value="male" label="Male" />
        <MultiSelectOption value="female" label="Female" />
      </MultiSelectField>
      ` : ''}

      ${includeDatePicker ? `
      <Field label="Start date">
        <DatePicker
          calendar="gregorian"
          date={form.date}
          onDateSelect={({ date }) => onChange('date', date)}
        />
      </Field>
      ` : ''}

      ${includeFileUpload ? `
      <Field label="Attachment">
        <FileInput onChange={({ files }) => onChange('file', files?.[0])} buttonLabel="Choose file" />
      </Field>
      ` : ''}

      <Button type="submit" primary>Save</Button>
    </form>
  );
};
\`\`\`

## Notes
- Includes validation, date picker, file upload, and multi-select patterns.
- Replace options with dynamic lists as needed.
`;
}

export function generateUIDataDisplayPatterns(args: any): string {
  const {
    componentName = 'DataDisplay',
    includeTable = true,
    includePagination = true,
    includeCards = true,
    includeLists = true,
    includeModal = true,
    includeLoading = true
  } = args;

  return `# @dhis2/ui Data Display Patterns: ${componentName}

## Implementation
\`\`\`jsx
import React from 'react';
import {
  DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell,
  Card, Modal, ModalTitle, ModalContent, ModalActions, Button,
  ${includeLoading ? 'CircularLoader,' : ''}
} from '@dhis2/ui';

export const ${componentName} = ({ items = [], loading = false }) => {
  const [open, setOpen] = React.useState(false);

  if (loading) {
    return ${includeLoading ? '<CircularLoader />' : '<div>Loading...</div>'};
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      ${includeTable ? `
      <DataTable>
        <DataTableHead>
          <DataTableRow>
            <DataTableColumnHeader>Name</DataTableColumnHeader>
            <DataTableColumnHeader>Type</DataTableColumnHeader>
          </DataTableRow>
        </DataTableHead>
        <DataTableBody>
          {items.map((it) => (
            <DataTableRow key={it.id}>
              <DataTableCell>{it.displayName}</DataTableCell>
              <DataTableCell>{it.valueType}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      ${includePagination ? `<div style={{ textAlign: 'center' }}><Button>Prev</Button> <Button>Next</Button></div>` : ''}
      ` : ''}

      ${includeCards ? `
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {items.slice(0, 4).map((it) => (
          <Card key={it.id}>
            <div style={{ padding: 16 }}>
              <h3 style={{ margin: '0 0 8px' }}>{it.displayName}</h3>
              <div>Type: {it.valueType}</div>
            </div>
          </Card>
        ))}
      </div>
      ` : ''}

      ${includeLists ? `
      <ul>
        {items.slice(0, 5).map((it) => (
          <li key={it.id}>{it.displayName}</li>
        ))}
      </ul>
      ` : ''}

      ${includeModal ? `
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)}>
          <ModalTitle>Details</ModalTitle>
          <ModalContent>Modal content here</ModalContent>
          <ModalActions>
            <Button secondary onClick={() => setOpen(false)}>Close</Button>
          </ModalActions>
        </Modal>
      </>
      ` : ''}
    </div>
  );
};
\`\`\`
`;
}

export function generateUINavigationLayout(args: any): string {
  const {
    componentName = 'NavigationLayout',
    includeHeaderBar = true,
    includeSidebar = true,
    includeBreadcrumbs = true,
    includeTabs = true,
    includeResponsive = true
  } = args;

  return `# @dhis2/ui Navigation & Layout: ${componentName}

## Implementation
\`\`\`jsx
import React from 'react';
import { Menu, MenuItem, TabBar, Tab, Breadcrumbs, BreadcrumbsItem } from '@dhis2/ui';
${includeHeaderBar ? "import { HeaderBar } from '@dhis2/ui';" : ''}

export const ${componentName} = () => {
  const [active, setActive] = React.useState('dashboard');

  return (
    <div className="layout">
      ${includeHeaderBar ? '<HeaderBar appName="My DHIS2 App" />' : ''}

      <div className="content">
        ${includeSidebar ? `
        <aside className="sidebar">
          <Menu>
            <MenuItem label="Dashboard" active={active==='dashboard'} onClick={() => setActive('dashboard')} />
            <MenuItem label="Data Entry" active={active==='data-entry'} onClick={() => setActive('data-entry')} />
            <MenuItem label="Reports" active={active==='reports'} onClick={() => setActive('reports')} />
          </Menu>
        </aside>
        ` : ''}

        <main className="main">
          ${includeBreadcrumbs ? `
          <Breadcrumbs>
            <BreadcrumbsItem>Home</BreadcrumbsItem>
            <BreadcrumbsItem>Section</BreadcrumbsItem>
            <BreadcrumbsItem>Page</BreadcrumbsItem>
          </Breadcrumbs>
          ` : ''}

          ${includeTabs ? `
          <TabBar>
            <Tab selected>Overview</Tab>
            <Tab>Details</Tab>
            <Tab>Settings</Tab>
          </TabBar>
          ` : ''}
        </main>
      </div>
    </div>
  );
};

// Basic layout styles
const styles = 
\`.layout { display: flex; flex-direction: column; height: 100vh; }
.content { display: grid; grid-template-columns: ${includeSidebar ? '240px 1fr' : '1fr'}; flex: 1; min-height: 0; }
.sidebar { border-right: 1px solid #e5e7eb; padding: 12px; overflow: auto; }
.main { padding: 16px; overflow: auto; }
${includeResponsive ? '@media (max-width: 768px) { .content { grid-template-columns: 1fr; } .sidebar { display:none; } }' : ''}\`;
\`\`\`
`;
}

export function generateDesignSystemConfig(args: any): string {
  const {
    theme = 'default',
    enableDarkMode = true,
    palette = {
      primary: '#0a6eb4',
      secondary: '#4a5568',
      success: '#0E7C86',
      warning: '#FFA400',
      danger: '#E53935'
    },
    typography = {
      fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
      scale: [12, 14, 16, 20, 24, 32]
    },
    spacing = [4, 8, 12, 16, 24, 32]
  } = args;

  return `# Design System Configuration

## Theme Tokens (CSS Variables)
\`\`\`css
:root {
  --color-primary: ${palette.primary};
  --color-secondary: ${palette.secondary};
  --color-success: ${palette.success};
  --color-warning: ${palette.warning};
  --color-danger: ${palette.danger};

  --font-family-base: ${typography.fontFamily};
  --font-size-xs: ${typography.scale[0]}px;
  --font-size-sm: ${typography.scale[1]}px;
  --font-size-md: ${typography.scale[2]}px;
  --font-size-lg: ${typography.scale[3]}px;
  --font-size-xl: ${typography.scale[4]}px;
  --font-size-2xl: ${typography.scale[5]}px;

  --space-1: ${spacing[0]}px;
  --space-2: ${spacing[1]}px;
  --space-3: ${spacing[2]}px;
  --space-4: ${spacing[3]}px;
  --space-5: ${spacing[4]}px;
  --space-6: ${spacing[5]}px;
}

\`\`\`

`;
}

export function generateI18nSetup(): string {
  return `# i18n Setup for DHIS2 Apps (@dhis2/d2-i18n)

## Installation
\`\`\`bash
yarn add @dhis2/d2-i18n
\`\`\`

## Initialization (src/i18n.js)
\`\`\`javascript
import i18n from '@dhis2/d2-i18n';
i18n.addResources('en', 'translation', {});
i18n.setDefaultNamespace('translation');
export default i18n;
\`\`\`

## Usage in components
\`\`\`jsx
import i18n from '../i18n';
<Button>{i18n.t('Save')}</Button>
\`\`\`

## Translations (public/locales/<locale>/translation.json)
\`\`\`json
{ "Save": "Save", "Name": "Name" }
\`\`\`
`;
}

export function generateAccessibilityChecklist(): string {
  return `# Accessibility Checklist

- Labels: All inputs have visible labels, associated via props
- Validation text: Use validationText with error state
- Keyboard: Tab order and ENTER/ESC in dialogs
- Focus: Focus first invalid field on submit
- Color contrast: Verify WCAG AA
- ARIA: Use role/aria-* only when needed, keep semantic HTML
`;
}

export function generateTableEnhancements(args: any): string {
  const { sorting = true, selection = true, stickyHeader = true } = args || {};
  return `# DataTable Enhancements

## Features
- Sorting: column header click toggles sort
- Selection: row checkbox selection
- Sticky header: header remains visible on scroll

## Example
\`\`\`jsx
import { DataTable, DataTableHead, DataTableRow, DataTableColumnHeader, DataTableBody, DataTableCell, DataTableToolbar, Checkbox } from '@dhis2/ui';

function EnhancedTable({ items }) {
  return (
    <DataTable ${stickyHeader ? 'scrollHeight="60vh"' : ''}>
      <DataTableHead>
        <DataTableRow>
          ${selection ? '<DataTableColumnHeader><Checkbox /></DataTableColumnHeader>' : ''}
          <DataTableColumnHeader ${sorting ? 'onClick={() => { /* toggle sort */ }}' : ''}>Name</DataTableColumnHeader>
          <DataTableColumnHeader>Type</DataTableColumnHeader>
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {items.map((it) => (
          <DataTableRow key={it.id} ${selection ? 'selected={false}' : ''}>
            ${selection ? '<DataTableCell><Checkbox /></DataTableCell>' : ''}
            <DataTableCell>{it.displayName}</DataTableCell>
            <DataTableCell>{it.valueType}</DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
\`\`\`
`;
}

export function generateAndroidThemeScaffold(args: any): string {
  const { dynamicColor = true, lightDark = true } = args || {};
  return `# Android Material 3 Theme Scaffold (Compose)

## Theme.kt
\`\`\`kotlin
@Composable
fun AppTheme(content: @Composable () -> Unit) {
    ${dynamicColor ? 'val dynamic = dynamicColorScheme(LocalContext.current)' : 'val scheme = lightColorScheme()'}
    ${lightDark ? 'val dark = isSystemInDarkTheme()' : 'val dark = false'}
    MaterialTheme(
        colorScheme = ${dynamicColor ? '(if (dark) dynamic.darkScheme else dynamic.lightScheme)' : 'scheme'},
        typography = Typography(),
        content = content
    )
}
\`\`\`

## Usage
\`\`\`kotlin
@Composable
fun App() { AppTheme { /* App content */ } }
\`\`\`
`;
}

// Phase 4 (Android): UI pattern generators

export function generateAndroidMaterialForm(args: any): string {
  const {
    screenName = 'RegistrationForm',
    includeValidation = true,
    includeDatePicker = true,
    includeMultiSelect = true
  } = args;

  return `# Android Material Form (Jetpack Compose): ${screenName}

## Implementation
\`\`\`kotlin
@Composable
fun ${screenName}(
    onSubmit: (name: String, description: String, date: String, options: List<String>) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var date by remember { mutableStateOf("") }
    var showDatePicker by remember { mutableStateOf(false) }
    val selectedOptions = remember { mutableStateListOf<String>() }
    ${includeValidation ? 'var nameError by remember { mutableStateOf<String?>(null) }' : ''}

    Column(modifier = Modifier.padding(16.dp).fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = name,
            onValueChange = { value ->
                name = value
                ${includeValidation ? 'nameError = if (value.isBlank()) "Name is required" else null' : ''}
            },
            label = { Text("Name") },
            isError = ${includeValidation ? 'nameError != null' : 'false'},
            supportingText = { ${includeValidation ? 'nameError?.let { Text(it)' : 'null'} ${includeValidation ? '}' : ''} }
        )

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Description") },
            minLines = 3
        )

        ${includeDatePicker ? `
        OutlinedTextField(
            value = date,
            onValueChange = {},
            label = { Text("Date") },
            readOnly = true,
            trailingIcon = { Icon(Icons.Default.DateRange, contentDescription = null) },
            modifier = Modifier.clickable { showDatePicker = true }
        )

        if (showDatePicker) {
            DatePickerDialog(
                onDismissRequest = { showDatePicker = false },
                onDateChange = { y, m, d ->
                    date = "%04d-%02d-%02d".format(y, m + 1, d)
                    showDatePicker = false
                }
            )
        }
        ` : ''}

        ${includeMultiSelect ? `
        Text("Categories")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("male", "female", "other").forEach { option ->
                FilterChip(
                    selected = selectedOptions.contains(option),
                    onClick = {
                        if (selectedOptions.contains(option)) selectedOptions.remove(option)
                        else selectedOptions.add(option)
                    },
                    label = { Text(option) }
                )
            }
        }
        ` : ''}

        Button(onClick = {
            ${includeValidation ? 'if (nameError != null) return@Button' : ''}
            onSubmit(name, description, date, selectedOptions.toList())
        }) {
            Text("Save")
        }
    }
}
\`\`\`

## Notes
- Replace \`DatePickerDialog\` with your preferred implementation if needed.
- Use validation for required fields.
`;
}

export function generateAndroidListAdapter(args: any): string {
  const { adapterName = 'DataElementAdapter', itemLayout = 'item_data_element' } = args;

  return `# Android RecyclerView Adapter: ${adapterName}

## Adapter (Kotlin)
\`\`\`kotlin
class ${adapterName}(private val items: MutableList<DataElement>) : RecyclerView.Adapter<${adapterName}.ViewHolder>() {

    class ViewHolder(val binding: ${camelToPascal(itemLayout)}Binding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        val binding = ${camelToPascal(itemLayout)}Binding.inflate(inflater, parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        holder.binding.name.text = item.displayName
        holder.binding.type.text = item.valueType
    }

    override fun getItemCount(): Int = items.size
}
\`\`\`

## Item Layout (XML)
\`\`\`xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="16dp">

    <TextView android:id="@+id/name" android:layout_width="match_parent" android:layout_height="wrap_content" android:textStyle="bold"/>
    <TextView android:id="@+id/type" android:layout_width="match_parent" android:layout_height="wrap_content"/>
</LinearLayout>
\`\`\`
`;
}

export function generateAndroidNavigationDrawer(args: any): string {
  const { componentName = 'AppNavigation' } = args;

  return `# Android Navigation Drawer (Compose): ${componentName}

## Implementation
\`\`\`kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ${componentName}() {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                NavigationDrawerItem(label = { Text("Dashboard") }, selected = true, onClick = { })
                NavigationDrawerItem(label = { Text("Data Entry") }, selected = false, onClick = { })
                NavigationDrawerItem(label = { Text("Reports") }, selected = false, onClick = { })
            }
        }
    ) {
        Scaffold(topBar = {
            TopAppBar(title = { Text("My DHIS2 App") }, navigationIcon = {
                IconButton(onClick = { scope.launch { drawerState.open() } }) {
                    Icon(Icons.Default.Menu, contentDescription = null)
                }
            })
        }) { padding ->
            Box(Modifier.padding(padding)) {
                Text("Content goes here")
            }
        }
    }
}
\`\`\`
`;
}

export function generateAndroidBottomSheet(args: any): string {
  const { componentName = 'DetailsBottomSheet' } = args;

  return `# Android Bottom Sheet (Compose): ${componentName}

## Implementation
\`\`\`kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ${componentName}(open: Boolean, onDismiss: () -> Unit, content: @Composable () -> Unit) {
    if (!open) return
    ModalBottomSheet(onDismissRequest = onDismiss) {
        content()
    }
}
\`\`\`
`;
}

// helper
function camelToPascal(input: string): string {
  return input
    .split(/[_\-]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}


function generateTestFrameworkConfig(framework: string, coverage: any): string {
  switch (framework) {
    case 'jest':
      return `### Jest Configuration (jest.config.js)
\`\`\`javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/serviceWorker.js',
  ],
  coverageThreshold: {
    global: {
      branches: ${coverage.threshold || 80},
      functions: ${coverage.threshold || 80},
      lines: ${coverage.threshold || 80},
      statements: ${coverage.threshold || 80},
    },
  },
  coverageReporters: ${JSON.stringify(coverage.reports || ['text', 'html'])},
};
\`\`\`

### Setup File (src/setupTests.js)
\`\`\`javascript
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({ testIdAttribute: 'data-test' });

// Mock DHIS2 App Runtime
jest.mock('@dhis2/app-runtime', () => ({
  useDataQuery: jest.fn(),
  useDataMutation: jest.fn(),
  useAlert: jest.fn(() => ({ show: jest.fn() })),
}));
\`\`\``;

    case 'cypress':
      return `### Cypress Configuration (cypress.json)
\`\`\`json
{
  "baseUrl": "http://localhost:3000",
  "integrationFolder": "cypress/integration",
  "fixturesFolder": "cypress/fixtures",
  "supportFile": "cypress/support/index.js",
  "video": true,
  "screenshotOnRunFailure": true,
  "defaultCommandTimeout": 10000,
  "env": {
    "dhis2BaseUrl": "https://play.dhis2.org/2.40.4",
    "dhis2Username": "admin",
    "dhis2Password": "district"
  }
}
\`\`\`

### Cypress Commands (cypress/support/commands.js)
\`\`\`javascript
Cypress.Commands.add('loginToDHIS2', (username, password) => {
  cy.request({
    method: 'POST',
    url: \`\${Cypress.env('dhis2BaseUrl')}/api/auth/login\`,
    body: { username, password }
  }).then((resp) => {
    window.localStorage.setItem('dhis2.auth', JSON.stringify(resp.body));
  });
});
\`\`\``;

    case 'playwright':
      return `### Playwright Configuration (playwright.config.ts)
\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm start',
    port: 3000,
  },
});
\`\`\``;

    default:
      return '### Custom Test Configuration\n```javascript\n// Add your configuration here\n```';
  }
}

function generateUnitTestExamples(): string {
  return `
## Unit Test Examples

### Component Testing
\`\`\`javascript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDataQuery } from '@dhis2/app-runtime';
import MyComponent from './MyComponent';

jest.mock('@dhis2/app-runtime');

describe('MyComponent', () => {
  beforeEach(() => {
    useDataQuery.mockReturnValue({
      loading: false,
      error: null,
      data: { dataElements: [] }
    });
  });

  it('renders without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByText('My Component')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    useDataQuery.mockReturnValue({
      loading: true,
      error: null,
      data: null
    });

    render(<MyComponent />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const error = new Error('API Error');
    useDataQuery.mockReturnValue({
      loading: false,
      error,
      data: null
    });

    render(<MyComponent />);
    expect(screen.getByText('Error: API Error')).toBeInTheDocument();
  });
});
\`\`\`

### Utility Function Testing
\`\`\`javascript
import { formatDate, validateEmail } from './utils';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      expect(formatDate('2023-12-01')).toBe('December 1, 2023');
    });

    it('handles invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid Date');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
\`\`\``;
}

function generateIntegrationTestExamples(): string {
  return `
## Integration Test Examples

### API Integration Testing
\`\`\`javascript
import { render, screen, waitFor } from '@testing-library/react';
import { DataProvider } from '@dhis2/app-runtime';
import nock from 'nock';
import App from './App';

const mockConfig = {
  baseUrl: 'https://test.dhis2.org',
  apiVersion: 40
};

describe('App Integration', () => {
  beforeEach(() => {
    nock('https://test.dhis2.org')
      .get('/api/dataElements')
      .reply(200, {
        dataElements: [
          { id: '1', displayName: 'Test Element', valueType: 'NUMBER' }
        ]
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('loads and displays data from API', async () => {
    render(
      <DataProvider config={mockConfig}>
        <App />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Element')).toBeInTheDocument();
    });
  });
});
\`\`\`

### Form Submission Integration
\`\`\`javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateDataElementForm from './CreateDataElementForm';

describe('CreateDataElementForm Integration', () => {
  it('submits form data successfully', async () => {
    const onSubmit = jest.fn();
    render(<CreateDataElementForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Name'), 'Test Element');
    await userEvent.selectOptions(screen.getByLabelText('Value Type'), 'NUMBER');
    
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Element',
        valueType: 'NUMBER'
      });
    });
  });
});
\`\`\``;
}

function generateE2ETestExamples(framework: string): string {
  switch (framework) {
    case 'cypress':
      return `
## Cypress E2E Test Examples

### User Journey Testing
\`\`\`javascript
describe('Data Element Management', () => {
  beforeEach(() => {
    cy.loginToDHIS2('admin', 'district');
    cy.visit('/');
  });

  it('creates a new data element', () => {
    cy.get('[data-test="create-button"]').click();
    cy.get('[data-test="name-input"]').type('Test Data Element');
    cy.get('[data-test="value-type-select"]').select('NUMBER');
    cy.get('[data-test="save-button"]').click();
    
    cy.get('[data-test="success-message"]')
      .should('contain', 'Data element created successfully');
  });

  it('filters data elements by name', () => {
    cy.get('[data-test="search-input"]').type('population');
    cy.get('[data-test="data-element-row"]')
      .should('have.length.greaterThan', 0)
      .each(($row) => {
        cy.wrap($row).should('contain.text', 'population');
      });
  });
});
\`\`\``;

    case 'playwright':
      return `
## Playwright E2E Test Examples

### User Journey Testing
\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Data Element Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login to DHIS2
    await page.goto('/login');
    await page.fill('[data-test="username"]', 'admin');
    await page.fill('[data-test="password"]', 'district');
    await page.click('[data-test="login-button"]');
    await page.waitForURL('/');
  });

  test('creates a new data element', async ({ page }) => {
    await page.click('[data-test="create-button"]');
    await page.fill('[data-test="name-input"]', 'Test Data Element');
    await page.selectOption('[data-test="value-type-select"]', 'NUMBER');
    await page.click('[data-test="save-button"]');
    
    await expect(page.locator('[data-test="success-message"]'))
      .toContainText('Data element created successfully');
  });

  test('validates form input', async ({ page }) => {
    await page.click('[data-test="create-button"]');
    await page.click('[data-test="save-button"]');
    
    await expect(page.locator('[data-test="name-error"]'))
      .toContainText('Name is required');
  });
});
\`\`\``;

    default:
      return `
## E2E Test Examples
\`\`\`javascript
// Add E2E tests for your chosen framework
\`\`\``;
  }
}

function generateVisualTestExamples(): string {
  return `
## Visual Testing Examples

### Chromatic Integration
\`\`\`javascript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
};
\`\`\`

### Component Stories
\`\`\`javascript
// MyComponent.stories.js
import MyComponent from './MyComponent';

export default {
  title: 'Example/MyComponent',
  component: MyComponent,
};

export const Default = {
  args: {
    title: 'Default Component',
  },
};

export const Loading = {
  args: {
    title: 'Loading Component',
    loading: true,
  },
};

export const Error = {
  args: {
    title: 'Error Component',
    error: new Error('Something went wrong'),
  },
};
\`\`\`

### Visual Regression Testing
\`\`\`bash
# Install Chromatic
npm install --save-dev chromatic

# Add to package.json scripts
{
  "scripts": {
    "chromatic": "chromatic --project-token=your-project-token"
  }
}

# Run visual tests
npm run chromatic
\`\`\``;
}

function generateMockConfiguration(mockSetup: any): string {
  return `
## Mock Configuration

${mockSetup.dhis2Api ? `
### DHIS2 API Mocks
\`\`\`javascript
// __mocks__/@dhis2/app-runtime.js
export const useDataQuery = jest.fn();
export const useDataMutation = jest.fn();
export const useAlert = jest.fn(() => ({ show: jest.fn() }));

// Test helpers
export const mockDataQuery = (loading = false, error = null, data = null) => {
  useDataQuery.mockReturnValue({ loading, error, data });
};

export const mockDataMutation = (loading = false, error = null) => {
  const mutate = jest.fn();
  useDataMutation.mockReturnValue([mutate, { loading, error }]);
  return mutate;
};
\`\`\`
` : ''}

${mockSetup.dataStore ? `
### DataStore Mocks
\`\`\`javascript
// __mocks__/dataStore.js
const dataStoreData = {};

export const mockDataStore = {
  get: jest.fn((namespace, key) => 
    Promise.resolve(dataStoreData[\`\${namespace}.\${key}\`])
  ),
  set: jest.fn((namespace, key, value) => {
    dataStoreData[\`\${namespace}.\${key}\`] = value;
    return Promise.resolve();
  }),
  delete: jest.fn((namespace, key) => {
    delete dataStoreData[\`\${namespace}.\${key}\`];
    return Promise.resolve();
  })
};
\`\`\`
` : ''}

${mockSetup.authentication ? `
### Authentication Mocks
\`\`\`javascript
// __mocks__/auth.js
export const mockAuth = {
  isAuthenticated: true,
  user: {
    id: 'test-user-id',
    username: 'testuser',
    displayName: 'Test User',
    authorities: ['ALL']
  },
  login: jest.fn(() => Promise.resolve()),
  logout: jest.fn(() => Promise.resolve())
};

// Mock current user endpoint
nock('https://test.dhis2.org')
  .persist()
  .get('/api/me')
  .reply(200, mockAuth.user);
\`\`\`
` : ''}
`;
}