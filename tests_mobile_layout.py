"""Static regression checks for v0.2.0 mobile sample + persistent-preview layout."""
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text(encoding='utf-8')
js=(root/'main.v0.2.4.js').read_text(encoding='utf-8')
css=(root/'styles.css').read_text(encoding='utf-8')
portrait=(root/'assets/sample-portrait.webp').read_bytes()
class IDs(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]
    def handle_starttag(self,tag,attrs):
        v=dict(attrs)
        if 'id' in v:self.ids.append(v['id'])
p=IDs();p.feed(html)
assert len(p.ids)==len(set(p.ids)), 'Duplicate HTML IDs'
for id_ in ('stage','glCanvas','fallbackCanvas','sampleControlBtn','cameraBtn','uploadBtn','compareBtn','presets','sliders'):
    assert id_ in p.ids,id_
assert 'src="./main.v0.2.4.js"' in html
assert 'href="./styles.css?v=0.2.4"' in html
assert 'loadBundledSample();' in js
assert "new URL('./assets/sample-portrait.webp',import.meta.url)" in js
assert "state.mode='sample'" in js
assert "setActiveSource('camera')" in js and "setActiveSource('photo')" in js
assert 'showCompare(true);startTracking();' in js
assert '.control-panel{height:100%;min-height:0;min-width:0;overflow-y:auto;' in css
assert 'grid-template-rows:minmax(0,47fr) minmax(0,53fr)' in css
assert 'height:100dvh' in css
assert 'grid-template-columns:minmax(0,1fr) minmax(0,1fr)' in css
assert portrait[:4]==b'RIFF' and portrait[8:12]==b'WEBP'
print('PASS: HTML IDs, entrypoints, sample asset, source switching, mobile split view CSS')
