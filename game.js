// המשחק עצמו: עמוס בועט 5 פנדלים, ניב מנסה לעצור
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  createCharacter, createBall, poseIdle, poseRun, poseKick, poseKeeperReady,
  poseDive, poseJumpCenter, poseCelebrate, poseSad,
} from './characters.js';
import { GOAL, buildPitch, buildGoal, buildStands, buildBoards, buildSky } from './stadium.js';
import * as sfx from './audio.js';

const KICKS = 5;
const BALL_R = 0.62;
const SPOT = new THREE.Vector3(0, BALL_R, 33);
const AMOS_START = new THREE.Vector3(3.1, 0, 37.0);
const AMOS_CONTACT = new THREE.Vector3(0.5, 0, 34.05);
const KEEPER_Z = 0.9;
const GRAVITY = -30;
const isTouch = matchMedia('(pointer: coarse)').matches;

const $ = (id) => document.getElementById(id);

// ---------- ציור ----------

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.75 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.autoClear = false;
$('stage').appendChild(renderer.domElement);

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const scene = new THREE.Scene();
scene.environment = envTex;
scene.fog = new THREE.Fog('#121a38', 140, 360);

scene.add(new THREE.HemisphereLight('#c4d6ff', '#2c4a22', 0.6));
const sun = new THREE.DirectionalLight('#fff4dc', 2.3);
sun.position.set(28, 60, 62);
sun.target.position.set(0, 0, 16);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 160 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#a9c1ff', 0.7);
fill.position.set(-50, 40, -20);
scene.add(fill);

buildSky(scene);
buildPitch(scene);
const net = buildGoal(scene);
const crowd = buildStands(scene);
const boards = buildBoards(scene);

const amos = createCharacter('amos');
amos.rotation.y = Math.PI; // הגב למצלמה, הפנים לשער
const niv = createCharacter('niv');
const ball = createBall(BALL_R);
scene.add(amos, niv, ball);

// כוונת עגולה על השער, כמו בפיפא
const reticle = new THREE.Group();
{
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthTest: false });
  // מסגרת כהה מאחורה, כדי שיראו את העיגול גם על רקע צהוב
  const dark = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.55, depthTest: false });
  const shadow = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.36, 48), dark);
  shadow.renderOrder = 9;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.22, 48), mat);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), mat);
  reticle.add(shadow, ring, dot);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.6), mat);
    const a = (i * Math.PI) / 2;
    tick.position.set(Math.cos(a) * 1.65, Math.sin(a) * 1.65, 0);
    tick.rotation.z = a + Math.PI / 2;
    reticle.add(tick);
  }
  reticle.traverse((o) => { if (o !== shadow) o.renderOrder = 10; });
  reticle.userData.mat = mat;
  reticle.position.z = 0.35;
  scene.add(reticle);
}

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
const BASE_POS = new THREE.Vector3(-2.2, 10.5, 58);
const BASE_LOOK = new THREE.Vector3(0, 2.2, 17);

// ---------- ההליכון (תצוגה קטנה בפינה) ----------

const tm = (() => {
  const s = new THREE.Scene();
  s.environment = envTex;
  s.background = new THREE.Color('#18233f');
  s.add(new THREE.HemisphereLight('#ffffff', '#556', 1.6));
  const l = new THREE.DirectionalLight('#ffffff', 2.6);
  l.position.set(-2, 7, 10);
  s.add(l);
  const back = new THREE.DirectionalLight('#9fc0ff', 1.2);
  back.position.set(4, 5, -6);
  s.add(back);
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2f38', roughness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: '#9aa3b2', roughness: 0.3, metalness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.55, 3), dark);
  base.position.y = 0.28;
  s.add(base);
  // מסוע עם פסים שזזים
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#15171c'; x.fillRect(0, 0, 256, 32);
  x.fillStyle = '#2c3038';
  for (let i = 0; i < 8; i++) x.fillRect(i * 32, 0, 12, 32);
  const beltTex = new THREE.CanvasTexture(c);
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(2, 1);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 2.5), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.8 }));
  belt.position.y = 0.6;
  s.add(belt);
  // עמודים, מעקות וצג
  for (const z of [-1.3, 1.3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4), metal);
    post.position.set(2.9, 2.5, z);
    post.rotation.z = 0.15;
    s.add(post);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4), metal);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(1.8, 3.4, z);
    s.add(rail);
  }
  const consoleM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 2.8), dark);
  consoleM.position.set(2.65, 4.4, 0);
  consoleM.rotation.z = 0.35;
  s.add(consoleM);
  const screenMat = new THREE.MeshBasicMaterial({ color: '#2fd36b' });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.2), screenMat);
  screen.position.set(2.42, 4.35, 0);
  screen.rotation.set(0, -Math.PI / 2, -0.35);
  s.add(screen);

  const runner = createCharacter('amos');
  runner.rotation.y = Math.PI / 2; // רץ לכיוון הצג
  runner.position.set(-0.6, 0.66, 0);
  s.add(runner);

  const cam = new THREE.PerspectiveCamera(30, 190 / 150, 0.1, 100);
  cam.position.set(-1.2, 4.2, 15.5);
  cam.lookAt(0.3, 2.7, 0);
  let phase = 0;
  return {
    update(dt, power) {
      phase += dt * (6 + power * 24);
      poseRun(runner, phase);
      beltTex.offset.x -= dt * (0.6 + power * 6);
      screenMat.color.setHSL((1 - power) * 0.33, 0.9, 0.5);
    },
    render() {
      const r = $('tmView').getBoundingClientRect();
      if (r.width < 2) return;
      cam.aspect = r.width / r.height;
      cam.updateProjectionMatrix();
      const y = innerHeight - r.bottom;
      renderer.setViewport(r.left, y, r.width, r.height);
      renderer.setScissor(r.left, y, r.width, r.height);
      renderer.setScissorTest(true);
      renderer.setClearColor(s.background);
      renderer.clear();
      renderer.render(s, cam);
      renderer.setClearColor('#000000');
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, innerWidth, innerHeight);
    },
  };
})();

