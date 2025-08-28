// ---------- refs ----------
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const fileInput   = document.getElementById('fileInput');
const pickBtn     = document.getElementById('pickBtn');
const hatsGrid    = document.getElementById('hats');
const rotateRange = document.getElementById('rotateRange');
const scaleRange  = document.getElementById('scaleRange');
const flipBtn     = document.getElementById('flipBtn');
const resetBtn    = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const deleteBtn   = document.getElementById('deleteBtn');
const dropHint    = document.getElementById('dropHint');
const statusEl    = document.getElementById('status');

let baseImg = null;
let overlays = [];
let active = -1;

// ---------- helpers ----------
const clamp   = (v,a,b)=>Math.max(a,Math.min(b,v));
const deg2rad = d => d*Math.PI/180;
const rad2deg = r => Math.round(r*180/Math.PI);
const setStatus = t => { if(statusEl) statusEl.textContent = t || ''; };

function fitCanvasToImage(img){
  const maxW = Math.min(1200, canvas.parentElement.clientWidth - 24);
  const maxH = Math.min(900, window.innerHeight * 0.8);
  const r = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
  canvas.width  = Math.max(1, Math.round(img.naturalWidth  * r));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * r));
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!baseImg) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height);

  overlays.forEach((o,i)=>{
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.rot);
    ctx.scale(o.flip ? -o.scale : o.scale, o.scale);
    ctx.drawImage(o.img, -o.w/2, -o.h/2, o.w, o.h);
    if(i === active){
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';
      ctx.strokeRect(-o.w/2, -o.h/2, o.w, o.h);
    }
    ctx.restore();
  });
}

function setActive(i){
  active = i;
  const has = i >= 0;
  rotateRange.disabled = !has;
  scaleRange.disabled  = !has;
  flipBtn.disabled     = !has;
  resetBtn.disabled    = !has;
  deleteBtn.disabled   = !has;
  if(has){
    rotateRange.value = rad2deg(overlays[i].rot);
    scaleRange.value  = overlays[i].scale.toFixed(2);
  }
  draw();
}

// ---------- upload ----------
if(pickBtn) pickBtn.addEventListener('click', ()=> fileInput.click());

if(fileInput){
  fileInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if(!file){ setStatus('فایلی انتخاب نشد.'); return; }
    if(!file.type.startsWith('image/')){ setStatus('فقط فایل تصویری انتخاب کن.'); return; }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = ()=>{
      baseImg = img;
      fitCanvasToImage(img);
      downloadBtn.disabled = false;
      dropHint.style.display = 'none';
      setStatus('');
      draw();
      URL.revokeObjectURL(url);
    };
    img.onerror = ()=> setStatus('لود تصویر ناموفق بود.');
    img.src = url;
  });
}

// drag & drop (desktop)
['dragenter','dragover','dragleave','drop'].forEach(ev=>{
  canvas.addEventListener(ev, e=>e.preventDefault(), {passive:false});
});
canvas.addEventListener('dragover', ()=> dropHint.style.opacity = .3);
canvas.addEventListener('dragleave',()=> dropHint.style.opacity = 1);
canvas.addEventListener('drop', (e)=>{
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(!f) return;
  const url = URL.createObjectURL(f);
  const img = new Image();
  img.onload = ()=>{
    baseImg = img;
    fitCanvasToImage(img);
    downloadBtn.disabled = false;
    dropHint.style.display = 'none';
    setStatus('');
    draw();
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

// paste (Ctrl/Cmd+V)
window.addEventListener('paste', (e)=>{
  const items = e.clipboardData && e.clipboardData.items;
  if(!items) return;
  for(const it of items){
    if(it.type.indexOf('image')===0){
      const file = it.getAsFile();
          const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{
        baseImg = img;
        fitCanvasToImage(img);
        downloadBtn.disabled = false;
        dropHint.style.display = 'none';
        setStatus('');
        draw();
        URL.revokeObjectURL(url);
      };
      img.src = url;
      break;
    }
  }
});

// ---------- add hats ----------
hatsGrid.addEventListener('click', (e)=>{
  if(!(e.target instanceof HTMLImageElement)) return;
  if(!baseImg){ setStatus('اول عکس را آپلود کن.'); return; }
  const src = e.target.getAttribute('src');
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=>{
    const baseW = canvas.width * 0.38;
    const ratio = img.naturalHeight / img.naturalWidth;
    overlays.push({
      img, x: canvas.width/2, y: canvas.height/3,
      scale: 1, rot: 0, flip: false,
      w: baseW, h: baseW * ratio
    });
    setActive(overlays.length - 1);
  };
  img.src = src;
});

// ---------- controls ----------
rotateRange.addEventListener('input', ()=>{
  if(active<0) return;
  overlays[active].rot = deg2rad(+rotateRange.value);
  draw();
});
scaleRange.addEventListener('input', ()=>{
  if(active<0) return;
  overlays[active].scale = +scaleRange.value;
  draw();
});
flipBtn.addEventListener('click', ()=>{
  if(active<0) return;
  overlays[active].flip = !overlays[active].flip;
  draw();
});
resetBtn.addEventListener('click', ()=>{
  if(active<0) return;
  Object.assign(overlays[active], {rot:0, scale:1, flip:false});
  rotateRange.value = '0'; scaleRange.value = '1';
  draw();
});
deleteBtn.addEventListener('click', ()=>{
  if(active<0) return;
  overlays.splice(active,1);
  setActive(-1);
});

// ---------- drag move ----------
let isDragging=false, dragDX=0, dragDY=0;
canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', startDrag, {passive:false});
function startDrag(e){
  e.preventDefault();
  const p = getPos(e);
  for(let i=overlays.length-1;i>=0;i--){
    if(hit(overlays[i], p.x, p.y)){
      setActive(i);
      isDragging = true;
      dragDX = p.x - overlays[i].x;
      dragDY = p.y - overlays[i].y;
      return;
    }
  }
  setActive(-1);
}
canvas.addEventListener('mousemove', drag);
canvas.addEventListener('touchmove', drag, {passive:false});
function drag(e){
  if(!isDragging || active<0) return;
  e.preventDefault();
  const p = getPos(e);
  overlays[active].x = p.x - dragDX;
  overlays[active].y = p.y - dragDY;
  draw();
}
['mouseup','mouseleave','touchend','touchcancel'].forEach(ev=>{
  canvas.addEventListener(ev, ()=>{ isDragging=false; });
});

// wheel zoom
canvas.addEventListener('wheel', (e)=>{
  if(active<0) return;
  e.preventDefault();
  const o = overlays[active];
  o.scale = clamp(o.scale * (e.deltaY<0?1.06:0.94), 0.1, 3);
  scaleRange.value = o.scale.toFixed(2);
  draw();
}, {passive:false});

// export
downloadBtn.addEventListener('click', ()=>{
  if(!baseImg) return;
  const a = document.createElement('a');
  a.download = 'overlay.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// ---------- math / hit ----------
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top)  * (canvas.height / rect.height)
  };
}
function hit(o, x, y){
  const cos = Math.cos(-o.rot), sin = Math.sin(-o.rot);
  let tx = x - o.x, ty = y - o.y;
  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;
  const sx = rx / (o.flip ? -o.scale : o.scale);
  const sy = ry / o.scale;
  return (sx >= -o.w/2 && sx <= o.w/2 && sy >= -o.h/2 && sy <= o.h/2);
}
