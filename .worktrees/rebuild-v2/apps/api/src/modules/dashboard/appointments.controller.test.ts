import { describe, expect, it } from 'bun:test';
import { BadRequestException } from '../../utils/errors';
import { mapDashboardAppointmentUpdateBody } from './appointments.controller';

describe('Dashboard appointment compatibility routes', () => {
  it('maps legacy reschedule payloads to canonical appointment updates', () => {
    expect(
      mapDashboardAppointmentUpdateBody({
        action: 'reschedule',
        date: '2026-05-12',
        time: '14:30',
        previousDate: '2026-05-11',
        previousTime: '13:00',
      }),
    ).toEqual({
      scheduledTime: '2026-05-12T14:30:00.000Z',
    });
  });

  it('maps legacy status payloads to canonical appointment updates', () => {
    expect(
      mapDashboardAppointmentUpdateBody({
        action: 'status',
        status: 'cancelled',
        reason: 'Patient requested cancellation',
      }),
    ).toEqual({
      status: 'cancelled',
      reason: 'Patient requested cancellation',
    });
  });

  it('rejects invalid legacy payloads', () => {
    expect(() => mapDashboardAppointmentUpdateBody({ action: 'reschedule' }))
      .toThrow(BadRequestException);
  });
});
