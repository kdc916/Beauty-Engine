"""Dependency-free checks for the portrait eye warp / global-stretch regression.
Run: python tests_geometry.py
"""
from pathlib import Path
import math

root=Path(__file__).resolve().parent
code=(root/'main.v0.1.6.js').read_text()
html=(root/'index.html').read_text()
assert 'src="./main.v0.1.6.js"' in html
assert 'src="./main.js"' not in html
assert 'if(r >= 1.0) return p;' in code
assert 'if(strength <= 0.00001) return p;' in code
assert 'return p-d*clamp(strength,0.0,0.12)*falloff;' in code
assert 'const canvas=gl?glCanvas:fallbackCanvas;' in code
assert 'function getImageBounds()' in code
assert 'const ratio=Math.min(rect.width/cw,rect.height/ch);' in code

def old_eye(p,c,aspect):
    return (c[0]+(p[0]-c[0])*aspect,p[1])

def new_eye(p,c,aspect,radius,strength):
    dx=p[0]-c[0];dy=p[1]-c[1]
    r=math.hypot(dx*aspect,dy)/max(.0001,radius)
    if strength<.00001 or r>=1: return p
    t=min(1.,max(0.,r));weight=(1-(t*t*(3-2*t)))**2
    return (p[0]-dx*min(strength,.12)*weight,p[1]-dy*min(strength,.12)*weight)

points=((.38,.37),(.62,.37))
for ratio in (.8,1.0,1.777):
    for p in ((.05,.08),(.95,.08),(.05,.89),(.95,.89)):
        old=p;new=p
        for eye in points:
            old=old_eye(old,eye,ratio)
            new=new_eye(new,eye,ratio,.10,.24)
        assert new==p,(ratio,p,new)
        if ratio==.8 and p[0]==.95:
            assert abs(old[0]-p[0])>.1,old

print('PASS: cache-busted JS, bounded eye UV mapping, image bounds and identity outside face')
