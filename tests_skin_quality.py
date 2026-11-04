"""v0.1.6 non-GPU source and compatibility regression. Run: python tests_skin_quality.py"""
from pathlib import Path
import re
from PIL import Image

root=Path(__file__).resolve().parent
script=(root/'main.v0.1.6.js').read_text()
html=(root/'index.html').read_text()
css=(root/'styles.css').read_text()

assert 'main.v0.1.6.js' in html and 'styles.css?v=0.1.6' in html
assert 'v0.1.6' in html
assert '.control-panel{height:100%' in css and 'overflow-y:auto' in css
for key in ['skin','bright','glow','detail','underEye','highlight']:
    assert "['"+key+"'," in script, key
    assert 'u'+key[0].upper()+key[1:] in script, key
for preset in ('clear','douyin','soft'):
    line=next(line for line in script.splitlines() if line.startswith('  '+preset+':'))
    for key in ('detail','underEye','highlight'):
        assert re.search(r'\b'+key+r':\d+',line), (preset,key)
assert 'uniform vec2 uPoints[13];' in script
assert 'new Float32Array(26)' in script
assert 'for(let i=0;i<13;i++){normalizedPoints' in script
assert '145,374' in script
assert 'src+direction*1.5/uSize' in script and 'src+direction*4.1/uSize' in script
assert 'texture(uSkinMask,fineUV).r' in script and 'texture(uSkinMask,toneUV).r' in script
assert 'color+=highDetail*(smoothing*uDetail*.47)' in script
assert 'underMask*skinMask*protect' in script
assert 'shoulder=smoothstep' in script and 'uHighlight*skinMask' in script
assert 'if(uEnabled<0.5 || (uCompare>0.5 && vUv.x<uCompPos))' in script
assert 'const STORAGE_KEY=\'maxvfx.beauty.v0.1.preferences\'' in script
assert 'for(const key of Object.keys(PRESETS.douyin))' in script
sample=root/'assets/sample-portrait.webp'
assert sample.is_file()
with Image.open(sample) as image:
    assert image.width>=200 and image.height>=200
print('PASS: skin controls, GPU wiring, 13-point landmarks, storage backward compatibility, sample image and mobile scroll CSS')
