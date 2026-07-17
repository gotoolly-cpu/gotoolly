/**
 * GoToolly PDF Tools — Shared Utilities
 * Common functions used across all PDF tool implementations.
 * Loaded via <script src="assets/js/pdf-utils.js"> BEFORE individual tool scripts.
 */
(function () {
    'use strict';

    window.GoToolly = window.GoToolly || {};

    /**
     * Wait for external libraries (PDFLib, pdfjsLib, JSZip, etc.) to load.
     * @param {Function} callback - Called when libs are ready
     * @param {Object} [opts] - Options: { libs: ['PDFLib'], timeout: 10000, interval: 200 }
     */
    GoToolly.waitForLibs = function (callback, opts) {
        opts = opts || {};
        var libNames = opts.libs || ['PDFLib'];
        var timeout = opts.timeout || 10000;
        var interval = opts.interval || 200;

        function allLoaded() {
            for (var i = 0; i < libNames.length; i++) {
                if (typeof window[libNames[i]] === 'undefined') return false;
            }
            return true;
        }

        if (allLoaded()) { callback(); return; }

        var attempts = 0;
        var maxAttempts = Math.ceil(timeout / interval);
        var timer = setInterval(function () {
            attempts++;
            if (allLoaded()) {
                clearInterval(timer);
                callback();
            } else if (attempts >= maxAttempts) {
                clearInterval(timer);
                GoToolly.notify('Libraries failed to load. Please refresh the page.', 'error');
            }
        }, interval);
    };

    /**
     * Show a toast notification.
     * @param {string} message - The message to display
     * @param {string} [type='success'] - 'success' or 'error'
     */
    GoToolly.notify = function (message, type) {
        var existing = document.querySelectorAll('.notification');
        existing.forEach(function (el) { el.remove(); });

        var el = document.createElement('div');
        el.className = 'notification ' + (type || 'success');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function () {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s ease';
            setTimeout(function () { el.remove(); }, 300);
        }, 3000);
    };

    /**
     * Format bytes to human-readable size.
     * @param {number} bytes
     * @returns {string}
     */
    GoToolly.formatSize = function (bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    /**
     * Show/update a progress bar.
     * @param {Object} els - { container, fill, text, percent }
     * @param {number} percent - 0-100
     * @param {string} [msg] - Status message
     */
    GoToolly.updateProgress = function (els, percent, msg) {
        if (els.container) els.container.classList.add('show');
        if (els.fill) els.fill.style.width = percent + '%';
        if (els.percent) els.percent.textContent = Math.round(percent) + '%';
        if (els.text && msg) els.text.textContent = msg;
    };

    /**
     * Parse a page range string like "1-3,5,7-9" into an array of page numbers.
     * @param {string} rangeStr
     * @param {number} maxPages
     * @returns {number[]}
     */
    GoToolly.parsePageRange = function (rangeStr, maxPages) {
        var result = new Set();
        var parts = rangeStr.split(',');
        parts.forEach(function (part) {
            part = part.trim();
            if (part.indexOf('-') !== -1) {
                var range = part.split('-');
                var start = parseInt(range[0], 10);
                var end = parseInt(range[1], 10);
                if (!isNaN(start) && !isNaN(end)) {
                    for (var i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                        result.add(i);
                    }
                }
            } else {
                var num = parseInt(part, 10);
                if (!isNaN(num) && num >= 1 && num <= maxPages) {
                    result.add(num);
                }
            }
        });
        return Array.from(result).sort(function (a, b) { return a - b; });
    };

    /**
     * Escape HTML entities.
     * @param {string} str
     * @returns {string}
     */
    GoToolly.escapeHtml = function (str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

})();
