(function () {
  "use strict";

  const KEYS = { words: "hangyeol.words.v1", progress: "hangyeol.progress.v1", activity: "hangyeol.activity.v1", theme: "hangyeol.theme" };
  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const daysFromNow = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const safeParse = (value, fallback) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const makeId = (word) => `${word.hanja}|${word.sound}|${word.meaning}`;
  const normalize = (word) => ({
    hanja: String(word.hanja ?? word.한자 ?? "").trim(),
    sound: String(word.sound ?? word.음 ?? "").trim(),
    meaning: String(word.meaning ?? word.뜻 ?? "").trim(),
    word: String(word.word ?? word.한자어 ?? "").trim(),
    wordMeaning: String(word.wordMeaning ?? word.단어뜻 ?? "").trim(),
    lesson: String(word.lesson ?? word.단원 ?? "내 단어").trim() || "내 단어"
  });

  let words = safeParse(localStorage.getItem(KEYS.words), null) || window.DEFAULT_HANJA.map(normalize);
  let progress = safeParse(localStorage.getItem(KEYS.progress), {});
  let activity = safeParse(localStorage.getItem(KEYS.activity), { attempts: 0, correct: 0, dates: [], wrong: {} });
  let studyQueue = [];
  let studyIndex = 0;
  let quizWord = null;
  let quizAnswered = false;
  let quizSession = { attempts: 0, correct: 0 };

  function save() {
    localStorage.setItem(KEYS.words, JSON.stringify(words));
    localStorage.setItem(KEYS.progress, JSON.stringify(progress));
    localStorage.setItem(KEYS.activity, JSON.stringify(activity));
  }

  function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function recordStudyDate() {
    if (!activity.dates.includes(today())) activity.dates.push(today());
    activity.dates = activity.dates.slice(-365);
  }

  function streak() {
    const dates = new Set(activity.dates || []);
    let cursor = new Date();
    if (!dates.has(today())) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function dueWords() {
    return words.filter((word) => !progress[makeId(word)]?.due || progress[makeId(word)].due <= today());
  }

  function updateSummary() {
    $("dueCount").textContent = dueWords().length;
    $("streakCount").textContent = `${streak()}일`;
    $("accuracyCount").textContent = activity.attempts ? `${Math.round(activity.correct / activity.attempts * 100)}%` : "—";
    $("wordCount").textContent = words.length;
    $("todayLabel").textContent = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date());
  }

  function buildStudyQueue() {
    studyQueue = shuffle(dueWords());
    studyIndex = 0;
    renderStudy();
  }

  function renderStudy() {
    const word = studyQueue[studyIndex];
    $("studyCounter").textContent = `${Math.min(studyIndex + 1, studyQueue.length)} / ${studyQueue.length}`;
    $("studyEmpty").hidden = Boolean(word);
    $("flashcard").hidden = !word;
    if (!word) return;
    $("cardHanja").textContent = word.hanja;
    $("cardReading").textContent = `${word.sound} · ${word.meaning}`;
    $("cardWord").textContent = word.word ? `${word.word}${word.wordMeaning ? ` · ${word.wordMeaning}` : ""}` : "예시 단어 없음";
    $("cardLesson").textContent = word.lesson;
    $("cardAnswer").hidden = true;
    $("revealBtn").hidden = false;
    $("ratingButtons").hidden = true;
  }

  function rateCurrent(rating) {
    const word = studyQueue[studyIndex];
    if (!word) return;
    const dayMap = { again: 0, hard: 1, good: 3, easy: 7 };
    const id = makeId(word);
    const prev = progress[id] || { seen: 0, level: 0 };
    progress[id] = { due: daysFromNow(dayMap[rating]), seen: prev.seen + 1, level: Math.max(0, prev.level + (rating === "again" ? -1 : rating === "easy" ? 2 : 1)) };
    recordStudyDate();
    save();
    studyIndex += 1;
    if (rating === "again") studyQueue.push(word);
    renderStudy();
    updateSummary();
  }

  function newQuiz() {
    if (words.length < 2) {
      $("quizHanja").textContent = "—";
      $("quizPrompt").textContent = "퀴즈에는 단어가 2개 이상 필요합니다.";
      $("quizOptions").innerHTML = "";
      return;
    }
    quizAnswered = false;
    quizWord = words[Math.floor(Math.random() * words.length)];
    const distractors = shuffle(words.filter((w) => makeId(w) !== makeId(quizWord))).slice(0, 3);
    const options = shuffle([quizWord, ...distractors]);
    $("quizHanja").textContent = quizWord.hanja;
    $("quizPrompt").textContent = "이 한자의 음과 뜻은?";
    $("quizFeedback").textContent = "";
    $("quizFeedback").className = "feedback";
    $("nextQuizBtn").hidden = true;
    $("quizOptions").innerHTML = "";
    options.forEach((word) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${word.sound} · ${word.meaning}`;
      button.dataset.id = makeId(word);
      button.addEventListener("click", () => answerQuiz(button));
      $("quizOptions").appendChild(button);
    });
  }

  function answerQuiz(button) {
    if (quizAnswered) return;
    quizAnswered = true;
    const correctId = makeId(quizWord);
    const isCorrect = button.dataset.id === correctId;
    [...$("quizOptions").children].forEach((option) => {
      option.disabled = true;
      if (option.dataset.id === correctId) option.classList.add("correct");
    });
    quizSession.attempts += 1;
    activity.attempts += 1;
    if (isCorrect) {
      quizSession.correct += 1;
      activity.correct += 1;
      $("quizFeedback").textContent = "정답입니다!";
      $("quizFeedback").classList.add("right");
    } else {
      button.classList.add("wrong");
      activity.wrong[correctId] = (activity.wrong[correctId] || 0) + 1;
      $("quizFeedback").textContent = `정답: ${quizWord.sound} · ${quizWord.meaning}`;
      $("quizFeedback").classList.add("wrong");
    }
    recordStudyDate();
    save();
    $("quizScore").textContent = `${quizSession.correct} / ${quizSession.attempts}`;
    $("nextQuizBtn").hidden = false;
    updateSummary();
  }

  function renderWrong() {
    const entries = Object.entries(activity.wrong || {}).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1]);
    $("wrongList").innerHTML = "";
    entries.forEach(([id, count]) => {
      const word = words.find((item) => makeId(item) === id);
      if (!word) return;
      const row = document.createElement("article");
      row.className = "word-row";
      row.innerHTML = `<span class="glyph"></span><div><strong></strong><small></small></div><span class="miss-count"></span>`;
      row.querySelector(".glyph").textContent = word.hanja;
      row.querySelector("strong").textContent = `${word.sound} · ${word.meaning}`;
      row.querySelector("small").textContent = word.word ? `${word.word} · ${word.wordMeaning}` : word.lesson;
      row.querySelector(".miss-count").textContent = `${count}회 틀림`;
      $("wrongList").appendChild(row);
    });
    $("reviewEmpty").hidden = $("wrongList").children.length > 0;
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(cell); cell = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell); if (row.some((value) => value.trim())) rows.push(row); row = []; cell = "";
      } else cell += char;
    }
    row.push(cell); if (row.some((value) => value.trim())) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows.shift().map((header) => header.trim().replace(/^\ufeff/, ""));
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
  }

  async function importFile(file) {
    const message = $("dataMessage");
    try {
      const text = await file.text();
      const raw = file.name.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCSV(text);
      const isBackup = !Array.isArray(raw) && Array.isArray(raw.words);
      const list = Array.isArray(raw) ? raw : raw.words;
      if (!Array.isArray(list)) throw new Error("단어 목록을 찾을 수 없습니다.");
      const imported = list.map(normalize).filter((word) => word.hanja && word.sound && word.meaning);
      if (!imported.length) throw new Error("hanja, sound, meaning 열을 확인해 주세요.");
      const mode = document.querySelector('input[name="importMode"]:checked').value;
      if (mode === "merge") {
        const combined = [...words, ...imported];
        words = [...new Map(combined.map((word) => [makeId(word), word])).values()];
        if (isBackup) {
          progress = { ...progress, ...(raw.progress || {}) };
          const incoming = raw.activity || {};
          activity.attempts += Number(incoming.attempts || 0);
          activity.correct += Number(incoming.correct || 0);
          activity.dates = [...new Set([...(activity.dates || []), ...(incoming.dates || [])])];
          Object.entries(incoming.wrong || {}).forEach(([id, count]) => { activity.wrong[id] = Math.max(activity.wrong[id] || 0, Number(count || 0)); });
        }
      } else {
        words = imported;
        progress = isBackup ? (raw.progress || {}) : {};
        activity = isBackup ? (raw.activity || { attempts: 0, correct: 0, dates: [], wrong: {} }) : { ...activity, wrong: {} };
      }
      save();
      buildStudyQueue();
      newQuiz();
      renderWrong();
      updateSummary();
      message.textContent = `${imported.length}개 단어를 불러왔습니다.`;
      $("fileInput").value = "";
    } catch (error) {
      message.textContent = `불러오지 못했습니다: ${error.message}`;
    }
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportBackup() {
    download(`hangyeol-backup-${today()}.json`, JSON.stringify({ words, progress, activity, exportedAt: new Date().toISOString() }, null, 2), "application/json");
    $("dataMessage").textContent = "단어와 학습 기록을 백업했습니다.";
  }

  function switchView(name) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}View`));
    if (name === "review") renderWrong();
    history.replaceState(null, "", `#${name}`);
  }

  document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchView(tab.dataset.view)));
  $("revealBtn").addEventListener("click", () => { $("cardAnswer").hidden = false; $("revealBtn").hidden = true; $("ratingButtons").hidden = false; });
  $("ratingButtons").addEventListener("click", (event) => { const rating = event.target.closest("button")?.dataset.rating; if (rating) rateCurrent(rating); });
  $("nextQuizBtn").addEventListener("click", newQuiz);
  $("fileInput").addEventListener("change", (event) => { if (event.target.files[0]) importFile(event.target.files[0]); });
  $("exportBtn").addEventListener("click", exportBackup);
  $("clearWrongBtn").addEventListener("click", () => { activity.wrong = {}; save(); renderWrong(); });
  $("resetBtn").addEventListener("click", () => {
    if (!confirm("불러온 단어와 모든 학습 기록을 지울까요?")) return;
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    location.reload();
  });
  $("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(KEYS.theme, document.body.classList.contains("dark") ? "dark" : "light");
  });

  if (localStorage.getItem(KEYS.theme) === "dark") document.body.classList.add("dark");
  const initialView = ["study", "quiz", "review", "data"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "study";
  switchView(initialView);
  buildStudyQueue();
  newQuiz();
  renderWrong();
  updateSummary();
})();
