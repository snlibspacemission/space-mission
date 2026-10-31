/* 이번 달 문제 세트를 골라 불러온 뒤 미션을 시작합니다.
   직원 미리보기: 주소 끝에 ?set=5 를 붙이면 5월 세트를 미리 볼 수 있어요.
   (미리보기는 그 브라우저 탭을 닫을 때까지 유지되고, 기록도 따로 저장됩니다) */
(function () {
  "use strict";
  var C = window.MISSION_CONFIG;
  var app = document.getElementById("app");
  var PREVIEW_KEY = "space-mission:preview-set";

  function valid(n) { n = Number(n); return n >= 1 && n <= 12 && Math.floor(n) === n ? n : 0; }
  function fail(msg) {
    app.innerHTML = '<div class="card stack"><h2>미션을 불러오지 못했어요</h2><p class="muted">' + msg + "</p></div>";
  }

  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }

  var preview = 0;
  var fromUrl = valid(params.get("set"));
  try {
    if (params.get("set") === "off") sessionStorage.removeItem(PREVIEW_KEY);
    else if (fromUrl) sessionStorage.setItem(PREVIEW_KEY, String(fromUrl));
    preview = valid(sessionStorage.getItem(PREVIEW_KEY));
  } catch (e) { preview = fromUrl; }

  var now = new Date();
  var n = preview || (C.set === "auto" ? now.getMonth() + 1 : valid(C.set));
  if (!n) { fail("config.js의 set 값을 확인해 주세요. \"auto\" 또는 1~12 사이 숫자여야 해요."); return; }

  var s = document.createElement("script");
  s.src = "js/sets/data" + n + ".js";
  s.onerror = function () { fail("js/sets/data" + n + ".js 파일이 없어요."); };
  s.onload = function () {
    var S = window.MISSION_SET;
    if (!S || !S.questions || S.questions.length !== C.stations.length) {
      fail("data" + n + ".js의 문제 수가 정거장 수(" + C.stations.length + ")와 달라요.");
      return;
    }
    var ym = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    window.MISSION = {
      title: C.title,
      place: C.place,
      grades: C.grades,
      desk: C.desk,
      month: n,
      theme: S.theme || "",
      secretWord: S.secretWord,
      preview: !!preview,
      // 기록은 '운영하는 달 + 세트'마다 따로 저장 → 달이 바뀌면 자동으로 새로 시작
      season: preview ? "preview-" + n : ym + "-set" + n,
      stations: C.stations.map(function (st, i) {
        var q = S.questions[i];
        var merged = { title: st.exhibit };
        [st, q].forEach(function (o) { for (var k in o) merged[k] = o[k]; });
        return merged;
      })
    };
    var a = document.createElement("script");
    a.src = "js/app.js";
    document.body.appendChild(a);
  };
  document.body.appendChild(s);
})();
