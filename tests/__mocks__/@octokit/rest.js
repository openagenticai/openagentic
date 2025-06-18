// Mock implementation of @octokit/rest for Jest tests
class MockOctokit {
  constructor(options = {}) {
    this.auth = options.auth;
    this.rest = {
      repos: {
        getContent: jest.fn().mockResolvedValue({
          data: {
            name: 'mock-file.txt',
            path: 'mock-file.txt',
            size: 100,
            content: Buffer.from('mock content').toString('base64'),
            encoding: 'base64',
            sha: 'mock-sha',
            download_url: 'https://example.com/mock-file.txt',
            html_url: 'https://github.com/owner/repo/blob/main/mock-file.txt'
          }
        })
      }
    };
  }
}

module.exports = {
  Octokit: MockOctokit
}; 