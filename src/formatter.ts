import format from 'xml-formatter';
import { AudioSaladXML } from './types/AudioSaladXML';

export const formatXml = (xml: AudioSaladXML): AudioSaladXML => format(xml, {
    collapseContent: true,
    indentation: '    ',
});
