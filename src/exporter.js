// Export vidéo image par image : le temps de l'histoire avance d'exactement 1/fps par image,
// donc la vidéo est parfaitement fluide, même sur un ordinateur lent.
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

const RATE = 48000;
const pad = (n, l = 2) => String(n).padStart(l, '0');
const srtTime = (t) => `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)},${pad(Math.floor((t % 1) * 1000), 3)}`;
export const toSrt = (lines) => lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.who} : ${l.text}\n`).join('\n');

export const tick = (() => { // laisse les promesses de l'histoire avancer, sans le délai de setTimeout
  const ch = new MessageChannel(), q = [];
  ch.port1.onmessage = () => q.shift()?.();
  return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); });
})();

export async function exportVideo(v, player, text, { width = 1080, height = 1920, fps = 30, captions = true, onProgress, maxSeconds = 600 } = {}) {
  if (typeof VideoEncoder === 'undefined') throw new Error("Ce navigateur ne sait pas encoder la vidéo : utilise Chrome ou Edge.");
  const config = { codec: 'avc1.640028', width, height, bitrate: 14_000_000, framerate: fps };
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('Encodage H.264 indisponible sur cet ordinateur.');
  const target = new ArrayBufferTarget();
  const withAudio = player.voices.length > 0 && typeof AudioEncoder !== 'undefined';
  const muxer = new Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, ...(withAudio ? { audio: { codec: 'aac', numberOfChannels: 2, sampleRate: RATE } } : {}), fastStart: 'in-memory' });
  let fail = null;
  const enc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { fail = e; } });
  enc.configure(config);

  const comp = document.createElement('canvas'); comp.width = width; comp.height = height;
  const ctx = comp.getContext('2d');
  const stage = v.beginOffline(width, height);
  const done = player.play(text, { silent: true });
  await tick();
  const dt = 1 / fps;
  let i = 0;
  try {
    while (player.running && i < maxSeconds * fps && !fail) {
      if (player.ffing) { await tick(); continue; } // action hors champ : aucune image
      v.step(dt);
      for (let k = 0; k < 6; k++) await tick();
      ctx.drawImage(v.renderer.domElement, 0, 0, width, height);
      const o = player.overlay;
      if (o.alpha > 0) { ctx.fillStyle = `rgba(14,15,18,${o.alpha})`; ctx.fillRect(0, 0, width, height); }
      if (o.card) {
        ctx.fillStyle = '#f6f1e6'; ctx.font = `700 ${Math.round(height * 0.06)}px "Bricolage Grotesque", "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.card, width / 2, height / 2);
      }
      if (captions && o.caption) {
        const s = Math.round(height * (height > width ? 0.05 : 0.07));
        ctx.font = `800 ${s}px "Bricolage Grotesque", "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = s * 0.22; ctx.strokeStyle = '#111';
        ctx.strokeText(o.caption, width / 2, height * 0.72);
        ctx.fillStyle = o.captionColor || '#fff'; ctx.fillText(o.caption, width / 2, height * 0.72);
      }
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
    if (withAudio && i > 0) await encodeAudio(muxer, player.clips, i / fps);
    muxer.finalize();
  } finally {
    player.stop();
    await Promise.race([done, tick()]);
    stage.end();
  }
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), srt: toSrt(player.subtitles), seconds: i / fps };
}

async function encodeAudio(muxer, clips, seconds) { // mixe les voix à leur place, puis les encode en AAC
  const off = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  for (const c of clips) { const s = off.createBufferSource(); s.buffer = c.buffer; s.connect(off.destination); s.start(c.start); }
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
