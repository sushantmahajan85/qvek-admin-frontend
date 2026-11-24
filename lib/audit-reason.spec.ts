import { describe, expect, it } from 'vitest';
import { auditReasonError, isAuditReason } from './audit-reason';

describe('audit reason (Admin_Bug08)', () => {
  it('rejects numbers-only and punctuation-only', () => {
    expect(isAuditReason('4554889669999')).toBe(false);
    expect(isAuditReason('????')).toBe(false);
    expect(auditReasonError('4554889669999')).toBeTruthy();
    expect(auditReasonError('????')).toBeTruthy();
  });

  it('accepts descriptive text', () => {
    expect(isAuditReason('Rider unreachable for 3 days')).toBe(true);
    expect(isAuditReason('Returned to hub — damage check')).toBe(true);
  });
});