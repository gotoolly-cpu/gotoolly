/* ============================================
   GO TOOLLY - SQL FORMATTER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('sql-input');
    var formatBtn = document.getElementById('format-btn');
    var resetBtn = document.getElementById('reset-btn');
    var copyBtn = document.getElementById('copy-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var uppercaseCheck = document.getElementById('uppercase-check');

    var keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'UNION', 'ALL', 'DISTINCT', 'AS', 'NOT', 'NULL', 'IN', 'BETWEEN', 'LIKE', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'INDEX', 'VIEW', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'DEFAULT', 'CHECK', 'UNIQUE', 'CASCADE'];

    formatBtn.addEventListener('click', formatSql);
    resetBtn.addEventListener('click', resetTool);
    copyBtn.addEventListener('click', copyResult);

    function formatSql() {
        var sql = input.value;
        if (!sql.trim()) {
            showNotification('Please enter SQL code', true);
            return;
        }

        var formatted = formatSqlQuery(sql);
        resultText.textContent = formatted;
        resultArea.style.display = 'block';
    }

    function formatSqlQuery(sql) {
        var useUppercase = uppercaseCheck.checked;
        var tokens = tokenizeSql(sql);

        if (useUppercase) {
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].type === 'keyword') {
                    tokens[i].value = tokens[i].value.toUpperCase();
                }
            }
        }

        var indentLevel = 0;
        var lines = [];
        var currentLine = '';
        var clauseKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'UNION'];

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];

            if (token.type === 'keyword' && clauseKeywords.indexOf(token.value.toUpperCase()) !== -1) {
                if (currentLine.trim()) {
                    lines.push(currentLine);
                }
                currentLine = '  '.repeat(indentLevel) + token.value;
            } else if (token.value === '(') {
                if (currentLine.trim()) {
                    currentLine += ' (';
                } else {
                    currentLine = '  '.repeat(indentLevel) + '(';
                }
                indentLevel++;
            } else if (token.value === ')') {
                indentLevel = Math.max(0, indentLevel - 1);
                if (currentLine.trim()) {
                    lines.push(currentLine);
                }
                currentLine = '  '.repeat(indentLevel) + ')';
            } else if (token.value === ',') {
                currentLine += ',';
                lines.push(currentLine);
                currentLine = '  '.repeat(indentLevel);
            } else {
                if (currentLine.trim()) {
                    currentLine += ' ' + token.value;
                } else {
                    currentLine += token.value;
                }
            }
        }

        if (currentLine.trim()) {
            lines.push(currentLine);
        }

        return lines.filter(function(l) { return l.trim(); }).join('\n');
    }

    function tokenizeSql(sql) {
        var tokens = [];
        var i = 0;
        var keywordSet = {};
        for (var k = 0; k < keywords.length; k++) {
            keywordSet[keywords[k].toLowerCase()] = keywords[k];
        }

        while (i < sql.length) {
            if (sql[i] === ' ' || sql[i] === '\t' || sql[i] === '\n' || sql[i] === '\r') {
                i++;
                continue;
            }

            if (sql[i] === "'") {
                var str = "'";
                i++;
                while (i < sql.length && sql[i] !== "'") {
                    if (sql[i] === '\\') { str += sql[i] + sql[i+1]; i += 2; }
                    else { str += sql[i]; i++; }
                }
                str += "'";
                i++;
                tokens.push({ type: 'string', value: str });
                continue;
            }

            if (sql[i] === '"') {
                var str = '"';
                i++;
                while (i < sql.length && sql[i] !== '"') {
                    if (sql[i] === '\\') { str += sql[i] + sql[i+1]; i += 2; }
                    else { str += sql[i]; i++; }
                }
                str += '"';
                i++;
                tokens.push({ type: 'string', value: str });
                continue;
            }

            if (sql[i] === '-' && sql[i+1] === '-') {
                while (i < sql.length && sql[i] !== '\n') i++;
                continue;
            }

            if (sql[i] === '/' && sql[i+1] === '*') {
                i += 2;
                while (i < sql.length && !(sql[i] === '*' && sql[i+1] === '/')) i++;
                i += 2;
                continue;
            }

            if (sql[i] === '(' || sql[i] === ')' || sql[i] === ',' || sql[i] === ';') {
                tokens.push({ type: 'punctuation', value: sql[i] });
                i++;
                continue;
            }

            var word = '';
            while (i < sql.length && sql[i] !== ' ' && sql[i] !== '\t' && sql[i] !== '\n' && sql[i] !== '\r' && sql[i] !== '(' && sql[i] !== ')' && sql[i] !== ',' && sql[i] !== ';' && sql[i] !== "'" && sql[i] !== '"') {
                word += sql[i];
                i++;
            }

            if (word) {
                var lower = word.toLowerCase();
                var type = keywordSet[lower] ? 'keyword' : 'identifier';
                tokens.push({ type: type, value: word });
            }
        }

        return tokens;
    }

    function copyResult() {
        var text = resultText.textContent;
        try {
            navigator.clipboard.writeText(text).then(function() {
                copyBtn.textContent = 'Copied!';
                setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
            }).catch(function() { fallbackCopy(text); });
        } catch (e) { fallbackCopy(text); }
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied!'; }
        catch (e) { copyBtn.textContent = 'Failed'; }
        document.body.removeChild(ta);
        setTimeout(function() { copyBtn.textContent = 'Copy Result'; }, 2000);
    }

    function resetTool() {
        input.value = '';
        resultArea.style.display = 'none';
        resultText.textContent = '';
    }

    function showNotification(msg, isError) {
        var existing = document.querySelector('.notification');
        if (existing) existing.remove();
        var el = document.createElement('div');
        el.className = 'notification' + (isError ? ' error' : '');
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.remove(); }, 3500);
    }
});
