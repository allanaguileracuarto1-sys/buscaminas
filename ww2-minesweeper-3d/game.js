// WW2 3D Minesweeper - Battlefront
// Game Logic and 3D Rendering

class WW2Minesweeper {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cells = [];
        this.mines = [];
        this.flags = [];
        this.revealed = [];
        this.gameOver = false;
        this.gameWon = false;
        this.rows = 12;
        this.cols = 12;
        this.mineCount = 25;
        this.flagCount = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.soundEnabled = true;
        this.hintsEnabled = true;
        this.selectedCell = null;
        this.particles = [];
        this.tanks = [];
        this.bullets = [];
        this.explosions = [];
        this.smokeParticles = [];
        
        this.init();
    }

    init() {
        this.createScene();
        this.createLighting();
        this.createEnvironment();
        this.createWarEffects();
        this.setupControls();
        this.newGame();
        this.animate();
    }

    createScene() {
        const container = document.getElementById('canvas-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x1a1a1a, 0.015);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 40, 30);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x1a1a1a);
        container.appendChild(this.renderer.domElement);

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        // Directional light (sun/moon)
        const directional = new THREE.DirectionalLight(0xffaa00, 0.8);
        directional.position.set(50, 100, 50);
        directional.castShadow = true;
        directional.shadow.mapSize.width = 2048;
        directional.shadow.mapSize.height = 2048;
        directional.shadow.camera.near = 0.5;
        directional.shadow.camera.far = 500;
        directional.shadow.camera.left = -100;
        directional.shadow.camera.right = 100;
        directional.shadow.camera.top = 100;
        directional.shadow.camera.bottom = -100;
        this.scene.add(directional);

        // Point lights for explosions
        this.explosionLights = [];
        for (let i = 0; i < 5; i++) {
            const light = new THREE.PointLight(0xff4400, 0, 50);
            light.position.set(
                (Math.random() - 0.5) * 100,
                10,
                (Math.random() - 0.5) * 100
            );
            this.scene.add(light);
            this.explosionLights.push(light);
        }

        // Searchlight effect
        this.searchLight = new THREE.SpotLight(0xffffcc, 0.3);
        this.searchLight.position.set(0, 80, 0);
        this.searchLight.angle = Math.PI / 6;
        this.searchLight.penumbra = 0.5;
        this.searchLight.castShadow = true;
        this.scene.add(this.searchLight);
        this.scene.add(this.searchLight.target);
    }

    createEnvironment() {
        // Battlefield ground
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d2817,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Add terrain variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 2] = Math.sin(vertices[i] * 0.1) * Math.cos(vertices[i + 1] * 0.1) * 2;
        }
        groundGeometry.computeVertexNormals();
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // Crater holes
        this.createCraters();

        // Barbed wire fences
        this.createBarbedWire();

        // War debris
        this.createDebris();

        // Distant buildings/silhouettes
        this.createSkyline();
    }

    createCraters() {
        const craterGeometry = new THREE.CircleGeometry(3, 16);
        const craterMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a1a0f,
            roughness: 1
        });

        for (let i = 0; i < 15; i++) {
            const crater = new THREE.Mesh(craterGeometry, craterMaterial);
            crater.rotation.x = -Math.PI / 2;
            crater.position.set(
                (Math.random() - 0.5) * 150,
                -0.1,
                (Math.random() - 0.5) * 150
            );
            this.scene.add(crater);
        }
    }

    createBarbedWire() {
        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            metalness: 0.8,
            roughness: 0.3
        });

        for (let side = 0; side < 4; side++) {
            const wireGroup = new THREE.Group();
            for (let i = 0; i < 20; i++) {
                const wire = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.1, 0.1, 2, 8),
                    wireMaterial
                );
                wire.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
                wire.position.set(i * 2 - 20, 1.5, (side - 1.5) * 60);
                wireGroup.add(wire);
            }
            this.scene.add(wireGroup);
        }
    }

    createDebris() {
        const debrisMaterials = [
            new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a }),
            new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
        ];

        for (let i = 0; i < 50; i++) {
            const geometry = new THREE.BoxGeometry(
                Math.random() * 2 + 0.5,
                Math.random() * 1 + 0.3,
                Math.random() * 2 + 0.5
            );
            const material = debrisMaterials[Math.floor(Math.random() * debrisMaterials.length)];
            const debris = new THREE.Mesh(geometry, material);
            
            debris.position.set(
                (Math.random() - 0.5) * 180,
                0.5,
                (Math.random() - 0.5) * 180
            );
            debris.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            debris.castShadow = true;
            debris.receiveShadow = true;
            this.scene.add(debris);
        }
    }

    createSkyline() {
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9
        });

        for (let i = 0; i < 30; i++) {
            const height = Math.random() * 20 + 10;
            const building = new THREE.Mesh(
                new THREE.BoxGeometry(
                    Math.random() * 10 + 5,
                    height,
                    Math.random() * 10 + 5
                ),
                buildingMaterial
            );
            
            const angle = (i / 30) * Math.PI * 2;
            const radius = 90;
            building.position.set(
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
            );
            this.scene.add(building);
        }
    }

    createWarEffects() {
        // Smoke particles system
        for (let i = 0; i < 100; i++) {
            const smokeGeo = new THREE.SphereGeometry(0.5, 8, 8);
            const smokeMat = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.3
            });
            const smoke = new THREE.Mesh(smokeGeo, smokeMat);
            smoke.position.set(
                (Math.random() - 0.5) * 150,
                Math.random() * 20,
                (Math.random() - 0.5) * 150
            );
            smoke.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            this.smokeParticles.push(smoke);
            this.scene.add(smoke);
        }

        // Create tank models in background
        this.createTanks();
    }

    createTanks() {
        const tankMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a5a2a,
            metalness: 0.6,
            roughness: 0.4
        });

        for (let i = 0; i < 5; i++) {
            const tank = new THREE.Group();
            
            // Tank body
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(4, 1.5, 6),
                tankMaterial
            );
            body.castShadow = true;
            tank.add(body);
            
            // Tank turret
            const turret = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 1.2, 3),
                tankMaterial
            );
            turret.position.y = 1.2;
            turret.castShadow = true;
            tank.add(turret);
            
            // Tank barrel
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 4, 8),
                new THREE.MeshStandardMaterial({ color: 0x3a4a1a })
            );
            barrel.rotation.x = Math.PI / 2;
            barrel.position.set(0, 1.2, 3);
            barrel.castShadow = true;
            tank.add(barrel);
            
            // Tank tracks
            for (let side of [-1, 1]) {
                const track = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 1.2, 5.5),
                    new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
                );
                track.position.set(side * 2, 0.6, 0);
                track.castShadow = true;
                tank.add(track);
            }
            
            tank.position.set(
                (Math.random() - 0.5) * 120,
                0,
                (Math.random() - 0.5) * 120
            );
            tank.rotation.y = Math.random() * Math.PI * 2;
            
            tank.moveSpeed = (Math.random() - 0.5) * 0.05;
            tank.rotateSpeed = (Math.random() - 0.5) * 0.01;
            
            this.tanks.push(tank);
            this.scene.add(tank);
        }
    }

    setupControls() {
        // Mouse controls for camera
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let cameraAngle = 0;
        let cameraHeight = 40;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.target === this.renderer.domElement) {
                isDragging = true;
            }
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaMove = {
                    x: e.offsetX - previousMousePosition.x,
                    y: e.offsetY - previousMousePosition.y
                };

                cameraAngle -= deltaMove.x * 0.01;
                cameraHeight = Math.max(20, Math.min(80, cameraHeight - deltaMove.y * 0.1));

                this.camera.position.x = Math.sin(cameraAngle) * cameraHeight;
                this.camera.position.z = Math.cos(cameraAngle) * cameraHeight;
                this.camera.position.y = cameraHeight * 0.7;
                this.camera.lookAt(0, 0, 0);
            }
            previousMousePosition = { x: e.offsetX, y: e.offsetY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Raycaster for cell selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', (e) => {
            if (this.gameOver) return;
            
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            const intersects = this.raycaster.intersectObjects(
                this.cells.flatMap(row => row.map(cell => cell.mesh)),
                true
            );
            
            if (intersects.length > 0) {
                const clickedMesh = intersects[0].object;
                const cellData = this.findCellByMesh(clickedMesh);
                
                if (cellData && !this.gameOver) {
                    if (e.button === 2 || e.shiftKey) {
                        this.toggleFlag(cellData.row, cellData.col);
                    } else {
                        this.revealCell(cellData.row, cellData.col);
                    }
                }
            }
        });

        this.renderer.domElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Difficulty selector
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.setDifficulty(e.target.value);
        });
    }

    findCellByMesh(mesh) {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.cells[row][col].mesh === mesh || 
                    this.cells[row][col].mesh.children.includes(mesh)) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    setDifficulty(difficulty) {
        switch(difficulty) {
            case 'easy':
                this.rows = 8;
                this.cols = 8;
                this.mineCount = 10;
                break;
            case 'medium':
                this.rows = 12;
                this.cols = 12;
                this.mineCount = 25;
                break;
            case 'hard':
                this.rows = 16;
                this.cols = 16;
                this.mineCount = 50;
                break;
            case 'extreme':
                this.rows = 20;
                this.cols = 20;
                this.mineCount = 80;
                break;
        }
        this.newGame();
    }

    newGame() {
        // Clear existing game
        this.clearBoard();
        
        // Reset game state
        this.gameOver = false;
        this.gameWon = false;
        this.flagCount = 0;
        this.timer = 0;
        this.mines = [];
        this.flags = [];
        this.revealed = [];
        
        // Hide game over screen
        document.getElementById('game-over').style.display = 'none';
        
        // Initialize board
        this.initializeBoard();
        
        // Place mines
        this.placeMines();
        
        // Calculate numbers
        this.calculateNumbers();
        
        // Start timer
        this.startTimer();
        
        // Update UI
        this.updateUI();
        
        // Create explosion effect for new game
        this.createExplosion(0, 10, 0, 0xffaa00);
    }

    clearBoard() {
        // Remove existing cells
        if (this.cells.length > 0) {
            this.cells.forEach(row => {
                row.forEach(cell => {
                    if (cell.mesh) {
                        this.scene.remove(cell.mesh);
                        if (cell.mesh.geometry) cell.mesh.geometry.dispose();
                        if (cell.mesh.material) cell.mesh.material.dispose();
                    }
                });
            });
        }
        this.cells = [];
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    initializeBoard() {
        const cellSize = 2.2;
        const offsetX = (this.cols * cellSize) / 2;
        const offsetZ = (this.rows * cellSize) / 2;

        for (let row = 0; row < this.rows; row++) {
            this.cells[row] = [];
            this.revealed[row] = [];
            
            for (let col = 0; col < this.cols; col++) {
                // Create cell mesh
                const geometry = new THREE.BoxGeometry(cellSize - 0.2, 1, cellSize - 0.2);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x5a4a3a,
                    roughness: 0.8,
                    metalness: 0.2
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(
                    col * cellSize - offsetX + cellSize / 2,
                    0.5,
                    row * cellSize - offsetZ + cellSize / 2
                );
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                
                // Add border highlight
                const borderGeometry = new THREE.BoxGeometry(cellSize - 0.1, 0.1, cellSize - 0.1);
                const borderMaterial = new THREE.MeshStandardMaterial({
                    color: 0x8b4513,
                    emissive: 0x3a1a0a
                });
                const border = new THREE.Mesh(borderGeometry, borderMaterial);
                border.position.y = 0.5;
                mesh.add(border);
                
                this.scene.add(mesh);
                
                this.cells[row][col] = {
                    mesh: mesh,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborCount: 0,
                    row: row,
                    col: col
                };
                
                this.revealed[row][col] = false;
            }
        }
    }

    placeMines() {
        let placed = 0;
        while (placed < this.mineCount) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            if (!this.cells[row][col].isMine) {
                this.cells[row][col].isMine = true;
                this.mines.push({ row, col });
                placed++;
            }
        }
    }

    calculateNumbers() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (!this.cells[row][col].isMine) {
                    let count = 0;
                    
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = row + dr;
                            const nc = col + dc;
                            
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                                if (this.cells[nr][nc].isMine) {
                                    count++;
                                }
                            }
                        }
                    }
                    
                    this.cells[row][col].neighborCount = count;
                }
            }
        }
    }

    revealCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        if (this.revealed[row][col] || this.cells[row][col].isFlagged) return;
        
        const cell = this.cells[row][col];
        this.revealed[row][col] = true;
        cell.isRevealed = true;
        
        if (cell.isMine) {
            // Game over - hit a mine
            this.triggerGameOver(false);
            this.explodeMine(row, col);
            return;
        }
        
        // Animate cell opening
        this.animateCellOpen(cell);
        
        // Show number if > 0
        if (cell.neighborCount > 0) {
            this.showNumber(cell);
        }
        
        // If no neighbors, reveal adjacent cells
        if (cell.neighborCount === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = row + dr;
                    const nc = col + dc;
                    if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                        setTimeout(() => this.revealCell(nr, nc), 50);
                    }
                }
            }
        }
        
        // Check win condition
        this.checkWin();
    }

    toggleFlag(row, col) {
        if (this.revealed[row][col]) return;
        
        const cell = this.cells[row][col];
        cell.isFlagged = !cell.isFlagged;
        
        if (cell.isFlagged) {
            this.flags.push({ row, col });
            this.flagCount++;
            this.addFlagMarker(cell);
            this.playSound('flag');
        } else {
            this.flags = this.flags.filter(f => f.row !== row || f.col !== col);
            this.flagCount--;
            this.removeFlagMarker(cell);
            this.playSound('unflag');
        }
        
        this.updateUI();
    }

    addFlagMarker(cell) {
        // Create flag model
        const flagGroup = new THREE.Group();
        
        // Flag pole
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 0.75;
        flagGroup.add(pole);
        
        // Flag
        const flagGeo = new THREE.PlaneGeometry(0.6, 0.4);
        const flagMat = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            side: THREE.DoubleSide
        });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.3, 1.3, 0);
        flagGroup.add(flag);
        
        flagGroup.position.copy(cell.mesh.position);
        flagGroup.position.y = 0;
        
        cell.flagMarker = flagGroup;
        this.scene.add(flagGroup);
    }

    removeFlagMarker(cell) {
        if (cell.flagMarker) {
            this.scene.remove(cell.flagMarker);
            cell.flagMarker = null;
        }
    }

    animateCellOpen(cell) {
        const targetY = -0.5;
        const startY = cell.mesh.position.y;
        const startTime = Date.now();
        const duration = 300;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out quad
            const eased = 1 - (1 - progress) * (1 - progress);
            
            cell.mesh.position.y = startY - eased * 1;
            cell.mesh.rotation.x = -eased * 0.3;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    showNumber(cell) {
        const colors = [
            null,
            0x0000ff, // 1 - blue
            0x00ff00, // 2 - green
            0xff0000, // 3 - red
            0x000088, // 4 - dark blue
            0x880000, // 5 - dark red
            0x008888, // 6 - cyan
            0x000000, // 7 - black
            0x888888  // 8 - gray
        ];
        
        // Create text sprite for number
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        
        ctx.fillStyle = '#' + colors[cell.neighborCount].toString(16).padStart(6, '0');
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.neighborCount.toString(), 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 0.6, 0);
        
        cell.mesh.add(sprite);
        cell.numberSprite = sprite;
    }

    explodeMine(row, col) {
        const cell = this.cells[row][col];
        
        // Flash the mine
        cell.mesh.material.emissive = new THREE.Color(0xffaa00);
        cell.mesh.material.emissiveIntensity = 2;
        
        // Create explosion
        this.createExplosion(
            cell.mesh.position.x,
            cell.mesh.position.y + 1,
            cell.mesh.position.z,
            0xff4400
        );
        
        // Shake camera
        this.shakeCamera();
        
        // Reveal all mines
        this.mines.forEach(mine => {
            const mineCell = this.cells[mine.row][mine.col];
            if (!mineCell.isRevealed) {
                mineCell.mesh.material.emissive = new THREE.Color(0xff0000);
                mineCell.mesh.material.emissiveIntensity = 1;
            }
        });
    }

    createExplosion(x, y, z, color) {
        // Explosion sphere
        const explosionGeo = new THREE.SphereGeometry(1, 16, 16);
        const explosionMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });
        const explosion = new THREE.Mesh(explosionGeo, explosionMat);
        explosion.position.set(x, y, z);
        this.scene.add(explosion);
        
        // Explosion particles
        for (let i = 0; i < 30; i++) {
            const particleGeo = new THREE.SphereGeometry(0.3, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.set(x, y, z);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            particle.life = 1;
            this.particles.push(particle);
            this.scene.add(particle);
        }
        
        // Store explosion for animation
        this.explosions.push({
            mesh: explosion,
            scale: 1,
            life: 1
        });
        
        this.playSound('explosion');
    }

    shakeCamera() {
        const originalPos = this.camera.position.clone();
        const startTime = Date.now();
        const duration = 500;
        
        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress < 1) {
                const amplitude = (1 - progress) * 2;
                this.camera.position.x = originalPos.x + (Math.random() - 0.5) * amplitude;
                this.camera.position.y = originalPos.y + (Math.random() - 0.5) * amplitude;
                this.camera.position.z = originalPos.z + (Math.random() - 0.5) * amplitude;
                requestAnimationFrame(shake);
            } else {
                this.camera.position.copy(originalPos);
            }
        };
        
        shake();
    }

    checkWin() {
        let revealedCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (this.revealed[row][col]) {
                    revealedCount++;
                }
            }
        }
        
        const totalCells = this.rows * this.cols;
        const nonMineCells = totalCells - this.mineCount;
        
        if (revealedCount === nonMineCells) {
            this.triggerGameOver(true);
        }
    }

    triggerGameOver(won) {
        this.gameOver = true;
        this.gameWon = won;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        const gameOverScreen = document.getElementById('game-over');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');
        
        if (won) {
            gameOverScreen.classList.add('victory');
            title.textContent = '🎉 MISSION ACCOMPLISHED! 🎉';
            message.textContent = `¡Excelente trabajo, soldado! Completaste el campo de minas en ${this.formatTime(this.timer)}.`;
            this.createVictoryEffect();
        } else {
            gameOverScreen.classList.remove('victory');
            title.textContent = '💥 MISSION FAILED 💥';
            message.textContent = 'Has pisado una mina. ¡Mejor suerte la próxima vez, soldado!';
        }
        
        gameOverScreen.style.display = 'block';
        this.playSound(won ? 'victory' : 'defeat');
    }

    createVictoryEffect() {
        // Fireworks effect
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createExplosion(
                    (Math.random() - 0.5) * 50,
                    20 + Math.random() * 20,
                    (Math.random() - 0.5) * 50,
                    0xffd700
                );
            }, i * 300);
        }
    }

    startTimer() {
        this.timer = 0;
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateUI();
        }, 1000);
    }

    updateUI() {
        document.getElementById('mines-count').textContent = this.mineCount - this.flagCount;
        document.getElementById('timer').textContent = this.formatTime(this.timer);
        document.getElementById('flags-count').textContent = this.flagCount;
        
        this.updateMinimap();
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateMinimap() {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        const cellSize = canvas.width / Math.max(this.rows, this.cols);
        const offsetX = (canvas.width - this.cols * cellSize) / 2;
        const offsetY = (canvas.height - this.rows * cellSize) / 2;
        
        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw cells
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const x = offsetX + col * cellSize;
                const y = offsetY + row * cellSize;
                
                if (this.revealed[row][col]) {
                    if (this.cells[row][col].isMine) {
                        ctx.fillStyle = '#ff0000';
                    } else {
                        ctx.fillStyle = '#4a4a4a';
                    }
                } else if (this.cells[row][col].isFlagged) {
                    ctx.fillStyle = '#ffaa00';
                } else {
                    ctx.fillStyle = '#2a2a2a';
                }
                
                ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
            }
        }
        
        // Border
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        // Simple synthesized sounds using Web Audio API
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        switch(type) {
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.5);
                break;
            case 'flag':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.2);
                break;
            case 'victory':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
                oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.4);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.6);
                break;
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const btn = document.querySelector('button[onclick="game.toggleSound()"]');
        btn.textContent = this.soundEnabled ? '🔊 Sonido' : '🔇 Silencio';
    }

    toggleHints() {
        this.hintsEnabled = !this.hintsEnabled;
        const btn = document.querySelector('button[onclick="game.toggleHints()"]');
        btn.textContent = this.hintsEnabled ? '💡 Pistas: ON' : '💡 Pistas: OFF';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Animate tanks
        this.tanks.forEach(tank => {
            tank.position.x += Math.sin(time * 0.5 + tank.id) * 0.02;
            tank.position.z += Math.cos(time * 0.3 + tank.id) * 0.02;
            tank.rotation.y += tank.rotateSpeed;
        });
        
        // Animate smoke particles
        this.smokeParticles.forEach(smoke => {
            smoke.position.add(smoke.velocity);
            smoke.material.opacity = 0.2 + Math.sin(time + smoke.id) * 0.1;
            
            if (smoke.position.y > 30) {
                smoke.position.y = 0;
            }
        });
        
        // Animate explosions
        this.explosions.forEach((exp, index) => {
            exp.scale += 0.1;
            exp.life -= 0.02;
            exp.mesh.scale.setScalar(exp.scale);
            exp.mesh.material.opacity = exp.life;
            
            if (exp.life <= 0) {
                this.scene.remove(exp.mesh);
                this.explosions.splice(index, 1);
            }
        });
        
        // Animate particles
        this.particles.forEach((particle, index) => {
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.05; // gravity
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            particle.scale.setScalar(particle.life);
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                this.particles.splice(index, 1);
            }
        });
        
        // Animate explosion lights
        this.explosionLights.forEach((light, index) => {
            if (Math.random() < 0.01) {
                light.intensity = 2;
                setTimeout(() => {
                    light.intensity = 0;
                }, 100);
            }
        });
        
        // Rotate searchlight
        this.searchLight.position.x = Math.sin(time * 0.2) * 30;
        this.searchLight.position.z = Math.cos(time * 0.2) * 30;
        this.searchLight.target.position.set(0, 0, 0);
        this.searchLight.target.updateMatrixWorld();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new WW2Minesweeper();
});
