import { build } from 'esbuild';
const r = await build({ entryPoints: ['tools/mocap.mjs'], bundle: true, format: 'esm', platform: 'node', write: false, loader: { '.json': 'json' }, external: ['three', 'three/addons/*', 'node:fs'] , banner:{js:''}});
const { writeFileSync } = await import('node:fs'); writeFileSync('tools/.mocap.bundle.mjs', r.outputFiles[0].text);
