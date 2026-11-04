"""v0.9.0 entrypoint, privacy and UI integration static smoke test."""
from pathlib import Path
import re
from html.parser import HTMLParser
r=Path(__file__).resolve().parent
h=(r/'index.html').read_text(encoding='utf8')
m=(r/'main.v0.9.0.js').read_text(encoding='utf8')
sculpt=(r/'face-sculpt.v0.9.0.mjs').read_text(encoding='utf8')
look=(r/'look-presets.v0.9.0.mjs').read_text(encoding='utf8')
css=(r/'styles.css').read_text(encoding='utf8')
assert '<script type="module" src="./main.v0.9.0.js"' in h
assert 'styles.css?v=0.9.0' in h
assert 'v0.9.0' in h
class Parser(HTMLParser):
 def __init__(self): super().__init__();self.ids=[]
 def handle_starttag(self,tag,attrs): self.ids.extend(v for k,v in attrs if k=='id')
p=Parser();p.feed(h)
assert len(set(p.ids))==len(p.ids)
ids=set(p.ids)
required=['lookName','saveLookBtn','loadLookBtn','shareLookBtn','shareSnapshotBtn','shareLookLinkBtn',
 'lookShareFallback','studioLightToggle','studioDirection','studioFill','studioWarmth','studioDirectionValue',
 'studioFillValue','studioWarmthValue','liveSculptToggle','exportCompareBtn','liveDiagnostics']
assert set(required).issubset(ids),set(required)-ids
assert not (set(re.findall(r"\$\('([^']+)'\)",m))-ids)
assert all((r/f).is_file() for f in re.findall(r"from '\./([^']+)'",m))
assert 'sculptLandmarks:sculptActive?trackedLandmarks:null' in m
assert 'poseContinuityGain>.52' in m
assert "liveSculpt&&trackedQuality>.62" in m
assert "const rim=boundaryFade(x,y,outline,aspect,.042)**3" in sculpt
assert "live&&(k==='cheek'||k==='chin')?0" in sculpt
assert 'MAX_LINK_LENGTH=7000' in (r/'look-links.v0.9.0.mjs').read_text()
assert 'studioNormalized' in look and 'liveSculpt' in look
assert 'if(uDetected>0.5 && uStudioLight.w>0.5' in m
assert "gl.uniform4f(uniforms.uStudioLight" in m
assert 'combined.toBlob(blob' in m
assert 'data-studio="window"' in h and "'./assets/sample-portrait.webp'" in m
assert 'v090-studio-presets' in css
print('PASS v0.9.0: page entry, UI, module imports, privacy, live safety, lighting, presets, export')
