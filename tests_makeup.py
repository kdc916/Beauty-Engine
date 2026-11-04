from pathlib import Path
s=Path(__file__).with_name('main.v0.2.4.js').read_text()
h=Path(__file__).with_name('index.html').read_text()
for term in ('uniform sampler2D uMakeupMask;', 'makeupTexture=gl.createTexture()', 'gl.TEXTURE2', 'const INNER_LIPS=', "ctx.globalCompositeOperation='destination-out'", 'rasterizeSkinMask(trackedLandmarks', 'liveFaceFilter.update(lm,t)', 'lipMask=clamp(makeupSample.r*makeupSample.a', 'blushMask=clamp(makeupSample.g*makeupSample.a'):
    assert term in s, term
assert 'main.v0.2.4.js' in h
print('PASS makeup masks, temporal smoothing and cache-busted entrypoint')
