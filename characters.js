// בניית הדמויות בסגנון רובלוקס קלאסי, לפי התמונה: עמוס (ספרד) וניב (שוער ברזיל)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// הגדרות המראה של כל דמות
export const KITS = {
  amos: {
    name: 'עמוס',
    number: '10',
    skin: '#f6bf8f',
    hair: '#a87743',
    hairDark: '#7d5228',
    hairStyle: 'quiff',
    // פנים: מבט נחוש, פה סגור ורציני, נמשים קטנים
    face: { brow: '#4a2c17', browThick: 24, browTilt: 0.34, mouth: 'flat', freckles: 8 },
    shirt: '#d3121f',
    collar: '#1d2a6b',
    collarEdge: '#f5c400',
    keeper: false,
    crest: 'spain',
    shorts: '#1f3fae',
    socks: '#d3121f',
    sockStripes: ['#f5c400', '#1d2a6b', '#f5c400'],
    shoes: '#1a1a1a',
    numberColor: '#f5c400',
  },
  niv: {
    name: 'ניב',
    number: '1',
    skin: '#f3b98a',
    hair: '#c08848',
    hairDark: '#91602e',
    hairStyle: 'fringe',
    // פנים: גבות כועסות ופה פתוח שצועק כשהוא קופץ
    face: { brow: '#4a2a14', browThick: 26, browTilt: 0.38, mouth: 'shout', freckles: 4 },
    shirt: '#ffd21a',
    collar: '#0e9a48',
    collarEdge: '#0e9a48',
    keeper: true,
    stripe: '#0e9a48',
    crest: 'brazil',
    shorts: '#ffd21a',
    socks: '#ffd21a',
    sockStripes: ['#0e9a48', '#0e9a48'],
    shoes: '#1a1a1a',
    gloves: { palm: '#9fae9a', back: '#bccab6', wrist: '#1c1c1c' },
    numberColor: '#0e9a48',
  },
};

// מחולל מספרים אקראיים קבוע, כדי שהשיער ייראה אותו דבר בכל פעם
function seeded(seed) {
  return () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// חומר פלסטיק חלק כמו ברובלוקס
function plastic(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, envMapIntensity: 0.55, ...extra });
}

function texPlastic(map) {
  return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0, envMapIntensity: 0.55 });
}

function block(w, h, d, material, radius = 0.1) {
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w / 2.01, h / 2.01, d / 2.01));
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// ---------- ציורים על הבגדים ----------

function shieldPath(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(-s, -s);
  ctx.lineTo(s, -s);
  ctx.lineTo(s, s * 0.25);
  ctx.quadraticCurveTo(s, s * 1.05, 0, s * 1.35);
  ctx.quadraticCurveTo(-s, s * 1.05, -s, s * 0.25);
  ctx.closePath();
}

