import { 
  generateUIComponents,
  generateUIFormPatterns,
  generateUIDataDisplayPatterns,
  generateUINavigationLayout,
  generateDesignSystemConfig
} from '../src/webapp-generators';

describe('UI Generators Phase 4 Functionality', () => {
  describe('generateUIComponents', () => {
    it('should generate form component with validation', () => {
      const args = {
        componentType: 'form',
        componentName: 'UserForm',
        features: {
          validation: true,
          responsive: true
        },
        dataIntegration: {
          useDataQuery: true,
          apiEndpoint: 'users'
        },
        styling: {
          theme: 'default'
        }
      };

      const result = generateUIComponents(args);
      
      expect(result).toContain('UserForm');
      expect(result).toContain('@dhis2/ui');
      expect(result).toContain('validation');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(100);
    });

    it('should generate table component with pagination', () => {
      const args = {
        componentType: 'table',
        componentName: 'DataTable',
        features: {
          pagination: true,
          search: true,
          export: true
        }
      };

      const result = generateUIComponents(args);
      
      expect(result).toContain('DataTable');
      expect(result).toContain('DataTable');
      expect(result).toContain('PAGINATION');
    });
  });

  describe('generateUIFormPatterns', () => {
    it('should generate comprehensive form patterns', () => {
      const args = {
        componentName: 'ComprehensiveForm',
        includeValidation: true,
        includeDatePicker: true,
        includeFileUpload: true,
        includeMultiSelect: true,
        i18n: true,
        rtl: true,
        accessibility: true,
        density: 'comfortable'
      };

      const result = generateUIFormPatterns(args);
      
      expect(result).toContain('ComprehensiveForm');
      expect(result).toContain('@dhis2/ui');
      expect(result).toContain('DatePicker');
      expect(result).toContain('FileInput');
      expect(result).toContain('MultiSelect');
      expect(result).toContain('validation');
      expect(result).toContain('validation');
    });
  });

  describe('generateUIDataDisplayPatterns', () => {
    it('should generate data display components', () => {
      const args = {
        componentName: 'DataDisplay',
        includeTable: true,
        includeCards: true,
        includeModal: true,
        includePagination: true,
        sorting: true,
        selection: true
      };

      const result = generateUIDataDisplayPatterns(args);
      
      expect(result).toContain('DataDisplay');
      expect(result).toContain('@dhis2/ui');
      expect(result).toContain('DataTable');
      expect(result).toContain('Card');
      expect(result).toContain('Modal');
    });
  });

  describe('generateUINavigationLayout', () => {
    it('should generate navigation components', () => {
      const args = {
        componentName: 'AppNavigation',
        includeHeaderBar: true,
        includeSidebar: true,
        includeBreadcrumbs: true,
        includeTabs: true,
        includeResponsive: true,
        rtl: true
      };

      const result = generateUINavigationLayout(args);
      
      expect(result).toContain('AppNavigation');
      expect(result).toContain('@dhis2/ui');
      expect(result).toContain('HeaderBar');
      expect(result).toContain('Menu');
      expect(result).toContain('Breadcrumbs');
      expect(result).toContain('TabBar');
    });
  });

  describe('generateDesignSystemConfig', () => {
    it('should generate design system configuration', () => {
      const args = {
        theme: 'custom',
        palette: {
          primary: '#1976d2',
          secondary: '#dc004e'
        },
        typography: {
          fontFamily: 'Roboto, sans-serif',
          scale: [12, 14, 16, 20, 24, 32]
        },
        spacing: [4, 8, 16, 24, 32],
        density: 'comfortable',
        enableDarkMode: true,
        rtl: true
      };

      const result = generateDesignSystemConfig(args);
      
      expect(result).toContain('Design System Configuration');
      expect(result).toContain('CSS Variables');
      expect(result).toContain('#1976d2');
      expect(result).toContain('Roboto');
      expect(result).toContain('Theme Tokens');
      expect(result).toContain('CSS Variables');
    });
  });

  describe('comprehensive integration', () => {
    it('should generate complete UI implementation', () => {
      // Test that all generators work together
      const componentResult = generateUIComponents({
        componentType: 'dashboard',
        componentName: 'MainDashboard',
        features: { responsive: true }
      });

      const formResult = generateUIFormPatterns({
        componentName: 'ConfigForm',
        includeValidation: true
      });

      const navigationResult = generateUINavigationLayout({
        componentName: 'AppLayout',
        includeHeaderBar: true
      });

      const designResult = generateDesignSystemConfig({
        theme: 'default',
        density: 'compact'
      });

      // All should generate valid content
      [componentResult, formResult, navigationResult, designResult].forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(50);
        expect(result.length).toBeGreaterThan(50);
      });
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle minimal configuration', () => {
      const result = generateUIComponents({
        componentType: 'form',
        componentName: 'MinimalForm'
      });

      expect(result).toContain('MinimalForm');
      expect(result).toContain('@dhis2/ui');
    });

    it('should handle empty features', () => {
      const result = generateUIFormPatterns({
        componentName: 'SimpleForm'
      });

      expect(result).toContain('SimpleForm');
      expect(result).toBeDefined();
    });
  });
});