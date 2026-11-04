"""v0.1.5 structural regression tests for GPU skin mask + mobile controls."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent
js = (root / "main.v0.2.0.js").read_text(encoding="utf-8")
html = (root / "index.html").read_text(encoding="utf-8")
css = (root / "styles.css").read_text(encoding="utf-8")

assert 'main.v0.2.0.js' in html and 'id="debugMaskBtn"' in html
assert ".mask-qa" in css
for required in (
    "function rasterizeSkinMask(points)",
    "function uploadMaskTexture()",
    "uniform sampler2D uSkinMask;",
    "texture(uSkinMask,src).r",
    "texture(uSkinMask,toneUV).r",
    "if(epoch!==sourceGeneration)return;",
    "function invalidate()",
    "if(state.mode==='camera'){if(t-lastMetric>=1200)"
):
    assert required in js, required

for name in ("FACE_OVAL","LEFT_EYE","RIGHT_EYE","LEFT_BROW","RIGHT_BROW","OUTER_LIPS"):
    m = re.search(r"const " + name + r"=\[([^\]]+)\]", js)
    assert m, name
    indices = [int(s.strip()) for s in m.group(1).split(",")]
    assert all(0 <= idx < 478 for idx in indices), name
    if name == "FACE_OVAL":
        assert len(indices) == 36, name

assert (root / "assets/sample-portrait.webp").exists()
print("PASS: skin mask coordinates, GPU uniforms, render invalidation, QA control")
