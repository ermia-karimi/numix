function getLocalGameData() {
    const defaults = {};
    for (let level = 2; level <= 9; level++) {
        defaults[level] = { isAccessible: level === 2 };
    }
    const saved = safeStorageGet('localGameData', {});
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaults;

    for (let level = 2; level <= 9; level++) {
        const item = saved[level];
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        defaults[level] = {
            ...defaults[level],
            ...item,
            isAccessible: level === 2 || item.isAccessible === true,
        };
        ['bestScore', 'bestTime', 'lastTime', 'lastMoves'].forEach(key => {
            if (defaults[level][key] != null) {
                const value = Number(defaults[level][key]);
                defaults[level][key] = Number.isFinite(value) && value >= 0 ? value : null;
            }
        });
    }
    return defaults;
}

const NUMIX_ACHIEVEMENTS = [
    { id: 'first_win', title: 'First Win', detail: 'Complete your first puzzle', icon: '✦', test: p => p.wins >= 1 },
    { id: 'five_wins', title: 'Getting Sharp', detail: 'Complete 5 puzzles', icon: '◆', test: p => p.wins >= 5 },
    { id: 'ten_wins', title: 'Puzzle Fan', detail: 'Complete 10 puzzles', icon: '✧', test: p => p.wins >= 10 },
    { id: 'twenty_five_wins', title: 'Dedicated', detail: 'Complete 25 puzzles', icon: '★', test: p => p.wins >= 25 },
    { id: 'record_breaker', title: 'Record Breaker', detail: 'Set a new personal record', icon: '⚡', test: p => p.records >= 1 },
    { id: 'speed_runner', title: 'Quick Thinker', detail: 'Solve a puzzle in under 60 seconds', icon: '◷', test: p => p.fastWins >= 1 },
];

function getPlayerProgress() {
    try {
        const saved = safeStorageGet('numixProgress', {}) || {};
        return {
            xp: Number(saved.xp) || 0,
            wins: Number(saved.wins) || 0,
            records: Number(saved.records) || 0,
            fastWins: Number(saved.fastWins) || 0,
            unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
        };
    } catch (_) {
        return { xp: 0, wins: 0, records: 0, fastWins: 0, unlocked: [] };
    }
}

function getPlayerLevel(xp) {
    let level = 1;
    let remaining = Math.max(0, xp);
    let needed = 100;
    while (remaining >= needed) {
        remaining -= needed;
        level++;
        needed = 100 + ((level - 1) * 25);
    }
    return { level, current: remaining, needed };
}

function renderPlayerProgress() {
    const panel = document.getElementById('progress-panel');
    if (!panel) return;
    const progress = getPlayerProgress();
    const level = getPlayerLevel(progress.xp);
    document.getElementById('player-level').textContent = `Level ${level.level}`;
    document.getElementById('player-xp').textContent = `${level.current} / ${level.needed} XP`;
    document.getElementById('total-xp').textContent = progress.xp.toLocaleString();
    document.getElementById('xp-fill').style.width = `${Math.min(100, (level.current / level.needed) * 100)}%`;
    const unlocked = NUMIX_ACHIEVEMENTS.filter(item => progress.unlocked.includes(item.id));
    document.getElementById('achievement-count').textContent = `${unlocked.length} / ${NUMIX_ACHIEVEMENTS.length} unlocked`;
    document.getElementById('achievement-list').innerHTML = NUMIX_ACHIEVEMENTS.map(item => {
        const isUnlocked = progress.unlocked.includes(item.id);
        return `<div class="achievement ${isUnlocked ? 'is-unlocked' : 'is-locked'}" title="${item.detail}">
            <span class="achievement-icon">${item.icon}</span><span class="achievement-name">${item.title}</span>
            <span class="achievement-status">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
        </div>`;
    }).join('');
}

function awardPuzzleXP(level, elapsedSeconds, isNewRecord) {
    const progress = getPlayerProgress();
    const reward = Math.max(20, Math.min(90, level * 10));
    progress.xp += reward;
    progress.wins += 1;
    if (isNewRecord) progress.records += 1;
    if (elapsedSeconds < 60) progress.fastWins += 1;
    const newlyUnlocked = [];
    NUMIX_ACHIEVEMENTS.forEach(item => {
        if (!progress.unlocked.includes(item.id) && item.test(progress)) {
            progress.unlocked.push(item.id);
            newlyUnlocked.push(item.title);
        }
    });
    safeStorageSet('numixProgress', progress);
    renderPlayerProgress();
    return { reward, level: getPlayerLevel(progress.xp).level, newlyUnlocked };
}

