"""Static v0.2.4 Reference Match wiring; not a real GPU/MediaPipe test."""
from pathlib import Path
r=Path(__file__).resolve().parent
html=(r/'index.html').read_text()
main=(r/'main.v0.2.4.js').read_text()
panel=(r/'reference-panel.v0.2.4.mjs').read_text()
mesh=(r/'mesh-warp.v0.2.4.mjs').read_text()
match=(r/'reference-match.v0.2.4.mjs').read_text()
assert 'main.v0.2.4.js' in html
assert 'refMatchSliders' in html and 'refMatchTriptych' in html
assert 'referenceMatch:state.enabled&&state.mode' in main
assert 'onSourceSelected:file=>{void loadImage(file,true);}' in main
assert "from './reference-panel.v0.2.4.mjs'" in main
assert "from './reference-metrics.v0.2.1.mjs'" in panel
assert "from './reference-match.v0.2.4.mjs'" in main
assert "import {referenceWarpPoint}" in mesh
assert 'const matched=referenceWarpPoint' in mesh
assert 'URL.revokeObjectURL' in panel
assert 'localStorage' not in panel
assert 'maxDisplacementIPD' in match
assert '실제 수술' in html
print('PASS: reference match, local image lifecycle and inverse mesh pipeline')
