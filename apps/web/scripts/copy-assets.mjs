// Copies the FFmpeg WASM core and the title font into public/ so the editor can render locally.
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const core = path.resolve(path.dirname(require.resolve("@ffmpeg/core")), "../..");
const fonts = path.dirname(require.resolve("dejavu-fonts-ttf/package.json"));
await mkdir("public/ffmpeg", { recursive: true });
await mkdir("public/fonts", { recursive: true });
for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) await cp(path.join(core, "dist/esm", f), path.join("public/ffmpeg", f));
await cp(path.join(fonts, "ttf/DejaVuSans-Bold.ttf"), "public/fonts/DejaVuSans-Bold.ttf");
// The FFmpeg class spawns its own module worker; load it unbundled from /ffmpeg/lib at runtime.
const lib = path.resolve(path.dirname(require.resolve("@ffmpeg/ffmpeg")), "..", "esm");
await cp(lib, "public/ffmpeg/lib", { recursive: true });
console.log("copied ffmpeg core + font to public/");