// חץ על הדשא שמראה את כיוון הבעיטה. בשלב הסיבוב הוא מתעקם לקשת,
// אבל הבסיס והקצה שלו נשארים במקום
const ARROW = { start: 1.3, neck: 12.5, tip: 16, bow: 3.2 };
const ARROW_BODY = { w: 0.45, head: 1.5, back: 0, front: 0 };
const ARROW_EDGE = { w: 0.58, head: 1.9, back: 0.2, front: 0.45 }; // המסגרת הכהה, קצת יותר גדולה

// צורת החץ: קו אמצע שיוצא לקשת (bend בין 1- ל-1) וחוזר לאותו קצה, ומשולש בסוף
function arrowShape(bend, size) {
  const { start, neck, tip, bow } = ARROW;
  const len = tip - start;
  const center = (s) => [bend * bow * 4 * s * (1 - s), start + s * len];
  const dir = (s) => {
    const dx = bend * bow * 4 * (1 - 2 * s);
    const n = Math.hypot(dx, len);
    return [dx / n, len / n];
  };
  const sNeck = (neck - start) / len;
  const sBack = -size.back / len;
  const left = [], right = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const s = sBack + ((sNeck - sBack) * i) / N;
    const [cx, cy] = center(s);
    const [tx, ty] = dir(s);
    left.push([cx - ty * size.w, cy + tx * size.w]);
    right.push([cx + ty * size.w, cy - tx * size.w]);
  }
  const [nx, ny] = center(sNeck);
  const [tx, ty] = dir(sNeck);
  const headLen = tip - neck + size.front;
  const shape = new THREE.Shape();
  shape.moveTo(...left[0]);
  for (const p of left.slice(1)) shape.lineTo(...p);
  shape.lineTo(nx - ty * size.head, ny + tx * size.head);
  shape.lineTo(nx + tx * headLen, ny + ty * headLen);
  shape.lineTo(nx + ty * size.head, ny - tx * size.head);
  for (const p of right.reverse()) shape.lineTo(...p);
  shape.closePath();
  return shape;
}

const arrow = new THREE.Group();
{
  const outline = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45, depthWrite: false }));
  const fillMat = new THREE.MeshBasicMaterial({ color: '#ffd21a', transparent: true, opacity: 0.95, depthWrite: false });
  const body = new THREE.Mesh(undefined, fillMat);
  for (const m of [outline, body]) {
    m.rotation.x = -Math.PI / 2; // שוכב על הדשא ומצביע לכיוון השער
    arrow.add(m);
  }
  body.position.y = 0.01;
  outline.renderOrder = 4;
  body.renderOrder = 5;
  arrow.position.set(SPOT.x, 0.06, SPOT.z);
  arrow.userData.mat = fillMat;
  arrow.userData.parts = [[outline, ARROW_EDGE], [body, ARROW_BODY]];
  scene.add(arrow);
}

// מצייר את החץ מחדש רק כשהעיקום שלו משתנה
function setArrowBend(bend) {
  if (arrow.userData.bend === bend) return;
  arrow.userData.bend = bend;
  for (const [m, size] of arrow.userData.parts) {
    m.geometry.dispose();
    m.geometry = new THREE.ShapeGeometry(arrowShape(bend, size));
  }
}
setArrowBend(0);

// קו אנכי דק על השער שמראה איפה יהיה הגובה
const guide = new THREE.Mesh(
  new THREE.PlaneGeometry(0.12, 10.5),
  new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45, depthTest: false }),
);
guide.position.set(0, 5.25, 0.3);
guide.renderOrder = 9;
scene.add(guide);

// ---------- מצב המשחק ----------

const game = {
  state: 'intro',
  t: 0, // זמן בתוך המצב הנוכחי
  kick: 0,
  results: [],
  aim: new THREE.Vector2(0, 3.2),
  power: 0,
  curve: 0, // סיבוב הבעיטה: 1- קשת שמאלה, 1 קשת ימינה
  shot: null,
  phase0: 0,
};

