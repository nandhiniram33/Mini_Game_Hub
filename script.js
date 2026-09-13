const STORAGE_KEY = "miniGameHubAdvancedState";
const THEME_KEY = "miniGameHubTheme";
const SOUND_KEY = "miniGameHubSound";

const winningPatterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const challengeTemplates = [
  { id: "wins3", title: "Win 3 games today", goal: 3, rewardXP: 100, rewardCoins: 50, metric: "wins" },
  { id: "rps2", title: "Win 2 RPS matches", goal: 2, rewardXP: 80, rewardCoins: 40, metric: "rpsWins" },
  { id: "guess5", title: "Guess a number within 5 attempts", goal: 1, rewardXP: 70, rewardCoins: 35, metric: "perfectGuess" },
  { id: "ttt1", title: "Win one Tic-Tac-Toe game", goal: 1, rewardXP: 90, rewardCoins: 45, metric: "tttWins" },
];

const defaultState = {
  username: "Nandhu",
  avatar: "🧑‍🚀",
  favoriteGame: "ttt",
  score: 0,
  xp: 0,
  coins: 0,
  currentResult: "Ready",
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  achievements: {
    firstWin: false,
    streak5: false,
    streak10: false,
    perfectGuess: false,
    gameMaster: false,
    play10: false,
    level5: false,
  },
  theme: "dark",
  sound: true,
  dailyReward: { date: "", day: 1 },
  unlockedCosmetics: [],
  dailyStats: {
    date: "",
    wins: 0,
    rpsWins: 0,
    guessWins: 0,
    tttWins: 0,
    perfectGuess: 0,
  },
  dailyChallenges: [],
  recentGames: [],
  leaderboard: [
    { name: "Alex", score: 1250, level: 12 },
    { name: "Nandhu", score: 1050, level: 10 },
    { name: "Sam", score: 890, level: 8 },
    { name: "Rahul", score: 720, level: 7 },
    { name: "Priya", score: 650, level: 6 },
  ],
  rps: {
    roundScore: 0,
  },
  guess: {
    active: true,
    target: 42,
    attempts: 0,
    maxAttempts: 8,
    range: 100,
    difficulty: "medium",
  },
  ttt: {
    board: Array(9).fill(""),
    isGameOver: false,
    difficulty: "medium",
  },
};

const state = loadState();

function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const fresh = structuredClone(defaultState);

  if (!saved) {
    return initializeDailyData(fresh);
  }

  const merged = { ...fresh, ...saved, achievements: { ...fresh.achievements, ...saved.achievements }, dailyStats: { ...fresh.dailyStats, ...saved.dailyStats }, rps: { ...fresh.rps, ...saved.rps }, guess: { ...fresh.guess, ...saved.guess }, ttt: { ...fresh.ttt, ...saved.ttt } };

  return initializeDailyData(merged);
}

function initializeDailyData(data) {
  const today = new Date().toISOString().slice(0, 10);

  if (!data.dailyStats || data.dailyStats.date !== today) {
    data.dailyStats = {
      date: today,
      wins: 0,
      rpsWins: 0,
      guessWins: 0,
      tttWins: 0,
      perfectGuess: 0,
    };
  }

  if (!Array.isArray(data.dailyChallenges) || data.dailyChallenges.length === 0) {
    data.dailyChallenges = challengeTemplates.map((challenge) => ({
      ...challenge,
      progress: 0,
      completed: false,
    }));
  }

  syncDailyChallenges(data);
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem(THEME_KEY) || state.theme;
  const savedSound = localStorage.getItem(SOUND_KEY);
  state.theme = savedTheme || state.theme;
  state.sound = savedSound === null ? state.sound : savedSound === "true";

  setupEvents();
  applyTheme(state.theme);
  updateSoundButton();
  refreshAll();
  resetGuessGame();
  resetTicTacToe();
  showSection("hub");
});

