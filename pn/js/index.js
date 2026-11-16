function getLocalGameData() {
    return JSON.parse(localStorage.getItem('localGameData')) || {
        '2': {
            isAccessible: true,
        },
        '3': {
            isAccessible: false,
        },
        '4': {
            isAccessible: false,
        },
        '5': {
            isAccessible: false,
        },
        '6': {
            isAccessible: false,
        },
        '7': {
            isAccessible: false,
        },
        '8': {
            isAccessible: false,
        },
        '9': {
            isAccessible: false,
        },
    }
}

const localGameData = getLocalGameData();

function renderGameLevels(localGameDataObject, board) {
    document.querySelector('.controls__main').classList.remove('none');
    document.querySelector('.controls__game').classList.add('none');
    board.innerHTML = '';
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
                    if (localGameDataObject[key].bestScore) return `Score: ${localGameDataObject[key].bestScore}`
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

let g = {};

function startGame(props) {
    const {
        level,
        localGameDataObject,
        moves,
        board,
    } = props;

    const game = new Game(level, localGameDataObject, moves, board);
    game.render();
    getGlobalScoreData(level);
    document.querySelector('.controls__main').classList.add('none');
    document.querySelector('.controls__game').classList.remove('none');
    document.querySelector('.board').classList.remove('game-over');
    // if (localStorage.getItem('gameProcess')) document.querySelector('#load').disabled = false;
}

function getGlobalScoreData(level) {
    fetch('https://5f103a9700d4ab00161349f0.mockapi.io/scores')
        .then(response => response.json())
        .then(data => {
            const globalLevelData = data
                .find(el => {
                    return el.id == level - 1;
                });
            document.querySelector('.game-stats__global--value').textContent = globalLevelData.score;
            document.querySelector('.game-stats__global--value').classList.remove('loading');
            document.querySelector('.game-stats__global--name').textContent = globalLevelData.name;
            document.querySelector('.game-stats__global--name').classList.remove('loading');
        })
}

function drawLeaderboard() {
    const table = createElement('table', {
        className: 'leaderboard-table',
        children: [
            createElement('tr', {
                children: [
                    createElement('th', {}, 'Level'),
                    createElement('th', {}, 'Score'),
                    createElement('th', {}, 'Player')
                ]
            })
        ]
    })
    document.querySelector('.leaderboard').append(table);
    fetch('https://5f103a9700d4ab00161349f0.mockapi.io/scores')
        .then(response => response.json())
        .then(data => {
            data.forEach(el => {
                let rowEl = createElement('tr', {
                    children: [
                        createElement('td', {}, `${el.level}x${el.level}`),
                        createElement('td', {}, el.score),
                        createElement('td', {}, el.name),
                    ]
                });
                table.append(rowEl);
            })
        })
}

function showHidePopup() {
    document.querySelector(`.${this.id}`).classList.toggle('hidden');
    document.querySelector(`.${this.id}`).classList.toggle('visible');
    document.querySelector('.container').classList.toggle('innactive');
}

// document.querySelector('#instructions').onclick = showHidePopup;
// document.querySelector('#leaderboard').addEventListener('click', function () {
//     showHidePopup.apply(this);
//     if (!document.querySelector('.leaderboard-table')) {
//         drawLeaderboard()
//     }
// });

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














// ---------------------ad-----------------------





const clickState = {};

document.addEventListener("click", (e) => {

    const item = e.target.closest(".level__enabled");

    if (!item) return;

    const id = item.dataset.id;

    // if (clickState[id] === undefined) {
    //     clickState[id] = true;
    // }

    if (!clickState[id]) {
        clickState[id] = 0;
    }

    clickState[id]++;

    if ((clickState[id] - 1) % 3 === 0) {


        // console.log("rrrrrr")

        // Adivery.requestRewardedAd("48ba78e2-81ee-4e9b-80f8-d43804c5152c").then(

        // Adivery.requestRewardedAd("8114bc56-83ca-4269-ae9e-cdc59a5f6370").then(
        //     (ad) => {
        //         console.log("Rewarded ad loaded");
        //         ad.show().then(
        //             (isRewarded) => {
        //                 if (isRewarded) {
        //                     console.log("Rewarded ad watched completely");
        //                 } else {
        //                     console.log("Rewarded ad closed without reward");
        //                 }
        //             },
        //             (err) => {
        //                 console.error("Failed to display rewarded ad", err);
        //             }
        //         );
        //     },
        //     (err) => {
        //         console.error("Failed to load rewarded ad", err);
        //     }
        // );

    }

    // clickState[id] = !clickState[id];

});
















// const items = document.querySelectorAll('[data-level="2"]');
// const items = document.querySelectorAll('.level__enabled');

// items.forEach(item => {
//     let allow = 0;

//     item.addEventListener("click", () => {

//         allow++;

//         if (allow % 2 === 1) {

// // Adivery.requestRewardedAd("48ba78e2-81ee-4e9b-80f8-d43804c5152c").then(
// Adivery.requestRewardedAd("8114bc56-83ca-4269-ae9e-cdc59a5f6370").then(
//     (ad) => {
//         console.log("Rewarded ad loaded");
//         ad.show().then(
//             (isRewarded) => {
//                 if (isRewarded) {
//                     console.log("Rewarded ad watched completely");
//                 } else {
//                     console.log("Rewarded ad closed without reward");
//                 }
//             },
//             (err) => {
//                 console.error("Failed to display rewarded ad", err);
//             }
//         );
//     },
//     (err) => {
//         console.error("Failed to load rewarded ad", err);
//     }
// );

//             // console.log("dfdf") 

//         }

//     });
// });