import { describe, expect, it } from 'vitest';
import { formatRiderPhone, isRiderShellName, riderDisplayName } from './rider-display';

describe('rider display (Admin_Bug09)', () => {
  it('formats E.164 without double country code', () => {
    expect(formatRiderPhone('+919876543210')).toBe('+91 98765 43210');
  });

  it('uses real name when present', () => {
    expect(
      riderDisplayName({ name: 'Himanshu', phone: '+919876543210', kycInfo: null }),
    ).toBe('Himanshu');
  });

  it('hides phone-as-name shell rows', () => {
    expect(isRiderShellName('+919876543210', '+919876543210')).toBe(true);
    expect(riderDisplayName({ name: '+919876543210', phone: '+919876543210' })).toBe('Pending signup');
  });
});