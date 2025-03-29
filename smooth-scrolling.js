// ==UserScript==
// @name         Smooth Scrolling (v1.6 - Physics Simulation)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Smoother scrolling using a velocity/damping physics simulation for better handling of rapid input acceleration.
// @author       Your Name / AI Assistant
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    // --- Physics Parameters (Tune these!) ---
    const IMPULSE_STRENGTH = 5;   // How much speed (velocity) each wheel tick adds. Higher = faster acceleration & max speed. (Try 50-150)
    const DAMPING_FACTOR = 0.95;   // How quickly speed decays (friction). Lower = stops faster, Higher = coasts longer. (Try 0.85 - 0.95)
    const MIN_VELOCITY_THRESHOLD = 0.5; // Speed below which the animation stops completely.
    // --- End Physics Parameters ---

    let animationFrameId = null;
    let currentVelocityY = 0;      // Current scroll speed in pixels per frame (approx)
    let lastTimestamp = 0;         // For potential future time-based calculations

    function animatePhysicsScroll(timestamp) {
        if (!lastTimestamp) {
            lastTimestamp = timestamp; // Initialize timestamp on first frame
        }

        // Apply damping (friction) - reduces velocity each frame
        currentVelocityY *= DAMPING_FACTOR;

        // Stop animation if velocity is very low
        if (Math.abs(currentVelocityY) < MIN_VELOCITY_THRESHOLD) {
            currentVelocityY = 0;
            animationFrameId = null;
            lastTimestamp = 0;
            // console.log("Animation stopped - velocity below threshold.");
            return;
        }

        const currentActualY = window.scrollY;
        // Calculate how much to scroll this frame based on current velocity
        let deltaScroll = currentVelocityY;
        let newY = currentActualY + deltaScroll;

        // --- Boundary Clamping & Velocity Kill ---
        // Prevent scrolling beyond page limits and stop if hitting boundary
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        let clamped = false;
        if (newY < 0) {
            newY = 0;
            clamped = true;
        } else if (newY > maxScroll) {
            newY = maxScroll;
            clamped = true;
        }

        // If clamped and velocity was heading towards the boundary, kill velocity immediately
        if (clamped && Math.sign(deltaScroll) !== Math.sign(newY - currentActualY) && (newY === 0 || newY === maxScroll) ) {
             // console.log("Hit boundary, killing velocity.");
             currentVelocityY = 0;
             // Adjust deltaScroll to only move exactly to the boundary if needed
             deltaScroll = newY - currentActualY;
        }
        // --- End Boundary Handling ---

        // Apply the scroll delta for this frame
        // Only scroll if there's a meaningful change or velocity is still significant
        if (Math.abs(deltaScroll) >= 1 || Math.abs(currentVelocityY) >= MIN_VELOCITY_THRESHOLD) {
            window.scrollBy(0, deltaScroll); // Use scrollBy for simplicity with delta
        }

        // Continue the animation if velocity hasn't been killed or dropped below threshold
        if (currentVelocityY !== 0 && Math.abs(currentVelocityY) >= MIN_VELOCITY_THRESHOLD) {
             lastTimestamp = timestamp;
             animationFrameId = requestAnimationFrame(animatePhysicsScroll);
        } else {
             // Ensure cleanup if animation should stop
             animationFrameId = null;
             lastTimestamp = 0;
             currentVelocityY = 0; // Ensure velocity is zeroed
        }
    }

    function handleWheel(event) {
        // console.log("Wheel deltaY:", event.deltaY, "deltaMode:", event.deltaMode);
        if (event.deltaX !== 0) {
            return; // Ignore horizontal scroll
        }

        // --- Normalize Scroll Amount (from v1.5) ---
        let scrollAmountPixels = 0;
        const PIXELS_PER_LINE = 18; // Approx pixels per line
        switch (event.deltaMode) {
            case WheelEvent.DOM_DELTA_PIXEL: scrollAmountPixels = event.deltaY; break;
            case WheelEvent.DOM_DELTA_LINE: scrollAmountPixels = event.deltaY * PIXELS_PER_LINE; break;
            case WheelEvent.DOM_DELTA_PAGE: scrollAmountPixels = event.deltaY * window.innerHeight * 0.9; break;
            default: scrollAmountPixels = event.deltaY; break;
        }
        // --- End Normalization ---

        event.preventDefault(); // Prevent default browser scroll

        // --- Calculate Impulse based on scroll amount and strength ---
        // This formula determines how much velocity is added per scroll event.
        // The division is arbitrary scaling factor to make IMPULSE_STRENGTH easier to tune.
        let impulse = scrollAmountPixels * (IMPULSE_STRENGTH / 40); // Smaller divisor = more speed per tick

        // Add impulse to current velocity (+= handles direction via sign)
        currentVelocityY += impulse;
        // console.log("Applied impulse:", impulse.toFixed(2), "New velocity:", currentVelocityY.toFixed(2));

        // --- Start Animation (if not already running) ---
        if (!animationFrameId) {
            lastTimestamp = 0; // Reset timestamp for the start of a new animation sequence
            // console.log("Starting physics animation sequence.");
            animationFrameId = requestAnimationFrame(animatePhysicsScroll);
        }
    }

    window.addEventListener('wheel', handleWheel, { passive: false });

})();