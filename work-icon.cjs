// Generates the monochrome app icon: a white note with a folded corner on a black rounded tile.
const fs = require('fs'); const zlib = require('zlib');
function crc(b){let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
const inRound=(x,y,x0,y0,x1,y1,r)=>{const cx=Math.max(x0+r,Math.min(x,x1-r)),cy=Math.max(y0+r,Math.min(y,y1-r));return x>=x0&&x<=x1&&y>=y0&&y<=y1&&Math.hypot(x-cx,y-cy)<=r;};
const N0=.27,N1=.73,F=.15;
function sample(x,y){
  if(!inRound(x,y,.04,.04,.96,.96,.22))return null;
  const inNote=inRound(x,y,N0,N0,N1,N1,.035)&&x+y<=N1*2-F;
  if(inNote&&x>=N1-F&&y>=N1-F)return[150,150,150];
  if(inNote){
    const line=(y0,x1)=>y>=y0&&y<=y0+.04&&x>=.35&&x<=x1;
    if(line(.385,.65)||line(.475,.58))return[17,17,17];
    return[250,250,250];
  }
  return[17,17,17];
}
function png(size){
  const S=4,raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let r=0,g=0,b=0,a=0;
    for(let sy=0;sy<S;sy++)for(let sx=0;sx<S;sx++){const c=sample((x+(sx+.5)/S)/size,(y+(sy+.5)/S)/size);if(c){r+=c[0];g+=c[1];b+=c[2];a++;}}
    const p=y*(size*4+1)+1+x*4;
    if(a)raw.set([Math.round(r/a),Math.round(g/a),Math.round(b/a),Math.round(a/(S*S)*255)],p);
  }
  const hdr=Buffer.alloc(13);hdr.writeUInt32BE(size);hdr.writeUInt32BE(size,4);hdr[8]=8;hdr[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const sizes=[16,20,24,32,40,48,64,128,256],images=sizes.map(png);
fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('assets/icon.png',images.at(-1));
const head=Buffer.alloc(6);head.writeUInt16LE(1,2);head.writeUInt16LE(sizes.length,4);
let offset=6+16*sizes.length;const dir=[];
sizes.forEach((s,i)=>{const e=Buffer.alloc(16);e[0]=s%256;e[1]=s%256;e.writeUInt16LE(1,4);e.writeUInt16LE(32,6);e.writeUInt32LE(images[i].length,8);e.writeUInt32LE(offset,12);offset+=images[i].length;dir.push(e);});
fs.writeFileSync('assets/icon.ico',Buffer.concat([head,...dir,...images]));
