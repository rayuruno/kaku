import { Renderer, Camera, Orbit, Transform, Polyline, Mesh, Curve, Vec3, Color, Program } from './vendor/ogl/index.js';
import { loadAndParseFromChar } from "./kanji.js";

// setup
const colSize = 2.0;
const rowSize = 2.0;
const speed = 1.4;

let renderer, gl, camera, scene, controls, col, row, lines, pct, timer;

let $main = document.querySelector('main'),
    $sidebar = document.querySelector("#sidebar"),
    $kanji = document.querySelector("#t_kanji"),
    $vertex = document.querySelector('#t_vertex'),
    $fragment = document.querySelector('#t_fragment');

window.addEventListener('update', () => {
  if(location.hash != $kanji.value) {
    location.hash = encodeURIComponent($kanji.value);
  }
  update();
});
window.addEventListener('hashchange', () => {
  update();
});
window.addEventListener('resize', resize, false);
window.addEventListener('sidebar', () => {
  $sidebar.classList.toggle('hidden');
});
[$kanji,$vertex,$fragment].forEach(el => {
  el.addEventListener('focus', () => {
    toggle3DControls(false);
  });

  el.addEventListener('blur', () => {
    toggle3DControls(true);
  });
});

update();

//

function resize() {
  if (renderer && camera && gl) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
  }
}

function toggle3DControls(enabled) {
  if (!controls) return;
  controls.enabled = enabled;
}

function update() {
  let k = location.hash.substring(1);
  if (k) {
    $kanji.value = decodeURIComponent(k);
  }
  write($kanji.value);
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
  gl?.canvas?.remove();
  if (timer) {clearTimeout(timer)}

  renderer = new Renderer({ dpr: 2 });
  gl = renderer.gl;
  $main.replaceChildren(gl.canvas);

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
      let fPoints = curves[0].points;
      let lPoints = curves[curves.length-1].points;
      let len = fPoints[0].distance(lPoints[lPoints.length-1]);
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

function tick(line) {
  timer = setTimeout(() => {
    pct += speed / line.len;
    line.poly.program.uniforms.uPct.value = pct * 0.01;
    render();

    if (pct >= 100) {
      pct = 0;
      line = lines.shift();
      if (!line) {
        play();
        return;
      }
    }
    tick(line);
  }, 60/1000);
}

function render() {
  controls.update();
  renderer.render({ scene, camera });
}

function play() {
  requestAnimationFrame(play);
  render();
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
      vertex: $vertex.value,
      fragment: $fragment.value,
      uniforms: {
          uColor: { value: new Color('#f00') },
          uThickness: { value: 10 },
          uPct: { value: 0 },
      },
  });
}
