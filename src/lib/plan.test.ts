import { STATUS_LABEL, timingFor } from './plan';
import type { Trip } from '../types';

function makeTrip(overrides?: Partial<Trip>): Trip {
  const start = new Date('2026-10-13T10:00:00Z');
  const end = new Date('2026-10-13T11:00:00Z');
  const graceMin = 10;
  const arriveBy = new Date(start.getTime() - graceMin * 60_000); // 09:50:00Z
  const durationSec = 1800; // 30 minutes
  const leaveBy = new Date(arriveBy.getTime() - durationSec * 1000); // 09:20:00Z

  return {
    event: {
      key: 'event-test-1',
      title: 'Design Review',
      start,
      end,
      location: '123 Main St',
    },
    mode: 'drive',
    graceMin,
    arriveBy,
    notify: true,
    route: {
      durationSec,
      leaveBy,
    },
    ...overrides,
  };
}

describe('timingFor leave-time status logic', () => {
  it('returns unknown status and "No estimate" when trip has no route', () => {
    const trip = makeTrip({ route: undefined });
    const now = new Date('2026-10-13T09:00:00Z').getTime();
    const timing = timingFor(trip, now);

    expect(timing.status).toBe('unknown');
    expect(STATUS_LABEL[timing.status]).toBe('No estimate');
    expect(timing.minToLeave).toBe(0);
    expect(timing.lateByMin).toBe(0);
  });

  it('returns relaxed status and "On track" when more than 15 minutes before leaveBy', () => {
    const trip = makeTrip();
    // leaveBy is 09:20:00Z; 20 minutes before leaveBy is 09:00:00Z
    const now = new Date('2026-10-13T09:00:00Z').getTime();
    const timing = timingFor(trip, now);

    expect(timing.status).toBe('relaxed');
    expect(STATUS_LABEL[timing.status]).toBe('On track');
    expect(timing.minToLeave).toBe(20);
    expect(timing.lateByMin).toBe(0);
  });

  it('returns soon status and "Leave soon" when within 15 minutes of leaveBy', () => {
    const trip = makeTrip();
    // leaveBy is 09:20:00Z; 10 minutes before leaveBy is 09:10:00Z
    const now = new Date('2026-10-13T09:10:00Z').getTime();
    const timing = timingFor(trip, now);

    expect(timing.status).toBe('soon');
    expect(STATUS_LABEL[timing.status]).toBe('Leave soon');
    expect(timing.minToLeave).toBe(10);
    expect(timing.lateByMin).toBe(0);
  });

  it('returns now status and "Leave now" when past leaveBy but still inside grace period', () => {
    const trip = makeTrip();
    // leaveBy is 09:20:00Z. At 09:25:00Z (5 minutes past leaveBy),
    // arrival if leaving now is 09:25 + 30m = 09:55:00Z, which is before event start at 10:00:00Z
    const now = new Date('2026-10-13T09:25:00Z').getTime();
    const timing = timingFor(trip, now);

    expect(timing.status).toBe('now');
    expect(STATUS_LABEL[timing.status]).toBe('Leave now');
    expect(timing.minToLeave).toBe(-5);
    expect(timing.lateByMin).toBe(0);
  });

  it('returns late status and "Running late" when leaving now would arrive after event start', () => {
    const trip = makeTrip();
    // At 09:35:00Z, arrival if leaving now is 09:35 + 30m = 10:05:00Z (5 minutes after event start)
    const now = new Date('2026-10-13T09:35:00Z').getTime();
    const timing = timingFor(trip, now);

    expect(timing.status).toBe('late');
    expect(STATUS_LABEL[timing.status]).toBe('Running late');
    expect(timing.minToLeave).toBe(-15);
    expect(timing.lateByMin).toBe(5);
  });
});
