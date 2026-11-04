"""v0.9.0 source/resource and safe relight integration contract; GPU device test not included."""
from html.parser import HTMLParser
from pathlib import Path
import re
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
main=(root/'main.v0.9.0.js').read_text(encoding='utf-8')
segment=(root/'semantic-occlusion-runtime.v0.9.0.mjs').read_text(encoding='utf-8')
look=(root/'look-presets.v0.9.0.mjs').read_text(encoding='utf-8')
assert 'src="./main.v0.9.0.js"' in html
assert 'styles.css?v=0.9.0' in html
assert 'id="relight3D"' in html
assert 'id="semanticOcclusionToggle"' in html
assert 'uniform vec4 uLightField;' in main and 'uniform float uRelight3D;' in main
assert 'gl.uniform4f(uniforms.uLightField' in main
assert 'skinMask>0.001' in main
assert 'color+=vec3(signedFill' in main
assert 'lightField.reset()' in main
assert 'maskAligned=isMatteAligned' in main and 'measureFaceAlignment' in segment
assert 'temporal.update(protectedEdge' in segment
assert 'conservativeOccluderEdge(' in segment
assert 'temporal.reset()' in segment
assert 'relight3D:raw.lighting?.relight3D===true' in look
assert "return normalizeLook({name,values,lighting,reference,studio,liveSculpt})" in look
class P(HTMLParser):
    def __init__(self): super().__init__();self.ids=[]
    def handle_starttag(self,tag,attrs): self.ids.extend(v for k,v in attrs if k=='id')
p=P();p.feed(html)
assert len(p.ids)==len(set(p.ids)), 'Duplicate HTML ids'
for name in re.findall(r"from '\./([^']+)'",main):
    assert (root/name).is_file(), f'Missing module: {name}'
for file in ['assets/sample-portrait.webp','docs/HANDOFF.md','styles.css']:
    assert (root/file).is_file(), file
print(f'PASS v0.9.0 light/temporal matte/preset/UI integration ({len(p.ids)} unique HTML IDs)')
