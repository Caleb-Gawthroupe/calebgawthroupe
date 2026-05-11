/* ============================================
   Three.js Golf-Themed Portfolio Scene
   ============================================
   - Rolling green terrain with procedural hills
   - Floating golf balls with dimple-style geometry
   - Flag pins dotting the landscape
   - Soft sunlight + ambient atmosphere
   - Mouse parallax + scroll-driven camera
   ============================================ */

(function () {
  'use strict';

  /* ------------------------------------------
     Three.js Setup
     ------------------------------------------ */
  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.innerWidth > 768,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xe8f0e8, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  // Soft green-tinted fog for depth
  scene.fog = new THREE.Fog(0xdce8dc, 30, 120);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 14, 35);
  camera.lookAt(0, -4, 0);

  /* ------------------------------------------
     Sky Gradient — a large background plane
     ------------------------------------------ */
  (function createSky() {
    const skyGeo = new THREE.PlaneGeometry(300, 150);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87CEEB) },
        bottomColor: { value: new THREE.Color(0xdce8dc) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(mix(bottomColor, topColor, pow(vUv.y, 0.6)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 20, -60);
    scene.add(sky);
  })();

  /* ------------------------------------------
     Lighting — warm sunlight
     ------------------------------------------ */
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  // Main sun
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
  sunLight.position.set(20, 30, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 80;
  sunLight.shadow.camera.left = -40;
  sunLight.shadow.camera.right = 40;
  sunLight.shadow.camera.top = 40;
  sunLight.shadow.camera.bottom = -40;
  scene.add(sunLight);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0xaec6cf, 0.3);
  fillLight.position.set(-10, 10, 5);
  scene.add(fillLight);

  // Subtle hemisphere light for sky/ground bounce
  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a7d44, 0.25);
  scene.add(hemiLight);

  /* ------------------------------------------
     Terrain — rolling green hills
     ------------------------------------------ */
  function terrainHeight(x, z) {
    return (
      Math.sin(x * 0.08) * 1.8 +
      Math.cos(z * 0.06) * 2.2 +
      Math.sin(x * 0.15 + z * 0.12) * 0.9 +
      Math.cos(x * 0.04 - z * 0.08) * 1.5 +
      Math.sin(x * 0.22) * Math.cos(z * 0.18) * 0.6
    );
  }

  function createTerrain() {
    const width = 140;
    const depth = 100;
    const segW = 120;
    const segD = 80;

    const geometry = new THREE.PlaneGeometry(width, depth, segW, segD);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      const h = terrainHeight(x, z);
      positions[i + 1] = h;

      // Color gradient: darker in valleys, lighter on peaks
      const normalizedH = (h + 5) / 10;
      const r = 0.18 + normalizedH * 0.15;
      const g = 0.45 + normalizedH * 0.22;
      const b = 0.12 + normalizedH * 0.10;

      colors[i] = r;
      colors[i + 1] = g;
      colors[i + 2] = b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = true;
    terrain.position.set(0, -12, -10);
    scene.add(terrain);

    return terrain;
  }

  const terrain = createTerrain();

  /* ------------------------------------------
     Fairway paths — lighter streaks
     ------------------------------------------ */
  function createFairway(x, z, length, angle) {
    const geo = new THREE.PlaneGeometry(3, length, 1, 10);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshLambertMaterial({
      color: 0x5cb85c,
      transparent: true,
      opacity: 0.6,
    });

    const fairway = new THREE.Mesh(geo, mat);
    const h = terrainHeight(x, z);
    fairway.position.set(x, h - 11.85, z - 10);
    fairway.rotation.y = angle;
    fairway.receiveShadow = true;
    scene.add(fairway);
  }

  createFairway(-8, 5, 25, 0.3);
  createFairway(12, -5, 20, -0.15);
  createFairway(-20, -10, 18, 0.5);

  /* ------------------------------------------
     Golf Balls — floating gently
     ------------------------------------------ */
  const golfBalls = [];

  function createGolfBall(x, y, z, scale) {
    const geo = new THREE.SphereGeometry(scale, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.35,
      metalness: 0.05,
    });

    const ball = new THREE.Mesh(geo, mat);
    ball.castShadow = true;
    ball.position.set(x, y, z);

    // Dimple rings (decorative)
    const ringGeo = new THREE.TorusGeometry(scale * 0.7, scale * 0.03, 6, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.5,
      metalness: 0.1,
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2;
    ball.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.z = Math.PI / 2;
    ball.add(ring2);

    ball.userData = {
      baseY: y,
      floatOffset: Math.random() * Math.PI * 2,
      floatAmp: 0.3 + Math.random() * 0.4,
      floatSpeed: 0.4 + Math.random() * 0.3,
      rotSpeed: {
        x: (Math.random() - 0.5) * 0.005,
        y: (Math.random() - 0.5) * 0.008,
      },
    };

    scene.add(ball);
    golfBalls.push(ball);
  }

  createGolfBall(-6, -2, 8, 0.5);
  createGolfBall(10, 0, 3, 0.4);
  createGolfBall(-15, -3, -2, 0.35);
  createGolfBall(18, -1, 10, 0.45);
  createGolfBall(3, 2, -5, 0.3);
  createGolfBall(-10, 1, 15, 0.38);
  createGolfBall(14, -4, 18, 0.42);

  /* ------------------------------------------
     Flag Pins
     ------------------------------------------ */
  function createFlagPin(x, z) {
    const group = new THREE.Group();

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.7,
      roughness: 0.3,
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 2.25;
    pole.castShadow = true;
    group.add(pole);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(1.2, 0.7);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      side: THREE.DoubleSide,
      roughness: 0.6,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.6, 4.1, 0);
    flag.castShadow = true;
    group.add(flag);

    // Store flag ref for animation
    group.userData.flag = flag;
    group.userData.flagBaseX = 0.6;

    const h = terrainHeight(x, z);
    group.position.set(x, h - 12, z - 10);
    scene.add(group);

    return group;
  }

  const flags = [];
  flags.push(createFlagPin(-8, 18));
  flags.push(createFlagPin(15, -3));
  flags.push(createFlagPin(-22, -8));
  flags.push(createFlagPin(6, 30));

  /* ------------------------------------------
     Decorative Trees (simple cones + cylinders)
     ------------------------------------------ */
  function createTree(x, z, scale) {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(
      0.15 * scale, 0.25 * scale, 1.5 * scale, 6
    );
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75 * scale;
    trunk.castShadow = true;
    group.add(trunk);

    // Canopy layers
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2d7a3a });

    const canopy1Geo = new THREE.ConeGeometry(1.2 * scale, 2.0 * scale, 7);
    const canopy1 = new THREE.Mesh(canopy1Geo, canopyMat);
    canopy1.position.y = 2.5 * scale;
    canopy1.castShadow = true;
    group.add(canopy1);

    const canopy2Geo = new THREE.ConeGeometry(0.9 * scale, 1.5 * scale, 7);
    const canopy2 = new THREE.Mesh(canopy2Geo, canopyMat);
    canopy2.position.y = 3.5 * scale;
    canopy2.castShadow = true;
    group.add(canopy2);

    const h = terrainHeight(x, z);
    group.position.set(x, h - 12, z - 10);
    scene.add(group);
  }

  // Scatter trees around edges
  createTree(-30, 5, 1.8);
  createTree(-25, -15, 1.4);
  createTree(28, 8, 1.6);
  createTree(32, -5, 2.0);
  createTree(-18, 20, 1.3);
  createTree(22, 22, 1.5);
  createTree(-35, -5, 1.7);
  createTree(35, 15, 1.2);
  createTree(10, -20, 1.9);
  createTree(-12, -22, 1.4);

  /* ------------------------------------------
     Mouse Tracking
     ------------------------------------------ */
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  document.addEventListener('mousemove', (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  /* ------------------------------------------
     Scroll Tracking
     ------------------------------------------ */
  let scrollProgress = 0;
  const totalScrollHeight = () =>
    document.documentElement.scrollHeight - window.innerHeight;

  window.addEventListener('scroll', () => {
    const total = totalScrollHeight();
    scrollProgress = total > 0 ? window.scrollY / total : 0;
  });

  /* ------------------------------------------
     Animation Loop
     ------------------------------------------ */
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Smooth mouse
    mouse.x += (mouse.targetX - mouse.x) * 0.04;
    mouse.y += (mouse.targetY - mouse.y) * 0.04;

    // Camera parallax from mouse
    camera.position.x = mouse.x * 3;
    camera.position.y = 14 + mouse.y * 1.5;

    // Camera scroll — rise up and look further out
    camera.position.z = 35 - scrollProgress * 8;
    camera.position.y = 14 + scrollProgress * 6;
    camera.rotation.x = -0.12 - scrollProgress * 0.08;

    // Animate golf balls — gentle float
    golfBalls.forEach((ball) => {
      const ud = ball.userData;
      ball.position.y =
        ud.baseY +
        Math.sin(elapsed * ud.floatSpeed + ud.floatOffset) * ud.floatAmp;
      ball.rotation.x += ud.rotSpeed.x;
      ball.rotation.y += ud.rotSpeed.y;
    });

    // Animate flags — gentle wave
    flags.forEach((group, i) => {
      const flag = group.userData.flag;
      if (flag) {
        flag.position.x =
          group.userData.flagBaseX +
          Math.sin(elapsed * 2.5 + i * 1.2) * 0.08;
        flag.rotation.y = Math.sin(elapsed * 2.0 + i) * 0.15;
      }
    });

    // Subtle sun movement
    sunLight.position.x = 20 + Math.sin(elapsed * 0.1) * 3;

    renderer.render(scene, camera);
  }

  animate();

  /* ------------------------------------------
     Resize Handler
     ------------------------------------------ */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  /* ------------------------------------------
     Intersection Observer — Scroll Reveals
     ------------------------------------------ */
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  /* ------------------------------------------
     Navbar Scroll Effect
     ------------------------------------------ */
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  /* ------------------------------------------
     Smooth Scroll for Nav Links
     ------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
        // Close mobile menu if open
        const navLinks = document.getElementById('nav-links');
        navLinks.classList.remove('open');
      }
    });
  });

  /* ------------------------------------------
     Mobile Menu Toggle
     ------------------------------------------ */
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');

  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    const icon = menuToggle.querySelector('i');
    if (navLinks.classList.contains('open')) {
      icon.className = 'fa-solid fa-xmark';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!navbar.contains(e.target) && navLinks.classList.contains('open')) {
      navLinks.classList.remove('open');
      menuToggle.querySelector('i').className = 'fa-solid fa-bars';
    }
  });
})();
