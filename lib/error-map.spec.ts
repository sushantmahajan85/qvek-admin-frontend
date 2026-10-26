import { describe, expect, it } from 'vitest';
import { errorText } from './error-map';

describe('errorText', () => {
  it('maps known codes with the code appended for triage', () => {
    expect(errorText('VEHICLE_TAKEN')).toContain('already assigned');
    expect(errorText('VEHICLE_TAKEN')).toContain('VEHICLE_TAKEN');
  });

  it('falls back with the code for unknown errors', () => {
    expect(errorText('SOMETHING_NEW')).toBe('Request failed (SOMETHING_NEW)');
  });

  it('uses the fallback when codeless', () => {
    expect(errorText(undefined)).toBe('Request failed');
    expect(errorText(undefined, 'Try again')).toBe('Try again');
  });
});