function getDailyChallengeDate() {
    // UTC date keeps the same puzzle for players around the world.
    return new Date().toISOString().slice(0, 10);
}

function createDailyChallengeBoard(dateKey = getDailyChallengeDate()) {
    const size = 4;
    const tiles = Array.from({ length: size * size - 1 }, (_, i) => i + 1).concat('empty');
    // Stable seeded PRNG: every player receives exactly the same board for this UTC date.
    let seed = 2166136261;
    for (const char of dateKey) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    function random() {
        seed += 0x6D2B79F5;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    // For a 4x4 puzzle, solvability requires odd (inversions + blank row from bottom).
    const inversions = tiles.reduce((count, value, i) => {
        if (value === 'empty') return count;
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[j] !== 'empty' && value > tiles[j]) count++;
        }
        return count;
    }, 0);
    const blankRowFromBottom = size - Math.floor(tiles.indexOf('empty') / size);
    if ((inversions + blankRowFromBottom) % 2 === 0) {
        const a = tiles.findIndex(value => value === 1);
        const b = tiles.findIndex(value => value === 2);
        [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
    }
    // Avoid an accidentally solved board (extremely unlikely, but deterministic).
    if (tiles.every((value, i) => value === (i === tiles.length - 1 ? 'empty' : i + 1))) {
        [tiles[0], tiles[1]] = [tiles[1], tiles[0]];
    }
    return Game.convertArrayToBoard(tiles);
}

