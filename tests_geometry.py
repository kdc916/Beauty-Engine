"""v0.2.0 mesh warp structural regression. Runtime mesh math is tested by Node."""
from pathlib import Path
root=Path(__file__).parent
code=(root/'main.v0.2.2.js').read_text()
html=(root/'index.html').read_text()
mesh=(root/'mesh-warp.v0.2.2.mjs').read_text()
assert 'src="./main.v0.2.2.js"' in html
assert "from './mesh-warp.v0.2.2.mjs'" in code
assert 'in vec2 aSourceUv;' in code and 'in vec2 vMeshUv;' in code
assert 'vec2 src=vMeshUv;' in code
assert 'gl.drawElements(gl.TRIANGLES,faceMesh.indices.length,gl.UNSIGNED_SHORT,0)' in code
assert 'gl.bufferSubData(gl.ARRAY_BUFFER,0,faceMesh.vertices)' in code
assert 'gl.vertexAttribPointer(srcLoc,2,gl.FLOAT,false,16,8)' in code
assert 'gl.drawArrays(gl.TRIANGLE_STRIP,0,4)' not in code
assert 'src=mapEyes(' not in code
assert 'src.x+=(p.x-mid.x)' not in code
assert 'function getImageBounds()' in code
assert 'const ratio=Math.min(rect.width/cw,rect.height/ch);' in code
assert 'if(!polygonInside(x,y,outline))return 0;' in mesh
assert 'if(foldovers){' in mesh and 'vertices[v*4+2]=sourceBase[v*2]' in mesh
assert 'const inputX=mirror?1-dx:dx,inputY=1-dy;' in mesh
print('PASS: mesh UV vertex pipeline, original comparison path, background boundary and foldover fallback')
