// 게임 설정
const INITIAL_ALTITUDE = 52300; // 시작 높이 (미터)
const INITIAL_SPEED = 100; // 초기 하강 속도 (미터/초)

// 게임 상태
let gameState = {
    altitude: INITIAL_ALTITUDE,
    score: 0,
    lives: 3,
    speed: INITIAL_SPEED,
    gameRunning: true,
    speedMultiplier: 1,
    slowDownTimer: 0,
};

// DOM 요소
const gameArea = document.querySelector('.game-area');
const player = document.getElementById('player');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreList = document.getElementById('scoreList');
const cloudsContainer = document.getElementById('cloudsContainer');

// 기록 배열
let highScores = JSON.parse(localStorage.getItem('koalaScores')) || [];

// 플레이어 위치
let playerX = gameArea.clientWidth / 2 - 30;
let playerY = 100;

// 키 입력 상태 추적
const keyStates = {};

// 구름 생성
function createClouds() {
    for (let i = 0; i < 8; i++) {
        const cloud = document.createElement('div');
        cloud.className = 'cloud';
        cloud.style.width = (60 + Math.random() * 80) + 'px';
        cloud.style.height = (30 + Math.random() * 30) + 'px';
        cloud.style.left = Math.random() * 100 + '%';
        cloud.style.top = Math.random() * 80 + '%';
        cloud.style.animation = `float ${30 + Math.random() * 20}s linear infinite`;
        cloudsContainer.appendChild(cloud);
    }

    // CSS 애니메이션 추가
    if (!document.querySelector('style[data-clouds]')) {
        const style = document.createElement('style');
        style.setAttribute('data-clouds', 'true');
        style.innerHTML = `
            @keyframes float {
                0% { transform: translateX(-100px); }
                100% { transform: translateX(100vw); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 장애물 생성
function createObstacle() {
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    
    const types = ['meteor', 'banana', 'heart'];
    const type = types[Math.floor(Math.random() * types.length)];
    obstacle.classList.add(type);
    
    let emoji;
    if (type === 'meteor') {
        emoji = '☄️';
    } else if (type === 'banana') {
        emoji = '🍌';
    } else {
        emoji = '❤️';
    }
    
    obstacle.textContent = emoji;
    obstacle.style.left = Math.random() * (gameArea.clientWidth - 50) + 'px';
    obstacle.style.top = '-60px';
    obstacle.dataset.type = type;
    
    gameArea.appendChild(obstacle);
    
    return {
        element: obstacle,
        x: parseFloat(obstacle.style.left),
        y: -60,
        type: type
    };
}

let obstacles = [];

// 게임 루프
function gameLoop() {
    if (!gameState.gameRunning) return;

    // 속도 업데이트
    gameState.speed = INITIAL_SPEED + (INITIAL_ALTITUDE - gameState.altitude) * 0.0005;
    gameState.speed *= gameState.speedMultiplier;

    // 높이 감소
    gameState.altitude -= gameState.speed * 0.016;
    gameState.score = INITIAL_ALTITUDE - gameState.altitude;

    if (gameState.altitude < 0) {
        endGame();
        return;
    }

    // 속도 저하 해제 확인
    gameState.slowDownTimer -= 0.016;
    if (gameState.slowDownTimer <= 0) {
        gameState.speedMultiplier = 1;
    }

    // 플레이어 이동
    if (keyStates['ArrowLeft'] || keyStates['a'] || keyStates['A']) {
        playerX = Math.max(0, playerX - 7);
    }
    if (keyStates['ArrowRight'] || keyStates['d'] || keyStates['D']) {
        playerX = Math.min(gameArea.clientWidth - 60, playerX + 7);
    }

    player.style.left = playerX + 'px';
    player.style.top = playerY + 'px';

    // 장애물 생성
    if (Math.random() < 0.02) {
        obstacles.push(createObstacle());
    }

    // 장애물 업데이트
    obstacles = obstacles.filter(obs => {
        obs.y += gameState.speed * gameState.speedMultiplier * 0.016;
        obs.element.style.top = obs.y + 'px';

        // 충돌 감지
        if (checkCollision(playerX, playerY, obs.x, obs.y)) {
            handleCollision(obs.type);
            obs.element.remove();
            return false;
        }

        // 화면 밖으로 나가면 제거
        if (obs.y > gameArea.clientHeight) {
            obs.element.remove();
            return false;
        }

        return true;
    });

    // UI 업데이트
    updateUI();

    // 다음 프레임
    requestAnimationFrame(gameLoop);
}

// 충돌 감지
function checkCollision(px, py, ox, oy) {
    const playerWidth = 60;
    const playerHeight = 60;
    const obstacleWidth = 50;
    const obstacleHeight = 50;

    return px < ox + obstacleWidth &&
           px + playerWidth > ox &&
           py < oy + obstacleHeight &&
           py + playerHeight > oy;
}

// 충돌 처리
function handleCollision(type) {
    if (type === 'meteor') {
        gameState.lives--;
        if (gameState.lives <= 0) {
            endGame();
        }
    } else if (type === 'banana') {
        // 바나나: 나쁜 아이템 (속도 느려짐)
        gameState.speedMultiplier = 0.5;
        gameState.slowDownTimer = 5;
    } else if (type === 'heart') {
        gameState.lives++;
    }
}

// UI 업데이트
function updateUI() {
    document.getElementById('currentAltitude').textContent = 
        gameState.altitude.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'm';
    document.getElementById('altitudeDisplay').textContent = 
        '해발: ' + gameState.altitude.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'm';

    document.getElementById('currentScore').textContent = 
        gameState.score.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'm';

    document.getElementById('currentSpeed').textContent = 
        gameState.speed.toFixed(1) + 'm/s';

    let livesDisplay = '';
    for (let i = 0; i < gameState.lives; i++) {
        livesDisplay += '❤️ ';
    }
    document.getElementById('livesDisplay').textContent = livesDisplay || '게임 오버';
}

// 게임 종료
function endGame() {
    gameState.gameRunning = false;

    // 기록 저장
    highScores.push({
        score: gameState.score.toFixed(0),
        date: new Date().toLocaleString('ko-KR')
    });

    highScores.sort((a, b) => parseInt(b.score) - parseInt(a.score));
    highScores = highScores.slice(0, 10);

    localStorage.setItem('koalaScores', JSON.stringify(highScores));

    // 게임 오버 화면 표시
    document.getElementById('finalScore').textContent = 
        gameState.score.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + 'm';
    gameOverScreen.classList.add('show');

    updateScoreList();
}

// 기록 목록 업데이트
function updateScoreList() {
    scoreList.innerHTML = '';

    if (highScores.length === 0) {
        scoreList.innerHTML = '<div style="color: #aaa; text-align: center;">기록이 없습니다</div>';
        return;
    }

    highScores.forEach((score, index) => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.innerHTML = `
            <span class="score-rank">#${index + 1}</span>
            <span class="score-value">${parseInt(score.score).toLocaleString('ko-KR')}m</span>
            <div style="font-size: 12px; color: #888; margin-top: 5px;">${score.date}</div>
        `;
        scoreList.appendChild(scoreItem);
    });
}

// 키 입력 처리
document.addEventListener('keydown', (e) => {
    keyStates[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keyStates[e.key] = false;
});

// 시작
window.addEventListener('load', () => {
    createClouds();
    updateScoreList();
    gameLoop();
});
