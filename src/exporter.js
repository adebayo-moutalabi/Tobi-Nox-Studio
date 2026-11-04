// Export vidéo image par image : le temps de l'histoire avance d'exactement 1/fps par image,
// donc la vidéo est parfaitement fluide, même sur un ordinateur lent.
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { playSfx, addMusic } from './sound.js';

const RATE = 48000;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const srtTime = (t) => `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)},${pad(Math.floor((t % 1) * 1000), 3)}`;
export const toSrt = (lines) => lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.who} : ${l.text}\n`).join('\n');

export const tick = (() => { // laisse les promesses de l'histoire avancer, sans le délai de setTimeout
  const ch = new MessageChannel(), q = [];
  ch.port1.onmessage = () => q.shift()?.();
  return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); });
})();

// Sous-titre discret : une ligne, le mot prononcé surligné.
function drawCaption(ctx, c, w, h) {
  const s = Math.round(h * (h > w ? 0.029 : 0.05)), y = h * (h > w ? 0.755 : 0.86), padX = s * 0.2, padY = s * 0.13;
  ctx.font = `800 ${s}px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const gap = ctx.measureText(' ').width * 1.15, ws = c.words.map((x) => ctx.measureText(x).width);
  let x = (w - ws.reduce((n, a) => n + a, 0) - gap * (ws.length - 1)) / 2;
  c.words.forEach((word, i) => {
    if (i === c.active) {
      ctx.fillStyle = c.color; ctx.beginPath(); ctx.roundRect(x - padX, y - s / 2 - padY, ws[i] + padX * 2, s + padY * 2, s * 0.2); ctx.fill();
      ctx.fillStyle = '#17132c'; ctx.fillText(word, x, y);
    } else {
      ctx.lineWidth = s * 0.2; ctx.strokeStyle = 'rgba(8,7,20,.9)'; ctx.strokeText(word, x, y);
      ctx.fillStyle = '#fff'; ctx.fillText(word, x, y);
    }
    x += ws[i] + gap;
  });
}

export async function exportVideo(v, player, text, { width = 1080, height = 1920, fps = 30, captions = true, music = null, onProgress, maxSeconds = 600 } = {}) {
  if (typeof VideoEncoder === 'undefined') throw new Error("Ce navigateur ne sait pas encoder la vidéo : utilise Chrome ou Edge.");
  const config = { codec: 'avc1.640028', width, height, bitrate: width * height > 1e6 ? 14_000_000 : 8_000_000, framerate: fps, hardwareAcceleration: 'prefer-software' };
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('Encodage H.264 indisponible sur cet ordinateur.');
  const target = new ArrayBufferTarget();
  const withAudio = typeof AudioEncoder !== 'undefined';
  const muxer = new Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, ...(withAudio ? { audio: { codec: 'aac', numberOfChannels: 2, sampleRate: RATE } } : {}), fastStart: 'in-memory' });
  let fail = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { fail = e; } });
  enc.configure(config);

  const comp = document.createElement('canvas'); comp.width = width; comp.height = height;
  const ctx = comp.getContext('2d', { alpha: false, desynchronized: true });
  const stage = v.beginOffline(width, height);
  const done = player.play(text, { silent: true });
  await tick();
  const dt = 1 / fps;
  let i = 0;
  try {
    while (player.running && i < maxSeconds * fps && !fail) {
      if (player.ffing) { await tick(); continue; } // action hors champ : aucune image
      v.step(dt);
      await tick(); await tick();
      ctx.drawImage(v.renderer.domElement, 0, 0, width, height);
      const o = player.overlay;
      if (o.alpha > 0) { ctx.fillStyle = `rgba(14,15,18,${o.alpha})`; ctx.fillRect(0, 0, width, height); }
      if (o.card) {
        ctx.fillStyle = '#f6f1e6'; ctx.font = `700 ${Math.round(height * 0.06)}px "Bricolage Grotesque", "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.card, width / 2, height / 2);
      }
      if (captions && o.caption) drawCaption(ctx, o.caption, width, height);
      const frame = new VideoFrame(comp, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      i++;
      if (i % 15 === 0) onProgress?.(i / fps);
      while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
    }
    if (fail) throw fail;
    if (i === 0) throw new Error('Rien à exporter : attends la fin de la lecture en cours.');
    await enc.flush();
    if (withAudio && i > 0) await encodeAudio(muxer, player, i / fps, music);
    muxer.finalize();
  } finally {
    player.stop();
    await Promise.race([done, tick()]);
    stage.end();
  }
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), srt: toSrt(player.subtitles), seconds: i / fps };
}

async function encodeAudio(muxer, player, seconds, music) {
  const clips = player.clips;
  const off = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  for (const c of clips) { const s = off.createBufferSource(); s.buffer = c.buffer; s.connect(off.destination); s.start(c.start); }
  for (const e of player.sfx) if (e.start < seconds) playSfx(off, off.destination, e.type, e.start);
  if (music) addMusic(off, off.destination, seconds, clips, music.file);
  const mix = await off.startRendering();
  let fail = null;
  const enc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { fail = e; } });
  enc.configure({ codec: 'mp4a.40.2', sampleRate: RATE, numberOfChannels: 2, bitrate: 192000 });
  const L = mix.getChannelData(0), R = mix.getChannelData(1), n = 4800;
  for (let p = 0; p < L.length; p += n) {
    const m = Math.min(n, L.length - p), d = new Float32Array(m * 2);
    d.set(L.subarray(p, p + m), 0); d.set(R.subarray(p, p + m), m);
    const a = new AudioData({ format: 'f32-planar', sampleRate: RATE, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round((p / RATE) * 1e6), data: d });
    enc.encode(a); a.close();
  }
  await enc.flush();
  if (fail) throw fail;
}

export function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
