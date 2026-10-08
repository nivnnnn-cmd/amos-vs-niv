// כל הקולות של המשחק נוצרים כאן בקוד, בלי קבצי שמע
let ctx = null;
let master = null;
let crowdGain = null;
let muted = false;
let noiseBuf = null;
let crowdPlayers = [];
let paused = false;

function noiseBuffer() {
  // רעש "חום": נשמע כמו המולה של הרבה אנשים
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.04 * w) / 1.04;
      d[i] = last * 3.2;
    }
  }
  return buf;
}

function noiseSource(loop = false) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = loop;
  return s;
}

function env(gainNode, t, attack, peak, hold, release) {
  const g = gainNode.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.0001, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setValueAtTime(peak, t + attack + hold);
  g.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
}

/** חייבים להפעיל אחרי נגיעה של המשתמש, כי טלפונים חוסמים צלילים לפני זה */
export function initAudio() {
  if (ctx) {
    if (paused) resumeAll();
    else if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);
  noiseBuf = noiseBuffer();
  startCrowd();
  if (document.hidden) pauseAll();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}

export function isMuted() {
  return muted;
}

// ---------- קהל ברקע: הקלטה אמיתית ----------

const CROWD_URL = 'crowd.m4a';
const FADE = 2.5; // שניות של מעבר רך כשההקלטה חוזרת להתחלה

function startCrowd() {
  crowdGain = ctx.createGain();
  crowdGain.gain.value = 0.7;
  crowdGain.connect(master);
  // שני עותקים של ההקלטה: לפני שאחד נגמר, השני מתחיל ונכנס בהדרגה, ככה לא שומעים קפיצה
  const players = [0, 1].map(() => {
    const el = new Audio(CROWD_URL);
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    const g = ctx.createGain();
    g.gain.value = 0;
    ctx.createMediaElementSource(el).connect(g).connect(crowdGain);
    return { el, g, fading: false, wasPlaying: false };
  });
  crowdPlayers = players;
  // בטלפונים צריך "להעיר" את שני הנגנים בזמן הנגיעה של המשתמש
  players[1].el.play().then(() => players[1].el.pause()).catch(() => {});
  let cur = 0;
  const start = (i, fadeIn) => {
    const p = players[i];
    p.fading = false;
    p.el.currentTime = 0;
    p.el.play().catch(() => {});
    const t = ctx.currentTime;
    p.g.gain.cancelScheduledValues(t);
    p.g.gain.setValueAtTime(0, t);
    p.g.gain.linearRampToValueAtTime(1, t + fadeIn);
  };
  start(0, 1);
  setInterval(() => {
    const p = players[cur];
    if (!p.el.duration || p.fading) return;
    if (p.el.duration - p.el.currentTime < FADE + 0.4) {
      p.fading = true;
      const t = ctx.currentTime;
      p.g.gain.cancelScheduledValues(t);
      p.g.gain.setValueAtTime(p.g.gain.value, t);
      p.g.gain.linearRampToValueAtTime(0, t + FADE);
      setTimeout(() => p.el.pause(), (FADE + 0.5) * 1000);
      cur = 1 - cur;
      start(cur, FADE);
    }
  }, 200);
}

// ---------- אפקטים ----------

export function whistle() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const g = ctx.createGain();
  env(g, t, 0.01, 0.22, 0.35, 0.08);
  g.connect(master);
  for (const f of [2750, 2950]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    // רעידה מהירה כמו הכדור הקטן בתוך משרוקית
    const vib = ctx.createOscillator();
    vib.frequency.value = 38;
    const vg = ctx.createGain();
    vg.gain.value = 90;
    vib.connect(vg).connect(o.frequency);
    o.connect(g);
    o.start(t);
    vib.start(t);
    o.stop(t + 0.5);
    vib.stop(t + 0.5);
  }
}

export function kick(power = 0.5) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = ctx.createGain();
  env(g, t, 0.002, 0.6 + power * 0.4, 0.01, 0.16);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.25);
  const n = noiseSource();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const ng = ctx.createGain();
  env(ng, t, 0.001, 0.5, 0.01, 0.06);
  n.connect(lp).connect(ng).connect(master);
  n.start(t, Math.random() * 2);
  n.stop(t + 0.1);
}

// הד של אצטדיון, כדי שהחצוצרות יישמעו גדולות
let reverb = null;
function getReverb() {
  if (reverb) return reverb;
  const len = ctx.sampleRate * 2.2;
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  reverb = ctx.createConvolver();
  reverb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(master);
  return reverb;
}

