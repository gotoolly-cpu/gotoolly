/* ============================================
   GO TOOLLY - TEXT SUMMARIZER v6
   Paragraph-Aware Diversity-Ranked Extractive Engine
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var summarizeBtn = document.getElementById('summarize-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var downloadBtn = document.getElementById('download-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var originalHighlight = document.getElementById('original-highlight');
    var lengthSlider = document.getElementById('summary-length');
    var lengthValue = document.getElementById('length-value');
    var actionBar = document.getElementById('action-bar');
    var progressSection = document.getElementById('progress-section');
    var progressPhase = document.getElementById('progress-phase');
    var progressFill = document.getElementById('progress-fill');
    var statusBadge = document.getElementById('status-badge');

    var statEls = {
        originalWords: document.getElementById('stat-original-words'),
        summaryWords: document.getElementById('stat-summary-words'),
        reduction: document.getElementById('stat-reduction'),
        originalSentences: document.getElementById('stat-original-sentences'),
        summarySentences: document.getElementById('stat-summary-sentences'),
        compressionRatio: document.getElementById('stat-compression-ratio'),
        readingTimeSaved: document.getElementById('stat-reading-time-saved'),
        estReadingTime: document.getElementById('stat-est-reading-time'),
        summaryPercentage: document.getElementById('stat-summary-percentage'),
        summaryMethod: document.getElementById('stat-summary-method')
    };

    var resultHeading = document.getElementById('result-heading');
    var resultSub = document.getElementById('result-sub');
    var resultWordsBadge = document.getElementById('result-words-badge');
    var resultReadTime = document.getElementById('result-read-time');

    var lastResult = '';

    /* ===== STOP WORDS ===== */
    var STOP_WORDS = {};
    var stopArr = 'the a an is are was were be been being have has had do does did will would could should may might shall can to of in for on with at by from as into through during before after and but or nor not so if then than that this these those it its i me my we our you your he him his she her they them their what which who whom when where why how all each every both few more most other some such no only own same too very just about also up out said its'.split(' ');
    for (var si = 0; si < stopArr.length; si++) STOP_WORDS[stopArr[si]] = true;

    /* ===== TOPIC WORDS ===== */
    var TOPIC_WORDS = {};
    var topicArr = ('privacy security performance accessibility seo optimization speed ' +
        'quality reliability efficiency usability design development ' +
        'browser local client-side processing server application ' +
        'tool platform feature benefit advantage solution ' +
        'data information content text document file ' +
        'user customer experience interface system ' +
        'improve enhance optimize increase reduce ' +
        'support provide deliver offer enable ' +
        'important essential critical significant key').split(' ');
    for (var ti = 0; ti < topicArr.length; ti++) TOPIC_WORDS[topicArr[ti]] = true;

    /* ===== PLACEHOLDER PATTERNS ===== */
    var PLACEHOLDER_PATTERNS = [
        /^lorem ipsum/i,
        /^end of (report|file|document|section)\.?$/i,
        /^trim whitespace test\.?$/i,
        /^case sensitive test\.?$/i,
        /^this line contains repeated/i,
        /^placeholder text\.?$/i,
        /^sample text\.?$/i,
        /^test sentence\.?$/i,
        /^dummy text\.?$/i,
        /^example text\.?$/i,
        /^performance is important\.?$/i,
        /^privacy matters\.?$/i,
        /^accessibility improves usability\.?$/i,
        /^users expect instant results\.?$/i,
        /^files never leave your device\.?$/i,
        /^all processing happens locally\.?$/i,
        /^browser-based tools reduce server costs\.?$/i,
        /^search engine optimization improves visibility\.?$/i,
        /^modern web applications should be/i
    ];

    /* ===== TOPIC PATTERNS ===== */
    var TOPIC_PATTERNS = [
        /introduce/i, /overview/i, /purpose/i, /goal/i, /objective/i,
        /refers to/i, /defined as/i, /meaning/i, /concept/i,
        /important/i, /significant/i, /critical/i, /essential/i,
        /benefit/i, /advantage/i, /improve/i, /increase/i,
        /provide/i, /enable/i, /allow/i, /support/i,
        /result/i, /conclude/i, /therefore/i, /thus/i, /hence/i,
        /find/i, /show/i, /demonstrate/i, /indicate/i,
        /because/i, /since/i, /due to/i, /as a result/i,
        /first/i, /second/i, /third/i, /finally/i,
        /key/i, /main/i, /primary/i, /core/i
    ];

    /* ===== STEP 1: NORMALIZE TEXT ===== */
    function normalizeText(text) {
        var t = text;
        t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        t = t.trim();
        var lines = t.split('\n');
        var cleaned = [];
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            if (trimmed.length > 0) {
                trimmed = trimmed.replace(/\s{2,}/g, ' ');
                cleaned.push(trimmed);
            }
        }
        return cleaned.join('\n');
    }

    /* ===== ABBREVIATIONS TO PROTECT ===== */
    var ABBR_WORDS = ['Dr','Mr','Mrs','Ms','Prof','Sr','Jr','St','Ave','Blvd','Inc','Ltd','Corp','vs','etc','eg','ie','Est','Dept','vol','No','pp','Ed','Fig','Gen','Sgt','Cpl','Maj','Gov','Sen','Rep','Rev','Approx','approx','max','min','approx'];

    /* ===== SEGMENT A SINGLE LINE INTO SENTENCES ===== */
    function segmentLine(line) {
        var ph = [];
        var s = line;

        /* protect known abbreviations */
        for (var i = 0; i < ABBR_WORDS.length; i++) {
            var re = new RegExp('\\b' + ABBR_WORDS[i] + '\\.', 'g');
            var m;
            while ((m = re.exec(s)) !== null) {
                var key = '\x00A' + ph.length + '\x00';
                ph.push(m[0]);
                s = s.substring(0, m.index) + key + s.substring(m.index + m[0].length);
                re.lastIndex = m.index + key.length;
            }
        }
        /* protect initials: J. K. */
        s = s.replace(/\b([A-Z])\./g, function(m) {
            var key = '\x00I' + ph.length + '\x00';
            ph.push(m);
            return key;
        });
        /* protect decimals: 3.14 */
        s = s.replace(/(\d)\.(\d)/g, function(m) {
            var key = '\x00N' + ph.length + '\x00';
            ph.push(m);
            return key;
        });
        /* protect ellipsis … */
        s = s.replace(/\.\.\./g, function(m) {
            var key = '\x00E' + ph.length + '\x00';
            ph.push(m);
            return key;
        });

        /* split on sentence-ending punctuation followed by space + uppercase */
        var raw = s.split(/([.!?])\s+(?=[A-Z])/);

        var result = [];
        var buf = '';
        for (var i = 0; i < raw.length; i++) {
            var p = raw[i];
            if (p === '.' || p === '!' || p === '?') {
                buf += p;
            } else {
                if (buf.length > 0) result.push(buf);
                buf = p;
            }
        }
        if (buf.length > 0) result.push(buf);

        /* restore placeholders */
        for (var i = 0; i < result.length; i++) {
            for (var j = 0; j < ph.length; j++) {
                var tag = '\x00[AINE]' + j + '\x00';
                result[i] = result[i].replace('\x00A' + j + '\x00', ph[j]);
                result[i] = result[i].replace('\x00I' + j + '\x00', ph[j]);
                result[i] = result[i].replace('\x00N' + j + '\x00', ph[j]);
                result[i] = result[i].replace('\x00E' + j + '\x00', ph[j]);
            }
        }

        return result;
    }

    /* ===== STEP 2: SPLIT SENTENCES ===== */
    function splitSentences(text) {
        var lines = text.split('\n');
        var result = [];
        var inCodeBlock = false;
        var prevEmpty = false;

        for (var li = 0; li < lines.length; li++) {
            var trimmed = lines[li].trim();
            if (/^```/.test(trimmed)) { inCodeBlock = !inCodeBlock; prevEmpty = false; continue; }
            if (inCodeBlock) { prevEmpty = false; continue; }
            if (trimmed.length === 0) { prevEmpty = true; continue; }
            if (/^#{1,6}\s/.test(trimmed) && trimmed.length < 200) { result.push(trimmed); prevEmpty = false; continue; }
            if ((/^[-*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) && trimmed.length < 200) { result.push(trimmed); prevEmpty = false; continue; }

            if (prevEmpty && result.length > 0) {
                var lastIdx = result.length - 1;
                if (/[.!?]\s*$/.test(result[lastIdx])) result[lastIdx] += ' [PB]';
            }
            prevEmpty = false;

            var subSents = segmentLine(trimmed);
            for (var si = 0; si < subSents.length; si++) {
                var s = subSents[si].trim();
                if (s.length > 0) result.push(s);
            }
        }
        return result;
    }

    /* ===== SPLIT PARAGRAPHS ===== */
    function splitParagraphs(text) {
        var blocks = text.split(/\n\s*\n/);
        var result = [];
        for (var i = 0; i < blocks.length; i++) {
            var trimmed = blocks[i].trim();
            if (trimmed.length > 0) result.push(trimmed);
        }
        return result;
    }

    /* ===== NORMALIZE ===== */
    function normalizeId(s) {
        return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    /* ===== IS HEADING ===== */
    function isHeading(s) {
        var t = s.trim();
        if (/^#{1,6}\s/.test(t)) return true;
        if (/[.!?]$/.test(t)) return false;
        var words = t.split(/\s+/);
        return words.length >= 1 && words.length <= 6;
    }

    /* ===== IS PLACEHOLDER ===== */
    function isPlaceholder(s) {
        for (var i = 0; i < PLACEHOLDER_PATTERNS.length; i++) {
            if (PLACEHOLDER_PATTERNS[i].test(s.trim())) return true;
        }
        var words = s.toLowerCase().match(/[a-z']+/g) || [];
        if (words.length <= 2 && isHeading(s)) return true;
        var toolNames = ['image compressor', 'pdf compressor', 'word counter',
            'qr code', 'password generator', 'markdown editor',
            'duplicate line', 'readability checker', 'text cleaner', 'case converter'];
        var lower = s.toLowerCase();
        for (var i = 0; i < toolNames.length; i++) {
            if (lower.indexOf(toolNames[i]) !== -1 && words.length < 8) return true;
        }
        return false;
    }

    /* ===== STEP 3: REMOVE DUPLICATES ===== */
    function removeDuplicates(sentences) {
        var seen = {};
        var unique = [];
        var dupCount = 0;
        var headingSeen = {};
        for (var i = 0; i < sentences.length; i++) {
            var norm = normalizeId(sentences[i]);
            if (norm.length === 0) { dupCount++; continue; }
            if (isHeading(sentences[i])) {
                var hkey = norm.replace(/[^a-z0-9]/g, '');
                if (headingSeen[hkey]) { dupCount++; continue; }
                headingSeen[hkey] = true;
            }
            if (!seen[norm]) {
                seen[norm] = true;
                unique.push({ text: sentences[i], originalIndex: i });
            } else {
                dupCount++;
            }
        }
        return { unique: unique, dupCount: dupCount };
    }

    /* ===== STEP 4: FILTER PLACEHOLDERS ===== */
    function filterPlaceholders(sentences) {
        var filtered = [];
        var removed = 0;
        for (var i = 0; i < sentences.length; i++) {
            if (!isPlaceholder(sentences[i].text)) {
                filtered.push(sentences[i]);
            } else {
                removed++;
            }
        }
        return { filtered: filtered, removedCount: removed };
    }

    /* ===== WORD FREQUENCY (TF-IDF style) ===== */
    function getWordFrequency(text) {
        var words = text.toLowerCase().match(/[a-z']+/g) || [];
        var freq = {};
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (w.length > 2 && !STOP_WORDS[w]) freq[w] = (freq[w] || 0) + 1;
        }
        var maxFreq = 1;
        for (var k in freq) if (freq[k] > maxFreq) maxFreq = freq[k];
        for (var k in freq) freq[k] = freq[k] / maxFreq;
        return freq;
    }

    /* ===== TF-IDF SCORE FOR A SENTENCE ===== */
    function tfidfScore(sentence, wordFreq, totalSentences, sentenceFreq) {
        var words = sentence.toLowerCase().match(/[a-z']+/g) || [];
        var score = 0;
        var counted = {};
        for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (w.length <= 2 || STOP_WORDS[w] || counted[w]) continue;
            counted[w] = true;
            var tf = wordFreq[w] || 0;
            var sf = sentenceFreq[w] || 1;
            var idf = Math.log(totalSentences / sf) + 1;
            score += tf * idf;
        }
        return words.length > 0 ? score / words.length : 0;
    }

    /* ===== SENTENCE FREQUENCY ===== */
    function getSentenceFrequency(sentences) {
        var sf = {};
        for (var i = 0; i < sentences.length; i++) {
            var words = sentences[i].toLowerCase().match(/[a-z']+/g) || [];
            var seen = {};
            for (var j = 0; j < words.length; j++) {
                var w = words[j];
                if (w.length > 2 && !STOP_WORDS[w] && !seen[w]) {
                    sf[w] = (sf[w] || 0) + 1;
                    seen[w] = true;
                }
            }
        }
        return sf;
    }

    /* ===== TOPIC DIVERSITY ===== */
    function getTopicWords(sentence) {
        var words = sentence.toLowerCase().match(/[a-z']+/g) || [];
        var topics = {};
        for (var i = 0; i < words.length; i++) {
            if (TOPIC_WORDS[words[i]]) topics[words[i]] = true;
        }
        return Object.keys(topics);
    }

    function wordOverlap(a, b) {
        var wordsA = a.toLowerCase().match(/[a-z']+/g) || [];
        var wordsB = b.toLowerCase().match(/[a-z']+/g) || [];
        if (wordsA.length === 0 || wordsB.length === 0) return 0;
        var setB = {};
        for (var i = 0; i < wordsB.length; i++) setB[wordsB[i]] = true;
        var common = 0;
        for (var i = 0; i < wordsA.length; i++) if (setB[wordsA[i]]) common++;
        return common / Math.min(wordsA.length, wordsB.length);
    }

    /* ===== STEP 5: SCORE PARAGRAPHS ===== */
    function scoreParagraph(paraText, paraIdx, totalParas, wordFreq) {
        var sentences = splitSentences(paraText);
        if (sentences.length === 0) return 0;

        var wordCount = 0;
        var contentWords = 0;
        var topicHits = 0;
        var allWords = paraText.toLowerCase().match(/[a-z']+/g) || [];

        for (var i = 0; i < allWords.length; i++) {
            var w = allWords[i];
            if (w.length > 2 && !STOP_WORDS[w]) {
                contentWords++;
                if (wordFreq[w]) topicHits++;
            }
        }
        wordCount = allWords.length;

        var lengthScore = Math.min(1, sentences.length / 8);
        var keywordDensity = wordCount > 0 ? topicHits / wordCount : 0;
        var positionScore = 1.0 - (paraIdx / totalParas) * 0.6;

        return lengthScore * 0.30 + keywordDensity * 0.35 + positionScore * 0.35;
    }

    /* ===== STEP 6: SCORE SENTENCES ===== */
    function scoreSentence(sentObj, allSentences, wordFreq, sentenceFreq, paraScore, paraIdx, totalUnique) {
        var text = sentObj.text;
        var idx = sentObj.originalIndex;
        var words = text.toLowerCase().match(/[a-z']+/g) || [];
        if (words.length === 0) return -1;

        var tfidf = tfidfScore(text, wordFreq, allSentences.length, sentenceFreq);

        var posScore = 1.0 - (idx / totalUnique) * 0.5;
        if (idx === 0) posScore = 1.0;
        else if (idx === totalUnique - 1) posScore = 0.7;
        else if (idx < totalUnique * 0.15) posScore = 0.85;
        else if (idx > totalUnique * 0.85) posScore = 0.6;

        var wlen = words.length;
        var qualityScore = 0;
        if (wlen >= 10 && wlen <= 35) qualityScore = 1.0;
        else if (wlen >= 6 && wlen < 10) qualityScore = 0.7;
        else if (wlen > 35 && wlen <= 50) qualityScore = 0.6;
        else if (wlen >= 4 && wlen < 6) qualityScore = 0.4;
        else if (wlen < 4) qualityScore = 0.1;
        else qualityScore = 0.3;

        var topicBonus = 0;
        var topicWords = getTopicWords(text);
        topicBonus = Math.min(0.3, topicWords.length * 0.05);

        for (var i = 0; i < TOPIC_PATTERNS.length; i++) {
            if (TOPIC_PATTERNS[i].test(text)) { topicBonus += 0.08; break; }
        }

        var dataBonus = /\d+/.test(text) ? 0.06 : 0;

        return tfidf * 0.35 + posScore * 0.20 + paraScore * 0.15 + qualityScore * 0.10 + topicBonus * 0.10 + dataBonus;
    }

    /* ===== ASSIGN SENTENCES TO PARAGRAPHS ===== */
    function assignParagraphs(allSentences, paragraphs) {
        var flat = [];
        for (var p = 0; p < paragraphs.length; p++) {
            var sents = splitSentences(paragraphs[p]);
            for (var s = 0; s < sents.length; s++) {
                flat.push({ paraIdx: p, text: sents[s] });
            }
        }
        var assignments = [];
        for (var i = 0; i < allSentences.length; i++) {
            var found = false;
            for (var f = 0; f < flat.length && !found; f++) {
                if (normalizeId(flat[f].text) === normalizeId(allSentences[i].text)) {
                    assignments.push(flat[f].paraIdx);
                    found = true;
                }
            }
            if (!found) assignments.push(0);
        }
        return assignments;
    }

    /* ===== DIVERSITY PENALTY (MMR-style) ===== */
    function diversityPenalty(candidate, selected) {
        if (selected.length === 0) return 0;

        var maxOverlap = 0;
        var maxPosPenalty = 0;
        for (var i = 0; i < selected.length; i++) {
            var ov = wordOverlap(candidate.text, selected[i].text);
            if (ov > maxOverlap) maxOverlap = ov;

            var gap = Math.abs(candidate.originalIndex - selected[i].originalIndex);
            if (gap <= 8) {
                var pp = Math.max(0, 0.35 - gap * 0.04);
                if (pp > maxPosPenalty) maxPosPenalty = pp;
            }
        }

        var wordPenalty = maxOverlap > 0.6 ? 0.8 : (maxOverlap > 0.4 ? 0.4 : (maxOverlap > 0.25 ? 0.15 : 0));

        return wordPenalty * 0.6 + maxPosPenalty * 1.0;
    }

    /* ===== GREEDY DIVERSITY SELECTION ===== */
    function greedySelect(scored, targetSentences, targetWords) {
        var selected = [];
        var pool = scored.slice(0);
        var seenNorms = {};
        var minSentences = Math.max(1, Math.floor(targetSentences * 0.8));

        for (var round = 0; round < pool.length; round++) {
            if (pool.length === 0) break;
            if (selected.length >= targetSentences) {
                var wc = 0;
                for (var si = 0; si < selected.length; si++) wc += selected[si].text.split(/\s+/).length;
                if (wc >= targetWords * 0.85) break;
                if (selected.length >= targetSentences + 3) break;
            }

            var bestIdx = -1;
            var bestScore = -Infinity;

            for (var i = 0; i < pool.length; i++) {
                var divPenalty = diversityPenalty(pool[i], selected);
                var adjusted = pool[i].score - divPenalty;
                if (adjusted > bestScore) {
                    bestScore = adjusted;
                    bestIdx = i;
                }
            }

            if (bestIdx === -1) break;

            var best = pool[bestIdx];
            var norm = normalizeId(best.text);
            if (!seenNorms[norm]) {
                seenNorms[norm] = true;
                selected.push(best);
            }
            pool.splice(bestIdx, 1);

            var currentWords = 0;
            for (var si = 0; si < selected.length; si++) {
                currentWords += selected[si].text.split(/\s+/).length;
            }
            if (currentWords >= targetWords * 0.85 && selected.length >= minSentences) break;
        }

        return selected;
    }



    /* ===== STEP 8: RESTORE ORDER ===== */
    function sortByPosition(sentences) {
        return sentences.slice(0).sort(function(a, b) {
            return a.originalIndex - b.originalIndex;
        });
    }

    /* ===== FINAL VALIDATION ===== */
    function finalValidation(selected) {
        var seen = {};
        var validated = [];
        for (var i = 0; i < selected.length; i++) {
            var norm = normalizeId(selected[i].text);
            if (norm.length === 0) continue;
            if (seen[norm]) continue;
            if (isPlaceholder(selected[i].text)) continue;
            seen[norm] = true;
            validated.push(selected[i]);
        }
        return validated;
    }

    /* ===== MERGE TO SUMMARY TEXT ===== */
    function buildSummary(selected) {
        if (selected.length === 0) return '';
        var lines = [];
        for (var i = 0; i < selected.length; i++) {
            if (i > 0 && selected[i].originalIndex - selected[i - 1].originalIndex <= 1) {
                lines[lines.length - 1] += ' ' + selected[i].text;
            } else {
                if (lines.length > 0) lines.push('');
                lines.push(selected[i].text);
            }
        }
        return lines.join('\n');
    }

    /* ===== READING TIME ===== */
    function readingTime(words) {
        var mins = Math.ceil(words / 200);
        return mins < 1 ? '<1 min' : mins + ' min';
    }

    /* ===== PROGRESS ===== */
    function showProgress(phase, pct) {
        if (progressSection) progressSection.classList.add('show');
        if (progressPhase) progressPhase.textContent = phase;
        if (progressFill) progressFill.style.width = pct + '%';
    }

    function hideProgress() {
        if (progressSection) progressSection.classList.remove('show');
        if (progressFill) progressFill.style.width = '0';
    }

    function setStatus(type, text) {
        if (!statusBadge) return;
        statusBadge.className = 'status-badge ' + type;
        statusBadge.textContent = text;
    }

    function clearStats() {
        for (var k in statEls) { if (statEls[k]) statEls[k].textContent = ''; }
        if (resultWordsBadge) resultWordsBadge.innerHTML = '';
        if (resultReadTime) resultReadTime.innerHTML = '';
        var iw = document.getElementById('summary-words-inline');
        var ir = document.getElementById('summary-readtime-inline');
        if (iw) iw.textContent = '';
        if (ir) ir.textContent = '';
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /* ===== MAIN SUMMARIZE ===== */
    function summarizeText() {
        try {
            var text = textInput.value;
            if (!text || !text.trim()) {
                showNotification('Please enter some text to summarize', true);
                return;
            }

            setStatus('processing', 'Processing...');
            showProgress('Normalizing text...', 5);
            summarizeBtn.disabled = true;

            setTimeout(function() {
                try {
                    /* STEP 1: Normalize */
                    var rawText = normalizeText(text);
                    var originalWordCount = rawText.split(/\s+/).filter(function(w) { return w.length > 0; }).length;

                    if (originalWordCount < 20) {
                        clearStats();
                        showEmptyState('The text is too short to summarize effectively.', rawText);
                        resetBtnState();
                        return;
                    }

                    /* STEP 2: Split sentences */
                    showProgress('Splitting into sentences...', 12);
                    var allSentences = splitSentences(rawText);
                    if (allSentences.length < 3) {
                        clearStats();
                        showEmptyState('The text is too short to summarize effectively.', rawText);
                        resetBtnState();
                        return;
                    }

                    /* STEP 3: Remove duplicates */
                    showProgress('Removing duplicates...', 22);
                    var dedupResult = removeDuplicates(allSentences);
                    var uniqueSents = dedupResult.unique;
                    var dupCount = dedupResult.dupCount;

                    if (uniqueSents.length < 2) {
                        clearStats();
                        showEmptyState('Not enough unique content to summarize.', rawText);
                        resetBtnState();
                        return;
                    }

                    /* STEP 4: Filter placeholders */
                    showProgress('Filtering placeholders...', 32);
                    var filterResult = filterPlaceholders(uniqueSents);
                    var candidates = filterResult.filtered;
                    var placeholderCount = filterResult.removedCount;

                    if (candidates.length < 2) {
                        clearStats();
                        showEmptyState('Not enough meaningful content remains to summarize.', rawText);
                        resetBtnState();
                        return;
                    }

                    /* Prepare scoring data */
                    showProgress('Calculating word frequencies...', 40);
                    var wordFreq = getWordFrequency(rawText);
                    var sentenceFreq = getSentenceFrequency(allSentences);
                    var paragraphs = splitParagraphs(rawText);

                    /* STEP 5: Score paragraphs */
                    showProgress('Scoring paragraphs...', 50);
                    var paraScores = [];
                    for (var p = 0; p < paragraphs.length; p++) {
                        paraScores.push(scoreParagraph(paragraphs[p], p, paragraphs.length, wordFreq));
                    }

                    /* Assign each sentence to its paragraph */
                    var sentToPara = assignParagraphs(candidates, paragraphs);

                    /* STEP 6: Score sentences — include ALL candidates, rank by score */
                    showProgress('Scoring sentences...', 60);
                    var scored = [];
                    for (var i = 0; i < candidates.length; i++) {
                        var paraIdx = sentToPara[i] !== undefined ? sentToPara[i] : 0;
                        var pScore = paraScores[paraIdx] !== undefined ? paraScores[paraIdx] : 0.5;
                        var score = scoreSentence(
                            candidates[i], allSentences, wordFreq, sentenceFreq,
                            pScore, paraIdx, candidates.length
                        );
                        scored.push({
                            text: candidates[i].text,
                            originalIndex: candidates[i].originalIndex,
                            score: score,
                            paraIdx: paraIdx,
                            paraScore: pScore
                        });
                    }

                    scored.sort(function(a, b) { return b.score - a.score; });

                    /* Calculate target: based on candidate count and word count */
                    var ratio = lengthSlider ? parseInt(lengthSlider.value) / 100 : 0.5;
                    var targetSentences = Math.max(1, Math.round(candidates.length * ratio));
                    var targetWords = Math.round(originalWordCount * ratio);

                    /* STEP 7: Greedy diversity-aware selection */
                    showProgress('Selecting sentences...', 70);
                    var selected = greedySelect(scored, targetSentences, targetWords);

                    if (selected.length < 2) {
                        displayFallback(rawText, allSentences, candidates, originalWordCount, dupCount, placeholderCount);
                        return;
                    }

                    /* STEP 8: Restore original order */
                    selected = sortByPosition(selected);

                    /* STEP 9: Final validation */
                    showProgress('Validating summary...', 80);
                    selected = finalValidation(selected);

                    if (selected.length < 2) {
                        displayFallback(rawText, allSentences, candidates, originalWordCount, dupCount, placeholderCount);
                        return;
                    }

                    /* Build final summary */
                    showProgress('Building summary...', 80);
                    var summary = buildSummary(selected);
                    lastResult = summary;

                    var summaryWordCount = summary.split(/\s+/).filter(function(w) { return w.length > 0; }).length;
                    if (summaryWordCount === 0) {
                        displayFallback(rawText, allSentences, candidates, originalWordCount, dupCount, placeholderCount);
                        return;
                    }

                    /* Highlighting */
                    showProgress('Highlighting selected sentences...', 90);
                    var selectedNorm = {};
                    for (var si = 0; si < selected.length; si++) {
                        selectedNorm[normalizeId(selected[si].text)] = true;
                    }
                    var hlHtml = '';
                    for (var hi = 0; hi < allSentences.length; hi++) {
                        var ns = normalizeId(allSentences[hi]);
                        var esc = escapeHtml(allSentences[hi]);
                        hlHtml += '<span class="' + (selectedNorm[ns] ? 'highlight-sentence' : 'normal-sentence') + '">' + esc + '</span>\n';
                    }
                    if (originalHighlight) {
                        originalHighlight.innerHTML = hlHtml;
                        var origCard = document.getElementById('original-text-card');
                        if (origCard) origCard.style.display = 'block';
                    }

                    /* Calculate stats from final rendered summary */
                    var reduction = originalWordCount > 0 ? ((1 - summaryWordCount / originalWordCount) * 100).toFixed(1) : '0';
                    var compressionRatio = originalWordCount > 0 && summaryWordCount > 0 ? (originalWordCount / summaryWordCount).toFixed(1) : '1.0';
                    var summReadTime = readingTime(summaryWordCount);
                    var savedMinutes = originalWordCount > 0 ? Math.max(0, Math.ceil((originalWordCount - summaryWordCount) / 200)) : 0;
                    var pctActual = originalWordCount > 0 ? ((summaryWordCount / originalWordCount) * 100).toFixed(1) : '0';

                    showProgress('Done!', 100);

                    if (resultHeading) resultHeading.textContent = '\u2713 Summary Generated Successfully';
                    if (resultSub) {
                        var parts = [selected.length + ' sentences selected'];
                        if (dupCount > 0) parts.push(dupCount + ' duplicates removed');
                        if (placeholderCount > 0) parts.push(placeholderCount + ' placeholders filtered');
                        resultSub.textContent = parts.join(' \u00B7 ');
                    }

                    if (resultWordsBadge) {
                        resultWordsBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg> ' + summaryWordCount.toLocaleString() + ' words';
                    }
                    if (resultReadTime) {
                        resultReadTime.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + summReadTime;
                    }

                    var iw = document.getElementById('summary-words-inline');
                    var ir = document.getElementById('summary-readtime-inline');
                    if (iw) iw.textContent = summaryWordCount.toLocaleString() + ' words';
                    if (ir) ir.textContent = summReadTime;

                    if (statEls.originalWords) statEls.originalWords.textContent = originalWordCount.toLocaleString();
                    if (statEls.summaryWords) statEls.summaryWords.textContent = summaryWordCount.toLocaleString();
                    if (statEls.reduction) statEls.reduction.textContent = Math.max(0, reduction) + '%';
                    if (statEls.originalSentences) statEls.originalSentences.textContent = allSentences.length.toLocaleString();
                    if (statEls.summarySentences) statEls.summarySentences.textContent = selected.length.toLocaleString();
                    if (statEls.compressionRatio) statEls.compressionRatio.textContent = compressionRatio + ':1';
                    if (statEls.readingTimeSaved) statEls.readingTimeSaved.textContent = savedMinutes > 0 ? savedMinutes + ' min' : '<1 min';
                    if (statEls.estReadingTime) statEls.estReadingTime.textContent = summReadTime;
                    if (statEls.summaryPercentage) statEls.summaryPercentage.textContent = pctActual + '%';
                    if (statEls.summaryMethod) statEls.summaryMethod.textContent = 'Paragraph-Aware Diversity Ranking';

                    if (resultText) resultText.textContent = summary;

                    resultArea.style.display = 'block';
                    if (actionBar) actionBar.style.display = 'none';

                    setTimeout(function() { hideProgress(); setStatus('done', 'Done'); resetBtnState(); }, 300);

                } catch (e) { console.error('Error:', e); finalizeError(); }
            }, 100);

        } catch (e) { console.error('Error:', e); finalizeError(); }
    }

    /* ===== FALLBACK ===== */
    function displayFallback(rawText, allSentences, candidates, originalWordCount, dupCount, placeholderCount) {
        var summary = candidates.map(function(c) { return c.text; }).join('\n\n');
        lastResult = summary;
        var summaryWordCount = summary.split(/\s+/).filter(function(w) { return w.length > 0; }).length;

        if (summaryWordCount === 0 || candidates.length === 0) {
            clearStats();
            showEmptyState('Nothing to summarize. The text is too short or contains only placeholders.', rawText);
            resetBtnState();
            return;
        }

        var selectedNorm = {};
        for (var si = 0; si < candidates.length; si++) selectedNorm[normalizeId(candidates[si].text)] = true;
        var hlHtml = '';
        for (var hi = 0; hi < allSentences.length; hi++) {
            var ns = normalizeId(allSentences[hi]);
            var esc = escapeHtml(allSentences[hi]);
            hlHtml += '<span class="' + (selectedNorm[ns] ? 'highlight-sentence' : 'normal-sentence') + '">' + esc + '</span>\n';
        }
        if (originalHighlight) {
            originalHighlight.innerHTML = hlHtml;
            var oc = document.getElementById('original-text-card');
            if (oc) oc.style.display = 'block';
        }

        var reduction = originalWordCount > 0 ? ((1 - summaryWordCount / originalWordCount) * 100).toFixed(1) : '0';
        var compressionRatio = originalWordCount > 0 && summaryWordCount > 0 ? (originalWordCount / summaryWordCount).toFixed(1) : '1.0';
        var summReadTime = readingTime(summaryWordCount);
        var savedMinutes = originalWordCount > 0 ? Math.max(0, Math.ceil((originalWordCount - summaryWordCount) / 200)) : 0;
        var pctActual = originalWordCount > 0 ? ((summaryWordCount / originalWordCount) * 100).toFixed(1) : '0';

        showProgress('Done!', 100);
        if (resultHeading) resultHeading.textContent = '\u2713 Summary Generated Successfully';
        if (resultSub) {
            var parts = [candidates.length + ' sentences included'];
            if (dupCount > 0) parts.push(dupCount + ' duplicates removed');
            if (placeholderCount > 0) parts.push(placeholderCount + ' placeholders filtered');
            resultSub.textContent = parts.join(' \u00B7 ');
        }
        if (resultWordsBadge) resultWordsBadge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg> ' + summaryWordCount.toLocaleString() + ' words';
        if (resultReadTime) resultReadTime.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + summReadTime;
        var iw = document.getElementById('summary-words-inline');
        var ir = document.getElementById('summary-readtime-inline');
        if (iw) iw.textContent = summaryWordCount.toLocaleString() + ' words';
        if (ir) ir.textContent = summReadTime;
        if (statEls.originalWords) statEls.originalWords.textContent = originalWordCount.toLocaleString();
        if (statEls.summaryWords) statEls.summaryWords.textContent = summaryWordCount.toLocaleString();
        if (statEls.reduction) statEls.reduction.textContent = Math.max(0, reduction) + '%';
        if (statEls.originalSentences) statEls.originalSentences.textContent = allSentences.length.toLocaleString();
        if (statEls.summarySentences) statEls.summarySentences.textContent = candidates.length.toLocaleString();
        if (statEls.compressionRatio) statEls.compressionRatio.textContent = compressionRatio + ':1';
        if (statEls.readingTimeSaved) statEls.readingTimeSaved.textContent = savedMinutes > 0 ? savedMinutes + ' min' : '<1 min';
        if (statEls.estReadingTime) statEls.estReadingTime.textContent = summReadTime;
        if (statEls.summaryPercentage) statEls.summaryPercentage.textContent = pctActual + '%';
        if (statEls.summaryMethod) statEls.summaryMethod.textContent = 'Paragraph-Aware Diversity Ranking';
        if (resultText) resultText.textContent = summary;
        resultArea.style.display = 'block';
        if (actionBar) actionBar.style.display = 'none';
        setTimeout(function() { hideProgress(); setStatus('done', 'Done'); resetBtnState(); }, 300);
    }

    /* ===== ERROR ===== */
    function finalizeError() {
        clearStats();
        if (resultHeading) resultHeading.textContent = '\u2713 Nothing to Summarize';
        if (resultSub) resultSub.textContent = 'An error occurred during summarization.';
        if (resultText) resultText.textContent = '';
        if (originalHighlight) originalHighlight.innerHTML = '';
        var oc = document.getElementById('original-text-card');
        if (oc) oc.style.display = 'none';
        resultArea.style.display = 'block';
        if (actionBar) actionBar.style.display = 'none';
        setStatus('done', 'Done');
        hideProgress();
        resetBtnState();
    }

    function showEmptyState(msg, originalText) {
        if (resultHeading) resultHeading.textContent = '\u2713 Text Already Concise';
        if (resultSub) resultSub.textContent = msg;
        if (resultText) resultText.textContent = originalText || '';
        if (originalHighlight) originalHighlight.innerHTML = '';
        var oc = document.getElementById('original-text-card');
        if (oc) oc.style.display = 'none';
        if (resultWordsBadge) resultWordsBadge.innerHTML = '';
        if (resultReadTime) resultReadTime.innerHTML = '';
        var iw = document.getElementById('summary-words-inline');
        var ir = document.getElementById('summary-readtime-inline');
        if (iw) iw.textContent = '';
        if (ir) ir.textContent = '';
        resultArea.style.display = 'block';
        if (actionBar) actionBar.style.display = 'none';
        setStatus('done', 'Done');
        hideProgress();
        resetBtnState();
    }

    function resetBtnState() { summarizeBtn.disabled = false; }

    function showNotification(msg, isError) {
        var toast = document.createElement('div');
        toast.className = 'toast ' + (isError ? 'error' : 'info');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.classList.add('show'); }, 10);
        setTimeout(function() {
            toast.classList.remove('show');
            setTimeout(function() { document.body.removeChild(toast); }, 300);
        }, 3000);
    }

    function copyResult() {
        var t = resultText.textContent || lastResult;
        if (!t) return;
        try { navigator.clipboard.writeText(t).then(function() { showCopyFeedback(true); }).catch(function() { fallbackCopy(t); }); }
        catch (e) { fallbackCopy(t); }
    }

    function fallbackCopy(t) {
        var ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); showCopyFeedback(true); } catch (e) { showCopyFeedback(false); }
        document.body.removeChild(ta);
    }

    function showCopyFeedback(ok) {
        if (!copyBtn) return;
        if (ok) {
            copyBtn.textContent = '\u2713 Copied to clipboard';
            setTimeout(function() { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Result'; }, 2000);
        } else {
            copyBtn.textContent = 'Failed';
            setTimeout(function() { copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Result'; }, 2000);
        }
    }

    function downloadTxt() {
        var t = resultText.textContent || lastResult;
        if (!t) return;
        var blob = new Blob([t], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'summary.txt';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function resetTool() {
        textInput.value = ''; lastResult = ''; resultArea.style.display = 'none';
        resultText.textContent = ''; if (originalHighlight) originalHighlight.innerHTML = '';
        var oc = document.getElementById('original-text-card');
        if (oc) oc.style.display = 'none';
        if (actionBar) actionBar.style.display = 'grid';
        if (lengthSlider) { lengthSlider.value = 50; if (lengthValue) lengthValue.textContent = '50%'; }
        hideProgress(); setStatus('ready', 'Ready'); clearStats();
        textInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    summarizeBtn.addEventListener('click', summarizeText);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadTxt);
    if (lengthSlider) {
        lengthSlider.addEventListener('input', function() {
            lengthValue.textContent = lengthSlider.value + '%';
        });
    }
});
