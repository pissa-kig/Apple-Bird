document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('intro-screen');
    const gameContainer = document.getElementById('game-container');
    const gridBoard = document.getElementById('grid-board');
    const canvas = document.getElementById('line-canvas');
    const ctx = canvas.getContext('2d');

    const connectedDisplay = document.getElementById('connected-display');
    const filledDisplay = document.getElementById('filled-display');
    const resetBtn = document.getElementById('reset-btn');
    const skipBtn = document.getElementById('skip-btn');

    // Info Modal Elements
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOkBtn = document.getElementById('modal-ok-btn');

    // 6x6 Constants
    const GRID_SIZE = 6;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
    const CELL_SIZE = 54;
    const GAP = 5;

    const PALETTE = [
        { id: 1, name: 'red', hex: '#ff3b30' },
        { id: 2, name: 'blue', hex: '#007aff' },
        { id: 3, name: 'yellow', hex: '#ffcc00' },
        { id: 4, name: 'green', hex: '#34c759' },
        { id: 5, name: 'orange', hex: '#ff9500' },
        { id: 6, name: 'purple', hex: '#af52de' },
        { id: 7, name: 'cyan', hex: '#5ac8fa' },
        { id: 8, name: 'pink', hex: '#ff2d55' }
    ];

    let activeColors = [];
    let currentLevel = 1;
    let endpoints = {}; 
    let userPaths = {}; 
    let activeColor = null;
    let isDrawing = false;

    // Splash Intro
    setTimeout(() => {
        introScreen.style.opacity = '0';
        setTimeout(() => {
            introScreen.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            initGame();
        }, 800);
    }, 2000);

    function initGame() {
        resizeCanvas();
        generatePerfectBoard();
        renderGrid();
        clearUserPaths();
        updateUI();
    }

    function resizeCanvas() {
        const boardSize = (GRID_SIZE * CELL_SIZE) + ((GRID_SIZE - 1) * GAP);
        canvas.width = boardSize;
        canvas.height = boardSize;
    }

    // Modal Control Handlers
    function openModal() {
        infoModal.classList.remove('hidden');
    }

    function closeModal() {
        infoModal.classList.add('hidden');
    }

    infoBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    modalOkBtn.addEventListener('click', closeModal);
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) closeModal();
    });

    // -------------------------------------------------------------
    // 1. BOARD GENERATOR
    // -------------------------------------------------------------
    function generatePerfectBoard() {
        let validLayout = false;

        while (!validLayout) {
            let masterPath = getHamiltonianPath();
            if (!masterPath) continue;

            let numColors = Math.floor(Math.random() * 3) + 5; // 5 to 7 colors
            activeColors = PALETTE.slice(0, numColors);

            let lengths = Array(numColors).fill(3);
            let remainingCells = TOTAL_CELLS - (numColors * 3);

            while (remainingCells > 0) {
                let randomIndex = Math.floor(Math.random() * numColors);
                lengths[randomIndex]++;
                remainingCells--;
            }

            let segments = [];
            let currIdx = 0;
            for (let i = 0; i < numColors; i++) {
                segments.push(masterPath.slice(currIdx, currIdx + lengths[i]));
                currIdx += lengths[i];
            }

            let tempEndpoints = {};
            let hasAdjacentPair = false;

            for (let i = 0; i < numColors; i++) {
                let colorId = activeColors[i].id;
                let seg = segments[i];
                let p1 = seg[0];
                let p2 = seg[seg.length - 1];

                const dist = Math.abs(p1.r - p2.r) + Math.abs(p1.c - p2.c);
                if (dist <= 1) {
                    hasAdjacentPair = true;
                    break;
                }

                tempEndpoints[colorId] = [p1, p2];
            }

            if (hasAdjacentPair) continue;

            let hasTrappedDot = false;
            Object.keys(tempEndpoints).forEach(cId => {
                tempEndpoints[cId].forEach(pt => {
                    let freeNeighbors = 0;
                    const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
                    
                    dirs.forEach(d => {
                        let nr = pt.r + d.r, nc = pt.c + d.c;
                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                            let isForeign = false;
                            Object.keys(tempEndpoints).forEach(otherId => {
                                if (otherId !== cId && tempEndpoints[otherId].some(p => p.r === nr && p.c === nc)) {
                                    isForeign = true;
                                }
                            });
                            if (!isForeign) freeNeighbors++;
                        }
                    });

                    if (freeNeighbors === 0) hasTrappedDot = true;
                });
            });

            if (!hasTrappedDot) {
                endpoints = tempEndpoints;
                validLayout = true;
            }
        }
    }

    function getHamiltonianPath() {
        let path = [];
        let visited = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(false));
        let maxIters = 4000, iters = 0;

        function dfs(r, c) {
            iters++;
            if (iters > maxIters) return false;

            path.push({r, c});
            visited[r][c] = true;

            if (path.length === TOTAL_CELLS) return true;

            let neighbors = getUnvisitedNeighbors(r, c, visited);
            
            neighbors.sort((a, b) => {
                let countA = getUnvisitedNeighbors(a.r, a.c, visited).length;
                let countB = getUnvisitedNeighbors(b.r, b.c, visited).length;
                if (countA === countB) return Math.random() - 0.5;
                return countA - countB;
            });

            for (let n of neighbors) {
                if (dfs(n.r, n.c)) return true;
            }

            path.pop();
            visited[r][c] = false;
            return false;
        }

        let startR = Math.floor(Math.random() * GRID_SIZE);
        let startC = Math.floor(Math.random() * GRID_SIZE);
        if (dfs(startR, startC)) return path;
        
        return null;
    }

    function getUnvisitedNeighbors(r, c, visited) {
        let n = [];
        const dirs = [{r: -1, c: 0}, {r: 1, c: 0}, {r: 0, c: -1}, {r: 0, c: 1}];
        for (let d of dirs) {
            let nr = r + d.r, nc = c + d.c;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && !visited[nr][nc]) {
                n.push({r: nr, c: nc});
            }
        }
        return n;
    }

    // -------------------------------------------------------------
    // 2. RENDERING & HELPERS
    // -------------------------------------------------------------
    function renderGrid() {
        gridBoard.innerHTML = '';
        gridBoard.appendChild(canvas);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;

                Object.keys(endpoints).forEach(colorId => {
                    const pts = endpoints[colorId];
                    if (pts.some(p => p.r === r && p.c === c)) {
                        const dot = document.createElement('div');
                        dot.classList.add('dot');
                        const color = activeColors.find(c => c.id == colorId);
                        dot.style.backgroundColor = color.hex;
                        dot.style.color = color.hex;
                        cell.appendChild(dot);
                    }
                });

                gridBoard.appendChild(cell);
            }
        }
    }

    function clearUserPaths() {
        userPaths = {};
        activeColors.forEach(c => { userPaths[c.id] = []; });
        drawPaths();
    }

    function isEndpointTile(cell) {
        for (let colorId of Object.keys(endpoints)) {
            if (endpoints[colorId].some(p => p.r === cell.r && p.c === cell.c)) {
                return true;
            }
        }
        return false;
    }

    function isOwnEndpoint(cell, currentColorId) {
        const pts = endpoints[currentColorId];
        return pts ? pts.some(p => p.r === cell.r && p.c === cell.c) : false;
    }

    // -------------------------------------------------------------
    // 3. USER INPUT
    // -------------------------------------------------------------
    function getCellFromCoords(x, y) {
        const rect = gridBoard.getBoundingClientRect();
        const relX = x - rect.left;
        const relY = y - rect.top;
        if (relX < 0 || relY < 0) return null;

        const c = Math.floor(relX / (CELL_SIZE + GAP));
        const r = Math.floor(relY / (CELL_SIZE + GAP));
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) return { r, c };
        return null;
    }

    function handleStart(e) {
        const coords = e.touches ? e.touches[0] : e;
        const cell = getCellFromCoords(coords.clientX, coords.clientY);
        if (!cell) return;

        Object.keys(endpoints).forEach(colorId => {
            const pts = endpoints[colorId];
            if (pts.some(p => p.r === cell.r && p.c === cell.c)) {
                activeColor = parseInt(colorId);
                isDrawing = true;
                userPaths[activeColor] = [cell];
                drawPaths();
            }
        });
    }

    function handleMove(e) {
        if (!isDrawing || !activeColor) return;
        const coords = e.touches ? e.touches[0] : e;
        const cell = getCellFromCoords(coords.clientX, coords.clientY);
        if (!cell) return;

        const currentPath = userPaths[activeColor];
        const lastCell = currentPath[currentPath.length - 1];
        
        if (currentPath.length >= 2) {
            const startPt = currentPath[0];
            const endPt = currentPath[currentPath.length - 1];
            if (isOwnEndpoint(startPt, activeColor) && isOwnEndpoint(endPt, activeColor) && (startPt.r !== endPt.r || startPt.c !== endPt.c)) {
                const backtrackIdx = currentPath.findIndex(p => p.r === cell.r && p.c === cell.c);
                if (backtrackIdx !== -1) {
                    userPaths[activeColor] = currentPath.slice(0, backtrackIdx + 1);
                    drawPaths();
                }
                return;
            }
        }

        if (lastCell.r === cell.r && lastCell.c === cell.c) return;

        if (isEndpointTile(cell) && !isOwnEndpoint(cell, activeColor)) return;

        const isOrthogonal = Math.abs(lastCell.r - cell.r) + Math.abs(lastCell.c - cell.c) === 1;
        if (isOrthogonal) {
            const existingIdx = currentPath.findIndex(p => p.r === cell.r && p.c === cell.c);
            if (existingIdx !== -1) {
                userPaths[activeColor] = currentPath.slice(0, existingIdx + 1);
            } else {
                removeIntersectingPaths(cell, activeColor);
                userPaths[activeColor].push(cell);
            }
            drawPaths();
        }
    }

    function handleEnd() {
        if (!isDrawing) return;
        isDrawing = false;
        activeColor = null;
        checkWinCondition();
    }

    function removeIntersectingPaths(cell, currentColorId) {
        Object.keys(userPaths).forEach(colorId => {
            if (parseInt(colorId) !== currentColorId) {
                const idx = userPaths[colorId].findIndex(p => p.r === cell.r && p.c === cell.c);
                if (idx !== -1) userPaths[colorId] = userPaths[colorId].slice(0, idx);
            }
        });
    }

    // -------------------------------------------------------------
    // 4. CANVAS RENDERING
    // -------------------------------------------------------------
    function drawPaths() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        Object.keys(userPaths).forEach(colorId => {
            const path = userPaths[colorId];
            if (path.length < 1) return;

            const color = activeColors.find(c => c.id == colorId);
            ctx.beginPath();
            ctx.strokeStyle = color.hex;
            ctx.lineWidth = 16; 
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            path.forEach((pt, idx) => {
                const x = pt.c * (CELL_SIZE + GAP) + CELL_SIZE / 2;
                const y = pt.r * (CELL_SIZE + GAP) + CELL_SIZE / 2;
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });

            ctx.stroke();
        });

        updateUI();
    }

    // -------------------------------------------------------------
    // 5. WIN CONDITION & UI UPDATES
    // -------------------------------------------------------------
    function checkWinCondition() {
        let connectedCount = 0;
        const totalColors = Object.keys(endpoints).length;
        const filledCells = new Set();

        Object.keys(endpoints).forEach(colorId => {
            const path = userPaths[colorId];
            const pts = endpoints[colorId];

            if (path && path.length >= 2) {
                const startMatch = (path[0].r === pts[0].r && path[0].c === pts[0].c) || (path[0].r === pts[1].r && path[0].c === pts[1].c);
                const endMatch = (path[path.length - 1].r === pts[0].r && path[path.length - 1].c === pts[0].c) || (path[path.length - 1].r === pts[1].r && path[path.length - 1].c === pts[1].c);

                if (startMatch && endMatch) connectedCount++;
                path.forEach(pt => filledCells.add(`${pt.r},${pt.c}`));
            }
        });

        const allTilesFilled = filledCells.size === TOTAL_CELLS;

        if (connectedCount === totalColors && totalColors > 0 && allTilesFilled) {
            setTimeout(() => {
                currentLevel++;
                initGame();
            }, 300);
        }
    }

    function updateUI() {
        let connectedCount = 0;
        const totalColors = Object.keys(endpoints).length;
        const filledCells = new Set();

        Object.keys(endpoints).forEach(colorId => {
            const path = userPaths[colorId];
            const pts = endpoints[colorId];

            if (path && path.length >= 2) {
                const startMatch = (path[0].r === pts[0].r && path[0].c === pts[0].c) || (path[0].r === pts[1].r && path[0].c === pts[1].c);
                const endMatch = (path[path.length - 1].r === pts[0].r && path[path.length - 1].c === pts[0].c) || (path[path.length - 1].r === pts[1].r && path[path.length - 1].c === pts[1].c);
                if (startMatch && endMatch) connectedCount++;
            }
            if (path) {
                path.forEach(pt => filledCells.add(`${pt.r},${pt.c}`));
            }
        });

        connectedDisplay.textContent = `${connectedCount}/${totalColors}`;
        filledDisplay.textContent = `${filledCells.size}/${TOTAL_CELLS}`;
    }

    // Event Handlers
    gridBoard.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    gridBoard.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    resetBtn.addEventListener('click', clearUserPaths);
    skipBtn.addEventListener('click', () => {
        currentLevel++;
        initGame();
    });
});