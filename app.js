/* ==========================================================================
   Warsava Danismanlik - 3D Engine & Scroll Animations (Three.js & GSAP)
   ========================================================================== */

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', () => {
  initThree();
  initNavigation();
  initConsultationForm();
  initVideoSlider();
  initVideoModal();
  initVideoHoverPreviews();
  runIntroAnimation();
});

/**
 * Runs a prestigious entrance animation for the Hero section when the page is loaded.
 */
function runIntroAnimation() {
  // Only play the intro animation if the user is at the top of the page
  if (window.scrollY < 50) {
    const badge = document.querySelector('#section-1 .badge');
    const company = document.querySelector('#section-1 .company-name-container');
    const title = document.querySelector('#section-1 .main-title');
    const subtitle = document.querySelector('#section-1 .subtitle');
    const cta = document.querySelector('#section-1 .cta-buttons');
    const hint = document.querySelector('#section-1 .scroll-hint');

    if (badge) {
      gsap.fromTo(badge, 
        { opacity: 0, y: 35 }, 
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: "power3.out" }
      );
    }
    if (company) {
      gsap.fromTo(company, 
        { opacity: 0, y: 35 }, 
        { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power3.out" }
      );
    }
    if (title) {
      gsap.fromTo(title, 
        { opacity: 0, y: 45 }, 
        { opacity: 1, y: 0, duration: 1.0, delay: 0.45, ease: "power3.out" }
      );
    }
    if (subtitle) {
      gsap.fromTo(subtitle, 
        { opacity: 0, y: 35 }, 
        { opacity: 1, y: 0, duration: 0.9, delay: 0.6, ease: "power3.out" }
      );
    }
    if (cta) {
      gsap.fromTo(cta, 
        { opacity: 0, y: 25 }, 
        { opacity: 1, y: 0, duration: 0.8, delay: 0.75, ease: "power3.out" }
      );
    }
    if (hint) {
      gsap.fromTo(hint, 
        { opacity: 0, y: 15 }, 
        { opacity: 1, y: 0, duration: 0.8, delay: 1.0, ease: "power3.out" }
      );
    }
  }
}

// Global state variables
let scene, camera, renderer, particleGeometry, particleMaterial, particleSystem;
let shapes = [];
let dispersionDirections;
const N = 3000; // Number of particles

// GSAP animation control object
const animState = { scrollProgress: 0 };

/**
 * Programmatically generates a circular radial texture for the particles.
 * This guarantees soft, glowing, anti-aliased circular points on all devices.
 */
function createCircleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 16, 16);
  
  return new THREE.CanvasTexture(canvas);
}

/**
 * Initializes the Three.js Scene, Camera, WebGLRenderer, and Particle system.
 */
