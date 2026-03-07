/* ============================================================
   TETRIS – Full game logic
   ============================================================ */

(() => {
    'use strict';

    // ---- Constants ------------------------------------------
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = 30;                       // px per cell
    const PREVIEW_BLOCK = 20;
    const LOCK_DELAY = 500;                 // ms
    const LINES_PER_LEVEL = 10;
    const SPEEDS = [
        800, 720, 630, 550, 470, 380, 300, 220, 140, 100,
        80, 80, 80, 70, 70, 70, 50, 50, 50, 30
    ];

    const COLORS = {
        I: '#00d4ff',
        O: '#fbbf24',
        T: '#a855f7',
        S: '#22c55e',
        Z: '#ef4444',
        J: '#3b82f6',
        L: '#f97316',
        ghost: 'rgba(255,255,255,0.08)',
        grid: 'rgba(255,255,255,0.03)',
    };

    // Tetromino shapes (rotation states)
    const SHAPES = {
        I: [[[0,0],[1,0],[2,0],[3,0]],  [[0,0],[0,1],[0,2],[0,3]],  [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]]],
        O: [[[0,0],[1,0],[0,1],[1,1]],   [[0,0],[1,0],[0,1],[1,1]],  [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]]],
        T: [[[0,0],[1,0],[2,0],[1,1]],   [[0,0],[0,1],[0,2],[1,1]],  [[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[0,1]]],
        S: [[[1,0],[2,0],[0,1],[1,1]],   [[0,0],[0,1],[1,1],[1,2]],  [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]]],
        Z: [[[0,0],[1,0],[1,1],[2,1]],   [[1,0],[0,1],[1,1],[0,2]],  [[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[0,2]]],
        J: [[[0,0],[0,1],[1,1],[2,1]],   [[0,0],[1,0],[0,1],[0,2]],  [[0,0],[1,0],[2,0],[2,1]], [[1,0],[1,1],[0,2],[1,2]]],
        L: [[[2,0],[0,1],[1,1],[2,1]],   [[0,0],[0,1],[0,2],[1,2]],  [[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[1,1],[1,2]]],
    };

    // Wall-kick offsets (SRS simplified)
    const KICKS = [
        [[ 0, 0],[-1, 0],[-1,-1],[ 0, 2],[-1, 2]],
        [[ 0, 0],[ 1, 0],[ 1, 1],[ 0,-2],[ 1,-2]],
        [[ 0, 0],[ 1, 0],[ 1,-1],[ 0, 2],[ 1, 2]],
        [[ 0, 0],[-1, 0],[-1, 1],[ 0,-2],[-1,-2]],
    ];

    // ---- DOM Refs -------------------------------------------
    const gameCanvas  = document.getElementById('game-canvas');
    const holdCanvas  = document.getElementById('hold-canvas');
    const nextCanvas  = document.getElementById('next-canvas');
    const overlay     = document.getElementById('overlay');
    const overlayText = document.getElementById('overlay-text');
    const scoreEl     = document.getElementById('score');
    const levelEl     = document.getElementById('level');
    const linesEl     = document.getElementById('lines');
    const ctx         = gameCanvas.getContext('2d');
    const holdCtx     = holdCanvas.getContext('2d');
    const nextCtx     = nextCanvas.getContext('2d');

    // ---- Game State -----------------------------------------
    let board, piece, heldPiece, canHold, bag, nextPieces;
    let score, level, totalLines;
    let dropTimer, lastDrop, lockTimer, gameOver, paused, started;
    let animatingRows = [];

    // ---- Board Helpers --------------------------------------
    function createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    function isValid(shape, offX, offY) {
        return shape.every(([x, y]) => {
            const nx = x + offX;
            const ny = y + offY;
            return nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !board[ny][nx];
        });
    }

    function lockPiece() {
        const shape = SHAPES[piece.type][piece.rot];
        shape.forEach(([x, y]) => {
            const bx = x + piece.x;
            const by = y + piece.y;
            if (by >= 0 && by < ROWS) board[by][bx] = piece.type;
        });
    }

    // ---- Bag & Piece Spawning -------------------------------
    function shuffleBag() {
        const types = Object.keys(SHAPES);
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        return types;
    }

    function refillBag() {
        if (bag.length < 7) bag.push(...shuffleBag());
    }

    function spawnPiece(type) {
        const shape = SHAPES[type][0];
        const minX = Math.min(...shape.map(s => s[0]));
        const maxX = Math.max(...shape.map(s => s[0]));
        const w = maxX - minX + 1;
        return { type, rot: 0, x: Math.floor((COLS - w) / 2) - minX, y: 0 };
    }

    function nextPiece() {
        refillBag();
        const type = bag.shift();
        piece = spawnPiece(type);
        // Refresh next queue
        refillBag();
        nextPieces = bag.slice(0, 3);

        if (!isValid(SHAPES[piece.type][piece.rot], piece.x, piece.y)) {
            endGame();
        }
        canHold = true;
        lockTimer = null;
    }

    // ---- Movement -------------------------------------------
    function move(dx, dy) {
        const shape = SHAPES[piece.type][piece.rot];
        if (isValid(shape, piece.x + dx, piece.y + dy)) {
            piece.x += dx;
            piece.y += dy;
            if (dy > 0) resetLock();
            return true;
        }
        return false;
    }

    function rotate() {
        const newRot = (piece.rot + 1) % 4;
        const shape = SHAPES[piece.type][newRot];
        // Try wall kicks
        const kicks = KICKS[piece.rot] || KICKS[0];
        for (const [kx, ky] of kicks) {
            if (isValid(shape, piece.x + kx, piece.y + ky)) {
                piece.x += kx;
                piece.y += ky;
                piece.rot = newRot;
                resetLock();
                return;
            }
        }
    }

    function hardDrop() {
        let dropped = 0;
        while (move(0, 1)) dropped++;
        score += dropped * 2;
        placePiece();
    }

    function resetLock() {
        lockTimer = null;
    }

    // ---- Ghost Piece ----------------------------------------
    function ghostY() {
        const shape = SHAPES[piece.type][piece.rot];
        let gy = piece.y;
        while (isValid(shape, piece.x, gy + 1)) gy++;
        return gy;
    }

    // ---- Hold -----------------------------------------------
    function hold() {
        if (!canHold) return;
        canHold = false;
        const prev = heldPiece;
        heldPiece = piece.type;
        if (prev) {
            piece = spawnPiece(prev);
        } else {
            nextPiece();
        }
    }

    // ---- Line Clearing --------------------------------------
    function clearLines() {
        const fullRows = [];
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(c => c !== null)) fullRows.push(r);
        }
        if (fullRows.length === 0) return;

        // Scoring
        const pts = [0, 100, 300, 500, 800];
        score += (pts[fullRows.length] || 800) * level;
        totalLines += fullRows.length;
        level = Math.floor(totalLines / LINES_PER_LEVEL) + 1;

        // Remove rows
        fullRows.forEach(r => {
            board.splice(r, 1);
            board.unshift(Array(COLS).fill(null));
        });

        updateHUD();
    }

    function placePiece() {
        lockPiece();
        clearLines();
        nextPiece();
        updateHUD();
    }

    // ---- Drawing --------------------------------------------
    function drawBlock(context, x, y, color, size) {
        const s = size;
        const inset = 2;
        // Outer
        context.fillStyle = color;
        context.fillRect(x * s, y * s, s, s);
        // Inner highlight
        context.fillStyle = 'rgba(255,255,255,0.15)';
        context.fillRect(x * s + inset, y * s + inset, s - inset * 2, s - inset * 2);
        // Top-left shine
        context.fillStyle = 'rgba(255,255,255,0.08)';
        context.fillRect(x * s + inset, y * s + inset, s - inset * 2, 3);
        // Border
        context.strokeStyle = 'rgba(0,0,0,0.3)';
        context.lineWidth = 1;
        context.strokeRect(x * s + 0.5, y * s + 0.5, s - 1, s - 1);
    }

    function drawBoard() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        // Grid lines
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath(); ctx.moveTo(x * BLOCK, 0); ctx.lineTo(x * BLOCK, ROWS * BLOCK); ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * BLOCK); ctx.lineTo(COLS * BLOCK, y * BLOCK); ctx.stroke();
        }

        // Locked blocks
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) drawBlock(ctx, c, r, COLORS[board[r][c]], BLOCK);
            }
        }

        if (!piece) return;

        // Ghost
        const gy = ghostY();
        const shape = SHAPES[piece.type][piece.rot];
        shape.forEach(([x, y]) => {
            ctx.fillStyle = COLORS.ghost;
            ctx.fillRect((x + piece.x) * BLOCK, (y + gy) * BLOCK, BLOCK, BLOCK);
        });

        // Active piece
        shape.forEach(([x, y]) => {
            drawBlock(ctx, x + piece.x, y + piece.y, COLORS[piece.type], BLOCK);
        });
    }

    function drawPreview(context, canvas, type) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (!type) return;
        const shape = SHAPES[type][0];
        const minX = Math.min(...shape.map(s => s[0]));
        const maxX = Math.max(...shape.map(s => s[0]));
        const minY = Math.min(...shape.map(s => s[1]));
        const maxY = Math.max(...shape.map(s => s[1]));
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const offX = (canvas.width / PREVIEW_BLOCK - w) / 2 - minX;
        const offY = (canvas.height / PREVIEW_BLOCK / (canvas === nextCanvas ? 3 : 1) - h) / 2 - minY;
        shape.forEach(([x, y]) => {
            drawBlock(context, x + offX, y + offY, COLORS[type], PREVIEW_BLOCK);
        });
    }

    function drawNextQueue() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (!nextPieces) return;
        nextPieces.forEach((type, i) => {
            const shape = SHAPES[type][0];
            const minX = Math.min(...shape.map(s => s[0]));
            const maxX = Math.max(...shape.map(s => s[0]));
            const minY = Math.min(...shape.map(s => s[1]));
            const maxY = Math.max(...shape.map(s => s[1]));
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            const offX = (nextCanvas.width / PREVIEW_BLOCK - w) / 2 - minX;
            const offY = i * 5 + (5 - h) / 2 - minY;
            shape.forEach(([x, y]) => {
                drawBlock(nextCtx, x + offX, y + offY, COLORS[type], PREVIEW_BLOCK);
            });
        });
    }

    function updateHUD() {
        scoreEl.textContent = score.toLocaleString();
        levelEl.textContent = level;
        linesEl.textContent = totalLines;
    }

    // ---- Game Loop ------------------------------------------
    function getSpeed() {
        return SPEEDS[Math.min(level - 1, SPEEDS.length - 1)];
    }

    function gameLoop(timestamp) {
        if (gameOver || paused) return;

        if (!lastDrop) lastDrop = timestamp;
        const delta = timestamp - lastDrop;

        if (delta > getSpeed()) {
            if (!move(0, 1)) {
                // Start lock delay
                if (lockTimer === null) {
                    lockTimer = timestamp;
                } else if (timestamp - lockTimer > LOCK_DELAY) {
                    placePiece();
                    lockTimer = null;
                }
            } else {
                lockTimer = null;
            }
            lastDrop = timestamp;
        }

        drawBoard();
        drawPreview(holdCtx, holdCanvas, heldPiece);
        drawNextQueue();

        dropTimer = requestAnimationFrame(gameLoop);
    }

    // ---- Start / End ----------------------------------------
    function startGame() {
        board = createBoard();
        bag = shuffleBag();
        nextPieces = [];
        heldPiece = null;
        score = 0;
        level = 1;
        totalLines = 0;
        gameOver = false;
        paused = false;
        started = true;
        lastDrop = null;
        lockTimer = null;

        overlay.classList.add('hidden');
        updateHUD();
        nextPiece();
        dropTimer = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameOver = true;
        cancelAnimationFrame(dropTimer);
        overlayText.textContent = `GAME OVER — Score: ${score.toLocaleString()}  |  Press ENTER`;
        overlay.classList.remove('hidden');
    }

    function togglePause() {
        if (gameOver || !started) return;
        paused = !paused;
        if (paused) {
            cancelAnimationFrame(dropTimer);
            overlayText.textContent = 'PAUSED';
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
            lastDrop = null;
            dropTimer = requestAnimationFrame(gameLoop);
        }
    }

    // ---- Input Handling -------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!started || gameOver) { startGame(); return; }
        }
        if (!started || gameOver) return;
        if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
        if (paused) return;

        switch (e.key) {
            case 'ArrowLeft':  move(-1, 0); break;
            case 'ArrowRight': move(1, 0);  break;
            case 'ArrowDown':  if (move(0, 1)) score += 1; break;
            case 'ArrowUp':    rotate();     break;
            case ' ':          hardDrop();   break;
            case 'c': case 'C': hold();      break;
        }
        e.preventDefault();
    });

    // ---- Initial Draw ---------------------------------------
    drawBoard();
})();
