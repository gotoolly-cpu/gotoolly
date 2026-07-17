(function () {
    'use strict';

    function normalize(str) {
        return String(str).toLowerCase().trim().replace(/[-_]+/g, ' ');
    }

    function tokenize(str) {
        return normalize(str).split(/\s+/).filter(Boolean);
    }

    function countTokenMatches(tokens, targetTokens) {
        var score = 0;
        for (var ti = 0; ti < tokens.length; ti++) {
            var found = false;
            for (var tj = 0; tj < targetTokens.length; tj++) {
                if (targetTokens[tj].indexOf(tokens[ti]) !== -1) {
                    found = true;
                    break;
                }
            }
            if (found) score++;
        }
        return score;
    }

    function search(items, query, opts) {
        opts = opts || {};
        var nameField = opts.nameField || 'name';
        var descField = opts.descField || 'desc';
        var catField = opts.catField || 'cat';
        var keywordField = opts.keywordField || null;

        if (!query || !query.trim()) {
            return items.map(function (item) {
                return { item: item, score: 0, matchField: null, matchStart: -1, matchEnd: -1 };
            });
        }

        var q = normalize(query);
        var tokens = tokenize(query);
        var scored = [];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var name = normalize(item[nameField] || '');
            var desc = normalize(item[descField] || '');
            var cat = normalize(item[catField] || '');
            var keywords = keywordField ? normalize(item[keywordField] || '') : '';

            var score = 0;
            var matchField = null;
            var matchStart = -1;
            var matchEnd = -1;

            var idx = name.indexOf(q);
            if (idx !== -1) {
                if (name === q) {
                    score = 100;
                } else if (idx === 0) {
                    score = 90;
                } else {
                    score = 75;
                }
                matchField = nameField;
                matchStart = idx;
                matchEnd = idx + q.length;
            } else {
                var nameTokens = tokenize(item[nameField] || '');
                var allMatch = true;
                for (var ti = 0; ti < tokens.length; ti++) {
                    var tokenFound = false;
                    for (var tj = 0; tj < nameTokens.length; tj++) {
                        if (nameTokens[tj].indexOf(tokens[ti]) !== -1) {
                            tokenFound = true;
                            break;
                        }
                    }
                    if (!tokenFound) { allMatch = false; break; }
                }
                if (allMatch && tokens.length > 1) {
                    score = 70;
                    matchField = nameField;
                    var firstIdx = -1;
                    for (var ti2 = 0; ti2 < tokens.length; ti2++) {
                        var fi = name.indexOf(tokens[ti2]);
                        if (fi !== -1 && (firstIdx === -1 || fi < firstIdx)) firstIdx = fi;
                    }
                    if (firstIdx !== -1) { matchStart = firstIdx; matchEnd = firstIdx + 10; }
                } else {
                    var anyTokenMatch = false;
                    for (var ti3 = 0; ti3 < tokens.length; ti3++) {
                        for (var tj2 = 0; tj2 < nameTokens.length; tj2++) {
                            if (nameTokens[tj2].indexOf(tokens[ti3]) !== -1) {
                                anyTokenMatch = true;
                                break;
                            }
                        }
                        if (anyTokenMatch) break;
                    }
                    if (anyTokenMatch) {
                        score = 60;
                        matchField = nameField;
                    } else {
                        var descIdx = desc.indexOf(q);
                        if (descIdx !== -1) {
                            score = 25;
                            matchField = descField;
                            matchStart = descIdx;
                            matchEnd = descIdx + q.length;
                        } else if (keywords && keywords.indexOf(q) !== -1) {
                            score = 15;
                            matchField = keywordField;
                        } else if (cat.indexOf(q) !== -1) {
                            score = 10;
                            matchField = catField;
                        } else {
                            var descTokenMatch = countTokenMatches(tokens, tokenize(item[descField] || ''));
                            if (descTokenMatch > 0) {
                                score = 5 + descTokenMatch * 5;
                                matchField = descField;
                            }
                        }
                    }
                }
            }

            if (score > 0) {
                scored.push({
                    item: item,
                    score: score,
                    matchField: matchField,
                    matchStart: matchStart,
                    matchEnd: matchEnd,
                    query: query
                });
            }
        }

        scored.sort(function (a, b) {
            if (a.score !== b.score) return b.score - a.score;
            return 0;
        });

        return scored;
    }

    function highlight(text, matchStart, matchEnd) {
        if (matchStart === -1 || matchEnd === -1 || matchStart >= matchEnd) return escapeHtml(String(text));
        var str = String(text);
        return escapeHtml(str.substring(0, matchStart)) + '<mark>' + escapeHtml(str.substring(matchStart, matchEnd)) + '</mark>' + escapeHtml(str.substring(matchEnd));
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    window.SearchUtils = {
        search: search,
        highlight: highlight,
        normalize: normalize,
        tokenize: tokenize,
        escapeHtml: escapeHtml
    };
})();