// הטווח של החץ (כולל מחוץ לשער) והטווח של מד הגובה (כולל מעל המשקוף)
const X_RANGE = 14;
const Y_MIN = 0.7;
const Y_MAX = 9.6;
const X_PERIOD = 1.7; // כמה שניות לוקח לחץ ללכת הלוך וחזור
const Y_PERIOD = 1.3;
const POWER_TIME = 2.1; // כמה שניות עד שההליכון מגיע לחוזק מלא (ואז מתחיל מחדש)
const CURVE_PERIOD = 1.6; // כמה שניות לוקח לחץ להתעקם לצד אחד, לשני ובחזרה
const CURVE_SHIFT = 3; // בסיבוב מלא, כמה רחוק הצידה הכדור מגיע מהמקום שכיוונו אליו
const CURVE_BOW = 4.5; // בסיבוב מלא, כמה רחוק הצידה הכדור יוצא לקשת באמצע הדרך

const LABELS = {
  dirX: ['עצור את החץ בכיוון שאתה רוצה', 'עצור ⬅️➡️'],
  dirY: ['עכשיו עצור בגובה שאתה רוצה', 'עצור ⬆️⬇️'],
  curve: ['עצור את הסיבוב שאתה רוצה', 'עצור 🌀'],
};

function setState(s) {
  game.state = s;
  game.t = 0;
  game.phase0 = Math.random();
  const aiming = s === 'dirX' || s === 'dirY' || s === 'curve';
  $('bottom').hidden = !aiming;
  $('xMeter').hidden = s !== 'dirX';
  $('cMeter').hidden = s !== 'curve';
  // מד הגובה נשאר גם בשלב הסיבוב, כדי שיראו איזה גובה נבחר
  $('yMeter').hidden = s !== 'dirY' && s !== 'curve';
  if (aiming) {
    $('hint').textContent = LABELS[s][0];
    $('kickBtn').textContent = LABELS[s][1];
  }
  $('power').hidden = s !== 'power';
  arrow.visible = aiming || s === 'power';
  // לא מראים על השער לאן הכדור יגיע, כדי שהתוצאה תהיה הפתעה
  guide.visible = false;
  reticle.visible = false;
}

function resetKick() {
  ball.position.copy(SPOT);
  ball.rotation.set(0, 0, 0);
  amos.position.copy(AMOS_START);
  niv.position.set(0, 0, KEEPER_Z);
  niv.rotation.set(0, 0, 0);
  poseIdle(amos, 0);
  poseKeeperReady(niv, 0);
  game.shot = null;
  game.power = 0;
  game.curve = 0;
  game.aim.set(0, 3.2);
  crowd.setExcite(0);
  sfx.crowdLevel(0.7);
  updateHud();
  setState('dirX');
  sfx.whistle();
}

function updateHud() {
  const goals = game.results.filter((r) => r === 'goal').length;
  $('goals').textContent = goals;
  $('stops').textContent = game.results.length - goals;
  $('kickno').textContent = `בעיטה ${Math.min(game.kick + 1, KICKS)} מתוך ${KICKS}`;
  $('dots').innerHTML = Array.from({ length: KICKS }, (_, i) => {
    const r = game.results[i];
    const cls = r === 'goal' ? 'goal' : r ? 'miss' : i === game.kick ? 'cur' : '';
    return `<i class="${cls}"></i>`;
  }).join('');
}

// ---------- כיוון: חץ לצדדים ואז מד גובה ----------

// גל משולש: הולך באותה מהירות מקצה לקצה וחוזר (בין 1- ל-1)
function tri(u) {
  return 1 - 4 * Math.abs(((u % 1) + 1) % 1 - 0.5);
}

function updateDirX() {
  game.aim.x = X_RANGE * tri(game.t / X_PERIOD + game.phase0);
  const pct = ((game.aim.x + X_RANGE) / (2 * X_RANGE)) * 100;
  $('xMark').style.left = `${pct}%`;
}

function updateDirY() {
  const f = (tri(game.t / Y_PERIOD + game.phase0) + 1) / 2;
  game.aim.y = Y_MIN + f * (Y_MAX - Y_MIN);
  $('yMark').style.bottom = `${f * 100}%`;
  drawHeightArrow(f);
}

