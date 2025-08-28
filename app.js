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
    setActive(overlays.length-1);
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
