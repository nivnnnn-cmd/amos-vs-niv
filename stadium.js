// בניית האצטדיון: מגרש, שער ורשת, יציעים עם קהל, זרקורים ושלטים
import * as THREE from 'three';

// גודל השער (ביחידות של המשחק)
export const GOAL = { halfW: 9, h: 7, depth: 3, post: 0.28 };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function seeded(seed) {
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

// ---------- מגרש ----------

export function buildPitch(scene) {
  // דשא עם פסים של כיסוח
  const grass = canvasTex(1024, 1024, (ctx, w, h) => {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 ? '#3f9a3c' : '#47a844';
      ctx.fillRect(0, (i * h) / 16, w, h / 16);
    }
    // גרגרים קטנים כדי שהדשא לא ייראה שטוח
    const rnd = seeded(3);
    for (let i = 0; i < 26000; i++) {
      ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }, [1, 1]);
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(170, 140),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 0.95, envMapIntensity: 0.3 }),
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(0, 0, 50);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // שוליים מחוץ למגרש
  const outer = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: '#2f6f2d', roughness: 1 }),
  );
  outer.rotation.x = -Math.PI / 2;
  outer.position.set(0, -0.02, 50);
  outer.receiveShadow = true;
  scene.add(outer);

  // קווים לבנים
  const lineMat = new THREE.MeshBasicMaterial({ color: '#f4f4f4' });
  const line = (x1, z1, x2, z2, w = 0.32) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len + w, w), lineMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(z2 - z1, x2 - x1);
    m.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
    m.receiveShadow = true;
    scene.add(m);
  };
  line(-82, 0, 82, 0); // קו השער
  // רחבת 16
  line(-60, 0, -60, 50);
  line(60, 0, 60, 50);
  line(-60, 50, 60, 50);
  // רחבת 5
  line(-27, 0, -27, 16.5);
  line(27, 0, 27, 16.5);
  line(-27, 16.5, 27, 16.5);
  // נקודת הפנדל
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, 0.025, 33);
  scene.add(spot);
  // הקשת מחוץ לרחבה
  const arc = new THREE.Mesh(new THREE.RingGeometry(29.7, 30.0, 64, 1, Math.PI * 0.22, Math.PI * 0.56), lineMat);
  arc.rotation.x = -Math.PI / 2;
  arc.position.set(0, 0.02, 33);
  arc.rotation.z = Math.PI;
  scene.add(arc);
}

// ---------- שער ורשת ----------

function netTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    // רשת בצורת משושים קטנים, כמו ברשתות של מונדיאל
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, h);
    ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();
  });
}

export function buildGoal(scene) {
  const { halfW, h, depth, post } = GOAL;
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, envMapIntensity: 0.8 });
  const group = new THREE.Group();
  const cyl = (len) => new THREE.CylinderGeometry(post, post, len, 20);
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(cyl(h), white);
    p.position.set(s * halfW, h / 2, 0);
    p.castShadow = true;
    group.add(p);
    // עמודים אחוריים דקים שמחזיקים את הרשת
    const back = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, h, 8), white);
    back.position.set(s * halfW, h / 2, -depth);
    group.add(back);
    const topSide = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, depth, 8), white);
    topSide.rotation.x = Math.PI / 2;
    topSide.position.set(s * halfW, h, -depth / 2);
    group.add(topSide);
  }
  const bar = new THREE.Mesh(cyl(halfW * 2 + post * 2), white);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, h, 0);
  bar.castShadow = true;
  group.add(bar);
  const backBar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, halfW * 2, 8), white);
  backBar.rotation.z = Math.PI / 2;
  backBar.position.set(0, h, -depth);
  group.add(backBar);

  // רשת: הקיר האחורי בנוי מהרבה נקודות כדי שיוכל להתנפח כשהכדור נכנס
  const tex = netTexture();
  const netMat = (rx, ry) => {
    const t = tex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({
      map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false,
    });
  };
  const backGeo = new THREE.PlaneGeometry(halfW * 2, h, 48, 20);
  const backNet = new THREE.Mesh(backGeo, netMat(halfW * 2 / 0.7, h / 0.7));
  backNet.position.set(0, h / 2, -depth);
  group.add(backNet);
  const topNet = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, depth), netMat(halfW * 2 / 0.7, depth / 0.7));
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set(0, h, -depth / 2);
  group.add(topNet);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, h), netMat(depth / 0.7, h / 0.7));
    side.rotation.y = Math.PI / 2;
    side.position.set(s * halfW, h / 2, -depth / 2);
    group.add(side);
  }
  scene.add(group);

  // התנפחות הרשת: נקודת פגיעה שהולכת ונרגעת
  const base = backGeo.attributes.position.array.slice();
  const bulge = { x: 0, y: 0, amp: 0, t: 0 };
  return {
    hit(x, y, strength = 1) {
      bulge.x = x;
      bulge.y = y - h / 2;
      bulge.amp = 1.6 * strength;
      bulge.t = 0;
    },
    update(dt) {
      if (bulge.amp <= 0.001) return;
      bulge.t += dt;
      const a = bulge.amp * Math.exp(-bulge.t * 3) * Math.cos(bulge.t * 9);
      const p = backGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const d2 = (x - bulge.x) ** 2 + (y - bulge.y) ** 2;
        p.setZ(i, -a * Math.exp(-d2 / 6));
      }
      p.needsUpdate = true;
      if (bulge.t > 2.5) bulge.amp = 0;
    },
  };
}

