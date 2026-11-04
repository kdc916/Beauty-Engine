from pathlib import Path
root=Path(__file__).resolve().parent
s=(root/'reference-match.v0.2.4.mjs').read_text(encoding='utf-8')
assert 'contourSafety' in s
assert 'interiorSafety' in s
assert 'maxDisplacementIPD:.06' in s
assert "region==='jaw'" in s
m=(root/'mesh-warp.v0.2.4.mjs').read_text(encoding='utf-8')
assert 'refDu=(matched[0]-inputX)*0.92' in m
h=(root/'index.html').read_text(encoding='utf-8')
assert 'main.v0.2.4.js' in h
print('PASS v0.2.4 contour-safe reference match wiring')
