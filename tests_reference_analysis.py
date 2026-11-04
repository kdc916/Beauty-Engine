"""v0.2.1 HTML/JS reference panel structural contract tests (no external deps)."""
from pathlib import Path
r=Path(__file__).parent
html=(r/'index.html').read_text()
js=(r/'main.v0.9.0.js').read_text()
ui=(r/'reference-panel.v0.9.0.mjs').read_text()
metric=(r/'reference-metrics.v0.2.1.mjs').read_text()
css=(r/'styles.css').read_text()
for x in ['refOwnInput','refTargetInput','refOwnStatus','refTargetStatus','refUsePreview','refComparison','refOwnPick','refTargetPick']:
    assert html.count('id="'+x+'"')==1,x
assert '<details id="referencePanel"' in html
assert 'src="./main.v0.9.0.js"' in html
assert "from './reference-panel.v0.9.0.mjs'" in js
assert 'initReferencePanel({' in js
assert "from './mesh-warp.v0.9.0.mjs'" in js
assert "from './reference-metrics.v0.2.1.mjs'" in ui
assert "numFaces:3" in ui and "runningMode:'IMAGE'" in ui
assert 'faces.length!==1' in ui
assert 'store[role].generation!==generation' in ui
assert 'URL.revokeObjectURL' in ui
assert 'localStorage' not in ui and 'fetch(' not in ui
assert 'analyzeFaceGeometry' in metric and 'compareFaceGeometry' in metric
assert '.reference-panel{' in css and 'overflow-y:auto' in css
assert 'Reference Match' in (r/'docs/ROADMAP.md').read_text()
print('PASS: two photo inputs, lifecycle, independent IMAGE task, metrics and mobile pinned preview CSS')