function drawCrest(ctx, type, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  if (type === 'spain') {
    // מגן זהב עם כתר, כמו הסמל של ספרד
    ctx.fillStyle = '#e8b21a';
    shieldPath(ctx, s);
    ctx.fill();
    ctx.lineWidth = s * 0.12;
    ctx.strokeStyle = '#9c6d0b';
    ctx.stroke();
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(-s * 0.7, -s * 0.7, s * 0.65, s * 0.8);
    ctx.fillRect(s * 0.05, s * 0.1, s * 0.65, s * 0.7);
    ctx.fillStyle = '#e8b21a';
    ctx.fillRect(-s * 0.75, -s * 1.55, s * 1.5, s * 0.4);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(i * s * 0.55, -s * 1.6, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // סמל ברזיל: כוכבים ומגן כחול עם מסגרת ירוקה
    ctx.fillStyle = '#0e9a48';
    for (let i = 0; i < 5; i++) star(ctx, -s * 0.8 + i * s * 0.4, -s * 1.5, s * 0.15);
    ctx.fillStyle = '#1b4fb5';
    shieldPath(ctx, s);
    ctx.fill();
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = '#0e9a48';
    ctx.stroke();
    ctx.fillStyle = '#ffd21a';
    ctx.font = `900 ${s * 0.75}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CBF', 0, s * 0.1);
  }
  ctx.restore();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function fabric(ctx, w, h) {
  // מרקם בד עדין
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 3);
}

function shirtFront(kit) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = kit.shirt;
    ctx.fillRect(0, 0, w, h);
    fabric(ctx, w, h);
    // צווארון וי
    ctx.fillStyle = kit.collarEdge;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w * 0.5, h * 0.2);
    ctx.lineTo(w * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = kit.keeper ? kit.shirt : kit.collar;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, 0);
    ctx.lineTo(w * 0.5, h * 0.15);
    ctx.lineTo(w * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    // הסמל בצד שמאל של החזה (מימין למי שמסתכל)
    drawCrest(ctx, kit.crest, w * 0.72, h * 0.34, 36);
    // לוגו קטן בצד השני
    if (kit.keeper) {
      ctx.strokeStyle = '#0e9a48';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.2, h * 0.33);
      ctx.quadraticCurveTo(w * 0.24, h * 0.39, w * 0.33, h * 0.3);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f5c400';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(w * 0.2 + i * 15, h * 0.37 - i * 9, 10, 12 + i * 9);
      }
    }
    // צל עדין בתחתית החולצה
    const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function shirtBack(kit) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = kit.shirt;
    ctx.fillRect(0, 0, w, h);
    fabric(ctx, w, h);
    ctx.fillStyle = kit.collar;
    ctx.fillRect(w * 0.33, 0, w * 0.34, 16);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = kit.numberColor;
    ctx.direction = 'rtl';
    ctx.font = '900 84px Arial, sans-serif';
    ctx.fillText(kit.name, w / 2, h * 0.2);
    ctx.direction = 'ltr';
    ctx.font = '900 270px Arial Black, Arial';
    ctx.fillText(kit.number, w / 2, h * 0.62);
  });
}

// גרב עם פסים למעלה
function sockTexture(kit) {
  return canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = kit.socks;
    ctx.fillRect(0, 0, w, h);
    kit.sockStripes.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 26 + i * 30, w, 18);
    });
  });
}

// ---------- הפנים ----------

function faceTexture(kit) {
  const f = kit.face;
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = kit.skin;
    ctx.fillRect(0, 0, 512, 512);
    const cx = 256;
    const eyeY = 268;
    const gap = 62;

    // נמשים קטנים על הלחיים
    const rnd = seeded(f.freckles * 31 + 5);
    ctx.fillStyle = 'rgba(176,104,66,0.5)';
    for (let i = 0; i < f.freckles; i++) {
      const side = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(cx + side * (72 + rnd() * 30), eyeY + 50 + rnd() * 22, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // עיניים: אליפסות שחורות עם נקודת אור
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#16100c';
      ctx.beginPath();
      ctx.ellipse(cx + s * gap, eyeY, 17, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + s * gap + 6, eyeY - 9, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // גבות עבות בזווית של מבט נחוש (הצד הפנימי נמוך יותר)
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + s * (gap + 2), eyeY - 48);
      ctx.rotate(-s * f.browTilt);
      ctx.fillStyle = f.brow;
      const bw = 64, t = f.browThick;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -t / 2 + 3);
      ctx.quadraticCurveTo(0, -t / 2 - 4, bw / 2, -t / 2 + 3);
      ctx.lineTo(bw / 2, t / 2 - 3);
      ctx.quadraticCurveTo(0, t / 2 - 1, -bw / 2, t / 2 - 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // פה
    const my = eyeY + 92;
    if (f.mouth === 'shout') {
      // פה פתוח שצועק, עם שיניים למעלה
      ctx.fillStyle = '#4a1414';
      ctx.beginPath();
      ctx.moveTo(cx - 34, my - 12);
      ctx.quadraticCurveTo(cx, my - 18, cx + 34, my - 12);
      ctx.quadraticCurveTo(cx + 28, my + 24, cx, my + 26);
      ctx.quadraticCurveTo(cx - 28, my + 24, cx - 34, my - 12);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 40, my - 22, 80, 17);
      ctx.fillStyle = '#d65a5a';
      ctx.beginPath();
      ctx.ellipse(cx, my + 26, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // פה סגור וקצת רציני
      ctx.strokeStyle = '#3a1d12';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 24, my + 3);
      ctx.quadraticCurveTo(cx, my - 5, cx + 24, my + 3);
      ctx.stroke();
    }
  });
}

// ---------- שיער ----------

// מעבר רך בין 0 ל-1
function smooth(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * שיער לפי התמונות המקוריות. המעטפת יושבת על הראש, והעובי שלה משתנה לפי המקום:
 * עמוס: שיער מורם למעלה ואחורה, מצח גלוי, קווצות גליות עם הרבה נפח מעל המצח, צדדים קצרים.
 * ניב: פוני כבד ופרוע שנופל עד מעל הגבות, קווצות בצדעיים שבורחות החוצה, צדדים קצרים.
 */
function buildHair(kit) {
  const geo = new THREE.SphereGeometry(1, 160, 120);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(kit.hair);
  const dark = new THREE.Color(kit.hairDark);
  const quiff = kit.hairStyle === 'quiff';
  // גודל הראש (צורה קצת מרובעת שמכסה את הפינות המעוגלות)
  const A = 0.7, B = 0.67, C = 0.64, P = 3.5;
  const d = new THREE.Vector3();
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const ang = Math.atan2(d.x, d.z); // 0 = קדימה
    const c = Math.cos(ang);
    const sn = Math.sin(ang);
    const rHead = 1 / Math.pow(Math.abs(d.x / A) ** P + Math.abs(d.y / B) ** P + Math.abs(d.z / C) ** P, 1 / P);
    const y = rHead * d.y;
    const front = Math.max(0, c);
    const top = smooth(0.1, 0.75, d.y);

    // קווצות: חריצים באלכסון ובליטות פרועות
    const ridge = 0.55 * Math.sin(8 * ang + 4.5 * d.y) + 0.3 * Math.sin(19 * ang + 1.7 + 6 * d.y) + 0.15 * Math.sin(31 * ang - 2 * d.y);
    const clump = Math.pow(Math.max(0, Math.sin(6 * ang + 2) * Math.sin(9 * d.y + 0.5)), 2);

    let hl, T;
    if (quiff) {
      // קו שיער גבוה: המצח גלוי, ובצדדים השיער יורד עד מעל האוזן
      hl = c >= 0 ? 0.04 + 0.44 * Math.pow(c, 2.2) : 0.04 - 0.5 * (-c);
      // תלתלים: בליטות קטנות ופרועות בכל הכיפה
      const curls = Math.pow(Math.max(0, Math.sin(11 * ang + 7 * d.y) * Math.sin(13 * d.y - 3 * ang + 1)), 1.5)
        + 0.6 * Math.pow(Math.max(0, Math.sin(17 * ang - 9 * d.y + 2)), 3);
      T = 0.045 + 0.15 * top
        // נפח גדול מעל המצח, שעולה למעלה ואחורה
        + 0.22 * Math.pow(front, 1.1) * smooth(0.4, 0.8, d.y) * (1 - 0.5 * smooth(0.88, 1, d.y))
        + 0.07 * curls * smooth(0.0, 0.5, d.y)
        + 0.022 * ridge * top;
    } else {
      // קו שיער נמוך מקדימה: הפוני מגיע עד מעל הגבות
      hl = c >= 0 ? 0.0 + 0.22 * Math.pow(c, 1.4) : 0.0 - 0.48 * (-c);
      if (c > 0.15) {
        // קצוות מחודדים של הפוני שיורדים לכיוון הגבות
        const tips = Math.pow(Math.max(0, Math.sin(9 * ang + 0.8)), 4) + 0.6 * Math.pow(Math.max(0, Math.sin(14 * ang + 2.1)), 6);
        hl -= 0.09 * tips * c;
      }
      // קווצות בצדעיים שבורחות החוצה
      const wisp = Math.exp(-(((Math.abs(ang) - 0.95) / 0.22) ** 2)) * Math.exp(-(((d.y - 0.32) / 0.16) ** 2));
      T = 0.05 + 0.15 * top
        // הפוני בולט קדימה מעל המצח
        + 0.11 * Math.pow(front, 2) * (1 - smooth(0.35, 0.8, d.y))
        + 0.09 * clump * smooth(0.0, 0.5, d.y)
        + 0.17 * wisp
        + 0.035 * ridge * smooth(-0.2, 0.3, d.y);
    }

    // מתחת לקו השיער המעטפת נכנסת לתוך הראש ולא רואים אותה
    const t = smooth(hl - 0.05, hl + 0.03, y);
    // השיער מתדלדל לכיוון הקצה, כמו קווצות שנופלות, ולא נגמר בשפה עבה
    const taper = 0.25 + 0.75 * smooth(hl, hl + (quiff ? 0.1 : 0.2), y);
    const r = rHead * 0.75 + (rHead * 0.25 + Math.max(0, T) * taper) * t;
    pos.setXYZ(i, d.x * r, d.y * r, d.z * r);

    // צבע: כהה בחריצים ובקצוות, בהיר על הקווצות, עם פסים דקים של שערות
    const strands = 0.05 * Math.sin(45 * ang + 12 * d.y) + 0.03 * Math.sin(71 * ang - 5 * d.y);
    const light = 0.8 + 0.16 * ridge + 0.12 * Math.max(0, d.y) + 0.12 * clump + strands;
    tmp.copy(base).lerp(dark, 0.2 * (1 - t) + 0.25 * Math.max(0, -ridge));
    tmp.multiplyScalar(light);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.62, metalness: 0, envMapIntensity: 0.55,
  }));
  mesh.castShadow = true;
  return mesh;
}

// ---------- הדמות ----------

/**
 * בונה דמות שלמה. הדמות עומדת על y=0 ופונה לכיוון +z.
 * ידיים ורגליים מחוברות בכתפיים ובירכיים, כדי שאפשר יהיה להזיז אותן באנימציה.
 */
export function createCharacter(key) {
  const kit = KITS[key];
  const root = new THREE.Group();
  root.name = key;
  const body = new THREE.Group(); // כל הגוף, כדי שאפשר יהיה להטות אותו בקפיצה
  root.add(body);

  const skin = plastic(kit.skin);
  const shirt = plastic(kit.shirt);
  const shorts = plastic(kit.shorts);
  const shoes = plastic(kit.shoes, { roughness: 0.35 });
  const stripe = kit.stripe ? plastic(kit.stripe) : null;
  const black = plastic('#1c1c1c');

  // רגליים
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(s * 0.5, 2, 0);
    const short = block(0.98, 0.8, 0.98, shorts, 0.12);
    short.position.y = -0.4;
    leg.add(short);
    if (kit.keeper) {
      // מכנסי שוער: פס שחור בברך ומכנס ארוך צהוב עם פס ירוק
      const band = block(0.96, 0.14, 0.96, black, 0.05);
      band.position.y = -0.86;
      leg.add(band);
      const lower = block(0.94, 0.86, 0.94, texPlastic(sockTexture(kit)), 0.1);
      lower.position.y = -1.36;
      leg.add(lower);
      const side = block(0.05, 1.5, 0.18, stripe, 0.02);
      side.position.set(s * 0.49, -0.95, 0);
      leg.add(side);
    } else {
      const knee = block(0.94, 0.42, 0.94, skin, 0.08);
      knee.position.y = -0.98;
      leg.add(knee);
      const sock = block(0.96, 0.6, 0.96, texPlastic(sockTexture(kit)), 0.08);
      sock.position.y = -1.48;
      leg.add(sock);
    }
    const shoe = block(1.0, 0.3, 1.12, shoes, 0.1);
    shoe.position.set(0, -1.85, 0.06);
    leg.add(shoe);
    body.add(leg);
    legs.push(leg);
  }

  // גוף
  const front = texPlastic(shirtFront(kit));
  const back = texPlastic(shirtBack(kit));
  const torso = block(2, 2, 1, [shirt, shirt, shirt, shirt, front, back], 0.14);
  torso.position.y = 3;
  body.add(torso);

  // ידיים
  const arms = [];
  const hands = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(s * 1.5, 3.82, 0);
    if (kit.keeper) {
      // שרוול צהוב עם פס ירוק, אמה, צמיד שחור וכפפת שוער
      const sleeve = block(0.98, 1.0, 0.98, shirt, 0.14);
      sleeve.position.y = -0.32;
      arm.add(sleeve);
      const side = block(0.05, 0.9, 0.18, stripe, 0.02);
      side.position.set(s * 0.49, -0.32, 0);
      arm.add(side);
      const cuff = block(1.0, 0.1, 1.0, stripe, 0.04);
      cuff.position.y = -0.82;
      arm.add(cuff);
      const fore = block(0.9, 0.42, 0.9, skin, 0.1);
      fore.position.y = -1.06;
      arm.add(fore);
      const wrist = block(0.98, 0.2, 0.98, plastic(kit.gloves.wrist), 0.06);
      wrist.position.y = -1.36;
      arm.add(wrist);
      const glove = block(1.1, 0.66, 1.1, plastic(kit.gloves.back, { roughness: 0.8 }), 0.18);
      glove.position.y = -1.78;
      arm.add(glove);
      hands.push(glove);
      const thumb = block(0.3, 0.44, 0.34, plastic(kit.gloves.palm, { roughness: 0.8 }), 0.12);
      thumb.position.set(-s * 0.5, -1.66, 0.28);
      thumb.rotation.z = -s * 0.35;
      arm.add(thumb);
    } else {
      const sleeve = block(0.98, 0.78, 0.98, shirt, 0.14);
      sleeve.position.y = -0.3;
      arm.add(sleeve);
      const lower = block(0.92, 1.25, 0.92, skin, 0.14);
      lower.position.y = -1.3;
      arm.add(lower);
      hands.push(lower);
    }
    body.add(arm);
    arms.push(arm);
  }

  // ראש מעוגל
  const head = { w: 1.32, h: 1.26, d: 1.2 };
  const headGroup = new THREE.Group();
  headGroup.position.y = 4.08 + head.h / 2;
  const faceMat = texPlastic(faceTexture(kit));
  const headMesh = block(head.w, head.h, head.d, [skin, skin, skin, skin, faceMat, skin], 0.36);
  headGroup.add(headMesh);
  const neck = block(0.62, 0.3, 0.62, skin, 0.1);
  neck.position.y = -head.h / 2 - 0.06;
  headGroup.add(neck);
  headGroup.add(buildHair(kit));
  body.add(headGroup);

  root.userData = { kit, body, legs, arms, hands, head: headGroup, headY: headGroup.position.y, torso };
  return root;
}

// ---------- תנוחות ----------

function reset(c) {
  const u = c.userData;
  u.body.position.set(0, 0, 0);
  u.body.rotation.set(0, 0, 0);
  u.head.rotation.set(0, 0, 0);
  u.head.position.y = u.headY;
  for (const p of [...u.arms, ...u.legs]) p.rotation.set(0, 0, 0);
}

// עמידה רגילה עם נשימה קלה
export function poseIdle(c, t = 0) {
  reset(c);
  const u = c.userData;
  u.arms[0].rotation.z = -0.06;
  u.arms[1].rotation.z = 0.06;
  u.head.position.y = u.headY + Math.sin(t * 2) * 0.02;
}

// ריצה: phase מתקדם עם הזמן
export function poseRun(c, phase) {
  reset(c);
  const u = c.userData;
  const sw = Math.sin(phase);
  u.legs[0].rotation.x = sw * 0.8;
  u.legs[1].rotation.x = -sw * 0.8;
  u.arms[0].rotation.x = -sw * 0.9;
  u.arms[1].rotation.x = sw * 0.9;
  u.body.rotation.x = 0.12;
  u.body.position.y = Math.abs(Math.cos(phase)) * 0.18;
}

// בעיטה: amount בין 0 (רגל אחורה) ל-1 (רגל קדימה אחרי הבעיטה)
export function poseKick(c, amount) {
  reset(c);
  const u = c.userData;
  const k = -1.3 + amount * 2.6;
  u.legs[1].rotation.x = -k;
  u.legs[0].rotation.x = 0.15;
  u.arms[0].rotation.z = -0.9;
  u.arms[1].rotation.z = 0.5;
  u.arms[1].rotation.x = 0.4;
  u.body.rotation.x = 0.1 - amount * 0.15;
}

// שוער מוכן: ברכיים כפופות וידיים פתוחות
export function poseKeeperReady(c, t = 0) {
  reset(c);
  const u = c.userData;
  u.arms[0].rotation.z = -0.7;
  u.arms[1].rotation.z = 0.7;
  u.arms[0].rotation.x = u.arms[1].rotation.x = -0.4;
  u.legs[0].rotation.z = -0.15;
  u.legs[1].rotation.z = 0.15;
  u.body.position.y = -0.15 + Math.sin(t * 5) * 0.04;
  u.body.position.x = Math.sin(t * 2.5) * 0.12;
}

/**
 * קפיצת שוער. side: 1 ימינה (+x), -1 שמאלה. amount בין 0 ל-1.
 * height: כמה גבוה הקפיצה (0 נמוך, 1 גבוה).
 */
export function poseDive(c, side, amount, height = 0.5) {
  reset(c);
  const u = c.userData;
  const a = Math.min(1, amount);
  // קפיצה נמוכה = הגוף כמעט שוכב, קפיצה גבוהה = הגוף יותר זקוף
  const lift = Math.sin(a * Math.PI * 0.85) * (0.3 + height * 1.8);
  u.body.position.x = side * a * 2.6;
  u.body.position.y = lift + a * 0.4;
  u.body.rotation.z = -side * a * (1.4 - 0.8 * height);
  // הידיים מתוחות מעל הראש לכיוון הקפיצה
  u.arms[0].rotation.z = -2.5 * a - (side < 0 ? 0.35 * a : 0);
  u.arms[1].rotation.z = 2.5 * a + (side > 0 ? 0.35 * a : 0);
  u.arms[0].rotation.x = u.arms[1].rotation.x = -0.25 * a;
  u.legs[0].rotation.z = -0.25 * a;
  u.legs[1].rotation.z = 0.25 * a;
  u.legs[side > 0 ? 0 : 1].rotation.x = 0.6 * a;
  u.head.rotation.z = side * 0.3 * a;
}

// שוער נשאר באמצע וקופץ למעלה עם ידיים מורמות
export function poseJumpCenter(c, amount) {
  reset(c);
  const u = c.userData;
  const a = Math.min(1, amount);
  u.body.position.y = Math.sin(a * Math.PI) * 1.1;
  u.arms[0].rotation.z = -2.7 * a;
  u.arms[1].rotation.z = 2.7 * a;
  u.legs[0].rotation.z = -0.15 * a;
  u.legs[1].rotation.z = 0.15 * a;
}

// חגיגה: קופץ עם ידיים למעלה
export function poseCelebrate(c, t) {
  reset(c);
  const u = c.userData;
  const j = Math.abs(Math.sin(t * 7));
  u.body.position.y = j * 0.9;
  u.arms[0].rotation.z = -2.6 - Math.sin(t * 14) * 0.25;
  u.arms[1].rotation.z = 2.6 + Math.sin(t * 14) * 0.25;
  u.legs[0].rotation.x = j * 0.4;
  u.legs[1].rotation.x = -j * 0.4;
  u.head.rotation.x = -0.25;
}

// אכזבה: ראש למטה וידיים על הראש
export function poseSad(c, t) {
  reset(c);
  const u = c.userData;
  u.head.rotation.x = 0.35 + Math.sin(t * 2) * 0.05;
  u.arms[0].rotation.z = -2.3;
  u.arms[1].rotation.z = 2.3;
  u.arms[0].rotation.x = u.arms[1].rotation.x = -0.9;
  u.body.rotation.x = 0.08;
}

// כדור כדורגל: כתמים שחורים מסודרים כמו בכדור אמיתי
export function createBall(radius = 0.62) {
  const geo = new THREE.SphereGeometry(radius, 64, 48);
  const t = (1 + Math.sqrt(5)) / 2;
  const dirs = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    let best = 0;
    for (const d of dirs) best = Math.max(best, v.dot(d));
    const c = best > 0.93 ? 0.06 : 0.95;
    colors.set([c, c, c], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, envMapIntensity: 0.6 }));
  ball.castShadow = true;
  return ball;
}