function setupEvents() {
  document.getElementById("usernameInput").addEventListener("input", (event) => {
    state.username = event.target.value.trim() || "Player";
    saveState();
    refreshAll();
  });

  document.getElementById("profileUsername").addEventListener("input", (event) => {
    state.username = event.target.value.trim() || "Player";
    saveState();
    refreshAll();
  });

  document.getElementById("toggleTheme").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, state.theme);
    applyTheme(state.theme);
  });

  document.getElementById("toggleSound").addEventListener("click", () => {
    state.sound = !state.sound;
    localStorage.setItem(SOUND_KEY, String(state.sound));
    updateSoundButton();
    if (state.sound) {
      playTone(660, 0.08, "triangle");
    }
  });

  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    const confirmed = window.confirm("Reset all progress and saved data?");
    if (!confirmed) return;
    const fresh = initializeDailyData(structuredClone(defaultState));
    Object.assign(state, fresh);
    saveState();
    refreshAll();
    resetGuessGame();
    resetTicTacToe();
    showToast("Progress reset.");
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.dataset.section;
      showSection(section);
    });
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.back || "hub");
    });
  });

  document.querySelectorAll(".game-card").forEach((card) => {
    card.addEventListener("click", () => {
      openGame(card.dataset.game);
    });
  });

  document.getElementById("surpriseBtn").addEventListener("click", () => {
    const games = ["rps", "guess", "ttt"];
    const chosen = games[Math.floor(Math.random() * games.length)];
    const labels = {
      rps: "✊ ROCK PAPER SCISSORS",
      guess: "🔢 NUMBER GUESSING",
      ttt: "❌ TIC-TAC-TOE",
    };

    const button = document.getElementById("surpriseBtn");
    button.disabled = true;
    let spin = 0;
    const roulette = window.setInterval(() => {
      button.textContent = `🎲 ${labels[games[spin % games.length]]}`;
      spin += 1;
    }, 120);
    window.setTimeout(() => {
      window.clearInterval(roulette);
      button.disabled = false;
      button.textContent = "🎲 Surprise Me";
      showToast(`🎲 Your game is... ${labels[chosen]}! Good luck!`);
      openGame(chosen);
    }, 850);
  });

  document.getElementById("claimRewardBtn").addEventListener("click", claimDailyReward);

  document.querySelectorAll("[data-shop-item]").forEach((button) => {
    button.addEventListener("click", () => purchaseCosmetic(button.dataset.shopItem, Number(button.dataset.cost)));
  });

  document.querySelectorAll("[data-rps-choice]").forEach((button) => {
    button.addEventListener("click", () => playRpsRound(button.dataset.rpsChoice));
  });

  document.getElementById("guessForm").addEventListener("submit", handleGuessSubmit);
  document.getElementById("guessDifficulty").addEventListener("change", (event) => {
    state.guess.difficulty = event.target.value;
    applyGuessDifficulty(state.guess.difficulty);
  });

  document.getElementById("tttDifficulty").addEventListener("change", (event) => {
    state.ttt.difficulty = event.target.value;
    resetTicTacToe();
  });

  document.getElementById("favoriteGameSelect").addEventListener("change", (event) => {
    state.favoriteGame = event.target.value;
    saveState();
    refreshAll();
  });

  document.querySelectorAll(".avatar-option").forEach((button) => {
    button.addEventListener("click", () => {
      state.avatar = button.dataset.avatar;
      document.querySelectorAll(".avatar-option").forEach((item) => item.classList.toggle("active", item === button));
      saveState();
      refreshAll();
    });
  });

  document.querySelectorAll(".back-btn").forEach((button) => {
    button.addEventListener("click", () => showSection("hub"));
  });

  document.getElementById("rpsRestart").addEventListener("click", resetRpsGame);
  document.getElementById("guessRestart").addEventListener("click", resetGuessGame);
  document.getElementById("tttRestart").addEventListener("click", resetTicTacToe);

  document.querySelectorAll(".clear-btn").forEach((button) => {
    button.addEventListener("click", () => clearGameResult(button.dataset.clear));
  });

  document.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("click", () => handleTicTacToeMove(Number(cell.dataset.index)));
  });
}

function applyTheme(theme) {
  document.body.classList.toggle("light-mode", theme === "light");
  document.body.classList.toggle("dark-mode", theme !== "light");
  document.getElementById("toggleTheme").textContent = theme === "dark" ? "🌙 Dark" : "☀️ Light";
  saveState();
}

function updateSoundButton() {
  document.getElementById("toggleSound").textContent = state.sound ? "🔊 Sound On" : "🔇 Sound Off";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem(THEME_KEY, state.theme);
  localStorage.setItem(SOUND_KEY, String(state.sound));
}

function showSection(sectionName) {
  document.querySelectorAll(".page-section").forEach((section) => {
    const isActive = section.id === sectionName;
    section.classList.toggle("active", isActive);
  });

  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === sectionName);
  });
}

function openGame(gameName) {
  const map = {
    rps: "rpsView",
    guess: "guessView",
    ttt: "tttView",
  };
  showSection(map[gameName] || "hub");
}

function refreshAll() {
  ensureUsername();
  syncCurrentPlayerWithLeaderboard();
  renderProfile();
  renderLevel();
  renderDailyChallenges();
  renderAchievements();
  renderStats();
  renderLeaderboard();
  renderLeaderboardLarge();
  renderContinuePlaying();
  renderPodium();
  renderRewardState();
  renderShopState();
  updateCurrentResult();
}

