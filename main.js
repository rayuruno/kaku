import { Renderer, Camera, Orbit, Transform, Polyline, Mesh, Curve, Vec3, Color, Program } from 'https://unpkg.com/ogl';
import { loadAndParseFromChar } from "/kanji.js";

// setup
let renderer, gl, camera, scene;

const colSize = 2.0;
const rowSize = 2.0;
const speed = 1.4;

let controls, col, row, lines, pct, timer;

window.addEventListener('resize', resize, false);
window.addEventListener('kaku', () => {
  let k = document.querySelector('#t_kanji').value;
  write(k);
  location.hash = k;

})

// 千佳先生\nお誕生日\nおめでとう\nございます
// 千佳先生%0Aお誕生日%0Aおめでとう%0Aございます
// https://localhost:8090/#%E5%8D%83%E4%BD%B3%E5%85%88%E7%94%9F%0A%E3%81%8A%E8%AA%95%E7%94%9F%E6%97%A5%0A%E3%81%8A%E3%82%81%E3%81%A7%E3%81%A8%E3%81%86%0A%E3%81%94%E3%81%96%E3%81%84%E3%81%BE%E3%81%99
// https://localhost:8090/#千佳先生%0Aお誕生日%0Aおめでとう%0Aございます
let k = location.hash.substring(1);
if (k) {
  document.querySelector("#t_kanji").value = decodeURIComponent(k);
}

write(document.querySelector("#t_kanji").value);

document.querySelector("#sidebar").addEventListener('mouseenter', disable3DControl)
document.querySelector("#sidebar").addEventListener('focus', disable3DControl)
document.querySelector("#sidebar").addEventListener('mouseleave', enable3DControl)
document.querySelector("#sidebar").addEventListener('blur', enable3DControl)

//

function disable3DControl() {
  if (!controls) return;
  controls.enabled = false;
}
function enable3DControl() {
  if (!controls) return;
  controls.enabled = true;
}

async function write(input) {
  draw(await parseInput(input.trimStart().trimEnd()));
}

async function parseInput(value) {
  let chars = [];
  for (const char of value.split('')) {
    chars.push(await loadAndParseFromChar(char));
  }
  return chars;
}

function draw(characters) {
  document.querySelector('main').innerHTML = '';
  if (timer) {clearTimeout(timer)}

  renderer = new Renderer({ dpr: 2 });
  gl = renderer.gl;
  document.querySelector('main').replaceChildren(gl.canvas);

  camera = new Camera(gl, { fov: 35 });
  scene = new Transform();

  resize();

  col = 0;
  row = -1;
  lines = [];
  pct = 0;

  characters.forEach(data => {
    if (!data) {
      col++;
      row = -1;
      return;
    } else {
      row++;
    }

    let grp = new Transform();

    data.forEach((cd) => {
      let curves = makeCurves(cd);
      let firstCurve = curves[0];
      let lastCurve = curves[curves.length-1];
      let len = firstCurve.points[0].distance(lastCurve.points[lastCurve.points.length-1]);
      let poly = makePolyline(makePoints(curves));
      lines.push({poly, len});
      poly.mesh.setParent(grp);
    });

    grp.position.set(col*-colSize, row*-rowSize, 0);
    grp.setParent(scene);
  });

  scene.position.set(col/2*colSize, row/2*rowSize, 0);
  camera.position.set(0, 0, 5+row*5);
  controls = new Orbit(camera, {
      target: new Vec3(0, 0, 0),
  });
  tick(lines.shift());
}

function resize() {
  if (renderer && camera && gl) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  }
}

function tick(line) {
  timer = setTimeout(() => {
    pct += speed / line.len;
    update(line.poly, pct * 0.01);

    if (pct >= 100) {
      pct = 0;
      line = lines.shift();
      if (!line) {
        render();
        return;
      }
    }
    tick(line);
  }, 60/1000);
}

function update(polyline, pct) {
    polyline.program.uniforms.uPct.value = pct;
    controls.update();
    renderer.render({ scene, camera });
}

function render() {
    requestAnimationFrame(render);

    controls.update();
    renderer.render({ scene, camera });
}

function makeCurves(data) {
  return data.map(({code,x0,y0,x1,y1,x2,y2,x,y}) => {
    let points;
    switch(code) {
    case 'C':
      points =  [
        new Vec3(x0,y0, 0),
        new Vec3(x1,y1, 0),
        new Vec3(x2,y2, 0),
        new Vec3(x,y, 0),
      ]
      return new Curve({points, type: Curve.CUBICBEZIER});
    case 'S':
      points =  [
        new Vec3(x0,y0, 0),
        new Vec3(x2,y2, 0),
        new Vec3(x,y, 0),
      ]
      return new Curve({points, type: Curve.CATMULLROM});
    default:
      // console.debug('skip command', code);
      return null;
    }
  }).filter(c => !!c);
}

function makePoints(curves) {
  return curves.map(curve => curve.getPoints(20)).flat();
}

function makePolyline(points) {
  return new Polyline(gl, {
      points,
      vertex: document.querySelector('#t_vertex').value,
      fragment: document.querySelector('#t_fragment').value,
      uniforms: {
          uColor: { value: new Color('#f00') },
          uThickness: { value: 10 },
          uPct: { value: 0 },
      },
  });
}

function random(a, b) {
    const alpha = Math.random();
    return a * (1.0 - alpha) + b * alpha;
}
