document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('highScore');
    const levelElement = document.getElementById('level');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const gameOverlay = document.getElementById('gameOverlay');
    const finalScoreElement = document.getElementById('finalScore');
    const announcementsElement = document.getElementById('announcements');
    
    // Theme and settings elements
    const themeToggle = document.getElementById('themeToggle');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');
    const saveSettings = document.getElementById('saveSettings');
    
    // Touch controls
    const touchControls = document.querySelectorAll('.touch-btn');
    
    // Game settings
    let gameSettings = {
        difficulty: 'medium',
        gridSize: 'medium',
        soundEnabled: true,
        vibrationEnabled: false
    };
    
    // Load settings from localStorage with error handling
    try {
        const savedSettings = localStorage.getItem('snakeGameSettings');
        if (savedSettings) {
            gameSettings = { ...gameSettings, ...JSON.parse(savedSettings) };
        }
    } catch (error) {
        console.warn('Failed to load game settings:', error);
    }
    
    // Apply saved theme with error handling
    try {
        const savedTheme = localStorage.getItem('snakeGameTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } catch (error) {
        console.warn('Failed to load theme:', error);
        document.documentElement.setAttribute('data-theme', 'light');
        updateThemeIcon('light');
    }
    
    // Game state
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let score = 0;
    let level = 1;
    let highScore = 0;
    try {
        const savedHighScore = localStorage.getItem('snakeHighScore');
        highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
    } catch (error) {
        console.warn('Failed to load high score:', error);
        highScore = 0;
    }
    let gameInterval;
    let gameSpeed = 150;
    let isGameRunning = false;
    let isPaused = false;
    let gameOver = false;
    
    // Touch/swipe handling
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let isGameActive = false;
    
    // Performance optimization
    let lastFrameTime = 0;
    let frameId;
    
    // Initialize high score from localStorage
    highScoreElement.textContent = highScore;
    
    // Initialize game
    function initGame() {
        // Reset game state
        snake = [
            {x: 5, y: 10},
            {x: 4, y: 10},
            {x: 3, y: 10}
        ];
        direction = 'right';
        nextDirection = 'right';
        score = 0;
        level = 1;
        scoreElement.textContent = score;
        levelElement.textContent = level;
        gameOver = false;
        isPaused = false;
        
        // Update game speed based on difficulty
        updateGameSpeed();
        
        // Generate initial food
        generateFood();
        
        // Draw initial state
        draw();
        
        // Update button states
        updateButtonStates();
        
        // Announce game start
        announce('Game initialized. Press start to begin.');
    }
    
    // Update game speed based on difficulty
    function updateGameSpeed() {
        switch (gameSettings.difficulty) {
            case 'easy':
                gameSpeed = 200;
                break;
            case 'medium':
                gameSpeed = 150;
                break;
            case 'hard':
                gameSpeed = 100;
                break;
        }
    }
    
    // Update button states
    function updateButtonStates() {
        startBtn.disabled = isGameRunning;
        pauseBtn.disabled = !isGameRunning;
        resetBtn.disabled = isGameRunning && !gameOver;
        pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    }
    
    // Generate food at random position
    function generateFood() {
        let foodX, foodY;
        let validPosition = false;
        
        while (!validPosition) {
            foodX = Math.floor(Math.random() * getGridWidth());
            foodY = Math.floor(Math.random() * getGridHeight());
            
            // Check if food position overlaps with snake
            validPosition = true;
            for (let segment of snake) {
                if (segment.x === foodX && segment.y === foodY) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        food = {
            x: foodX,
            y: foodY,
            color: getRandomFoodColor()
        };
    }
    
    // Get grid dimensions based on settings
    function getGridWidth() {
        const gridSize = 20; // Base grid size
        return Math.floor(canvas.width / gridSize);
    }
    
    function getGridHeight() {
        const gridSize = 20; // Base grid size
        return Math.floor(canvas.height / gridSize);
    }
    
    // Get random color for food
    function getRandomFoodColor() {
        const colors = ['#e74c3c', '#f39c12', '#9b59b6', '#3498db', '#2ecc71'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Update game state
    function update() {
        if (gameOver || isPaused) return;
        
        // Update direction
        direction = nextDirection;
        
        // Create new head based on current direction
        const head = {x: snake[0].x, y: snake[0].y};
        
        switch (direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }
        
        // Check for collisions
        if (checkCollision(head)) {
            endGame();
            return;
        }
        
        // Add new head to snake
        snake.unshift(head);
        
        // Check if snake ate food
        if (head.x === food.x && head.y === food.y) {
            // Increase score
            score += 10;
            scoreElement.textContent = score;
            
            // Check for level up
            const newLevel = Math.floor(score / 100) + 1;
            if (newLevel > level) {
                level = newLevel;
                levelElement.textContent = level;
                announce(`Level up! Now at level ${level}`);
                
                // Increase speed slightly
                if (gameSpeed > 50) {
                    gameSpeed -= 5;
                    if (isGameRunning) {
                        clearInterval(gameInterval);
                        gameInterval = setInterval(gameLoop, gameSpeed);
                    }
                }
            }
            
            // Update high score if needed
            if (score > highScore) {
                highScore = score;
                highScoreElement.textContent = highScore;
                try {
                    localStorage.setItem('snakeHighScore', highScore);
                } catch (error) {
                    console.warn('Failed to save high score:', error);
                }
                announce('New high score!');
            }
            
            // Play sound effect
            if (gameSettings.soundEnabled) {
                playSound('eat');
            }
            
            // Vibrate on mobile
            if (gameSettings.vibrationEnabled && navigator.vibrate) {
                try {
                    navigator.vibrate(50);
                } catch (error) {
                    console.warn('Vibration failed:', error);
                }
            }
            
            // Generate new food
            generateFood();
        } else {
            // Remove tail if snake didn't eat food
            snake.pop();
        }
    }
    
    // Check for collisions
    function checkCollision(head) {
        // Check wall collision
        if (head.x < 0 || head.x >= getGridWidth() || head.y < 0 || head.y >= getGridHeight()) {
            return true;
        }
        
        // Check self collision (skip the last segment as it will be removed)
        for (let i = 0; i < snake.length - 1; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    // Draw game elements
    function draw() {
        const gridSize = 20;
        
        // Clear canvas
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-tertiary') || '#3a704d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw grid pattern
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        
        // Draw vertical grid lines
        for (let x = 0; x <= canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Draw snake body segments with curved connections
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            
            // Gradient color for body
            const greenValue = Math.floor(200 - (i * 2));
            ctx.fillStyle = `rgb(0, ${Math.max(greenValue, 120)}, 0)`;
            
            // Draw rounded segment
            ctx.beginPath();
            ctx.roundRect(
                segment.x * gridSize + 1,
                segment.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2,
                i === 0 ? 3 : 5
            );
            ctx.fill();
            
            // Add scale pattern to body segments (not head)
            if (i > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.beginPath();
                ctx.ellipse(
                    segment.x * gridSize + gridSize / 2,
                    segment.y * gridSize + gridSize / 2,
                    gridSize / 4,
                    gridSize / 6,
                    0,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }
        }
        
        // Draw snake head with eyes and tongue
        if (snake.length > 0) {
            const head = snake[0];
            
            // Draw head
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.roundRect(
                head.x * gridSize + 1,
                head.y * gridSize + 1,
                gridSize - 2,
                gridSize - 2,
                3
            );
            ctx.fill();
            
            // Calculate eye positions based on direction
            let leftEyeX, leftEyeY, rightEyeX, rightEyeY;
            let tongueStartX, tongueStartY, tongueMidX, tongueMidY, tongueEnd1X, tongueEnd1Y, tongueEnd2X, tongueEnd2Y;
            
            switch (direction) {
                case 'up':
                    leftEyeX = head.x * gridSize + gridSize / 4;
                    leftEyeY = head.y * gridSize + gridSize / 3;
                    rightEyeX = head.x * gridSize + gridSize * 3/4;
                    rightEyeY = head.y * gridSize + gridSize / 3;
                    tongueStartX = head.x * gridSize + gridSize / 2;
                    tongueStartY = head.y * gridSize;
                    tongueMidX = tongueStartX;
                    tongueMidY = tongueStartY - gridSize / 4;
                    tongueEnd1X = tongueMidX - gridSize / 6;
                    tongueEnd1Y = tongueMidY - gridSize / 6;
                    tongueEnd2X = tongueMidX + gridSize / 6;
                    tongueEnd2Y = tongueMidY - gridSize / 6;
                    break;
                case 'down':
                    leftEyeX = head.x * gridSize + gridSize / 4;
                    leftEyeY = head.y * gridSize + gridSize * 2/3;
                    rightEyeX = head.x * gridSize + gridSize * 3/4;
                    rightEyeY = head.y * gridSize + gridSize * 2/3;
                    tongueStartX = head.x * gridSize + gridSize / 2;
                    tongueStartY = head.y * gridSize + gridSize;
                    tongueMidX = tongueStartX;
                    tongueMidY = tongueStartY + gridSize / 4;
                    tongueEnd1X = tongueMidX - gridSize / 6;
                    tongueEnd1Y = tongueMidY + gridSize / 6;
                    tongueEnd2X = tongueMidX + gridSize / 6;
                    tongueEnd2Y = tongueMidY + gridSize / 6;
                    break;
                case 'left':
                    leftEyeX = head.x * gridSize + gridSize / 3;
                    leftEyeY = head.y * gridSize + gridSize / 4;
                    rightEyeX = head.x * gridSize + gridSize / 3;
                    rightEyeY = head.y * gridSize + gridSize * 3/4;
                    tongueStartX = head.x * gridSize;
                    tongueStartY = head.y * gridSize + gridSize / 2;
                    tongueMidX = tongueStartX - gridSize / 4;
                    tongueMidY = tongueStartY;
                    tongueEnd1X = tongueMidX - gridSize / 6;
                    tongueEnd1Y = tongueMidY - gridSize / 6;
                    tongueEnd2X = tongueMidX - gridSize / 6;
                    tongueEnd2Y = tongueMidY + gridSize / 6;
                    break;
                case 'right':
                    leftEyeX = head.x * gridSize + gridSize * 2/3;
                    leftEyeY = head.y * gridSize + gridSize / 4;
                    rightEyeX = head.x * gridSize + gridSize * 2/3;
                    rightEyeY = head.y * gridSize + gridSize * 3/4;
                    tongueStartX = head.x * gridSize + gridSize;
                    tongueStartY = head.y * gridSize + gridSize / 2;
                    tongueMidX = tongueStartX + gridSize / 4;
                    tongueMidY = tongueStartY;
                    tongueEnd1X = tongueMidX + gridSize / 6;
                    tongueEnd1Y = tongueMidY - gridSize / 6;
                    tongueEnd2X = tongueMidX + gridSize / 6;
                    tongueEnd2Y = tongueMidY + gridSize / 6;
                    break;
            }
            
            // Draw eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, gridSize / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, gridSize / 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw pupils
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(leftEyeX, leftEyeY, gridSize / 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rightEyeX, rightEyeY, gridSize / 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw tongue (only when moving and not every frame)
            if (isGameRunning && Math.random() < 0.3) {
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tongueStartX, tongueStartY);
                ctx.lineTo(tongueMidX, tongueMidY);
                ctx.stroke();
                
                // Forked tongue
                ctx.beginPath();
                ctx.moveTo(tongueMidX, tongueMidY);
                ctx.lineTo(tongueEnd1X, tongueEnd1Y);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(tongueMidX, tongueMidY);
                ctx.lineTo(tongueEnd2X, tongueEnd2Y);
                ctx.stroke();
            }
        }
        
        // Draw food (apple)
        const foodX = food.x * gridSize + gridSize / 2;
        const foodY = food.y * gridSize + gridSize / 2;
        
        // Apple body
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(foodX, foodY, gridSize / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Apple highlight
        ctx.fillStyle = '#f8d7da';
        ctx.beginPath();
        ctx.ellipse(
            foodX - gridSize / 6,
            foodY - gridSize / 6,
            gridSize / 10,
            gridSize / 6,
            Math.PI / 4,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Apple stem
        ctx.strokeStyle = '#795548';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(foodX, foodY - gridSize / 2 + 2);
        ctx.lineTo(foodX, foodY - gridSize / 2 - 3);
        ctx.stroke();
        
        // Leaf
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(
            foodX + gridSize / 8,
            foodY - gridSize / 2,
            gridSize / 8,
            gridSize / 12,
            Math.PI / 4,
            0,
            Math.PI * 2
        );
        ctx.fill();
        
        // Draw pause overlay
        if (isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.font = '30px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
        }
    }
    
    // Game loop with performance optimization
    function gameLoop(currentTime) {
        if (currentTime - lastFrameTime >= gameSpeed) {
            update();
            draw();
            lastFrameTime = currentTime;
        }
        
        if (isGameRunning) {
            frameId = requestAnimationFrame(gameLoop);
        }
    }
    
    // Start game
    function startGame() {
        if (isGameRunning) return;
        
        // Initialize audio context on first user interaction
        if (gameSettings.soundEnabled) {
            initAudioContext();
        }
        
        // Hide game over overlay if it's showing
        gameOverlay.classList.remove('show');
        gameOverlay.setAttribute('aria-hidden', 'true');
        
        initGame();
        isGameRunning = true;
        isGameActive = true;
        updateGameSpeed();
        lastFrameTime = 0;
        frameId = requestAnimationFrame(gameLoop);
        
        // Prevent page scrolling during gameplay
        document.body.classList.add('game-active');
        
        updateButtonStates();
        announce('Game started!');
    }
    
    // Pause/Resume game
    function togglePause() {
        if (!isGameRunning) return;
        
        isPaused = !isPaused;
        updateButtonStates();
        
        if (isPaused) {
            announce('Game paused');
        } else {
            announce('Game resumed');
            lastFrameTime = performance.now();
            frameId = requestAnimationFrame(gameLoop);
        }
    }
    
    // End game
    function endGame() {
        gameOver = true;
        isGameRunning = false;
        isPaused = false;
        isGameActive = false;
        
        if (frameId) {
            cancelAnimationFrame(frameId);
        }
        
        // Re-enable page scrolling
        document.body.classList.remove('game-active');
        
        updateButtonStates();
        
        // Show game over overlay
        finalScoreElement.textContent = score;
        gameOverlay.classList.add('show');
        gameOverlay.setAttribute('aria-hidden', 'false');
        
        // Play game over sound
        if (gameSettings.soundEnabled) {
            playSound('gameOver');
        }
        
        // Vibrate on mobile
        if (gameSettings.vibrationEnabled && navigator.vibrate) {
            try {
                navigator.vibrate([200, 100, 200]);
            } catch (error) {
                console.warn('Vibration failed:', error);
            }
        }
        
        announce(`Game over! Final score: ${score}`);
        
        // Draw final state
        draw();
    }
    
    // Reset game
    function resetGame() {
        if (frameId) {
            cancelAnimationFrame(frameId);
        }
        initGame();
        isGameRunning = false;
        isPaused = false;
        isGameActive = false;
        
        // Re-enable page scrolling
        document.body.classList.remove('game-active');
        
        // Hide game over overlay
        gameOverlay.classList.remove('show');
        gameOverlay.setAttribute('aria-hidden', 'true');
        
        updateButtonStates();
        announce('Game reset');
    }
    
    // Play again
    function playAgain() {
        resetGame();
        startGame();
    }
    
    // Theme management
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        try {
            localStorage.setItem('snakeGameTheme', newTheme);
        } catch (error) {
            console.warn('Failed to save theme:', error);
        }
        updateThemeIcon(newTheme);
        
        announce(`Switched to ${newTheme} theme`);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Settings management
    function openSettings() {
        settingsModal.classList.add('show');
        settingsModal.setAttribute('aria-hidden', 'false');
        
        // Populate current settings
        document.getElementById('difficulty').value = gameSettings.difficulty;
        document.getElementById('gridSize').value = gameSettings.gridSize;
        document.getElementById('soundEnabled').checked = gameSettings.soundEnabled;
        document.getElementById('vibrationEnabled').checked = gameSettings.vibrationEnabled;
    }
    
    function closeSettingsModal() {
        settingsModal.classList.remove('show');
        settingsModal.setAttribute('aria-hidden', 'true');
    }
    
    function saveGameSettings() {
        gameSettings.difficulty = document.getElementById('difficulty').value;
        gameSettings.gridSize = document.getElementById('gridSize').value;
        gameSettings.soundEnabled = document.getElementById('soundEnabled').checked;
        gameSettings.vibrationEnabled = document.getElementById('vibrationEnabled').checked;
        
        try {
            localStorage.setItem('snakeGameSettings', JSON.stringify(gameSettings));
            announce('Settings saved');
        } catch (error) {
            console.warn('Failed to save settings:', error);
            announce('Settings saved locally (not persistent)');
        }
        
        closeSettingsModal();
        
        // Update game speed if difficulty changed
        updateGameSpeed();
    }
    
    // Sound effects with proper audio context management
    let audioContext = null;
    
    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.warn('Web Audio API not supported:', error);
                return false;
            }
        }
        
        // Resume audio context if suspended (required for mobile)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        return true;
    }
    
    function playSound(type) {
        if (!gameSettings.soundEnabled) return;
        
        if (!initAudioContext()) return;
        
        try {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch (type) {
                case 'eat':
                    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'gameOver':
                    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.5);
                    break;
            }
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    }
    
    // Accessibility announcements
    function announce(message) {
        announcementsElement.textContent = message;
        setTimeout(() => {
            announcementsElement.textContent = '';
        }, 1000);
    }
    
    // Touch and swipe handling
    function handleTouchStart(e) {
        if (!isGameActive) return;
        
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
    
    function handleTouchMove(e) {
        if (!isGameActive) return;
        
        // Prevent page scrolling during gameplay
        e.preventDefault();
    }
    
    function handleTouchEnd(e) {
        if (!isGameActive) return;
        
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        handleSwipe();
    }
    
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0 && direction !== 'left') {
                    nextDirection = 'right';
                } else if (deltaX < 0 && direction !== 'right') {
                    nextDirection = 'left';
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0 && direction !== 'up') {
                    nextDirection = 'down';
                } else if (deltaY < 0 && direction !== 'down') {
                    nextDirection = 'up';
                }
            }
        }
    }
    
    // Event listeners
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', playAgain);
    
    // Theme and settings
    themeToggle.addEventListener('click', toggleTheme);
    settingsBtn.addEventListener('click', openSettings);
    closeSettings.addEventListener('click', closeSettingsModal);
    saveSettings.addEventListener('click', saveGameSettings);
    
    // Touch controls
    touchControls.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newDirection = e.currentTarget.getAttribute('data-direction');
            if (newDirection && newDirection !== getOppositeDirection(direction)) {
                nextDirection = newDirection;
            }
        });
    });
    
    // Touch events for swipe
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Prevent scrolling on the entire game container during gameplay
    const gameContainer = document.querySelector('.game-container');
    gameContainer.addEventListener('touchmove', (e) => {
        if (isGameActive) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        // Prevent default behavior for arrow keys and space
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
            event.preventDefault();
        }
        
        switch (event.key) {
            case 'ArrowUp':
                if (direction !== 'down') nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (direction !== 'up') nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (direction !== 'right') nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (direction !== 'left') nextDirection = 'right';
                break;
            case ' ':
                if (isGameRunning) {
                    togglePause();
                } else if (!gameOver) {
                    startGame();
                }
                break;
            case 'Escape':
                if (settingsModal.classList.contains('show')) {
                    closeSettingsModal();
                } else if (isGameRunning) {
                    togglePause();
                }
                break;
        }
    });
    
    // Helper function to get opposite direction
    function getOppositeDirection(dir) {
        const opposites = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        return opposites[dir];
    }
    
    // Canvas focus for keyboard accessibility
    canvas.addEventListener('click', () => {
        canvas.focus();
    });
    
    // Modal click outside to close
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });
    
    // Responsive canvas sizing with high-DPI support
    function resizeCanvas() {
        const container = canvas.parentElement;
        const maxWidth = Math.min(400, container.clientWidth - 40);
        const maxHeight = Math.min(400, window.innerHeight * 0.4);
        const size = Math.min(maxWidth, maxHeight);
        
        // Get device pixel ratio for crisp rendering on high-DPI displays
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Set display size
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        
        // Set actual canvas size (scaled for device pixel ratio)
        canvas.width = size * devicePixelRatio;
        canvas.height = size * devicePixelRatio;
        
        // Scale the drawing context to match device pixel ratio
        ctx.scale(devicePixelRatio, devicePixelRatio);
        
        // Redraw if game is initialized
        if (snake.length > 0) {
            draw();
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize everything
    resizeCanvas();
    initGame();
    updateButtonStates();
    
    // Show touch controls on mobile
    if ('ontouchstart' in window) {
        document.querySelector('.touch-controls').style.display = 'block';
    }
    
    // Service Worker registration for PWA features
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch((error) => {
            console.warn('Service Worker registration failed:', error);
        });
    }
});