function initThree() {
  const container = document.getElementById('canvas-container');
  
  // Scene
  scene = new THREE.Scene();
  
  // Camera
  const fov = window.innerWidth < 768 ? 65 : 55;
  camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5.5;
  camera.position.y = 0.2;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Generate 3D Shapes Coordinates
  generateAllShapes();

  // Create active positions buffer array
  const currentPositions = new Float32Array(N * 3);
  // Initialize buffer with the coordinates of the first shape (Globe)
  for (let i = 0; i < N * 3; i++) {
    currentPositions[i] = shapes[0][i];
  }

  // Create Particle Geometry
  particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

  // Create Particle Material
  const pSize = window.innerWidth < 768 ? 0.035 : 0.055;
  particleMaterial = new THREE.PointsMaterial({
    color: 0x00E5FF,
    size: pSize,
    transparent: true,
    opacity: 0.9,
    map: createCircleTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  // Create Particle System
  particleSystem = new THREE.Points(particleGeometry, particleMaterial);
  particleSystem.position.y = -2.8; // Initial vertical offset for giant centered dome
  particleSystem.position.x = 0.0;
  particleSystem.scale.set(2.1, 2.1, 2.1); // Giant initial scale
  scene.add(particleSystem);

  // Set initial styles for #earth-overlay to prevent scroll snapping
  const initialY = window.innerWidth >= 768 ? '48vh' : '40vh';
  gsap.set('#earth-overlay', {
    y: initialY,
    x: '0vw',
    scale: 2.1,
    transformOrigin: "center center",
    opacity: 1.0
  });

  // Setup GSAP ScrollTrigger to control morphing progress
  initScrollTrigger();

  // Animation Loop
  const clock = new THREE.Clock();
  
  function tick() {
    const time = clock.getElapsedTime();
    
    // Smooth shape interpolation based on GSAP scroll progress
    interpolateParticles(time);
    
    // Slow rotational drift to make the shapes feel alive
    particleSystem.rotation.y = time * 0.06;
    particleSystem.rotation.x = Math.sin(time * 0.2) * 0.04;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  // Window Resize Event
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = window.innerWidth < 768 ? 65 : 55;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    particleMaterial.size = window.innerWidth < 768 ? 0.035 : 0.055;
  });
}

/**
 * Initializes the GSAP ScrollTrigger link between page scroll and particle morph progress.
 * Sets up a master timeline mapping scroll depth to section content visibility and particle shapes.
 * Applies premium staggered animations to individual layout children (titles, text, cards).
 */
function initScrollTrigger() {
  const sections = document.querySelectorAll('.section');
  const navLinks = document.querySelectorAll('.nav-link');

  // Mobile gets a completely different, much simpler scroll model - see
  // initMobileReveals() for why the pinned/scrubbed timeline below is
  // desktop-only.
  if (window.innerWidth < 768) {
    initMobileReveals(sections, navLinks);
    return;
  }

  // Set body height dynamically based on sections + 1 substeps (8 sections + 1 substep = 900vh)
  document.body.style.height = ((sections.length + 1) * 100) + 'vh';

  // Master timeline linked to scroll
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.1, // Responsive scroll transition link
      onUpdate: (self) => {
        // Update top scroll progress bar
        document.getElementById('scroll-progress-bar').style.width = (self.progress * 100) + '%';
        
        // Highlight active nav link dynamically based on 9 scroll steps (0 to 8)
        const val = self.progress * 8.0; // 0 to 8 scale
        let activeIdx;
        if (val <= 1.5) {
          activeIdx = 0; // Section 1 (first step: 0 to 1.5)
        } else {
          activeIdx = Math.min(Math.floor(val - 0.5), sections.length - 1);
        }
        
        navLinks.forEach((link, idx) => {
          if (idx === activeIdx) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    }
  });

  // Animate the particle morphing progress parameter with rapid morphing and stable holds
  // Stays at 0 (Globe) for the first scroll step (0 to 1)
  tl.to(animState, { scrollProgress: 0, duration: 1.0, ease: "none" }, 0);
  for (let i = 1; i < shapes.length; i++) {
    const startTime = i; // i=1 starts at 1, i=2 starts at 2, etc.
    
    // Morph quickly during the transition (first 0.45s of the step)
    tl.to(animState, {
      scrollProgress: i,
      duration: 0.45,
      ease: "power1.inOut"
    }, startTime);
    
    // Hold the shape completely stable for the remainder of the section view (next 0.55s)
    tl.to(animState, {
      scrollProgress: i,
      duration: 0.55,
      ease: "none"
    }, startTime + 0.45);
  }

  // FIRST SCROLL STEP (0.0 to 1.0): Starts giant and centered, holds stable, then shrinks and moves to the right
  // Hold phase (0.0 to 0.45)
  tl.fromTo(particleSystem.position,
    { y: -2.8, x: 0.0 },
    { y: -2.8, x: 0.0, duration: 0.45, ease: "none" },
    0
  );
  tl.fromTo(particleSystem.scale,
    { x: 2.1, y: 2.1, z: 2.1 },
    { x: 2.1, y: 2.1, z: 2.1, duration: 0.45, ease: "none" },
    0
  );
  tl.fromTo('#earth-overlay',
    { 
      y: window.innerWidth >= 768 ? '48vh' : '40vh', 
      x: '0vw', 
      scale: 2.1, 
      transformOrigin: "center center",
      opacity: 1.0 
    },
    { 
      y: window.innerWidth >= 768 ? '48vh' : '40vh', 
      x: '0vw', 
      scale: 2.1, 
      duration: 0.45, 
      ease: "none" 
    },
    0
  );

  // Transition phase (0.45 to 1.0)
  tl.to(particleSystem.position,
    { y: 0.0, x: window.innerWidth >= 768 ? 0.8 : 0.0, duration: 0.55, ease: "power1.inOut" },
    0.45
  );
  tl.to(particleSystem.scale,
    { x: 1.0, y: 1.0, z: 1.0, duration: 0.55, ease: "power1.inOut" },
    0.45
  );
  tl.to('#earth-overlay',
    { 
      y: '0vh', 
      x: window.innerWidth >= 768 ? '11vw' : 0, 
      scale: 1.0, 
      duration: 0.55, 
      ease: "power1.inOut" 
    },
    0.45
  );
  
  // SECOND SCROLL STEP (1.0 to 2.0): Globe slides back to center horizontally as it morphs to Column
  tl.fromTo(particleSystem.position,
    { x: window.innerWidth >= 768 ? 0.8 : 0.0 },
    { x: 0.0, duration: 1.0, ease: "power1.inOut" },
    1
  );
  tl.fromTo('#earth-overlay',
    { x: window.innerWidth >= 768 ? '11vw' : 0, opacity: 1.0 },
    { x: '0vw', opacity: 0.0, duration: 0.8, ease: "power1.inOut" },
    1.0
  );

  // Animate Camera Position dynamically to create a 3D flying camera path (shifted to start from step 1)
  tl.to(camera.position, { z: 5.4, y: 0.2, ease: "power1.inOut", duration: 1.0 }, 0); // Sec 1 -> Sec 2
  tl.to(camera.position, { z: 4.8, y: 0.5, ease: "power1.inOut", duration: 1.0 }, 1); // Sec 2 (closer Column view)
  tl.to(camera.position, { z: 5.8, y: 0.1, ease: "power1.inOut", duration: 1.0 }, 2); // Sec 2 -> Sec 3 (further out for Wing span)
  tl.to(camera.position, { z: 5.0, y: -0.3, ease: "power1.inOut", duration: 1.0 }, 3); // Sec 3 -> Sec 4 (low angle majestic Shield)
  tl.to(camera.position, { z: 5.4, y: 0.3, ease: "power1.inOut", duration: 1.0 }, 4); // Sec 4 -> Sec 5 (high angle Hourglass)
  tl.to(camera.position, { z: 4.6, y: 0.0, ease: "power1.inOut", duration: 1.0 }, 5); // Sec 5 -> Sec 6 (close-up Envelope)
  tl.to(camera.position, { z: 5.2, y: 0.4, ease: "power1.inOut", duration: 1.0 }, 6); // Sec 6 -> Sec 7 (tilted Star perspective)
  tl.to(camera.position, { z: 6.2, y: 0.2, ease: "power1.inOut", duration: 1.0 }, 7); // Sec 7 -> Sec 8 (wide global Network view)

  // Slide the particle system to the left during Section 3 (index 2) to match right-column text,
  // then slide it back to center for Section 4 (index 3). (active at time 2.15)
  if (window.innerWidth >= 768) {
    tl.to(particleSystem.position, {
      x: -1.4,
      duration: 0.65,
      ease: "power2.inOut"
    }, 2.15); // Slide out during scroll from Section 2 to Section 3

    tl.to(particleSystem.position, {
      x: 0,
      duration: 0.65,
      ease: "power2.inOut"
    }, 3.15); // Slide back during scroll from Section 3 to Section 4
  }

  // Animate each section content's fade-in and fade-out with staggered child scale-zoom animations
  sections.forEach((section, index) => {
    // Select elements in the current section
    const badge = section.querySelector('.badge, .section-label');
    const titles = section.querySelectorAll('.main-title, .section-title');
    const paragraphs = section.querySelectorAll('.subtitle, .paragraph, .section-subtitle');
    const cta = section.querySelector('.cta-buttons, .contact-badges');
    const sidebar = section.querySelector('.about-sidebar');
    const gridItems = section.querySelectorAll('.stat-card, .region-card, .service-card, .process-step, .form-wrapper, .testimonial-card, .footer-brand, .footer-contact, .footer-links, .video-slider-wrapper');

    if (index === 0) {
      // First scroll step (0.0 to 1.0): Hero elements slide to the left in-place
      const title = section.querySelector('.main-title, .section-title');
      const text = section.querySelector('.subtitle, .paragraph, .section-subtitle');
      const companyName = section.querySelector('.company-name-container');

      // On mobile the hero text is full-width and centered, so a horizontal slide
      // just clips it off the edge of the screen. Use a small vertical drift instead.
      const isMobileHero = window.innerWidth < 768;
      const slideAxis = isMobileHero ? 'y' : 'x';
      const slideIn = isMobileHero ? -15 : -300;
      const slideOut = isMobileHero ? -40 : -450;

      if (badge) tl.to(badge, { [slideAxis]: slideIn, duration: 1.0, ease: "power2.inOut" }, 0);
      if (companyName) tl.to(companyName, { [slideAxis]: slideIn, duration: 1.0, ease: "power2.inOut" }, 0);
      if (title) tl.to(title, { [slideAxis]: slideIn, duration: 1.0, ease: "power2.inOut" }, 0);
      if (text) tl.to(text, { [slideAxis]: slideIn, duration: 1.0, ease: "power2.inOut" }, 0);
      if (cta) tl.to(cta, { [slideAxis]: slideIn, duration: 1.0, ease: "power2.inOut" }, 0);
      const hintEl = section.querySelector('.scroll-hint');
      if (hintEl) tl.to(hintEl, { opacity: 0, y: -20, duration: 0.5 }, 0);

      // Second scroll step (1.0 to 2.0): Hero elements fade out completely
      const outTime = 1.15;
      tl.to(section, {
        opacity: 0, pointerEvents: "none", duration: 0.35,
        onComplete: () => { section.scrollTop = 0; },
        onReverseComplete: () => { section.scrollTop = 0; }
      }, outTime);
      if (companyName) tl.to(companyName, { [slideAxis]: slideOut, opacity: 0, duration: 0.3 }, outTime);
      if (title) tl.to(title, { [slideAxis]: slideOut, opacity: 0, duration: 0.3, ease: "power2.in" }, outTime);
      if (text) tl.to(text, { [slideAxis]: slideOut, opacity: 0, duration: 0.3, ease: "power2.in" }, outTime);
      if (cta) tl.to(cta, { [slideAxis]: slideOut, opacity: 0, duration: 0.3 }, outTime);
    } else {
      // Subsequent sections fade in
      if (index === 3) {
        // Section 4: Custom two-step animation sequence (Hizmetlerimiz)
        const inTimeCustom = index + 0.15; // 3.15 (exactly when Section 3 exits)
        
        // Reveal Section 4 container
        tl.fromTo(section,
          { opacity: 0, pointerEvents: "none" },
          { opacity: 1, pointerEvents: "auto", duration: 0.2 },
          inTimeCustom
        );

        const headerIntro = section.querySelector('.services-header-intro');
        const grid = section.querySelector('.services-grid');
        const cards = section.querySelectorAll('.service-card');

        // Step 1: Fade-in header intro texts (starts at 3.15, fully visible by 3.4)
        if (headerIntro) {
          const introBadge = headerIntro.querySelector('.section-label');
          const introTitle = headerIntro.querySelector('.section-title');
          const introSubtitle = headerIntro.querySelector('.section-subtitle');

          tl.fromTo(headerIntro,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.3 },
            inTimeCustom
          );
          if (introBadge) tl.fromTo(introBadge, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, inTimeCustom);
          if (introTitle) tl.fromTo(introTitle, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, inTimeCustom + 0.05);
          if (introSubtitle) tl.fromTo(introSubtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, inTimeCustom + 0.08);
        }

        // Step 2: Fade-out header intro texts (from 3.45 to 3.65)
        // Note: no display:none here on purpose - keeping it in-flow (just invisible)
        // means Section 4's total scroll height stays constant from the moment the
        // section becomes active, so mobile touch-scroll chaining into the services
        // grid below works reliably even on fast flicks (a height that changes mid-scroll
        // causes the browser to keep routing the scroll to the outer page instead).
        if (headerIntro) {
          tl.to(headerIntro, { opacity: 0, y: -30, duration: 0.2 }, 3.45);
        }

        // Step 3: Fade-in cards grid and cards staggered (from 3.65 to 4.05)
        if (grid) {
          tl.fromTo(grid,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
            3.65
          );
          if (cards.length > 0) {
            tl.fromTo(cards,
              { opacity: 0, y: 30, scale: 1.03 },
              { opacity: 1, y: 0, scale: 1.0, duration: 0.25, stagger: 0.03, ease: "power2.out" },
              3.68
            );
          }
        }

        // Exit of Section 4
        if (index < sections.length - 1) {
          const outTime = index + 1.15; // 4.15
          tl.to(section, {
            opacity: 0, pointerEvents: "none", duration: 0.35,
            onComplete: () => { section.scrollTop = 0; },
            onReverseComplete: () => { section.scrollTop = 0; }
          }, outTime);
          if (grid) tl.to(grid, { y: -50, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
        }
      } else if (index === 4) {
        // Section 5: Custom two-step animation sequence (Nasıl Çalışıyoruz / Süreç)
        const inTimeCustom = index + 0.15; // 4.15 (exactly when Section 4 exits)
        
        // Reveal Section 5 container
        tl.fromTo(section,
          { opacity: 0, pointerEvents: "none" },
          { opacity: 1, pointerEvents: "auto", duration: 0.2 },
          inTimeCustom
        );

        const headerIntro = section.querySelector('.process-header-intro');
        const grid = section.querySelector('.process-timeline');
        const cards = section.querySelectorAll('.process-step');

        // Step 1: Fade-in header intro texts (starts at 4.15, fully visible by 4.4)
        if (headerIntro) {
          const introBadge = headerIntro.querySelector('.section-label');
          const introTitle = headerIntro.querySelector('.section-title');
          const introSubtitle = headerIntro.querySelector('.section-subtitle');

          tl.fromTo(headerIntro,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.3 },
            inTimeCustom
          );
          if (introBadge) tl.fromTo(introBadge, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.25 }, inTimeCustom);
          if (introTitle) tl.fromTo(introTitle, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, inTimeCustom + 0.05);
          if (introSubtitle) tl.fromTo(introSubtitle, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 }, inTimeCustom + 0.08);
        }

        // Step 2: Fade-out header intro texts (from 4.45 to 4.65)
        // No display:none here either - see the note on Section 4's headerIntro above.
        if (headerIntro) {
          tl.to(headerIntro, { opacity: 0, y: -30, duration: 0.2 }, 4.45);
        }

        // Step 3: Fade-in timeline steps staggered (from 4.65 to 5.05)
        if (grid) {
          tl.fromTo(grid,
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
            4.65
          );
          if (cards.length > 0) {
            tl.fromTo(cards,
              { opacity: 0, y: 30, scale: 1.03 },
              { opacity: 1, y: 0, scale: 1.0, duration: 0.25, stagger: 0.03, ease: "power2.out" },
              4.68
            );
          }
        }

        // Exit of Section 5
        if (index < sections.length - 1) {
          const outTime = index + 1.15; // 5.15
          tl.to(section, {
            opacity: 0, pointerEvents: "none", duration: 0.35,
            onComplete: () => { section.scrollTop = 0; },
            onReverseComplete: () => { section.scrollTop = 0; }
          }, outTime);
          if (grid) tl.to(grid, { y: -50, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
        }
      } else if (index === sections.length - 1) {
        // Last section (Footer): custom staggered reveal across the footer columns
        // so arriving here from References feels like a deliberate entrance rather
        // than an abrupt cut (the generic single 0.2s container fade was too quick
        // to notice on this section).
        const inTimeFooter = index + 0.15; // exactly when the previous section exits

        tl.fromTo(section,
          { opacity: 0, pointerEvents: "none" },
          { opacity: 1, pointerEvents: "auto", duration: 0.3 },
          inTimeFooter
        );

        const footerBrand = section.querySelector('.footer-brand');
        const footerContact = section.querySelector('.footer-contact');
        const footerLinks = section.querySelector('.footer-links');
        const footerBottom = section.querySelector('.footer-bottom');

        if (footerBrand) {
          tl.fromTo(footerBrand,
            { opacity: 0, y: 45, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.45, ease: "power2.out" },
            inTimeFooter
          );
        }
        if (footerContact) {
          tl.fromTo(footerContact,
            { opacity: 0, y: 45, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.45, ease: "power2.out" },
            inTimeFooter + 0.1
          );
        }
        if (footerLinks) {
          tl.fromTo(footerLinks,
            { opacity: 0, y: 45, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.45, ease: "power2.out" },
            inTimeFooter + 0.2
          );
        }
        if (footerBottom) {
          tl.fromTo(footerBottom,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
            inTimeFooter + 0.35
          );
        }
      } else {
        // Generic animation loop for other sections
        // inTime matches the previous section's outTime (index + 0.15) so the
        // incoming section crossfades in exactly as the outgoing one fades out,
        // instead of leaving a dead gap where neither section is visible.
        const inTime = index + 0.15;
        
        // Reveal parent section container
        tl.fromTo(section,
          { opacity: 0, pointerEvents: "none" },
          { opacity: 1, pointerEvents: "auto", duration: 0.2 },
          inTime
        );
        
        // Staggered slide up, scale down (fading in from a slightly zoomed-in forward state)
        if (badge) {
          tl.fromTo(badge, 
            { opacity: 0, y: 40, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.35, ease: "power2.out" },
            inTime
          );
        }
        if (titles.length > 0) {
          tl.fromTo(titles, 
            { opacity: 0, y: 55, scale: 1.08 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.4, stagger: 0.05, ease: "power2.out" },
            inTime + 0.05
          );
        }
        if (paragraphs.length > 0) {
          tl.fromTo(paragraphs, 
            { opacity: 0, y: 40, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.4, stagger: 0.05, ease: "power2.out" },
            inTime + 0.1
          );
        }
        if (sidebar) {
          tl.fromTo(sidebar, 
            { opacity: 0, y: 50, scale: 1.05 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.4, ease: "power2.out" },
            inTime + 0.12
          );
        }
        if (cta) {
          tl.fromTo(cta, 
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
            inTime + 0.15
          );
        }
        if (gridItems.length > 0) {
          // Fast responsive stagger so all cards are fully visible when the section is centered
          tl.fromTo(gridItems, 
            { opacity: 0, y: 30, scale: 1.03 },
            { opacity: 1, y: 0, scale: 1.0, duration: 0.25, stagger: 0.03, ease: "power2.out" },
            inTime + 0.05
          );
        }
   
        // If it's not the last section, fade it out before the next one enters
        if (index < sections.length - 1) {
          const outTime = index + 1.15; // Shifted exit
          tl.to(section, {
            opacity: 0, pointerEvents: "none", duration: 0.35,
            onComplete: () => { section.scrollTop = 0; },
            onReverseComplete: () => { section.scrollTop = 0; }
          }, outTime);

          // Coordinated slide out and scale down for children
          if (badge) tl.to(badge, { y: -30, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
          if (titles.length > 0) tl.to(titles, { y: -45, scale: 0.92, opacity: 0, duration: 0.3 }, outTime);
          if (paragraphs.length > 0) tl.to(paragraphs, { y: -35, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
          if (sidebar) tl.to(sidebar, { y: -45, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
          if (cta) tl.to(cta, { y: -30, opacity: 0, duration: 0.3 }, outTime);
          if (gridItems.length > 0) {
            tl.to(gridItems, { y: -50, scale: 0.95, opacity: 0, duration: 0.3 }, outTime);
          }
        }
      }
    }
  });
}

/**
 * Mobile scroll model: sections sit in normal document flow (see the
 * `@media (max-width: 768px)` override on `.section` in style.css) instead of
 * being pinned full-viewport overlays, so there's no single master timeline
 * to scrub. Each section instead gets a lightweight one-shot reveal (fade +
 * slide up) the first time it's scrolled into view, the 3D globe gets a
 * simple time-based entrance instead of a scroll-linked one, and the progress
 * bar / active nav link are driven off plain scroll position.
 */
function initMobileReveals(sections, navLinks) {
  // The globe/earth overlay start at their desktop "giant, pushed down"
  // initial pose (set in initThree/initScrollTrigger) because that's the
  // `from` state of a scroll-scrubbed tween on desktop. Mobile has no such
  // tween, so settle it into place once, on a timer, instead of leaving it
  // stuck oversized off-screen.
  gsap.to(particleSystem.position, { y: 0, x: 0, duration: 1.3, delay: 0.15, ease: "power3.out" });
  gsap.to(particleSystem.scale, { x: 1, y: 1, z: 1, duration: 1.3, delay: 0.15, ease: "power3.out" });
  gsap.to('#earth-overlay', { y: '0vh', x: '0vw', scale: 1, duration: 1.3, delay: 0.15, ease: "power3.out" });

  // Maps a section's index to its corresponding nav link index (nav has one
  // fewer entry than there are sections - "İletişime Geçin" isn't a direct
  // nav target, "İletişim" points at the footer instead).
  const sectionToNavIndex = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 6: 5, 7: 6 };

  sections.forEach((section, index) => {
    if (index > 0) {
      const targets = [
        section.querySelector('.badge, .section-label'),
        ...section.querySelectorAll('.main-title, .section-title'),
        ...section.querySelectorAll('.subtitle, .paragraph, .section-subtitle'),
        section.querySelector('.cta-buttons, .contact-badges'),
        section.querySelector('.about-sidebar'),
        ...section.querySelectorAll('.stat-card, .region-card, .service-card, .process-step, .form-wrapper, .testimonial-card, .footer-brand, .footer-contact, .footer-links, .video-slider-wrapper')
      ].filter(Boolean);

      if (targets.length > 0) {
        gsap.set(targets, { opacity: 0, y: 30 });
        ScrollTrigger.create({
          trigger: section,
          start: "top 85%",
          once: true,
          onEnter: () => gsap.to(targets, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" })
        });
      }
    }

    const navIndex = sectionToNavIndex[index];
    if (navIndex !== undefined) {
      ScrollTrigger.create({
        trigger: section,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) {
            navLinks.forEach((link, i) => link.classList.toggle('active', i === navIndex));
          }
        }
      });
    }
  });

  // Progress bar, driven off plain document scroll instead of the
  // (desktop-only) master ScrollTrigger's onUpdate.
  const progressBar = document.getElementById('scroll-progress-bar');
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = (scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // The video previews and other async content can shift section heights
  // after ScrollTrigger's initial measurement, throwing off the reveal/nav
  // trigger points - resync once everything has actually finished loading.
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    updateProgress();
  });
}

/**
 * Linearly interpolates particle buffer positions between Shape i and Shape i+1
 * based on the active scrollProgress value. Applies a sinusoidal dispersion/puffing
 * effect at the 50% morph stage to create a magical transition.
 */
function interpolateParticles(time) {
  const totalShapes = shapes.length;
  const progressVal = animState.scrollProgress;
  
  // Calculate active indices
  const baseIndex = Math.min(Math.floor(progressVal), totalShapes - 2);
  const nextIndex = baseIndex + 1;
  const ratio = progressVal - baseIndex; // 0 to 1 between the two shapes

  const posAttr = particleGeometry.attributes.position;
  const positions = posAttr.array;

  const shapeA = shapes[baseIndex];
  const shapeB = shapes[nextIndex];

  // Sinusoidal puff factor peaking at ratio = 0.5
  const puffFactor = Math.sin(ratio * Math.PI);
  const dispersionAmount = puffFactor * 0.65; // dispersion displacement magnitude

  for (let i = 0; i < N; i++) {
    const i3 = i * 3;

    // Source shape coordinates
    const ax = shapeA[i3];
    const ay = shapeA[i3 + 1];
    const az = shapeA[i3 + 2];

    // Destination shape coordinates
    const bx = shapeB[i3];
    const by = shapeB[i3 + 1];
    const bz = shapeB[i3 + 2];

    // Dispersion vector components
    const dx = dispersionDirections[i3];
    const dy = dispersionDirections[i3 + 1];
    const dz = dispersionDirections[i3 + 2];

    // Add static floating/twinkling effect to make particles look alive
    const twinkle = Math.sin(time * 2 + i) * 0.015;

    // Linear morphing + dispersion puff + twinkle offset
    positions[i3]     = ax + (bx - ax) * ratio + dx * dispersionAmount + twinkle * dx;
    positions[i3 + 1] = ay + (by - ay) * ratio + dy * dispersionAmount + twinkle * dy;
    positions[i3 + 2] = az + (bz - az) * ratio + dz * dispersionAmount + twinkle * dz;
  }

  posAttr.needsUpdate = true;
}

/**
 * Triggers generator functions to build particle coordinate datasets for all 8 shapes.
 */
function generateAllShapes() {
  shapes.push(generateGlobe(N));
  shapes.push(generateColumn(N));
  shapes.push(generateAirplane(N));
  shapes.push(generateShield(N));
  shapes.push(generateHourglass(N));
  shapes.push(generateEnvelope(N));
  shapes.push(generateStar(N));
  shapes.push(generateNetwork(N));

  // Generate random direction vectors for puff dispersion during transitions
  dispersionDirections = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    
    dispersionDirections[i * 3]     = Math.sin(phi) * Math.cos(theta);
    dispersionDirections[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
    dispersionDirections[i * 3 + 2] = Math.cos(phi);
  }
}

/* ==========================================================================
   3D Particle Shapes Procedural Coordinate Generators
   ========================================================================== */

// 1. Globe (Sphere Shell)
function generateGlobe(N) {
  const arr = new Float32Array(N * 3);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < N; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / N);
    const R = 2.0; // bounding radius
    
    arr[i * 3]     = R * Math.cos(theta) * Math.sin(phi);
    arr[i * 3 + 1] = R * Math.sin(theta) * Math.sin(phi);
    arr[i * 3 + 2] = R * Math.cos(phi);
  }
  return arr;
}

// 2. Classical Ribbed Column (Law / Institution Pillar)
function generateColumn(N) {
  const arr = new Float32Array(N * 3);
  const shaftCount = Math.floor(N * 0.7);
  const capCount = Math.floor(N * 0.15);
  const baseCount = N - shaftCount - capCount;

  let idx = 0;

  // Shaft (Cylindrical center body with vertical ribbed channels)
  for (let i = 0; i < shaftCount; i++) {
    const pct = i / shaftCount;
    const y = -1.5 + 3.0 * pct;
    const theta = pct * Math.PI * 36;
    const ribMod = 0.65 + 0.05 * Math.sin(8 * theta); // 8 vertical ribbed grooves
    
    arr[idx++] = ribMod * Math.cos(theta);
    arr[idx++] = y;
    arr[idx++] = ribMod * Math.sin(theta);
  }

  // Base Plate (Flat square bottom slab)
  for (let i = 0; i < baseCount; i++) {
    const x = (Math.random() - 0.5) * 1.8;
    const z = (Math.random() - 0.5) * 1.8;
    const y = -1.7 + Math.random() * 0.2;
    arr[idx++] = x;
    arr[idx++] = y;
    arr[idx++] = z;
  }

  // Capital Plate (Flat square top styling block)
  for (let i = 0; i < capCount; i++) {
    const x = (Math.random() - 0.5) * 2.0;
    const z = (Math.random() - 0.5) * 2.0;
    const y = 1.5 + Math.random() * 0.2;
    arr[idx++] = x;
    arr[idx++] = y;
    arr[idx++] = z;
  }

  return arr;
}

// 3. 3D Airplane Passenger Jet Model (Premium detailed design, pre-rotated & scaled)
function generateAirplane(N) {
  const arr = new Float32Array(N * 3);
  
  // Coordinate allocation counts
  const fuselageCount = 1000;
  const wingsCount = 1200;
  const enginesCount = 400; // 200 per engine
  const tailplaneCount = 200;
  const finCount = 200;

  let idx = 0;

  // Yaw = 72 degrees (1.25 rad), Pitch = 22 degrees (0.38 rad), Roll = -18 degrees (-0.31 rad)
  const cosY = Math.cos(1.25), sinY = Math.sin(1.25);
  const cosX = Math.cos(0.38), sinX = Math.sin(0.38);
  const cosZ = Math.cos(-0.31), sinZ = Math.sin(-0.31);

  function storeRotatedPoint(startIdx, x, y, z) {
    // 1. Rotate around Y (Yaw)
    let x1 = x * cosY - z * sinY;
    let z1 = x * sinY + z * cosY;
    let y1 = y;

    // 2. Rotate around X (Pitch)
    let y2 = y1 * cosX - z1 * sinX;
    let z2 = y1 * sinX + z1 * cosX;
    let x2 = x1;

    // 3. Rotate around Z (Roll)
    let x3 = x2 * cosZ - y2 * sinZ;
    let y3 = x2 * sinZ + y2 * cosZ;
    let z3 = z2;

    // Apply scale multiplier to make the airplane larger on screen!
    const scale = 1.35; // 35% larger!
    arr[startIdx] = x3 * scale;
    arr[startIdx + 1] = y3 * scale;
    arr[startIdx + 2] = z3 * scale;
  }

  // 1. Fuselage: structural ring slices for a highly professional blueprint grid look
  const slices = 40;
  const pointsPerSlice = Math.floor(fuselageCount / slices);
  for (let s = 0; s < slices; s++) {
    const pct = s / (slices - 1);
    const z = -1.8 + 3.6 * pct; // length from -1.8 to 1.8
    
    // Fuselage radius with smooth nose and tail tapers
    let r = 0.26;
    if (z > 1.0) {
      // Smooth nose curve (parabolic)
      const t = (z - 1.0) / 0.8;
      r = 0.26 * Math.sqrt(1.0 - t * t);
    } else if (z < -1.0) {
      // Smooth tail taper
      const t = Math.abs(z + 1.0) / 0.8;
      r = 0.26 * (1.0 - t);
    }
    if (isNaN(r) || r < 0) r = 0.01;

    for (let p = 0; p < pointsPerSlice; p++) {
      const theta = (p / pointsPerSlice) * Math.PI * 2;
      const rx = r * Math.cos(theta);
      const ry = r * Math.sin(theta);
      const rz = z;
      storeRotatedPoint(idx, rx, ry, rz);
      idx += 3;
    }
  }
  
  // Fill remaining fuselage points
  while (idx < fuselageCount * 3) {
    const z = -1.8 + 3.6 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const rx = 0.26 * Math.cos(theta);
    const ry = 0.26 * Math.sin(theta);
    storeRotatedPoint(idx, rx, ry, z);
    idx += 3;
  }

  // 2. Main Wings: Swept wings with curving Winglets
  for (let i = 0; i < wingsCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const wingX = Math.random(); // Span factor 0 to 1
    const rx = side * (0.26 + wingX * 2.15); // extends from fuselage edge to wingtip
    
    const sweep = -0.65 * wingX; // wing sweep back
    const chord = 0.48 * (1.0 - wingX * 0.75); // chord tapers
    const zOffset = (Math.random() - 0.5) * chord;
    const rz = -0.05 + sweep + zOffset;
    
    // Winglets: tips curve upward (raising Y as we reach the tip)
    let ry = (Math.random() - 0.5) * 0.03;
    if (wingX > 0.85) {
      // curve up
      const wingletFactor = (wingX - 0.85) / 0.15; // 0 to 1
      ry += 0.35 * Math.pow(wingletFactor, 2.0); // curve up to 0.35 units
    }

    storeRotatedPoint(idx, rx, ry, rz);
    idx += 3;
  }

  // 3. Turbine Engines (Two cylindrical jet engines under the wings)
  const enginePoints = Math.floor(enginesCount / 2);
  for (let e = 0; e < 2; e++) {
    const side = e === 0 ? -1 : 1;
    const cx = side * 0.72;
    const cy = -0.22;
    const cz = -0.15;
    
    for (let p = 0; p < enginePoints; p++) {
      // Cylinder coordinates along Z
      const ez = cz + (Math.random() - 0.5) * 0.55; // length = 0.55
      const theta = Math.random() * Math.PI * 2;
      const er = 0.13; // engine intake diameter
      
      const rx = cx + er * Math.cos(theta);
      const ry = cy + er * Math.sin(theta);
      const rz = ez;
      
      storeRotatedPoint(idx, rx, ry, rz);
      idx += 3;
    }
  }

  // 4. Tailplane (Horizontal stabilizers)
  for (let i = 0; i < tailplaneCount; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const tailX = Math.random();
    const rx = side * (0.08 + tailX * 0.7);
    const sweep = -0.25 * tailX;
    const chord = 0.24 * (1.0 - tailX * 0.6);
    const zOffset = (Math.random() - 0.5) * chord;
    const rz = -1.4 + sweep + zOffset;
    const ry = (Math.random() - 0.5) * 0.02;

    storeRotatedPoint(idx, rx, ry, rz);
    idx += 3;
  }

  // 5. Vertical Tail Fin
  for (let i = 0; i < finCount; i++) {
    const finY = Math.random();
    const ry = 0.08 + finY * 0.85; // height up to 0.85
    const sweep = -0.36 * finY;
    const chord = 0.3 * (1.0 - finY * 0.7);
    const zOffset = (Math.random() - 0.5) * chord;
    const rz = -1.4 + sweep + zOffset;
    const rx = (Math.random() - 0.5) * 0.02;

    storeRotatedPoint(idx, rx, ry, rz);
    idx += 3;
  }

  // Fill array buffer boundary safety check
  while (idx < N * 3) {
    arr[idx] = 0;
    arr[idx + 1] = 0;
    arr[idx + 2] = 0;
    idx += 3;
  }

  return arr;
}

// 4. Shield (Curved Protection Coat of Arms)
function generateShield(N) {
  const arr = new Float32Array(N * 3);
  
  for (let i = 0; i < N; i++) {
    // Height y from -1.8 to 1.6
    const y = -1.8 + 3.4 * Math.random();
    
    // Bounds calculations (tapers bottom, dips in center top)
    let w = 1.3;
    if (y < 0) {
      w = 1.3 * (1.0 - Math.pow(y / -1.8, 2.5)); // Taper down to point at y = -1.8
    } else {
      w = 1.3 * (1.0 - 0.18 * Math.pow(y / 1.6, 2.0)); // Top curves in slightly
    }
    
    const x = (Math.random() - 0.5) * 2 * w;
    // Curved backwards to give it 3D shield volume
    const z = 0.45 * (1.0 - Math.pow(x / (w || 1), 2)) + (Math.random() - 0.5) * 0.05;

    arr[i * 3]     = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  return arr;
}

// 5. Hourglass (Time / Speed Flow)
function generateHourglass(N) {
  const arr = new Float32Array(N * 3);
  const coneCount = Math.floor(N * 0.7);
  const topDisk = Math.floor(N * 0.15);
  const botDisk = N - coneCount - topDisk;

  let idx = 0;

  // Double intersecting tapering cones (Waist at y=0)
  for (let i = 0; i < coneCount; i++) {
    const pct = i / coneCount;
    const y = -1.5 + 3.0 * pct;
    const r = 0.15 + 0.8 * (Math.abs(y) / 1.5);
    const theta = pct * Math.PI * 44;
    
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = y;
    arr[idx++] = r * Math.sin(theta);
  }

  // Bottom Base Plate Disk
  for (let i = 0; i < botDisk; i++) {
    const r = Math.sqrt(Math.random()) * 0.95;
    const theta = Math.random() * Math.PI * 2;
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = -1.6;
    arr[idx++] = r * Math.sin(theta);
  }

  // Top Lid Disk
  for (let i = 0; i < topDisk; i++) {
    const r = Math.sqrt(Math.random()) * 0.95;
    const theta = Math.random() * Math.PI * 2;
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = 1.6;
    arr[idx++] = r * Math.sin(theta);
  }

  return arr;
}

// 6. Envelope (Message / Letter)
function generateEnvelope(N) {
  const arr = new Float32Array(N * 3);
  const bodyCount = Math.floor(N * 0.65);
  const flapCount = Math.floor(N * 0.25);
  const linesCount = N - bodyCount - flapCount;

  let idx = 0;

  // Rectangle body with minor thickness (depth)
  for (let i = 0; i < bodyCount; i++) {
    const x = (Math.random() - 0.5) * 3.2; // Width = 3.2
    const y = (Math.random() - 0.5) * 2.0; // Height = 2.0
    const z = (Math.random() > 0.5 ? 0.06 : -0.06) + (Math.random() - 0.5) * 0.01;
    
    arr[idx++] = x;
    arr[idx++] = y;
    arr[idx++] = z;
  }

  // Flap top triangle (pointing up)
  for (let i = 0; i < flapCount; i++) {
    const pct = i / flapCount;
    const y = 1.0 + 0.85 * pct;
    const w = 1.6 * (1.0 - pct); // Tapering
    const x = (Math.random() - 0.5) * 2 * w;
    const z = 0.06 + 0.1 * pct + (Math.random() - 0.5) * 0.01;
    
    arr[idx++] = x;
    arr[idx++] = y;
    arr[idx++] = z;
  }

  // Seam lines to draw folds on the letter
  for (let i = 0; i < linesCount; i++) {
    const pct = i / linesCount;
    // Map points along diagonals representing folds
    if (Math.random() > 0.5) {
      // Left diagonal
      const x = -1.6 + 3.2 * pct;
      const y = -1.0 + 2.0 * pct;
      arr[idx++] = x;
      arr[idx++] = y;
      arr[idx++] = 0.07;
    } else {
      // Right diagonal
      const x = 1.6 - 3.2 * pct;
      const y = -1.0 + 2.0 * pct;
      arr[idx++] = x;
      arr[idx++] = y;
      arr[idx++] = 0.07;
    }
  }

  return arr;
}

// 7. Star (Faceted 3D Star)
function generateStar(N) {
  const arr = new Float32Array(N * 3);
  
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    // 5 segments (5 points)
    const segment = (theta * 5) / (Math.PI * 2);
    const segmentInt = Math.floor(segment);
    const t = segment - segmentInt; // fractional segment progress (0 to 1)

    const rOuter = 2.0;
    const rInner = 0.8;
    
    let r = rInner;
    if (t < 0.5) {
      r = rOuter + (rInner - rOuter) * (t / 0.5); // Outer down to Inner
    } else {
      r = rInner + (rOuter - rInner) * ((t - 0.5) / 0.5); // Inner back up to Outer
    }

    const rDist = Math.pow(Math.random(), 0.8) * r;
    const x = rDist * Math.cos(theta);
    const y = rDist * Math.sin(theta);
    
    // Extrude out in 3D center
    const maxThickness = 0.45 * (1.0 - rDist / r);
    const z = (Math.random() > 0.5 ? 1 : -1) * maxThickness * Math.random();

    arr[i * 3]     = x;
    arr[i * 3 + 1] = y;
    arr[i * 3 + 2] = z;
  }
  return arr;
}

// 8. Global Connection Network Node
function generateNetwork(N) {
  const arr = new Float32Array(N * 3);
  const ringCount = Math.floor(N * 0.75 / 3);
  const centerCore = N - (ringCount * 3);

  let idx = 0;

  // Ring 1 (XY Plane ring)
  for (let i = 0; i < ringCount; i++) {
    const theta = (i / ringCount) * Math.PI * 2;
    const r = 1.9 + (Math.random() - 0.5) * 0.08;
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = r * Math.sin(theta);
    arr[idx++] = (Math.random() - 0.5) * 0.15;
  }

  // Ring 2 (YZ Plane ring)
  for (let i = 0; i < ringCount; i++) {
    const theta = (i / ringCount) * Math.PI * 2;
    const r = 1.75 + (Math.random() - 0.5) * 0.08;
    arr[idx++] = (Math.random() - 0.5) * 0.15;
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = r * Math.sin(theta);
  }

  // Ring 3 (XZ Plane ring)
  for (let i = 0; i < ringCount; i++) {
    const theta = (i / ringCount) * Math.PI * 2;
    const r = 1.6 + (Math.random() - 0.5) * 0.08;
    arr[idx++] = r * Math.cos(theta);
    arr[idx++] = (Math.random() - 0.5) * 0.15;
    arr[idx++] = r * Math.sin(theta);
  }

  // Dense connection core at the center (scattered neural node points)
  for (let i = 0; i < centerCore; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = Math.pow(Math.random(), 1.5) * 1.0; // Core cluster

    arr[idx++] = r * Math.sin(phi) * Math.cos(theta);
    arr[idx++] = r * Math.sin(phi) * Math.sin(theta);
    arr[idx++] = r * Math.cos(phi);
  }

  return arr;
}

/* ==========================================================================
   Interactive Navigation Logic
   ========================================================================== */
function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const header = document.getElementById('main-header');
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  // Sticky header transition on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Mobile menu toggle click handling
  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('open');
    navMenu.classList.toggle('open');
  });

  // Dedicated close (X) button inside the mobile drawer itself
  const navMenuClose = document.querySelector('.nav-menu-close');
  if (navMenuClose) {
    navMenuClose.addEventListener('click', () => {
      mobileToggle.classList.remove('open');
      navMenu.classList.remove('open');
    });
  }

  // Close mobile navigation menu on clicking a nav link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('open');
      navMenu.classList.remove('open');
    });
  });

  // Smooth scroll to the target section when clicking navigation links.
  // Desktop sections are fixed-height overlays, so a step-based scroll
  // distance works there; mobile sections flow naturally at whatever height
  // their content needs, so it scrolls to the section's real position instead.
  navLinks.forEach((link, index) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      if (window.innerWidth < 768) {
        const targetSection = document.querySelector(link.getAttribute('href'));
        if (!targetSection) return;
        const headerOffset = 70;
        const targetY = targetSection.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(targetY, 0), behavior: 'smooth' });
        return;
      }

      const targetStep = index === 0 ? 0 : index + 1; // Map Anasayfa to step 0, others to index + 1
      const targetScrollY = targetStep * window.innerHeight;
      window.scrollTo({
        top: targetScrollY,
        behavior: 'smooth'
      });
    });
  });
}

