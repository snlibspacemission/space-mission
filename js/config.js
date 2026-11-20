/* =========================================================
   우주체험관 미션 · 고정 설정
   ---------------------------------------------------------
   여기 있는 정거장 코드는 QR 코드에 들어가요.
   code를 바꾸면 QR을 다시 인쇄해야 하니 되도록 그대로 두세요.

   set : 어떤 달의 문제를 쓸지
         "auto" → 오늘 날짜의 달(11월이면 js/sets/data11.js)을 자동으로 사용
         3      → 날짜와 상관없이 data3.js를 계속 사용
   ========================================================= */
window.MISSION_CONFIG = {
  title: "우주 암호를 찾아라!",
  place: "중원어린이도서관 우주체험관",
  set: "auto",
  grades: { gold: 9, silver: 6 },   // 첫 시도에 맞힌 개수 기준

  // 안내데스크 QR: 별명을 등록하고 전시실로 안내하는 출발용 QR (문제 없음)
  desk: { code: "desk", icon: "🛰️", label: "안내데스크", title: "탐사대원 등록하고 출발!" },

  // 정거장 순서 = 월별 파일의 questions 순서
  stations: [
    { code: "tel7k",  icon: "🔭", zone: "T-SPACE1 달",           exhibit: "우주망원경으로 천체를 관측하자!" },
    { code: "sky2m",  icon: "✨", zone: "T-SPACE1 달",           exhibit: "별을 따라 하늘의 지도를 완성하자!" },
    { code: "moon5p", icon: "🌗", zone: "T-SPACE1 달",           exhibit: "누가 달을 베어 물었을까요?" },
    { code: "rab8x",  icon: "🐰", zone: "T-SPACE1 달",           exhibit: "달은 왜 항상 한쪽 얼굴만 보여주나요?" },
    { code: "pol3n",  icon: "🧭", zone: "T-SPACE1 달",           exhibit: "밤하늘 북극성을 어떻게 찾을까요?" },
    { code: "ship9d", icon: "🚀", zone: "브릿지 우주선",          exhibit: "달에서 출발, 태양계를 살펴라!" },
    { code: "com4t",  icon: "☄️", zone: "T-SPACE2 태양계",        exhibit: "태양계 탐험 구역" },
    { code: "bh6w",   icon: "🕳️", zone: "T-SPACE3 우리은하를 넘어", exhibit: "우리은하를 넘어 구역" },
    { code: "wc1z",   icon: "🚽", zone: "통로1·2",               exhibit: "우주인의 생활과 귀환 구역" }
  ]
};