// החלונית שבצד: מבט מהצד על הכדור והשער, עם חץ שמגיע לגובה שבו הכדור יעבור בקו השער.
// הגבהים אמיתיים ביחס לשער: אם החץ עובר מעל המשקוף, הכדור ייצא החוצה
const hCanvas = $('hArrow');
const smallScreen = matchMedia('(max-height: 520px), (max-width: 820px)'); // במסך קטן או צר: חלונית קטנה יותר
let hDrawn = '';
function drawHeightArrow(f) {
  // הגודל נקבע כאן ולא בעיצוב, כדי שהחלונית לא תגדל בלי סוף אם העיצוב לא נטען
  const [w, h] = smallScreen.matches ? [104, 132] : [150, 186];
  hCanvas.style.width = `${w}px`;
  hCanvas.style.height = `${h}px`;
  const key = `${f.toFixed(3)}|${w}|${h}`;
  if (key === hDrawn) return; // לא מציירים שוב אם שום דבר לא השתנה
  hDrawn = key;
  const dpr = Math.min(devicePixelRatio, 2);
  if (hCanvas.width !== Math.round(w * dpr) || hCanvas.height !== Math.round(h * dpr)) {
    hCanvas.width = Math.round(w * dpr);
    hCanvas.height = Math.round(h * dpr);
  }
  const x = hCanvas.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);

  // שמיים ודשא
  const sky = x.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#1d2c55');
  sky.addColorStop(1, '#34558f');
  x.fillStyle = sky;
  x.fillRect(0, 0, w, h);
  const gy = h - Math.round(h * 0.12);
  x.fillStyle = '#2f9e44';
  x.fillRect(0, gy, w, h - gy);
  x.fillStyle = '#3cb553';
  for (let i = 0; i < w; i += 22) x.fillRect(i, gy, 11, h - gy);

  // קנה מידה לגובה: הגובה הכי גבוה של המד נכנס בדיוק בחלונית
  const k = (gy - 12) / Y_MAX;
  const r = Math.max(4, BALL_R * k);
  const bx = r + 8, by = gy - r;
  const goalX = w - 24, backX = w - 6;
  const barY = gy - GOAL.h * k;

  // הרשת מאחורי הקורה (מהצד רואים אותה כמשולש)
  x.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  x.lineWidth = 1;
  x.beginPath();
  for (let i = 1; i <= 4; i++) {
    const yy = barY + ((gy - barY) * i) / 5;
    x.moveTo(goalX, yy);
    x.lineTo(goalX + ((backX - goalX) * i) / 5, yy);
  }
  x.moveTo(goalX, barY);
  x.lineTo(backX, gy);
  x.stroke();
  // הקורה והמשקוף
  x.strokeStyle = '#ffffff';
  x.lineWidth = Math.max(3, GOAL.post * 2 * k);
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(goalX, gy);
  x.lineTo(goalX, barY);
  x.stroke();

  // החץ: מהכדור עד הגובה שבו הכדור יעבור בקו השער
  const tyPx = gy - (Y_MIN + f * (Y_MAX - Y_MIN)) * k;
  const dx = goalX - bx, dy = tyPx - by;
  const len = Math.hypot(dx, dy);
  const sw = Math.max(2.5, w * 0.02), hw = sw * 2.6, hl = Math.min(16, len * 0.22);
  x.save();
  x.translate(bx, by);
  x.rotate(Math.atan2(dy, dx));
  x.beginPath();
  x.moveTo(r + 2, -sw);
  x.lineTo(len - hl, -sw);
  x.lineTo(len - hl, -hw);
  x.lineTo(len, 0);
  x.lineTo(len - hl, hw);
  x.lineTo(len - hl, sw);
  x.lineTo(r + 2, sw);
  x.closePath();
  x.lineJoin = 'round';
  x.lineWidth = 3;
  x.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  x.stroke();
  x.fillStyle = '#ffd21a';
  x.fill();
  x.restore();

  // הכדור
  x.beginPath();
  x.arc(bx, by, r, 0, Math.PI * 2);
  x.fillStyle = '#ffffff';
  x.fill();
  x.lineWidth = 1.5;
  x.strokeStyle = '#222';
  x.stroke();
  x.beginPath();
  x.arc(bx, by, r * 0.38, 0, Math.PI * 2);
  x.fillStyle = '#222';
  x.fill();
}

// מד הסיבוב: הסמן זז מצד לצד. באמצע אין סיבוב, בקצוות סיבוב חזק
function updateCurve() {
  game.curve = tri(game.t / CURVE_PERIOD + game.phase0);
  $('cMark').style.left = `${((game.curve + 1) / 2) * 100}%`;
}

function updateArrow() {
  setArrowBend(game.curve);
  arrow.rotation.y = Math.atan2(-game.aim.x, SPOT.z);
  const pulse = game.state === 'dirX' ? 1 + Math.sin(game.clock * 10) * 0.04 : 1;
  arrow.scale.set(pulse, 1, pulse);
  guide.position.x = game.aim.x;
}

// ---------- ההליכון: חוזק הבעיטה ----------

function startPower() {
  setState('power');
  game.power = 0;
  const bar = document.querySelector('.meter .bar');
  $('fill').style.backgroundSize = `100% ${bar.clientHeight}px`;
}

function stopPower() {
  if (game.state !== 'power') return;
  setState('runup');
}

// כפתור אחד לכל השלבים: עוצר את החץ, אחר כך את הגובה, ואז את הסיבוב
function pressButton() {
  if (game.t < 0.12) return;
  if (game.state === 'dirX') setState('dirY');
  else if (game.state === 'dirY') setState('curve');
  else if (game.state === 'curve') startPower();
}

$('kickBtn').addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  e.preventDefault();
  sfx.initAudio();
  pressButton();
});
window.addEventListener('pointerdown', () => {
  if (game.state === 'power' && game.t > 0.15) stopPower();
});
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.code !== 'Enter') return;
  if (game.state === 'power') {
    if (game.t > 0.15) stopPower();
  } else {
    pressButton();
  }
});

