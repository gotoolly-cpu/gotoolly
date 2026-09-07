/* ============================================
   GO TOOLLY - REGEX TESTER v2.0
   Test regular expressions with live matching
   ============================================ */

(function() {
    'use strict';

    var state = {
        lastOutput: '',
        debounceTimer: null
    };

    var elements = {};

    function init() {
        elements = {
            patternInput: document.getElementById('pattern-input'),
            testText: document.getElementById('test-text'),
            highlightedOutput: document.getElementById('highlighted-output'),
            errorDiv: document.getElementById('regex-error'),
            flagsGroup: document.getElementById('flags-group'),
            matchSummary: document.getElementById('match-summary'),
            matchCountBadge: document.getElementById('match-count-badge'),
            matchTableWrap: document.getElementById('match-table-wrap'),
            resultsPanel: document.getElementById('results-panel'),
            statusBadge: document.getElementById('status-badge'),
            btnClear: document.getElementById('btn-clear'),
            btnSample: document.getElementById('btn-sample'),
            limitationsBox: document.getElementById('limitations-box')
        };

        elements.patternInput.addEventListener('input', onInputChange);
        elements.testText.addEventListener('input', onInputChange);
        elements.btnClear.addEventListener('click', clearAll);
        elements.btnSample.addEventListener('click', loadSample);

        var flagBtns = elements.flagsGroup.querySelectorAll('.flag-btn');
        for (var i = 0; i < flagBtns.length; i++) {
            flagBtns[i].addEventListener('click', onFlagClick);
        }

        showEmptyState();
    }

    /* ========================
       INPUT & FLAG HANDLING
       ======================== */

    function onInputChange() {
        clearTimeout(state.debounceTimer);
        state.debounceTimer = setTimeout(runTest, 120);
    }

    function onFlagClick(e) {
        var btn = e.currentTarget;
        btn.classList.toggle('active');
        runTest();
    }

    function getFlags() {
        var flags = '';
        var btns = elements.flagsGroup.querySelectorAll('.flag-btn.active');
        for (var i = 0; i < btns.length; i++) {
            flags += btns[i].getAttribute('data-flag');
        }
        return flags;
    }

    /* ========================
       CORE REGEX TEST
       ======================== */

    function runTest() {
        var pat = elements.patternInput.value;
        var text = elements.testText.value;

        hideError();

        if (!pat.trim()) {
            showEmptyState();
            return;
        }
        if (!text.trim()) {
            elements.highlightedOutput.innerHTML = '<span class="empty-hint">Enter test text to see matches...</span>';
            hideResults();
            updateStatus('ready', 'Ready');
            return;
        }

        var flags = getFlags();
        var regex;
        try {
            regex = new RegExp(pat, flags);
        } catch (e) {
            showError('Invalid regex: ' + e.message);
            elements.highlightedOutput.textContent = text;
            hideResults();
            updateStatus('error', 'Error');
            return;
        }

        try {
            var matches = collectMatches(regex, text);
            renderHighlighted(text, matches);
            renderResults(matches);
            updateStatus('done', matches.length + ' match' + (matches.length !== 1 ? 'es' : ''));
        } catch (e) {
            showError('Error: ' + e.message);
            elements.highlightedOutput.textContent = text;
            hideResults();
            updateStatus('error', 'Error');
        }
    }

    function collectMatches(regex, text) {
        var matches = [];
        var hasGlobal = regex.global;

        if (hasGlobal) {
            var m;
            while ((m = regex.exec(text)) !== null) {
                matches.push(extractMatch(m));
                if (m.index === regex.lastIndex) regex.lastIndex++;
            }
        } else {
            var single = regex.exec(text);
            if (single) {
                matches.push(extractMatch(single));
            }
        }

        return matches;
    }

    function extractMatch(m) {
        var groups = [];
        for (var k = 0; k < m.length; k++) {
            groups.push(m[k] !== undefined ? m[k] : undefined);
        }
        return { full: m[0], index: m.index, groups: groups };
    }

    /* ========================
       HIGHLIGHT RENDERING
       ======================== */

    function renderHighlighted(text, matches) {
        if (matches.length === 0) {
            elements.highlightedOutput.textContent = text;
            return;
        }

        var sorted = matches.slice().sort(function(a, b) { return a.index - b.index; });
        var fragment = document.createDocumentFragment();
        var lastIdx = 0;

        for (var i = 0; i < sorted.length; i++) {
            var m = sorted[i];

            if (m.index > lastIdx) {
                fragment.appendChild(document.createTextNode(text.substring(lastIdx, m.index)));
            }

            var mark = document.createElement('mark');
            mark.textContent = m.full;
            fragment.appendChild(mark);

            lastIdx = m.index + m.full.length;
        }

        if (lastIdx < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
        }

        elements.highlightedOutput.innerHTML = '';
        elements.highlightedOutput.appendChild(fragment);
    }

    /* ========================
       RESULTS TABLE
       ======================== */

    function renderResults(matches) {
        if (matches.length === 0) {
            elements.matchCountBadge.textContent = '0 matches';
            elements.matchCountBadge.className = 'match-count-badge no-matches';
            elements.matchTableWrap.innerHTML = '';
            showResults();
            return;
        }

        elements.matchCountBadge.textContent = matches.length + ' match' + (matches.length !== 1 ? 'es' : '');
        elements.matchCountBadge.className = 'match-count-badge has-matches';

        var maxGroups = 0;
        for (var i = 0; i < matches.length; i++) {
            if (matches[i].groups.length > 1) {
                maxGroups = Math.max(maxGroups, matches[i].groups.length - 1);
            }
        }

        var table = document.createElement('table');
        table.className = 'match-table';

        var thead = document.createElement('thead');
        var headRow = document.createElement('tr');
        headRow.appendChild(createTh('#'));
        headRow.appendChild(createTh('Match'));
        headRow.appendChild(createTh('Position'));
        for (var g = 1; g <= maxGroups; g++) {
            headRow.appendChild(createTh('Group ' + g));
        }
        thead.appendChild(headRow);
        table.appendChild(thead);

        var tbody = document.createElement('tbody');
        for (var i = 0; i < matches.length; i++) {
            var row = document.createElement('tr');

            row.appendChild(createTd(String(i + 1)));

            var matchCell = createTd(matches[i].full);
            matchCell.className = 'match-val';
            row.appendChild(matchCell);

            row.appendChild(createTd(matches[i].index + '–' + (matches[i].index + matches[i].full.length)));

            for (var g = 1; g <= maxGroups; g++) {
                var val = matches[i].groups[g] !== undefined ? matches[i].groups[g] : '';
                row.appendChild(createTd(val));
            }

            tbody.appendChild(row);
        }
        table.appendChild(tbody);

        elements.matchTableWrap.innerHTML = '';
        elements.matchTableWrap.appendChild(table);
        showResults();
    }

    function createTh(text) {
        var th = document.createElement('th');
        th.textContent = text;
        return th;
    }

    function createTd(text) {
        var td = document.createElement('td');
        td.textContent = text;
        return td;
    }

    /* ========================
       UI STATE MANAGEMENT
       ======================== */

    function updateStatus(type, text) {
        elements.statusBadge.className = 'status-badge' + (type ? ' ' + type : '');
        elements.statusBadge.textContent = text;
    }

    function showEmptyState() {
        elements.highlightedOutput.innerHTML = '<span class="empty-hint">Enter a pattern and test text to see matches...</span>';
        hideResults();
        updateStatus('', '');
    }

    function showResults() {
        elements.resultsPanel.style.display = 'block';
        elements.resultsPanel.classList.add('show');
    }

    function hideResults() {
        elements.resultsPanel.style.display = 'none';
        elements.resultsPanel.classList.remove('show');
    }

    function showError(msg) {
        elements.errorDiv.textContent = msg;
        elements.errorDiv.style.display = 'block';
    }

    function hideError() {
        elements.errorDiv.style.display = 'none';
    }

    /* ========================
       TOOLBAR ACTIONS
       ======================== */

    function clearAll() {
        elements.patternInput.value = '';
        elements.testText.value = '';
        hideError();
        showEmptyState();
        showToast('Cleared all fields.', 'info');
    }

    function loadSample() {
        elements.patternInput.value = '(\\w+)@(\\w+\\.\\w+)';
        elements.testText.value = 'Contact us at support@example.com or sales@company.org.\nYou can also reach john.doe@mail.co.uk for help.\nInvalid: @broken or noat.com';

        var flagBtns = elements.flagsGroup.querySelectorAll('.flag-btn');
        for (var i = 0; i < flagBtns.length; i++) {
            var flag = flagBtns[i].getAttribute('data-flag');
            if (flag === 'g') {
                flagBtns[i].classList.add('active');
            } else {
                flagBtns[i].classList.remove('active');
            }
        }

        runTest();
        showToast('Sample pattern and text loaded.', 'info');
    }

    /* ========================
       TOAST NOTIFICATIONS
       ======================== */

    function showToast(message, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'toast ' + (type || 'info');
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add('show');
            });
        });
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    /* ========================
       KEYBOARD SHORTCUTS
       ======================== */

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            runTest();
        }
    });

    init();
})();