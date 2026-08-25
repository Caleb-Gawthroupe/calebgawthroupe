document.addEventListener('DOMContentLoaded', () => {
  const menuBtns = document.querySelectorAll('.menu-btn[data-target]');
  const panels = document.querySelectorAll('.display-panel');
  const gameContainer = document.querySelector('.game-container');
  let topZIndex = 100;

  menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      
      // Update active state on buttons
      menuBtns.forEach(b => b.classList.remove('active-menu'));
      btn.classList.add('active-menu');

      // Hide all panels
      panels.forEach(panel => panel.classList.remove('active'));
      
      // Show targeted panel
      const targetPanel = document.getElementById(`panel-${targetId}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      // Hide details panels on tab switch
      document.querySelectorAll('.dynamic-popup').forEach(popup => {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 250);
      });
    });
  });

  // Handle skills sub-tab switching
  const skillsTabBtns = document.querySelectorAll('.skills-tab-btn');
  const skillsContentGroups = document.querySelectorAll('.skills-content-group');

  skillsTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetGroup = btn.getAttribute('data-skill-target');
      
      // Update active state on sub-tab buttons
      skillsTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all content groups and show the target group
      skillsContentGroups.forEach(group => {
        if (group.id === `skills-${targetGroup}`) {
          group.style.display = 'flex';
        } else {
          group.style.display = 'none';
        }
      });
    });
  });

  // Handle clicking on cards to show details
  document.querySelectorAll('.clickable-card').forEach(card => {
    card.addEventListener('click', () => {
      const popupId = card.getAttribute('data-popup-id');
      const template = card.querySelector('.card-detail-template');
      
      if (popupId) {
        // If a popup for this item is already open, bring it to front and flash highlight it
        const existing = document.querySelector(`.dynamic-popup[data-popup-id="${popupId}"]`);
        if (existing) {
          existing.style.zIndex = ++topZIndex;
          existing.classList.remove('pulse-highlight');
          void existing.offsetWidth; // trigger reflow
          existing.classList.add('pulse-highlight');
          return;
        }
      }
      
      if (template) {
        createPopup(template.innerHTML, popupId);
      }
    });
  });

  // Dynamic Popup Creation & Dragging Logic
  function createPopup(contentHtml, popupId) {
    const popup = document.createElement('div');
    popup.className = 'details-panel dynamic-popup';
    if (popupId) {
      popup.setAttribute('data-popup-id', popupId);
    }
    popup.style.zIndex = ++topZIndex;

    // Set initial position to center of viewport with small random offset
    const offsetRange = 60; // +/- 30px offset
    const offsetX = (Math.random() - 0.5) * offsetRange;
    const offsetY = (Math.random() - 0.5) * offsetRange;
    
    popup.style.position = 'absolute';
    popup.style.left = `calc(50% + ${offsetX}px)`;
    popup.style.top = `calc(50% + ${offsetY}px)`;
    
    // Add slightly randomized rotation for retro paper aesthetic
    const randomRotate = (Math.random() - 0.5) * 6; // -3deg to 3deg
    popup.style.transform = `translate(-50%, -50%) rotate(${randomRotate}deg)`;

    // HTML Content
    popup.innerHTML = `
      <div class="popup-tape"></div>
      <button class="close-details-btn"><i class="fa-solid fa-xmark"></i></button>
      <div class="details-content">
        ${contentHtml}
      </div>
    `;

    // Make active (triggers CSS slide/fade transition)
    setTimeout(() => {
      popup.classList.add('active');
    }, 10);

    // Bring to front on click/mousedown/touchstart
    popup.addEventListener('mousedown', () => {
      popup.style.zIndex = ++topZIndex;
    });
    popup.addEventListener('touchstart', () => {
      popup.style.zIndex = ++topZIndex;
    });

    // Close button handler
    const closeBtn = popup.querySelector('.close-details-btn');
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.classList.remove('active');
      setTimeout(() => {
        popup.remove();
      }, 250);
    });

    // Drag-and-Drop functionality using the tape handle
    const tape = popup.querySelector('.popup-tape');
    let isDragging = false;
    let startX, startY;
    let initLeft, initTop;

    function startDrag(clientX, clientY) {
      isDragging = true;
      popup.style.zIndex = ++topZIndex;
      popup.classList.add('dragging'); // disable CSS transition during active dragging
      
      const rect = popup.getBoundingClientRect();
      const parentRect = gameContainer.getBoundingClientRect();
      
      initLeft = rect.left - parentRect.left;
      initTop = rect.top - parentRect.top;
      
      popup.style.left = `${initLeft}px`;
      popup.style.top = `${initTop}px`;
      popup.style.transform = `rotate(${randomRotate}deg)`; // remove translate offset

      startX = clientX;
      startY = clientY;
      
      tape.style.cursor = 'grabbing';
    }

    function moveDrag(clientX, clientY) {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      popup.style.left = `${initLeft + dx}px`;
      popup.style.top = `${initTop + dy}px`;
    }

    function endDrag() {
      if (isDragging) {
        isDragging = false;
        popup.classList.remove('dragging');
        tape.style.cursor = 'grab';
      }
    }

    // Mouse listeners
    tape.addEventListener('mousedown', (e) => {
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      moveDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', endDrag);

    // Touch listeners for mobile dragging
    tape.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault(); // prevent background screen from scrolling during drag
      }
    }, { passive: false });

    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);

    gameContainer.appendChild(popup);
  }

  // Set initial active state
  const homeBtn = document.querySelector('.menu-btn[data-target="skills"]');
  if (homeBtn) {
    homeBtn.classList.add('active-menu');
  }
});