// ---------- הבעיטה: מחשבים מה יקרה ----------

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;
}

// מיקום הכפפה של ניב בסוף קפיצה, ביחס לרגליים שלו (מחושב פעם אחת)
const handTable = { 1: [], [-1]: [] };
function buildHandTable() {
  const probe = createCharacter('niv');
  const v = new THREE.Vector3();
  for (const side of [1, -1]) {
    for (let i = 0; i <= 10; i++) {
      const h = i / 10;
      poseDive(probe, side, 1, h);
      probe.updateMatrixWorld(true);
      probe.userData.hands[side > 0 ? 1 : 0].getWorldPosition(v);
      handTable[side].push({ h, x: v.x, y: v.y });
    }
  }
}
buildHandTable();

function planShot() {
  const p = game.power;
  const c = game.curve;
  // בעיטה מסובבת קצת פחות מדויקת, אבל קשה יותר לניב לקרוא אותה
  let tx = game.aim.x + gauss() * (0.15 + p * p * 0.5 + c * c * 0.35);
  let ty = game.aim.y + gauss() * (0.1 + p * p * 0.35);
  // בעיטה חלשה מאוד יורדת קצת מתחת למטרה, ובעיטה חזקה מאוד עפה גבוה
  // הסיבוב מזיז את הכדור קצת הצידה. סיבוב חלש כמעט לא משנה, רק סיבוב חזק באמת מורגש
  const shift = c * c * c * CURVE_SHIFT;
  tx += shift;
  if (p < 0.3) ty -= ((0.3 - p) / 0.3) * 1.8;
  if (p > 0.82) ty += Math.pow((p - 0.82) / 0.18, 1.4) * 5.5;
  ty = Math.max(ty, BALL_R);
  const over = ty > GOAL.h + GOAL.post;
  const { halfW, h, post } = GOAL;
  const inFrame = Math.abs(tx) <= halfW - post - BALL_R * 0.7 && ty <= h - post - BALL_R * 0.7;
  const nearPost = Math.abs(Math.abs(tx) - halfW) < post + BALL_R && ty < h + post;
  const nearBar = Math.abs(ty - h) < post + BALL_R && Math.abs(tx) < halfW + post;
  const hitPost = !inFrame && !over && (nearPost || nearBar);
  const T = THREE.MathUtils.lerp(1.05, 0.42, p);
  const arc = 0.3 + 1.7 * (1 - p);

  // ההחלטה של ניב (רמה בינונית): הוא תמיד קופץ לאחד הצדדים
  const mode = 'dive';
  const sideOfBall = tx >= 0 ? 1 : -1;
  let side = Math.random() < 0.5 ? -1 : 1;
  let saved = false;
  if (inFrame) {
    // בבעיטה חלשה יש לניב יותר זמן לראות לאן הכדור הולך
    const guess = (p < 0.4 ? 0.7 : 0.38) - c * c * 0.15;
    if (Math.random() < guess) {
      side = Math.abs(tx) < 0.6 ? side : sideOfBall;
      const reach = 9.6 - 5 * p - (ty > 5.6 && p > 0.6 ? 1 : 0);
      saved = Math.abs(tx) <= reach;
    } else {
      side = Math.abs(tx) < 0.6 ? side : -sideOfBall;
    }
  }

  // לאן ניב יקפוץ בדיוק
  let shiftX = 0, shiftY = 0, height = 0.5;
  if (mode === 'dive') {
    const table = handTable[side];
    if (saved) {
      // בוחרים גובה קפיצה שהכפפה תגיע בדיוק לכדור
      let best = table[0];
      for (const e of table) if (Math.abs(e.y - ty) < Math.abs(best.y - ty)) best = e;
      height = best.h;
      shiftX = THREE.MathUtils.clamp(tx - best.x, -4.5, 4.5);
      shiftY = THREE.MathUtils.clamp(ty - best.y, -0.6, 1.4);
    } else {
      height = THREE.MathUtils.clamp(ty / GOAL.h + (Math.random() - 0.5) * 0.3, 0, 1);
      shiftX = side * (1.6 + Math.random() * 1.2);
      // אם ניחש נכון ולא הגיע, שיהיה ברור שהכדור עבר מעבר לכפפות
      if (side === sideOfBall && inFrame) {
        const e = table[Math.round(height * 10)];
        shiftX = THREE.MathUtils.clamp(tx - e.x - side * 1.6, -4.5, 4.5);
      }
    }
  }

  return { tx, ty, over, inFrame, hitPost, T, arc, mode, side, saved, shiftX, shiftY, height, power: p, bow: c * CURVE_BOW };
}

// ---------- מעוף הכדור והתוצאה ----------

const vel = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const axis = new THREE.Vector3();
let physics = false; // אחרי סוף המסלול המתוכנן הכדור זז לפי כוח המשיכה
let inNet = false;

function launch() {
  game.shot = planShot();
  game.shot.launched = 0;
  game.shot.event = null;
  physics = false;
  inNet = false;
  sfx.kick(game.power);
  sfx.crowdLevel(0.85);
  setState('flight');
}