function getDailyChallengeData() {
    const saved = safeStorageGet('numixDailyChallenge', {});
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

function getDailyStreakData() {
    try {
        const saved = safeStorageGet('numixDailyStreak', {}) || {};
        return {
            current: Math.max(0, Number(saved.current) || 0),
            best: Math.max(0, Number(saved.best) || 0),
            lastCompletedDate: typeof saved.lastCompletedDate === 'string' ? saved.lastCompletedDate : null,
        };
    } catch (_) {
        return { current: 0, best: 0, lastCompletedDate: null };
    }
}

function getPreviousUtcDate(dateKey) {
    const date = new Date(`${dateKey}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

// Called only on the first successful completion of a daily board.
function updateDailyStreak(dateKey) {
    const streak = getDailyStreakData();
    if (streak.lastCompletedDate === dateKey) return streak;

    streak.current = streak.lastCompletedDate === getPreviousUtcDate(dateKey)
        ? streak.current + 1
        : 1;
    streak.best = Math.max(streak.best, streak.current);
    streak.lastCompletedDate = dateKey;
    safeStorageSet('numixDailyStreak', streak);
    return streak;
}

function getVisibleDailyStreak(dateKey = getDailyChallengeDate()) {
    const streak = getDailyStreakData();
    const stillActive = streak.lastCompletedDate === dateKey || streak.lastCompletedDate === getPreviousUtcDate(dateKey);
    return { ...streak, current: stillActive ? streak.current : 0 };
}

function renderDailyChallenge() {
    const dateKey = getDailyChallengeDate();
    const data = getDailyChallengeData();
    const today = data[dateKey];
    const dateLabel = new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const dateEl = document.getElementById('daily-date');
    const statusEl = document.getElementById('daily-status');
    const descriptionEl = document.getElementById('daily-description');
    const button = document.getElementById('daily-play-button');
    const streakEl = document.getElementById('daily-streak');
    if (!button) return;
    const streak = getVisibleDailyStreak(dateKey);
    if (streakEl) streakEl.textContent = `🔥 ${streak.current} DAY STREAK · BEST ${streak.best}`;
    dateEl.textContent = dateLabel.toUpperCase();
    if (today && today.completed) {
        statusEl.textContent = 'COMPLETED TODAY';
        descriptionEl.textContent = `Best: ${today.bestMoves || today.moves} moves · ${formatDailyTime(today.bestTime == null ? today.time : today.bestTime)}. The daily puzzle is ready to replay.`;
        button.innerHTML = 'Play again <span>↻</span>';
        button.classList.add('is-completed');
    } else {
        statusEl.textContent = 'NOT COMPLETED';
        descriptionEl.textContent = 'A new shared 4×4 challenge every day. Can you beat it?';
        button.innerHTML = 'Play today <span>↗</span>';
        button.classList.remove('is-completed');
    }
}

function formatDailyTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function awardDailyChallengeBonus(dateKey) {
    const data = getDailyChallengeData();
    const record = data[dateKey] || (data[dateKey] = {});
    if (record.bonusAwarded) return 0;
    record.bonusAwarded = true;
    safeStorageSet('numixDailyChallenge', data);
    const progress = getPlayerProgress();
    progress.xp += 40;
    safeStorageSet('numixProgress', progress);
    renderPlayerProgress();
    return 40;
}

const localGameData = getLocalGameData();

// Numix ads are managed manually in the separate GitHub Pages AD repository.
// Only the first two configured slots are used by the game.
const NUMIX_AD_CONFIG_URL = 'https://ermia-karimi.github.io/AD/ads-config.json';
const NUMIX_AD_BASE_URL = 'https://ermia-karimi.github.io/AD/';
const NUMIX_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'svg']);
const NUMIX_VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v']);

function setNumixAdVisibility(showAds) {
    document.querySelectorAll('[data-numix-ad]').forEach(slot => {
        slot.hidden = !showAds || slot.dataset.loaded !== 'true';
    });
}

function getNumixAdAsset(file) {
    if (typeof file !== 'string' || !file.trim()) return null;
    const cleanFile = file.trim();
    // Config values must be relative paths inside the AD project; reject external URLs and traversal.
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(cleanFile) || cleanFile.split('/').includes('..') || cleanFile.includes('\\')) return null;
    let url;
    try { url = new URL(cleanFile, NUMIX_AD_BASE_URL); } catch (_) { return null; }
    const base = new URL(NUMIX_AD_BASE_URL);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
    const extension = url.pathname.split('.').pop().toLowerCase();
    if (NUMIX_IMAGE_EXTENSIONS.has(extension)) return { url: url.href, kind: 'image' };
    if (NUMIX_VIDEO_EXTENSIONS.has(extension)) return { url: url.href, kind: 'video' };
    return null;
}

function renderNumixAd(slot, configSlot) {
    slot.replaceChildren();
    slot.dataset.loaded = 'false';
    if (!configSlot || configSlot.enabled !== true) return;
    const asset = getNumixAdAsset(configSlot.file);
    if (!asset) return;

    const label = document.createElement('span');
    label.className = 'numix-ad-label';
    label.textContent = configSlot.label ? `Sponsored · ${String(configSlot.label).slice(0, 80)}` : 'Sponsored';
    slot.appendChild(label);

    let media;
    if (asset.kind === 'image') {
        media = document.createElement('img');
        media.alt = configSlot.label ? String(configSlot.label).slice(0, 120) : 'Sponsored content';
        media.loading = 'lazy';
        media.decoding = 'async';
        media.src = asset.url;
    } else {
        media = document.createElement('video');
        media.controls = true;
        media.muted = true;
        media.playsInline = true;
        media.preload = 'metadata';
        media.setAttribute('aria-label', configSlot.label ? String(configSlot.label).slice(0, 120) : 'Sponsored video');
        const source = document.createElement('source');
        source.src = asset.url;
        media.appendChild(source);
    }
    media.className = 'numix-ad-media';
    media.addEventListener('error', () => {
        slot.replaceChildren();
        slot.dataset.loaded = 'false';
        slot.hidden = true;
    }, { once: true });
    slot.appendChild(media);
    slot.dataset.loaded = 'true';
    slot.hidden = document.querySelector('.board')?.classList.contains('board--game') || false;
}

async function loadNumixAds() {
    try {
        const response = await fetch(NUMIX_AD_CONFIG_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Ad config request failed: ${response.status}`);
        const config = await response.json();
        const slots = Array.isArray(config.slots) ? config.slots : [];
        [1, 2].forEach(id => {
            const target = document.querySelector(`[data-numix-ad="${id}"]`);
            const configured = slots.find(item => Number(item.id) === id);
            if (target) renderNumixAd(target, configured);
        });
        setNumixAdVisibility(!document.querySelector('.board')?.classList.contains('board--game'));
    } catch (error) {
        // Ads are optional: a network/config failure must never affect puzzle play.
        document.querySelectorAll('[data-numix-ad]').forEach(slot => {
            slot.replaceChildren();
            slot.dataset.loaded = 'false';
            slot.hidden = true;
        });
        console.warn('Numix ads are currently unavailable.', error);
    }
}

loadNumixAds();

