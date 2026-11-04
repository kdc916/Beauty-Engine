"""v0.2.1 source-only UI contract test; not a real GPU/MediaPipe device test."""
from pathlib import Path
r=Path(__file__).parent
h=(r/'index.html').read_text()
j=(r/'main.v0.2.1.js').read_text()
p=(r/'reference-panel.v0.2.1.mjs').read_text()
m=(r/'reference-metrics.v0.2.1.mjs').read_text()
css=(r/'styles.css').read_text()
for ident in ('refOwnInput','refTargetInput','refOwnStatus','refTargetStatus','refUsePreview','refComparison','refOwnPick','refTargetPick'):
    assert h.count('id="'+ident+'"')==1,ident
assert 'src="./main.v0.2.1.js"' in h
assert "from './reference-panel.v0.2.1.mjs'" in j
assert 'initReferencePanel({' in j
assert "from './reference-metrics.v0.2.1.mjs'" in p
assert "numFaces:3" in p and "runningMode:'IMAGE'" in p
assert 'faces.length!==1' in p and 'store[role].generation!==generation' in p
assert 'URL.revokeObjectURL' in p
assert 'localStorage' not in p and 'fetch(' not in p
assert 'compareFaceGeometry' in m and 'analyzeFaceGeometry' in m
assert 'overflow-y:auto' in css
print('PASS dual photo source UI, stale-generation prevention and nonpersisted face analysis')