function claimDailyReward() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dailyReward?.date === today) {
    showToast("🎁 Daily reward already claimed. Come back tomorrow!");
    return;
  }

  const nextDay = state.dailyReward?.date ? (state.dailyReward.day % 7) + 1 : 1;
  state.dailyReward = { date: today, day: nextDay };
  state.xp += 25;
  state.coins += 50;
  saveState();
  refreshAll();
  showToast(`🎁 Day ${nextDay} reward claimed: +25 XP +50 coins!`);
  playTone(880, 0.12, "triangle");
}

function renderRewardState() {
  const button = document.getElementById("claimRewardBtn");
  if (!button) return;
  const today = new Date().toISOString().slice(0, 10);
  const claimed = state.dailyReward?.date === today;
  button.disabled = claimed;
  button.textContent = claimed ? `✅ Day ${state.dailyReward.day} Reward Claimed` : `🎁 Claim Day ${(state.dailyReward?.date ? state.dailyReward.day % 7 + 1 : 1)} Reward`;
}

function purchaseCosmetic(item, cost) {
  if (state.unlockedCosmetics.includes(item)) {
    showToast("✨ Cosmetic already unlocked!");
    return;
  }
  if (state.coins < cost) {
    showToast(`🪙 You need ${cost - state.coins} more coins.`);
    return;
  }
  state.coins -= cost;
  state.unlockedCosmetics.push(item);
  saveState();
  refreshAll();
  showToast("🛍️ New cosmetic unlocked!");
  playTone(1040, 0.12, "triangle");
}

function renderShopState() {
  const status = document.getElementById("shopStatus");
  if (!status) return;
  status.textContent = `${state.coins} 🪙 available • ${state.unlockedCosmetics.length} cosmetic${state.unlockedCosmetics.length === 1 ? "" : "s"} unlocked.`;
  document.querySelectorAll("[data-shop-item]").forEach((button) => {
    const unlocked = state.unlockedCosmetics.includes(button.dataset.shopItem);
    button.classList.toggle("unlocked", unlocked);
    button.querySelector("small").textContent = unlocked ? "✅ Unlocked" : `${button.dataset.cost} 🪙`;
  });
}

function ensureUsername() {
  const username = (state.username || "Player").trim();
  state.username = username || "Player";
  document.getElementById("usernameInput").value = state.username;
  document.getElementById("profileUsername").value = state.username;
}

function renderProfile() {
  document.getElementById("profileAvatar").textContent = state.avatar;
  document.getElementById("profileName").textContent = state.username;
  document.getElementById("summaryLevel").textContent = getLevel();
  document.getElementById("summaryPoints").textContent = String(state.score);
  document.getElementById("summaryCoins").textContent = String(state.coins);
  document.getElementById("summaryStreak").textContent = String(state.currentStreak);

  document.querySelectorAll(".avatar-option").forEach((button) => {
    button.classList.toggle("active", button.dataset.avatar === state.avatar);
  });

  const favoriteValue = state.favoriteGame || "ttt";
  const favoriteGameSelect = document.getElementById("favoriteGameSelect");
  favoriteGameSelect.value = favoriteValue;
}

function getLevel() {
  return Math.floor(state.xp / 100) + 1;
}

