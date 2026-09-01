import { describe, expect, test } from 'bun:test';

describe('module loading', () => {
    test('the public barrel loads without a value/type export error', async () => {
        const mod = await import('../src/index');
        expect(mod).toBeDefined();
    });

    test('every named export is defined', async () => {
        const mod = (await import('../src/index')) as Record<string, unknown>;
        const names = Object.keys(mod).filter((k) => k !== 'default');
        expect(names.length).toBeGreaterThan(0);
        for (const name of names) {
            expect(mod[name]).toBeDefined();
        }
    });
});