function ballOnPath(s, out) {
  const sh = game.shot;
  out.set(
    // הכדור יוצא לקשת כמו החץ, ונוחת במקום שכיוונו אליו (עם התזוזה הקטנה של הסיבוב)
    THREE.MathUtils.lerp(SPOT.x, sh.tx, s) + sh.bow * 4 * s * (1 - s),
    THREE.MathUtils.lerp(SPOT.y, sh.ty, s) + sh.arc * 4 * s * (1 - s),
    THREE.MathUtils.lerp(SPOT.z, 0, s),
  );
  return out;
}

const prevBall = new THREE.Vector3();

function spinBall(dt) {
  const sp = vel.length();
  if (sp < 0.01) return;
  axis.set(vel.z, 0, -vel.x).normalize();
  if (axis.lengthSq() > 0) ball.rotateOnWorldAxis(axis, (sp * dt) / BALL_R);
}

function result(kind, text, sub) {
  if (game.shot.event) return;
  game.shot.event = kind;
  game.results[game.kick] = kind === 'goal' ? 'goal' : 'miss';
  updateHud();
  const m = $('msg');
  m.className = '';
  m.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  void m.offsetWidth;
  m.className = `show ${kind === 'goal' ? 'goal' : kind === 'save' ? 'save' : 'miss'}`;
  if (kind === 'goal') {
    sfx.goal();
    crowd.setExcite(1);
    navigator.vibrate?.(180);
  } else if (kind === 'save') {
    sfx.save();
    crowd.setExcite(0.35);
  } else if (kind === 'post') {
    sfx.post();
  }
  game.resultAt = game.clock;
}

function updateFlight(dt) {
  const sh = game.shot;
  sh.launched += dt;
  const s = sh.launched / sh.T;
  prevBall.copy(ball.position);

  if (!physics) {
    ballOnPath(Math.min(s, 1), ball.position);
    vel.copy(ball.position).sub(prevBall).divideScalar(Math.max(dt, 1e-4));
    // הכדור מסתובב סביב עצמו כמו סביבון כשיש סיבוב
    ball.rotateOnWorldAxis(UP, (-sh.bow / CURVE_BOW) * 25 * dt);
    // ניב עוצר: הכדור מגיע לכפפות
    if (sh.saved && ball.position.z <= KEEPER_Z + 0.7) {
      physics = true;
      const away = sh.mode === 'center' ? (Math.random() - 0.5) * 6 : sh.side * (3 + Math.random() * 4);
      vel.set(away, 5 + Math.random() * 4, 9 + sh.power * 6);
      result('save', 'ניב עצר!', 'איזו הצלה של השוער 🧤');
    } else if (s >= 1) {
      physics = true;
      if (sh.hitPost) {
        // פגיעה בקורה: הכדור ניתז החוצה
        const bar = Math.abs(sh.ty - GOAL.h) < GOAL.post + BALL_R;
        vel.set(bar ? vel.x * 0.4 : -Math.sign(sh.tx) * 6, bar ? 8 : 3, 12);
        result('post', 'פגע בקורה!', 'כל כך קרוב…');
      } else if (sh.inFrame) {
        inNet = true;
      } else {
        result('miss', sh.over || sh.ty > GOAL.h ? 'מעל המשקוף!' : 'החוצה!', 'בפעם הבאה 💪');
      }
    }
  } else {
    vel.y += GRAVITY * dt;
    ball.position.addScaledVector(vel, dt);
  }

  // הכדור בתוך השער
  if (inNet) {
    if (!sh.event && ball.position.z <= 0) result('goal', 'גוווול!', 'עמוס כבש! ⚽');
    if (!physics) {
      // ממשיכים עם אותה מהירות
    }
    const back = -GOAL.depth + BALL_R;
    if (ball.position.z < back) {
      ball.position.z = back;
      if (vel.z < -1) {
        net.hit(ball.position.x, ball.position.y, Math.min(1.2, Math.abs(vel.z) / 50));
        sfx.net();
      }
      vel.z *= -0.12;
      vel.x *= 0.4;
    }
    ball.position.x = THREE.MathUtils.clamp(ball.position.x, -GOAL.halfW + BALL_R, GOAL.halfW - BALL_R);
    if (ball.position.y > GOAL.h - BALL_R) {
      ball.position.y = GOAL.h - BALL_R;
      vel.y = Math.min(vel.y, 0);
    }
  }

  // קפיצה מהדשא
  if (physics && ball.position.y < BALL_R) {
    ball.position.y = BALL_R;
    vel.y = Math.abs(vel.y) > 2 ? -vel.y * 0.45 : 0;
    vel.x *= 0.85;
    vel.z *= 0.85;
  }
  // כדור שהמשיך מעבר לשער נעצר בשלטים
  if (ball.position.z < -8.5) {
    ball.position.z = -8.5;
    vel.z = Math.abs(vel.z) * 0.3;
  }
  spinBall(dt);
}

// ---------- תנועות השוער ----------

