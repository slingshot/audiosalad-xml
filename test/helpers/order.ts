import { expect } from 'bun:test';

/**
 * Asserts that `elements` appear in `xml` in exactly the given order.
 *
 * The guard on `-1` is the point: `String.indexOf` returns -1 for a missing
 * element, and -1 sorts first, so a naive "is the position array ascending?"
 * check stays green when a leading element vanishes entirely — precisely the
 * defect class this library exists to prevent.
 */
export const expectXsdOrder = (xml: string, elements: readonly string[]): void => {
    const positions = elements.map((el) => {
        const at = xml.indexOf(`<${el}>`);
        expect(at, `<${el}> is missing from the output`).toBeGreaterThan(-1);
        return at;
    });
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
};
