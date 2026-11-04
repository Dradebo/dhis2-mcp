import { AuditLogger } from '../src/audit-logger';

describe('Audit stdio safety', () => {
  it('never writes audit diagnostics to protocol stdout', () => {
    const stdout = jest.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const logger = new AuditLogger();
      logger.log({ toolName: 'test', parameters: {}, outcome: 'success' });
      logger.clear();
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).toHaveBeenCalledTimes(2);
    } finally { stdout.mockRestore(); stderr.mockRestore(); }
  });
});
