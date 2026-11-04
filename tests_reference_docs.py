"""Document/schema smoke tests for the planned Reference Match format. Not a runtime feature test."""
import json
from pathlib import Path
r=Path(__file__).parent
schema=json.loads((r/'schemas/reference-match-config.schema.json').read_text())
cfg=json.loads((r/'examples/reference-match-preset.json').read_text())
assert schema['additionalProperties'] is False
assert set(cfg)==set(schema['required'])
for key in ('globalStrength','maxDisplacementIPD'):
    p=schema['properties'][key]
    assert p['minimum']<=cfg[key]<=p['maximum']
regions=schema['properties']['regions']
assert set(cfg['regions'])==set(regions['required'])
for key,value in cfg['regions'].items():
    assert 0 <= value <= 1
for path in ('docs/ROADMAP.md','docs/REFERENCE_MATCH_DESIGN.md','docs/QA_REFERENCE_MATCH.md'):
    assert (r/path).is_file()
assert 'main.v0.2.0.js' in (r/'index.html').read_text()
assert not any(k in cfg for k in ('image','sourcePhoto','referencePhoto','faceLandmarks','faceEmbedding','personId'))
print('PASS: planned reference config/schema/doc structure; runtime v0.2.0 unchanged')
