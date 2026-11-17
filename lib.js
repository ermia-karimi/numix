function createElement(tagName, props = {}, innerText) {
    const $el = document.createElement(tagName);

    for (const propName in props) {
        if (propName === 'children' && props.children) {
            $el.append(...props.children);
        } else if (typeof props[propName] !== 'undefined') {
            $el[propName] = props[propName];
        }
    }

    if (innerText) {
        $el.innerText = innerText;
    }

    return $el;
}

function render(renderItems, rootEl) {
    rootEl.innerText = '';

    if (Array.isArray(renderItems)) {
        rootEl.append(...renderItems);
    } else {
        rootEl.append(renderItems);
    }
}

function create2dArray(array, size) {
    for (var x, i = 0, c = -1, l = array.length, result = []; i < l; i++) {
        (x = i % size) ? result[c][x] = array[i]: result[++c] = [array[i]];
    }
    return result;
}

function rotateArray(array) {
    const size = Math.sqrt(array.length);
    let board2d = create2dArray(array, size);
    let rotatedBoard = [];

    for (let i = 0; i < size; ++i) {
        for (let j = 0; j < size; ++j) {
            if (!rotatedBoard[j]) rotatedBoard[j] = [];
            rotatedBoard[j][i] = board2d[size - 1 - i][j];
        }
    }

    return rotatedBoard.flat();
}
// Storage helpers: prevent malformed or unavailable localStorage from crashing the game.
function safeStorageGet(key, fallback = null) {
    try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
        console.warn(`[Numix] Could not read storage key "${key}".`, error);
        return fallback;
    }
}

function safeStorageSet(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.warn(`[Numix] Could not save storage key "${key}".`, error);
        return false;
    }
}
