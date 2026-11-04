"""Static regression checks for v0.1.5 face mask / render scheduling."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
src=(root/'main.v0.9.0.js').read_text()
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()
assert 'main.v0.9.0.js' in html and 'debugMaskBtn' in html
assert '.mask-qa' in css
for needle in ['const FACE_OVAL=','const LEFT_EYE=','const RIGHT_EYE=','const LEFT_BROW=','const RIGHT_BROW=','const OUTER_LIPS=','function rasterizeSkinMask(points)','function uploadMaskTexture()','uniform sampler2D uSkinMask;','texture(uSkinMask,src).r','texture(uSkinMask,toneUV).r','if(epoch!==sourceGeneration)return;','function invalidate()',"if(t-lastMetric>=1200)"]:
    assert needle in src,needle
for name in ['FACE_OVAL','LEFT_EYE','RIGHT_EYE','LEFT_BROW','RIGHT_BROW','OUTER_LIPS']:
    m=re.search(r'const '+name+r'=\[([^\]]+)\]',src)
    assert m, name
    indices=[int(x.strip()) for x in m.group(1).split(',')]
    assert all(0<=i<478 for i in indices),name
assert len(re.search(r'const FACE_OVAL=\[([^\]]+)\]',src).group(1).split(','))==36
assert (root/'assets/sample-portrait.webp').exists()
print('PASS: face-mask index validation, shader mask uniforms, static-frame scheduling, debug UI')
