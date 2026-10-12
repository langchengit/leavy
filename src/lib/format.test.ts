import { formatDistance, formatMinutes } from './format';

describe('formatMinutes', () => {
  it('formats minutes under an hour', () => {
    expect(formatMinutes(20)).toBe('20 min');
  });

  it('formats exact hours', () => {
    expect(formatMinutes(60)).toBe('1 h');
  });

  it('formats hours and remaining minutes', () => {
    expect(formatMinutes(95)).toBe('1 h 35 min');
  });

  it('clamps negative values to 0 min', () => {
    expect(formatMinutes(-10)).toBe('0 min');
  });

  it('formats zero minutes as 0 min', () => {
    expect(formatMinutes(0)).toBe('0 min');
  });
});

describe('formatDistance', () => {
  it('returns null when distance is undefined', () => {
    expect(formatDistance(undefined)).toBeNull();
  });

  it('formats distances under 1000 m in meters', () => {
    expect(formatDistance(950)).toBe('950 m');
  });

  it('formats distances of 1000 m or more in kilometers with one decimal', () => {
    expect(formatDistance(9100)).toBe('9.1 km');
  });
});
