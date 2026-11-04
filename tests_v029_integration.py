"""v0.9.0 static module/render/UI wiring. Not an actual browser, model or GPU test."""
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf8')
js=(root/'main.v0.9.0.js').read_text(encoding='utf8')
mod=(root/'semantic-occlusion.v0.9.0.mjs').read_text(encoding='utf8')
controller=(root/'semantic-occlusion-runtime.v0.9.0.mjs').read_text(encoding='utf8')
assert 'src="./main.v0.9.0.js"' in html
assert 'id="semanticOcclusionToggle"' in html
assert 'id="semanticOcclusionStatus"' in html
assert 'uSemanticEnabled' in js and 'uSemanticMask' in js
assert 'color=mix(color,original,protectMask)' in js
assert 'texture(uSemanticMask,p)' in js, 'occlusion should be sampled at original/unwarped pixels'
assert 'gl.TEXTURE3' in js and 'uploadSemanticMask' in js
assert 'semanticOcclusion.resetSource()' in js
assert 'maskIsFresh' in mod and 'faceMaskQuality' in mod
assert "delegate:'CPU'" in controller
assert 'getAsUint8Array' in controller and 'mask?.close?.()' in controller
assert 'segmentationInterval(profile)' in controller
assert 'inputForSegmentation(source,profile)' in controller and 'maxSide<=512?256:320' in controller
assert 'onInferenceCost' in controller and 'livePerf.recordDetection(duration)' in js
class Reader(HTMLParser):
    def __init__(self):super().__init__();self.ids=[]
    def handle_starttag(self,tag,attrs):self.ids.extend(v for k,v in attrs if k=='id')
a=Reader();a.feed(html)
assert len(a.ids)==len(set(a.ids)), 'duplicate IDs'
assert 'overflow-y:auto' in (root/'styles.css').read_text()
print(f'PASS: semantic matte pipeline, GPU original-UV protection, lazy CPU model, {len(a.ids)} unique HTML IDs')