// ---------- יציעים וקהל ----------

const SHIRTS = ['#d3121f', '#d3121f', '#ffd21a', '#ffd21a', '#0e9a48', '#1f3fae', '#ffffff', '#f5c400', '#c8102e', '#1b4fb5'];
const SKINS = ['#f6c49a', '#e9b086', '#c98d5f', '#8d5a3a', '#f3d2b5'];

export function buildStands(scene) {
  const concrete = new THREE.MeshStandardMaterial({ color: '#4b5263', roughness: 0.9 });
  const seatsMat = new THREE.MeshStandardMaterial({ color: '#2a3550', roughness: 0.8 });
  const spots = []; // מקומות של אנשים בקהל
  const rnd = seeded(11);

  // יציע מאחורי השער
  const rows = 16;
  for (let k = 0; k < rows; k++) {
    const z = -14 - k * 1.8;
    const y = 1.2 + k * 1.25;
    const step = new THREE.Mesh(new THREE.BoxGeometry(170, 1.25, 1.8), k % 2 ? concrete : seatsMat);
    step.position.set(0, y - 0.62, z);
    step.receiveShadow = true;
    scene.add(step);
    for (let x = -82; x <= 82; x += 1.35) {
      if (rnd() < 0.06) continue;
      spots.push([x + (rnd() - 0.5) * 0.3, y, z + 0.1, Math.PI * 0]);
    }
  }
  // קיר תחתון מתחת ליציע
  const wall = new THREE.Mesh(new THREE.BoxGeometry(170, 1.4, 0.6), concrete);
  wall.position.set(0, 0.7, -12.6);
  scene.add(wall);

  // יציעים בצדדים
  for (const s of [-1, 1]) {
    for (let k = 0; k < 14; k++) {
      const x = s * (84 + k * 1.8);
      const y = 1.2 + k * 1.25;
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.25, 140), k % 2 ? concrete : seatsMat);
      step.position.set(x, y - 0.62, 50);
      scene.add(step);
      for (let z = -12; z <= 118; z += 1.35) {
        if (rnd() < 0.08) continue;
        spots.push([x, y, z, -s * Math.PI / 2]);
      }
    }
  }

  // גג כהה מעל היציעים
  const roofMat = new THREE.MeshStandardMaterial({ color: '#1a1f2b', roughness: 0.7 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(220, 1, 22), roofMat);
  roof.position.set(0, 26, -36);
  roof.rotation.x = -0.12;
  scene.add(roof);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(220, 30, 1), roofMat);
  backWall.position.set(0, 12, -44);
  scene.add(backWall);
  for (const s of [-1, 1]) {
    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(1, 30, 170), roofMat);
    sideWall.position.set(s * 112, 12, 45);
    scene.add(sideWall);
  }

  // הקהל: דמויות קטנות בסגנון קוביות, הרבה מהן בבת אחת
  const n = spots.length;
  const bodyGeo = new THREE.BoxGeometry(0.95, 1.05, 0.55);
  const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const armGeo = new THREE.BoxGeometry(0.28, 0.8, 0.28);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
  const bodies = new THREE.InstancedMesh(bodyGeo, mat, n);
  const heads = new THREE.InstancedMesh(headGeo, mat, n);
  const arms = new THREE.InstancedMesh(armGeo, mat, n * 2);
  const c = new THREE.Color();
  const people = spots.map(([x, y, z, ry], i) => {
    bodies.setColorAt(i, c.set(SHIRTS[(rnd() * SHIRTS.length) | 0]));
    heads.setColorAt(i, c.set(SKINS[(rnd() * SKINS.length) | 0]));
    const shirt = new THREE.Color();
    bodies.getColorAt(i, shirt);
    arms.setColorAt(i * 2, shirt);
    arms.setColorAt(i * 2 + 1, shirt);
    return { x, y, z, ry, phase: rnd() * Math.PI * 2, speed: 0.7 + rnd() * 0.8, fan: rnd() };
  });
  scene.add(bodies, heads, arms);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const yAxis = new THREE.Vector3(0, 1, 0);
  const off = new THREE.Vector3();
  const armV = new THREE.Vector3();
  let excite = 0; // 0 = רגוע, 1 = חוגג
  let frame = 0;

  function update(t, dt) {
    frame++;
    // כשהקהל רגוע מעדכנים פחות פעמים כדי לחסוך בטלפון
    if (excite < 0.05 && frame % 3 !== 0) return;
    for (let i = 0; i < n; i++) {
      const p = people[i];
      const bounce = Math.max(0, Math.sin(t * 9 * p.speed + p.phase)) * 0.75 * excite
        + Math.sin(t * 1.5 * p.speed + p.phase) * 0.04;
      const by = p.y + 0.52 + bounce;
      q.setFromEuler(e.set(0, p.ry, 0));
      m.compose(pos.set(p.x, by, p.z), q, one);
      bodies.setMatrixAt(i, m);
      m.compose(pos.set(p.x, by + 0.85, p.z), q, one);
      heads.setMatrixAt(i, m);
      // ידיים: למעלה כשחוגגים, למטה כשרגועים
      const up = Math.min(1, excite * 1.4 + (p.fan > 0.85 ? 0.6 + Math.sin(t * 3 + p.phase) * 0.3 : 0));
      for (const s of [-1, 1]) {
        const ang = s * (0.15 + up * 2.6 + Math.sin(t * 10 + p.phase) * 0.2 * up);
        q.setFromEuler(e.set(0, p.ry, ang));
        off.set(s * 0.62, 0.3, 0).applyAxisAngle(yAxis, p.ry);
        armV.set(0, -0.35, 0).applyQuaternion(q);
        m.compose(pos.set(p.x + off.x + armV.x, by + off.y + armV.y, p.z + off.z + armV.z), q, one);
        arms.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m);
      }
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return {
    update,
    setExcite(v) { excite = v; },
    getExcite() { return excite; },
  };
}

