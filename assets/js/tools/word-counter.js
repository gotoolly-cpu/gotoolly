document.addEventListener('DOMContentLoaded', function() {
    var textInput = document.getElementById('text-input');
    var resetBtn = document.getElementById('reset-btn');
    var copyStatsBtn = document.getElementById('copy-stats-btn');
    var charCountBadge = document.getElementById('char-count-badge');
    var statsPlaceholder = document.getElementById('stats-placeholder');
    var statsCard = document.getElementById('stats-card');
    var wordCount = document.getElementById('word-count');
    var charCount = document.getElementById('char-count');
    var charNoSpace = document.getElementById('char-no-space');
    var sentenceCount = document.getElementById('sentence-count');
    var paragraphCount = document.getElementById('paragraph-count');
    var readingTime = document.getElementById('reading-time');
    var readingTimeSection = document.getElementById('reading-time-section');
    var readingTimeDetail = document.getElementById('reading-time-detail');

    var stopWords = new Set('a,about,above,after,again,against,all,am,an,and,any,are,arent,as,at,be,because,been,before,being,below,between,both,but,by,cant,cannot,could,couldnt,did,didnt,do,does,doesnt,doing,dont,down,during,each,few,for,from,further,had,hadt,has,hasnt,have,havent,having,he,hed,hell,hes,her,here,heres,hers,herself,him,himself,his,how,hows,i,id,ill,im,ive,if,in,into,is,isnt,it,its,its,itself,lets,me,more,most,mustnt,my,myself,no,nor,not,of,off,on,once,only,or,other,ought,our,ours,ourselves,out,over,own,same,shant,she,shed,shell,shes,should,shouldnt,so,some,such,than,that,thats,the,their,theirs,them,themselves,then,there,theres,these,they,theyd,theyll,theyre,theyve,this,those,through,to,too,under,until,up,very,was,wasnt,we,wed,well,were,weve,were,werent,what,whats,when,whens,where,wheres,which,while,who,whos,whom,why,whys,with,wont,would,wouldnt,you,youd,youll,youre,youve,your,yours,yourself,yourselves'.split(','));

    function isValidWord(str) {
        return str.length > 0 && /[\p{L}]/u.test(str);
    }

    function normalizeWord(word) {
        return word.replace(/^[\p{P}\p{S}\p{Z}]+|[\p{P}\p{S}\p{Z}]+$/gu, '');
    }

    function showNotification(message, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }

    function debounce(func, delay) {
        var timeoutId;
        return function() {
            var args = arguments;
            var ctx = this;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() { func.apply(ctx, args); }, delay);
        };
    }

    function countSyllables(word) {
        word = word.toLowerCase().replace(/[^a-z]/g, '');
        if (word.length <= 3) return 1;
        var vowels = 'aeiouy';
        var count = 0;
        var prevVowel = false;
        for (var i = 0; i < word.length; i++) {
            var isVowel = vowels.indexOf(word[i]) !== -1;
            if (isVowel && !prevVowel) count++;
            prevVowel = isVowel;
        }
        if (word.endsWith('e')) count--;
        if (word.endsWith('le') && word.length > 2 && 'aeiouy'.indexOf(word[word.length-3]) === -1) count++;
        if (count === 0) count = 1;
        return count;
    }

    function getFleschEase(totalWords, totalSentences, totalSyllables) {
        if (totalWords === 0 || totalSentences === 0) return 0;
        return 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
    }

    function getFleschGrade(totalWords, totalSentences, totalSyllables) {
        if (totalWords === 0 || totalSentences === 0) return 0;
        return 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
    }

    function getReadabilityLevel(flesch) {
        if (flesch >= 90) return 'Very Easy (5th Grade)';
        if (flesch >= 80) return 'Easy (6th Grade)';
        if (flesch >= 70) return 'Fairly Easy (7th Grade)';
        if (flesch >= 60) return 'Standard (8th-9th Grade)';
        if (flesch >= 50) return 'Fairly Difficult (10th-12th Grade)';
        if (flesch >= 30) return 'Difficult (College)';
        return 'Very Difficult (College Graduate)';
    }

    function getDifficultyLabel(flesch) {
        if (flesch >= 70) return 'easy';
        if (flesch >= 50) return 'medium';
        return 'hard';
    }

    function getDifficultyText(flesch) {
        if (flesch >= 70) return 'Easy to read';
        if (flesch >= 50) return 'Fairly difficult to read';
        return 'Difficult to read';
    }

    function getVocabLabel(score) {
        if (score >= 12) return 'Excellent';
        if (score >= 8) return 'Rich Vocabulary';
        if (score >= 5) return 'Moderate';
        if (score >= 3) return 'Limited';
        return 'Basic';
    }

    function formatTime(totalMinutes) {
        var mins = Math.floor(totalMinutes);
        var secs = Math.round((totalMinutes - mins) * 60);
        if (mins === 0 && secs === 0) return '< 1 sec';
        if (mins === 0) return secs + ' sec';
        if (secs === 0) return mins + ' min';
        return mins + ' min ' + secs + ' sec';
    }

    function getWords(text) {
        return text.trim().split(/\s+/).filter(function(w) { return isValidWord(w); }).map(normalizeWord).filter(function(w) { return w.length > 0; });
    }

    function getSentences(text) {
        return text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
    }

    function getParagraphs(text) {
        var normalized = text.replace(/\r\n?/g, '\n');
        var blocks = normalized.split(/\n[ \t]*\n/);
        var result = [];
        for (var i = 0; i < blocks.length; i++) {
            var trimmed = blocks[i].trim();
            if (trimmed.length > 0) result.push(trimmed);
        }
        return result;
    }

    function updateCounts() {
        var text = textInput.value;
        var hasText = text.trim().length > 0;

        statsPlaceholder.style.display = hasText ? 'none' : 'flex';
        statsCard.classList.toggle('show', hasText);
        copyStatsBtn.disabled = !hasText;

        var words = getWords(text);
        var wordCountValue = words.length;
        var charCountValue = text.length;
        var charNoSpaceValue = text.replace(/\s+/g, '').length;
        var sentences = getSentences(text);
        var sentenceCountValue = sentences.length;
        var paragraphs = getParagraphs(text);
        var paragraphCountValue = paragraphs.length;
        var readingTimeValue = wordCountValue > 0 ? Math.max(1, Math.ceil(wordCountValue / 238)) : 0;

        charCountBadge.textContent = charCountValue.toLocaleString() + ' character' + (charCountValue !== 1 ? 's' : '');
        wordCount.textContent = wordCountValue.toLocaleString();
        charCount.textContent = charCountValue.toLocaleString();
        charNoSpace.textContent = charNoSpaceValue.toLocaleString();
        sentenceCount.textContent = sentenceCountValue.toLocaleString();
        paragraphCount.textContent = paragraphCountValue.toLocaleString();
        readingTime.textContent = readingTimeValue > 0 ? readingTimeValue + ' min' + (readingTimeValue !== 1 ? 's' : '') : '0 min';

        if (wordCountValue > 0) {
            readingTimeSection.classList.add('show');
            var minutes = readingTimeValue;
            var seconds = Math.round(((wordCountValue / 238) % 1) * 60);
            readingTimeDetail.textContent = minutes + ' min ' + seconds + ' sec at 238 words/min';
        } else {
            readingTimeSection.classList.remove('show');
        }

        updateAdvancedStats(text, words, wordCountValue, sentences, sentenceCountValue, charCountValue);
    }

    function updateAdvancedStats(text, words, wordCountValue, sentences, sentenceCountValue, charCountValue) {
        var hasText = text.trim().length > 0;
        var sections = ['wc-analysis', 'wc-readability', 'wc-ai-stats', 'wc-limits', 'wc-keywords', 'wc-export'];

        sections.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.style.display = hasText ? 'block' : 'none';
        });

        updatePlatformLimits(text, charCountValue);

        if (!hasText) return;

        if (wordCountValue === 0) {
            setText('#wc-avg-word', '—'); setText('#wc-avg-sent', '—');
            setText('#wc-unique-words', '—'); setText('#wc-longest-word', '—');
            setText('#wc-shortest-word', '—'); setText('#wc-most-common', '—');
            setText('#wc-lexical-diversity', '—'); setText('#wc-vocab-richness', '—');
            setText('#wc-longest-sent', '—'); setText('#wc-shortest-sent', '—');
            setText('#wc-lex-badge', '—');
            updateKeywordAnalysis([], {});
            return;
        }

        var wordLengths = words.map(function(w) { return w.length; });
        var avgWordLen = wordLengths.reduce(function(a, b) { return a + b; }, 0) / words.length;
        var sortedByLen = words.slice().sort(function(a, b) { return b.length - a.length; });
        var longestWord = sortedByLen[0];

        var filteredShort = words.filter(function(w) { return w.length > 1; });
        var shortestWord = filteredShort.length > 0 ? filteredShort[0] : words[0];
        if (filteredShort.length > 0) {
            shortestWord = filteredShort.reduce(function(min, w) { return w.length < min.length ? w : min; }, filteredShort[0]);
        }

        var uniqueWords = new Set();
        var wordFreq = {};
        words.forEach(function(w) {
            var lower = w.toLowerCase();
            uniqueWords.add(lower);
            wordFreq[lower] = (wordFreq[lower] || 0) + 1;
        });
        var uniqueCount = uniqueWords.size;
        var lexicalDiversity = (uniqueCount / words.length * 100);
        var vocabRichness = (uniqueCount / Math.max(1, Math.sqrt(words.length * 2)));

        var ignoreStopMC = document.getElementById('wc-kw-stop').checked;
        var mostCommonWord = '—';
        var mostCommonCount = 0;
        for (var w in wordFreq) {
            if (ignoreStopMC && stopWords.has(w)) continue;
            if (wordFreq[w] > mostCommonCount) {
                mostCommonCount = wordFreq[w];
                mostCommonWord = w;
            }
        }

        var sentLengths = [];
        var longestSentText = '';
        var shortestSentText = '';
        var longestSentLen = 0;
        var shortestSentLen = Infinity;
        sentences.forEach(function(s) {
            var trimmed = s.trim();
            var sentWords = trimmed.split(/\s+/).filter(function(w) { return isValidWord(w); });
            var len = sentWords.length;
            sentLengths.push(len);
            if (len > longestSentLen) { longestSentLen = len; longestSentText = trimmed; }
            if (len < shortestSentLen) { shortestSentLen = len; shortestSentText = trimmed; }
        });
        var avgSentLen = sentLengths.length > 0 ? sentLengths.reduce(function(a, b) { return a + b; }, 0) / sentLengths.length : 0;

        setText('#wc-avg-word', avgWordLen.toFixed(1));
        setText('#wc-avg-sent', avgSentLen.toFixed(1));
        setText('#wc-unique-words', uniqueCount.toLocaleString());
        setText('#wc-longest-word', longestWord.length > 20 ? longestWord.substring(0, 20) + '\u2026' : longestWord);
        setText('#wc-shortest-word', shortestWord);
        setText('#wc-most-common', mostCommonWord.length > 20 ? mostCommonWord.substring(0, 20) + '\u2026' : mostCommonWord);
        setText('#wc-lexical-diversity', lexicalDiversity.toFixed(1) + '%');
        setText('#wc-longest-sent', longestSentLen + ' words');
        setText('#wc-shortest-sent', shortestSentLen + ' words');
        setText('#wc-lex-badge', lexicalDiversity.toFixed(0) + '% unique');

        var longestSentEl = document.getElementById('wc-longest-sent');
        var shortestSentEl = document.getElementById('wc-shortest-sent');
        var longestPrev = document.getElementById('wc-longest-sent-preview');
        var shortestPrev = document.getElementById('wc-shortest-sent-preview');
        if (longestPrev) { longestPrev.textContent = longestSentText; longestPrev.classList.remove('open'); }
        if (shortestPrev) { shortestPrev.textContent = shortestSentText; shortestPrev.classList.remove('open'); }
        if (longestSentEl) longestSentEl.title = longestSentText;
        if (shortestSentEl) shortestSentEl.title = shortestSentText;

        var vocabLabel = getVocabLabel(vocabRichness);
        setText('#wc-vocab-richness', vocabLabel + ' (' + vocabRichness.toFixed(1) + ')');

        var totalSyllables = words.reduce(function(sum, w) { return sum + countSyllables(w); }, 0);
        var fleschEase = getFleschEase(wordCountValue, sentenceCountValue, totalSyllables);
        var fleschGrade = getFleschGrade(wordCountValue, sentenceCountValue, totalSyllables);
        var readLevel = getReadabilityLevel(fleschEase);
        var difficulty = getDifficultyLabel(fleschEase);
        var difficultyText = getDifficultyText(fleschEase);

        var clampedScore = Math.max(0, Math.min(100, fleschEase));
        var circleEl = document.getElementById('wc-read-circle');
        circleEl.style.background = 'conic-gradient(' + (clampedScore >= 70 ? '#10b981' : clampedScore >= 50 ? '#f59e0b' : '#ef4444') + ' 0deg ' + (clampedScore * 3.6) + 'deg, #e2e8f0 ' + (clampedScore * 3.6) + 'deg 360deg)';

        setText('#wc-read-score', clampedScore.toFixed(0));
        setText('#wc-read-title', 'Flesch Reading Ease: ' + fleschEase.toFixed(1));
        setText('#wc-read-desc', difficultyText + '. ' + readLevel + '.');
        setText('#wc-flesch-ease', fleschEase.toFixed(1));
        setText('#wc-flesch-grade', fleschGrade.toFixed(1));
        setText('#wc-read-level', readLevel);

        var badge = document.getElementById('wc-read-badge');
        badge.className = 'wc-readability-badge ' + difficulty;
        setText('#wc-read-badge', difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Hard');

        var readTimeMins = wordCountValue / 238;
        var speakTimeMins = wordCountValue / 130;
        setText('#wc-reading-time-detail', formatTime(readTimeMins));
        setText('#wc-speaking-time', formatTime(speakTimeMins));

        var openaiTokens = Math.round(wordCountValue * 1.33);
        var claudeTokens = Math.round(wordCountValue * 1.43);
        var geminiTokens = Math.round(wordCountValue * 1.25);
        setText('#wc-openai-tokens', openaiTokens.toLocaleString());
        setText('#wc-claude-tokens', claudeTokens.toLocaleString());
        setText('#wc-gemini-tokens', geminiTokens.toLocaleString());

        updateKeywordAnalysis(words, wordFreq);
    }

    function setText(selector, val) {
        var el = document.querySelector(selector);
        if (el && el.textContent !== val) el.textContent = val;
    }

    var platformLimits = [
        {id:'google-title',name:'Google Title',max:60},
        {id:'google-desc',name:'Google Meta Description',max:160},
        {id:'twitter',name:'X (Twitter)',max:280},
        {id:'sms',name:'SMS',max:160},
        {id:'instagram',name:'Instagram Caption',max:2200},
        {id:'facebook',name:'Facebook Post',max:63206},
        {id:'linkedin',name:'LinkedIn Post',max:3000},
        {id:'youtube',name:'YouTube Description',max:5000},
        {id:'tiktok',name:'TikTok Caption',max:2200}
    ];

    var platformLimitsCreated = false;

    function updatePlatformLimits(text, charCountValue) {
        var body = document.getElementById('wc-limits-body');
        var empty = document.getElementById('wc-limits-empty');
        if (charCountValue === 0) {
            if (empty) empty.style.display = 'flex';
            if (body) {
                var existing = body.querySelectorAll('.wc-progress-group');
                for (var i = 0; i < existing.length; i++) existing[i].style.display = 'none';
            }
            return;
        }
        if (empty) empty.style.display = 'none';

        if (!platformLimitsCreated) {
            platformLimitsCreated = true;
            platformLimits.forEach(function(limit) {
                var group = document.createElement('div');
                group.className = 'wc-progress-group';
                group.id = 'pl-' + limit.id;
                group.innerHTML = '<div class="wc-progress-header"><span class="wc-ph-name">' + limit.name + '</span><span class="wc-ph-count" id="plc-' + limit.id + '">0 / ' + limit.max + ' (0%)</span></div><div class="wc-progress-track"><div class="wc-progress-fill green" id="plf-' + limit.id + '" style="width:0%"></div></div>';
                body.appendChild(group);
            });
        }

        platformLimits.forEach(function(limit) {
            var pct = Math.min(100, (charCountValue / limit.max) * 100);
            var colorClass = pct >= 100 ? 'red' : pct >= 80 ? 'yellow' : 'green';
            var fillEl = document.getElementById('plf-' + limit.id);
            var countEl = document.getElementById('plc-' + limit.id);
            var groupEl = document.getElementById('pl-' + limit.id);
            if (groupEl) groupEl.style.display = '';
            if (fillEl) { fillEl.style.width = Math.min(100, pct) + '%'; fillEl.className = 'wc-progress-fill ' + colorClass; }
            if (countEl) countEl.textContent = charCountValue.toLocaleString() + ' / ' + limit.max + ' (' + Math.round(pct) + '%)';
        });
    }

    function updateKeywordAnalysis(words, wordFreq) {
        var empty = document.getElementById('wc-kw-empty');
        var content = document.getElementById('wc-kw-content');
        var tbody = document.getElementById('wc-kw-body');

        if (words.length === 0) {
            if (empty) empty.style.display = 'flex';
            if (content) content.classList.add('wc-hidden');
            return;
        }
        if (empty) empty.style.display = 'none';
        if (content) content.classList.remove('wc-hidden');

        var ignoreStop = document.getElementById('wc-kw-stop').checked;
        var sortBy = document.getElementById('wc-kw-sort').value;

        var freq = {};
        var totalWords = 0;
        var stopCount = 0;
        words.forEach(function(w) {
            var lower = w.toLowerCase().replace(/[^a-z0-9\p{L}]/gu, '');
            if (!lower || /^[0-9]+$/.test(lower)) return;
            if (ignoreStop && stopWords.has(lower)) { stopCount++; return; }
            freq[lower] = (freq[lower] || 0) + 1;
            totalWords++;
        });

        var summary = document.getElementById('wc-kw-summary');
        if (summary) {
            var uniqueCount = Object.keys(freq).length;
            summary.textContent = uniqueCount + ' keyword' + (uniqueCount !== 1 ? 's' : '') + ' from ' + totalWords + ' word' + (totalWords !== 1 ? 's' : '') + (ignoreStop ? ' (' + stopCount + ' stop word' + (stopCount !== 1 ? 's' : '') + ' filtered)' : '');
        }

        if (totalWords === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px">No keywords found' + (ignoreStop ? ' (all words are stop words)' : '') + '</td></tr>';
            return;
        }

        var entries = Object.keys(freq).map(function(k) { return {word: k, count: freq[k]}; });
        if (sortBy === 'frequency') {
            entries.sort(function(a, b) { return b.count - a.count; });
        } else {
            entries.sort(function(a, b) { return a.word.localeCompare(b.word); });
        }
        var top = entries.slice(0, 20);
        var maxCount = top.length > 0 ? top[0].count : 1;

        var html = '';
        top.forEach(function(e) {
            var pct = (e.count / totalWords * 100);
            var barPct = (e.count / maxCount * 100);
            html += '<tr><td>' + e.word + '</td><td>' + e.count + '</td><td>' + pct.toFixed(1) + '%</td><td><div class="kw-bar"><div class="kw-bar-fill" style="width:' + barPct + '%"></div></div></td></tr>';
        });
        tbody.innerHTML = html;
    }

    function padRight(str, len) {
        str = String(str);
        while (str.length < len) str += ' ';
        return str;
    }

    function csvEscape(val, numeric) {
        if (val === null || val === undefined) return '';
        if (numeric && typeof val === 'number') return String(val);
        var s = String(val);
        if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        if (/^[0-9]+(\.[0-9]+)?$/.test(s) && numeric) return s;
        return '"' + s + '"';
    }

    function generateReport(format) {
        var text = textInput.value;
        var words = getWords(text);
        var wordCountValue = words.length;
        var charCountValue = text.length;
        var charNoSpaceValue = text.replace(/\s+/g, '').length;
        var sentences = getSentences(text);
        var sentenceCountValue = sentences.length;
        var paragraphs = getParagraphs(text);
        var paragraphCountValue = paragraphs.length;
        var readingTimeMins = wordCountValue / 238;
        var speakingTimeMins = wordCountValue / 130;

        var avgWordLen = wordCountValue > 0 ? (words.reduce(function(s, w) { return s + w.length; }, 0) / words.length) : null;
        var avgSentLen = sentenceCountValue > 0 ? (function() {
            var lengths = sentences.map(function(s) { return s.trim().split(/\s+/).filter(function(w) { return isValidWord(w); }).length; });
            return lengths.reduce(function(a, b) { return a + b; }, 0) / lengths.length;
        })() : null;

        var uniqueWords = new Set(); var wordFreq = {};
        words.forEach(function(w) { var l = w.toLowerCase(); uniqueWords.add(l); wordFreq[l] = (wordFreq[l] || 0) + 1; });
        var uniqueCount = uniqueWords.size;
        var lexicalDiversity = wordCountValue > 0 ? (uniqueCount / wordCountValue * 100) : null;
        var vocabRichness = wordCountValue > 0 ? (uniqueCount / Math.max(1, Math.sqrt(wordCountValue * 2))) : null;

        var totalSyllables = words.reduce(function(s, w) { return s + countSyllables(w); }, 0);
        var fleschEaseNum = (wordCountValue > 0 && sentenceCountValue > 0) ? getFleschEase(wordCountValue, sentenceCountValue, totalSyllables) : null;
        var fleschGradeNum = (wordCountValue > 0 && sentenceCountValue > 0) ? getFleschGrade(wordCountValue, sentenceCountValue, totalSyllables) : null;
        var readLevel = fleschEaseNum !== null ? getReadabilityLevel(fleschEaseNum) : null;
        var difficultyText = fleschEaseNum !== null ? getDifficultyText(fleschEaseNum) : null;
        var difficultyLabel = fleschEaseNum !== null ? getDifficultyLabel(fleschEaseNum) : null;

        var openaiTokens = Math.round(wordCountValue * 1.33);
        var claudeTokens = Math.round(wordCountValue * 1.43);
        var geminiTokens = Math.round(wordCountValue * 1.25);

        var sortedByLen = words.slice().sort(function(a,b){return b.length-a.length});
        var longestWord = wordCountValue > 0 ? sortedByLen[0] : null;
        var filteredShort = words.filter(function(w) { return w.length > 1; });
        var shortestWord = null;
        if (wordCountValue > 0) {
            if (filteredShort.length > 0) {
                shortestWord = filteredShort.reduce(function(m,w){return w.length<m.length?w:m},filteredShort[0]);
            } else {
                shortestWord = words.reduce(function(m,w){return w.length<m.length?w:m},words[0]);
            }
        }
        var ignoreStopGR = document.getElementById('wc-kw-stop').checked;
        var mostCommon = null; var mcCount = 0;
        for (var w in wordFreq) {
            if (ignoreStopGR && stopWords.has(w)) continue;
            if (wordFreq[w] > mcCount) { mcCount = wordFreq[w]; mostCommon = w; }
        }
        var vocabLabel = vocabRichness !== null ? getVocabLabel(vocabRichness) : null;

        var platformData = [];
        if (charCountValue > 0) {
            platformLimits.forEach(function(limit) {
                var pct = Math.min(100, (charCountValue / limit.max) * 100);
                platformData.push({ name: limit.name, max: limit.max, current: charCountValue, percentage: Math.round(pct) });
            });
        }

        var keywordData = [];
        var kwBody = document.getElementById('wc-kw-body');
        if (kwBody) {
            var kwRows = kwBody.querySelectorAll('tr');
            for (var i = 0; i < kwRows.length; i++) {
                var cells = kwRows[i].querySelectorAll('td');
                if (cells.length >= 3 && cells[0].textContent !== 'No keywords found') {
                    keywordData.push({ keyword: cells[0].textContent, occurrences: parseInt(cells[1].textContent) || 0, frequency: cells[2].textContent });
                }
            }
        }

        var generatedLocal = new Date().toLocaleString();
        var generatedISO = new Date().toISOString();
        var toolUrl = 'https://gotoolly.com/tools/word-counter';
        var privacyLine = 'All analysis was performed locally in your browser. No data was uploaded or stored.';

        var pad = 30;

        function fmtVal(val, suffix) {
            if (val === null || val === undefined) return '\u2014';
            return String(val) + (suffix || '');
        }

        function fmtNum(val, decimals) {
            if (val === null || val === undefined) return '\u2014';
            return val.toFixed(decimals);
        }

        if (format === 'csv') {
            var csv = 'Category,Metric,Value\n';
            csv += 'Text Statistics,' + csvEscape('Words') + ',' + csvEscape(wordCountValue, true) + '\n';
            csv += 'Text Statistics,' + csvEscape('Characters') + ',' + csvEscape(charCountValue, true) + '\n';
            csv += 'Text Statistics,' + csvEscape('Characters (no spaces)') + ',' + csvEscape(charNoSpaceValue, true) + '\n';
            csv += 'Text Statistics,' + csvEscape('Sentences') + ',' + csvEscape(sentenceCountValue, true) + '\n';
            csv += 'Text Statistics,' + csvEscape('Paragraphs') + ',' + csvEscape(paragraphCountValue, true) + '\n';
            csv += 'Text Statistics,' + csvEscape('Reading Time') + ',' + csvEscape(formatTime(readingTimeMins)) + '\n';
            csv += 'Text Statistics,' + csvEscape('Speaking Time') + ',' + csvEscape(formatTime(speakingTimeMins)) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Average Word Length') + ',' + csvEscape(fmtNum(avgWordLen, 1), true) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Average Sentence Length') + ',' + csvEscape(fmtNum(avgSentLen, 1), true) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Unique Words') + ',' + csvEscape(uniqueCount, true) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Lexical Diversity') + ',' + csvEscape(fmtNum(lexicalDiversity, 1) + '%') + '\n';
            csv += 'Writing Analysis,' + csvEscape('Vocabulary Richness') + ',' + csvEscape(fmtVal(vocabLabel !== null && vocabRichness !== null ? vocabLabel + ' (' + vocabRichness.toFixed(1) + ')' : null)) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Longest Word') + ',' + csvEscape(fmtVal(longestWord)) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Shortest Word') + ',' + csvEscape(fmtVal(shortestWord)) + '\n';
            csv += 'Writing Analysis,' + csvEscape('Most Common Word') + ',' + csvEscape(fmtVal(mostCommon !== null ? mostCommon : null)) + '\n';
            csv += 'Readability,' + csvEscape('Flesch Reading Ease') + ',' + csvEscape(fmtNum(fleschEaseNum, 1), true) + '\n';
            csv += 'Readability,' + csvEscape('Flesch-Kincaid Grade') + ',' + csvEscape(fmtNum(fleschGradeNum, 1), true) + '\n';
            csv += 'Readability,' + csvEscape('Reading Level') + ',' + csvEscape(fmtVal(readLevel)) + '\n';
            csv += 'Readability,' + csvEscape('Difficulty') + ',' + csvEscape(fmtVal(difficultyText)) + '\n';
            csv += 'AI Statistics,' + csvEscape('OpenAI Tokens') + ',' + csvEscape(openaiTokens, true) + '\n';
            csv += 'AI Statistics,' + csvEscape('Claude Tokens') + ',' + csvEscape(claudeTokens, true) + '\n';
            csv += 'AI Statistics,' + csvEscape('Gemini Tokens') + ',' + csvEscape(geminiTokens, true) + '\n';

            if (platformData.length > 0) {
                csv += '\nPlatform Limits,Name,Current / Max,Percentage\n';
                platformData.forEach(function(pl) {
                    csv += 'Platform Limits,' + csvEscape(pl.name) + ',' + csvEscape(pl.current.toLocaleString() + ' / ' + pl.max.toLocaleString()) + ',' + csvEscape(pl.percentage + '%') + '\n';
                });
            }

            if (keywordData.length > 0) {
                csv += '\nKeyword Analysis,Keyword,Occurrences,Frequency\n';
                keywordData.forEach(function(kw) {
                    csv += 'Keyword Analysis,' + csvEscape(kw.keyword) + ',' + csvEscape(kw.occurrences) + ',' + csvEscape(kw.frequency) + '\n';
                });
            }

            return csv;
        }

        if (format === 'json') {
            var json = {
                tool: 'GoToolly Word Counter',
                url: toolUrl,
                generated: generatedISO,
                version: '1.0',
                privacy: privacyLine,
                textStatistics: {
                    words: wordCountValue,
                    characters: charCountValue,
                    charactersNoSpaces: charNoSpaceValue,
                    sentences: sentenceCountValue,
                    paragraphs: paragraphCountValue,
                    readingTime: formatTime(readingTimeMins),
                    readingTimeMinutes: parseFloat(readingTimeMins.toFixed(2)),
                    speakingTime: formatTime(speakingTimeMins),
                    speakingTimeMinutes: parseFloat(speakingTimeMins.toFixed(2))
                },
                writingAnalysis: {
                    averageWordLength: avgWordLen,
                    averageSentenceLength: avgSentLen,
                    uniqueWords: uniqueCount,
                    lexicalDiversity: lexicalDiversity !== null ? parseFloat(lexicalDiversity.toFixed(1)) : null,
                    vocabularyRichness: vocabRichness !== null ? parseFloat(vocabRichness.toFixed(1)) : null,
                    vocabularyLabel: vocabLabel,
                    longestWord: longestWord,
                    shortestWord: shortestWord,
                    mostCommonWord: mostCommon
                },
                readability: {
                    fleschReadingEase: fleschEaseNum !== null ? parseFloat(fleschEaseNum.toFixed(1)) : null,
                    fleschKincaidGrade: fleschGradeNum !== null ? parseFloat(fleschGradeNum.toFixed(1)) : null,
                    readingLevel: readLevel,
                    difficulty: difficultyLabel,
                    difficultyText: difficultyText
                },
                aiStatistics: {
                    openaiTokens: openaiTokens,
                    claudeTokens: claudeTokens,
                    geminiTokens: geminiTokens
                }
            };
            if (platformData.length > 0) json.platformLimits = platformData;
            if (keywordData.length > 0) json.keywords = keywordData;
            return JSON.stringify(json, null, 2);
        }

        var sep = '\u2500';
        var hSep = '';
        for (var i = 0; i < 60; i++) hSep += sep;
        function sectionHeader(title) {
            var line = '--- ' + title + ' ';
            while (line.length < hSep.length) line += sep;
            return line + '\n';
        }

        var r = 'GoToolly Word Counter Report\n';
        for (var i = 0; i < 60; i++) r += '\u2550';
        r += '\n';
        r += 'Generated: ' + generatedLocal + '\n\n';

        r += sectionHeader('Text Statistics');
        r += padRight('Words', pad) + wordCountValue.toLocaleString() + '\n';
        r += padRight('Characters', pad) + charCountValue.toLocaleString() + '\n';
        r += padRight('Characters (no spaces)', pad) + charNoSpaceValue.toLocaleString() + '\n';
        r += padRight('Sentences', pad) + sentenceCountValue.toLocaleString() + '\n';
        r += padRight('Paragraphs', pad) + paragraphCountValue.toLocaleString() + '\n';
        r += padRight('Reading Time', pad) + formatTime(readingTimeMins) + '\n';
        r += padRight('Speaking Time', pad) + formatTime(speakingTimeMins) + '\n\n';

        r += sectionHeader('Writing Analysis');
        r += padRight('Average Word Length', pad) + fmtVal(fmtNum(avgWordLen, 1), ' characters') + '\n';
        r += padRight('Average Sentence Length', pad) + fmtVal(fmtNum(avgSentLen, 1), ' words') + '\n';
        r += padRight('Unique Words', pad) + uniqueCount.toLocaleString() + '\n';
        r += padRight('Lexical Diversity', pad) + fmtVal(fmtNum(lexicalDiversity, 1), '%') + '\n';
        r += padRight('Vocabulary Richness', pad) + fmtVal(vocabLabel !== null && vocabRichness !== null ? vocabLabel + ' (' + vocabRichness.toFixed(1) + ')' : null) + '\n';
        r += padRight('Longest Word', pad) + fmtVal(longestWord) + '\n';
        r += padRight('Shortest Word', pad) + fmtVal(shortestWord) + '\n';
        r += padRight('Most Common Word', pad) + fmtVal(mostCommon !== null ? mostCommon : null) + '\n\n';

        r += sectionHeader('Readability');
        r += padRight('Flesch Reading Ease', pad) + fmtNum(fleschEaseNum, 1) + '\n';
        r += padRight('Flesch-Kincaid Grade', pad) + fmtNum(fleschGradeNum, 1) + '\n';
        r += padRight('Reading Level', pad) + fmtVal(readLevel) + '\n';
        r += padRight('Difficulty', pad) + fmtVal(difficultyText) + '\n\n';

        r += sectionHeader('AI Statistics');
        r += padRight('OpenAI Tokens', pad) + openaiTokens.toLocaleString() + '\n';
        r += padRight('Claude Tokens', pad) + claudeTokens.toLocaleString() + '\n';
        r += padRight('Gemini Tokens', pad) + geminiTokens.toLocaleString() + '\n\n';

        if (platformData.length > 0) {
            r += sectionHeader('Platform Limits');
            platformData.forEach(function(pl) {
                r += padRight(pl.name, pad) + pl.current.toLocaleString() + ' / ' + pl.max.toLocaleString() + ' (' + pl.percentage + '%)' + '\n';
            });
            r += '\n';
        }

        if (keywordData.length > 0) {
            r += sectionHeader('Keyword Analysis');
            keywordData.forEach(function(kw) {
                r += padRight(kw.keyword, pad) + kw.occurrences + ' (' + kw.frequency + ')' + '\n';
            });
            r += '\n';
        }

        r += sectionHeader('Privacy');
        r += privacyLine + '\n\n';

        for (var i = 0; i < 60; i++) r += '\u2550';
        r += '\n';
        r += 'Generated by GoToolly Word Counter \u00b7 ' + toolUrl;

        return r;
    }

    textInput.addEventListener('input', debounce(updateCounts, 200));
    textInput.addEventListener('paste', function() { setTimeout(updateCounts, 50); });

    resetBtn.addEventListener('click', function() {
        textInput.value = '';
        textInput.focus();
        updateCounts();
        showNotification('Text cleared');
    });

    document.getElementById('wc-kw-sort').addEventListener('change', function() {
        if (textInput.value.trim().length > 0) updateCounts();
    });
    document.getElementById('wc-kw-stop').addEventListener('change', function() {
        if (textInput.value.trim().length > 0) updateCounts();
    });

    document.addEventListener('click', function(e) {
        var target = e.target.closest('.wc-sent-trigger');
        if (!target) return;
        var preview = target.parentNode.querySelector('.wc-sent-preview');
        if (preview) preview.classList.toggle('open');
    });

    copyStatsBtn.addEventListener('click', function() {
        var report = generateReport('txt');
        var lines = report.split('\n');
        var short = 'GoToolly Word Counter \u00b7 Quick Stats\n'
            + lines.slice(1, 2).join('\n') + '\n';
        var stats = [];
        for (var i = 0; i < lines.length && stats.length < 8; i++) {
            var l = lines[i];
            if (l.indexOf('Words') === 0 || l.indexOf('Characters') === 0 || l.indexOf('Sentences') === 0
                || l.indexOf('Paragraphs') === 0 || l.indexOf('Reading Time') === 0) {
                stats.push(l);
            }
        }
        short += stats.join('\n') + '\n\n---\nAll analysis was performed locally in your browser.';
        navigator.clipboard.writeText(short).then(function() {
            showNotification('Quick stats copied to clipboard!');
        }).catch(function() {
            showNotification('Failed to copy', true);
        });
    });

    document.getElementById('wc-copy-report').addEventListener('click', function() {
        var report = generateReport('txt');
        navigator.clipboard.writeText(report).then(function() {
            showNotification('Full report copied to clipboard!');
        }).catch(function() {
            showNotification('Failed to copy', true);
        });
    });

    function downloadFile(content, filename, mime) {
        var blob = new Blob([content], {type: mime});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    document.getElementById('wc-export-txt').addEventListener('click', function() {
        downloadFile(generateReport('txt'), 'word-counter-report.txt', 'text/plain');
        showNotification('TXT report downloaded');
    });

    document.getElementById('wc-export-csv').addEventListener('click', function() {
        downloadFile(generateReport('csv'), 'word-counter-report.csv', 'text/csv');
        showNotification('CSV report downloaded');
    });

    document.getElementById('wc-export-json').addEventListener('click', function() {
        downloadFile(generateReport('json'), 'word-counter-report.json', 'application/json');
        showNotification('JSON report downloaded');
    });

    updateCounts();
});
