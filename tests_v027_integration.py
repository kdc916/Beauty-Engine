"""v0.9.0 static integration smoke checks. Not a real WebGL2/camera test."""
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).parent
html=(root/'index.html').read_text()
main=(root/'main.v0.9.0.js').read_text()
pose=(root/'face-pose.v0.9.0.mjs').read_text()
look=(root/'look-presets.v0.9.0.mjs').read_text()
assert 'src="./main.v0.9.0.js"' in html
assert 'id="poseAwareLight"' in html and 'id="poseStatus"' in html
assert 'pose-aware' not in html.lower() or '3D' in html
assert "from './face-pose.v0.9.0.mjs'" in main
assert 'outputFacialTransformationMatrixes:withPose' in main
assert "for(const delegate of ['GPU','CPU'])" in main
assert 'for(const withPose of [true,false])' in main
assert 'result.facialTransformationMatrixes?.[0]' in main
assert 'uniform vec4 uFacePose;' in main and 'uniform float uPoseAwareLight;' in main
assert 'gl.uniform4f(uniforms.uFacePose,...poseU)' in main
assert 'skinMask*uFacePose.w*uPoseAwareLight*uAmbient.w' in main
assert 'facePoseTracker.missing()' in main and 'facePoseTracker.reset()' in main
assert 'poseAware:raw.lighting?.poseAware!==false' in look
assert 'localStorage' not in pose and 'fetch(' not in pose
class IDs(HTMLParser):
    def __init__(self): super().__init__();self.ids=[]
    def handle_starttag(self, tag,attrs):
        for k,v in attrs:
            if k=='id': self.ids.append(v)
p=IDs();p.feed(html);assert len(p.ids)==len(set(p.ids)),"duplicate IDs"
for f in ['face-pose.v0.9.0.mjs','ambient-light.v0.9.0.mjs','look-presets.v0.9.0.mjs','mesh-warp.v0.9.0.mjs']:
    assert (root/f).is_file(),f
assert 'overflow-y:auto' in (root/'styles.css').read_text()
print(f'PASS v0.9.0 pose+lighting+presets+fallback wiring, {len(p.ids)} unique HTML IDs')
