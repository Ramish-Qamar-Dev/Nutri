import assert from 'node:assert/strict';
import { calorieGeometry,wrapRotation } from '../lib/calorie-geometry.ts';
assert.equal(wrapRotation(190),-170);
assert.equal(wrapRotation(-190),170);
assert.deepEqual(calorieGeometry([0,0],0,48,1,false,0),{faces:[],targets:[]});
for (const values of [[588],[0,250,100],[197,89,126,165,11]]) {
  for (const rotation of [-180,-35,0,90,175]) for(const elevation of [30,48,60]) for(const separated of [false,true]) {
    const model=calorieGeometry(values,rotation,elevation,1.1,separated,0);
    assert.equal(model.targets.length,values.filter(v=>v>0).length);
    for(let i=1;i<model.faces.length;i++)assert.ok(model.faces[i].depth>=model.faces[i-1].depth);
    for(const face of model.faces){
      assert.ok(values[face.ingredient]>0);
      assert.ok(!/NaN|Infinity/.test(face.path));
      const numbers=face.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
      numbers.forEach((n,i)=>assert.ok(n>=0&&n<=(i%2?460:640),`Out-of-frame coordinate ${n}`));
    }
  }
}
assert.notDeepEqual(calorieGeometry([100,200],0,48,1,false,0).faces,calorieGeometry([100,200],90,48,1,false,0).faces);
console.log('3D geometry: rotation, projection bounds, depth ordering, zero values, selection, zoom and separated segments passed.');
