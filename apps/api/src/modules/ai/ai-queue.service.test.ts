import { describe, expect, it, spyOn, mock, afterEach } from 'bun:test';
import { AiQueueService } from './ai-queue.service';
import { db } from '../../db';

describe('AiQueueService', () => {
  const service = new AiQueueService();

  afterEach(() => {
    mock.restore();
  });

  it('getQueue should return joined clinical suggestions', async () => {
    const mockSelect = (val: any) => {
      const result = {
        from: mock(() => result),
        innerJoin: mock(() => result),
        where: mock(() => result),
        orderBy: mock(() => Promise.resolve(val)),
      };
      return result as any;
    };

    spyOn(db, 'select').mockImplementationOnce(() => mockSelect([
      { id: '1', type: 'Lab Insight', patientName: 'Wendy Smith', suggestion: 'Suggest HBA1C', status: 'Pending Review' }
    ]));

    const queue = await service.getQueue('org-1');
    expect(queue.length).toBe(1);
    expect(queue[0].patientName).toBe('Wendy Smith');
  });
});