function renderGameLevels(localGameDataObject, board) {
    document.querySelector('.controls__main').classList.remove('none');
    document.querySelector('.daily-card').classList.remove('is-hidden');
    document.querySelector('.controls__game').classList.add('none');
    board.innerHTML = '';
    board.classList.remove('board--game');
    board.classList.add('board--levels');
    document.querySelector('#level-heading').style.display = 'flex';
    setNumixAdVisibility(true);
    let levelClassName = '';
    for (let key in localGameDataObject) {

        if (localGameDataObject[key].isAccessible) {
            levelClassName = 'level__enabled';
        } else {
            levelClassName = 'level__disabled';
        }

        let levelEl = createElement('div', {
            className: levelClassName + ' level',

            children: [
                createElement('div', {
                    className: 'level__name',
                }, `${key}x${key}`),
                createElement('div', {
                    className: 'level__score',
                }, (function () {
                    if (localGameDataObject[key].bestScore) {
                        const bestTime = localGameDataObject[key].bestTime;
                        const formattedTime = bestTime == null ? '' : ` · ${String(Math.floor(bestTime / 60)).padStart(2, '0')}:${String(bestTime % 60).padStart(2, '0')}`;
                        return `Best: ${localGameDataObject[key].bestScore} moves${formattedTime}`;
                    }
                    return '';
                }()))
            ]
        });
        levelEl.setAttribute('data-level', key);
        board.append(levelEl);
    }
    if (board.lastChild.getAttribute('data-level') === '9' &&
        board.lastChild.textContent !== '9x9') {
        board.classList.add('game-over');
    }

    document.querySelectorAll('.level__enabled').forEach(levelEl => {
        levelEl.addEventListener('click', () => startGame({
            level: +levelEl.getAttribute('data-level'),
            localGameDataObject,
        }));
    });
}

renderGameLevels(localGameData, document.querySelector('.board'));
document.querySelector('#level').addEventListener('click', () => {
    if (g && typeof g.destroy === 'function') g.destroy();
    renderGameLevels(localGameData, document.querySelector('.board'));
    document.querySelector('.game-stats').classList.add('hidden');
});
renderPlayerProgress();
renderDailyChallenge();
document.getElementById('daily-play-button').addEventListener('click', () => {
    const dateKey = getDailyChallengeDate();
    startGame({
        level: 4,
        localGameDataObject: localGameData,
        board: createDailyChallengeBoard(dateKey),
        dailyChallenge: true,
        dailyDate: dateKey,
    });
});

let g = null;

function startGame(props) {
    const {
        level,
        localGameDataObject,
        moves,
        board,
        dailyChallenge = false,
        dailyDate = null,
    } = props;

    if (g && typeof g.destroy === 'function') g.destroy();
    g = new Game(level, localGameDataObject, moves, board, { dailyChallenge, dailyDate });
    g.render();
    document.querySelector('.board').classList.remove('board--levels');
    document.querySelector('.board').classList.add('board--game');
    document.querySelector('#level-heading').style.display = 'none';
    setNumixAdVisibility(false);
    document.querySelector('.controls__main').classList.add('none');
    document.querySelector('.daily-card').classList.add('is-hidden');
    document.querySelector('.controls__game').classList.remove('none');
    document.querySelector('.board').classList.remove('game-over');
    // if (localStorage.getItem('gameProcess')) document.querySelector('#load').disabled = false;
}

document.body.addEventListener('click', function (event) {
    if (event.target.classList.contains('close')) {
        event.target.parentElement.classList.toggle('hidden');
        event.target.parentElement.classList.toggle('visible');
        document.querySelector('.container').classList.toggle('innactive');
    }

    if (event.target.classList.contains('innactive')) {
        if (document.querySelector('.popup.visible')) {
            let el = document.querySelector('.popup.visible');
            el.classList.toggle('hidden');
            el.classList.toggle('visible');
            event.target.classList.toggle('innactive');
        }

    }
})
















// Contact details are configured here when the business phone number is ready.
const NUMIX_CONTACT_NUMBER = '';

(function setupContactModal() {
    const modal = document.getElementById('contact-modal');
    const numberEl = document.getElementById('contact-number');
    const callButton = document.getElementById('call-button');
    const openButtons = [document.getElementById('contact-trigger')];
    if (!modal) return;

    if (NUMIX_CONTACT_NUMBER.trim()) {
        numberEl.textContent = NUMIX_CONTACT_NUMBER;
        callButton.href = `tel:${NUMIX_CONTACT_NUMBER.replace(/[^+\d]/g, '')}`;
        callButton.hidden = false;
    }

    const open = () => {
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
    };

    openButtons.forEach(button => button && button.addEventListener('click', open));
    modal.querySelectorAll('[data-close-contact]').forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') close();
    });
})();


// Cache the app shell for repeat visits without a network connection.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(error => {
            console.warn('[Numix] Offline cache could not be registered.', error);
        });
    }, { once: true });
}
