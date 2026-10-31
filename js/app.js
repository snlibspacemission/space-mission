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

  /* ---------- 화면: 시작 ---------- */
  function viewStart(nextCode) {
    setUrl(nextCode);
    app.innerHTML =
      '<section class="stack">' +
        '<div class="hero stack">' +
          '<div class="planet">🪐</div>' +
          '<span class="eyebrow">' + esc(M.place) + "</span>" +
          "<h1>" + esc(M.title) + "</h1>" +
          '<p class="muted">전시물 곳곳에 숨은 ' + total + "개의 정거장을 찾아<br>문제를 풀고 비밀 암호를 완성하세요!</p>" +
        "</div>" +
        '<div class="card stack">' +
          "<h3>이렇게 해요</h3>" +
          '<ol class="steps">' +
            "<li><b>1</b><span>전시물 옆 QR 코드를 찍어요</span></li>" +
            "<li><b>2</b><span>전시물을 살펴보고 문제를 풀어요</span></li>" +
            "<li><b>3</b><span>맞히면 암호 조각을 하나 얻어요</span></li>" +
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
      save(state);
      if (nextCode) viewStation(byCode(nextCode)); else viewMap();
    });
    top();
  }

  /* ---------- 화면: 미션 지도 ---------- */
  function viewMap(justGot) {
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
        '<div class="card stack">' +
          '<div class="progress-head"><h3>통과한 정거장</h3><span class="muted">' + done + " / " + total + "</span></div>" +
          '<div class="bar"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' +
          wordHtml() +
        "</div>" +
        '<div class="grid">' + slots + "</div>" +
        (all
          ? '<button class="btn" id="go-cert">🏅 수료증 받기</button>'
          : '<div class="card center muted">' +
              (done === 0 ? "전시물 옆 QR 코드를 찾아 찍어 보세요!" : "남은 정거장 " + (total - done) + "곳! 노란 QR 코드를 찾아 찍어 보세요.") +
            "</div>") +
      "</section>";

    if (all) document.getElementById("go-cert").addEventListener("click", viewCert);
    top();
  }

  /* ---------- 화면: 정거장 문제 ---------- */
  function viewStation(idx) {
    var s = stations[idx];
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
        '<p class="muted">' + (all ? "모든 조각을 모았어요!" : "모은 조각 " + done + " / " + total) + "</p>" +
      "</div>" +
      (all ? '<button class="btn" id="go-cert">🏅 수료증 받기</button>' : "") +
      '<button class="btn ' + (all ? "ghost" : "") + '" id="to-map">' + (all ? "미션 지도 보기" : "다음 정거장 찾으러 가기") + "</button>";
  }
  function bindSuccess() {
    var c = document.getElementById("go-cert");
    if (c) c.addEventListener("click", viewCert);
    document.getElementById("to-map").addEventListener("click", function () { viewMap(); });
  }

  /* ---------- 화면: 수료증 ---------- */
  function viewCert() {
    if (solvedCount() < total) { viewMap(); return; }
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

  if (!state.nick) viewStart(idx >= 0 ? code : "");
  else if (idx >= 0) viewStation(idx);
  else viewMap();
})();
