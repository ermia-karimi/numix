class Game {


    constructor(gameLevel, localGameDataObject, moves, board, options = {}) {

        this.container = document.querySelector('.board');
        this.gameLevel = gameLevel;
        this.START_BOARD_ARR = Game.generateStartBoard(this.gameLevel);
        this.isWin = false;
        this.localGameData = localGameDataObject;
        this.isDailyChallenge = !!options.dailyChallenge;
        this.dailyDate = options.dailyDate || null;

        this.board = board || this.createRandomBoard();
        this.move = this.move.bind(this);
        this.moveCount = moves || 0;
        this.startedAt = null;
        this.elapsedSeconds = 0;
        this.timerInterval = null;
        this.init(this.board);
        this.updateTimerDisplay();

        this.renderResultsTable(this.localGameData);

        document.querySelector('.game-stats').classList.remove('hidden');

        // document.querySelector('#save').addEventListener('click', () => {
        //     let boardExport = {};
        //     for (let key in this.board) {
        //         if (!this.board[key].props) {
        //             boardExport[key] = 'empty'
        //         } else {
        //             boardExport[key] = this.board[key].props.number;
        //         }
        //     }
        //     const gameProcess = {
        //         level: this.gameLevel,
        //         moves: this.moveCount,
        //         board: boardExport,
        //     }
        //     localStorage.setItem('gameProcess', JSON.stringify(gameProcess));
        //     document.querySelector('#load').disabled = false;
        //     event.target.classList.add('saved');
        //     setTimeout(() => document.querySelector('#save').classList.remove('saved'), 1000);
        // });
        this.boundMoveControls = this.moveControls.bind(this);
        this.swipes = new Hammer(this.container);
        this.swipes.get('swipe').set({ direction: Hammer.DIRECTION_ALL });
        this.swipes.on('swipeleft swiperight swipeup swipedown', this.boundMoveControls);
        document.addEventListener('keyup', this.boundMoveControls);
        // document.querySelector('#solve').disabled = false;

        // document.querySelector('#solve').addEventListener('click', () => {
        //     document.querySelector('.popupSolve').textContent = '';
        //     const elem = createElement('div', {
        //         className: 'popup',
        //         children: [
        //             createElement('div', {}, `Are you sure?`),
        //             createElement('input', {
        //                 type: 'button',
        //                 value: 'Yes, I\'m a loser',
        //             },),
        //             createElement('input', {
        //                 type: 'button',
        //                 value: 'No, I will try harder',
        //             },),
        //         ],
        //     }, '')

        //     elem.children[1].addEventListener('click', () => {
        //         elem.style.display = 'none';
        //         this.solve();
        //     });
        //     elem.children[2].onclick = () => {

        //         elem.style.display = 'none';
        //         document.body.classList.remove('innactive');
        //     }
        //     document.querySelector('.popupSolve').append(elem);
        //     document.body.classList.add('innactive');
        // })


        // document.querySelector('#load').addEventListener('click', () => {
        //     const loadedBoard = JSON.parse(localStorage.getItem('gameProcess'));
        //     this.isWin = true;
        //     startGame({
        //         level: loadedBoard.level,
        //         localGameDataObject: JSON.parse(localStorage.getItem('localGameData')),
        //         moves: loadedBoard.moves,
        //         board: loadedBoard.board,
        //     })
        // });

    }
    destroy() {
        this.isWin = true;
        this.stopTimer();
        if (this.boundMoveControls) {
            document.removeEventListener('keyup', this.boundMoveControls);
            this.boundMoveControls = null;
        }
        if (this.swipes) {
            this.swipes.destroy();
            this.swipes = null;
        }
    }

    static convertArrayToBoard(boardArray) {
        return boardArray.reduce((board, cell, idx) => {
            board[idx] = cell;
            return board;
        }, {});
    }
    static generateStartBoard(gameLevel) {
        let startBoardArr = [];

        for (let i = 1; i < gameLevel ** 2; i++) {
            startBoardArr.push(i);
        }
        startBoardArr.push('empty');

        return startBoardArr;
    }
    canBoardWin(array) {
        const isSolved = array.every((value, index) => value === this.START_BOARD_ARR[index]);
        if (isSolved) return false;

        let inversions = 0;
        for (let i = 0; i < array.length; i++) {
            if (array[i] === 'empty') continue;
            for (let j = i + 1; j < array.length; j++) {
                if (array[j] !== 'empty' && array[i] > array[j]) inversions++;
            }
        }

        const width = this.gameLevel;
        if (width % 2 === 1) return inversions % 2 === 0;
        const blankRowFromBottom = width - Math.floor(array.indexOf('empty') / width);
        return (inversions + blankRowFromBottom) % 2 === 1;
    }
    checkWin() {
        return this.START_BOARD_ARR
            .every((number, index) => this.board[index] !== 'empty' ? this.board[index].props.number === number : this.board[index] === number);
    }
    createRandomBoard() {
        const randomBoard = this.START_BOARD_ARR.slice();
        // Fisher-Yates gives an unbiased permutation before parity correction.
        for (let i = randomBoard.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [randomBoard[i], randomBoard[j]] = [randomBoard[j], randomBoard[i]];
        }

        if (!this.canBoardWin(randomBoard)) {
            if (randomBoard.every((value, index) => value === this.START_BOARD_ARR[index])) {
                // A single legal slide preserves solvability and avoids a pre-solved board.
                const empty = randomBoard.length - 1;
                [randomBoard[empty], randomBoard[empty - 1]] = [randomBoard[empty - 1], randomBoard[empty]];
            } else {
                // Swapping two numbered tiles flips permutation parity.
                const one = randomBoard.indexOf(1);
                const two = randomBoard.indexOf(2);
                [randomBoard[one], randomBoard[two]] = [randomBoard[two], randomBoard[one]];
                // The parity correction can exceptionally produce the solved arrangement.
                if (randomBoard.every((value, index) => value === this.START_BOARD_ARR[index])) {
                    const empty = randomBoard.length - 1;
                    [randomBoard[empty], randomBoard[empty - 1]] = [randomBoard[empty - 1], randomBoard[empty]];
                }
            }
        }
        return Game.convertArrayToBoard(randomBoard);
    }
    getIndex(number) {
        for (let index = 0; index < this.gameLevel ** 2; index++) {
            if (this.board[index] === 'empty') {
                if (number === 'empty') {
                    return index;
                }
            } else if (this.board[index].props.number === number) {
                return index;
            }
        }
    }
    getMoveData(number) {
        if (number === 'empty') return undefined;
        const currentIndex = this.getIndex(number),
            sublingsItems = this.getSiblingsIndex(currentIndex),
            possibleMove = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM']
                .find(direction => sublingsItems[direction] != null && this.board[sublingsItems[direction]] === 'empty');
        if (!possibleMove) {
            return;
        }
        return {
            direction: possibleMove,
            from: currentIndex,
            to: sublingsItems[possibleMove],
        };
    }
    getPosition(index) {
        return {
            row: Math.floor(index / this.gameLevel),
            cell: index % this.gameLevel,
        }
    }
    getSiblingsIndex(currentIndex) {
        const leftItemIndex = currentIndex % this.gameLevel === 0 ? null : currentIndex - 1,
            rightItemIndex = currentIndex % this.gameLevel === this.gameLevel - 1 ? null : currentIndex + 1,
            topItemIndex = currentIndex < this.gameLevel ? null : currentIndex - this.gameLevel,
            bottomItemIndex = currentIndex > this.gameLevel * (this.gameLevel - 1) - 1 ? null : currentIndex + this.gameLevel;
        return {
            LEFT: leftItemIndex,
            RIGHT: rightItemIndex,
            TOP: topItemIndex,
            BOTTOM: bottomItemIndex
        }
    }
    init(board) {
        const cells = [];

        for (let i = 0; i <= this.gameLevel ** 2 - 1; i++) {
            const number = board[i];

            if (number !== 'empty') {
                const cell = new Cell({
                    number,
                    onMove: this.move,
                }, this.container, this.gameLevel);

                this.board[i] = cell;
                cells.push(cell.element);
            } else {
                this.board[i] = number;
            }
        }
        this.render();
        render(cells, this.container);
    }
    moveControls(event) {
        let from;
        if (event.code === 'ArrowUp' || event.type === 'swipeup') from = 'BOTTOM';
        if (event.code === 'ArrowDown' || event.type === 'swipedown') from = 'TOP';
        if (event.code === 'ArrowLeft' || event.type === 'swipeleft') from = 'RIGHT';
        if (event.code === 'ArrowRight' || event.type === 'swiperight') from = 'LEFT';

        const emptyIndex = this.getIndex('empty'),
            siblings = this.getSiblingsIndex(emptyIndex);
        if (siblings[from] >= 0 && siblings[from] != null) {
            this.move(this.board[siblings[from]]);
        }
    }
    move(cell) {
        if (this.isWin) return;

        const moveData = this.getMoveData(cell.props.number);
        // Invalid taps must not change the move count or start the timer.
        if (!moveData) return;

        if (this.startedAt === null) this.startTimer();
        this.board[moveData.to] = cell;
        this.board[moveData.from] = 'empty';
        this.moveCount++;
        this.render();

        if (this.checkWin()) this.win();
    }

    formatTime(totalSeconds) {
        const seconds = Math.max(0, Math.floor(totalSeconds));
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    }

    getElapsedSeconds() {
        if (this.startedAt === null) return this.elapsedSeconds;
        return Math.floor((Date.now() - this.startedAt) / 1000);
    }

    updateTimerDisplay() {
        const timer = document.querySelector('#game-timer');
        if (timer) timer.textContent = this.formatTime(this.getElapsedSeconds());
    }

    startTimer() {
        if (this.startedAt !== null || this.isWin) return;
        this.startedAt = Date.now() - (this.elapsedSeconds * 1000);
        this.updateTimerDisplay();
        this.timerInterval = window.setInterval(() => this.updateTimerDisplay(), 250);
    }

    stopTimer() {
        if (this.startedAt !== null) this.elapsedSeconds = this.getElapsedSeconds();
        this.startedAt = null;
        if (this.timerInterval !== null) window.clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.updateTimerDisplay();
    }
    render() {
        for (let i = 0; i <= this.gameLevel ** 2 - 1; i++) {
            const Cell = this.board[i];

            if (Cell !== 'empty') {
                Cell.changeProps({
                    canMove: !!this.getMoveData(Cell.props.number),
                    position: this.getPosition(i),
                })
            }
        }
        document.querySelector('.game-stats__moves--value').textContent = this.moveCount;
    }
    renderResultsTable(resultsObject) {
        // document.querySelector('.game-stats__local--level').textContent = `${this.gameLevel}x${this.gameLevel}`;
        // document.querySelector('.game-stats__local--value').textContent = resultsObject[this.gameLevel].bestScore || '-';
        // Board appearance is controlled by the responsive theme stylesheet.
        // document.querySelector('.controls__main').style.color = "#000";
    }
    renderConsoleBoard() {
        let boardArray = [];
        for (let key in this.board) {
            if (!this.board[key].props) {
                boardArray.push('');
            } else {
                boardArray.push(this.board[key].props.number);
            }
        }

        let boardDim = Math.sqrt(boardArray.length);
        console.log('--- board ---');

        for (let row = 0; row < boardDim; row++) {
            let rowStr = '';
            for (let col = 0; col < boardDim; col++) {

                let el = boardArray[col + row * boardDim];

                if (el === "") {
                    rowStr += 'ee ';
                } else {
                    rowStr += el.toString().padStart(2, '0') + ' ';
                }
            }

            console.log(rowStr);
        }

    }

    solve() {

        let boardArray = [];
        for (let key in this.board) {
            if (!this.board[key].props) {
                boardArray.push('');
            } else {
                boardArray.push(this.board[key].props.number);
            }
        }
        let board2d = create2dArray(boardArray, Math.sqrt(boardArray.length));

        let solver = new NPuzzleSolver(board2d);
        let solution = solver.solve();

        let i = 0,
            solutionMoves = solution.length;

        function moveCellSolution() {
            // this.renderConsoleBoard();
            let boardArray = [];
            for (let key in this.board) {
                if (!this.board[key].props) {
                    boardArray.push('');
                } else {
                    boardArray.push(this.board[key].props.number);
                }
            }

            let element = boardArray.findIndex(el => el === solution[i].number);
            this.move(this.board[element]);
            i++;
            if (i < solutionMoves) {
                setTimeout(moveCellSolution.bind(this), 100);
            }

        }
        moveCellSolution.call(this);
    }
    win() {
        document.body.classList.remove('innactive');
        document.querySelector('.controls__main').classList.add('none');
        document.querySelector('.controls__game').classList.add('none');
        document.querySelector('.board').classList.add('board--game');
        this.destroy();

        const elapsed = this.elapsedSeconds;
        const levelData = this.localGameData[this.gameLevel] || (this.localGameData[this.gameLevel] = {});
        const isNewMoveRecord = !levelData.bestScore || this.moveCount < levelData.bestScore;
        const isNewTimeRecord = levelData.bestTime == null || elapsed < levelData.bestTime;
        let progression;
        let dailyBonus = 0;
        let dailyRecord = null;
        if (this.isDailyChallenge) {
            const dailyData = getDailyChallengeData();
            dailyRecord = dailyData[this.dailyDate] || (dailyData[this.dailyDate] = {});
            const isFirstCompletion = !dailyRecord.completed;
            const isNewDailyRecord = !dailyRecord.bestMoves || this.moveCount < dailyRecord.bestMoves || dailyRecord.bestTime == null || elapsed < dailyRecord.bestTime;
            dailyRecord.completed = true;
            dailyRecord.moves = this.moveCount;
            dailyRecord.time = elapsed;
            if (!dailyRecord.bestMoves || this.moveCount < dailyRecord.bestMoves) dailyRecord.bestMoves = this.moveCount;
            if (dailyRecord.bestTime == null || elapsed < dailyRecord.bestTime) dailyRecord.bestTime = elapsed;
            dailyData[this.dailyDate] = dailyRecord;
            safeStorageSet('numixDailyChallenge', dailyData);
            progression = isFirstCompletion ? awardPuzzleXP(this.gameLevel, elapsed, isNewDailyRecord) : { reward: 0, level: getPlayerLevel(getPlayerProgress().xp).level, newlyUnlocked: [] };
            if (isFirstCompletion) {
                dailyBonus = awardDailyChallengeBonus(this.dailyDate);
                updateDailyStreak(this.dailyDate);
            }
            renderDailyChallenge();
        } else {
            progression = awardPuzzleXP(this.gameLevel, elapsed, isNewMoveRecord || isNewTimeRecord);
        }

        if (!this.isDailyChallenge && this.gameLevel !== 9 && this.localGameData[`${this.gameLevel + 1}`]) {
            this.localGameData[`${this.gameLevel + 1}`].isAccessible = true;
        }
        if (!this.isDailyChallenge) {
            if (isNewMoveRecord) levelData.bestScore = this.moveCount;
            if (isNewTimeRecord) levelData.bestTime = elapsed;
            levelData.lastTime = elapsed;
            levelData.lastMoves = this.moveCount;
            safeStorageSet('localGameData', this.localGameData);
        }

        this.container.innerHTML = '';
        const result = createElement('div', {
            className: 'win',
            children: [
                createElement('div', { className: 'win-badge' }, '✦'),
                createElement('div', { className: 'win-title' }, this.isDailyChallenge ? 'Daily challenge complete!' : 'Puzzle complete!'),
                createElement('div', { className: 'win-subtitle' }, this.isDailyChallenge ? `You completed today’s shared challenge. ${getVisibleDailyStreak(this.dailyDate).current} day streak — come back tomorrow to keep it alive.` : (isNewMoveRecord || isNewTimeRecord ? 'New personal record — nicely done.' : 'Great work. Ready for another round?')),
                createElement('div', { className: 'win-xp-reward' }, `+${progression.reward + dailyBonus} XP  ·  Player Level ${progression.level}`),
                ...(progression.newlyUnlocked.length ? [createElement('div', { className: 'win-achievement-unlocked' }, `Achievement unlocked: ${progression.newlyUnlocked.join(', ')}`)] : []),
                createElement('div', {
                    className: 'win-results',
                    children: [
                        createElement('div', { className: 'win-result-card' , children: [
                            createElement('span', { className: 'win-result-label' }, 'MOVES'),
                            createElement('strong', { className: 'win-result-value' }, String(this.moveCount))
                        ]}),
                        createElement('div', { className: 'win-result-card', children: [
                            createElement('span', { className: 'win-result-label' }, 'TIME'),
                            createElement('strong', { className: 'win-result-value' }, this.formatTime(elapsed))
                        ]}),
                        createElement('div', { className: 'win-result-card', children: [
                            createElement('span', { className: 'win-result-label' }, 'BEST TIME'),
                            createElement('strong', { className: 'win-result-value' }, this.formatTime(this.isDailyChallenge ? dailyRecord.bestTime : levelData.bestTime))
                        ]})
                    ]
                }),
                createElement('div', {
                    className: 'win-controls',
                    children: [
                        createElement('button', { className: 'win-action win-controls__all', type: 'button' }, this.isDailyChallenge ? '⌂  Home' : '⌂  All levels'),
                        createElement('button', { className: 'win-action win-controls__retry', type: 'button' }, '↻  Play again')
                    ]
                })
            ]
        });

        result.querySelector('.win-controls__all').addEventListener('click', () => {
            this.destroy();
            renderGameLevels(this.localGameData, document.querySelector('.board'));
            document.querySelector('.game-stats').classList.add('hidden');
        });
        result.querySelector('.win-controls__retry').addEventListener('click', () => {
            startGame({ level: this.gameLevel, localGameDataObject: this.localGameData, ...(this.isDailyChallenge ? { board: createDailyChallengeBoard(this.dailyDate), dailyChallenge: true, dailyDate: this.dailyDate } : {}) });
        });
        render(result, this.container);
    }
}
