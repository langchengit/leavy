import { formatDistance, formatMinutes } from './format';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ regionCode: 'CN' }],
}));

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

  it('formats distances under 1000 m in meters for metric regions', () => {
    expect(formatDistance(950, 'CN')).toBe('950 m');
  });

  it('formats distances of 1000 m or more in kilometers with one decimal for metric regions', () => {
    expect(formatDistance(9100, 'CN')).toBe('9.1 km');
  });

  it.each(['US', 'GB'])('uses feet below 0.1 miles in %s', (region) => {
    expect(formatDistance(150, region)).toBe('492 ft');
  });

  it.each(['US', 'GB'])('uses miles at and above 0.1 miles in %s', (region) => {
    expect(formatDistance(161, region)).toBe('0.1 mi');
    expect(formatDistance(9100, region)).toBe('5.7 mi');
  });

  it('keeps an unspecified region metric', () => {
    expect(formatDistance(9100)).toBe('9.1 km');
  });
});
