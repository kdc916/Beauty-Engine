from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).parent
s=(root/'main.v0.9.0.js').read_text()
h=(root/'index.html').read_text()
assert 'main.v0.9.0.js' in h
assert "from './ambient-light.v0.9.0.mjs'" in s
assert "from './look-presets.v0.9.0.mjs'" in s
assert "from './live-safety.v0.9.0.mjs'" in s
for k in ('uAmbient','uFaceQuality','lightingAuto','lightingStrength','saveNamedLook','loadNamedLook','shareNamedLook','shareSnapshotBtn','createLookStore'):
    assert k in s,k
for k in ('lookName','savedLookSelect','saveLookBtn','loadLookBtn','shareLookBtn','shareSnapshotBtn','deleteLookBtn','lightingAuto','lightingStrength','lightingStrengthValue'):
    assert h.count('id="'+k+'"')==1,k
for mod in ('ambient-light.v0.9.0.mjs','look-presets.v0.9.0.mjs','live-safety.v0.9.0.mjs','live-performance.v0.9.0.mjs','mesh-warp.v0.9.0.mjs','reference-match.v0.9.0.mjs','reference-panel.v0.9.0.mjs'):
    assert (root/mod).exists(),mod
assert 'FaceLandmarker' in s and 'showCompare' in s and 'referencePanel=initReferencePanel' in s
print('PASS v0.9.0 ambient uniforms, local preset UI, share actions, module graph, retained face features')
