/* ============================================
   Three.js Abstract Tech Scene
   ============================================
   - Smooth, elegant particle wave
   - Soft blue/slate colors
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
    alpha: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf8fafc, 0.008);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 15, 60);
  camera.lookAt(0, 0, 0);

  /* ------------------------------------------
     Particle Wave
     ------------------------------------------ */
  const particleCount = 4000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);
  
  const width = 140;
  const depth = 140;

  for (let i = 0; i < particleCount; i++) {
    const x = (Math.random() - 0.5) * width;
    const z = (Math.random() - 0.5) * depth;
    const y = 0; // animated in shader

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    scales[i] = Math.random() * 2.0;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0x2563eb) },
      time: { value: 0 }
    },
    vertexShader: `
      attribute float scale;
      uniform float time;
      varying vec2 vUv;
      void main() {
        vec3 p = position;
        p.y = sin(p.x * 0.1 + time * 0.5) * 3.0 + cos(p.z * 0.1 + time * 0.3) * 3.0;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = scale * (20.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        gl_FragColor = vec4(color, 0.6 - (d * 1.0));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const particles = new THREE.Points(geometry, material);
  particles.position.y = -10;
  scene.add(particles);

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
    
    material.uniforms.time.value = elapsed;

    mouse.x += (mouse.targetX - mouse.x) * 0.04;
    mouse.y += (mouse.targetY - mouse.y) * 0.04;

    camera.position.x = mouse.x * 8;
    camera.position.y = 15 + mouse.y * 3;

    camera.position.z = 60 - scrollProgress * 20;
    camera.position.y = 15 - scrollProgress * 5;
    camera.lookAt(0, -10 + scrollProgress * 5, 0);

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