// צליל של חצוצרה: מתנד "צורם" שעובר במסנן שנפתח בתחילת כל צליל
function trumpet(t, freq, dur, vol = 0.16) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(vol, t + 0.03);
  out.gain.setValueAtTime(vol * 0.85, t + Math.max(0.05, dur - 0.06));
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2;
  lp.frequency.setValueAtTime(freq * 1.5, t);
  lp.frequency.linearRampToValueAtTime(freq * 6, t + 0.05);
  lp.frequency.setTargetAtTime(freq * 4, t + 0.06, 0.1);
  lp.connect(out);
  out.connect(master);
  out.connect(getReverb());
  // רעידה קטנה בצליל, כמו נגן אמיתי
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.5;
  const vg = ctx.createGain();
  vg.gain.value = freq * 0.006;
  vib.connect(vg);
  for (const det of [0, 4]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    vg.connect(o.frequency);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.2);
  }
  vib.start(t);
  vib.stop(t + dur + 0.2);
}

function timpani(t, freq, vol = 0.35) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.8, t + 0.5);
  const g = ctx.createGain();
  env(g, t, 0.005, vol, 0.02, 0.7);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.9);
}

// גול: מנגינת חצוצרות שמחה עם תופים
export function goal() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.05;
  // "טה-טה-טה-טאאם, טה-טאאאם!"
  const melody = [
    [392.0, 0.15], [523.25, 0.15], [659.25, 0.15], [783.99, 0.38],
    [659.25, 0.15], [783.99, 0.9],
  ];
  const harmony = [
    [329.63, 0.15], [392.0, 0.15], [523.25, 0.15], [659.25, 0.38],
    [523.25, 0.15], [659.25, 0.9],
  ];
  let x = t;
  for (let i = 0; i < melody.length; i++) {
    trumpet(x, melody[i][0], melody[i][1] * 0.95, 0.15);
    trumpet(x, harmony[i][0], harmony[i][1] * 0.95, 0.09);
    x += melody[i][1];
  }
  timpani(t + 0.45, 98);
  timpani(t + 0.98, 131, 0.4);
  // משפט שני, חגיגי
  const x2 = x + 0.15;
  const tail = [[783.99, 0.18], [880.0, 0.18], [987.77, 0.18], [1046.5, 1.1]];
  let y = x2;
  for (const [f, d] of tail) {
    trumpet(y, f, d * 0.95, 0.13);
    trumpet(y, f * 0.75, d * 0.95, 0.08);
    y += d;
  }
  timpani(x2 + 0.54, 131, 0.45);
  timpani(x2 + 0.7, 98, 0.45);
}

export function post() {
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, v] of [[523, 0.3], [1310, 0.18], [2390, 0.1], [3700, 0.05]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    env(g, t, 0.001, v, 0.01, 1.1);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 1.3);
  }
}

// כדור שנכנס לרשת
export function net() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const n = noiseSource();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  const g = ctx.createGain();
  env(g, t, 0.01, 0.35, 0.05, 0.3);
  n.connect(hp).connect(g).connect(master);
  n.start(t, Math.random());
  n.stop(t + 0.5);
}

export function save() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.1);
  const g = ctx.createGain();
  env(g, t, 0.002, 0.5, 0.01, 0.12);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.2);
}

// העוצמה של הקהל ברקע עולה ויורדת לפי מה שקורה
export function crowdLevel(v) {
  if (crowdGain) crowdGain.gain.setTargetAtTime(v, ctx.currentTime, 0.4);
}

// השתקה מלאה כשעוזבים את המשחק: סוגרים את החלון, עוברים לחלון אחר או לאפליקציה אחרת.
// עוצרים גם את נגני הקהל עצמם, אחרת הם ממשיכים לרוץ ברקע
function pauseAll() {
  if (!ctx || paused) return;
  paused = true;
  ctx.suspend();
  for (const p of crowdPlayers) {
    p.wasPlaying = !p.el.paused;
    p.el.pause();
  }
}

function resumeAll() {
  if (!ctx || !paused) return;
  paused = false;
  ctx.resume();
  for (const p of crowdPlayers) if (p.wasPlaying) p.el.play().catch(() => {});
}

document.addEventListener('visibilitychange', () => (document.hidden ? pauseAll() : resumeAll()));
addEventListener('blur', pauseAll);
addEventListener('pagehide', pauseAll);
addEventListener('focus', () => { if (!document.hidden) resumeAll(); });
