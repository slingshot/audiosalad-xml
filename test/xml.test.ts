import { validateXMLWithXSD } from 'validate-with-xmllint';
import { Release } from '../src';

describe('xml-validation', () => {
    const release = Release.sample().xml();
    it('works', () => {
        expect(release).toBeTruthy();
    });
    test('isValid', async () => {
        await expect(await validateXMLWithXSD(release, `${__dirname}/audiosalad_xsd_v3-2.xsd`)).resolves;
    });
});
