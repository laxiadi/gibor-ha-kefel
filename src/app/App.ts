import { sounds } from "../audio/sound";
import { DIFFICULTIES, DIFFICULTY_LABELS, SNACKS, SUITS } from "../config/game";
import { WORLDS, getStage } from "../config/worlds";
import {
  computeStars,
  createSession,
  finishStage,
  isStageUnlocked,
  makeQuestion,
  mastery,
  recordFact,
  speedScore,
  weakFactKeys,
} from "../game/engine";
import { heroSvg, worldBackground } from "../render/art";
import { clearSave, exportSave, importSave, isStorageBlocked, loadState, saveState } from "../state/store";
import type { GameState, Operation, Session, Suit, World } from "../state/types";

type Screen = "home" | "map" | "play" | "wardrobe" | "mastery" | "stats" | "tutorial" | "result";

interface Result {
  stars: number;
  score: number;
  silk: number;
  passed: boolean;
  mission: string;
  stageId?: string;
  misses: string[];
  suitUnlocked?: Suit;
}

const escapeHtml = (value: unknown): string =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);

export class App {
  private state: GameState = loadState();
  private screen: Screen = "home";
  private session: Session | null = null;
  private result: Result | null = null;
  private worldIndex = 0;
  private numpadValue = "";
  private feedback = "";
  private feedbackGood = false;

