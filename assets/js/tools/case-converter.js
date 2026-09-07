document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var outputText = document.getElementById('output-text');
    var copyBtn = document.getElementById('copy-btn');
    var downloadBtn = document.getElementById('download-btn');
    var exportBtn = document.getElementById('export-btn');
    var exportDropdown = document.getElementById('export-dropdown');
    var swapBtn = document.getElementById('swap-btn');
    var clearBtn = document.getElementById('clear-btn');
    var undoBtn = document.getElementById('undo-btn');
    var redoBtn = document.getElementById('redo-btn');
    var pasteBtn = document.getElementById('paste-btn');
    var selectAllBtn = document.getElementById('select-all-btn');
    var selectAllOutput = document.getElementById('select-all-output');
    var cleanupToggle = document.getElementById('cleanup-toggle');
    var cleanupBody = document.getElementById('cleanup-body');
    var formatBadge = document.getElementById('result-format-badge');
    var searchInput = document.getElementById('cc-search');
    var favGrid = document.getElementById('cc-fav-grid');
    var favSection = document.getElementById('cc-favorites');
    var searchCount = document.getElementById('cc-search-count');
    var qaPaste = document.getElementById('qa-paste');
    var qaCopy = document.getElementById('qa-copy');
    var qaSwap = document.getElementById('qa-swap');
    var qaUndo = document.getElementById('qa-undo');
    var qaRedo = document.getElementById('qa-redo');
    var qaClear = document.getElementById('qa-clear');
    var qaClearSingle = document.getElementById('qa-clear-single');

    var stats = {
        chars: document.getElementById('cc-char-count'),
        charsNS: document.getElementById('cc-char-ns'),
        words: document.getElementById('cc-word-count'),
        lines: document.getElementById('cc-line-count'),
        paras: document.getElementById('cc-para-count'),
        sents: document.getElementById('cc-sent-count'),
        readTime: document.getElementById('cc-read-time'),
        avgWord: document.getElementById('cc-avg-word'),
        longestWord: document.getElementById('cc-longest-word'),
        uniqueWords: document.getElementById('cc-unique-words')
    };

    var formatBtns = document.querySelectorAll('[data-case]');
    var cleanupLabels = document.querySelectorAll('[data-cleanup]');
    var exportOpts = document.querySelectorAll('[data-export]');

    var lastCaseType = null;
    var lastResult = '';
    var rafId = null;

    var undoStack = [];
    var redoStack = [];
    var MAX_UNDO = 20;
    var lastUndoTime = 0;

    var favoriteCases = loadFavorites();

    var TITLE_LOWER = new Set('a,an,the,and,but,or,nor,as,at,by,for,in,of,on,to,up,down,off,out,over,under,again,further,then,once,here,there,when,where,why,how,all,each,few,more,most,other,some,such,no,not,only,own,same,than,too,very,just,also,into,upon,via,with,without,after,before,between,through,during,because'.split(','));

    function showNotification(msg, isErr) {
        var el = document.querySelector('.notification');
        if (el) el.remove();
        var n = document.createElement('div');
        n.className = 'notification' + (isErr ? ' error' : '');
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(function() { n.remove(); }, 3500);
    }

    function showToast(msg, type) {
        var el = document.querySelector('.cc-toast');
        if (el) el.remove();
        var t = document.createElement('div');
        t.className = 'cc-toast' + (type ? ' ' + type : '');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(function() { t.remove(); }, 2000);
    }

    function debounce(fn, ms) {
        var t;
        return function() { clearTimeout(t); t = setTimeout(fn, ms); };
    }

    function stripPunctForAnalysis(text) {
        return text.replace(/[\p{P}\p{S}]+/gu, '').replace(/\s+/g, ' ').trim();
    }

    function getCharCount(text) { return text.length; }
    function getCharNoSpaceCount(text) { return text.replace(/\s+/g, '').length; }
    function getWordCount(text) { var m = text.match(/\S+/g); return m ? m.length : 0; }
    function getLineCount(text) { return text === '' ? 0 : text.split('\n').length; }
    function getParagraphCount(text) {
        return text.split(/\n\s*\n/).map(function(p) { return p.trim(); }).filter(function(p) { return p.length > 0; }).length;
    }
    function getSentenceCount(text) {
        var clean = text.trim();
        if (!clean) return 0;
        var m = clean.match(/[.!?]+/g);
        if (!m) return 1;
        var count = m.length;
        clean = clean.replace(/[.!?]+$/, '').trim();
        return clean.length > 0 ? count : Math.max(count - 1, 1);
    }
    function getReadingTime(text) {
        var w = getWordCount(text);
        if (w === 0) return '0s';
        var min = w / 200;
        return min < 1 ? Math.ceil(min * 60) + 's' : Math.ceil(min) + 'm';
    }
    function getAvgWordLength(text) {
        var stripped = stripPunctForAnalysis(text);
        var words = stripped.match(/\S+/g);
        if (!words || words.length === 0) return '0';
        var total = 0;
        for (var i = 0; i < words.length; i++) total += words[i].length;
        return (total / words.length).toFixed(1);
    }
    function getLongestWord(text) {
        var stripped = stripPunctForAnalysis(text);
        var words = stripped.match(/\S+/g);
        if (!words || words.length === 0) return '\u2014';
        var longest = '';
        for (var i = 0; i < words.length; i++) {
            if (words[i].length > longest.length) longest = words[i];
        }
        return longest;
    }
    function getShortestWord(text) {
        var stripped = stripPunctForAnalysis(text);
        var words = stripped.match(/\S+/g);
        if (!words || words.length === 0) return '\u2014';
        var shortest = words[0];
        for (var i = 1; i < words.length; i++) {
            if (words[i].length < shortest.length) shortest = words[i];
        }
        return shortest;
    }
    function getMostCommonWord(text) {
        var stripped = stripPunctForAnalysis(text);
        var words = stripped.match(/\S+/gu);
        if (!words || words.length === 0) return '\u2014';
        var freq = {};
        for (var i = 0; i < words.length; i++) {
            var w = words[i].toLowerCase();
            freq[w] = (freq[w] || 0) + 1;
        }
        var maxWord = words[0].toLowerCase(), maxCount = 0;
        for (var w in freq) {
            if (freq[w] > maxCount) { maxCount = freq[w]; maxWord = w; }
        }
        return maxWord;
    }
    function getUniqueWords(text) {
        var stripped = stripPunctForAnalysis(text);
        var words = stripped.match(/\S+/gu);
        if (!words) return 0;
        var seen = {};
        for (var i = 0; i < words.length; i++) seen[words[i].toLowerCase()] = true;
        return Object.keys(seen).length;
    }

    function updateStats(text) {
        stats.chars.textContent = getCharCount(text).toLocaleString();
        stats.charsNS.textContent = getCharNoSpaceCount(text).toLocaleString();
        stats.words.textContent = getWordCount(text).toLocaleString();
        stats.lines.textContent = getLineCount(text).toLocaleString();
        stats.paras.textContent = getParagraphCount(text).toLocaleString();
        stats.sents.textContent = getSentenceCount(text).toLocaleString();
        stats.readTime.textContent = getReadingTime(text);
        stats.avgWord.textContent = getAvgWordLength(text);
        stats.longestWord.textContent = getLongestWord(text);
        stats.longestWord.title = getMostCommonWord(text) + ' \u2022 shortest: ' + getShortestWord(text);
        stats.uniqueWords.textContent = getUniqueWords(text).toLocaleString();
    }

    function eachWord(text, fn, join) {
        return text.split('\n').map(function(line) {
            var words = line.match(/\S+/gu);
            if (!words) return line;
            return words.map(fn).join(join || ' ');
        }).join('\n');
    }

    function toUpperCase(text) { return text.toUpperCase(); }
    function toLowerCase(text) { return text.toLowerCase(); }

    function toTitleCase(text) {
        return text.replace(/[\p{L}\p{M}][\p{L}\p{M}']*/gu, function(word, offset, full) {
            if (word.length === 0) return word;
            var before = full.slice(0, offset);
            var after = full.slice(offset + word.length);
            var prevWord = before.match(/[\p{L}\p{M}][\p{L}\p{M}']*$/u);
            var nextWord = after.match(/^[\p{L}\p{M}][\p{L}\p{M}']*/u);
            if (!prevWord && !nextWord) {
                return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
            }
            if (!prevWord) {
                return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
            }
            if (!nextWord) {
                return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
            }
            var lower = word.toLocaleLowerCase();
            if (TITLE_LOWER.has(lower)) return lower;
            return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
        });
    }

    function toSentenceCase(text) {
        return text.replace(/((^|[.!?]+)\s*)([\p{L}\p{M}])/gu, function(_, prefix, __, first) {
            return prefix + first.toLocaleUpperCase();
        });
    }

    function toCapitalizeWords(text) {
        return text.replace(/[\p{L}\p{M}][\p{L}\p{M}']*/gu, function(w) {
            return w.charAt(0).toLocaleUpperCase() + w.slice(1);
        });
    }

    function stripNonAlpha(text) {
        return text.replace(/[^\p{L}\p{N}\p{M}]/gu, '');
    }

    function toCamelCase(text) {
        return text.split('\n').map(function(line) {
            var words = line.match(/\S+/gu);
            if (!words) return line;
            return words.map(function(w, i) {
                w = stripNonAlpha(w);
                if (w.length === 0) return '';
                return i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            }).join('');
        }).join('\n');
    }

    function toPascalCase(text) {
        return text.split('\n').map(function(line) {
            var words = line.match(/\S+/gu);
            if (!words) return line;
            return words.map(function(w) {
                w = stripNonAlpha(w);
                return w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
            }).join('');
        }).join('\n');
    }

    function joinCase(text, joinChar, lowerFn) {
        return text.split('\n').map(function(line) {
            var words = line.match(/\S+/gu);
            if (!words) return line;
            return words.map(function(w) { w = stripNonAlpha(w); return w.length > 0 ? lowerFn(w) : ''; }).filter(function(w) { return w.length > 0; }).join(joinChar);
        }).join('\n');
    }

    function toSnakeCase(text) { return joinCase(text, '_', function(w) { return w.toLowerCase(); }); }
    function toKebabCase(text) { return joinCase(text, '-', function(w) { return w.toLowerCase(); }); }
    function toConstantCase(text) { return joinCase(text, '_', function(w) { return w.toUpperCase(); }); }
    function toDotCase(text) { return joinCase(text, '.', function(w) { return w.toLowerCase(); }); }
    function toPathCase(text) { return joinCase(text, '/', function(w) { return w.toLowerCase(); }); }
    function toCobolCase(text) { return joinCase(text, '-', function(w) { return w.toUpperCase(); }); }

    function toToggleCase(text) {
        return text.replace(/[\p{L}]/gu, function(c) {
            var up = c.toLocaleUpperCase();
            return c === up ? c.toLocaleLowerCase() : up;
        });
    }

    function toInverseCase(text) { return toToggleCase(text); }

    function toAlternatingCase(text) {
        var upper = false;
        return text.replace(/[\p{L}]/gu, function(c) {
            upper = !upper;
            return upper ? c.toLocaleUpperCase() : c.toLocaleLowerCase();
        });
    }

    function toRandomCase(text) {
        return text.replace(/[\p{L}]/gu, function(c) {
            return Math.random() > 0.5 ? c.toLocaleUpperCase() : c.toLocaleLowerCase();
        });
    }

    function toStudlyCaps(text) {
        return text.replace(/[\p{L}\p{M}]+/gu, function(w) {
            var up = true;
            return w.replace(/[\p{L}\p{M}]/gu, function(c) {
                var r = up ? c.toLocaleUpperCase() : c.toLocaleLowerCase();
                up = !up;
                return r;
            });
        });
    }

    function capitalizeWord(w) {
        w = stripNonAlpha(w);
        return w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
    }

    function toTrainCase(text) {
        return text.split('\n').map(function(line) {
            var words = line.match(/\S+/gu);
            if (!words) return line;
            return words.map(capitalizeWord).filter(function(w) { return w.length > 0; }).join('-');
        }).join('\n');
    }

    function toHeaderCase(text) {
        return toCapitalizeWords(text);
    }

    var converters = {
        uppercase: toUpperCase,
        lowercase: toLowerCase,
        titlecase: toTitleCase,
        sentencecase: toSentenceCase,
        capitalizewords: toCapitalizeWords,
        camelcase: toCamelCase,
        pascalcase: toPascalCase,
        snakecase: toSnakeCase,
        kebabcase: toKebabCase,
        constantcase: toConstantCase,
        togglecase: toToggleCase,
        inversecase: toInverseCase,
        alternatingcase: toAlternatingCase,
        randomcase: toRandomCase,
        studlycaps: toStudlyCaps,
        dotcase: toDotCase,
        pathcase: toPathCase,
        traincase: toTrainCase,
        cobolcase: toCobolCase,
        headercase: toHeaderCase
    };

    var caseLabels = {
        uppercase: 'UPPERCASE', lowercase: 'lowercase', titlecase: 'Title Case',
        sentencecase: 'Sentence case', capitalizewords: 'Capitalize Words',
        camelcase: 'camelCase', pascalcase: 'PascalCase', snakecase: 'snake_case',
        kebabcase: 'kebab-case', constantcase: 'CONSTANT_CASE',
        togglecase: 'tOGGLE cASE', inversecase: 'Inverse Case',
        alternatingcase: 'AlTeRnAtInG', randomcase: 'Random Case',
        studlycaps: 'StUdLyCaPs', dotcase: 'dot.case', pathcase: 'path/case',
        traincase: 'Train-Case', cobolcase: 'COBOL-CASE', headercase: 'Header-Case'
    };

    function convert(text, type) {
        var fn = converters[type];
        if (!fn) return text;
        try { return fn(text); } catch (e) { return text; }
    }

    function doConvert(type) {
        var text = textInput.value;
        lastCaseType = type;
        formatBtns.forEach(function(b) {
            b.classList.toggle('active', b.dataset.case === type);
        });
        formatBadge.textContent = caseLabels[type] || type;
        if (!text) {
            lastResult = '';
            outputText.textContent = '';
            outputText.setAttribute('data-placeholder', 'Converted text will appear here');
            copyBtn.disabled = true;
            downloadBtn.disabled = true;
            exportBtn.disabled = true;
            qaCopy.disabled = true;
            qaSwap.disabled = true;
            return;
        }
        lastResult = convert(text, type);
        if (lastResult) {
            outputText.textContent = lastResult;
            outputText.setAttribute('data-placeholder', '');
        } else {
            outputText.textContent = '';
            outputText.setAttribute('data-placeholder', 'Converted text will appear here');
        }
        copyBtn.disabled = !lastResult;
        downloadBtn.disabled = !lastResult;
        exportBtn.disabled = !lastResult;
        qaCopy.disabled = !lastResult;
        qaSwap.disabled = !lastResult;
    }

    function pushUndo(value) {
        undoStack.push(value);
        if (undoStack.length > MAX_UNDO) undoStack.shift();
        redoStack = [];
        updateUndoRedo();
    }

    function undo() {
        if (undoStack.length === 0) return;
        redoStack.push(textInput.value);
        textInput.value = undoStack.pop();
        textInput.focus();
        handleInputChange();
        updateUndoRedo();
    }

    function redo() {
        if (redoStack.length === 0) return;
        undoStack.push(textInput.value);
        textInput.value = redoStack.pop();
        textInput.focus();
        handleInputChange();
        updateUndoRedo();
    }

    function updateUndoRedo() {
        var u = undoStack.length > 0;
        var r = redoStack.length > 0;
        undoBtn.disabled = !u;
        redoBtn.disabled = !r;
        qaUndo.disabled = !u;
        qaRedo.disabled = !r;
    }

    function clearTool() {
        textInput.value = '';
        outputText.textContent = '';
        outputText.setAttribute('data-placeholder', 'Converted text will appear here');
        lastResult = '';
        lastCaseType = null;
        formatBadge.textContent = '\u2014';
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
        exportBtn.disabled = true;
        qaCopy.disabled = true;
        qaSwap.disabled = true;
        exportDropdown.hidden = true;
        formatBtns.forEach(function(b) { b.classList.remove('active'); });
        updateStats('');
        undoStack = [];
        redoStack = [];
        updateUndoRedo();
        textInput.focus();
    }

    function downloadTxt(content, filename) {
        var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function copyResult() {
        if (!lastResult) return;
        try {
            navigator.clipboard.writeText(lastResult).then(function() {
                showToast('\u2713 Copied');
                copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Copied';
                setTimeout(function() {
                    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy';
                }, 1500);
            }).catch(function() {
                fallbackCopy();
            });
        } catch (e) { fallbackCopy(); }
    }

    function fallbackCopy() {
        var ta = document.createElement('textarea');
        ta.value = lastResult;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('\u2713 Copied');
        } catch (e) { showNotification('Failed to copy', true); }
        document.body.removeChild(ta);
    }

    function swapText() {
        if (!lastResult) return;
        pushUndo(textInput.value);
        textInput.value = lastResult;
        textInput.focus();
        handleInputChange();
    }

    function handleInputChange() {
        var text = textInput.value;
        updateStats(text);
        if (lastCaseType) doConvert(lastCaseType);
    }

    var cleanups = {
        'remove-extraspaces': function(t) { return t.replace(/^[ \t]+|[ \t]+$/gm, '').replace(/[ \t]{2,}/g, ' '); },
        'trim': function(t) { return t.trim(); },
        'normalize-spaces': function(t) { return t.replace(/[ \t]{2,}/g, ' '); },
        'remove-empty-lines': function(t) { return t.split('\n').filter(function(l) { return l.trim().length > 0; }).join('\n'); },
        'remove-duplicate-lines': function(t) {
            var seen = {}; var out = [];
            t.split('\n').forEach(function(l) { if (!seen[l]) { seen[l] = true; out.push(l); } });
            return out.join('\n');
        },
        'sort-az': function(t) { return t.split('\n').sort(function(a, b) { return a.localeCompare(b); }).join('\n'); },
        'sort-za': function(t) { return t.split('\n').sort(function(a, b) { return b.localeCompare(a); }).join('\n'); },
        'reverse-lines': function(t) { return t.split('\n').reverse().join('\n'); },
        'shuffle-lines': function(t) {
            var lines = t.split('\n');
            for (var i = lines.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = lines[i]; lines[i] = lines[j]; lines[j] = tmp;
            }
            return lines.join('\n');
        },
        'remove-tabs': function(t) { return t.replace(/\t/g, ''); },
        'tabs-to-spaces': function(t) { return t.replace(/\t/g, '    '); },
        'spaces-to-tabs': function(t) {
            return t.replace(/^( {4})+|\t+/gm, function(m) {
                return '\t'.repeat(m.replace(/[^\t]/g, '').length + (m.replace(/\t/g, '').length / 4));
            });
        },
        'collapse-empty-lines': function(t) { return t.replace(/\n{3,}/g, '\n\n'); },
        'strip-line-blanks': function(t) { return t.split('\n').map(function(l) { return l.trim(); }).join('\n'); },
        'add-line-numbers': function(t) {
            return t.split('\n').map(function(l, i) { return (i + 1) + '. ' + l; }).join('\n');
        },
        'remove-line-numbers': function(t) {
            return t.replace(/^\s*\d+[\.\)]\s*/gm, '');
        },
        'remove-numbers': function(t) { return t.replace(/[\p{N}]+/gu, ''); },
        'remove-punctuation': function(t) { return t.replace(/[\p{P}\p{S}]+/gu, ''); },
        'remove-urls': function(t) {
            return t.replace(/https?:\/\/[^\s<>"']+/gi, '').replace(/www\.[^\s<>"']+/gi, '');
        },
        'remove-html-tags': function(t) { return t.replace(/<[^>]*>/g, ''); },
        'normalize-quotes': function(t) {
            return t.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-');
        },
        'reverse-text': function(t) { return t.split('').reverse().join(''); }
    };

    function doCleanup(type) {
        var fn = cleanups[type];
        if (!fn) return;
        pushUndo(textInput.value);
        var cleaned = fn(textInput.value);
        textInput.value = cleaned;
        textInput.focus();
        updateStats(cleaned);
        if (lastCaseType) doConvert(lastCaseType);
        showToast('\u2713 Text cleaned');
    }

    formatBtns.forEach(function(btn) {
        btn.addEventListener('click', function() { doConvert(this.dataset.case); });
    });

    cleanupLabels.forEach(function(el) {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            doCleanup(this.dataset.cleanup);
        });
    });

    var inputHandler = debounce(function() {
        handleInputChange();
    }, 150);

    textInput.addEventListener('input', function() {
        var now = Date.now();
        if (now - lastUndoTime > 2000) {
            pushUndo(this.value);
            lastUndoTime = now;
        }
        inputHandler();
    });
    textInput.addEventListener('paste', function() {
        var self = this;
        setTimeout(function() {
            pushUndo(self.value);
            inputHandler();
        }, 50);
    });

    copyBtn.addEventListener('click', copyResult);

    downloadBtn.addEventListener('click', function() {
        if (!lastResult) return;
        downloadTxt(lastResult, 'converted-text.txt');
        showToast('\u2713 TXT downloaded');
    });

    exportBtn.addEventListener('click', function() {
        exportDropdown.hidden = !exportDropdown.hidden;
    });

    document.addEventListener('click', function(e) {
        if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
            exportDropdown.hidden = true;
        }
    });

    exportOpts.forEach(function(opt) {
        opt.addEventListener('click', function() {
            var type = this.dataset.export;
            if (!lastResult && type !== 'txt') return;
            exportDropdown.hidden = true;
            if (type === 'txt') {
                downloadTxt(lastResult || textInput.value, 'converted-text.txt');
                showToast('\u2713 TXT downloaded');
                return;
            }
            var text;
            switch (type) {
                case 'csv':
                    text = '"Converted Text"\n"' + lastResult.replace(/"/g, '""') + '"';
                    break;
                case 'json':
                    text = JSON.stringify({ converted: lastResult, format: lastCaseType, timestamp: new Date().toISOString() }, null, 2);
                    break;
                case 'markdown':
                    text = '```\n' + lastResult + '\n```';
                    break;
            }
            try {
                navigator.clipboard.writeText(text).then(function() {
                    showToast('\u2713 Copied as ' + type.toUpperCase());
                }).catch(function() {
                    var ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    try { document.execCommand('copy'); showToast('\u2713 Copied as ' + type.toUpperCase()); } catch (e) { showNotification('Failed to copy', true); }
                    document.body.removeChild(ta);
                });
            } catch (e) { showNotification('Failed to copy', true); }
        });
    });

    swapBtn.addEventListener('click', swapText);

    if (clearBtn) clearBtn.addEventListener('click', clearTool);

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    pasteBtn.addEventListener('click', function() {
        navigator.clipboard.readText().then(function(t) {
            pushUndo(textInput.value);
            textInput.value = t;
            textInput.focus();
            inputHandler();
        }).catch(function() {
            textInput.focus();
            document.execCommand('paste');
        });
    });

    selectAllBtn.addEventListener('click', function() {
        textInput.focus();
        textInput.select();
    });

    if (selectAllOutput) {
        selectAllOutput.addEventListener('click', function() {
            var range = document.createRange();
            range.selectNodeContents(outputText);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });
    }

    cleanupToggle.addEventListener('click', function() {
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        cleanupBody.hidden = expanded;
    });

    document.querySelectorAll('.cc-cln-run').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var subsection = this.closest('.cc-cln-subsection');
            if (!subsection) return;
            var checks = subsection.querySelectorAll('input[data-cln]:checked');
            var toRun = [];
            checks.forEach(function(c) { toRun.push(c.dataset.cln); });
            if (toRun.length === 0) { showToast('No tools selected', 'error'); return; }
            pushUndo(textInput.value);
            var text = textInput.value;
            for (var i = 0; i < toRun.length; i++) {
                var fn = cleanups[toRun[i]];
                if (fn) text = fn(text);
            }
            textInput.value = text;
            textInput.focus();
            updateStats(text);
            if (lastCaseType) doConvert(lastCaseType);
            showToast('\u2713 ' + toRun.length + ' cleanup(s) applied');
        });
    });

    document.querySelectorAll('.cc-cln-chk input[type=checkbox]').forEach(function(chk) {
        chk.addEventListener('change', function() {
            var subsection = this.closest('.cc-cln-subsection');
            if (subsection) {
                subsection.querySelectorAll('input[data-cln]').forEach(function(c) {
                    c.checked = chk.checked;
                });
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        var ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) redo(); else undo();
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 'l':
                e.preventDefault();
                if (converters.lowercase) { doConvert('lowercase'); }
                break;
        }
    });

    function loadFavorites() {
        try {
            var data = localStorage.getItem('cc-favorites');
            return data ? JSON.parse(data) : ['lowercase', 'uppercase', 'titlecase', 'camelcase'];
        } catch (e) { return ['lowercase', 'uppercase', 'titlecase', 'camelcase']; }
    }

    function saveFavorites() {
        try { localStorage.setItem('cc-favorites', JSON.stringify(favoriteCases)); } catch (e) {}
    }

    function toggleFavorite(caseType) {
        var idx = favoriteCases.indexOf(caseType);
        if (idx > -1) { favoriteCases.splice(idx, 1); } else { favoriteCases.push(caseType); }
        saveFavorites();
        renderFavorites();
        updatePinIcons();
    }

    function renderFavorites() {
        favGrid.innerHTML = '';
        if (favoriteCases.length === 0) {
            favSection.hidden = true;
            return;
        }
        favSection.hidden = false;
        favoriteCases.forEach(function(c) {
            var label = caseLabels[c] || c;
            var chip = document.createElement('button');
            chip.className = 'cc-fav-btn';
            chip.dataset.case = c;
            var textSpan = document.createElement('span');
            textSpan.textContent = label;
            chip.appendChild(textSpan);
            var removeBtn = document.createElement('span');
            removeBtn.className = 'cc-pin-remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.setAttribute('aria-label', 'Remove ' + label + ' from favorites');
            removeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFavorite(c);
            });
            chip.appendChild(removeBtn);
            chip.addEventListener('click', function() { doConvert(this.dataset.case); });
            favGrid.appendChild(chip);
        });
    }

    function updatePinIcons() {
        formatBtns.forEach(function(btn) {
            var c = btn.dataset.case;
            var pin = btn.querySelector('.cc-pin-btn');
            if (pin) {
                var isFav = favoriteCases.indexOf(c) > -1;
                pin.classList.toggle('pinned', isFav);
                pin.textContent = isFav ? '\u2605' : '\u2606';
            }
        });
    }

    formatBtns.forEach(function(btn) {
        var pin = document.createElement('button');
        pin.className = 'cc-pin-btn';
        pin.title = 'Toggle favorite';
        pin.setAttribute('aria-label', 'Toggle favorite');
        pin.setAttribute('aria-pressed', 'false');
        btn.style.position = 'relative';
        btn.appendChild(pin);
        pin.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFavorite(btn.dataset.case);
        });
    });

    searchInput.addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        var visibleCount = 0;
        formatBtns.forEach(function(btn) {
            btn.querySelectorAll('.cc-search-highlight').forEach(function(h) {
                var parent = h.parentNode;
                if (parent) {
                    var text = document.createTextNode(h.textContent);
                    parent.replaceChild(text, h);
                    parent.normalize();
                }
            });
            var label = btn.textContent.toLowerCase().replace(/[\u2605\u2606]/g, '').trim();
            var match = q === '' || label.indexOf(q) > -1;
            btn.classList.toggle('search-hidden', !match);
            if (match) visibleCount++;
        });
        if (q) {
            formatBtns.forEach(function(btn) {
                if (btn.classList.contains('search-hidden')) return;
                var label = btn.textContent.toLowerCase().replace(/[\u2605\u2606]/g, '').trim();
                var idx = label.indexOf(q);
                if (idx > -1) {
                    var firstText = null;
                    btn.childNodes.forEach(function(n) { if (n.nodeType === 3 && !firstText) firstText = n; });
                    if (firstText) {
                        var text = firstText.textContent;
                        var pos = text.toLowerCase().indexOf(q);
                        if (pos > -1) {
                            var before = text.substring(0, pos);
                            var matchText = text.substring(pos, pos + q.length);
                            var after = text.substring(pos + q.length);
                            var span = document.createElement('span');
                            span.innerHTML = before + '<mark class="cc-search-highlight">' + matchText + '</mark>' + after;
                            firstText.parentNode.replaceChild(span, firstText);
                        }
                    }
                }
            });
            searchCount.hidden = false;
            searchCount.innerHTML = '<strong>' + visibleCount + '</strong> format' + (visibleCount !== 1 ? 's' : '') + ' found';
        } else {
            searchCount.hidden = true;
        }
    });

    if (qaPaste) {
        qaPaste.addEventListener('click', function() {
            pasteBtn.click();
        });
    }
    if (qaCopy) {
        qaCopy.addEventListener('click', copyResult);
    }
    if (qaSwap) {
        qaSwap.addEventListener('click', swapText);
    }
    if (qaUndo) {
        qaUndo.addEventListener('click', undo);
    }
    if (qaRedo) {
        qaRedo.addEventListener('click', redo);
    }
    if (qaClear) {
        qaClear.addEventListener('click', clearTool);
    }
    if (qaClearSingle) {
        qaClearSingle.addEventListener('click', function() {
            pushUndo(textInput.value);
            textInput.value = '';
            textInput.focus();
            handleInputChange();
            showToast('\u2713 Cleared');
        });
    }

    renderFavorites();
    updatePinIcons();

    updateStats('');
    updateUndoRedo();
});
