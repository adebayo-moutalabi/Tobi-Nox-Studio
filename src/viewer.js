// Visualiseur commun : scène, caméra, déplacements, objets, interface.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProp, PROPS } from './props.js';

export function startViewer(cfg) {
  const stage = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const BACKDROPS = {
    studio: { bg: '#d8d9d8', floor: '#d8d9d8', ring: '#c6c7c6', key: 1.35, hemi: 0.72, env: 0.42 },
    nuit: { bg: '#2c4272', floor: '#2c4272', ring: '#3a5288', key: 1.1, hemi: 0.7, env: 0.38 },
  };
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.02, 80);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxDistance = 14; controls.maxPolarAngle = Math.PI * 0.53; controls.enablePan = false;

  const key = new THREE.DirectionalLight('#fff4e6', 2.3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -2.2; key.shadow.camera.right = 2.2; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1.4;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 14;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.012; key.shadow.radius = 7;
  scene.add(key, key.target);
  const hemi = new THREE.HemisphereLight('#e6ebf5', '#a59c92', 0.55); scene.add(hemi);
  const rim = new THREE.DirectionalLight('#cfe0ff', 0.7); scene.add(rim, rim.target);

  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, envMapIntensity: 0.15 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ringsGeo = new THREE.BufferGeometry();
  {
    const pts = [];
    for (let r = 1; r <= 12; r++) for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2, b = ((i + 1) / 96) * Math.PI * 2;
      pts.push(Math.cos(a) * r, 0.001, Math.sin(a) * r, Math.cos(b) * r, 0.001, Math.sin(b) * r);
    }
    ringsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }
  const ringMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
  scene.add(new THREE.LineSegments(ringsGeo, ringMat));
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.13, 24), new THREE.MeshBasicMaterial({ color: '#de7f38', transparent: true, opacity: 0.9 }));
  marker.rotation.x = -Math.PI / 2; marker.position.y = 0.004; marker.visible = false; scene.add(marker);

  function setBackdrop(name) {
    const b = BACKDROPS[name];
    scene.background = new THREE.Color(room ? (name === 'nuit' ? '#1e2b4a' : '#e9e4da') : b.bg);
    if (room) { room.setNight?.(name === 'nuit'); key.intensity = name === 'nuit' ? 0 : 1.9; hemi.intensity = name === 'nuit' ? 0.5 : 1.15; scene.environmentIntensity = 0.42; fillLight.intensity = name === 'nuit' ? 0 : 2.4; return; }
    if (!room) scene.fog = new THREE.Fog(b.bg, 9, 26);
    floorMat.color.set(b.floor); ringMat.color.set(b.ring);
    key.intensity = b.key; hemi.intensity = b.hemi; scene.environmentIntensity = b.env;
  }
  const room = cfg.room ? cfg.room() : null;
  const fillLight = new THREE.PointLight('#ffefd9', 5, 6, 1.5); fillLight.position.set(0, 2.3, -0.3); // au plafond : à hauteur de tête, elle brûlait le visage
  setBackdrop(cfg.backdrop || 'studio');
  if (room) {
    scene.add(room.group); floor.visible = false; scene.fog = null;
    key.shadow.camera.left = -3.6; key.shadow.camera.right = 3.6; key.shadow.camera.top = 3.6; key.shadow.camera.bottom = -3.6; key.shadow.camera.far = 16;
    key.shadow.normalBias = 0.02; key.shadow.camera.updateProjectionMatrix();
    ringsGeo.setDrawRange(0, 0);
    key.color.set('#ffdfb4');
  }
  const clampP = (p) => (room ? room.clamp(p) : p);
  if (room) { hemi.color.set('#fff4e4'); hemi.groundColor.set('#b9a58f'); rim.intensity = 0; renderer.toneMappingExposure = 1.0; scene.add(fillLight); }

  // ---- Distribution ---------------------------------------------------------
  const actors = cfg.cast.map((c) => ({ ...c, goal: null, run: false, arrive: null, held: null, bag: null, faceYaw: null, follow: null, carried: false, seatObj: null, carrying: null }));
  let A = actors[0];
  actors.forEach((a) => { scene.add(a.hero.root); if (a.extra) a.hero.root.visible = false; });
  if (actors.length > 1) { actors[0].hero.root.position.set(-0.2, 0, 0.1); actors[1].hero.root.position.set(0.32, 0, 0.3); actors[0].hero.root.rotation.y = 0.35; actors[1].hero.root.rotation.y = -0.35; }
  const pos = (a) => a.hero.root.position;
  const other = (a) => actors.find((b) => b !== a);

  // ---- Caméra ---------------------------------------------------------------
  let camTween = null;
  const fitScale = () => (camera.aspect < 0.62 ? 0.62 / camera.aspect : 1);
  function setView(name, instant) {
    let v, tgt;
    if (name === 'chambre') {
      v = { az: -0.5, el: 0.62, dist: 8.2, y: 0.7 };
      tgt = room.center.clone();
    } else if (name === 'duo') {
      v = { az: 0.12, el: 0.06, dist: 5.2, y: 0.9 };
      tgt = actors.reduce((s, a) => s.add(pos(a)), new THREE.Vector3()).multiplyScalar(1 / actors.length).setY(v.y);
    } else {
      v = A.views[name];
      tgt = pos(A).clone().setY(v.y);
    }
    const az = v.az + (name === 'duo' || name === 'chambre' ? 0 : A.hero.root.rotation.y);
    const p = new THREE.Vector3(Math.sin(az) * Math.cos(v.el), Math.sin(v.el), Math.cos(az) * Math.cos(v.el)).multiplyScalar(v.dist * fitScale()).add(tgt);
    if (instant) { camera.position.copy(p); controls.target.copy(tgt); controls.update(); camTween = null; return; }
    camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: p, t1: tgt, t: 0 };
  }
  let paused = false;
  function resize() {
    if (paused) return; // pendant l'export, la taille de la vidéo ne bouge pas
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---- Déplacement ----------------------------------------------------------
  const keys = new Set();
  const typing = () => document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'text';
  addEventListener('keydown', (e) => {
    if (typing()) return;
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'z', 'q', 's', 'd', 'w', 'a', 'shift'].includes(k)) {
      keys.add(k); A.goal = null; marker.visible = false;
      if (k.startsWith('arrow')) e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY, performance.now()]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]), quick = performance.now() - down[2] < 350;
    down = null;
    if (moved > 6 || !quick) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(floor)[0];
    if (hit && hit.point.length() < 12) {
      const p = clampP(hit.point.clone().setY(0));
      walkTo(A, p, p.distanceTo(pos(A)) > A.speed[0] * 3);
      marker.scale.setScalar(A.markerScale); marker.position.set(p.x, 0.004, p.z); marker.visible = true;
    }
  });
  function walkStraight(a, p, run) {
    return new Promise((res) => {
      a.arrive?.();
      a.goal = clampP(p.clone().setY(0)); a.run = run; a.arrive = res; a.faceYaw = null;
    });
  }
  // La chaise est le seul meuble au milieu du passage : on la contourne du côté de la pièce.
  function aroundChair(a, p) {
    const C = room?.chair.position, from = pos(a);
    if (!C) return null;
    const d = p.clone().sub(from).setY(0), L = d.length(), r = a.id === 'tobi' ? 0.46 : 0.34;
    if (L < 0.05 || Math.hypot(p.x - C.x, p.z - C.z) < r) return null;
    const t = Math.max(0, Math.min(1, C.clone().sub(from).setY(0).dot(d) / (L * L))), near = from.clone().addScaledVector(d, t).setY(0);
    if (t <= 0 || t >= 1 || Math.hypot(near.x - C.x, near.z - C.z) >= r) return null;
    const n = new THREE.Vector3(-d.z, 0, d.x).normalize();
    if (n.x * -C.x + n.z * -C.z < 0) n.negate();
    return clampP(new THREE.Vector3(C.x, 0, C.z).addScaledVector(n, r + 0.04));
  }
  function walkTo(a, p, run = false) {
    const via = aroundChair(a, p);
    if (!via) return walkStraight(a, p, run);
    const trip = (a.trip = (a.trip || 0) + 1);
    return walkStraight(a, via, run).then(() => (a.trip === trip ? walkStraight(a, p, run) : undefined));
  }
  const turn = (cur, want, k) => {
    let d = (want - cur + Math.PI) % (Math.PI * 2);
    if (d < 0) d += Math.PI * 2;
    return cur + (d - Math.PI) * k;
  };
  const moveDir = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function moveActor(a, dt) {
    if (a.carried) return;
    if (a.tween) {
      const w = a.tween; w.t = Math.min(1, w.t + dt / w.dur);
      const e = w.t * w.t * (3 - 2 * w.t), r = a.hero.root;
      r.position.lerpVectors(w.from, w.to, e); r.position.y += w.arc * Math.sin(Math.PI * w.t);
      r.rotation.y = turn(w.yaw0, w.yaw1, e);
      if (w.t >= 1) { a.tween = null; w.res(); }
      return;
    }
    moveDir.set(0, 0, 0);
    let run = false, manual = false;
    if (a === A) {
      const has = (...l) => l.some((k) => keys.has(k));
      const ix = (has('arrowright', 'd') ? 1 : 0) - (has('arrowleft', 'q', 'a') ? 1 : 0);
      const iz = (has('arrowup', 'z', 'w') ? 1 : 0) - (has('arrowdown', 's') ? 1 : 0);
      if (ix || iz) {
        camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        right.crossVectors(fwd, THREE.Object3D.DEFAULT_UP);
        moveDir.addScaledVector(fwd, iz).addScaledVector(right, ix).normalize();
        run = keys.has('shift'); manual = true;
      }
    }
    if (a.follow && !manual) {
      const L = pos(a.follow), d = L.distanceTo(pos(a));
      if (d > 0.85) { const back = new THREE.Vector3().subVectors(pos(a), L).normalize().multiplyScalar(0.62); a.goal = L.clone().add(back); a.run = d > 1.6; } else if (d < 0.68) a.goal = null;
    }
    if (!manual && a.goal) {
      moveDir.subVectors(a.goal, pos(a)); moveDir.y = 0;
      const d = moveDir.length();
      run = a.run && d > a.speed[1] * 0.3;
      if (d < 0.05) {
        a.goal = null; moveDir.set(0, 0, 0);
        if (a === A) marker.visible = false;
        const f = a.arrive; a.arrive = null; f?.();
      } else moveDir.normalize();
    }
    const moving = moveDir.lengthSq() > 0;
    const hero = a.hero;
    if (moving) {
      if (a.spot) { leave(a); return; }
      if (a.leaving) return;
      if (hero.seat) { if (!hero.gesture) stand(a); return; }
      const speed0 = run ? a.speed[1] : a.speed[0];
      a.spd = (a.spd || 0) + (speed0 - (a.spd || 0)) * (1 - Math.exp(-dt * 6)); // démarrage progressif
      const speed = a.spd;
      hero.setLocomotion(run ? 'run' : 'walk');
      a.walking = true;
      const step = moveDir.clone().multiplyScalar(speed * dt);
      hero.root.position.add(step); clampP(hero.root.position);
      if (a === A && !api.locked) { camera.position.add(step); controls.target.add(step); camTween = null; }
      hero.root.rotation.y = turn(hero.root.rotation.y, Math.atan2(moveDir.x, moveDir.z), 1 - Math.exp(-dt * 7));
    } else {
      a.spd = 0;
      if (a.walking) { a.walking = false; hero.setLocomotion(a.baseLoco || 'idle'); }
      if (a.faceYaw !== null && !hero.seat) hero.root.rotation.y = turn(hero.root.rotation.y, a.faceYaw, 1 - Math.exp(-dt * 5));
    }
  }
  const yawTo = (a, b) => Math.atan2(pos(b).x - pos(a).x, pos(b).z - pos(a).z);
  function face(a, b, exact) { a.faceYaw = yawTo(a, b) * (exact ? 1 : 0.68); } // légèrement ouverts vers la caméra, comme au théâtre

  // Un logo est plat : vu de profil, on ne le reconnaît plus. Il se tourne vers celui qui parle, sans jamais montrer sa tranche.
  function showLogo(a) {
    if (a.goal) return;
    const to = Math.atan2(camera.position.x - pos(a).x, camera.position.z - pos(a).z);
    const off = Math.atan2(Math.sin(a.hero.root.rotation.y - to), Math.cos(a.hero.root.rotation.y - to));
    a.hero.root.rotation.y = to + Math.max(-0.65, Math.min(0.65, off));
  }

  // ---- Regards : la tête vise les yeux de l'autre ---------------------------
  const lq = { f: new THREE.Vector3(), h: new THREE.Vector3(), t: new THREE.Vector3(), w: new THREE.Quaternion(), d: new THREE.Quaternion(), p: new THREE.Quaternion(), id: new THREE.Quaternion() };
  function applyLook(a, dt) {
    a.lookW = (a.lookW || 0) + ((a.look ? 1 : 0) - (a.lookW || 0)) * (1 - Math.exp(-dt * 7));
    if (a.look) a.lastLook = a.look;
    a.hero.gaze = null;
    if (a.lookW < 0.01 || !a.lastLook) return;
    const b = a.lastLook, head = a.hero.bones.head;
    a.hero.root.updateMatrixWorld(true); b.hero.root.updateMatrixWorld(true);
    head.getWorldPosition(lq.h); lq.h.y += a.eyeUp;
    b.hero.bones.head.getWorldPosition(lq.t); lq.t.y += b.eyeUp;
    lq.t.sub(lq.h);
    { const flat = Math.hypot(lq.t.x, lq.t.z), lim = Math.max(flat, 0.3) * 0.7; lq.t.y = Math.max(-lim * 0.4, Math.min(lim, lq.t.y)); } // ne casse pas la nuque, et le visage reste visible quand il parle à quelqu'un de plus bas
    lq.t.normalize();
    // Un vrai regard ne saute pas d'une personne à l'autre : on cligne, les yeux partent, puis la tête suit et se pose.
    if (a.lookAt !== b) {
      a.lookAt = b; a.hero.blink?.();
      if (a.aim && !a.extra) { head.getWorldQuaternion(lq.w); lq.f.copy(lq.t).applyQuaternion(lq.w.invert()); a.hero.eyes?.(Math.max(-0.8, Math.min(0.8, lq.f.x * 1.4)), Math.max(-0.5, Math.min(0.5, lq.f.y * 1.4))); }
    }
    if (!a.aim) a.aim = lq.t.clone();
    a.aim.lerp(lq.t, 1 - Math.exp(-dt * (a.extra ? 9 : 5.5))).normalize();
    lq.t.copy(a.aim);
    if (a.cheat) { head.getWorldPosition(lq.f); lq.f.subVectors(camera.position, lq.f).normalize(); lq.t.lerp(lq.f, a.cheat).normalize(); } // il parle à l'autre, mais son visage reste ouvert vers nous
    head.getWorldQuaternion(lq.w);
    lq.f.set(0, 0, 1).applyQuaternion(lq.w);
    lq.d.setFromUnitVectors(lq.f, lq.t);
    const ang = 2 * Math.acos(Math.min(1, Math.abs(lq.d.w)));
    const most = a.extra ? 0.2 : a.id === 'tobi' && a.hero.seat ? 1.5 : 1.05; // assis côte à côte, il tourne franchement la tête
    if (ang > most) lq.d.slerp(lq.id, 1 - most / ang);
    lq.d.multiply(lq.w);
    head.parent.getWorldQuaternion(lq.p);
    lq.p.invert().multiply(lq.d);
    head.quaternion.slerp(lq.p, a.lookW * 0.92);
    listen(a, b, head, dt);
    if (a.extra) {
      head.updateWorldMatrix(true, false); head.getWorldQuaternion(lq.w);
      lq.f.copy(lq.t).applyQuaternion(lq.w.invert()); // la cible, vue depuis le logo
      a.hero.gaze = [Math.max(-1, Math.min(1, lq.f.x * 1.6)) * a.lookW, Math.max(-1, Math.min(1, lq.f.y * 1.6)) * a.lookW];
    }
  }

  // Celui qui écoute n'est pas une statue : il hoche la tête de temps en temps et la penche un peu, sans rythme régulier.
  function listen(a, b, head, dt) {
    const L = a.listen || (a.listen = { wait: 1.5 + Math.random() * 2, nod: 1, tilt: 0, want: 0, hold: 0 });
    const on = !a.extra && b.hero.talking && !a.hero.talking && a.hero.seat !== 'lie';
    if (on) {
      L.wait -= dt; L.hold -= dt;
      if (L.wait <= 0) { L.wait = 2.6 + Math.random() * 3.4; L.nod = 0; L.size = 0.05 + Math.random() * 0.05; L.twice = Math.random() < 0.35; }
      if (L.hold <= 0) { L.hold = 3 + Math.random() * 4; L.want = (Math.random() - 0.5) * 0.14; }
    } else L.want = 0;
    L.tilt += (L.want - L.tilt) * (1 - Math.exp(-dt * 2.2));
    if (L.nod < 1) L.nod = Math.min(1, L.nod + dt / (L.twice ? 0.85 : 0.55));
    const p = L.nod, dip = p < 1 ? Math.sin(p * Math.PI * (L.twice ? 2 : 1)) ** 2 * (1 - 0.35 * p) * (L.size || 0) : 0; // descend vite, remonte doucement
    if (dip > 0.0005 || Math.abs(L.tilt) > 0.0005) { head.rotateX(dip); head.rotateZ(L.tilt * a.lookW); }
  }

  // ---- Sièges ---------------------------------------------------------------
  function sit(a, kind, noProp) {
    if (a.hero.seat) return stand(a);
    return new Promise((res) => {
      a.goal = null;
      if (kind === 'chair' && !noProp) {
        const s = createProp(a.hero.seatProp.name);
        const p = new THREE.Vector3(0, 0, a.hero.seatProp.z).applyQuaternion(a.hero.root.quaternion).add(pos(a));
        s.position.copy(p); s.rotation.y = a.hero.root.rotation.y;
        scene.add(s); a.seatObj = s;
      }
      a.hero.motion.sit(kind, res);
      syncChips();
    });
  }
  function stand(a) {
    return new Promise((res) => {
      a.hero.motion.stand(() => {
        if (a.seatObj) { scene.remove(a.seatObj); a.seatObj = null; }
        syncChips(); res();
      });
    });
  }

  // ---- Temps de simulation : tout l'enchaînement dépend de lui, pas de l'horloge réelle
  let simT = 0;
  const timers = [], tweens = [];
  const wait = (s) => new Promise((res) => timers.push({ t: simT + s, res }));
  function tickTime(dt) {
    simT += dt;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= simT) timers.splice(i, 1)[0].res();
    for (let i = tweens.length - 1; i >= 0; i--) {
      const w = tweens[i]; w.t = Math.min(1, w.t + dt / w.dur);
      const e = w.t * w.t * (3 - 2 * w.t);
      w.obj.rotation.y = w.a0 + (w.a1 - w.a0) * e;
      if (w.t >= 1) { tweens.splice(i, 1); w.res(); }
    }
  }

  // ---- Déplacements scriptés dans le décor ---------------------------------
  const glide = (a, to, yaw, dur = 1, arc = 0) => new Promise((res) => {
    a.goal = null; a.faceYaw = null;
    a.tween = { from: pos(a).clone(), to: to.clone(), yaw0: a.hero.root.rotation.y, yaw1: yaw, t: 0, dur, arc, res };
  });
  const sink = (obj, y, dur) => new Promise((res) => { const y0 = obj.position.y; tweens.push({ obj: { rotation: { set y(v) { obj.position.y = v; }, get y() { return y0; } } }, a0: y0, a1: y, t: 0, dur, res }); });
  const hop = (a, to, yaw) => { a.hero.play('jump'); return wait(0.35).then(() => glide(a, to, yaw, 0.55, 0.14)); };
  async function leave(a) { // quitte le meuble où il se trouve
    const s = a.spot;
    if (!s || a.leaving) return;
    a.leaving = true; a.spot = null;
    await s.exit();
    a.leaving = false; a.faceYaw = null;
  }
  const swing = (obj, angle, dur) => new Promise((res) => {
    tweens.push({ obj, a0: obj.rotation.y, a1: angle, t: 0, dur, res });
  });

  // ---- Objets ---------------------------------------------------------------
  const items = {};
  function item(name) {
    if (!items[name]) items[name] = { name, def: PROPS[name], obj: null, owner: null, onFloor: false, variant: null };
    return items[name];
  }
  function ensureObj(it, a) {
    const v = it.name === 'bag' ? JSON.stringify(a.hero.bagOptions) : '';
    if (!it.obj || it.variant !== v) {
      it.obj?.parent?.remove(it.obj);
      it.obj = createProp(it.name, it.name === 'bag' ? a.hero.bagOptions : {});
      it.variant = v;
    }
  }
  function attach(a, it) {
    ensureObj(it, a);
    release(it);
    if (it.name !== 'bag' && a.held) placeOnFloor(a.held, ahead(a, a.reach * 1.5));
    const socket = it.name === 'bag' ? a.hero.sockets.back : a.hero.sockets.R;
    socket.add(it.obj);
    it.obj.position.set(0, it.def.grip?.y ?? 0, 0); it.obj.rotation.set(...(it.def.grip?.rot ?? [0, 0, 0])); it.obj.scale.setScalar(1);
    it.owner = a; it.onFloor = false;
    if (it.name === 'bag') a.bag = it;
    else { a.held = it; a.hero.motion.setHold(true); }
    syncChips();
  }
  function release(it) { // retire l'objet de son porteur actuel
    const o = it.owner;
    if (!o) return;
    if (o.bag === it) o.bag = null;
    if (o.held === it) {
      o.held = null; o.hero.motion.setHold(false);
      if (['read', 'phone', 'call'].includes(o.hero.motion.pose)) o.hero.motion.clearPose();
    }
    it.owner = null;
  }
  function placeOnFloor(it, p, owner = it.owner) {
    release(it);
    if (it.name === 'bag') { it.obj?.parent?.remove(it.obj); it.onFloor = false; if (room) room.sillBag.visible = true; syncChips(); return; }
    scene.add(it.obj);
    const k = owner?.propScale ?? 1; // taille cohérente avec celui qui l'utilise
    it.obj.scale.setScalar(k);
    const on = room?.surfaceNear(p, pos(owner || A));
    if (on) { it.obj.position.set(on.x, on.y + it.def.floor.y * k, on.z); } else { clampP(p); it.obj.position.set(p.x, it.def.floor.y * k, p.z); }
    it.obj.rotation.set(it.def.floor.rx, 0, 0);
    it.onFloor = true;
    syncChips();
  }
  const ahead = (a, d) => new THREE.Vector3(0, 0, d).applyQuaternion(a.hero.root.quaternion).add(pos(a));

  function putAt(it, p, a) { // pose un objet à un endroit précis (dans le frigo…)
    ensureObj(it, a); release(it); scene.add(it.obj);
    it.obj.position.copy(p); it.obj.rotation.set(0, 0, 0); it.obj.scale.setScalar(a.propScale ?? 1);
    it.onFloor = true;
  }
  function stash(a) { // range l'objet tenu hors de la scène
    const it = a.held;
    if (!it) return;
    release(it); it.obj?.parent?.remove(it.obj); it.onFloor = false; syncChips();
  }
  async function take(a, name) {
    const it = item(name);
    if (it.owner === a) { if (name === 'bag') { await drop(a, it); } return; }
    if (name === 'bag') {
      if (room && a.id === 'tobi') { // il va chercher le sac noir posé sur le rebord
        await leave(a);
        await walkTo(a, new THREE.Vector3(-0.32, 0, -1.55));
        a.faceYaw = Math.PI; await wait(0.45);
        const d = a.hero.play('sill_take');
        await wait(d * 0.45);
        room.sillBag.visible = false;
        await wait(d * 0.35);
        attach(a, it);
        return;
      }
      if (room) room.sillBag.visible = false;
      a.hero.play('shrug'); await wait(0.5); attach(a, it); return;
    }
    if (a.held) placeOnFloor(a.held, ahead(a, a.reach * 1.5));
    if (a.hero.seat || a.spot) { attach(a, it); return; } // assis : l'objet est à portée de main
    ensureObj(it, a);
    if (it.owner) release(it);
    if (!it.onFloor) placeOnFloor(it, ahead(a, a.reach), a);
    const p = it.obj.position.clone().setY(0);
    const dir = new THREE.Vector3().subVectors(pos(a), p).setY(0);
    if (dir.length() > a.reach * 1.25) { await walkTo(a, p.clone().add(dir.normalize().multiplyScalar(a.reach))); }
    a.faceYaw = Math.atan2(p.x - pos(a).x, p.z - pos(a).z);
    await wait(0.12);
    const d = a.hero.play('pickup');
    await wait(d * 0.5);
    attach(a, it);
  }
  async function drop(a, it = a.held) {
    if (!it) return;
    if (it.name === 'bag') { placeOnFloor(it); return; }
    if (a.hero.seat) { placeOnFloor(it, ahead(a, a.reach)); return; }
    const d = a.hero.play('pickup');
    await wait(d * 0.5);
    placeOnFloor(it, ahead(a, a.reach));
  }
  function useHeld(a) {
    const it = a.held;
    if (!it) return;
    a.hero.play(it.def.use);
    syncChips();
  }
  async function give(a, b) { // a tend l'objet tenu à b
    const it = a.held;
    if (!it) return;
    if (a.hero.seat) await stand(a);
    if (b.hero.seat) await stand(b);
    if (pos(a).distanceTo(pos(b)) > 0.75) await walkTo(b, ahead(a, 0.55));
    face(a, b); face(b, a);
    await wait(0.45);
    const big = a.id === 'tobi' ? a : b, small = a.id === 'tobi' ? b : a;
    a.hero.motion.setHold(false);
    big.hero.play('low_reach');
    small.hero.play('reach_up');
    await wait(1.0);
    attach(b, it);
  }

  // ---- Interface ------------------------------------------------------------
  const el = (id) => document.getElementById(id);
  const fill = (id, list, fn) => {
    const box = el(id); box.textContent = '';
    for (const [k, label] of list) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.k = k;
      b.addEventListener('click', () => fn(k, b));
      box.appendChild(b);
    }
    return box;
  };
  const mark = (box, ks) => box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', [].concat(ks).includes(b.dataset.k) ? 'true' : 'false'));

  let gEl, fEl, pEl, oEl;
  function buildPanel() {
    gEl = fill('gestures', A.gestures, (k) => {
      if (k === 'dance' || k === 'sad') {
        const stop = A.baseLoco === k;
        A.baseLoco = stop ? 'idle' : k;
        if (A.hero.seat) return;
        A.hero.motion.setLocomotion(A.baseLoco);
        mark(gEl, stop ? [] : k);
        return;
      }
      if (A.baseLoco && A.baseLoco !== 'idle') { A.baseLoco = 'idle'; A.hero.motion.setLocomotion('idle'); }
      A.hero.play(k); mark(gEl, k);
      setTimeout(() => mark(gEl, A.baseLoco && A.baseLoco !== 'idle' ? A.baseLoco : []), 1800);
    });
    pEl = fill('postures', A.postures, (k) => {
      if (k === 'chair' || k === 'floor') sit(A, k);
      else { A.hero.motion.togglePose(k); syncChips(); }
    });
    oEl = fill('props', Object.entries(PROPS).map(([k, v]) => [k, v.label]), (k) => take(A, k));
    fEl = fill('faces', A.faces, (k) => { A.hero.setExpression(k); mark(fEl, k); });
    mark(fEl, A.hero.expression);
    fill('views', [['face', 'Face'], ['trois', '3/4'], ['profil', 'Profil'], ['dos', 'Dos'], ['visage', 'Visage'], ...(cfg.duo ? [['duo', 'Duo']] : []), ...(room ? [['chambre', 'Chambre']] : [])], (k) => { setView(k); mark(el('views'), k); });
    mark(el('views'), cfg.startView);
    syncChips();
  }
  function syncChips() {
    if (!pEl) return;
    mark(pEl, [A.hero.seat, A.hero.motion.pose].filter(Boolean));
    mark(oEl, [A.held?.name, A.bag?.name].filter(Boolean));
    const box = el('held');
    box.hidden = !A.held;
    if (A.held) {
      const useLabel = { drink: 'Boire', read: 'Lire', phone: 'Regarder' }[A.held.def.use];
      const list = [['use', useLabel], ['drop', 'Poser']];
      if (actors.length > 1) list.push(['give', `Donner à ${other(A).name}`]);
      fill('held', list, (k) => {
        if (k === 'use') useHeld(A);
        if (k === 'drop') drop(A);
        if (k === 'give') give(A, other(A));
      });
    }
    el('spec').textContent = `${A.name} · ${A.height} · ${A.hero.skeleton.bones.length} os · ${A.hero.morphCount} formes de visage · ${A.hero.clips.length} animations`;
  }
  function setActive(a) {
    A = a; keys.clear(); marker.visible = false;
    if (el('cast').children.length) mark(el('cast'), a.id);
    buildPanel();
  }

  const bubble = el('bubble');
  let speaker = null;
  el('say').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = el('sayText').value.trim();
    if (text) say(A, text);
    el('sayText').blur();
  });
  function say(a, text, duration, env) {
    return new Promise((res) => {
      bubble.textContent = text; bubble.hidden = !!api.quiet; speaker = a;
      a.hero.say(text, () => { bubble.hidden = true; speaker = null; res(); }, duration, env);
    });
  }

  el('glasses')?.addEventListener('change', (e) => actors[0].hero.setGlasses?.(e.target.checked));
  el('night')?.addEventListener('change', (e) => setBackdrop(e.target.checked ? 'nuit' : 'studio'));
  const spin = el('spin');
  spin.addEventListener('change', () => { controls.autoRotate = spin.checked; });
  controls.autoRotateSpeed = 2.2;

  const api = { lights: { key, hemi, fill: fillLight }, actors, scene, room, camera, controls, renderer, putAt, sink, leave, hop, glide, swing, stash, wait, walkTo, face, sit, stand, take, drop, give, attach, item, useHeld, say, setView, ahead, pos, get active() { return A; }, sync: () => syncChips() };

  if (actors.length > 1) {
    el('castBox').hidden = false;
    fill('cast', actors.filter((a) => !a.extra).map((a) => [a.id, a.name]), (k) => setActive(actors.find((a) => a.id === k)));
    mark(el('cast'), A.id);
  }
  if (room) {
    el('roomBox').hidden = false;
    const acts = cfg.roomActions(api, room);
    api.acts = Object.fromEntries(acts.map(([k, , f]) => [k, f]));
    fill('roomActs', acts.map(([k, l]) => [k, l]), (k) => acts.find((x) => x[0] === k)[2](A));
    let lampOn = false, open = false;
    fill('roomSwitch', [['volet', 'Volet'], ['lampe', 'Applique']], (k, b) => {
      if (k === 'volet') { open = !open; room.setShutter(open); b.setAttribute('aria-pressed', String(open)); }
      else { lampOn = !lampOn; room.lamp.intensity = lampOn ? 2.2 : 0; b.setAttribute('aria-pressed', String(lampOn)); }
    });
  }
  if (cfg.scenes) {
    el('scenesBox').hidden = false;
    let running = false;
    fill('scenes', cfg.scenes.map((s, i) => [String(i), s.label]), async (k, b) => {
      if (running) return;
      running = true; b.setAttribute('aria-pressed', 'true');
      try { await cfg.scenes[Number(k)].run(api); } finally { running = false; b.setAttribute('aria-pressed', 'false'); syncChips(); }
    });
  }
  buildPanel();
  cfg.onReady?.(api);
  controls.minDistance = Math.min(...actors.map((a) => a.minDistance));
  setView(cfg.startView || 'trois', true);

  // ---- Boucle ---------------------------------------------------------------
  const clock = new THREE.Clock();
  const MIRROR = new THREE.Vector3(-0.8, 0, -1.5);
  const headWorld = new THREE.Vector3();
  function placeLights() {
    const p = pos(A);
    if (room) { key.position.set(0.9, 4.3, -7.4); key.target.position.set(-0.15, 0, -0.35); return; }
    key.position.set(p.x + 3.2, 3.4, p.z + 4.2); key.target.position.copy(p).setY(0.9);
    rim.position.set(p.x - 3, 3, p.z - 4); rim.target.position.copy(p).setY(1.1);
  }
  function frame(dt, skipRender) {
    tickTime(dt);
    room?.update(dt);
    api.onFrame?.(dt);
    for (const a of actors) { moveActor(a, dt); if (a.extra) showLogo(a); a.hero.update(dt); applyLook(a, dt); }
    if (camTween) {
      camTween.t = Math.min(1, camTween.t + dt / 0.7);
      const e = 1 - (1 - camTween.t) ** 3;
      camera.position.lerpVectors(camTween.p0, camTween.p1, e);
      controls.target.lerpVectors(camTween.t0, camTween.t1, e);
      if (camTween.t >= 1) camTween = null;
    }
    controls.update();
    placeLights();
    room?.mirrorLive(actors.some((a) => pos(a).distanceTo(MIRROR) < 0.8)); // reflet réel seulement devant le miroir : il coûte cher
    if (skipRender) return;
    if (api.render) api.render(); else renderer.render(scene, camera);
    if (!bubble.hidden && speaker) {
      speaker.hero.bones.head.getWorldPosition(headWorld); headWorld.y += speaker.bubbleY;
      headWorld.project(camera);
      bubble.style.left = `${(headWorld.x * 0.5 + 0.5) * stage.clientWidth}px`;
      bubble.style.top = `${(-headWorld.y * 0.5 + 0.5) * stage.clientHeight}px`;
    }
  }
  let qFrames = 0, qTime = 0, qLevel = 0;
  function adapt(dt) { // sur une machine sans carte graphique, on allège le rendu
    qFrames++; qTime += dt;
    if (qTime < 2 || qLevel > 1) return;
    const fps = qFrames / qTime; qFrames = 0; qTime = 0;
    if (fps >= 26) return;
    qLevel++;
    if (qLevel === 1) { renderer.setPixelRatio(1); resize(); }
    if (qLevel === 2) { key.shadow.mapSize.set(1024, 1024); key.shadow.map?.dispose(); key.shadow.map = null; renderer.shadowMap.type = THREE.PCFShadowMap; }
  }
  api.step = (dt, skip) => frame(dt, skip);
  Object.defineProperty(api, 'simTime', { get: () => simT });
  api.beginOffline = (w, h) => { // rendu image par image à la taille de la vidéo
    paused = true; api.offline = true;
    const ratio = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    return { end() { paused = false; api.offline = false; renderer.setPixelRatio(ratio); resize(); } };
  };
  renderer.setAnimationLoop(() => {
    if (paused || api.hold) return;
    const raw = clock.getDelta();
    adapt(raw);
    frame(Math.min(raw, 0.25));
  });

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => { for (const a of actors) { a.hero.setExpression('sourire'); a.hero.play('wave'); } mark(fEl, 'sourire'); }, 700);
  }

  // Accès de test et de capture
  window.__perso = {
    ...api, THREE, renderer, camera, controls, frame, hero: A.hero,
    freeze(hero, clip, t, morphs = {}, layered) { // pose figée : contrôle d'un instant précis
      paused = true;
      hero.mixer.stopAllAction();
      const c = hero.clips.find((x) => x.name === clip);
      if (c && !c.userData.layer) { const a = hero.mixer.clipAction(c); a.reset().play(); a.paused = true; a.time = t * c.duration; hero.mixer.update(0); } else {
        const idle = hero.mixer.clipAction(hero.clips.find((x) => x.name === (layered || 'idle'))); idle.reset().play(); idle.paused = true; idle.time = 0; hero.mixer.update(0);
        if (c) for (const { bone, it } of c.userData.moved) bone.quaternion.fromArray(it.evaluate(t * c.duration));
      }
      hero.setMorphs(morphs);
      placeLights(); controls.update(); renderer.render(scene, camera);
    },
    resume() { paused = false; },
  };
  return api;
}
