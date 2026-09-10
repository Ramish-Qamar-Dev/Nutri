export type Point = [number, number, number];
export type Face = { path:string; depth:number; ingredient:number; shade:number };
export const wrapRotation = (angle:number) => ((angle+180)%360+360)%360-180;

// Orthographic projection of an extruded annular calorie chart, not food geometry.
export function calorieGeometry(values:number[], rotation:number, elevation:number, zoom:number, separated:boolean, selected:number) {
  const total=values.reduce((a,b)=>a+b,0);
  if(total<=0)return {faces:[] as Face[],targets:[] as {path:string;ingredient:number}[]};
  const tilt=elevation*Math.PI/180;
  const project=([x,y,z]:Point)=>[320+x*zoom,235+(z*Math.sin(tilt)-y*Math.cos(tilt))*zoom];
  const path=(points:Point[])=>points.map((p,i)=>`${i?'L':'M'}${project(p).map(n=>n.toFixed(2)).join(',')}`).join(' ')+' Z';
  const faces:Face[]=[],targets:{path:string;ingredient:number}[]=[];
  let cursor=rotation*Math.PI/180;
  values.forEach((value,ingredient)=>{
    const sweep=value/total*Math.PI*2;
    const start=cursor+Math.min(.014,sweep/6),end=cursor+sweep-Math.min(.014,sweep/6);
    cursor+=sweep;
    if(value<=0)return;
    const mid=(start+end)/2,offset=separated?23:ingredient===selected?8:0;
    const lift=ingredient===selected?12:0;
    const point=(angle:number,r:number,h:number):Point=>[Math.cos(angle)*r+Math.cos(mid)*offset,h+lift,Math.sin(angle)*r+Math.sin(mid)*offset];
    const face=(points:Point[],shade:number)=>faces.push({path:path(points),depth:points.reduce((sum,p)=>sum+p[2]*Math.cos(tilt)+p[1]*Math.sin(tilt),0)/points.length,ingredient,shade});
    const count=Math.max(2,Math.ceil(sweep*28));
    const outer:Point[]=[],inner:Point[]=[];
    for(let i=0;i<=count;i++){
      const a=start+(end-start)*i/count;
      outer.push(point(a,192,38));inner.push(point(a,81,38));
      if(i===count)break;
      const b=start+(end-start)*(i+1)/count;
      face([point(a,192,0),point(b,192,0),point(b,192,38),point(a,192,38)],.57+.1*Math.cos(a));
      face([point(b,81,0),point(a,81,0),point(a,81,38),point(b,81,38)],.48);
      face([point(a,81,38),point(a,192,38),point(b,192,38),point(b,81,38)],1);
    }
    face([point(start,81,0),point(start,192,0),point(start,192,38),point(start,81,38)],.65);
    face([point(end,192,0),point(end,81,0),point(end,81,38),point(end,192,38)],.65);
    targets.push({path:path([...outer,...inner.reverse()]),ingredient});
  });
  return {faces:faces.sort((a,b)=>a.depth-b.depth),targets};
}
