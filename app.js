overlays[active].rot = deg2rad(+rotateRange.value);
  draw();
});
scaleRange.addEventListener('input', ()=>{
  if (active < 0) return;
  overlays[active].scale = +scaleRange.value;
  draw();
});
flipBtn.addEventListener('click', ()=>{
  if (active < 0) return;
  overlays[active].flip = !overlays[active].flip;
  draw();
});
resetBtn.addEventListener('click', ()=>{
  if (active < 0) return;
  overlays[active].rot = 0;
  overlays[active].scale = 1;
  overlays[active].flip = false;
  draw();
});
deleteBtn.addEventListener('click', ()=>{
  if (active < 0) return;
  overlays.splice(active,1);
  setActive(-1);
});

// ===== Drag / HitTest =====
let isDragging = false;
let dragDX = 0, dragDY = 0;

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('touchstart', startDrag, {passive:false});
function startDrag(e){
  e.preventDefault();
  const p = getPos(e);
  // از آخر به اول برای انتخاب رویی‌ترین
  for (let i = overlays.length - 1; i >= 0; i--) {
    if (hit(overlays[i], p.x, p.y)) {
      setActive(i);
      isDragging = true;
      const o = overlays[active];
      dragDX = p.x - o.x;
      dragDY = p.y - o.y;
      return;
    }
  }
  setActive(-1);
}

canvas.addEventListener('mousemove', drag);
canvas.addEventListener('touchmove', drag, {passive:false});
function drag(e){
  if (!isDragging || active < 0) return;
  e.preventDefault();
  const p = getPos(e);
  overlays[active].x = p.x - dragDX;
  overlays[active].y = p.y - dragDY;
  draw();
}

['mouseup','mouseleave','touchend','touchcancel'].forEach(ev =>
  canvas.addEventListener(ev, ()=>{ isDragging = false; })
);

// اسکرول برای زوم کلاه انتخابی
canvas.addEventListener('wheel', (e)=>{
  if (active < 0) return;
  e.preventDefault();
  const o = overlays[active];
  const delta = e.deltaY < 0 ? 1.06 : 0.94;
  o.scale = clamp(o.scale * delta, 0.1, 3);
  scaleRange.value = o.scale.toFixed(2);
  draw();
}, { passive:false });

// کلیدهای کمکی
window.addEventListener('keydown', (e)=>{
  if (active < 0) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    overlays.splice(active,1); setActive(-1);
  } else if (e.key.toLowerCase() === 'q') {
    overlays[active].rot -= deg2rad(5); rotateRange.value = rad2deg(overlays[active].rot);
    draw();
  } else if (e.key.toLowerCase() === 'e') {
    overlays[active].rot += deg2rad(5); rotateRange.value = rad2deg(overlays[active].rot);
    draw();
  }
});

// ===== Export =====
downloadBtn.addEventListener('click', ()=>{
  if (!baseImg) return;
  // خروجی PNG با پس‌زمینه سفید و کلاه‌های شفاف
  const a = document.createElement('a');
  a.download = 'overlay.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// ===== Helpers =====
function getPos(e){
  const rect = canvas.getBoundingClientRect();
  const x = (('touches' in e) ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (('touches' in e) ? e.touches[0].clientY : e.clientY) - rect.top;
  // تبدیل به مختصات بوم (درصورت scale CSS)
  return {
    x: x * (canvas.width / rect.width),
    y: y * (canvas.height / rect.height)
  };
}

function hit(o, x, y){
  // معکوس ترنسفورم برای هیت‌تست مستطیل کلاه
  const cos = Math.cos(-o.rot), sin = Math.sin(-o.rot);
  let tx = x - o.x, ty = y - o.y;
  // چرخش معکوس
  const rx = tx * cos - ty * sin;
  const ry = tx * sin + ty * cos;
  // مقیاس و flip
  const sx = rx / (o.flip ? -o.scale : o.scale);
  const sy = ry / o.scale;
  return (sx >= -o.w/2 && sx <= o.w/2 && sy >= -o.h/2 && sy <= o.h/2);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const deg2rad = d => d * Math.PI / 180;
const rad2deg = r => Math.round(r * 180 / Math.PI);
