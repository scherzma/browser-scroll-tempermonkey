// ==UserScript==
// @name         Unified Drag Scroll with Momentum v1.4
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Drag scroll with momentum in window and scrollable containers, including improved click handling and no text selection during drag.
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let dragModeEnabled = localStorage.getItem('dragModeEnabled') === 'true';
    let isDragging = false, didDrag = false, scrollContainer, startX, startY, startScrollLeft, startScrollTop;
    let velocityX = 0, velocityY = 0, lastX, lastY, lastTime, momentumID;
    const dragThreshold = 20; // in pixels

    // Inject CSS to disable text selection during drag
    const style = document.createElement('style');
    style.textContent = `
        body.no-select {
            user-select: none; /* Disable text selection */
        }
    `;
    document.head.appendChild(style);

    // Create toggle button
    const toggleButton = document.createElement('button');
    Object.assign(toggleButton.style, {
        position: 'fixed', top: '100px', right: '10px', zIndex: '10000', padding: '5px 10px',
        backgroundColor: dragModeEnabled ? '#f44336' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer',
        display: 'none' // Initially hidden
    });
    toggleButton.textContent = dragModeEnabled ? 'Dis' : 'Ena';
    document.body.appendChild(toggleButton);

    // Define trigger region (100px from right edge, 50px from top)
    let triggerLeft = window.innerWidth - 100;
    const triggerTop = 50;

    // Update trigger region on resize
    window.addEventListener('resize', () => {
        triggerLeft = window.innerWidth - 100;
    });

    // Show/hide button based on mouse position
    document.addEventListener('mousemove', e => {
        if (e.clientX > triggerLeft && e.clientY > triggerTop) {
            toggleButton.style.display = 'block';
        } else {
            toggleButton.style.display = 'none';
        }
    });

    toggleButton.onclick = () => {
        dragModeEnabled = !dragModeEnabled;
        localStorage.setItem('dragModeEnabled', dragModeEnabled);
        toggleButton.textContent = dragModeEnabled ? 'Dis' : 'Ena';
        toggleButton.style.backgroundColor = dragModeEnabled ? '#f44336' : '#4CAF50';
    };

    const getScrollableAncestor = el => {
        while (el && el !== document.body && el !== document.documentElement) {
            const style = window.getComputedStyle(el);
            if (/(auto|scroll)/.test(style.overflow + style.overflowY + style.overflowX)) return el;
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    };

    const getScrollPos = c => c === window || c === document.documentElement || c === document.body ?
          { left: window.scrollX, top: window.scrollY } : { left: c.scrollLeft, top: c.scrollTop };

    const setScrollPos = (c, l, t) => c === window || c === document.documentElement || c === document.body ?
          window.scrollTo(l, t) : (c.scrollLeft = l, c.scrollTop = t);

    // Suppress click event if drag was detected
    document.addEventListener('click', e => {
        if (didDrag) {
            e.stopPropagation();
            e.preventDefault();
            didDrag = false;
        }
    }, true);

    document.addEventListener('mousedown', e => {
        if (dragModeEnabled && e.button === 0) { // Left mouse button
            const tag = e.target.tagName.toLowerCase();
            // Skip interactive elements to allow clicking
            if (['input', 'textarea', 'select', 'button'].includes(tag)) {
                return; // Allow normal behavior (e.g., clicking into search box)
            }
            // Start dragging setup
            didDrag = false;
            scrollContainer = getScrollableAncestor(e.target);
            isDragging = true;
            document.body.classList.add('no-select'); // Disable text selection
            startX = lastX = e.clientX;
            startY = lastY = e.clientY;
            ({ left: startScrollLeft, top: startScrollTop } = getScrollPos(scrollContainer));
            lastTime = Date.now();
            velocityX = velocityY = 0;
            cancelAnimationFrame(momentumID);
            e.preventDefault(); // Prevent default behavior (e.g., text selection start)
        }
    }, { passive: false });

    document.addEventListener('mousemove', e => {
        if (isDragging) {
            // Detect when dragging starts (beyond threshold)
            if (!didDrag && (Math.abs(e.clientX - startX) > dragThreshold || Math.abs(e.clientY - startY) > dragThreshold)) {
                didDrag = true;
            }
            e.preventDefault(); // Prevent default always during drag to stop text selection
            const now = Date.now();
            const deltaTime = now - lastTime;
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            if (deltaTime > 0) {
                velocityX = deltaX / deltaTime;
                velocityY = deltaY / deltaTime;
            }
            lastX = e.clientX;
            lastY = e.clientY;
            lastTime = now;
            setScrollPos(scrollContainer, startScrollLeft - (e.clientX - startX) * 2, startScrollTop - (e.clientY - startY) * 2);
        }
    }, { passive: false });

    const endDrag = () => {
        if (isDragging) {
            document.body.classList.remove('no-select'); // Re-enable text selection
            isDragging = false;
            if (didDrag) {
                momentumID = requestAnimationFrame(momentum);
            }
        }
    };

    ['mouseup', 'mouseleave'].forEach(evt => document.addEventListener(evt, endDrag));

    function momentum() {
        velocityX *= 0.85;
        velocityY *= 0.85;
        const { left, top } = getScrollPos(scrollContainer);
        setScrollPos(scrollContainer, left - velocityX * 50, top - velocityY * 50);
        if (Math.abs(velocityX) > 0.02 || Math.abs(velocityY) > 0.02) momentumID = requestAnimationFrame(momentum);
    }
})();