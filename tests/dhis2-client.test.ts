import { DHIS2Client } from '../src/dhis2-client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DHIS2Client', () => {
  let client: DHIS2Client;
  const baseUrl = 'https://test.dhis2.org';
  const username = 'testuser';
  const password = 'testpass';

  beforeEach(() => {
    client = new DHIS2Client(baseUrl, username, password);
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create DHIS2Client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${baseUrl}/api`,
        auth: {
          username,
          password,
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithTrailingSlash = new DHIS2Client('https://test.dhis2.org/', username, password);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://test.dhis2.org/api',
        })
      );
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith('/me');
    });

    it('should throw error on failed connection', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.testConnection()).rejects.toThrow('Failed to connect to DHIS2: Error: Network error');
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', async () => {
      const mockSystemInfo = {
        version: '2.40.4',
        revision: 'abc123',
        buildTime: '2023-01-01',
        serverDate: '2023-12-01',
        instanceName: 'Test Instance'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockSystemInfo });

      const result = await client.getSystemInfo();

      expect(result).toEqual(mockSystemInfo);
      expect(mockedAxios.get).toHaveBeenCalledWith('/system/info');
    });
  });

  describe('getDataElements', () => {
    it('should return data elements with default parameters', async () => {
      const mockDataElements = {
        dataElements: [
          {
            id: 'test1',
            name: 'Test Data Element 1',
            valueType: 'NUMBER',
            domainType: 'AGGREGATE'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockDataElements });

      const result = await client.getDataElements();

      expect(result).toEqual(mockDataElements);
      expect(mockedAxios.get).toHaveBeenCalledWith('/dataElements', {
        params: {
          fields: 'id,name,displayName,shortName,code,valueType,domainType',
          filter: undefined,
          paging: false,
          pageSize: 50,
        },
      });
    });

    it('should accept custom parameters', async () => {
      const params = {
        fields: 'id,name',
        filter: 'name:ilike:test',
        pageSize: 10,
        paging: true
      };

      const mockDataElements = { dataElements: [] };
      mockedAxios.get.mockResolvedValueOnce({ data: mockDataElements });

      await client.getDataElements(params);

      expect(mockedAxios.get).toHaveBeenCalledWith('/dataElements', {
        params,
      });
    });
  });

  describe('createDataElement', () => {
    it('should create a new data element', async () => {
      const newDataElement = {
        name: 'New Data Element',
        shortName: 'New DE',
        valueType: 'NUMBER' as const,
        domainType: 'AGGREGATE' as const,
        aggregationType: 'SUM' as const
      };

      const mockResponse = { status: 'SUCCESS', uid: 'newuid123' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await client.createDataElement(newDataElement);

      expect(result).toEqual(mockResponse);
      expect(mockedAxios.post).toHaveBeenCalledWith('/dataElements', newDataElement);
    });
  });

  describe('getPrograms', () => {
    it('should return programs with default parameters', async () => {
      const mockPrograms = {
        programs: [
          {
            id: 'prog1',
            name: 'Test Program',
            programType: 'WITH_REGISTRATION'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockPrograms });

      const result = await client.getPrograms();

      expect(result).toEqual(mockPrograms);
      expect(mockedAxios.get).toHaveBeenCalledWith('/programs', {
        params: {
          fields: 'id,name,displayName,shortName,code,description,programType,trackedEntityType[id,name],programStages[id,name,sortOrder],organisationUnits[id,name]',
          filter: undefined,
          paging: false,
          pageSize: 50,
        },
      });
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data', async () => {
      const query = {
        dimension: 'dx:dataElement1',
        filter: 'pe:2023',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const mockAnalytics = { rows: [], headers: [], metaData: {} };
      mockedAxios.get.mockResolvedValueOnce({ data: mockAnalytics });

      const result = await client.getAnalytics(query);

      expect(result).toEqual(mockAnalytics);
      expect(mockedAxios.get).toHaveBeenCalledWith('/analytics', { params: query });
    });

    it('should handle empty query parameters', async () => {
      const mockAnalytics = { rows: [], headers: [], metaData: {} };
      mockedAxios.get.mockResolvedValueOnce({ data: mockAnalytics });

      await client.getAnalytics({});

      expect(mockedAxios.get).toHaveBeenCalledWith('/analytics', { params: {} });
    });
  });

  describe('error handling', () => {
    it('should handle axios errors properly', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.getSystemInfo()).rejects.toThrow('Failed to get system info: Error: API Error');
    });
  });
});