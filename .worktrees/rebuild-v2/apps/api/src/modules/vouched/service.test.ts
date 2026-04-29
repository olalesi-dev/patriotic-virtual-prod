import { describe, expect, it } from 'bun:test';
import { fetchVouchedJob } from './service';

describe('Vouched service', () => {
  describe('fetchVouchedJob', () => {
    it('fetches the canonical Vouched job by id', async () => {
      const requests: { url: string; apiKey: string | null }[] = [];
      const fetcher = async (url: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        requests.push({
          apiKey: headers.get('X-Api-Key'),
          url: String(url),
        });

        return Response.json({
          id: 'job_123',
          status: 'completed',
        });
      };

      await expect(
        fetchVouchedJob('job_123', { apiKey: 'private_key', fetcher }),
      ).resolves.toMatchObject({
        id: 'job_123',
        status: 'completed',
      });

      expect(requests).toEqual([
        {
          apiKey: 'private_key',
          url: 'https://verify.vouched.id/api/jobs/job_123',
        },
      ]);
    });
  });
});
