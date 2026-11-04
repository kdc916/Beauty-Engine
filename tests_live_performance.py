"""v0.9.0 integration/efficiency static checks; not actual mobile GPU verification."""
from pathlib import Path
import re
from html.parser import HTMLParser
r=Path(__file__).resolve().parent
main=(r/'main.v0.9.0.js').read_text()
perf=(r/'live-performance.v0.9.0.mjs').read_text()
html=(r/'index.html').read_text()
css=(r/'styles.css').read_text()
assert 'main.v0.9.0.js' in html
assert html.count('id="qualitySelect"')==1
assert 'livePerf.recordRendered(' in main
assert 'livePerf.recordDetection(' in main
assert 'livePerf.shouldRender(t)' in main
assert 'livePerf.shouldDetect(t,lastDetect)' in main
assert 'getLiveResolution(w,h,livePerf.profile)' in main
assert 'gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,src)' in main
assert 'textureSource!==src||textureWidth!==sw||textureHeight!==sh' in main
assert 'gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,skinMaskCanvas)' in main
assert 'gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,makeupMaskCanvas)' in main
assert 'generation!==sourceGeneration' in main
assert 'webglcontextrestored' in main and 'webglcontextlost' in main
assert 'lastMaskTime' in main and 'lastMaskNose' in main
assert 'liveQuality:livePerf.mode' in main
assert 'reference-panel.v0.9.0.mjs' in main
assert 'main.v0.2.4.js' not in html
assert 'overflow-y:auto' in css
assert 'case:' not in perf  # Simple lexical guard: no opaque UI browser side effects in controller.
print('PASS v0.9.0 adaptive scheduling, texture reuse, context recovery, and camera race guards')
