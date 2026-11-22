(function () {
  "use strict";

  var M = window.MISSION;
  var app = document.getElementById("app");
  var STORE_KEY = "space-mission:" + M.season;
  var stations = M.stations;
  var total = stations.length;
  var letters = Array.from(M.secretWord);

  /* 암호 글자를 정거장에 자동 배분
     · 글자 수 = 정거장 수 → 정거장마다 한 글자
     · 글자 수 < 정거장 수 → 고르게 띄엄띄엄 (예: 3글자/9곳 → 3·6·9번 정거장)
       나머지 정거장은 ⭐ 별 에너지
     · 글자 수 > 정거장 수 → 한 정거장이 두 글자 이상
     · data.js의 정거장에 piece: "글자"를 직접 적으면 그 설정이 우선 */
  var pieces = stations.map(function () { return ""; });
  var letterAt = [];   // 각 글자가 몇 번째 정거장에서 나오는지
  var manual = stations.some(function (s) { return typeof s.piece === "string"; });
  if (manual) {
    letters = [];
    stations.forEach(function (s, i) {
      pieces[i] = s.piece || "";
      Array.from(pieces[i]).forEach(function (ch) { letters.push(ch); letterAt.push(i); });
    });
  } else {
    letters.forEach(function (ch, j) {
      var k = Math.ceil((j + 1) * total / letters.length) - 1;
      pieces[k] += ch;
      letterAt.push(k);
    });
  }
  var STAR = "⭐";
  var DESK = (M.desk && M.desk.code) || "desk";   // 안내데스크 QR 코드

  /* ---------- 저장 (브라우저에만 저장, 서버 없음) ---------- */
  var memory = null; // 저장소를 못 쓰는 환경에서는 화면이 켜져 있는 동안만 기억
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 사생활 보호 모드 등 */ }
    return memory || { nick: "", solved: {}, tries: {} };
  }
  function save(s) {
    memory = s;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {}
  }
  var state = load();

  /* ---------- 도우미 ---------- */
  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function byCode(code) {
    for (var i = 0; i < total; i++) if (stations[i].code === code) return i;
    return -1;
  }
  function solvedCount() { return Object.keys(state.solved).length; }
  function firstTryCount() {
    var n = 0;
    for (var k in state.solved) if (state.solved[k].first) n++;
    return n;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function setUrl(code) {
    try {
      var url = location.pathname + (code ? "?s=" + encodeURIComponent(code) : "");
      history.replaceState(null, "", url);
    } catch (e) {}
  }
  function top() { window.scrollTo(0, 0); }
  function wordHtml() {
    return '<div class="word" aria-label="비밀 암호">' + letters.map(function (ch, i) {
      var on = state.solved[stations[letterAt[i]].code];
      return '<span class="' + (on ? "on" : "") + '">' + (on ? esc(ch) : "?") + "</span>";
    }).join("") + "</div>";
  }

  /* ---------- 이용 통계 (Umami) ----------
     · GitHub Pages 주소(…github.io)에서만 기록하고, 직원 미리보기·내 컴퓨터 테스트는 빼요.
     · 화면이 바뀔 때마다 '페이지 조회'로, 정거장 통과·완주·카메라 실패는 '이벤트'로 남겨요.
     · 별명 등 개인정보는 보내지 않아요. */
  var STAT_ON = !M.preview && /\.github\.io$/.test(location.hostname);
  var statQueue = [], firstSearch = location.search, firstView = true;
  function statSend(fn) {
    if (!STAT_ON) return;
    if (window.umami && window.umami.track) { try { fn(window.umami); } catch (e) {} }
    else statQueue.push(fn);
  }
  (function flush(n) {                       // 통계 스크립트가 늦게 뜨면 잠시 모아 뒀다 보냄
    if (!STAT_ON) return;
    if (window.umami && window.umami.track) { statQueue.splice(0).forEach(function (fn) { try { fn(window.umami); } catch (e) {} }); return; }
    if (n > 0) setTimeout(function () { flush(n - 1); }, 500);
  })(40);
  function statView(path, title) {
    var url = path;
    if (firstView && firstSearch) url += (path.indexOf("?") < 0 ? "?" : "&") + firstSearch.slice(1);  // 첫 접속의 ?s=desk, ?ref=… 유지
    firstView = false;
    statSend(function (u) { u.track(function (props) { props.url = url; props.title = title; return props; }); });
  }
  function statEvent(name, data) {
    statSend(function (u) { u.track(name, data); });
  }

  /* ---------- 화면: 시작 ---------- */
  function viewStart(nextCode) {
    statView("/start", "시작(별명 입력)");
    setUrl(nextCode);
    app.innerHTML =
      '<section class="stack">' +
        '<div class="hero stack">' +
          '<div class="planet">🪐</div>' +
          '<span class="eyebrow">' + esc(M.place) + "</span>" +
          "<h1>" + esc(M.title) + "</h1>" +
          (M.theme ? '<p class="month">' + M.month + "월의 미션 · " + esc(M.theme) + "</p>" : "") +
          '<p class="muted">전시물 곳곳에 숨은 ' + total + "개의 정거장을 찾아<br>문제를 풀고 비밀 암호를 완성하세요!</p>" +
        "</div>" +
        '<div class="card stack">' +
          "<h3>이렇게 해요</h3>" +
          '<ol class="steps">' +
            "<li><b>1</b><span>전시물 옆 QR 코드를 찍어요</span></li>" +
            "<li><b>2</b><span>전시물을 살펴보고 문제를 풀어요</span></li>" +
            "<li><b>3</b><span>맞히면 암호 조각이나 ⭐ 별 에너지를 얻어요</span></li>" +
            "<li><b>4</b><span>" + total + "개를 모두 모으면 안내데스크에서 수료증을 받아요</span></li>" +
          "</ol>" +
        "</div>" +
        '<form class="card stack" id="nick-form">' +
          '<label for="nick"><h3>탐사대원 이름을 정해 주세요</h3></label>' +
          '<input id="nick" type="text" maxlength="10" autocomplete="off" placeholder="예) 별빛탐험가" value="' + esc(state.nick) + '">' +
          '<p class="muted" style="font-size:14px">별명도 좋아요. 수료증에 들어가요.</p>' +
          '<button class="btn" type="submit">🚀 탐사 시작!</button>' +
        "</form>" +
      "</section>";

    document.getElementById("nick-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = document.getElementById("nick").value.trim();
      if (!v) { document.getElementById("nick").focus(); return; }
      state.nick = v.slice(0, 10);
      statEvent("대원 등록", { month: M.month });
      save(state);
      if (nextCode === DESK) viewWelcome();
      else if (nextCode) viewStation(byCode(nextCode));
      else viewMap();
    });
    top();
  }

  /* ---------- 사이트 안에서 QR 찍기 ----------
     카메라 앱으로 찍으면 새 탭이 열려, 아이폰 비공개 모드 등에서는 기록이 끊겨요.
     이 화면 안에서 찍으면 같은 탭에서 이어지므로 기록이 유지됩니다. */
  var scan = { el: null, stream: null, timer: 0, lastMsg: 0 };
  function scanBtn(label, ghost) {
    return '<button type="button" class="btn' + (ghost ? " ghost" : "") + '" data-scan>📷 ' + esc(label || "다음 정거장 QR 찍기") + "</button>";
  }
  function closeScanner() {
    clearTimeout(scan.timer); scan.timer = 0;
    if (scan.stream) { scan.stream.getTracks().forEach(function (t) { t.stop(); }); scan.stream = null; }
    if (scan.el) { scan.el.remove(); scan.el = null; }
    document.body.style.overflow = "";
  }
  function scanMsg(text, warn) {
    if (!scan.el) return;
    var m = scan.el.querySelector(".scan-msg");
    if (m) { m.textContent = text; m.className = "scan-msg" + (warn ? " warn" : ""); }
  }
  function scanFail(name) {
    statEvent("카메라 사용 불가", { reason: String(name || "Unsupported") });
    if (scan.stream) { scan.stream.getTracks().forEach(function (t) { t.stop(); }); scan.stream = null; }
    clearTimeout(scan.timer);
    if (!scan.el) return;
    var denied = name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError";
    var title, body, how = "";
    if (denied) {
      title = "카메라 권한이 꺼져 있어요";
      body = "카메라를 허용하지 않으면 정거장 QR을 찍을 수 없어 미션을 진행할 수 없어요.";
      how = '<div class="scan-how"><b>카메라를 허용하는 방법</b>' +
        "<p><b>아이폰(사파리)</b> 주소창의 ‘가가’(aA) 버튼 → 웹사이트 설정 → 카메라 → 허용</p>" +
        "<p><b>안드로이드(크롬)</b> 주소창 왼쪽 아이콘 → 권한 → 카메라 허용</p>" +
        "<p>허용한 뒤 아래 ‘다시 시도’를 눌러 주세요.</p></div>";
    } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
      title = "카메라를 찾을 수 없어요";
      body = "카메라가 없는 기기에서는 정거장 QR을 찍을 수 없어 미션을 진행할 수 없어요.";
    } else if (name === "NotReadableError" || name === "TrackStartError") {
      title = "카메라를 열 수 없어요";
      body = "다른 앱이 카메라를 쓰고 있어요. 카메라를 쓰는 앱을 닫고 다시 시도해 주세요. 카메라 없이는 미션을 진행할 수 없어요.";
    } else {
      title = "이 브라우저에서는 카메라를 쓸 수 없어요";
      body = "사파리나 크롬으로 이 페이지를 열어 주세요. 카메라 없이는 정거장 QR을 찍을 수 없어 미션을 진행할 수 없어요.";
    }
    scan.el.querySelector(".scan-body").innerHTML =
      '<div class="scan-fail stack">' +
        '<div class="scan-fail-ic" aria-hidden="true">📵</div>' +
        "<h2>" + title + "</h2>" +
        "<p>" + body + "</p>" + how +
        '<p class="muted" style="font-size:14px">도움이 필요하면 안내데스크 선생님께 말해 주세요.</p>' +
        '<button type="button" class="btn" data-scan-retry>다시 시도</button>' +
        '<button type="button" class="btn ghost" data-scan-close>닫기</button>' +
      "</div>";
  }
  function handleCode(text) {
    var c = "";
    try { c = new URL(text, location.href).searchParams.get("s") || ""; } catch (e) {}
    if (!c) c = String(text || "").trim();
    if (c === DESK) { closeScanner(); viewWelcome(); return true; }
    var i = byCode(c);
    if (i >= 0) {
      if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} }
      closeScanner(); viewStation(i); return true;
    }
    var now = Date.now();
    if (now - scan.lastMsg > 2500) { scan.lastMsg = now; scanMsg("우주체험관 정거장 QR이 아니에요. 노란 QR 카드를 찍어 주세요.", true); }
    return false;
  }
  function scanLoop(video, canvas) {
    if (!scan.el) return;
    if (video.readyState >= 2 && video.videoWidth) {
      var k = Math.min(1, 720 / video.videoWidth);
      var w = Math.round(video.videoWidth * k), h = Math.round(video.videoHeight * k);
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      var img = ctx.getImageData(0, 0, w, h);
      var found = window.jsQR ? window.jsQR(img.data, w, h, { inversionAttempts: "dontInvert" }) : null;
      if (found && found.data && handleCode(found.data)) return;
    }
    scan.timer = setTimeout(function () { scanLoop(video, canvas); }, 150);
  }
  function openScanner() {
    closeScanner();
    var el = document.createElement("div");
    el.className = "scan";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "정거장 QR 찍기");
    el.innerHTML =
      '<div class="scan-top"><b>정거장 QR 찍기</b><button type="button" class="scan-x" data-scan-close aria-label="닫기">✕</button></div>' +
      '<div class="scan-body">' +
        '<div class="scan-view"><video playsinline muted autoplay></video><div class="scan-frame" aria-hidden="true"></div></div>' +
        '<p class="scan-msg">카메라 권한을 물으면 ‘허용’을 눌러 주세요.</p>' +
      "</div>";
    document.body.appendChild(el);
    document.body.style.overflow = "hidden";
    scan.el = el;
    var md = navigator.mediaDevices;
    if (!window.isSecureContext || !md || !md.getUserMedia) { scanFail("Unsupported"); return; }
    md.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(function (stream) {
      if (!scan.el) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      scan.stream = stream;
      var v = el.querySelector("video");
      v.setAttribute("playsinline", ""); v.muted = true; v.srcObject = stream;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      scanMsg("노란 QR 카드를 네모 안에 맞춰 주세요.");
      scanLoop(v, document.createElement("canvas"));
    }).catch(function (err) { scanFail(err && err.name); });
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest("[data-scan]")) openScanner();
    else if (t.closest("[data-scan-retry]")) openScanner();
    else if (t.closest("[data-scan-close]")) closeScanner();
  });
  document.addEventListener("visibilitychange", function () { if (document.hidden && scan.stream) closeScanner(); });

  /* ---------- 화면: 출발 안내 (안내데스크 QR) ---------- */
  function viewWelcome() {
    statView("/welcome", "출발 안내");
    setUrl("");
    var done = solvedCount();
    var all = done >= total;
    var list = stations.map(function (s, i) {
      var ok = state.solved[s.code];
      return '<li class="go-item' + (ok ? " ok" : "") + '">' +
        '<span class="go-ic">' + s.icon + "</span>" +
        '<span class="go-tx"><b>정거장 ' + (i + 1) + "</b> " + esc(s.exhibit) + '<br><small>' + esc(s.zone) + "</small></span>" +
        '<span class="go-ck">' + (ok ? "✓" : "") + "</span>" +
      "</li>";
    }).join("");

    app.innerHTML =
      '<section class="stack">' +
        '<div class="hero stack" style="padding-top:6px">' +
          '<div class="planet">🛰️</div>' +
          '<span class="eyebrow">대원 ' + esc(state.nick) + "</span>" +
          "<h1>" + (all ? "모든 정거장을 통과했어요!" : done ? "다시 만나서 반가워요!" : "탐사 준비 완료!") + "</h1>" +
          (M.theme ? '<p class="month">' + M.month + "월의 미션 · " + esc(M.theme) + "</p>" : "") +
        "</div>" +
        (all ? "" :
        '<div class="card stack">' +
          "<h3>🚪 이제 전시실로 들어가요</h3>" +
          '<ol class="steps">' +
            "<li><b>1</b><span>우주체험관 전시실로 이동해요</span></li>" +
            "<li><b>2</b><span>전시물 옆 <b style=\"all:unset;color:var(--gold)\">노란 QR 카드</b>를 아래 <b style=\"all:unset;color:var(--gold)\">📷 QR 찍기</b> 버튼으로 찍어요</span></li>" +
            "<li><b>3</b><span>" + total + "개 정거장은 어느 곳부터 가도 괜찮아요</span></li>" +
            "<li><b>4</b><span>암호를 다 모으면 이곳 안내데스크로 돌아와요</span></li>" +
          "</ol>" +
        "</div>") +
        '<div class="card stack">' +
          '<div class="progress-head"><h3>찾아야 할 정거장</h3><span class="muted">' + done + " / " + total + "</span></div>" +
          '<ul class="go-list">' + list + "</ul>" +
        "</div>" +
        '<p class="muted center" style="font-size:14px">휴대폰 카메라 앱 대신 이 화면의 버튼으로 찍어야 기록이 이어져요.</p>' +
        (all ? '<button class="btn" id="go-cert">🏅 수료증 받기</button>' : scanBtn("첫 번째 정거장 QR 찍기")) +
        '<button class="btn ghost" id="to-map">미션 지도 보기</button>' +
      "</section>";

    var c = document.getElementById("go-cert");
    if (c) c.addEventListener("click", viewCert);
    document.getElementById("to-map").addEventListener("click", function () { viewMap(); });
    top();
  }

  /* ---------- 화면: 미션 지도 ---------- */
  function viewMap(justGot) {
    statView("/map", "미션 지도");
    setUrl("");
    var done = solvedCount();
    var slots = stations.map(function (s, i) {
      var ok = state.solved[s.code];
      return '<div class="slot' + (ok ? " done" : "") + '">' +
        '<span class="ic">' + s.icon + "</span>" +
        (ok ? '<span class="piece">' + esc(pieces[i] || STAR) + "</span>"
            : "<span>정거장 " + (i + 1) + "</span>") +
      "</div>";
    }).join("");

    var all = done >= total;
    app.innerHTML =
      '<section class="stack">' +
        '<span class="eyebrow">대원 ' + esc(state.nick) + "</span>" +
        "<h2>" + (all ? "모든 조각을 모았어요!" : "미션 지도") + "</h2>" +
        (M.theme ? '<p class="month" style="text-align:left">' + M.month + "월의 미션 · " + esc(M.theme) + "</p>" : "") +
        '<div class="card stack">' +
          '<div class="progress-head"><h3>통과한 정거장</h3><span class="muted">' + done + " / " + total + "</span></div>" +
          '<div class="bar"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' +
          wordHtml() +
        "</div>" +
        '<div class="grid">' + slots + "</div>" +
        (all
          ? '<button class="btn" id="go-cert">🏅 수료증 받기</button>'
          : '<p class="muted center">' +
              (done === 0 ? "전시물 옆 노란 QR 카드를 찾아 아래 버튼으로 찍어 보세요!" : "남은 정거장 " + (total - done) + "곳! 노란 QR 카드를 찾아 찍어 보세요.") +
            "</p>" + scanBtn(done === 0 ? "정거장 QR 찍기" : "다음 정거장 QR 찍기")) +
      "</section>";

    if (all) document.getElementById("go-cert").addEventListener("click", viewCert);
    top();
  }

  /* ---------- 화면: 정거장 문제 ---------- */
  function viewStation(idx) {
    var s = stations[idx];
    statView("/station/" + (idx + 1), "정거장 " + (idx + 1) + " · " + s.exhibit);
    setUrl(s.code);
    var already = state.solved[s.code];

    var head =
      '<div class="st-head">' +
        '<div class="st-icon">' + s.icon + "</div>" +
        "<div>" +
          '<span class="eyebrow">정거장 ' + (idx + 1) + " / " + total + " · " + esc(s.zone) + "</span>" +
          '<h2 style="margin-top:6px">' + esc(s.title) + "</h2>" +
        "</div>" +
      "</div>";

    if (already) {
      app.innerHTML = '<section class="stack">' + head + successHtml(s, idx, true) + "</section>";
      bindSuccess();
      top();
      return;
    }

    var opts = shuffle([s.answer].concat(s.wrong));
    var keys = ["가", "나", "다", "라", "마"];
    app.innerHTML =
      '<section class="stack">' + head +
        '<div class="find"><span>👀</span><span>' + esc(s.find) + "</span></div>" +
        '<div class="card stack">' +
          '<p class="question">' + esc(s.question) + "</p>" +
          '<div class="choices">' + opts.map(function (o, i) {
            return '<button type="button" class="choice" data-v="' + esc(o) + '"><span class="k">' + keys[i] + "</span><span>" + esc(o) + "</span></button>";
          }).join("") + "</div>" +
          '<div id="hint-slot"></div>' +
        "</div>" +
        '<button class="btn ghost" id="to-map">미션 지도 보기</button>' +
      "</section>";

    var tries = state.tries[s.code] || 0;
    Array.prototype.forEach.call(app.querySelectorAll(".choice"), function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-v");
        tries++;
        state.tries[s.code] = tries;
        if (v === s.answer) {
          b.classList.add("right");
          state.solved[s.code] = { first: tries === 1, at: Date.now() };
          statEvent("정거장 통과", { station: idx + 1, month: M.month, firstTry: tries === 1, tries: tries });
          save(state);
          Array.prototype.forEach.call(app.querySelectorAll(".choice"), function (x) { x.disabled = true; });
          setTimeout(function () {
            app.innerHTML = '<section class="stack">' + head + successHtml(s, idx, false) + "</section>";
            bindSuccess();
            top();
          }, 650);
        } else {
          save(state);
          b.classList.add("wrong");
          b.disabled = true;
          document.getElementById("hint-slot").innerHTML =
            '<div class="hint"><b>💡 힌트</b><br>' + esc(s.hint) + "<br><span class=\"muted\" style=\"font-size:14px\">다시 골라 보세요!</span></div>";
        }
      });
    });
    document.getElementById("to-map").addEventListener("click", function () { viewMap(); });
    top();
  }

  function successHtml(s, idx, revisit) {
    var done = solvedCount();
    var all = done >= total;
    return '<div class="card success stack">' +
        '<div class="got">' + esc(pieces[idx] || STAR) + "</div>" +
        "<h2>" + (revisit ? "이미 통과한 정거장이에요" : (pieces[idx] ? "정답이에요! 암호 조각 획득" : "정답이에요! 별 에너지 충전")) + "</h2>" +
        (pieces[idx] ? "" : '<p class="muted">이 정거장에는 암호 조각 대신 별 에너지가 있어요. 다른 정거장에서 조각을 찾아보세요!</p>') +
        '<p class="muted">정답: <b style="color:var(--mint)">' + esc(s.answer) + "</b></p>" +
        '<div class="explain"><b>🔍 알고 있나요?</b><br>' + esc(s.explain) + "</div>" +
        wordHtml() +
        '<p class="muted">' + (all ? "모든 조각을 모았어요!" : "통과한 정거장 " + done + " / " + total) + "</p>" +
      "</div>" +
      (all ? '<button class="btn" id="go-cert">🏅 수료증 받기</button>' : "") +
      (all ? "" : scanBtn("다음 정거장 QR 찍기")) +
      '<button class="btn ghost" id="to-map">미션 지도 보기</button>';
  }
  function bindSuccess() {
    var c = document.getElementById("go-cert");
    if (c) c.addEventListener("click", viewCert);
    document.getElementById("to-map").addEventListener("click", function () { viewMap(); });
  }

  /* ---------- 화면: 수료증 ---------- */
  function viewCert() {
    if (solvedCount() < total) { viewMap(); return; }
    statView("/certificate", "수료증");
    if (!state.completedSent) {
      state.completedSent = true; save(state);
      statEvent("미션 완주", { month: M.month, firstTryCount: firstTryCount() });
    }
    setUrl("");
    var f = firstTryCount();
    var g = f >= M.grades.gold ? ["gold", "🥇", "골드 대원"]
          : f >= M.grades.silver ? ["silver", "🥈", "실버 대원"]
          : ["bronze", "🥉", "브론즈 대원"];
    var d = new Date();
    var date = d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";

    app.innerHTML =
      '<section class="stack">' +
        '<div class="card cert stack">' +
          '<span class="eyebrow">' + esc(M.place) + "</span>" +
          "<h2>우주탐사대원 수료증</h2>" +
          '<div class="medal">' + g[1] + "</div>" +
          '<div class="name">' + esc(state.nick) + "</div>" +
          '<span class="tag ' + g[0] + '">' + g[2] + "</span>" +
          "<p>위 대원은 " + total + "개의 우주 정거장 훈련을 모두 마치고 비밀 암호를 완성하였기에 이 수료증을 드립니다.</p>" +
          '<p class="muted">첫 번째 도전에 맞힌 문제 ' + f + " / " + total + "</p>" +
          '<div class="staff-box stack">' +
            '<p class="muted" style="font-size:14px">안내데스크 선생님께 비밀 암호를 말해 주세요</p>' +
            '<div class="big-word">' + esc(letters.join("")) + "</div>" +
          "</div>" +
          '<p class="muted" style="font-size:14px">' + date + "</p>" +
        "</div>" +
        '<button class="btn ghost" id="to-map">미션 지도 보기</button>' +
      "</section>";
    document.getElementById("to-map").addEventListener("click", function () { viewMap(); });
    top();
  }

  /* ---------- 처음부터 다시 ---------- */
  document.getElementById("foot-place").textContent = M.place;
  if (M.preview) {
    var bar = document.createElement("div");
    bar.className = "preview-bar";
    bar.innerHTML = "👀 직원 미리보기 · " + M.month + '월 세트 <a href="?set=off">미리보기 끝내기</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  document.getElementById("reset-btn").addEventListener("click", function () {
    if (!confirm("모은 암호 조각이 모두 지워져요. 처음부터 다시 할까요?")) return;
    state = { nick: "", solved: {}, tries: {} };
    memory = null;
    try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    viewStart("");
  });

  /* ---------- 시작: 주소의 ?s= 코드로 화면 결정 ---------- */
  var code = "";
  try { code = new URLSearchParams(location.search).get("s") || ""; } catch (e) {}
  var idx = code ? byCode(code) : -1;

  if (code === DESK) { if (!state.nick) viewStart(DESK); else viewWelcome(); }
  else if (!state.nick) viewStart(idx >= 0 ? code : "");
  else if (idx >= 0) viewStation(idx);
  else viewMap();
})();