function getLevelProgress() {
  const level = getLevel();
  const currentLevelXP = (level - 1) * 100;
  const nextLevelXP = level * 100;
  const progress = ((state.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return { level, progress: Math.min(100, Math.max(0, progress)), xpInLevel: state.xp - currentLevelXP, xpNeeded: nextLevelXP - currentLevelXP };
}

function renderLevel() {
  const { level, progress, xpInLevel, xpNeeded } = getLevelProgress();
  const fill = document.getElementById("xpFill");
  const headerLevel = document.getElementById("headerLevel");
  const levelBadge = document.getElementById("levelBadge");
  const xpText = document.getElementById("xpText");
  const levelHint = document.getElementById("levelHint");
  const headerScore = document.getElementById("headerScore");
  const headerCoins = document.getElementById("headerCoins");
  const heroLevel = document.getElementById("heroLevel");
  const heroXP = document.getElementById("heroXP");
  const heroStreak = document.getElementById("heroStreak");
  const heroCoins = document.getElementById("heroCoins");

  fill.style.width = `${progress}%`;
  headerLevel.textContent = String(level);
  levelBadge.textContent = String(level);
  xpText.textContent = `${xpInLevel} / ${xpNeeded} XP`;
  headerScore.textContent = String(state.score);
  headerCoins.textContent = String(state.coins);
  if (heroLevel) heroLevel.textContent = String(level);
  if (heroXP) heroXP.textContent = String(state.xp);
  if (heroStreak) heroStreak.textContent = String(state.currentStreak);
  if (heroCoins) heroCoins.textContent = String(state.coins);

  if (state.xp < 100) {
    levelHint.textContent = "Ready for your first challenge.";
  } else if (state.xp < 300) {
    levelHint.textContent = "You are building momentum.";
  } else {
    levelHint.textContent = "Legend in the making.";
  }
}

function renderStats() {
  const winRate = state.gamesPlayed ? Math.round((state.wins / state.gamesPlayed) * 100) : 0;

  document.getElementById("statGamesPlayed").textContent = String(state.gamesPlayed);
  document.getElementById("statWins").textContent = String(state.wins);
  document.getElementById("statLosses").textContent = String(state.losses);
  document.getElementById("statDraws").textContent = String(state.draws);
  document.getElementById("statWinRate").textContent = `${winRate}%`;
  document.getElementById("statBestStreak").textContent = String(state.bestStreak);
  document.getElementById("statTotalXP").textContent = String(state.xp);

  const performanceEnabled = state.gamesPlayed > 0;
  document.getElementById("summaryPoints").textContent = String(state.score);
  document.getElementById("summaryCoins").textContent = String(state.coins);

  if (!performanceEnabled) {
    document.getElementById("levelHint").textContent = "Ready for your first challenge.";
  }
}

function updateCurrentResult() {
  const scorePlayerName = document.getElementById("scorePlayerName");
  const currentResult = document.getElementById("currentResult");

  if (scorePlayerName) {
    scorePlayerName.textContent = state.username;
  }

  if (currentResult) {
    currentResult.textContent = state.currentResult;
  }
}

function renderAchievements() {
  const achievements = [
    { id: "firstWin", name: "🥇 First Win", description: "Earn your first win", unlocked: state.achievements.firstWin },
    { id: "streak5", name: "🔥 5 Win Streak", description: "Reach 5 in a row", unlocked: state.achievements.streak5 },
    { id: "streak10", name: "👑 10 Win Streak", description: "Reach 10 in a row", unlocked: state.achievements.streak10 },
    { id: "perfectGuess", name: "🎯 Perfect Guess", description: "Win with a perfect guess", unlocked: state.achievements.perfectGuess },
    { id: "gameMaster", name: "🧠 Game Master", description: "Play 10 games", unlocked: state.achievements.gameMaster },
    { id: "play10", name: "🎮 Play 10 Games", description: "Complete 10 sessions", unlocked: state.achievements.play10 },
    { id: "level5", name: "⭐ Reach Level 5", description: "Hit level 5", unlocked: state.achievements.level5 },
  ];

  const list = document.getElementById("achievementsList");
  const preview = document.getElementById("achievementPreview");

  if (list) {
    list.innerHTML = achievements
      .map((achievement) => `
        <div class="achievement-item ${achievement.unlocked ? "unlocked" : ""}">
          <div class="achievement-meta">
            <span>${achievement.name}</span>
          </div>
          <span class="achievement-lock">${achievement.unlocked ? "✓ Unlocked" : "🔒 Locked"}</span>
        </div>
      `)
      .join("");
  }

  if (preview) {
    preview.innerHTML = achievements
      .slice(0, 3)
      .map((achievement) => `
        <div class="achievement-item ${achievement.unlocked ? "unlocked" : ""}">
          <div class="achievement-meta">
            <span>${achievement.name}</span>
          </div>
          <span>${achievement.unlocked ? "✓" : "🔒"}</span>
        </div>
      `)
      .join("");
  }
}

function renderDailyChallenges() {
  const challengeList = document.getElementById("dailyChallengeList");
  const detail = document.getElementById("dailyChallengeDetail");

  state.dailyChallenges = syncDailyChallenges(state);

  const markup = state.dailyChallenges.map((challenge) => {
    const progress = Math.min(challenge.goal, challenge.progress || 0);
    const percent = (progress / challenge.goal) * 100;
    return `
      <div class="challenge-item ${challenge.completed ? "completed" : ""}">
        <div class="challenge-head">
          <strong>${challenge.title}</strong>
          <span>${challenge.completed ? "✅" : "⏳"}</span>
        </div>
        <div class="challenge-bar">
          <div class="challenge-fill" style="width:${percent}%"></div>
        </div>
        <small>${progress} / ${challenge.goal} • +${challenge.rewardXP} XP • +${challenge.rewardCoins} Coins</small>
      </div>
    `;
  }).join("");

  if (challengeList) {
    challengeList.innerHTML = markup;
  }

  if (detail) {
    detail.innerHTML = markup;
  }
}

function renderLeaderboard() {
  const leaderboard = getSortedLeaderboard();
  const tbody = document.getElementById("leaderboardBody");

  if (!tbody) return;

  tbody.innerHTML = leaderboard
    .map((entry, index) => {
      const current = entry.name.toLowerCase() === state.username.toLowerCase();
      return `
        <tr class="${current ? "current-player-row" : ""}">
          <td>${index + 1}</td>
          <td>${entry.name}</td>
          <td>${entry.score}</td>
          <td>${entry.level}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPodium() {
  const podium = document.getElementById("leaderboardPodium");
  if (!podium) return;

  const leaders = getSortedLeaderboard().slice(0, 3);
  const order = [1, 0, 2];

  podium.innerHTML = order.map((pos) => {
    const entry = leaders[pos];
    if (!entry) return "";

    const tiers = ["first", "second", "third"];
    const label = ["#1", "#2", "#3"][pos];
    return `
      <div class="podium-card ${tiers[pos]}">
        <span class="podium-rank">${label}</span>
        <div class="podium-avatar">${entry.name.charAt(0).toUpperCase()}</div>
        <p class="podium-name">${entry.name}</p>
        <strong>${entry.score}</strong>
        <small>Lv ${entry.level}</small>
      </div>
    `;
  }).join("");
}

function renderContinuePlaying() {
  const container = document.getElementById("continuePlayingList");
  if (!container) return;

  const games = state.recentGames || [];

  if (!games.length) {
    container.innerHTML = `
      <div class="continue-item empty-state">
        <div class="continue-game">
          <span class="continue-dot"></span>
          <span>🎮 No recent games</span>
        </div>
        <span class="continue-badge">Play a game and it will appear here.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = games
    .map((game) => `
      <div class="continue-item">
        <div class="continue-game">
          <span class="continue-dot"></span>
          <span>${game.name}</span>
        </div>
        <span class="continue-badge">${game.time}</span>
      </div>
    `)
    .join("");
}

function renderLeaderboardLarge() {
  const container = document.getElementById("leaderboardLarge");
  if (!container) return;

  const leaderboard = getSortedLeaderboard();
  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Score</th>
          <th>Level</th>
        </tr>
      </thead>
      <tbody>
        ${leaderboard.map((entry, index) => `
          <tr class="${entry.name.toLowerCase() === state.username.toLowerCase() ? "current-player-row" : ""}">
            <td>${index + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score}</td>
            <td>${entry.level}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getSortedLeaderboard() {
  const currentPlayer = {
    name: state.username,
    score: state.score,
    level: getLevel(),
  };

  const merged = [...state.leaderboard, currentPlayer]
    .filter((entry) => entry && entry.name)
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry, level: entry.level || 1 }));

  const unique = [];
  merged.forEach((entry) => {
    const existing = unique.find((item) => item.name.toLowerCase() === entry.name.toLowerCase());
    if (!existing) {
      unique.push(entry);
    } else if (entry.score > existing.score) {
      existing.score = entry.score;
      existing.level = entry.level;
    }
  });

  return unique.sort((a, b) => b.score - a.score);
}

function syncCurrentPlayerWithLeaderboard() {
  const current = {
    name: state.username,
    score: state.score,
    level: getLevel(),
  };

  const existing = state.leaderboard.find((entry) => entry.name.toLowerCase() === current.name.toLowerCase());
  if (existing) {
    existing.score = current.score;
    existing.level = current.level;
  } else {
    state.leaderboard.push(current);
  }

  state.leaderboard = state.leaderboard
    .filter((entry) => entry && entry.name)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function syncDailyChallenges(data = state) {
  const today = new Date().toISOString().slice(0, 10);
  if (!data.dailyStats || data.dailyStats.date !== today) {
    data.dailyStats = {
      date: today,
      wins: 0,
      rpsWins: 0,
      guessWins: 0,
      tttWins: 0,
      perfectGuess: 0,
    };
    data.dailyChallenges = challengeTemplates.map((challenge) => ({ ...challenge, progress: 0, completed: false }));
  }

  data.dailyChallenges = challengeTemplates.map((challenge) => {
    let progress = 0;
    if (challenge.metric === "wins") progress = data.dailyStats.wins;
    if (challenge.metric === "rpsWins") progress = data.dailyStats.rpsWins;
    if (challenge.metric === "guessWins") progress = data.dailyStats.guessWins;
    if (challenge.metric === "tttWins") progress = data.dailyStats.tttWins;
    if (challenge.metric === "perfectGuess") progress = data.dailyStats.perfectGuess;

    const completed = progress >= challenge.goal;

    if (completed && !data.dailyChallenges?.find((item) => item.id === challenge.id)?.completed) {
      state.xp += challenge.rewardXP;
      state.coins += challenge.rewardCoins;
      showToast(`Daily challenge complete: ${challenge.title} (+${challenge.rewardXP} XP, +${challenge.rewardCoins} coins)`);
    }

    return {
      ...challenge,
      progress: Math.min(progress, challenge.goal),
      completed,
    };
  });

  return data.dailyChallenges;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 2200);
}

function updateAchievements() {
  const achievements = state.achievements;
  achievements.firstWin = state.wins >= 1;
  achievements.streak5 = state.bestStreak >= 5;
  achievements.streak10 = state.bestStreak >= 10;
  achievements.perfectGuess = state.dailyStats.perfectGuess > 0;
  achievements.gameMaster = state.gamesPlayed >= 10;
  achievements.play10 = state.gamesPlayed >= 10;
  achievements.level5 = getLevel() >= 5;
}

function getLevelLabel() {
  return `Level ${getLevel()}`;
}

function evaluateAchievements() {
  updateAchievements();
  renderAchievements();
}

function awardXpAndCoins(points, coins, reason) {
  state.score += points;
  state.xp += points;
  state.coins += coins;
  state.currentResult = `${reason} +${points} XP +${coins} coins`;
  updateAchievements();
  saveState();
  refreshAll();
}

function recordGameResult(gameKey, result, message, points, bonusXP, bonusCoins, guessDetails) {
  state.gamesPlayed += 1;

  if (result === "win") {
    state.wins += 1;
    state.currentStreak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  } else if (result === "loss") {
    state.losses += 1;
    state.currentStreak = 0;
  } else {
    state.draws += 1;
  }

  const streakBonus = state.currentStreak >= 10 ? 50 : state.currentStreak >= 5 ? 25 : state.currentStreak >= 3 ? 10 : 0;
  const totalXP = bonusXP + streakBonus;
  const totalCoins = bonusCoins + Math.floor(streakBonus / 2);

  state.xp += totalXP;
  state.coins += totalCoins;
  state.score += points + streakBonus;
  state.currentResult = `${message} +${totalXP} XP +${totalCoins} coins`;

  if (gameKey === "rps") {
    if (result === "win") state.dailyStats.rpsWins += 1;
  }
  if (gameKey === "guess") {
    if (result === "win") state.dailyStats.guessWins += 1;
    if (guessDetails && guessDetails.perfect === true) {
      state.dailyStats.perfectGuess += 1;
      state.achievements.perfectGuess = true;
    }
  }
  if (gameKey === "ttt") {
    if (result === "win") state.dailyStats.tttWins += 1;
  }

  if (result === "win") {
    state.dailyStats.wins += 1;
  }

  if (state.bestStreak >= 5) state.achievements.streak5 = true;
  if (state.bestStreak >= 10) state.achievements.streak10 = true;
  if (state.wins >= 1) state.achievements.firstWin = true;
  if (state.gamesPlayed >= 10) state.achievements.play10 = true;
  if (state.gamesPlayed >= 10) state.achievements.gameMaster = true;
  if (getLevel() >= 5) state.achievements.level5 = true;

  const gameNameMap = {
    rps: "Rock Paper Scissors",
    guess: "Number Guessing",
    ttt: "Tic-Tac-Toe",
  };

  state.recentGames = [{ name: gameNameMap[gameKey] || "Game", time: "Just now" }, ...state.recentGames.filter((item) => item && item.name !== (gameNameMap[gameKey] || "Game"))].slice(0, 3);

  syncDailyChallenges(state);
  syncCurrentPlayerWithLeaderboard();
  saveState();
  refreshAll();
  playTone(result === "win" ? 700 : 250, 0.12, result === "win" ? "triangle" : "square");
}

function resetGuessGame() {
  const difficultyMap = {
    easy: { range: 50, maxAttempts: 10 },
    medium: { range: 100, maxAttempts: 8 },
    hard: { range: 100, maxAttempts: 6 },
  };

  const config = difficultyMap[state.guess.difficulty || "medium"];
  state.guess.range = config.range;
  state.guess.maxAttempts = config.maxAttempts;
  state.guess.target = randomInt(1, state.guess.range);
  state.guess.attempts = 0;
  state.guess.active = true;

  document.getElementById("guessInput").max = String(state.guess.range);
  document.getElementById("guessRangeValue").textContent = String(state.guess.range);
  document.getElementById("guessAttempts").textContent = "0";
  document.getElementById("guessHint").textContent = "Start guessing!";
  document.getElementById("guessResult").textContent = "Hidden number is ready.";
  document.getElementById("guessInput").value = "";
}

function handleGuessSubmit(event) {
  event.preventDefault();

  if (!state.guess.active) {
    return;
  }

  const input = document.getElementById("guessInput");
  const guessValue = Number(input.value);

  if (!Number.isInteger(guessValue) || guessValue < 1 || guessValue > state.guess.range) {
    document.getElementById("guessHint").textContent = `Please enter a valid number from 1 to ${state.guess.range}.`;
    return;
  }

  state.guess.attempts += 1;
  document.getElementById("guessAttempts").textContent = String(state.guess.attempts);

  if (guessValue < state.guess.target) {
    document.getElementById("guessHint").textContent = "Too Low";
    document.getElementById("guessResult").textContent = "Try a bigger number.";
  } else if (guessValue > state.guess.target) {
    document.getElementById("guessHint").textContent = "Too High";
    document.getElementById("guessResult").textContent = "Try a smaller number.";
  } else {
    const isPerfect = state.guess.attempts <= 3;
    const xpForWin = Math.max(25, 60 - state.guess.attempts * 5);
    const coinsForWin = 20 + Math.max(0, 10 - state.guess.attempts);

    document.getElementById("guessHint").textContent = "Correct!";
    document.getElementById("guessResult").textContent = `You found it in ${state.guess.attempts} attempts!`;
    state.guess.active = false;
    recordGameResult("guess", "win", "Correct guess!", xpForWin, xpForWin, coinsForWin, { perfect: isPerfect });
    input.value = "";
    return;
  }

  if (state.guess.attempts >= state.guess.maxAttempts) {
    document.getElementById("guessHint").textContent = "Out of attempts";
    document.getElementById("guessResult").textContent = `No more tries! The number was ${state.guess.target}.`;
    state.guess.active = false;
    recordGameResult("guess", "loss", `Too many attempts. The number was ${state.guess.target}.`, 0, 8, 5, {});
  }

  input.value = "";
}

function playRpsRound(playerChoice) {
  const moves = ["rock", "paper", "scissors"];
  const computerChoice = moves[randomInt(0, moves.length - 1)];
  const result = determineRpsOutcome(playerChoice, computerChoice);

  document.getElementById("rpsPlayerChoice").textContent = playerChoice.toUpperCase();
  document.getElementById("rpsComputerChoice").textContent = computerChoice.toUpperCase();
  document.getElementById("rpsResult").textContent = result.label;

  if (result.outcome === "win") {
    state.rps.roundScore += 10;
    document.getElementById("rpsScore").textContent = String(state.rps.roundScore);
    recordGameResult("rps", "win", `Win! ${playerChoice} beats ${computerChoice}`, 30, 30, 20, {});
  } else if (result.outcome === "draw") {
    recordGameResult("rps", "draw", `Draw! ${playerChoice} matches ${computerChoice}`, 0, 10, 5, {});
  } else {
    recordGameResult("rps", "loss", `Loss! ${computerChoice} beats ${playerChoice}`, 0, 8, 4, {});
  }
}

function determineRpsOutcome(playerChoice, computerChoice) {
  if (playerChoice === computerChoice) {
    return { outcome: "draw", label: "Draw!" };
  }

  const winningMoves = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  if (winningMoves[playerChoice] === computerChoice) {
    return { outcome: "win", label: "You win!" };
  }

  return { outcome: "loss", label: "Computer wins!" };
}

function resetRpsGame() {
  state.rps.roundScore = 0;
  document.getElementById("rpsPlayerChoice").textContent = "-";
  document.getElementById("rpsComputerChoice").textContent = "-";
  document.getElementById("rpsResult").textContent = "Choose your move!";
  document.getElementById("rpsScore").textContent = "0";
}

function resetTicTacToe() {
  state.ttt.board = Array(9).fill("");
  state.ttt.isGameOver = false;

  document.querySelectorAll(".cell").forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("x", "o", "win");
    cell.disabled = false;
  });

  document.getElementById("tttStatus").textContent = "Your turn! Place an X.";
  document.getElementById("tttResult").textContent = "Awaiting first move.";
}

function handleTicTacToeMove(index) {
  if (state.ttt.isGameOver || state.ttt.board[index] !== "") return;

  state.ttt.board[index] = "X";
  renderTicTacToeBoard();

  if (getWinner(state.ttt.board) === "X") {
    finishTicTacToe("win", "Player Win", 25, 30, 20);
    return;
  }

  if (isBoardFull(state.ttt.board)) {
    finishTicTacToe("draw", "Draw", 0, 10, 5);
    return;
  }

  document.getElementById("tttStatus").textContent = "Computer is thinking...";

  const computerIndex = getComputerMove(state.ttt.difficulty, state.ttt.board);

  window.setTimeout(() => {
    state.ttt.board[computerIndex] = "O";
    renderTicTacToeBoard();

    if (getWinner(state.ttt.board) === "O") {
      finishTicTacToe("loss", "Computer Win", 0, 12, 6);
      return;
    }

    if (isBoardFull(state.ttt.board)) {
      finishTicTacToe("draw", "Draw", 0, 10, 5);
      return;
    }

    document.getElementById("tttStatus").textContent = "Your turn! Place an X.";
  }, 300);
}

function renderTicTacToeBoard() {
  document.querySelectorAll(".cell").forEach((cell) => {
    const value = state.ttt.board[Number(cell.dataset.index)];
    cell.textContent = value || "";
    cell.classList.remove("x", "o", "win");
    if (value) {
      cell.classList.add(value.toLowerCase());
    }
  });
}

function finishTicTacToe(result, resultMessage, points, xp, coins) {
  state.ttt.isGameOver = true;

  if (result === "win") {
    document.getElementById("tttStatus").textContent = "Player Win!";
    document.getElementById("tttResult").textContent = "You win the round!";
    recordGameResult("ttt", "win", resultMessage, points, xp, coins, {});
  } else if (result === "loss") {
    document.getElementById("tttStatus").textContent = "Computer Win";
    document.getElementById("tttResult").textContent = "The computer wins this round.";
    recordGameResult("ttt", "loss", resultMessage, points, 12, 6, {});
  } else {
    document.getElementById("tttStatus").textContent = "Draw";
    document.getElementById("tttResult").textContent = "It is a draw.";
    recordGameResult("ttt", "draw", "Draw game!", 0, 10, 5, {});
  }

  highlightWinningCells();
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.disabled = true;
  });
}

function highlightWinningCells() {
  const winner = getWinner(state.ttt.board);
  if (!winner) return;

  const pattern = winningPatterns.find((combo) => combo.every((index) => state.ttt.board[index] === winner));
  if (!pattern) return;

  pattern.forEach((index) => {
    const cell = document.querySelector(`.cell[data-index="${index}"]`);
    if (cell) cell.classList.add("win");
  });
}

function getWinner(board) {
  for (const combo of winningPatterns) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((cell) => cell !== "");
}

function getComputerMove(difficulty, board) {
  const available = board.map((value, index) => (value === "" ? index : null)).filter((value) => value !== null);
  if (!available.length) return -1;

  if (difficulty === "easy") {
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === "medium") {
    const blockMove = available.find((index) => {
      const trial = [...board];
      trial[index] = "X";
      return getWinner(trial) === "X";
    });

    if (blockMove !== undefined) return blockMove;

    const center = 4;
    if (board[center] === "") return center;

    if (Math.random() < 0.5) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  const bestMove = minimax(board, "O");
  if (bestMove && bestMove.index !== undefined) return bestMove.index;

  return available[Math.floor(Math.random() * available.length)];
}

function minimax(board, player) {
  const winner = getWinner(board);
  if (winner === "O") return { score: 10 };
  if (winner === "X") return { score: -10 };
  if (isBoardFull(board)) return { score: 0 };

  const moves = [];
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === "") {
      const move = { index };
      board[index] = player;
      const result = minimax(board, player === "O" ? "X" : "O");
      move.score = result.score;
      board[index] = "";
      moves.push(move);
    }
  }

  if (player === "O") {
    return moves.reduce((best, move) => (move.score > best.score ? move : best), moves[0]);
  }

  return moves.reduce((best, move) => (move.score < best.score ? move : best), moves[0]);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function applyGuessDifficulty(level) {
  const map = {
    easy: { range: 50, attempts: 10 },
    medium: { range: 100, attempts: 8 },
    hard: { range: 100, attempts: 6 },
  };

  const config = map[level] || map.medium;
  state.guess.range = config.range;
  state.guess.maxAttempts = config.attempts;
  resetGuessGame();
}

function clearGameResult(gameKey) {
  if (gameKey === "rps") {
    document.getElementById("rpsResult").textContent = "Choose your move!";
    document.getElementById("rpsPlayerChoice").textContent = "-";
    document.getElementById("rpsComputerChoice").textContent = "-";
  }
  if (gameKey === "guess") {
    document.getElementById("guessHint").textContent = "Start guessing!";
    document.getElementById("guessResult").textContent = "Hidden number is ready.";
  }
  if (gameKey === "ttt") {
    document.getElementById("tttStatus").textContent = "Your turn! Place an X.";
    document.getElementById("tttResult").textContent = "Awaiting first move.";
    resetTicTacToe();
  }
  state.currentResult = "Ready";
  updateCurrentResult();
}

function playTone(frequency = 440, duration = 0.08, type = "sine") {
  if (!state.sound) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  const context = new AudioCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.onended = () => context.close();
}

window.addEventListener("beforeunload", saveState);
