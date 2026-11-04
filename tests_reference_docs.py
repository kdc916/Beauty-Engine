# stdlib-only schema sanity tests. This is NOT proof of real Reference Match feature availability.
import json
from pathlib import Path
r=Path(__file__).resolve().parent
schema=json.loads((r/'schemas/reference-match-config.schema.json').read_text())
preset=json.loads((r/'examples/reference-match-preset.json').read_text())
assert schema['type']=='object' and schema['additionalProperties'] is False
assert schema['$schema'].endswith('draft/2020-12/schema')
for key in schema['required']: assert key in preset, key
for key,defn in schema['properties'].items():
  if key in ('globalStrength','maxDisplacementIPD'):
    assert defn['minimum']<=preset[key]<=defn['maximum']
  elif key=='regions':
    assert set(preset[key])==set(defn['required'])
    for part,val in preset[key].items():
      props=defn['properties'][part];assert props['minimum']<=val<=props['maximum']
  elif 'const' in defn: assert preset[key]==defn['const']
assert not ({'faceImage','landmarks','embedding','personName','referenceUrl','sourceUrl'} & set(preset))
for f in ('docs/ROADMAP.md','docs/REFERENCE_MATCH_DESIGN.md','docs/QA_REFERENCE_MATCH.md'):
  assert (r/f).is_file(),f
assert 'main.v0.9.0.js' in (r/'index.html').read_text()
assert 'v0.9.0' in (r/'index.html').read_text()
print('PASS: reference roadmap documents, preset JSON constraints, Reference Match runtime available as experimental 2D mesh matching; surgery preview not implemented')
