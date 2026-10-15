(function () {
  "use strict";
  var W = 1600, H = 900;
  var stage = document.getElementById("stage");
  var vatHang = document.getElementById("vat-hang");
  var soHang = document.getElementById("so-hang");
  var tiendo = document.getElementById("tiendo");
  var khen = document.getElementById("khen");
  var thang = document.getElementById("thang");
  var phao = document.getElementById("phao");
  var btnAm = document.getElementById("amthanh");
  var ten = { 1: "ghế", 2: "chổi", 3: "muỗng", 4: "chảo", 5: "ti vi", 6: "ấm trà", 7: "tách cà phê" };
  var KHEN = ["Đúng rồi!", "Giỏi quá!", "Tuyệt vời!", "Chính xác!", "Hay lắm!"];

  var VW = 200, VH = Math.round(200 * 515 / 544);       // ô đồ vật
  var SW = 180, SH = Math.round(180 * 468 / 293);       // ô số
  var ROW_VAT_Y = 170, ROW_SO_Y = 462;
  var pitch = W / 7;
  var soEls = {}, vatEls = [], placed = 0, sound = true, actx = null;

  /* ---------- co giãn sân khấu theo cửa sổ ---------- */
  var scale = 1;
  function fit() {
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = "scale(" + scale + ")";
  }
  window.addEventListener("resize", fit); fit();

  /* ---------- âm thanh (tạo bằng WebAudio, không cần file) ---------- */
  function ctx() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, t0, dur, type, vol) {
    var a = ctx(); if (!a || !sound) return;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, a.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  }
  function sOk() { tone(659, 0, .18, "triangle"); tone(880, .12, .28, "triangle"); }
  function sSai() { tone(220, 0, .16, "sawtooth", .12); tone(170, .13, .22, "sawtooth", .12); }
  function sPick() { tone(520, 0, .07, "sine", .12); }
  function sWin() { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { tone(f, i * .14, .3, "triangle", .28); }); }
  btnAm.addEventListener("click", function () { sound = !sound; btnAm.textContent = sound ? "🔊" : "🔇"; ctx(); });

  /* ---------- dựng màn chơi ---------- */
  function shuffle(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function homeOf(slot) { return { x: Math.round(pitch * (slot + .5) - VW / 2), y: ROW_VAT_Y }; }

  function build() {
    vatHang.innerHTML = ""; soHang.innerHTML = ""; tiendo.innerHTML = "";
    soEls = {}; vatEls = []; placed = 0; thang.hidden = true;
    var n, i, el, order;
    for (n = 1; n <= 7; n++) {
      el = document.createElement("div"); el.className = "so";
      el.style.cssText = "left:" + Math.round(pitch * (n - .5) - SW / 2) + "px;top:" + ROW_SO_Y + "px;width:" + SW + "px;height:" + SH + "px";
      el.innerHTML = '<img src="assets/so' + n + '.png" alt="Số ' + n + '">';
      el.dataset.n = n; soHang.appendChild(el); soEls[n] = el;
      var d = document.createElement("i"); tiendo.appendChild(d);
    }
    do { order = shuffle([1, 2, 3, 4, 5, 6, 7]); } while (order.every(function (v, k) { return v === k + 1; }));
    order.forEach(function (count, slot) {
      var h = homeOf(slot), v = document.createElement("div");
      v.className = "vat"; v.dataset.n = count;
      v.style.cssText = "left:" + h.x + "px;top:" + h.y + "px;width:" + VW + "px;height:" + VH + "px";
      v.innerHTML = '<img src="assets/vat' + count + '.png" alt="Nhóm ' + ten[count] + '">';
      v._home = h; v._done = false;
      vatEls.push(v); vatHang.appendChild(v); attach(v);
    });
  }

  /* ---------- kéo thả ---------- */
  function toStage(e) {
    var r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }
  function slotAt(p) {
    var n, el, x, y;
    for (n = 1; n <= 7; n++) {
      el = soEls[n]; x = el.offsetLeft; y = el.offsetTop;
      if (p.x >= x - 14 && p.x <= x + SW + 14 && p.y >= y - 14 && p.y <= y + SH + 14) return n;
    }
    return 0;
  }
  var hot = 0;
  function highlight(n) {
    if (hot === n) return;
    if (hot && soEls[hot]) soEls[hot].classList.remove("sang");
    hot = n; if (n && soEls[n]) soEls[n].classList.add("sang");
  }
  function attach(v) {
    var off = null, id = null;
    v.addEventListener("pointerdown", function (e) {
      if (v._done || id !== null) return;
      e.preventDefault(); ctx(); sPick();
      id = e.pointerId; v.setPointerCapture(id);
      var p = toStage(e);
      off = { x: p.x - v.offsetLeft, y: p.y - v.offsetTop };
      v.classList.remove("sai"); v.classList.add("keo");
    });
    v.addEventListener("pointermove", function (e) {
      if (e.pointerId !== id) return;
      var p = toStage(e);
      v.style.left = Math.max(0, Math.min(W - VW, p.x - off.x)) + "px";
      v.style.top = Math.max(0, Math.min(H - VH, p.y - off.y)) + "px";
      highlight(slotAt(p));
    });
    function end(e) {
      if (e.pointerId !== id) return;
      var p = toStage(e), n = slotAt(p);
      try { v.releasePointerCapture(id); } catch (x) {}
      id = null; v.classList.remove("keo"); highlight(0);
      if (n && n === +v.dataset.n && !soEls[n]._full) dungRoi(v, n);
      else saiRoi(v, !!n);
    }
    v.addEventListener("pointerup", end);
    v.addEventListener("pointercancel", end);
  }
  function saiRoi(v, vaoSo) {
    if (vaoSo) sSai();
    v.style.left = v._home.x + "px"; v.style.top = v._home.y + "px";
    if (vaoSo) { v.classList.add("sai"); setTimeout(function () { v.classList.remove("sai"); }, 480); }
  }
  function dungRoi(v, n) {
    var s = soEls[n]; s._full = true; v._done = true; v.classList.add("dat");
    var w = Math.round(SW * .80), h = Math.round(w * 515 / 544);
    v.style.width = w + "px"; v.style.height = h + "px";
    v.style.left = Math.round(s.offsetLeft + (SW - w) / 2) + "px";
    v.style.top = Math.round(s.offsetTop + SH * .70 - h / 2) + "px";
    s.classList.remove("dung"); void s.offsetWidth; s.classList.add("dung");
    sOk(); noiKhen(n); sparkle(s.offsetLeft + SW / 2, s.offsetTop + SH * .55);
    tiendo.children[placed].classList.add("xong"); placed++;
    if (placed === 7) setTimeout(chienThang, 900);
  }
  function noiKhen(n) {
    khen.textContent = KHEN[Math.floor(Math.random() * KHEN.length)] + " Có " + n + " " + ten[n];
    khen.classList.remove("hien"); void khen.offsetWidth; khen.classList.add("hien");
  }

  /* ---------- pháo giấy / ngôi sao ---------- */
  var parts = [], raf = 0, pc = phao.getContext("2d");
  phao.width = W; phao.height = H;
  var COLORS = ["#F07A12", "#FFB300", "#E8457A", "#2BA6C9", "#7CB342", "#8E5CC9", "#E8554E"];
  function sparkle(x, y) { burst(x, y, 22, 7, 0.6); }
  function burst(x, y, n, sp, life) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * sp;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: 5 + Math.random() * 7, c: COLORS[i % COLORS.length], l: life || 1, rot: Math.random() * 6 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    pc.clearRect(0, 0, W, H);
    parts = parts.filter(function (p) { return p.l > 0 && p.y < H + 30; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.l -= 0.012; p.rot += 0.15;
      pc.save(); pc.globalAlpha = Math.max(0, Math.min(1, p.l)); pc.translate(p.x, p.y); pc.rotate(p.rot);
      pc.fillStyle = p.c; pc.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); pc.restore();
    });
    raf = parts.length ? requestAnimationFrame(tick) : 0;
  }
  function chienThang() {
    thang.hidden = false; sWin();
    var k = 0, t = setInterval(function () {
      burst(200 + Math.random() * 1200, 120 + Math.random() * 300, 40, 9, 1.6);
      if (++k > 7) clearInterval(t);
    }, 260);
  }
  document.getElementById("choilai").addEventListener("click", function () { ctx(); build(); });

  build();
})();
