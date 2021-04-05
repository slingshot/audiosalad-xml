import { Release } from '../src';
import fs from 'fs';

const expectedOutput = fs.readFileSync('./test/expectedOutput.xml').toString();

describe('xml-validation', () => {
    const release = Release.sample().xml();
    it('works', () => {
        expect(release).toEqual(expectedOutput);
    });
});
