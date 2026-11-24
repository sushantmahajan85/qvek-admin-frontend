import { describe, expect, it } from 'vitest';
import {
  isIopId,
  isVehicleIdentifier,
  sanitizeIopIdInput,
  sanitizeVehicleIdentifierInput,
  vehicleIdentifierError,
} from './identifiers';

describe('vehicle identifiers', () => {
  it('rejects special-character-only values (Admin_Bug06)', () => {
    expect(isVehicleIdentifier('???????')).toBe(false);
    expect(isVehicleIdentifier('---------------------')).toBe(false);
    expect(sanitizeVehicleIdentifierInput('???????')).toBe('');
    expect(sanitizeVehicleIdentifierInput('---------------------')).toBe('---------------------');
    expect(vehicleIdentifierError('---------------------', 1, false)).toBeTruthy();
    expect(isIopId('********************')).toBe(false);
    expect(sanitizeIopIdInput('********************')).toBe('');
  });

  it('accepts fleet ids', () => {
    expect(isVehicleIdentifier('QVEK-003')).toBe(true);
    expect(isIopId('868720065959201')).toBe(true);
    expect(isIopId('IOP-10001')).toBe(true);
  });
});