// ---------- שלטי פרסום עם אורות ----------

export function buildBoards(scene) {
  const tex = canvasTex(2048, 128, (ctx, w, h) => {
    const items = [
      ['עמוס 10', '#d3121f', '#ffd21a'],
      ['ספרד 🇪🇸', '#1d2a6b', '#ffffff'],
      ['ניב 1', '#ffd21a', '#0e9a48'],
      ['ברזיל 🇧🇷', '#0e9a48', '#ffd21a'],
    ];
    const seg = w / items.length;
    items.forEach(([text, bg, fg], i) => {
      ctx.fillStyle = bg;
      ctx.fillRect(i * seg, 0, seg, h);
      ctx.fillStyle = fg;
      ctx.font = '900 76px Rubik, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      ctx.fillText(text, i * seg + seg / 2, h / 2 + 4);
    });
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const board = new THREE.Mesh(new THREE.BoxGeometry(170, 1.8, 0.3), [
    new THREE.MeshStandardMaterial({ color: '#111' }), new THREE.MeshStandardMaterial({ color: '#111' }),
    new THREE.MeshStandardMaterial({ color: '#111' }), new THREE.MeshStandardMaterial({ color: '#111' }),
    mat, new THREE.MeshStandardMaterial({ color: '#111' }),
  ]);
  board.position.set(0, 0.9, -9);
  scene.add(board);
  const sideMats = [];
  for (const s of [-1, 1]) {
    const t2 = tex.clone();
    t2.needsUpdate = true;
    t2.repeat.set(2.4, 1);
    const sm = new THREE.MeshBasicMaterial({ map: t2 });
    sideMats.push(t2);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(130, 1.8), sm);
    b.position.set(s * 80, 0.9, 52);
    b.rotation.y = -s * Math.PI / 2;
    scene.add(b);
  }
  return {
    update(dt) {
      tex.offset.x += dt * 0.05;
      for (const t of sideMats) t.offset.x += dt * 0.05;
    },
  };
}

// ---------- שמיים וזרקורים ----------

function glowTexture() {
  return canvasTex(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.25, 'rgba(255,250,220,0.6)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export function buildSky(scene) {
  const sky = canvasTex(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050a1c');
    g.addColorStop(0.45, '#0f1d45');
    g.addColorStop(0.62, '#2c3f7c');
    g.addColorStop(0.75, '#463b6e');
    g.addColorStop(1, '#141824');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(400, 32, 16),
    new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  dome.position.y = -40;
  scene.add(dome);

  // כוכבים
  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  const rnd = seeded(5);
  for (let i = 0; i < 500; i++) {
    const a = rnd() * Math.PI * 2, el = 0.25 + rnd() * 1.2;
    pts.push(Math.cos(a) * Math.cos(el) * 380, Math.sin(el) * 380 - 40, Math.sin(a) * Math.cos(el) * 380);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.2, sizeAttenuation: false, fog: false })));

  // ארבעה עמודי זרקורים
  const glow = glowTexture();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.6 });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fffbe8' });
  for (const [x, z] of [[-100, -40], [100, -40], [-100, 120], [100, 120]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 50, 10), poleMat);
    pole.position.set(x, 25, z);
    scene.add(pole);
    const panel = new THREE.Group();
    panel.position.set(x, 52, z);
    panel.lookAt(0, 0, 30);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 0.5), lampMat);
        lamp.position.set((c - 1.5) * 2.6, (r - 1) * 2.6, 0);
        panel.add(lamp);
      }
    }
    scene.add(panel);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    sprite.scale.set(46, 46, 1);
    sprite.position.set(x, 52, z);
    scene.add(sprite);
  }
}
