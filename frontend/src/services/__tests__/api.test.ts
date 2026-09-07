import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env vars trước khi import api (api.ts đọc env lúc module load)
vi.stubEnv('VITE_API_GATEWAY_URL', 'https://mock-api.execute-api.ap-southeast-1.amazonaws.com/dev');

import api from '../api';
import { fetchAuthSession } from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct default config', () => {
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.timeout).toBe(15000);
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('request interceptor adds Bearer token if session exists', async () => {
    const mockToken = 'mock-token-123';
    vi.mocked(fetchAuthSession).mockResolvedValue({
      tokens: {
        idToken: { toString: () => mockToken, payload: {} },
      },
    } as any);

    const interceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} } as any;
    
    const result = await interceptor(config);
    expect(result.headers.Authorization).toBe(`Bearer ${mockToken}`);
  });

  it('request interceptor handles no token gracefully', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({} as any);

    const interceptor = (api.interceptors.request as any).handlers[0].fulfilled;
    const config = { headers: {} } as any;
    
    const result = await interceptor(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('response interceptor redirects on 401', async () => {
    const interceptor = (api.interceptors.response as any).handlers[0].rejected;
    const error = { response: { status: 401 } };
    
    // Test the redirect behavior by mocking window location
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    await expect(interceptor(error)).rejects.toEqual(error);
    expect(window.location.href).toBe('/login');
  });

  it('response interceptor passes other errors through', async () => {
    const interceptor = (api.interceptors.response as any).handlers[0].rejected;
    const error = { response: { status: 500 } };
    
    await expect(interceptor(error)).rejects.toEqual(error);
  });
});