function updateKeeper(dt) {
  const sh = game.shot;
  if (!sh) {
    poseKeeperReady(niv, game.clock);
    return;
  }
  const start = 0.07;
  const dur = THREE.MathUtils.clamp(sh.T * 0.92, 0.32, 0.8);
  const tt = (sh.launched - start) / dur;
  if (tt <= 0) {
    poseKeeperReady(niv, game.clock);
    return;
  }
  const a = Math.min(1, tt);
  const ease = 1 - (1 - a) ** 2;
  if (sh.mode === 'center') {
    poseJumpCenter(niv, Math.min(1, tt * 1.3));
    if (tt > 1.3) poseKeeperReady(niv, game.clock);
    return;
  }
  poseDive(niv, sh.side, ease, sh.height);
  niv.position.x = sh.shiftX * ease;
  niv.position.y = Math.max(0, sh.shiftY) * Math.sin(Math.min(1, a) * Math.PI * 0.6);
  // נוחת על הדשא
  if (tt > 1) {
    const f = Math.min(1, (tt - 1) / 0.45);
    const u = niv.userData;
    u.body.rotation.z = THREE.MathUtils.lerp(u.body.rotation.z, -sh.side * 1.5, f);
    u.body.position.y = THREE.MathUtils.lerp(u.body.position.y, 0.75, f);
    niv.position.y = THREE.MathUtils.lerp(niv.position.y, 0, f);
  }
}

// ---------- לולאה ראשית ----------

const clock = new THREE.Clock();
game.clock = 0;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // השער ושני הצדדים שלו תמיד נכנסים למסך, גם בטלפון עומד
  const tanH = 12 / (BASE_POS.z - 8);
  const minFov = camera.aspect > 1.4 ? 29 : 40; // במסך רחב מקרבים כדי שהשער ייראה גדול
  camera.fov = Math.max(minFov, THREE.MathUtils.radToDeg(2 * Math.atan(tanH / camera.aspect)));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
camPos.copy(BASE_POS);
camLook.copy(BASE_LOOK);

const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();

function updateCamera(dt) {
  const st = game.state;
  if (st === 'intro') {
    const a = game.clock * 0.12;
    goalPos.set(Math.sin(a) * 50, 20, 30 + Math.cos(a) * 40);
    goalLook.set(0, 3, 10);
  } else if (st === 'flight' || st === 'result') {
    const sh = game.shot;
    goalPos.set(sh ? sh.tx * 0.15 - 1.6 : -1.6, 10, 53);
    goalLook.set(sh ? sh.tx * 0.4 : 0, 3.2, 2);
  } else {
    goalPos.copy(BASE_POS);
    goalLook.copy(BASE_LOOK);
  }
  const k = 1 - Math.exp(-dt * (st === 'intro' ? 1 : 2.6));
  camPos.lerp(goalPos, k);
  camLook.lerp(goalLook, k);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

function updateReticle() {
  reticle.position.x = game.aim.x;
  reticle.position.y = game.aim.y;
  const pulse = 1 + Math.sin(game.clock * 6) * 0.06;
  reticle.scale.setScalar(pulse * (game.state === 'power' ? 0.85 : 1));
  updateArrow();
}

function updatePower(dt) {
  // ככל שעמוס רץ יותר זמן על ההליכון, הבעיטה חזקה יותר
  // כשהמד מגיע לחוזק מלא הוא מתחיל שוב מלמטה
  game.power = Math.pow((game.t / POWER_TIME) % 1, 1.15);
  const pct = (game.power * 100).toFixed(1) + '%';
  $('fill').style.height = pct;
  $('mark').style.bottom = `calc(${pct} - 2px)`;
  const hue = 120 - 120 * game.power;
  document.querySelector('.tm-wrap').style.setProperty('--pc', `hsl(${hue} 85% 50%)`);
  tm.update(dt, game.power);
}

function updateRunup() {
  // ריצה קצרה לכדור ואז בעיטה
  const run = 0.62, kickDur = 0.26;
  if (game.t < run) {
    const a = game.t / run;
    amos.position.lerpVectors(AMOS_START, AMOS_CONTACT, a);
    poseRun(amos, game.t * 15);
  } else {
    amos.position.copy(AMOS_CONTACT);
    const k = Math.min(1, (game.t - run) / kickDur);
    poseKick(amos, k);
    if (k >= 0.5 && game.state === 'runup') launch();
  }
}

function updateAmosAfter(dt) {
  const sh = game.shot;
  if (!sh) return;
  if (sh.launched < 0.25) {
    poseKick(amos, Math.min(1, 0.5 + sh.launched * 2));
    return;
  }
  if (!sh.event) {
    poseIdle(amos, game.clock);
    return;
  }
  if (sh.event === 'goal') poseCelebrate(amos, game.clock);
  else poseSad(amos, game.clock);
}

function finish() {
  setState('end');
  $('hud').hidden = true;
  const goals = game.results.filter((r) => r === 'goal').length;
  $('endTitle').textContent = `עמוס הבקיע ${goals} מתוך ${KICKS}!`;
  const texts = [
    'ניב בלתי עביר היום! נסה שוב 🧤',
    'ניב היה חזק היום. בפעם הבאה! 💪',
    'לא רע בכלל! עוד קצת אימון 🙂',
    'יפה מאוד! ניצחון לספרד 🇪🇸',
    'מלך הפנדלים! 👑',
    'מושלם! ניב לא נגע בכדור! 🏆',
  ];
  $('endText').textContent = texts[goals];
  $('endDots').innerHTML = game.results.map((r) => `<i class="${r}"></i>`).join('');
  let best = goals;
  try {
    best = Math.max(goals, parseInt(localStorage.getItem('amos-penalty-best') || '0', 10));
    localStorage.setItem('amos-penalty-best', String(best));
  } catch (e) { /* בדפדפן פרטי אין שמירה, וזה בסדר */ }
  $('best').textContent = `השיא שלך: ${best} מתוך ${KICKS}`;
  $('end').hidden = false;
  if (goals >= 3) {
    crowd.setExcite(0.8);
    sfx.goal();
  }
}

function frame(dt) {
  game.clock += dt;
  game.t += dt;

  switch (game.state) {
    case 'dirX':
      updateDirX();
      poseIdle(amos, game.clock);
      poseKeeperReady(niv, game.clock);
      break;
    case 'dirY':
      updateDirY();
      poseIdle(amos, game.clock);
      poseKeeperReady(niv, game.clock);
      break;
    case 'curve':
      updateCurve();
      poseIdle(amos, game.clock);
      poseKeeperReady(niv, game.clock);
      break;
    case 'power':
      poseIdle(amos, game.clock);
      poseKeeperReady(niv, game.clock);
      updatePower(dt);
      break;
    case 'runup':
      poseKeeperReady(niv, game.clock);
      updateRunup();
      break;
    case 'flight':
      updateFlight(dt);
      updateKeeper(dt);
      updateAmosAfter(dt);
      if (game.shot.event && game.clock - game.resultAt > 2.7) {
        game.kick++;
        if (game.kick >= KICKS) finish();
        else resetKick();
      }
      break;
    case 'intro':
    case 'end':
      poseIdle(amos, game.clock);
      poseKeeperReady(niv, game.clock);
      break;
  }

  // הקהל נרגע לאט אחרי חגיגה
  if (game.state !== 'flight' && game.state !== 'end') crowd.setExcite(Math.max(0, crowd.getExcite() - dt * 0.4));

  updateReticle();
  updateCamera(dt);
  crowd.update(game.clock, dt);
  boards.update(dt);
  net.update(dt);

  renderer.setViewport(0, 0, innerWidth, innerHeight);
  renderer.clear();
  renderer.render(scene, camera);
  if (game.state === 'power') tm.render();
}

// מצב בדיקה (?debug): הזמן לא זז לבד, ומריצים את המשחק צעד אחר צעד
const debugMode = new URLSearchParams(location.search).has('debug');

function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  frame(debugMode ? 0 : dt);
}
renderer.setAnimationLoop(loop);

