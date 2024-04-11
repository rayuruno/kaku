import { parseSVG, makeSVGPathCommandsAbsolute } from './parser.js';

const index = await fetch("./data/kvg-index.json").then(r => r.json());

export function loadAndParseFromChar(char) {
  let kvg = index[char];
  if (!kvg) {
    return null;
  }

  return loadSVG(kvg).then(svgStr => {
      // const widthHeightRegex = /<svg(?:\s+[^<>]+)?\swidth="([^"]+)" height="([^"]+)"/g;
      // let match = widthHeightRegex.exec(svgStr);
      // let width = parseFloat(match[1]);
      // let height = parseFloat(match[2]);
      let width = 109, height = 109;
      return parseSVGString(svgStr).map(paths => normalize(makeSVGPathCommandsAbsolute(paths), width, height));
  });
}

function loadSVG(kvg) {
  return fetch(`./data/kanji/${kvg[0]}`).then(r => r.text());
}

function parseSVGString(svgStr) {
    const paths = [];

    // Regular expression to match 'd' attribute values
    const dAttributeRegex = /<path(?:\s+[^<>]+)?\sd="([^"]+)"/g;

    let match;
    while ((match = dAttributeRegex.exec(svgStr)) !== null) {
        const d = match[1];
        paths.push(parseSVG(d));
    }

    return paths;
}

function normalize(paths, width, height) {
    return paths.map(path => Object.fromEntries(Object.entries(path).map(([k, v]) => {
        switch(k[0]) {
        case 'x':
            v = 2.0 * v / width - 1.0;
            // v = (2 * v - width) / height;
            break;
        case 'y':
            v = 1.0 - 2.0 * v / height;
            // v = (2 * v - height) / height;
            break;
        }
        return [k, v];
    })))
}
