import { describe, expect, it, spyOn, mock, afterEach } from 'bun:test';
import { ProtocolsService } from './protocols.service';
import { db } from '../../db';

describe('ProtocolsService', () => {
  const service = new ProtocolsService();

  afterEach(() => {
    mock.restore();
  });

  it('getProtocols should return list of protocols', async () => {
    const mockSelect = (val: any) => {
      const result = {
        from: mock(() => result),
        where: mock(() => result),
        orderBy: mock(() => Promise.resolve(val)),
      };
      return result as any;
    };

    spyOn(db, 'select').mockImplementationOnce(() => mockSelect([
      { id: '1', title: 'Intake Protocol', type: 'Clinical' }
    ]));

    const protocols = await service.getProtocols('org-1');
    expect(protocols.length).toBe(1);
    expect(protocols[0].title).toBe('Intake Protocol');
  });
});
