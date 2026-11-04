import axios from 'axios';
import { DHIS2Client } from '../src/dhis2-client';
jest.mock('axios');

describe('DHIS2 credential transport', () => {
  it('disables redirects and bounds request and response memory', () => {
    new DHIS2Client('https://example.org', 'fixture-user', 'fixture-secret');
    expect(axios.create).toHaveBeenLastCalledWith(expect.objectContaining({
      maxRedirects: 0,
      maxContentLength: 32 * 1024 * 1024,
      maxBodyLength: 32 * 1024 * 1024,
    }));
  });
  it.each(['http://example.org', 'data:text/plain,unsafe', 'https://embedded:credential@example.org'])('rejects unsafe instance URL %s before creating a transport', baseUrl => {
    jest.mocked(axios.create).mockClear();
    expect(() => new DHIS2Client(baseUrl, 'fixture-user', 'fixture-secret')).toThrow();
    expect(axios.create).not.toHaveBeenCalled();
  });
});
