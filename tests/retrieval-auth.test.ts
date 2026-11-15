import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let mockUserId: string | null = null;

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: mockUserId })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => ({
        primaryEmailAddress: { emailAddress: 'user@example.com' },
        publicMetadata: {},
      })),
    },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  createSystemLog: vi.fn(),
  default: {},
}));

describe('KRA Retrieval Authentication Gate', () => {
  beforeEach(() => {
    mockUserId = null;
  });

  it('rejects unauthenticated search requests with HTTP 401 and requiresAuth flag', async () => {
    const { POST } = await import('@/app/api/kra/retrieve/route');

    // Emulate production runtime check
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    try {
      const req = new NextRequest('https://akubrecah.com/api/kra/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idNumber: '12345678', captchaAnswer: '15' }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.requiresAuth).toBe(true);
      expect(data.error).toContain('Authentication required');
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });
});
