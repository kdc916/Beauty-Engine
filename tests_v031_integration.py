"""v0.9.0 integration/consistency contract (not GPU/phone device test)."""
from pathlib import Path
r=Path(__file__).resolve().parent
s=(r/'main.v0.9.0.js').read_text(encoding='utf-8')
h=(r/'index.html').read_text(encoding='utf-8')
semantic=(r/'semantic-occlusion-runtime.v0.9.0.mjs').read_text(encoding='utf-8')
for v in ('pose-continuity.v0.9.0.mjs','matte-alignment.v0.9.0.mjs'):
    assert (r/v).exists() and v in s
assert 'isMatteAligned(semanticMaskFrame,trackedLandmarks)' in s
assert 'const anchors=measureFaceAlignment(landmarks)' in semantic
assert 'currentFacePose,t);poseContinuityGain=gate.gain' in s
assert 'meshIdentityReady=!requiresWarp' in s
assert 'meshDirty=true;meshIdentityReady=false;texture=gl.createTexture()' in s
assert 'meshDirty=true;meshIdentityReady=false;maskDirty=true;skinMaskReady=false' in s
assert 'src="./main.v0.9.0.js"' in h
assert 'styles.css?v=0.9.0' in h
print('PASS v0.9.0 pose continuity, stale-matte reject, conditional mesh update and entrypoint')
