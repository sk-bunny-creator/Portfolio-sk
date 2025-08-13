// --- START OF FILE game_page_script.js ---

document.addEventListener('DOMContentLoaded', () => {
    const galaxyPachinkoGame = (p) => {
        // --- PACHINKO GAME CONSTANTS & VARIABLES ---
        const GRAVITY_FORCE = 0.17;
        const BALL_BOUNCINESS = 0.65;
        const PEG_BOUNCINESS = 0.55;
        const BOOSTER_PEG_FORCE_MULTIPLIER = 2.8;

        let CANVAS_WIDTH;
        let CANVAS_HEIGHT;
        // Add trackers for window size to prevent reset on mobile scroll
        let lastCanvasWidth, lastCanvasHeight;

        const DRAG_AREA_HEIGHT = 80;
        const SLOT_HEIGHT = 70;
        
        const ORIGINAL_PEG_RADIUS = 10;
        const PEG_ROWS = 7;
        const PEG_COLS_MAX = 10; // Base value for larger screens
        const NUM_SLOTS_TOTAL = 7;

        const ORIGINAL_BALL_RADIUS = 15;
        const BALL_RADIUS = ORIGINAL_BALL_RADIUS;

        const BALL_PALETTE = [
            [255, 0, 127],   // Vibrant Pink
            [0, 255, 255],   // Cyan
            [255, 128, 0],   // Bright Orange
            [127, 0, 255],   // Electric Purple
            [50, 255, 50],   // Lime Green
            [255, 255, 0]    // Bright Yellow
        ];
        
        let PEG_COLOR_NORMAL_BASE_PALETTE;
        let PEG_COLOR_NORMAL_HIT1, PEG_COLOR_NORMAL_HIT2;
        let ACTIVE_BOOSTER_COLORS = [];
        let PEG_COLOR_BOOSTER_HIT1, PEG_COLOR_BOOSTER_HIT2;

        const PEG_RADIUS_MULTIPLIERS = [1.0, 0.85, 0.7];
        const PEG_MAX_HITS = 3;

        let SLOT_COLOR_NORMAL_RGB, SLOT_COLOR_WIN_RGB;

        const BACKGROUND_STARS_COUNT = 350;

        const POINTS_WIN = 100;
        const POINTS_NORMAL_SLOT_VALUES = [5, 10, 15, 20, 25, 30];
        const MAX_TRIES_FOR_HIGH_SCORE = 10;

        const GAME_STATE = {
            DRAGGING: 'DRAGGING', FALLING: 'FALLING',
            WIN: 'WIN', LOSE: 'LOSE',
        };

        let currentGameState;
        let ball;
        let pegs = [];
        let slots = [];
        let particles = [];
        let backgroundStars = [];

        let gameContainerElement, gameStatusMessageElement, gameResetButtonElement;
        let scoreDisplay, triesDisplay, winStreakDisplay, maxStreakDisplay, best10TryScoreDisplay;

        let currentScore = 0;
        let winStreak = 0;
        let triesSinceFullReset = 0;
        let highestWinStreak = 0;
        let highestScoreUnder10Tries = 0;

        const LS_KEY_HIGH_WIN_STREAK = 'galaxyPachinko_highWinStreak_v4';
        const LS_KEY_HIGH_SCORE_10_TRIES = 'galaxyPachinko_highScore10Tries_v4';

        let soundSystemAvailable = false;
        let audioStarted = false;
        let sounds = {};
        let winAnimation = null;

        p.setup = () => {
            gameContainerElement = document.getElementById('gameContainer');
            gameStatusMessageElement = document.getElementById('gameStatusMessage');
            gameResetButtonElement = document.getElementById('gameResetButton');

            scoreDisplay = document.getElementById('scoreDisplay');
            triesDisplay = document.getElementById('triesDisplay');
            winStreakDisplay = document.getElementById('winStreakDisplay');
            maxStreakDisplay = document.getElementById('maxStreakDisplay');
            best10TryScoreDisplay = document.getElementById('best10TryScoreDisplay');

            let containerRect = gameContainerElement.getBoundingClientRect();
            CANVAS_WIDTH = containerRect.width > 0 ? containerRect.width : 600;
            CANVAS_HEIGHT = containerRect.height > 0 ? containerRect.height : 800;
            let cnv = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
            cnv.parent(gameContainerElement);

            // Initialize last known dimensions
            lastCanvasWidth = CANVAS_WIDTH;
            lastCanvasHeight = CANVAS_HEIGHT;

            p.colorMode(p.RGB);
            p.textAlign(p.CENTER, p.CENTER);
            p.rectMode(p.CENTER);

            PEG_COLOR_NORMAL_BASE_PALETTE = [
                p.color(0, 220, 255),
                p.color(255, 100, 200),
                p.color(150, 150, 255),
                p.color(100, 255, 180)
            ];
            PEG_COLOR_NORMAL_HIT1 = p.color(255, 0, 127);
            PEG_COLOR_NORMAL_HIT2 = p.color(50, 255, 50);

            ACTIVE_BOOSTER_COLORS = [
                p.color(255, 255, 0), p.color(255, 128, 0), p.color(127, 0, 255)
            ];
            PEG_COLOR_BOOSTER_HIT1 = p.color(0, 255, 255);
            PEG_COLOR_BOOSTER_HIT2 = p.color(200, 200, 200);

            SLOT_COLOR_NORMAL_RGB = p.color(255, 152, 0);
            SLOT_COLOR_WIN_RGB = p.color(76, 175, 80);

            if (gameResetButtonElement) {
                gameResetButtonElement.addEventListener('click', () => {
                    p.resetGame(true);
                });
            }

            p.setupAudio();
            p.resetGame(true);
            p.updateUIDisplays(); 
        };

        p.setupAudio = () => {
            if (typeof p5.Oscillator !== 'undefined') {
                soundSystemAvailable = true;
                sounds.pegHitEnv = new p5.Envelope(0.001, 0.05, 0.01, 0.03);
                sounds.pegHitOsc = new p5.Oscillator('triangle'); 
                sounds.pegHitOsc.amp(0); sounds.pegHitOsc.start();

                sounds.boosterEnv = new p5.Envelope(0.005, 0.1, 0.2, 0.15);
                sounds.boosterOsc = new p5.Oscillator('sawtooth'); 
                sounds.boosterOsc.amp(0); sounds.boosterOsc.start();
                sounds.boosterFilter = new p5.BandPass();
                sounds.boosterOsc.disconnect();
                sounds.boosterOsc.connect(sounds.boosterFilter);

                sounds.pegBreakEnv = new p5.Envelope(0.001, 0.1, 0.0, 0.05);
                sounds.pegBreakNoise = new p5.Noise('white'); 
                sounds.pegBreakNoise.amp(0); sounds.pegBreakNoise.start();
                sounds.pegBreakFilter = new p5.BandPass(); 
                sounds.pegBreakNoise.disconnect(); sounds.pegBreakNoise.connect(sounds.pegBreakFilter);
                
                sounds.wallHitEnv = new p5.Envelope(0.005, 0.15, 0.0, 0.1);
                sounds.wallHitNoise = new p5.Noise('pink'); 
                sounds.wallHitNoise.amp(0); sounds.wallHitNoise.start();
                sounds.wallHitFilter = new p5.LowPass();
                sounds.wallHitNoise.disconnect(); sounds.wallHitNoise.connect(sounds.wallHitFilter);
                
                sounds.winEnv = new p5.Envelope(0.02, 0.25, 0.3, 0.35);
                sounds.winOsc1 = new p5.Oscillator('triangle'); sounds.winOsc1.amp(0); sounds.winOsc1.start();
                sounds.winOsc2 = new p5.Oscillator('sine'); sounds.winOsc2.amp(0); sounds.winOsc2.start();
                sounds.winOsc3 = new p5.Oscillator('triangle'); sounds.winOsc3.amp(0); sounds.winOsc3.start();
                sounds.winOsc4 = new p5.Oscillator('sine'); sounds.winOsc4.amp(0); sounds.winOsc4.start();
                
                sounds.slotLandEnv = new p5.Envelope(0.002, 0.1, 0.02, 0.08);
                sounds.slotLandOsc = new p5.Oscillator('sine'); 
                sounds.slotLandOsc.amp(0); sounds.slotLandOsc.start();
                
                sounds.ballReleaseEnv = new p5.Envelope(0.01, 0.25, 0.0, 0.1);
                sounds.ballReleaseNoise = new p5.Noise('white');
                sounds.ballReleaseNoise.amp(0); sounds.ballReleaseNoise.start();
                sounds.ballReleaseFilter = new p5.BandPass();
                sounds.ballReleaseNoise.disconnect(); sounds.ballReleaseNoise.connect(sounds.ballReleaseFilter);
                
                sounds.fizzleOsc = new p5.Oscillator('sine');
                sounds.fizzleOsc.amp(0); sounds.fizzleOsc.start();
                sounds.fizzleEnv = new p5.Envelope(0.001, 0.05, 0.01, 0.1);
            } else {
                console.warn("p5.sound library not loaded. Sound effects will be disabled.");
            }
        };
        
        const playSoundIfReady = (action) => {
            if (soundSystemAvailable && audioStarted) action();
        };

        p.playPegHitSound = (isBoosterHit) => playSoundIfReady(() => {
            if (isBoosterHit) {
                sounds.boosterOsc.freq(200);
                sounds.boosterFilter.freq(800);
                sounds.boosterFilter.res(10);
                sounds.boosterEnv.play(sounds.boosterOsc, 0, Math.min(1.0, ((0.9555 * 1.6) * 1.5) * 1.7)); 
                sounds.boosterOsc.freq(350, 0.02);
                sounds.boosterOsc.freq(250, 0.05);
                sounds.boosterFilter.freq(1200, 0.03);
                sounds.boosterFilter.freq(700, 0.08);
            } else {
                sounds.pegHitOsc.freq(p.random(1200, 1800)); 
                sounds.pegHitEnv.play(sounds.pegHitOsc, 0, Math.min(1.0, ((0.2184 * 1.6) * 1.5) * 1.7)); 
            }
        });
        p.playPegBreakSound = () => playSoundIfReady(() => {
            sounds.pegBreakFilter.freq(p.random(1500, 2500));
            sounds.pegBreakFilter.res(25); 
            sounds.pegBreakEnv.play(sounds.pegBreakNoise, 0, Math.min(1.0, ((0.6825 * 1.6) * 1.5) * 1.7)); 
        });
        p.playWallHitSound = () => playSoundIfReady(() => {
            sounds.wallHitFilter.freq(p.random(100,180)); 
            sounds.wallHitEnv.play(sounds.wallHitNoise, 0, 0.12);
        });
        p.playWinSound = () => playSoundIfReady(() => {
            let baseAmp = ((0.112 * 0.6) * 0.7) * 0.6; 
            sounds.winOsc1.freq(261.63); sounds.winEnv.play(sounds.winOsc1, 0, baseAmp); 
            sounds.winOsc2.freq(329.63); sounds.winEnv.play(sounds.winOsc2, 0.1, baseAmp * 0.9); 
            sounds.winOsc3.freq(392.00); sounds.winEnv.play(sounds.winOsc3, 0.2, baseAmp * 0.8); 
            sounds.winOsc4.freq(523.25); sounds.winEnv.play(sounds.winOsc4, 0.3, baseAmp * 0.7); 
            
            let shimmerNoise = new p5.Noise('white');
            let shimmerEnv = new p5.Envelope(0.01, 0.3, 0.1, 0.4);
            let shimmerFilter = new p5.BandPass();
            shimmerNoise.disconnect();
            shimmerNoise.connect(shimmerFilter);
            shimmerFilter.freq(4000); 
            shimmerFilter.res(8);     
            shimmerNoise.start();
            shimmerEnv.play(shimmerNoise, 0, ((0.0672 * 0.6) * 0.7) * 0.6); 
            shimmerNoise.stop(1.0); 
        });
        p.playSlotLandSound = (isWinSlot) => {
            if (isWinSlot) {
                p.playWinSound();
            } else {
                playSoundIfReady(() => {
                    sounds.slotLandOsc.freq(p.random(440, 660)); 
                    sounds.slotLandEnv.play(sounds.slotLandOsc, 0, Math.min(1.0, ((0.4095 * 1.6) * 1.5) * 1.7)); 
                });
            }
        };
        p.playBallReleaseSound = () => playSoundIfReady(() => {
            sounds.ballReleaseFilter.freq(2000);
            sounds.ballReleaseFilter.res(15); 
            sounds.ballReleaseEnv.play(sounds.ballReleaseNoise, 0, 0.2);
            sounds.ballReleaseFilter.freq(500, 0.2); 
        });
        p.playFizzleSound = () => playSoundIfReady(() => {
            sounds.fizzleOsc.freq(p.random(150, 250));
            sounds.fizzleEnv.play(sounds.fizzleOsc, 0, 0.3);
            sounds.fizzleOsc.freq(p.random(80, 120), 0.05);
        });

        p.updateUIDisplays = () => {
            if (!scoreDisplay) return; 
            scoreDisplay.innerText = currentScore;
            triesDisplay.innerText = `${triesSinceFullReset}${(MAX_TRIES_FOR_HIGH_SCORE > 0 && triesSinceFullReset < MAX_TRIES_FOR_HIGH_SCORE && currentGameState !== GAME_STATE.WIN && currentGameState !== GAME_STATE.LOSE) ? ` (${MAX_TRIES_FOR_HIGH_SCORE - triesSinceFullReset} left)` : ""}`;
            winStreakDisplay.innerText = winStreak;
            maxStreakDisplay.innerText = highestWinStreak;
            best10TryScoreDisplay.innerText = highestScoreUnder10Tries;
        };

        p.resetGame = (isFullReset = true) => {
            if (isFullReset) {
                currentScore = 0;
                winStreak = 0;
                triesSinceFullReset = 0;
                highestWinStreak = parseInt(localStorage.getItem(LS_KEY_HIGH_WIN_STREAK)) || 0;
                highestScoreUnder10Tries = parseInt(localStorage.getItem(LS_KEY_HIGH_SCORE_10_TRIES)) || 0;
            }

            let ballColorComponents = BALL_PALETTE[(triesSinceFullReset) % BALL_PALETTE.length];
            ball = new p.Ball(CANVAS_WIDTH / 2, DRAG_AREA_HEIGHT / 2, BALL_RADIUS, p.color(...ballColorComponents));

            pegs = [];
            const availablePegWidth = CANVAS_WIDTH * 0.9;
            const xPegOffset = (CANVAS_WIDTH - availablePegWidth) / 2;
            const yPegStart = DRAG_AREA_HEIGHT + ORIGINAL_PEG_RADIUS * 5; 
            const yPegEnd = CANVAS_HEIGHT - SLOT_HEIGHT - ORIGINAL_PEG_RADIUS * 5;
            const ySpacing = (yPegEnd - yPegStart) / (PEG_ROWS > 1 ? PEG_ROWS - 1 : 1);

            // --- DYNAMIC PEG COLUMNS ---
            // Determine max columns based on canvas width to prevent crowding on mobile
            const pegColsMax = CANVAS_WIDTH < 450 ? 7 : PEG_COLS_MAX;
            // --- END DYNAMIC PEG COLUMNS ---

            for (let i = 0; i < PEG_ROWS; i++) {
                let y = yPegStart + i * ySpacing;
                // Use the new dynamic pegColsMax variable
                let pegsInThisRow = pegColsMax - (i % 2);
                let currentXSpacing = availablePegWidth / (pegsInThisRow > 1 ? pegsInThisRow -1 : 1);

                for (let j = 0; j < pegsInThisRow; j++) {
                    let x = xPegOffset + (pegsInThisRow === 1 ? availablePegWidth / 2 : j * currentXSpacing);
                    if (i % 2 !== 0 && pegsInThisRow > 1) x += currentXSpacing / 2;
                    
                    if (y < CANVAS_HEIGHT - SLOT_HEIGHT - ORIGINAL_PEG_RADIUS * 3) {
                        let isBooster = p.random(1) < 0.15;
                        pegs.push(new p.Peg(x, y, ORIGINAL_PEG_RADIUS, isBooster));
                    }
                }
            }
            
            slots = [];
            let slotWidth = CANVAS_WIDTH / NUM_SLOTS_TOTAL;
            let availableSlotValues = [...POINTS_NORMAL_SLOT_VALUES].sort(() => 0.5 - Math.random()); 
            let winSlotIndex = p.floor(p.random(NUM_SLOTS_TOTAL));

            for (let i = 0; i < NUM_SLOTS_TOTAL; i++) {
                let x = i * slotWidth + slotWidth / 2;
                let yPos = CANVAS_HEIGHT - SLOT_HEIGHT / 2;
                let isWinning = (i === winSlotIndex);
                let pointValue, textValue;
                if (isWinning) {
                    pointValue = POINTS_WIN; textValue = "WIN!";
                } else {
                    pointValue = availableSlotValues.pop() || POINTS_NORMAL_SLOT_VALUES[0];
                    textValue = pointValue.toString();
                }
                slots.push(new p.Slot(x, yPos, slotWidth, SLOT_HEIGHT, isWinning, textValue, pointValue));
            }

            if (backgroundStars.length === 0 || isFullReset) {
                backgroundStars = [];
                for (let i = 0; i < BACKGROUND_STARS_COUNT; i++) {
                    backgroundStars.push({ x: p.random(CANVAS_WIDTH), y: p.random(CANVAS_HEIGHT), 
                                          size: p.random(0.3, 1.8), 
                                          alpha: p.random(100, 230) });
                }
            }
            particles = [];
            currentGameState = GAME_STATE.DRAGGING;
            winAnimation = null;
            hideStatusMessage();
            p.updateUIDisplays();
        };

        p.drawGalaxyBackground = () => {
            p.background(0);
            p.noStroke();
            for (let star of backgroundStars) {
                p.fill(220, 220, 200, star.alpha * (0.6 + 0.4 * p.sin(p.frameCount * 0.025 + star.x * 0.1)));
                p.ellipse(star.x, star.y, star.size, star.size);
            }
        };
        
        p.Ball = class {
            constructor(x, y, r, col) {
                this.pos = p.createVector(x, y);
                this.vel = p.createVector(0, 0);
                this.acc = p.createVector(0, 0);
                this.radius = r;
                this.color = col; 
                this.trail = [];
                this.dragging = true;
                this.mass = (r / 10) * 1.5;
                this.stuckCounter = 0;
                this.minVyForStuck = 0.05; 
                this.maxStuckFrames = 200;
            }
            applyForce(force) { this.acc.add(p5.Vector.div(force, this.mass)); }
            update() { 
                if (!this.dragging) {
                    this.vel.add(this.acc);
                    this.pos.add(this.vel);
                    this.acc.mult(0);
                    this.trail.push(this.pos.copy());
                    if (this.trail.length > 20) this.trail.splice(0, 1);
                    if (p.abs(this.vel.y) < this.minVyForStuck && this.pos.y > DRAG_AREA_HEIGHT + this.radius * 2 && currentGameState === GAME_STATE.FALLING) {
                        this.stuckCounter++;
                        if (this.stuckCounter > this.maxStuckFrames) {
                            this.applyForce(p.createVector(p.random(-0.5, 0.5), -1)); 
                            this.stuckCounter = 0;
                        }
                    } else {
                        this.stuckCounter = 0;
                    }
                }
            }
            display() {  
                p.noStroke();
                for (let i = 0; i < this.trail.length; i++) {
                    let alpha = p.map(i, 0, this.trail.length - 1, 0, 70);
                    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), alpha);
                    p.ellipse(this.trail[i].x, this.trail[i].y, this.radius * (i / this.trail.length) * 1.8, this.radius * (i / this.trail.length) * 1.8);
                }
                let glowAlpha = this.dragging ? 80 : 60;
                let glowRadiusMultiplier = this.dragging ? 1.25 : 1.15;
                p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), glowAlpha);
                p.ellipse(this.pos.x, this.pos.y, this.radius * 2 * glowRadiusMultiplier, this.radius * 2 * glowRadiusMultiplier);
                p.fill(this.color);
                p.ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
            }
            checkCollisionPeg(peg) {
                if (peg.hitsTaken >= PEG_MAX_HITS) return; 
                let distVec = p5.Vector.sub(peg.pos, this.pos);
                let distance = distVec.mag();
                let minDist = this.radius + peg.currentActualRadius;
                if (distance < minDist) {
                    let wasActiveBooster = peg.isBoosterType && peg.isBoosterActive;
                    peg.hit(); 
                    let normal = distVec.copy().normalize();
                    let tangent = p.createVector(-normal.y, normal.x);
                    let vNormal = normal.copy().mult(this.vel.dot(normal));
                    let vTangent = tangent.copy().mult(this.vel.dot(tangent));
                    let bouncinessToUse = PEG_BOUNCINESS;
                    if(wasActiveBooster) bouncinessToUse *= 1.1;
                    vNormal.mult(-1).mult(bouncinessToUse);
                    this.vel = p5.Vector.add(vNormal, vTangent);
                    let overlap = minDist - distance;
                    this.pos.sub(normal.copy().mult(overlap * 1.05)); 
                    if(peg.hitsTaken < PEG_MAX_HITS) p.playPegHitSound(wasActiveBooster);
                    if (wasActiveBooster) { 
                        let boostForce = normal.copy().mult(-BOOSTER_PEG_FORCE_MULTIPLIER * this.mass * 2.5);
                        this.applyForce(boostForce);
                    }
                }
            }
            checkCollisionWall() { 
                if (this.pos.x - this.radius < 0) {
                    this.pos.x = this.radius; this.vel.x *= -1 * BALL_BOUNCINESS; p.playWallHitSound();
                } else if (this.pos.x + this.radius > CANVAS_WIDTH) {
                    this.pos.x = CANVAS_WIDTH - this.radius; this.vel.x *= -1 * BALL_BOUNCINESS; p.playWallHitSound();
                }
            }
            checkCollisionSlot(slot) { 
                 return (this.pos.x > slot.pos.x - slot.w / 2 &&
                        this.pos.x < slot.pos.x + slot.w / 2 &&
                        this.pos.y + this.radius > slot.pos.y - slot.h / 2 &&
                        this.pos.y < slot.pos.y + slot.h / 4);
            }
            reset(x, y, col) {
                this.pos.set(x, y); this.vel.set(0, 0); this.acc.set(0, 0);
                this.trail = []; this.dragging = true; this.stuckCounter = 0;
                this.color = col;
            }
        };

        p.Peg = class {
            constructor(x, y, r_original_layout, isBoosterType = false) {
                this.pos = p.createVector(x, y);
                this.baseRadius = r_original_layout * p.random(0.8, 1.2);
                if (p.random(1) < 0.25) { 
                    this.baseRadius = this.baseRadius * 1.20;
                }
                this.currentActualRadius = this.baseRadius * PEG_RADIUS_MULTIPLIERS[0];
                this.isBoosterType = isBoosterType;
                this.isBoosterActive = isBoosterType;
                this.hitsTaken = 0;
                this.hitColors = [];
                if (isBoosterType) {
                    this.hitColors.push(p.random(ACTIVE_BOOSTER_COLORS));
                    this.hitColors.push(PEG_COLOR_BOOSTER_HIT1);
                    this.hitColors.push(PEG_COLOR_BOOSTER_HIT2);
                } else {
                    this.hitColors.push(p.random(PEG_COLOR_NORMAL_BASE_PALETTE));
                    this.hitColors.push(PEG_COLOR_NORMAL_HIT1);
                    this.hitColors.push(PEG_COLOR_NORMAL_HIT2);
                }
                this.currentColor = this.hitColors[0];
                this.pulseTime = p.random(p.TWO_PI);
            }
            hit() {
                if (this.hitsTaken >= PEG_MAX_HITS) return;
                let wasActiveBoosterAtHitTime = this.isBoosterType && this.isBoosterActive;
                this.hitsTaken++;
                if (this.hitsTaken >= PEG_MAX_HITS) {
                    p.playPegBreakSound();
                    for (let i = 0; i < 10; i++) { 
                        particles.push(new p.Particle(this.pos.x, this.pos.y, p5.Vector.random2D().mult(p.random(2.5,6)), 
                                        this.currentColor, p.random(5,10), p.random(35,70), true, 'ellipse'));
                    }
                } else {
                    this.currentColor = this.hitColors[this.hitsTaken];
                    this.currentActualRadius = this.baseRadius * PEG_RADIUS_MULTIPLIERS[this.hitsTaken];
                    if (wasActiveBoosterAtHitTime && this.hitsTaken === 1) { 
                        this.isBoosterActive = false;
                    }
                    for (let i = 0; i < 6; i++) { 
                        particles.push(new p.Particle(this.pos.x, this.pos.y, p5.Vector.random2D().mult(p.random(2,5)), 
                                        this.currentColor, p.random(4,8), p.random(30,60), true, 'ellipse'));
                    }
                }
            }
            updateAndDraw() {
                if (this.hitsTaken >= PEG_MAX_HITS) return; 
                p.noStroke();
                if (this.isBoosterType && this.isBoosterActive && this.hitsTaken === 0) { 
                    this.pulseTime += 0.06;
                    let pulseAmt = (p.sin(this.pulseTime) + 1) / 2 * 0.4;
                    let glowSize = this.currentActualRadius * (1 + pulseAmt * 0.5); 
                    p.fill(p.red(this.currentColor), p.green(this.currentColor), p.blue(this.currentColor), 40 + pulseAmt * 50); 
                    p.ellipse(this.pos.x, this.pos.y, glowSize * 2.2, glowSize * 2.2); 
                }
                p.fill(this.currentColor);
                p.ellipse(this.pos.x, this.pos.y, this.currentActualRadius * 2, this.currentActualRadius * 2);
            }
            isReadyToRemove() { return this.hitsTaken >= PEG_MAX_HITS; }
        };

        p.Slot = class { 
            constructor(x, y, w, h, isWinning, textValue, pointValue) {
                this.pos = p.createVector(x, y);
                this.w = w - 2; this.h = h;
                this.isWinningSlot = isWinning;
                this.textValue = textValue;
                this.pointValue = pointValue;
                this.baseColor = isWinning ? SLOT_COLOR_WIN_RGB : SLOT_COLOR_NORMAL_RGB;
                this.pulseTime = p.random(100);
            }
            display() {
                p.push();
                p.translate(this.pos.x, this.pos.y);
                p.noStroke();
                let displayColor = this.baseColor;
                if (this.isWinningSlot) {
                    this.pulseTime += 0.03;
                    let brightnessFactor = 1 + (p.sin(this.pulseTime) * 0.05);
                    displayColor = p.color(p.red(this.baseColor) * brightnessFactor, 
                                         p.green(this.baseColor) * brightnessFactor, 
                                         p.blue(this.baseColor) * brightnessFactor);
                }
                p.fill(displayColor);
                p.rect(0, 0, this.w, this.h, 8); 
                p.fill(p.red(this.baseColor) > 200 && p.green(this.baseColor) > 100 ? 0 : 255);
                p.textSize(this.isWinningSlot ? 22 : 18); 
                if(this.isWinningSlot) p.textStyle(p.BOLD);
                p.text(this.textValue, 0, 2); 
                p.textStyle(p.NORMAL);
                p.pop();
            }
        };

        p.Particle = class { 
            constructor(x, y, vel, col, size, lifespan, hasGravity = true, shape = 'ellipse') {
                this.pos = p.createVector(x, y);
                this.vel = vel;
                this.lifespan = lifespan;
                this.initialLifespan = lifespan; 
                this.color = col;
                this.size = size;
                this.hasGravity = hasGravity;
                this.shape = shape;
                this.angle = p.random(p.TWO_PI);
                this.rotationSpeed = p.random(-0.05, 0.05);
            }
            update() {
                if (this.hasGravity) this.vel.y += GRAVITY_FORCE * 0.3; 
                this.pos.add(this.vel);
                this.lifespan--;
                if (this.shape === 'rect') this.angle += this.rotationSpeed;
            }
            display() {
                p.push();
                p.translate(this.pos.x, this.pos.y);
                let alpha = p.map(this.lifespan, 0, this.initialLifespan, 0, p.alpha(this.color) > 0 ? p.alpha(this.color) : 255);
                p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), alpha);
                p.noStroke();
                if (this.shape === 'rect') {
                    p.rotate(this.angle);
                    p.rect(0, 0, this.size, this.size * 0.6, 2); 
                } else {
                    p.ellipse(0, 0, this.size, this.size);
                }
                p.pop();
            }
            isDead() { return this.lifespan <= 0; }
        };

        p.draw = () => {
            p.drawGalaxyBackground();
            p.stroke(150, 150, 180, 80);
            p.strokeWeight(1.5);
            p.line(0, DRAG_AREA_HEIGHT, CANVAS_WIDTH, DRAG_AREA_HEIGHT);

            if (currentGameState === GAME_STATE.DRAGGING && ball) {
                p.fill(200, 200, 220, 200); 
                p.noStroke();
                p.textSize(16); 
                let textY = DRAG_AREA_HEIGHT / 2 - ball.radius - 20; 
                if (textY < 15) textY = 15; 
                p.text("Drag ball & click to release", CANVAS_WIDTH / 2, textY);
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update(); particles[i].display();
                if (particles[i].isDead()) particles.splice(i, 1);
            }
            for (let i = pegs.length - 1; i >= 0; i--) {
                pegs[i].updateAndDraw();
                if (pegs[i].isReadyToRemove()) pegs.splice(i, 1);
            }
            for (let slot of slots) slot.display();

            if (ball) {
                if (currentGameState === GAME_STATE.DRAGGING) {
                    ball.pos.x = p.constrain(p.mouseX, ball.radius, CANVAS_WIDTH - ball.radius);
                    ball.pos.y = DRAG_AREA_HEIGHT / 2; 
                } else if (currentGameState === GAME_STATE.FALLING) {
                    ball.applyForce(p.createVector(0, GRAVITY_FORCE * ball.mass));
                    ball.update();
                    ball.checkCollisionWall();
                    for (let peg of pegs) ball.checkCollisionPeg(peg);
                    let landedInSlot = false;
                    for (let slot of slots) {
                        if (ball.checkCollisionSlot(slot)) {
                            landedInSlot = true;
                            p.playSlotLandSound(slot.isWinningSlot);
                            currentScore += slot.pointValue;
                            if (slot.isWinningSlot) {
                                currentGameState = GAME_STATE.WIN;
                                winAnimation = {
                                    text: `WIN!\n+${slot.pointValue} PTS`,
                                    alpha: 255, scale: 0.8, timer: 150
                                };
                                hideStatusMessage();
                                p.spawnConfetti();
                                winStreak++;
                                if (winStreak > highestWinStreak) {
                                    highestWinStreak = winStreak;
                                    localStorage.setItem(LS_KEY_HIGH_WIN_STREAK, highestWinStreak.toString());
                                }
                            } else {
                                currentGameState = GAME_STATE.LOSE;
                                showStatusMessage(`Landed!\n+${slot.pointValue} Pts`);
                                p.fizzleBall();
                                winStreak = 0;
                            }
                            if (triesSinceFullReset <= MAX_TRIES_FOR_HIGH_SCORE && currentScore > highestScoreUnder10Tries) {
                                highestScoreUnder10Tries = currentScore;
                                localStorage.setItem(LS_KEY_HIGH_SCORE_10_TRIES, highestScoreUnder10Tries.toString());
                            }
                            ball.vel.mult(0.05); 
                            ball.pos.y = slot.pos.y - slot.h/2 + ball.radius + 2;
                            p.updateUIDisplays();
                            break;
                        }
                    }
                    if (!landedInSlot && ball.pos.y > CANVAS_HEIGHT + ball.radius * 3) {
                        currentGameState = GAME_STATE.LOSE;
                        showStatusMessage("OUT OF BOUNDS!");
                        p.fizzleBall();
                        winStreak = 0;
                        p.updateUIDisplays();
                    }
                }
                if (!(ball.pos.x < -500)) ball.display();
            }

            if (winAnimation) {
                p.push();
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(255, 223, 0, winAnimation.alpha);
                p.textSize(52 * winAnimation.scale);
                p.textStyle(p.BOLD);
                p.stroke(0, winAnimation.alpha * 0.7); p.strokeWeight(4);
                let lines = winAnimation.text.split('\n');
                p.text(lines[0], CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 25);
                if (lines[1]) p.text(lines[1], CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
                p.pop();
                winAnimation.alpha -= (255 / winAnimation.timer) * 1.2 ;
                if (winAnimation.scale < 1.1) winAnimation.scale = p.lerp(winAnimation.scale, 1.15, 0.08);
                winAnimation.timer--;
                if (winAnimation.timer <= 0 || winAnimation.alpha <=0) {
                    winAnimation = null;
                }
            }
        };

        p.mousePressed = () => {
            if (soundSystemAvailable && !audioStarted && p.getAudioContext) {
                const audioCtx = p.getAudioContext();
                if (audioCtx && audioCtx.state !== 'running') {
                    audioCtx.resume().then(() => { audioStarted = true; })
                        .catch(e => console.error("Audio context resume error:", e));
                } else if (audioCtx) {
                    audioStarted = true;
                }
            }
            if (currentGameState === GAME_STATE.DRAGGING && p.mouseY < DRAG_AREA_HEIGHT + 30 && p.mouseY > 0 && p.mouseX > 0 && p.mouseX < CANVAS_WIDTH) {
                if (ball) ball.dragging = false; 
                currentGameState = GAME_STATE.FALLING;
                triesSinceFullReset++; 
                p.playBallReleaseSound();
                p.updateUIDisplays(); 
            } else if (currentGameState === GAME_STATE.WIN || currentGameState === GAME_STATE.LOSE) {
                p.resetGame(false); 
            }
        };
        p.keyPressed = () => { 
            if (p.key.toLowerCase() === 'r') {
                 if (confirm("Full Reset: This will reset current score, win streak, and peg layout. Are you sure?")) {
                    p.resetGame(true);
                }
            }
        };
        
        p.windowResized = () => { 
            let containerRect = gameContainerElement.getBoundingClientRect();
            let newWidth = containerRect.width > 0 ? containerRect.width : 600;
            let newHeight = containerRect.height > 0 ? containerRect.height : 800;

            // Only reset if the width has changed significantly (e.g., device rotation)
            // This prevents resetting when the mobile browser's address bar appears/hides
            if (Math.abs(newWidth - lastCanvasWidth) > 20) {
                CANVAS_WIDTH = newWidth;
                CANVAS_HEIGHT = newHeight;
                p.resizeCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
                p.resetGame(true); 

                // Update the last known dimensions
                lastCanvasWidth = CANVAS_WIDTH;
                lastCanvasHeight = CANVAS_HEIGHT;
            }
        };

        p.spawnConfetti = () => { 
            for (let i = 0; i < 180; i++) {
                let x = p.random(CANVAS_WIDTH * 0.1, CANVAS_WIDTH * 0.9);
                let y = p.random(CANVAS_HEIGHT * 0.2, CANVAS_HEIGHT * 0.7);
                let vel = p5.Vector.random2D().mult(p.random(2, 8));
                vel.y -= p.random(2,5); 
                let confettiColors = [ 
                    p.color(255,0,127,230), p.color(0,255,255,230), p.color(255,128,0,230),   
                    p.color(50,255,50,230), p.color(255,255,0,230), p.color(127,0,255,230) 
                ];
                particles.push(new p.Particle(x, y, vel, p.random(confettiColors), 
                                p.random(12, 25), p.random(180, 350), true, 'rect'));
            }
        };
        p.fizzleBall = () => {  
            if (!ball) return;
            for (let i = 0; i < 40; i++) {
                let vel = p5.Vector.random2D().mult(p.random(0.5, 3.0));
                let particleColor = p.color(p.red(ball.color), p.green(ball.color), p.blue(ball.color), p.random(100,200));
                particles.push(new p.Particle(ball.pos.x, ball.pos.y, vel, particleColor, 
                                p.random(ball.radius*0.2, ball.radius*0.5), p.random(30, 70), false, 'ellipse'));
            }
            p.playFizzleSound();
            ball.pos.set(-1000, -1000);
            ball.vel.set(0,0);
        };

        function showStatusMessage(message) {
            if (winAnimation || !gameStatusMessageElement) return;
            gameStatusMessageElement.innerHTML = message.replace(/\n/g, '<br>');
            gameStatusMessageElement.classList.remove('hidden');
        }
        function hideStatusMessage() { 
            if (gameStatusMessageElement) gameStatusMessageElement.classList.add('hidden'); 
        }
    }; 

    if (document.getElementById('gameContainer')) {
        new p5(galaxyPachinkoGame);
        console.log("Galaxy Pachinko Game initialized on game_page.html.");
    } else {
        console.error("Game container (#gameContainer) not found on game_page.html. Pachinko game cannot be initialized.");
    }
});
// --- END OF FILE game_page_script.js ---