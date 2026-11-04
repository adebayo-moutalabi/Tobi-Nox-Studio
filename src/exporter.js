// Export vidéo image par image : le temps de l'histoire avance d'exactement 1/fps par image,
// donc la vidéo est parfaitement fluide, même sur un ordinateur lent.
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

const pad = (n, l = 2) => String(n).padStart(l, '0');
const srtTime = (t) => `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)},${pad(Math.floor((t % 1) * 1000), 3)}`;
export const toSrt = (lines) => lines.map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(l.end)}\n${l.who} : ${l.text}\n`).join('\n');

const tick = (() => { // laisse les promesses de l'histoire avancer, sans le délai de setTimeout
  const ch = new MessageChannel(), q = [];
  ch.port1.onmessage = () => q.shift()?.();
  return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); });
})();

export async function exportVideo(v, player, text, { width = 1920, height = 1080, fps = 30, onProgress, maxSeconds = 600 } = {}) {
  if (typeof VideoEncoder === 'undefined') throw new Error("Ce navigateur ne sait pas encoder la vidéo : utilise Chrome ou Edge.");
  const config = { codec: 'avc1.640028', width, height, bitrate: 14_000_000, framerate: fps };
  if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('Encodage H.264 indisponible sur cet ordinateur.');
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: 'avc', width, height, frameRate: fps }, fastStart: 'in-memory' });
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
      v.step(dt);
      for (let k = 0; k < 6; k++) await tick();
      ctx.drawImage(v.renderer.domElement, 0, 0, width, height);
      const o = player.overlay;
      if (o.alpha > 0) { ctx.fillStyle = `rgba(14,15,18,${o.alpha})`; ctx.fillRect(0, 0, width, height); }
      if (o.card) {
        ctx.fillStyle = '#f6f1e6'; ctx.font = `700 ${Math.round(height * 0.06)}px "Bricolage Grotesque", "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.card, width / 2, height / 2);
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
    muxer.finalize();
  } finally {
    player.stop();
    await Promise.race([done, tick()]);
    stage.end();
  }
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), srt: toSrt(player.subtitles), seconds: i / fps };
}

export function save(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
