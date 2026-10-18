import { describe, expect, it } from 'vitest';
import { allowedAppOrigin, portableOperationSchema, validServiceUrl } from '@/lib/portable-contract';
describe('Portable administration authorization contracts', () => {
  it('allows local computer and Android origins but rejects third-party sites', () => {
    expect(allowedAppOrigin('http://localhost:18765')).toBe(true);
    expect(allowedAppOrigin('https://localhost')).toBe(true);
    expect(allowedAppOrigin('capacitor://localhost')).toBe(true);
    expect(allowedAppOrigin('https://attacker.example')).toBe(false);
    expect(allowedAppOrigin(null)).toBe(false);
  });
  it('permits changing the service host without embedding credentials', () => {
    expect(validServiceUrl('https://new-admin.example')).toBe(true);
    expect(validServiceUrl('http://new-admin.example')).toBe(false);
    expect(validServiceUrl('https://user:password@new-admin.example')).toBe(false);
  });
  it('rejects manual replies over the existing 4000 character limit', () => {
    const input = { operation: 'reply', conversationId: '00000000-0000-4000-8000-000000000001', text: 'x'.repeat(4000) };
    expect(portableOperationSchema.safeParse(input).success).toBe(true);
    expect(portableOperationSchema.safeParse({ ...input, text: 'x'.repeat(4001) }).success).toBe(false);
  });
});