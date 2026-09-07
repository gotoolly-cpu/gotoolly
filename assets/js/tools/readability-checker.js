/* ============================================
   GO TOOLLY - READABILITY CHECKER v2.0
   Professional text readability analysis
   ============================================ */

(function() {
    'use strict';

    var state = {
        results: null,
        history: [],
        lastText: ''
    };

    var elements = {};

    function init() {
        elements = {
            textInput: document.getElementById('text-input'),
            analyzeBtn: document.getElementById('analyze-btn'),
            resetBtn: document.getElementById('reset-btn'),
            resultArea: document.getElementById('result-area'),
            emptyState: document.getElementById('empty-state'),
            statusBadge: document.getElementById('status-badge'),
            limitationsBox: document.getElementById('limitations-box'),
            workspaceBody: document.getElementById('workspace-body'),
            actionBar: document.getElementById('action-bar'),
            gaugeSvg: document.getElementById('gauge-svg'),
            gaugeValue: document.getElementById('gauge-value'),
            gaugeLabel: document.getElementById('gauge-label'),
            gaugeGrade: document.getElementById('gauge-grade'),
            assessmentContent: document.getElementById('assessment-content'),
            suggestionsList: document.getElementById('suggestions-list'),
            scoresGrid: document.getElementById('scores-grid'),
            exportSection: document.getElementById('export-section'),
            exportCopy: document.getElementById('export-copy'),
            exportTxt: document.getElementById('export-txt'),
            exportJson: document.getElementById('export-json'),
            exportPrint: document.getElementById('export-print'),
            comparisonSection: document.getElementById('comparison-section'),
            comparisonSelect: document.getElementById('comparison-select'),
            comparisonTable: document.getElementById('comparison-table'),
            statWords: document.getElementById('stat-words'),
            statChars: document.getElementById('stat-chars'),
            statCharNs: document.getElementById('stat-char-ns'),
            statSentences: document.getElementById('stat-sentences'),
            statParagraphs: document.getElementById('stat-paragraphs'),
            statReadingTime: document.getElementById('stat-reading-time'),
            statSpeakingTime: document.getElementById('stat-speaking-time'),
            statAvgSent: document.getElementById('stat-avg-sent'),
            statAvgWord: document.getElementById('stat-avg-word'),
            statSyllables: document.getElementById('stat-syllables'),
            statLexical: document.getElementById('stat-lexical'),
            statComplex: document.getElementById('stat-complex'),
            statLongSent: document.getElementById('stat-long-sent')
        };

        elements.analyzeBtn.addEventListener('click', analyzeText);
        elements.resetBtn.addEventListener('click', resetTool);
        elements.textInput.addEventListener('input', onTextInput);

        if (elements.exportCopy) elements.exportCopy.addEventListener('click', exportCopy);
        if (elements.exportTxt) elements.exportTxt.addEventListener('click', exportTxt);
        if (elements.exportJson) elements.exportJson.addEventListener('click', exportJson);
        if (elements.exportPrint) elements.exportPrint.addEventListener('click', exportPrint);
        if (elements.comparisonSelect) elements.comparisonSelect.addEventListener('change', onComparisonChange);

        showEmptyState();
    }

    function onTextInput() {
        var len = elements.textInput.value.trim().length;
        if (len > 0) {
            updateStatus('ready', 'Ready');
        } else {
            updateStatus('', '');
        }
    }

    function updateStatus(type, text) {
        elements.statusBadge.className = 'status-badge' + (type ? ' ' + type : '');
        elements.statusBadge.textContent = text;
    }

    function showEmptyState() {
        if (elements.emptyState) elements.emptyState.style.display = 'flex';
        if (elements.resultArea) elements.resultArea.style.display = 'none';
    }

    function showResults() {
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultArea) {
            elements.resultArea.style.display = 'block';
            elements.resultArea.classList.add('show');
        }
    }

    /* ========================
       TEXT ANALYSIS ENGINE
       ======================== */

    function countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length === 0) return 0;
        if (word.length <= 2) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        var matches = word.match(/[aeiouy]{1,2}/g);
        return matches ? matches.length : 1;
    }

    function isComplexWord(word) {
        return countSyllables(word) >= 3;
    }

    function getWords(text) {
        return text.split(/\s+/).filter(function(w) {
            return w.length > 0 && /[a-zA-Z]/.test(w);
        });
    }

    function getSentences(text) {
        var parts = text.split(/[.!?]+/).filter(function(s) {
            return s.trim().length > 0;
        });
        return parts.length || 1;
    }

    function getParagraphs(text) {
        var parts = text.split(/\n\s*\n/).filter(function(p) {
            return p.trim().length > 0;
        });
        return parts.length || 1;
    }

    function getLetters(text) {
        return text.replace(/[^a-zA-Z]/g, '').length;
    }

    function getCharactersNoSpaces(text) {
        return text.replace(/\s/g, '').length;
    }

    function getLexicalDiversity(words) {
        var unique = {};
        words.forEach(function(w) {
            unique[w.toLowerCase()] = true;
        });
        return Object.keys(unique).length / words.length;
    }

    function getComplexWords(words) {
        var complex = [];
        words.forEach(function(w) {
            if (isComplexWord(w)) {
                var clean = w.replace(/[^a-zA-Z]/g, '');
                if (clean.length > 0) {
                    complex.push({
                        word: clean,
                        syllables: countSyllables(clean)
                    });
                }
            }
        });
        return complex;
    }

    function getLongSentences(text) {
        var parts = text.split(/[.!?]+/).filter(function(s) {
            return s.trim().length > 0;
        });
        var long = [];
        parts.forEach(function(s) {
            var words = s.trim().split(/\s+/).filter(function(w) {
                return w.length > 0;
            });
            if (words.length > 25) {
                long.push({
                    text: s.trim().substring(0, 120) + (s.trim().length > 120 ? '...' : ''),
                    wordCount: words.length
                });
            }
        });
        return long;
    }

    /* ========================
       READABILITY FORMULAS
       ======================== */

    function fleschReadingEase(wordCount, sentenceCount, syllableCount) {
        if (wordCount === 0 || sentenceCount === 0) return 0;
        var score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
        return Math.max(0, Math.min(100, score));
    }

    function fleschKincaidGrade(wordCount, sentenceCount, syllableCount) {
        if (wordCount === 0 || sentenceCount === 0) return 0;
        var score = 0.39 * (wordCount / sentenceCount) + 11.8 * (syllableCount / wordCount) - 15.59;
        return Math.max(0, score);
    }

    function gunningFog(wordCount, sentenceCount, complexWords) {
        if (wordCount === 0 || sentenceCount === 0) return 0;
        var score = 0.4 * ((wordCount / sentenceCount) + 100 * (complexWords / wordCount));
        return Math.max(0, score);
    }

    function smogIndex(complexWords, sentenceCount) {
        if (sentenceCount === 0) return 0;
        var score = 1.0430 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291;
        return Math.max(0, score);
    }

    function colemanLiauIndex(wordCount, sentenceCount, letters) {
        if (wordCount === 0 || sentenceCount === 0) return 0;
        var L = (letters / wordCount) * 100;
        var S = (sentenceCount / wordCount) * 100;
        var score = 0.0588 * L - 0.296 * S - 15.8;
        return Math.max(0, score);
    }

    function automatedReadabilityIndex(wordCount, sentenceCount, characters) {
        if (wordCount === 0 || sentenceCount === 0) return 0;
        var score = 4.71 * (characters / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43;
        return Math.max(0, score);
    }

    function getReadingLevel(ease) {
        if (ease >= 90) return { label: 'Very Easy', desc: '5th grade', color: '#16a34a', icon: 'green' };
        if (ease >= 80) return { label: 'Easy', desc: '6th grade', color: '#22c55e', icon: 'green' };
        if (ease >= 70) return { label: 'Fairly Easy', desc: '7th grade', color: '#84cc16', icon: 'green' };
        if (ease >= 60) return { label: 'Standard', desc: '8th-9th grade', color: '#eab308', icon: 'yellow' };
        if (ease >= 50) return { label: 'Fairly Difficult', desc: '10th-12th grade', color: '#f97316', icon: 'orange' };
        if (ease >= 30) return { label: 'Difficult', desc: 'College level', color: '#ef4444', icon: 'red' };
        return { label: 'Very Confusing', desc: 'College graduate', color: '#dc2626', icon: 'red' };
    }

    /* ========================
       ASSESSMENT & SUGGESTIONS
       ======================== */

    function generateAssessment(data) {
        var level = getReadingLevel(data.fleschEase);
        var parts = [];

        parts.push('Your text has a <strong>' + level.label + '</strong> reading level (' + level.desc + ').');

        if (data.fleschEase >= 70) {
            parts.push('Most readers will understand this text easily.');
        } else if (data.fleschEase >= 50) {
            parts.push('This text is accessible to a general audience but may require some attention.');
        } else {
            parts.push('This text may be challenging for many readers.');
        }

        if (data.avgSentenceLength > 20) {
            parts.push('Your sentences are quite long on average (' + data.avgSentenceLength.toFixed(1) + ' words). Shorter sentences improve readability.');
        }

        if (data.complexWordPercent > 15) {
            parts.push('About ' + data.complexWordPercent.toFixed(1) + '% of your words are complex (3+ syllables). Consider simpler alternatives when possible.');
        }

        if (data.lexicalDiversity > 0.7) {
            parts.push('Good vocabulary diversity — you use a wide range of words.');
        } else if (data.lexicalDiversity < 0.4) {
            parts.push('Your vocabulary diversity is low. Try using more varied word choices.');
        }

        return parts.join(' ');
    }

    function generateSuggestions(data) {
        var suggestions = [];

        if (data.avgSentenceLength > 20) {
            suggestions.push({
                type: 'warning',
                icon: 'scissors',
                title: 'Shorten sentences',
                text: 'Average sentence length is ' + data.avgSentenceLength.toFixed(1) + ' words. Aim for 15-20 words per sentence.'
            });
        }

        if (data.complexWordPercent > 15) {
            suggestions.push({
                type: 'warning',
                icon: 'book',
                title: 'Reduce complex words',
                text: data.complexWordPercent.toFixed(1) + '% of words have 3+ syllables. Replace with simpler synonyms when possible.'
            });
        }

        if (data.longSentences.length > 0) {
            suggestions.push({
                type: 'info',
                icon: 'alert',
                title: 'Long sentences detected',
                text: data.longSentences.length + ' sentence(s) exceed 25 words. Break them into shorter ones.'
            });
        }

        if (data.fleschEase < 50) {
            suggestions.push({
                type: 'error',
                icon: 'target',
                title: 'Improve overall readability',
                text: 'Target a Flesch Reading Ease score of 60-70 for general audiences.'
            });
        }

        if (data.lexicalDiversity < 0.4) {
            suggestions.push({
                type: 'info',
                icon: 'shuffle',
                title: 'Increase vocabulary variety',
                text: 'Try using synonyms and varied word choices to improve engagement.'
            });
        }

        if (data.fleschEase >= 70 && data.avgSentenceLength <= 20 && data.complexWordPercent <= 15) {
            suggestions.push({
                type: 'success',
                icon: 'check',
                title: 'Great readability!',
                text: 'Your text is well-optimized for readability. Keep up the good work.'
            });
        }

        return suggestions;
    }

    /* ========================
       GAUGE RENDERING
       ======================== */

    function renderGauge(value, color, grade) {
        var svg = elements.gaugeSvg;
        if (!svg) return;

        var arcLength = Math.PI * 80;
        var filled = (value / 100) * arcLength;
        var arc = svg.querySelector('.gauge-arc-fill');
        if (arc) {
            arc.setAttribute('stroke-dasharray', filled + ' ' + (arcLength - filled));
            arc.setAttribute('stroke', color);
        }

        if (elements.gaugeValue) {
            animateCounter(elements.gaugeValue, 0, Math.round(value), 1200);
        }

        var level = getReadingLevel(value);
        if (elements.gaugeLabel) {
            elements.gaugeLabel.textContent = level.label;
            elements.gaugeLabel.style.color = level.color;
        }
        if (elements.gaugeGrade) {
            elements.gaugeGrade.textContent = 'U.S. Grade ' + Math.round(grade) + ' \u2014 ' + level.desc;
        }
    }

    function animateCounter(el, from, to, duration) {
        var start = performance.now();
        function update(now) {
            var elapsed = now - start;
            var progress = Math.min(elapsed / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(from + (to - from) * eased);
            el.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    /* ========================
       MAIN ANALYSIS
       ======================== */

    function analyzeText() {
        var text = elements.textInput.value.trim();
        if (!text) {
            showToast('Please enter some text to analyze', 'error');
            return;
        }

        updateStatus('processing', 'Analyzing...');

        setTimeout(function() {
            var words = getWords(text);
            var wordCount = words.length;
            var sentenceCount = getSentences(text);
            var paragraphCount = getParagraphs(text);
            var charCount = text.length;
            var charNoSpaces = getCharactersNoSpaces(text);
            var letters = getLetters(text);
            var totalSyllables = 0;
            words.forEach(function(w) {
                totalSyllables += countSyllables(w);
            });

            var avgWordLength = charCount / wordCount;
            var avgSentenceLength = wordCount / sentenceCount;
            var avgSyllablesPerWord = totalSyllables / wordCount;
            var lexicalDiversity = getLexicalDiversity(words);

            var complexWords = getComplexWords(words);
            var complexWordCount = complexWords.length;
            var complexWordPercent = (complexWordCount / wordCount) * 100;
            var longSentences = getLongSentences(text);

            var fleschEase = fleschReadingEase(wordCount, sentenceCount, totalSyllables);
            var fkGrade = fleschKincaidGrade(wordCount, sentenceCount, totalSyllables);
            var fog = gunningFog(wordCount, sentenceCount, complexWordCount);
            var smog = smogIndex(complexWordCount, sentenceCount);
            var cl = colemanLiauIndex(wordCount, sentenceCount, letters);
            var ari = automatedReadabilityIndex(wordCount, sentenceCount, charCount);

            var readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
            var speakingTimeMin = Math.max(1, Math.ceil(wordCount / 150));

            var level = getReadingLevel(fleschEase);

            var data = {
                fleschEase: fleschEase,
                fkGrade: fkGrade,
                fog: fog,
                smog: smog,
                cl: cl,
                ari: ari,
                wordCount: wordCount,
                sentenceCount: sentenceCount,
                paragraphCount: paragraphCount,
                charCount: charCount,
                charNoSpaces: charNoSpaces,
                readingTimeMin: readingTimeMin,
                speakingTimeMin: speakingTimeMin,
                avgWordLength: avgWordLength,
                avgSentenceLength: avgSentenceLength,
                avgSyllablesPerWord: avgSyllablesPerWord,
                totalSyllables: totalSyllables,
                lexicalDiversity: lexicalDiversity,
                complexWords: complexWords,
                complexWordCount: complexWordCount,
                complexWordPercent: complexWordPercent,
                longSentences: longSentences,
                level: level,
                timestamp: Date.now(),
                textPreview: text.substring(0, 60) + (text.length > 60 ? '...' : '')
            };

            state.results = data;
            state.lastText = text;

            if (state.history.length >= 5) {
                state.history.shift();
            }
            state.history.push(data);

            renderResults(data);
            showResults();
            updateStatus('done', 'Done');
        }, 300);
    }

    function renderResults(data) {
        renderGauge(data.fleschEase, data.level.color, data.fkGrade);

        if (elements.assessmentContent) {
            elements.assessmentContent.innerHTML = generateAssessment(data);
        }

        renderSuggestions(generateSuggestions(data));

        renderScores(data);
        renderStats(data);
        renderComplexWords(data.complexWords);
        renderLongSentences(data.longSentences);
        renderComparison();

        if (elements.exportSection) elements.exportSection.style.display = 'flex';
    }

    function renderSuggestions(suggestions) {
        if (!elements.suggestionsList) return;
        var html = '';
        suggestions.forEach(function(s) {
            var colorMap = {
                success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
                warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
                error: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
                info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' }
            };
            var c = colorMap[s.type] || colorMap.info;
            var impact = s.type === 'error' ? 'High' : s.type === 'warning' ? 'High' : 'Medium';
            var impactColor = impact === 'High' ? '#dc2626' : '#d97706';
            html += '<div style="padding:12px 16px;background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:10px;margin-bottom:10px">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
                '<div style="font-weight:600;font-size:13px;color:' + c.text + '">' + s.title + '</div>' +
                '<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:9999px;background:' + c.bg + ';color:' + impactColor + ';border:1px solid ' + (impact === 'High' ? '#fecaca' : '#fde68a') + '">' + impact + ' Impact</span>' +
                '</div>' +
                '<div style="font-size:13px;color:' + c.text + ';opacity:0.85;line-height:1.5">' + s.text + '</div>' +
                '</div>';
        });
        elements.suggestionsList.innerHTML = html;
    }

    function renderScores(data) {
        if (!elements.scoresGrid) return;
        var scores = [
            { label: 'Flesch Reading Ease', tip: 'Higher scores = easier reading', value: data.fleschEase.toFixed(1), max: 100, color: data.level.color },
            { label: 'F-K Grade Level', tip: 'U.S. school grade level needed', value: data.fkGrade.toFixed(1), max: 20, color: '#2563eb' },
            { label: 'Gunning Fog', tip: 'Years of education needed', value: data.fog.toFixed(1), max: 20, color: '#7c3aed' },
            { label: 'SMOG Index', tip: 'Readability via complex words', value: data.smog.toFixed(1), max: 20, color: '#0891b2' },
            { label: 'Coleman-Liau', tip: 'Based on letters & sentences', value: data.cl.toFixed(1), max: 20, color: '#059669' },
            { label: 'ARI', tip: 'Automated Readability Index', value: data.ari.toFixed(1), max: 20, color: '#d97706' }
        ];

        var html = '';
        scores.forEach(function(s) {
            var pct = Math.min((parseFloat(s.value) / s.max) * 100, 100);
            html += '<div class="score-card">' +
                '<div class="score-label">' + s.label +
                '<span class="score-tip" tabindex="0" role="tooltip" aria-label="' + s.tip + '">' +
                '?' +
                '<span class="score-tip-text">' + s.tip + '</span>' +
                '</span></div>' +
                '<div class="score-value" style="color:' + s.color + '">' + s.value + '</div>' +
                '<div class="score-bar-track"><div class="score-bar-fill" style="width:' + pct + '%;background:' + s.color + '"></div></div>' +
                '</div>';
        });
        elements.scoresGrid.innerHTML = html;
    }

    function renderStats(data) {
        setStat(elements.statWords, data.wordCount.toLocaleString());
        setStat(elements.statChars, data.charCount.toLocaleString());
        setStat(elements.statCharNs, data.charNoSpaces.toLocaleString());
        setStat(elements.statSentences, data.sentenceCount.toLocaleString());
        setStat(elements.statParagraphs, data.paragraphCount.toLocaleString());
        setStat(elements.statReadingTime, data.readingTimeMin + ' min');
        setStat(elements.statSpeakingTime, data.speakingTimeMin + ' min');
        setStat(elements.statAvgSent, data.avgSentenceLength.toFixed(1));
        setStat(elements.statAvgWord, data.avgWordLength.toFixed(1) + ' chars');
        setStat(elements.statSyllables, data.totalSyllables.toLocaleString());
        setStat(elements.statLexical, (data.lexicalDiversity * 100).toFixed(1) + '%');
        setStat(elements.statComplex, data.complexWordCount.toLocaleString() + ' (' + data.complexWordPercent.toFixed(1) + '%)');
        setStat(elements.statLongSent, data.longSentences.length.toLocaleString());
    }

    function setStat(el, val) {
        if (el) el.textContent = val;
    }

    function renderComplexWords(words) {
        var el = document.getElementById('complex-words-section');
        var list = document.getElementById('complex-words-list');
        if (!el || !list) return;
        if (words.length === 0) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';

        var freq = {};
        words.forEach(function(w) {
            var key = w.word.toLowerCase();
            freq[key] = (freq[key] || 0) + 1;
        });
        var unique = Object.keys(freq).sort(function(a, b) { return freq[b] - freq[a]; }).slice(0, 15);

        var html = '<div class="complex-words-cloud">';
        unique.forEach(function(w) {
            var syl = countSyllables(w);
            html += '<span class="complex-word-tag">' + w + ' <small>' + syl + ' syllables</small></span>';
        });
        html += '</div>';
        list.innerHTML = html;
    }

    function renderLongSentences(sentences) {
        var el = document.getElementById('long-sentences-section');
        var list = document.getElementById('long-sentences-list');
        if (!el || !list) return;
        if (sentences.length === 0) {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';

        var html = '';
        sentences.forEach(function(s, i) {
            html += '<div class="long-sentence-item">' +
                '<span class="long-sentence-num">' + (i + 1) + '</span>' +
                '<div class="long-sentence-content">' +
                '<div class="long-sentence-text">' + escapeHtml(s.text) + '</div>' +
                '<div class="long-sentence-meta"><strong>' + s.wordCount + ' words</strong></div>' +
                '</div>' +
                '</div>';
        });
        list.innerHTML = html;
    }

    /* ========================
       COMPARISON
       ======================== */

    function renderComparison() {
        if (!elements.comparisonSelect || !elements.comparisonTable) return;
        var available = state.history.filter(function(item) {
            return !state.results || item.timestamp !== state.results.timestamp;
        });
        if (available.length === 0) {
            elements.comparisonSection.style.display = 'none';
            return;
        }
        elements.comparisonSection.style.display = 'block';

        var html = '<option value="">Select a previous analysis...</option>';
        available.forEach(function(item, i) {
            html += '<option value="' + state.history.indexOf(item) + '">' + item.textPreview + ' (' + formatDate(item.timestamp) + ')</option>';
        });
        elements.comparisonSelect.innerHTML = html;
    }

    function onComparisonChange() {
        var idx = parseInt(elements.comparisonSelect.value);
        if (isNaN(idx) || !state.history[idx] || !state.results) {
            elements.comparisonTable.innerHTML = '';
            return;
        }

        var prev = state.history[idx];
        var curr = state.results;

        var metrics = [
            { label: 'Flesch Reading Ease', curr: curr.fleschEase.toFixed(1), prev: prev.fleschEase.toFixed(1) },
            { label: 'F-K Grade Level', curr: curr.fkGrade.toFixed(1), prev: prev.fkGrade.toFixed(1) },
            { label: 'Gunning Fog', curr: curr.fog.toFixed(1), prev: prev.fog.toFixed(1) },
            { label: 'SMOG Index', curr: curr.smog.toFixed(1), prev: prev.smog.toFixed(1) },
            { label: 'Coleman-Liau', curr: curr.cl.toFixed(1), prev: prev.cl.toFixed(1) },
            { label: 'ARI', curr: curr.ari.toFixed(1), prev: prev.ari.toFixed(1) },
            { label: 'Word Count', curr: curr.wordCount, prev: prev.wordCount },
            { label: 'Avg Sentence Length', curr: curr.avgSentenceLength.toFixed(1), prev: prev.avgSentenceLength.toFixed(1) },
            { label: 'Complex Words %', curr: curr.complexWordPercent.toFixed(1) + '%', prev: prev.complexWordPercent.toFixed(1) + '%' }
        ];

        var html = '<table class="comparison-table"><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>';
        metrics.forEach(function(m) {
            var currVal = parseFloat(m.curr);
            var prevVal = parseFloat(m.prev);
            var diff = currVal - prevVal;
            var arrow = diff > 0 ? '<span class="comp-up">+' + diff.toFixed(1) + '</span>' :
                diff < 0 ? '<span class="comp-down">' + diff.toFixed(1) + '</span>' :
                    '<span class="comp-same">0</span>';
            html += '<tr><td>' + m.label + '</td><td>' + m.curr + '</td><td>' + m.prev + '</td><td>' + arrow + '</td></tr>';
        });
        html += '</tbody></table>';
        elements.comparisonTable.innerHTML = html;
    }

    /* ========================
       EXPORT FUNCTIONS
       ======================== */

    function exportCopy() {
        if (!state.results) return;
        var data = state.results;
        var text = 'Readability Analysis Report\n' +
            '============================\n\n' +
            'Flesch Reading Ease: ' + data.fleschEase.toFixed(1) + ' (' + data.level.label + ')\n' +
            'F-K Grade Level: ' + data.fkGrade.toFixed(1) + '\n' +
            'Gunning Fog: ' + data.fog.toFixed(1) + '\n' +
            'SMOG Index: ' + data.smog.toFixed(1) + '\n' +
            'Coleman-Liau: ' + data.cl.toFixed(1) + '\n' +
            'ARI: ' + data.ari.toFixed(1) + '\n\n' +
            'Word Count: ' + data.wordCount + '\n' +
            'Sentence Count: ' + data.sentenceCount + '\n' +
            'Paragraph Count: ' + data.paragraphCount + '\n' +
            'Character Count: ' + data.charCount + '\n' +
            'Reading Time: ' + data.readingTimeMin + ' min\n' +
            'Speaking Time: ' + data.speakingTimeMin + ' min\n' +
            'Lexical Diversity: ' + (data.lexicalDiversity * 100).toFixed(1) + '%\n' +
            'Complex Words: ' + data.complexWordCount + ' (' + data.complexWordPercent.toFixed(1) + '%)\n';

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied to clipboard!', 'success');
            });
        } else {
            showToast('Clipboard not available', 'error');
        }
    }

    function exportTxt() {
        if (!state.results) return;
        var data = state.results;
        var text = 'Readability Analysis Report\n' +
            '============================\n\n' +
            'Flesch Reading Ease: ' + data.fleschEase.toFixed(1) + ' (' + data.level.label + ')\n' +
            'F-K Grade Level: ' + data.fkGrade.toFixed(1) + '\n' +
            'Gunning Fog: ' + data.fog.toFixed(1) + '\n' +
            'SMOG Index: ' + data.smog.toFixed(1) + '\n' +
            'Coleman-Liau: ' + data.cl.toFixed(1) + '\n' +
            'ARI: ' + data.ari.toFixed(1) + '\n\n' +
            'Word Count: ' + data.wordCount + '\n' +
            'Sentence Count: ' + data.sentenceCount + '\n' +
            'Paragraph Count: ' + data.paragraphCount + '\n' +
            'Character Count: ' + data.charCount + '\n' +
            'Reading Time: ' + data.readingTimeMin + ' min\n' +
            'Speaking Time: ' + data.speakingTimeMin + ' min\n' +
            'Lexical Diversity: ' + (data.lexicalDiversity * 100).toFixed(1) + '%\n' +
            'Complex Words: ' + data.complexWordCount + ' (' + data.complexWordPercent.toFixed(1) + '%)\n';

        downloadFile('readability-report.txt', text, 'text/plain');
        showToast('Downloaded TXT report', 'success');
    }

    function exportJson() {
        if (!state.results) return;
        var json = JSON.stringify(state.results, null, 2);
        downloadFile('readability-report.json', json, 'application/json');
        showToast('Downloaded JSON report', 'success');
    }

    function exportPrint() {
        window.print();
    }

    function downloadFile(filename, content, mimeType) {
        var blob = new Blob([content], { type: mimeType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /* ========================
       UTILITY
       ======================== */

    function resetTool() {
        elements.textInput.value = '';
        state.results = null;
        state.lastText = '';
        updateStatus('', '');
        showEmptyState();
        if (elements.gaugeGrade) elements.gaugeGrade.textContent = '';
        if (elements.comparisonTable) elements.comparisonTable.innerHTML = '';
        if (elements.exportSection) elements.exportSection.style.display = 'none';
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

    function formatDate(ts) {
        var d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function showToast(msg, type) {
        var existing = document.querySelector('.toast');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'toast ' + (type || 'info');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.classList.add('show'); }, 10);
        setTimeout(function() {
            el.classList.remove('show');
            setTimeout(function() { el.remove(); }, 300);
        }, 3000);
    }

    /* ========================
       INITIALIZE
       ======================== */

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