if (debugMode) {
  window.__debug = {
    game,
    step(sec) {
      for (let i = 0; i < Math.round(sec * 60); i++) frame(1 / 60);
    },
    aim(x, y) { game.aim.set(x, y); },
    curve(c) { game.curve = c; },
    ball,
    arrow,
    kick() { startPower(); },
    press() { pressButton(); },
    stop() { stopPower(); },
  };
}

// ---------- תמונות לכרטיסים במסך הפתיחה ----------

function portrait(key) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(320, 320);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  const s = new THREE.Scene();
  s.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
  s.add(new THREE.HemisphereLight('#ffffff', '#666', 0.6));
  const l = new THREE.DirectionalLight('#ffffff', 1.6);
  l.position.set(3, 6, 8);
  s.add(l);
  const c = createCharacter(key);
  if (key === 'niv') poseKeeperReady(c, 0.3);
  else poseIdle(c, 0);
  c.rotation.y = key === 'niv' ? -0.35 : 0.35;
  s.add(c);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.set(0, 4.3, 12.5);
  cam.lookAt(0, 3.4, 0);
  r.render(s, cam);
  const url = r.domElement.toDataURL('image/png');
  r.dispose();
  r.forceContextLoss();
  return url;
}

try {
  $('pAmos').src = portrait('amos');
  $('pNiv').src = portrait('niv');
} catch (e) { /* אם אין תמונה, הכרטיס עדיין עובד */ }

// ---------- כפתורים ----------

function newGame() {
  game.kick = 0;
  game.results = [];
  $('end').hidden = true;
  $('start').hidden = true;
  $('hud').hidden = false;
  $('mute').hidden = false;
  resetKick();
}

const play = $('play');
play.disabled = false;
play.textContent = 'שחק! ⚽';
play.addEventListener('click', () => {
  sfx.initAudio();
  newGame();
});
$('again').addEventListener('click', () => {
  sfx.initAudio();
  newGame();
});
$('mute').addEventListener('click', (e) => {
  e.stopPropagation();
  sfx.setMuted(!sfx.isMuted());
  $('mute').textContent = sfx.isMuted() ? '🔇' : '🔊';
});
$('mute').addEventListener('pointerdown', (e) => e.stopPropagation());

resetKick();
setState('intro');
