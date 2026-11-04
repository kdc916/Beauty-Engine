"""v0.9.0 source and UI contract regression. Not a WebGL2/GPU device test."""
from pathlib import Path
from html.parser import HTMLParser
import re
r=Path(__file__).resolve().parent
html=(r/'index.html').read_text()
js=(r/'main.v0.9.0.js').read_text()
occlusion=(r/'occlusion-guard.v0.9.0.mjs').read_text()
transition=(r/'live-transition.v0.9.0.mjs').read_text()
ambient=(r/'ambient-light.v0.9.0.mjs').read_text()
assert '<script type="module" src="./main.v0.9.0.js"></script>' in html
for name in ('occlusion-guard','live-transition','ambient-light','live-safety','face-pose','reference-match','reference-panel','look-presets','live-performance','mesh-warp'):
    assert f"'./{name}.v0.9.0.mjs'" in js,(name,'runtime import')
assert 'occlusionGuard.inspect(lm,t)' in js
assert 'occlusionGuard.commit(trackedLandmarks,t)' in js
assert 'liveFaceFilter.update(inspection.points,t)' in js
assert 'facePoseTracker.update(' in js
assert 'rasterizeSkinMask(trackedLandmarks)' in js
assert js.index('occlusionGuard.inspect(lm,t)')<js.index('liveFaceFilter.update(inspection.points,t)')<js.rindex('rasterizeSkinMask(trackedLandmarks)')
assert "if(!inspection.safe){liveFaceFilter.missing();releaseLiveGeometry(inspection.reason);return;}" in js
assert 'liveTransition.step(t,desired)' in js and "age>LIVE_TRANSITION.maxStaleMs" in js
assert 'state.mode===\'camera\'?.18*trackedQuality:1' in js
assert 'targetQuality*poseFactor*poseSafetyMultiplier(currentFacePose)' in js
assert 'gl.uniform1f(uniforms.uPoseAwareLight,poseAwareLighting&&!relight3D?(state.mode===' in js
assert 'createLightStabilizer({alpha})' in ambient
assert 'maxRepairDurationMs:240' in occlusion and 'poseSafetyMultiplier' in occlusion
assert 'maxStaleMs:310' in transition
assert 'const STORAGE_KEY=' in js and "'maxvfx.beauty.v0.1.preferences'" in js
assert 'currentLook(' in js and 'shareNamedLook' in js and 'referencePanel=initReferencePanel' in js
class Parser(HTMLParser):
    def __init__(self):super().__init__();self.ids=[]
    def handle_starttag(self,tag,attrs):self.ids.extend(v for k,v in attrs if k=='id')
p=Parser();p.feed(html)
assert len(p.ids)==len(set(p.ids)),"duplicate HTML IDs"
assert 'overflow-y:auto' in (r/'styles.css').read_text()
assert (r/'assets/sample-portrait.webp').exists()
assert (r/'docs/DEVICE_QA_V028.md').exists()
print(f'PASS v0.9.0 occlusion/pose/light/preset wiring, {len(p.ids)} unique HTML IDs')