/**
 * Builds a pre-filled WhatsApp message from the consultation form fields and
 * opens it in a new tab instead of submitting the form anywhere.
 */
function initConsultationForm() {
  const form = document.getElementById('consultation-form');
  if (!form) return;

  const WHATSAPP_NUMBER = '48731847745'; // +48 731 847 745

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const serviceSelect = document.getElementById('form-service');
    const service = serviceSelect.options[serviceSelect.selectedIndex].text;
    const message = document.getElementById('form-message').value.trim();

    const text = `Merhaba ismim ${name}. ${service} ilgileniyorum. ${message}`;
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
  });
}

/**
 * Initializes navigation controls for the Instagram video slider carousel in Section 7.
 */
function initVideoSlider() {
  // Slider control actions are handled directly via inline HTML onclick attributes
  // to ensure instant execution and bypass browser file caching issues.
  const trackContainer = document.querySelector('.video-track-container');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  console.log("Slider elements ready (inline handled):", { trackContainer, prevBtn, nextBtn });
}

/**
 * Initializes the video lightbox modal overlay to watch local videos or fallback to Instagram Reels.
 */
function initVideoModal() {
  const modal = document.getElementById('video-modal');
  if (!modal) return;

  const overlay = modal.querySelector('.video-modal-overlay');
  const closeBtn = modal.querySelector('.video-modal-close');
  const content = modal.querySelector('.video-modal-content');
  const videoLinks = document.querySelectorAll('.video-card-link');

  if (!videoLinks.length) return;

  const extractShortcode = (url) => {
    const match = url.match(/(?:reel|p)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  videoLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const embedId = link.getAttribute('data-embed-id');
      const url = link.getAttribute('href');
      const isLocalVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('/videos/');
      
      if (embedId) {
        const template = document.getElementById(embedId);
        if (template) {
          content.innerHTML = template.innerHTML;
          // Render Instagram widget
          if (window.instgrm) {
            window.instgrm.Embeds.process();
          } else {
            const script = document.createElement('script');
            script.async = true;
            script.src = "https://www.instagram.com/embed.js";
            document.body.appendChild(script);
          }
        }
      } else if (isLocalVideo) {
        // Inject HTML5 video player with native controls and autoplay
        content.innerHTML = `<video src="${url}" controls autoplay playsinline class="modal-video-player"></video>`;
      } else {
        const shortcode = extractShortcode(url);
        if (!shortcode) return;

        // Construct official Instagram embed widget URL
        const embedUrl = `https://www.instagram.com/reel/${shortcode}/embed/`;

        // Inject iframe containing the player
        content.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowtransparency="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
      }

      // Open Modal
      modal.classList.add('active');
    });
  });

  const closeModal = () => {
    modal.classList.remove('active');
    
    // Pause video to stop playback sound immediately
    const video = content.querySelector('video');
    if (video) {
      video.pause();
    }
    
    // Clear content after animation ends to reset player
    setTimeout(() => {
      content.innerHTML = '';
    }, 400);
  };

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
}

/**
 * Adds interactive hover previews to success stories cards, playing local video previews silently on hover.
 */
function initVideoHoverPreviews() {
  const cards = document.querySelectorAll('.video-slide');
  cards.forEach(card => {
    const video = card.querySelector('.card-preview-video');
    if (!video) return;

    video.playbackRate = 1.0;

    // Try to play immediately in case autoplay is blocked or delayed
    video.play().catch(err => {
      console.warn("Video autoplay play interrupted:", err);
    });
  });
}