  constructor(private readonly root: HTMLElement) {
    sounds.muted = this.state.settings.mute;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) this.state.settings.reduceMotion = true;
    const last = this.state.lastStageId ? getStage(this.state.lastStageId) : undefined;
    if (last) this.worldIndex = Math.max(0, WORLDS.findIndex((world) => world.id === last.worldId));
    this.root.addEventListener("click", (event) => this.handleClick(event));
    window.addEventListener("keydown", (event) => this.handleKey(event));
    document.addEventListener("visibilitychange", () => this.updateTimer());
    this.render();
  }

  private persist(): void {
    saveState(this.state);
  }

  private go(screen: Screen): void {
    this.clearTimer();
    this.screen = screen;
    this.feedback = "";
    this.render();
  }

  private render(): void {
    document.documentElement.classList.toggle("reduce-motion", this.state.settings.reduceMotion);
    this.root.innerHTML = this.view();
    this.root.dataset.booted = "1";
    if (this.screen === "play") this.startTimer();
    if (!this.state.nameAsked) this.openNameDialog();
  }

  private view(): string {
    switch (this.screen) {
      case "map": return this.viewMap();
      case "play": return this.viewPlay();
      case "wardrobe": return this.viewWardrobe();
      case "mastery": return this.viewMastery();
      case "stats": return this.viewStats();
      case "tutorial": return this.viewTutorial();
      case "result": return this.viewResult();
      default: return this.viewHome();
    }
  }

  private shell(content: string, world: World = WORLDS[this.worldIndex] ?? WORLDS[0]!): string {
    return `<main class="screen theme-${world.theme}">
      <div class="scene">${worldBackground(world.theme)}</div>
      <div class="atmosphere" aria-hidden="true"></div>
      <div class="comic-texture" aria-hidden="true"></div>
      <div class="floating-particles" aria-hidden="true">${Array.from({ length: 12 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div>
      ${content}
    </main>`;
  }

  private viewHome(): string {
    const totalStars = Object.values(this.state.worldProgress).reduce((sum, value) => sum + value.stars, 0);
    const practicedFacts = Object.keys(this.state.facts).length;
    const goldFacts = Object.keys(this.state.facts).filter((key) => mastery(this.state, key) === "gold").length;
    const masteryPercent = practicedFacts ? Math.round(goldFacts / 144 * 100) : 0;
    const recommended = WORLDS.flatMap((world) => world.stages).find((stage) => isStageUnlocked(this.state, stage.id) && !this.state.worldProgress[stage.id]?.cleared);
    const resume = this.state.lastStageId && isStageUnlocked(this.state, this.state.lastStageId)
      ? `<button class="btn btn-primary mission-cta" data-action="resume"><span>המשך משימה</span><small>${getStage(this.state.lastStageId)?.name ?? ""}</small></button>`
      : `<button class="btn btn-primary mission-cta" data-action="map"><span>המשימה הבאה</span><small>${recommended?.name ?? "למפת העולמות"}</small></button>`;
    return this.shell(`
      <header class="topbar">
        <div class="chips">
          <span class="chip"><b>🕸️</b><span>${this.state.silk}</span><small>קורים</small></span>
          <span class="chip"><b>⭐</b><span>${totalStars}</span><small>כוכבים</small></span>
          <span class="chip"><b>⚡</b><span>${masteryPercent}%</span><small>כוח</small></span>
        </div>
        <button class="icon-button sound-control ${this.state.settings.mute ? "muted" : ""}" data-action="mute" aria-label="${this.state.settings.mute ? "הפעל מוזיקה וצלילים" : "השתק מוזיקה וצלילים"}">
          <span>${this.state.settings.mute ? "🔇" : "♫"}</span><i></i><i></i><i></i>
        </button>
      </header>
      <section class="home-hero">
        <div class="title-lockup">
          <div class="brand-kicker"><span></span> הרפתקת החשבון של ספיידרמן <span></span></div>
          <h1><span>ספייר</span> תיתוי</h1>
          <p class="hero-subtitle">מתקדמים. מתחזקים. מצילים את העיר.</p>
          <div class="welcome-card">
            <span class="avatar-dot">🕷️</span>
            <div><small>הגיבור התורן</small><strong>${escapeHtml(this.state.playerName || "גיבור")}</strong></div>
            <div class="rank"><small>דרגה</small><strong>${Math.max(1, Math.floor(totalStars / 8) + 1)}</strong></div>
          </div>
          <div class="home-mission">
            <div><span class="pulse-dot"></span><small>מומלץ עכשיו</small><strong>${recommended?.name ?? "תרגול ראשון"}</strong></div>
            ${resume}
          </div>
        </div>
        <div class="hero-wrap">
          <div class="hero-badge">7 עולמות<br><strong>46</strong> משימות</div>
          <div class="hero-speed-lines" aria-hidden="true"></div>
          ${heroSvg(this.state.activeSuit, "idle")}
          <div class="hero-platform"><span></span></div>
        </div>
      </section>
      ${isStorageBlocked() ? '<p class="alert" role="status">השמירה חסומה במכשיר הזה. ההתקדמות תישמר רק עד סגירת הלשונית.</p>' : ""}
      <section class="control-deck">
      <div class="difficulty" aria-label="רמת קושי">
        <span class="control-label">רמת משימה</span>
        ${(["easy", "medium", "hard"] as const).map((difficulty) => `<button class="pill ${this.state.settings.difficulty === difficulty ? "active" : ""}" data-action="difficulty" data-value="${difficulty}">${DIFFICULTY_LABELS[difficulty]}</button>`).join("")}
      </div>
      <p class="healthy-note">משימה אחת נמשכת 3–5 דקות. גם סיבוב קצר מחזק את המוח.</p>
      </section>
      <section class="menu-grid">
        <button class="btn nav-card map-card" data-action="map"><b>🗺️</b><span>מפת העולמות</span><small>הסיפור הראשי</small></button>
        <button class="btn nav-card power-card" data-action="weak"><b>🎯</b><span>אימון חכם</span><small>בדיוק מה שצריך לחזק</small></button>
        <button class="btn nav-card city-card" data-action="city"><b>⚡</b><span>אתגר העיר</span><small>50 שניות של אקשן</small></button>
        <button class="btn nav-card suit-card-home" data-action="wardrobe"><b>🕷️</b><span>ארון החליפות</span><small>${this.state.unlockedSuits.length}/4 נפתחו</small></button>
        <button class="btn nav-card" data-action="practice"><b>×÷</b><span>תרגול מעורב</span><small>כפל וחילוק</small></button>
        <button class="btn nav-card" data-action="mastery"><b>🏆</b><span>מפת השליטה</span><small>${goldFacts}/144 עובדות חזקות</small></button>
        <button class="btn nav-card secondary-nav" data-action="stats"><span>סטטיסטיקה ושמירה</span></button>
        <button class="btn nav-card secondary-nav" data-action="tutorial"><span>איך משחקים?</span></button>
      </section>
      <section class="settings">
        <button class="pill" data-action="practice-mul">כפל בלבד</button>
        <button class="pill" data-action="practice-div">חילוק בלבד</button>
        <button class="pill ${this.state.settings.answerMode === "numpad" ? "active" : ""}" data-action="answer-mode" data-value="numpad">הקלדת תשובה</button>
        <button class="pill ${this.state.settings.answerMode === "choices" ? "active" : ""}" data-action="answer-mode" data-value="choices">בחירה מרובה</button>
        <button class="pill ${this.state.settings.slowMode ? "active" : ""}" data-action="slow">מצב רגוע</button>
        <button class="pill ${this.state.settings.reduceMotion ? "active" : ""}" data-action="motion">פחות תנועה</button>
      </section>
    `);
  }

  private viewMap(): string {
    const world = WORLDS[this.worldIndex]!;
    const unlocked = isStageUnlocked(this.state, world.stages[0]!.id);
    return this.shell(`
      <header class="screen-header">
        <button class="back" data-action="home">חזרה</button>
        <div><p class="eyebrow">עולם ${this.worldIndex + 1} מתוך ${WORLDS.length}</p><h1>${world.name}</h1><p>${world.subtitle}</p></div>
        <span class="world-count">${world.stages.length} משימות</span>
      </header>
      <nav class="world-nav" aria-label="בחירת עולם">
        ${WORLDS.map((item, index) => {
          const open = isStageUnlocked(this.state, item.stages[0]!.id);
          return `<button class="world-tab ${index === this.worldIndex ? "active" : ""}" data-action="world" data-value="${index}" ${open ? "" : "disabled"} aria-label="${item.name}, ${open ? "פתוח" : "נעול"}">${open ? index + 1 : "🔒"}</button>`;
        }).join("")}
      </nav>
      ${unlocked ? `<section class="stage-path">
        ${world.stages.map((stage, index) => {
          const open = isStageUnlocked(this.state, stage.id);
          const progress = this.state.worldProgress[stage.id];
          return `<button class="stage-node ${stage.boss ? "boss" : ""} ${progress?.cleared ? "cleared" : ""}" data-action="stage" data-value="${stage.id}" ${open ? "" : "disabled"} aria-label="${stage.name}, ${progress?.stars ?? 0} כוכבים, ${open ? "פתוח" : "נעול"}">
            <span class="stage-number">${stage.boss ? "BOSS" : index + 1}</span>
            <strong>${stage.name}</strong>
            <span class="stage-stars">${progress?.stars ? "★".repeat(progress.stars) + "☆".repeat(3 - progress.stars) : "☆☆☆"}</span>
            <small>${stage.operation === "mul" ? "כפל" : stage.operation === "div" ? "חילוק" : "מעורב"} · ${stage.questions} שאלות</small>
          </button>`;
        }).join('<span class="path-line" aria-hidden="true"></span>')}
      </section>` : '<p class="locked-message">העולם נעול. סיימו את הבוס בעולם הקודם.</p>'}
    `, world);
  }

  private viewPlay(): string {
    const session = this.session;
    if (!session) return this.shell('<button class="btn" data-action="home">חזרה</button>');
    const q = session.question;
    const secondsLeft = this.secondsLeft();
    const progress = Math.round((session.index / session.total) * 100);
    const hint = session.attempts > 0 ? `<p class="hint">רמז: ${q.operation === "mul" ? `${q.a} קבוצות של ${q.b}` : `איזה מספר כפול ${q.b} שווה ${q.a * q.b}?`}</p>` : "";
    return this.shell(`
      <header class="play-hud">
        <div class="hearts" aria-label="${session.hearts} לבבות">${"❤".repeat(Math.max(0, session.hearts))}<span>${"❤".repeat(Math.max(0, session.maxHearts - session.hearts))}</span></div>
        <span>🔥 ${session.streak}</span><span>⭐ ${session.score}</span><span>🕸️ +${session.silk}</span>
      </header>
      <div class="timer ${secondsLeft <= 3 ? "danger" : ""}" role="timer" aria-live="polite">
        <i style="width:${Math.max(0, secondsLeft / session.seconds * 100)}%"></i><span>${secondsLeft} שנ׳</span>
      </div>
      <section class="question-card">
        <p class="progress-label">${session.index + 1} / ${session.total}</p>
        <h1 dir="ltr">${q.prompt}</h1>
        <div class="round-progress"><i style="width:${progress}%"></i></div>
        ${hint}
      </section>
      <div id="feedback" class="feedback ${this.feedbackGood ? "good" : "bad"}" role="status" aria-live="polite">${this.feedback}</div>
      ${this.state.settings.answerMode === "choices" ? this.viewChoices() : this.viewNumpad()}
      <section class="snack-bar" aria-label="חטיפים">
        ${SNACKS.map((snack) => `<button data-action="snack" data-value="${snack.id}" ${(this.state.pantry[snack.id] ?? 0) <= 0 || session.snackUses >= session.maxSnackUses ? "disabled" : ""} aria-label="${snack.name}: ${snack.description}">
          <span>${snack.glyph}</span><small>×${this.state.pantry[snack.id] ?? 0}</small>
        </button>`).join("")}
      </section>
      <button class="back quit" data-action="quit">יציאה מהמשימה</button>
    `);
  }

  private viewNumpad(): string {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
    return `<section class="answer-area">
      <div class="answer-display" aria-live="polite">${this.numpadValue || "—"}</div>
      <div class="numpad">${keys.map((key) => `<button data-action="${key === "⌫" ? "delete" : key === "✓" ? "submit" : "digit"}" data-value="${key}" aria-label="${key === "⌫" ? "מחיקה" : key === "✓" ? "אישור" : key}">${key}</button>`).join("")}</div>
    </section>`;
  }

  private viewChoices(): string {
    return `<section class="choices">${this.session!.question.choices.map((choice) => `<button data-action="choice" data-value="${choice}" aria-label="תשובה ${choice}">${choice}</button>`).join("")}</section>`;
  }

  private viewWardrobe(): string {
    return this.shell(`
      <header class="screen-header"><button class="back" data-action="home">חזרה</button><div><p class="eyebrow">🕸️ ${this.state.silk}</p><h1>ארון החליפות</h1><p>החליפו מראה וקבלו תגובות ואפקטים חדשים.</p></div></header>
      <section class="wardrobe-preview">${heroSvg(this.state.activeSuit, "victory")}</section>
      <section class="suit-grid">${SUITS.map((suit) => {
        const unlocked = this.state.unlockedSuits.includes(suit.id);
        const canBuy = !unlocked && suit.cost > 0 && this.state.silk >= suit.cost;
        return `<article class="suit-card ${this.state.activeSuit === suit.id ? "active" : ""}">
          <div class="mini-hero">${heroSvg(suit.id)}</div>
          <h2>${suit.name}</h2><p>${suit.description}</p>
          ${unlocked
            ? `<button class="btn" data-action="equip-suit" data-value="${suit.id}">${this.state.activeSuit === suit.id ? "לבוש עכשיו" : "לבש"}</button>`
            : suit.id === "venom"
              ? '<span class="locked-label">🔒 הביסו את ונום</span>'
              : `<button class="btn" data-action="buy-suit" data-value="${suit.id}" ${canBuy ? "" : "disabled"}>קנה ב־${suit.cost} קורים</button>`}
        </article>`;
      }).join("")}</section>
    `);
  }

  private viewMastery(): string {
    const cells: string[] = [];
    for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) {
      const key = `${a}×${b}`;
      const tier = mastery(this.state, key);
      const tierLabel = tier === "gold" ? "שולט" : tier === "silver" ? "כמעט" : tier === "bronze" ? "צריך אימון" : "חדש";
      cells.push(`<button class="mastery-cell ${tier}" data-action="fact-practice" data-value="${key}" title="${key}" aria-label="${key}, ${tierLabel}">${a}<small>×${b}</small></button>`);
    }
    return this.shell(`
      <header class="screen-header"><button class="back" data-action="home">חזרה</button><div><h1>מפת השליטה</h1><p>לחצו על עובדה כדי לתרגל אותה.</p></div></header>
      <div class="mastery-scroll"><section class="mastery-grid">${cells.join("")}</section></div>
      <div class="legend"><span class="new">חדש</span><span class="bronze">צריך אימון</span><span class="silver">כמעט</span><span class="gold">שולט!</span></div>
    `);
  }

  private viewStats(): string {
    const weak = weakFactKeys(this.state, 12);
    const seen = Object.values(this.state.facts).reduce((sum, item) => sum + item.seen, 0);
    const correct = Object.values(this.state.facts).reduce((sum, item) => sum + item.correct, 0);
    return this.shell(`
      <header class="screen-header"><button class="back" data-action="home">חזרה</button><div><h1>סטטיסטיקה ושמירה</h1><p>כל הנתונים נשמרים במכשיר.</p></div></header>
      <section class="stats-grid">
        <article><strong>${seen}</strong><span>שאלות שנענו</span></article>
        <article><strong>${seen ? Math.round(correct / seen * 100) : 0}%</strong><span>דיוק כללי</span></article>
        <article><strong>${this.state.lifetimeSilk}</strong><span>קורים שנאספו</span></article>
        <article><strong>${this.state.highScores.overall}</strong><span>שיא ניקוד</span></article>
      </section>
      <section class="panel"><h2>כדאי לתרגל</h2><div class="fact-list">${weak.length ? weak.map((key) => `<button data-action="fact-practice" data-value="${key}">${key}</button>`).join("") : "<p>שחקו כמה סיבובים ונמצא מה לחזק.</p>"}</div></section>
      <section class="panel save-tools"><h2>גיבוי ההתקדמות</h2>
        <button class="btn" data-action="export">העתק קוד גיבוי</button>
        <button class="btn" data-action="import">ייבא קוד גיבוי</button>
        <button class="btn danger" data-action="reset">איפוס מלא</button>
      </section>
    `);
  }

  private viewTutorial(): string {
    return this.shell(`
      <header class="screen-header"><button class="back" data-action="home">חזרה</button><div><h1>איך משחקים?</h1></div></header>
      <section class="tutorial-grid">
        <article><b>1</b><h2>פותרים מהר ומדויק</h2><p>הקלידו תשובה או בחרו מתוך ארבע אפשרויות. רצף תשובות מגדיל את הניקוד.</p></article>
        <article><b>2</b><h2>מתקדמים בין עולמות</h2><p>צריך שני כוכבים כדי לפתוח את המשימה הבאה. בכל עולם מחכה בוס.</p></article>
        <article><b>3</b><h2>משתמשים בכוחות</h2><p>חטיפים מוסיפים זמן, לב או רמז. השימוש מוגבל בכל משימה.</p></article>
        <article><b>4</b><h2>פותחים חליפות</h2><p>אספו קורים, רכשו חליפות והביסו את ונום כדי להשיג את הסימביוט.</p></article>
      </section>
      <button class="btn btn-primary" data-action="map">יוצאים למשימה</button>
    `);
  }

  private viewResult(): string {
    const result = this.result;
    if (!result) return this.viewHome();
    const breakSuggested = this.state.roundsCompleted > 0 && this.state.roundsCompleted % 3 === 0;
    const accuracyMessage = result.stars === 3
      ? "שליטה מעולה — המהירות והדיוק מתחזקים!"
      : result.stars === 2
        ? "עבודה מצוינת — עוד סיבוב אחד יכול להביא כוכב שלישי."
        : "כל ניסיון מלמד את המוח. העובדות החלשות כבר נכנסו לאימון החכם.";
    return this.shell(`
      <section class="result-card">
        <p class="eyebrow">${result.passed ? "העיר בטוחה" : "המשימה ממשיכה"}</p>
        <div class="result-stars">${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)}</div>
        <div class="result-hero">${heroSvg(this.state.activeSuit, result.passed ? "victory" : "hurt")}</div>
        <h1>${result.passed ? "משימה הושלמה!" : "עוד ניסיון אחד!"}</h1>
        <p class="growth-message">${accuracyMessage}</p>
        <div class="result-metrics"><span><b>${result.score}</b><small>ניקוד</small></span><span><b>+${result.silk}</b><small>קורים</small></span><span><b>${result.misses.length}</b><small>לחיזוק</small></span></div>
        ${result.suitUnlocked ? `<p class="unlock-banner">נפתחה חליפה חדשה: ${SUITS.find((suit) => suit.id === result.suitUnlocked)?.name}</p>` : ""}
        ${result.misses.length ? `<div class="missed"><h2>כדאי לחזור על:</h2>${[...new Set(result.misses)].map((key) => `<button data-action="fact-practice" data-value="${key}">${key}</button>`).join("")}</div>` : ""}
        ${breakSuggested ? '<p class="break-card"><b>זמן גיבור!</b> השלמת 3 משימות. זה רגע מצוין למתוח ידיים ולנוח כמה דקות.</p>' : ""}
        <div class="result-actions">
          <button class="btn btn-primary" data-action="again">שוב</button>
          <button class="btn" data-action="map">למפה</button>
          <button class="btn" data-action="home">לעיר</button>
        </div>
      </section>
    `);
  }

  private handleClick(event: Event): void {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!button || button.hasAttribute("disabled")) return;
    const action = button.dataset.action!;
    const value = button.dataset.value ?? "";
    sounds.startMusic();
    sounds.play("click");
    switch (action) {
      case "home": this.go("home"); break;
      case "map": this.go("map"); break;
      case "world": this.worldIndex = Number(value); this.render(); break;
      case "stage": this.startStage(value); break;
      case "resume": if (this.state.lastStageId) this.startStage(this.state.lastStageId); break;
      case "practice": this.startPractice("mixed"); break;
      case "practice-mul": this.startPractice("mul"); break;
      case "practice-div": this.startPractice("div"); break;
      case "city": this.startCityChallenge(); break;
      case "weak": this.startWeakPractice(); break;
      case "fact-practice": this.startFactPractice(value); break;
      case "wardrobe": this.go("wardrobe"); break;
      case "mastery": this.go("mastery"); break;
      case "stats": this.go("stats"); break;
      case "tutorial": this.go("tutorial"); break;
      case "difficulty": this.state.settings.difficulty = value as GameState["settings"]["difficulty"]; this.persist(); this.render(); break;
      case "answer-mode": this.state.settings.answerMode = value as GameState["settings"]["answerMode"]; this.persist(); this.render(); break;
      case "slow": this.state.settings.slowMode = !this.state.settings.slowMode; this.persist(); this.render(); break;
      case "motion": this.state.settings.reduceMotion = !this.state.settings.reduceMotion; this.persist(); this.render(); break;
      case "mute":
        this.state.settings.mute = !this.state.settings.mute;
        sounds.muted = this.state.settings.mute;
        if (!this.state.settings.mute) sounds.startMusic();
        this.persist();
        this.render();
        break;
      case "digit": if (this.numpadValue.length < 3) { this.numpadValue += value; this.updateDisplay(); } break;
      case "delete": this.numpadValue = this.numpadValue.slice(0, -1); this.updateDisplay(); break;
      case "submit": if (this.numpadValue) this.answer(Number(this.numpadValue)); break;
      case "choice": this.answer(Number(value)); break;
      case "snack": this.useSnack(value); break;
      case "quit": this.session = null; this.go("map"); break;
      case "equip-suit": this.equipSuit(value as Suit); break;
      case "buy-suit": this.buySuit(value as Suit); break;
      case "again": this.restartLast(); break;
      case "export": void navigator.clipboard?.writeText(exportSave(this.state)).then(() => alert("קוד הגיבוי הועתק."), () => prompt("העתיקו את קוד הגיבוי:", exportSave(this.state))); break;
      case "import": this.importProgress(); break;
      case "reset": this.resetProgress(); break;
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.screen !== "play" || this.state.settings.answerMode !== "numpad") return;
    if (/^\d$/.test(event.key) && this.numpadValue.length < 3) this.numpadValue += event.key;
    else if (event.key === "Backspace") this.numpadValue = this.numpadValue.slice(0, -1);
    else if (event.key === "Enter" && this.numpadValue) this.answer(Number(this.numpadValue));
    else return;
    event.preventDefault();
    this.updateDisplay();
  }

  private startStage(stageId: string): void {
    const stage = getStage(stageId);
    if (!stage || !isStageUnlocked(this.state, stage.id)) return;
    const config = DIFFICULTIES[this.state.settings.difficulty];
    const hearts = Math.max(1, Math.round(stage.hearts * config.hearts / 3));
    this.session = createSession(this.state, {
      kind: "stage",
      stageId,
      mission: stage.name,
      tables: stage.tables,
      operation: stage.operation,
      total: stage.questions,
      hearts,
      seconds: stage.seconds,
    });
    this.state.lastStageId = stageId;
    this.numpadValue = "";
    this.screen = "play";
    if (stage.boss) sounds.play(stage.id === "W7-Boss" ? "venom" : "boss");
    else sounds.play("level");
    this.persist();
    this.render();
  }

  private startPractice(operation: Operation): void {
    const config = DIFFICULTIES[this.state.settings.difficulty];
    this.session = createSession(this.state, {
      kind: "practice",
      mission: "תרגול חופשי",
      tables: Array.from({ length: this.state.tables11_12Unlocked ? 12 : 10 }, (_, index) => index + 1),
      operation,
      total: config.questions,
      hearts: config.hearts,
      seconds: 12,
    });
    this.screen = "play";
    this.render();
  }

  private startWeakPractice(): void {
    const weak = weakFactKeys(this.state);
    if (!weak.length) {
      this.startPractice("mixed");
      return;
    }
    const config = DIFFICULTIES[this.state.settings.difficulty];
    this.session = createSession(this.state, {
      kind: "weak",
      mission: "העובדות החלשות שלי",
      tables: [...new Set(weak.map((key) => Number(key.split("×")[0])))],
      operation: "mixed",
      total: config.questions,
      hearts: config.hearts,
      seconds: 14,
      preferredKeys: weak,
    });
    this.screen = "play";
    this.render();
  }

  private startCityChallenge(): void {
    const config = DIFFICULTIES[this.state.settings.difficulty];
    const duration = this.state.settings.difficulty === "easy" ? 70 : this.state.settings.difficulty === "hard" ? 40 : 50;
    this.session = createSession(this.state, {
      kind: "city",
      mission: "אתגר העיר",
      tables: Array.from({ length: this.state.tables11_12Unlocked ? 12 : 10 }, (_, index) => index + 1),
      operation: "mixed",
      total: 99,
      hearts: config.hearts,
      seconds: duration,
    });
    this.session.totalDeadline = performance.now() + duration * 1000;
    this.session.deadline = this.session.totalDeadline;
    this.screen = "play";
    sounds.play("boss");
    this.render();
  }

  private startFactPractice(key: string): void {
    const [a] = key.split("×").map(Number);
    const config = DIFFICULTIES[this.state.settings.difficulty];
    this.session = createSession(this.state, {
      kind: "weak",
      mission: key,
      tables: [a || 2],
      operation: this.state.opMode,
      total: 5,
      hearts: config.hearts,
      seconds: 14,
      preferredKeys: [key],
    });
    this.screen = "play";
    this.render();
  }

  private answer(value: number): void {
    const session = this.session;
    if (!session || session.transitioning) return;
    const elapsed = performance.now() - session.questionStartedAt;
    const correct = value === session.question.answer;
    if (correct) {
      const firstTry = session.attempts === 0;
      const reward = speedScore(elapsed, session.streak);
      session.score += reward.points;
      session.silk += firstTry ? reward.silk : 0;
      session.streak += 1;
      session.correct += 1;
      if (firstTry) session.firstTry += 1;
      recordFact(this.state, session.question.factKey, true, firstTry, elapsed);
      sounds.play("correct", session.streak);
      this.feedback = `מעולה! +${reward.points}`;
      this.feedbackGood = true;
      session.transitioning = true;
      this.clearTimer();
      this.showFeedback();
      this.spawnWebShot();
      this.numpadValue = "";
      window.setTimeout(() => this.nextQuestion(), 550);
    } else {
      session.attempts += 1;
      session.streak = 0;
      session.hearts -= 1;
      session.misses.push(session.question.factKey);
      recordFact(this.state, session.question.factKey, false, false, elapsed);
      sounds.play("wrong");
      this.feedback = session.hearts > 0 && session.attempts === 1
        ? "כמעט! קיבלת רמז — נסה שוב"
        : `התשובה היא ${session.question.answer}`;
      this.feedbackGood = false;
      this.numpadValue = "";
      this.persist();
      if (session.hearts <= 0) {
        session.transitioning = true;
        this.clearTimer();
        window.setTimeout(() => this.finishRound(), 800);
      }
      else if (session.attempts >= 2) {
        session.transitioning = true;
        this.clearTimer();
        this.showFeedback();
        window.setTimeout(() => this.nextQuestion(), 900);
      }
      else this.render();
    }
  }

  private nextQuestion(): void {
    const session = this.session;
    if (!session) return;
    session.index += 1;
    if (session.index >= session.total) {
      this.finishRound();
      return;
    }
    session.question = makeQuestion(this.state, session.tables, session.operation, session.kind === "weak" ? weakFactKeys(this.state) : session.misses);
    session.attempts = 0;
    session.transitioning = false;
    session.questionStartedAt = performance.now();
    if (!session.totalDeadline) session.deadline = performance.now() + session.seconds * 1000;
    this.feedback = "";
    this.numpadValue = "";
    this.render();
  }

  private finishRound(): void {
    const session = this.session;
    if (!session) return;
    this.clearTimer();
    const stars = session.kind === "city"
      ? session.correct >= 20 ? 3 : session.correct >= 12 ? 2 : session.correct >= 5 ? 1 : 0
      : computeStars(this.state, session);
    let passed = session.kind === "stage" ? stars >= 2 : session.correct > 0;
    let reward = session.silk;
    let suitUnlocked: Suit | undefined;
    if (session.stageId) {
      const stage = getStage(session.stageId)!;
      const before = [...this.state.unlockedSuits];
      finishStage(this.state, stage, stars, session.score);
      reward += passed ? stage.reward + (stars === 3 ? Math.round(stage.reward * 0.5) : 0) : 0;
      suitUnlocked = this.state.unlockedSuits.find((suit) => !before.includes(suit));
      if (stage.id === "W6-Boss") this.state.tables11_12Unlocked = true;
      if (passed && (stage.boss || Math.random() < 0.55)) {
        const drops = stage.boss ? 2 : 1;
        for (let index = 0; index < drops; index++) {
          const snack = SNACKS[Math.floor(Math.random() * SNACKS.length)]!;
          this.state.pantry[snack.id] = (this.state.pantry[snack.id] ?? 0) + 1;
        }
      }
    }
    this.state.silk += reward;
    this.state.lifetimeSilk += reward;
    this.state.roundsCompleted += 1;
    this.state.highScores.overall = Math.max(this.state.highScores.overall, session.score);
    this.state.highScores.tables[session.mission] = Math.max(this.state.highScores.tables[session.mission] ?? 0, session.score);
    this.result = {
      stars,
      score: session.score,
      silk: reward,
      passed,
      mission: session.mission,
      stageId: session.stageId,
      misses: session.misses,
      suitUnlocked,
    };
    this.session = null;
    this.persist();
    if (suitUnlocked) sounds.play(suitUnlocked === "venom" ? "venom" : "unlock");
    else if (passed) sounds.play("unlock");
    this.go("result");
  }

  private secondsLeft(): number {
    if (!this.session) return 0;
    if (this.state.settings.slowMode) return this.session.seconds;
    const deadline = this.session.totalDeadline ?? this.session.deadline;
    if (performance.now() < this.session.frozenUntil) return Math.max(1, Math.ceil((deadline - this.session.frozenUntil) / 1000));
    return Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
  }

  private startTimer(): void {
    const session = this.session;
    if (!session || session.transitioning || this.state.settings.slowMode) return;
    this.clearTimer();
    session.timer = window.setInterval(() => this.updateTimer(), 200);
  }

  private updateTimer(): void {
    const session = this.session;
    if (!session || session.transitioning || this.screen !== "play" || this.state.settings.slowMode) return;
    const left = this.secondsLeft();
    const timer = this.root.querySelector<HTMLElement>(".timer");
    const fill = timer?.querySelector<HTMLElement>("i");
    const label = timer?.querySelector<HTMLElement>("span");
    if (fill) fill.style.width = `${left / session.seconds * 100}%`;
    if (label) label.textContent = `${left} שנ׳`;
    timer?.classList.toggle("danger", left <= 3);
    if (left <= 3 && left > 0 && Math.ceil((session.deadline - performance.now()) / 200) % 5 === 0) sounds.play("tick");
    if (left <= 0) {
      if (session.kind === "city") {
        session.transitioning = true;
        this.clearTimer();
        this.feedback = "הזמן נגמר — העיר ניצלה!";
        this.feedbackGood = true;
        this.showFeedback();
        window.setTimeout(() => this.finishRound(), 650);
        return;
      }
      session.transitioning = true;
      session.hearts -= 1;
      session.misses.push(session.question.factKey);
      recordFact(this.state, session.question.factKey, false, false, session.seconds * 1000);
      sounds.play("wrong");
      this.feedback = `נגמר הזמן! התשובה היא ${session.question.answer}`;
      this.feedbackGood = false;
      this.clearTimer();
      if (session.hearts <= 0) window.setTimeout(() => this.finishRound(), 700);
      else window.setTimeout(() => this.nextQuestion(), 850);
      this.render();
    }
  }

  private clearTimer(): void {
    if (this.session?.timer) window.clearInterval(this.session.timer);
    if (this.session) this.session.timer = undefined;
  }

  private useSnack(id: string): void {
    const session = this.session;
    const snack = SNACKS.find((item) => item.id === id);
    if (!session || !snack || (this.state.pantry[id] ?? 0) <= 0 || session.snackUses >= session.maxSnackUses) return;
    this.state.pantry[id] = (this.state.pantry[id] ?? 0) - 1;
    session.snackUses += 1;
    sounds.play("snack");
    if (snack.effect === "time") {
      session.deadline += 8000;
      if (session.totalDeadline) session.totalDeadline += 8000;
    }
    else if (snack.effect === "heart") session.hearts = Math.min(session.maxHearts, session.hearts + 1);
    else if (snack.effect === "hint") session.attempts = Math.max(1, session.attempts);
    else if (snack.effect === "freeze") {
      session.frozenUntil = performance.now() + 4000;
      session.deadline += 4000;
      if (session.totalDeadline) session.totalDeadline += 4000;
    } else {
      session.misses.push(session.question.factKey);
      session.transitioning = true;
      this.clearTimer();
      this.persist();
      this.nextQuestion();
      return;
    }
    this.persist();
    this.render();
  }

  private equipSuit(suit: Suit): void {
    if (!this.state.unlockedSuits.includes(suit)) return;
    this.state.activeSuit = suit;
    this.persist();
    sounds.play(suit === "venom" ? "venom" : "web");
    this.render();
  }

  private buySuit(suit: Suit): void {
    const item = SUITS.find((candidate) => candidate.id === suit);
    if (!item || item.cost <= 0 || this.state.silk < item.cost) return;
    this.state.silk -= item.cost;
    this.state.unlockedSuits.push(suit);
    this.state.activeSuit = suit;
    sounds.play("purchase");
    this.persist();
    this.render();
  }

  private restartLast(): void {
    if (this.result?.stageId) this.startStage(this.result.stageId);
    else if (this.result?.mission.includes("חלשות")) this.startWeakPractice();
    else this.startPractice("mixed");
  }

  private updateDisplay(): void {
    const display = this.root.querySelector(".answer-display");
    if (display) display.textContent = this.numpadValue || "—";
  }

  private showFeedback(): void {
    const feedback = this.root.querySelector<HTMLElement>("#feedback");
    if (feedback) {
      feedback.textContent = this.feedback;
      feedback.className = `feedback ${this.feedbackGood ? "good" : "bad"}`;
    }
    this.root.querySelectorAll<HTMLButtonElement>(".numpad button, .choices button").forEach((button) => {
      button.disabled = true;
    });
  }

  private spawnWebShot(): void {
    if (this.state.settings.reduceMotion) return;
    const shot = document.createElement("span");
    shot.className = "web-shot";
    document.body.appendChild(shot);
    sounds.play("web");
    window.setTimeout(() => shot.remove(), 700);
  }

  private openNameDialog(): void {
    const dialog = document.createElement("dialog");
    dialog.className = "name-dialog";
    dialog.setAttribute("aria-labelledby", "name-title");
    dialog.setAttribute("aria-describedby", "name-help");
    dialog.innerHTML = `<form method="dialog"><h2 id="name-title">איך קוראים לגיבור?</h2><p id="name-help">אפשר גם לדלג ולשנות אחר כך.</p><label for="hero-name">שם הגיבור</label><input id="hero-name" maxlength="20" autocomplete="name" placeholder="שם הגיבור"><div><button class="btn btn-primary" value="save">שמירה</button><button class="btn" value="skip">דלג</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener("close", () => {
      const input = dialog.querySelector<HTMLInputElement>("input");
      if (dialog.returnValue === "save") this.state.playerName = input?.value.trim().slice(0, 20) ?? "";
      this.state.nameAsked = true;
      this.persist();
      dialog.remove();
      this.render();
    }, { once: true });
    dialog.showModal();
    dialog.querySelector("input")?.focus();
  }

  private importProgress(): void {
    const encoded = prompt("הדביקו את קוד הגיבוי:");
    if (!encoded) return;
    try {
      this.state = importSave(encoded);
      this.persist();
      this.render();
      alert("ההתקדמות שוחזרה.");
    } catch {
      alert("קוד הגיבוי אינו תקין.");
    }
  }

  private resetProgress(): void {
    if (!confirm("למחוק את כל ההתקדמות? אי אפשר לבטל פעולה זו.")) return;
    clearSave();
    location.reload();
  }
}
