# audiosalad-xml

Slingshot uses AudioSalad to power our delivery process. This library adapts AudioSalad's custom XML specification to a JavaScript- and TypeScript-friendly form, providing classes that easily allow you to generate AudioSalad-compatible XML for releases, tracks, and more.

Install the package to get started:
> npm install @ssh/audiosalad-xml --save

## Basic Usage
Create a new [Release](https://slingshot.github.io/audiosalad-xml/classes/Release) with relevant fields. Call [.xml()](https://slingshot.github.io/audiosalad-xml/classes/Release.html#xml) on a `Release` (or other objects, as per docs) to generate AudioSalad-compatible XML.

See detailed docs at [slingshot.github.io/audiosalad-xml](https://slingshot.github.io/audiosalad-xml/).
