/* ============================================
   GO TOOLLY - SQL FORMATTER
   Clause-aware SQL formatter engine
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('sql-input');
    var formatBtn = document.getElementById('format-btn');
    var resetBtn = document.getElementById('reset-btn');
    var resultArea = document.getElementById('result-area');
    var resultText = document.getElementById('result-text');
    var uppercaseCheck = document.getElementById('uppercase-check');

    formatBtn.addEventListener('click', formatSql);
    resetBtn.addEventListener('click', resetTool);

    function formatSql() {
        var sql = input.value;
        if (!sql.trim()) {
            showNotification('Please enter SQL code', true);
            return;
        }
        var useUppercase = uppercaseCheck.checked;
        var formatted = formatSQL(sql, { uppercase: useUppercase });
        resultText.textContent = formatted;
        resultArea.style.display = 'block';
    }

    /* ===== TOKENIZER ===== */

    var KW = {};
    var KW_LIST = [
        'SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL',
        'LIKE','BETWEEN','EXISTS','AS','ON','JOIN',
        'INNER JOIN','LEFT JOIN','RIGHT JOIN','OUTER JOIN','FULL JOIN','CROSS JOIN','NATURAL JOIN',
        'GROUP BY','ORDER BY','HAVING','LIMIT','OFFSET','FETCH','NEXT','ROWS','ONLY',
        'UNION','INTERSECT','EXCEPT','ALL','DISTINCT',
        'INSERT INTO','VALUES','UPDATE','SET','DELETE FROM',
        'CREATE TABLE','CREATE OR REPLACE','ALTER TABLE','DROP TABLE',
        'DROP','ADD','COLUMN','MODIFY','RENAME',
        'PRIMARY KEY','FOREIGN KEY','REFERENCES','CONSTRAINT','INDEX','UNIQUE','CREATE INDEX',
        'VIEW','MATERIALIZED','TEMPORARY','TEMP',
        'IF','EXISTS','NOT EXISTS','WITH','RECURSIVE',
        'CASE','WHEN','THEN','ELSE','END',
        'OVER','PARTITION BY',
        'ROWS','RANGE','UNBOUNDED','PRECEDING','FOLLOWING','CURRENT ROW',
        'ASC','DESC','NULLS','FIRST','LAST',
        'TABLE','INDEX','VIEW','FUNCTION','PROCEDURE','TRIGGER',
        'SCHEMA','DATABASE','USE',
        'GRANT','REVOKE','COMMIT','ROLLBACK','BEGIN','TRANSACTION',
        'MERGE','INTO','USING','MATCHED',
        'INSERT','UPDATE','DELETE','DO','RETURNING',
        'EXPLAIN','ANALYZE','VACUUM','CLUSTER','REINDEX','TRUNCATE','LOCK',
        'DECLARE','CURSOR','FETCH','OPEN','CLOSE','DEALLOCATE','PREPARE','EXECUTE','CALL',
        'SET','SHOW','DESCRIBE','PRAGMA','ATTACH','DETACH','REPLACE','COPY',
        'BY',
        'INNER','LEFT','RIGHT','FULL','OUTER','CROSS','NATURAL',
        'GROUP','ORDER','PARTITION',
        'CREATE','ALTER','TABLE','INDEX',
        'PRIMARY','KEY','FOREIGN','CASCADE',
        'MATERIALIZED','TEMPORARY','TEMP',
        'UNBOUNDED','PRECEDING','FOLLOWING','CURRENT','ROW'
    ];
    for (var ki = 0; ki < KW_LIST.length; ki++) {
        KW[KW_LIST[ki].toLowerCase()] = KW_LIST[ki];
    }

    var FUNCS = {};
    var FUNC_LIST = [
        'SUM','COUNT','AVG','MIN','MAX',
        'COALESCE','NULLIF','CAST','CONVERT',
        'SUBSTRING','TRIM','LENGTH','CHAR_LENGTH','UPPER','LOWER','REPLACE','CONCAT',
        'GROUP_CONCAT','STRING_AGG','ARRAY_AGG',
        'ROW_NUMBER','RANK','DENSE_RANK','NTILE','LAG','LEAD',
        'FIRST_VALUE','LAST_VALUE','NTH_VALUE','CUME_DIST','PERCENT_RANK',
        'PERCENTILE_CONT','PERCENTILE_DISC',
        'ABS','CEIL','CEILING','FLOOR','ROUND','TRUNC','TRUNCATE',
        'MOD','POWER','SQRT','EXP','LN','LOG','LOG10','SIGN',
        'RANDOM','RAND',
        'NOW','CURRENT_DATE','CURRENT_TIME','CURRENT_TIMESTAMP',
        'DATEADD','DATEDIFF','DATEPART','EXTRACT',
        'YEAR','MONTH','DAY','HOUR','MINUTE','SECOND',
        'DATE_FORMAT','TO_CHAR','TO_DATE','TO_NUMBER',
        'NVL','DECODE','IFNULL','ISNULL',
        'GREATEST','LEAST','POSITION','INSTR','LOCATE',
        'REGEXP_REPLACE','REGEXP_MATCH','REGEXP_SUBSTR',
        'TRANSLATE','LPAD','RPAD','LEFT','RIGHT','REVERSE','SPLIT_PART',
        'UNNEST','XMLAGG','JSON_AGG','JSONB_AGG',
        'JSON_BUILD_OBJECT','JSONB_BUILD_OBJECT',
        'JSON_EXTRACT_PATH','JSONB_EXTRACT_PATH',
        'TYPEOF','TOTAL','GROUPING',
        'VARIANCE','STDDEV','VAR_POP','VAR_SAMP','STDDEV_POP','STDDEV_SAMP',
        'CORR','REGR_SLOPE','REGR_INTERCEPT',
        'BIT_AND','BIT_OR','BIT_XOR',
        'EVERY','SOME','BOOL_AND','BOOL_OR','LOGICAL_AND','LOGICAL_OR',
        'FIRST','LAST','LISTAGG','MEDIAN','MODE',
        'VARCHAR','CHAR','CHARACTER','NVARCHAR','NCHAR',
        'TEXT','INT','INTEGER','BIGINT','SMALLINT','TINYINT',
        'DECIMAL','NUMERIC','FLOAT','DOUBLE','REAL','BOOLEAN',
        'BLOB','CLOB','DATE','TIME','TIMESTAMP','DATETIME','INTERVAL',
        'SERIAL','BIGSERIAL','UUID','JSON','JSONB','ENUM',
        'POINT','LINE','LSEG','BOX','PATH','POLYGON','CIRCLE',
        'GEOMETRY','GEOGRAPHY','ARRAY','XML','BYTEA','ROW','RECORD',
        'OVER'
    ];
    for (var fi = 0; fi < FUNC_LIST.length; fi++) {
        FUNCS[FUNC_LIST[fi].toLowerCase()] = FUNC_LIST[fi];
    }

    function tokenize(sql) {
        var tokens = [];
        var i = 0;
        while (i < sql.length) {
            var ch = sql[i];
            // Whitespace
            if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
                while (i < sql.length && (sql[i] === ' ' || sql[i] === '\t' || sql[i] === '\n' || sql[i] === '\r')) i++;
                continue;
            }
            // Line comment
            if (ch === '-' && sql[i + 1] === '-') {
                var start = i;
                while (i < sql.length && sql[i] !== '\n') i++;
                tokens.push({ type: 'comment', value: sql.substring(start, i) });
                continue;
            }
            // Block comment
            if (ch === '/' && sql[i + 1] === '*') {
                var start = i;
                i += 2;
                while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
                if (i < sql.length) i += 2;
                tokens.push({ type: 'comment', value: sql.substring(start, i) });
                continue;
            }
            // Single-quoted string
            if (ch === "'") {
                var start = i;
                i++;
                while (i < sql.length) {
                    if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; }
                    else if (sql[i] === "'") { i++; break; }
                    else { i++; }
                }
                tokens.push({ type: 'string', value: sql.substring(start, i) });
                continue;
            }
            // Double-quoted identifier
            if (ch === '"') {
                var start = i;
                i++;
                while (i < sql.length && sql[i] !== '"') {
                    if (sql[i] === '\\') i++;
                    i++;
                }
                if (i < sql.length) i++;
                tokens.push({ type: 'name', value: sql.substring(start, i) });
                continue;
            }
            // Backtick identifier
            if (ch === '`') {
                var start = i;
                i++;
                while (i < sql.length && sql[i] !== '`') i++;
                if (i < sql.length) i++;
                tokens.push({ type: 'name', value: sql.substring(start, i) });
                continue;
            }
            // Square bracket identifier
            if (ch === '[') {
                var start = i;
                i++;
                while (i < sql.length && sql[i] !== ']') i++;
                if (i < sql.length) i++;
                tokens.push({ type: 'name', value: sql.substring(start, i) });
                continue;
            }
            // Number
            if (/\d/.test(ch)) {
                var start = i;
                while (i < sql.length && (/[\d.]/.test(sql[i]) || sql[i] === 'e' || sql[i] === 'E' ||
                    (sql[i] >= 'a' && sql[i] <= 'f') || (sql[i] >= 'A' && sql[i] <= 'F') ||
                    sql[i] === 'x' || sql[i] === 'X')) i++;
                tokens.push({ type: 'number', value: sql.substring(start, i) });
                continue;
            }
            // Punctuation
            if (ch === '(') { tokens.push({ type: 'openParen', value: '(' }); i++; continue; }
            if (ch === ')') { tokens.push({ type: 'closeParen', value: ')' }); i++; continue; }
            if (ch === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
            if (ch === ';') { tokens.push({ type: 'semicolon', value: ';' }); i++; continue; }
            if (ch === '.') { tokens.push({ type: 'dot', value: '.' }); i++; continue; }
            if (ch === '*') { tokens.push({ type: 'star', value: '*' }); i++; continue; }
            // Multi-char operators
            var op2 = sql.substring(i, i + 2);
            if (['<=', '>=', '<>', '!=', '||', '&&', '::', '->', '=>', '@>', '<@',
                 '?#', '#-', '->>', '#>', '#>>', '??', '?|', '?&', '||/', '|/', '!!', ':='
                ].indexOf(op2) !== -1) {
                tokens.push({ type: 'operator', value: op2 });
                i += 2;
                continue;
            }
            // Single-char operators
            if ('=<>!+-*/%^|&~:?#@'.indexOf(ch) !== -1) {
                tokens.push({ type: 'operator', value: ch });
                i++;
                continue;
            }
            // Words (keywords, identifiers, function names)
            var start = i;
            while (i < sql.length && /[a-zA-Z0-9_$]/.test(sql[i])) i++;
            var word = sql.substring(start, i);
            if (word) {
                var lower = word.toLowerCase();
                if (KW[lower]) {
                    tokens.push({ type: 'keyword', value: word, isFunc: !!FUNCS[lower] });
                } else if (FUNCS[lower]) {
                    tokens.push({ type: 'keyword', value: word, isFunc: true });
                } else {
                    tokens.push({ type: 'name', value: word });
                }
            }
        }
        return tokens;
    }

    /* ===== PAREN CLASSIFICATION ===== */

    function isFuncParen(tokens, idx) {
        if (tokens[idx].type !== 'openParen') return false;
        if (idx === 0) return false;
        var prev = tokens[idx - 1];
        return (prev.type === 'name' && FUNCS[prev.value.toLowerCase()]) ||
               (prev.type === 'keyword' && prev.isFunc);
    }

    function isSubqueryParen(tokens, idx) {
        if (tokens[idx].type !== 'openParen') return false;
        if (isFuncParen(tokens, idx)) return false;
        var j = idx + 1;
        while (j < tokens.length && tokens[j].type === 'comment') j++;
        return j < tokens.length && tokens[j].type === 'keyword' && tokens[j].value.toUpperCase() === 'SELECT';
    }

    /* ===== FORMATTER ===== */

    function formatSQL(sql, opts) {
        opts = opts || {};
        var uppercase = opts.uppercase !== false;
        var tokens = tokenize(sql);
        if (uppercase) {
            for (var ti = 0; ti < tokens.length; ti++) {
                if (tokens[ti].type === 'keyword') {
                    tokens[ti].value = tokens[ti].value.toUpperCase();
                }
            }
        }
        return formatTokens(tokens);
    }

    function formatTokens(tokens) {
        var out = [];
        var line = '';
        var ibase = 0;
        var clause = '';
        var inContent = false;
        var funcParen = 0;
        var parenStack = [];

        function emit() {
            if (line.length > 0 && line.trim().length > 0) {
                out.push(line);
            }
            line = '';
        }

        function add(text, noSpace) {
            if (noSpace) {
                line += text;
            } else if (line.length > 0 && !/[\s(,.]$/.test(line)) {
                line += ' ' + text;
            } else {
                line += text;
            }
        }

        function kwMatch(tok, str) {
            return tok.type === 'keyword' && tok.value.toUpperCase() === str;
        }

        function clauseLine(kw) {
            emit();
            line = '  '.repeat(ibase) + kw;
            clause = kw;
            inContent = true;
        }

        function contentLine() {
            if (inContent && line.length === 0) {
                var extra = 1;
                if (parenStack.length > 0) {
                    var topType = parenStack[parenStack.length - 1].type;
                    if (topType === 'existsBlock' || topType === 'subquery') {
                        extra = 0;
                    }
                }
                line = '  '.repeat(ibase + extra);
            }
        }

        function contentLine2(extra) {
            if (inContent && line.length === 0) {
                line = '  '.repeat(ibase + 1 + (extra || 0));
            }
        }

        function insideParenBlock() {
            for (var p = 0; p < parenStack.length; p++) {
                var pt = parenStack[p].type;
                if (pt === 'overBlock' || pt === 'subquery' || pt === 'existsBlock' || pt === 'createBlock' || pt === 'cteBlock' || pt === 'valuesTuple') return true;
            }
            return false;
        }

        function insideExistsBlock() {
            for (var p = 0; p < parenStack.length; p++) {
                if (parenStack[p].type === 'existsBlock') return true;
            }
            return false;
        }

        function insideOverBlock() {
            for (var p = 0; p < parenStack.length; p++) {
                if (parenStack[p].type === 'overBlock') return true;
            }
            return false;
        }

        var i = 0;
        while (i < tokens.length) {
            var tok = tokens[i];
            function next(n) { n = n || 1; return i + n < tokens.length ? tokens[i + n] : null; }

            // Comments: emit on their own line
            if (tok.type === 'comment') {
                emit();
                line = '  '.repeat(inContent && !line.length ? ibase + 1 : ibase) + tok.value;
                emit();
                i++;
                continue;
            }

            // Semicolon: attach to previous statement
            if (tok.type === 'semicolon') {
                line += ';';
                i++;
                continue;
            }

            // Keyword handling
            if (tok.type === 'keyword') {
                var kw = tok.value.toUpperCase();

                // Clause-starting keywords
                if (kw === 'SELECT') { clauseLine('SELECT'); if (!insideExistsBlock()) emit(); i++; continue; }
                if (kw === 'DISTINCT' && clause === 'SELECT') { contentLine(); add('DISTINCT'); i++; continue; }
                if (kw === 'FROM') { clauseLine('FROM'); i++; continue; }
                if (kw === 'WHERE') { clauseLine('WHERE'); i++; continue; }
                if (kw === 'AND' && clause === 'WHERE') { emit(); contentLine2(0); add('AND'); i++; continue; }
                if (kw === 'OR' && clause === 'WHERE') { emit(); contentLine2(0); add('OR'); i++; continue; }
                // GROUP BY / ORDER BY always on their own line
                if (kw === 'GROUP BY' || (kw === 'GROUP' && next() && kwMatch(next(), 'BY'))) {
                    if (funcParen > 0 || insideOverBlock()) {
                        emit(); contentLine(); add('GROUP BY');
                    } else {
                        clauseLine('GROUP BY');
                    }
                    if (kw === 'GROUP') i++;
                    i++;
                    continue;
                }
                if (kw === 'ORDER BY' || (kw === 'ORDER' && next() && kwMatch(next(), 'BY'))) {
                    if (funcParen > 0 || insideOverBlock()) {
                        emit(); contentLine(); add('ORDER BY');
                    } else {
                        clauseLine('ORDER BY');
                    }
                    if (kw === 'ORDER') i++;
                    i++;
                    continue;
                }
                if (kw === 'HAVING') { clauseLine('HAVING'); i++; continue; }
                if (kw === 'LIMIT' || kw === 'OFFSET' || kw === 'FETCH') {
                    if (line.length > 0) emit();
                    line = '  '.repeat(ibase) + kw;
                    clause = '';
                    inContent = false;
                    i++;
                    continue;
                }
                if (kw === 'UNION' || kw === 'INTERSECT' || kw === 'EXCEPT') {
                    clauseLine(kw);
                    i++;
                    if (tokens[i] && tokens[i].type === 'keyword' && tokens[i].value.toUpperCase() === 'ALL') {
                        add('ALL');
                        i++;
                    }
                    clause = '';
                    continue;
                }

                // JOIN handling
                if (kw === 'JOIN' || kw === 'INNER JOIN' || kw === 'LEFT JOIN' || kw === 'RIGHT JOIN' ||
                    kw === 'FULL JOIN' || kw === 'OUTER JOIN' || kw === 'CROSS JOIN' || kw === 'NATURAL JOIN') {
                    clauseLine(kw === 'JOIN' ? 'JOIN' : kw);
                    i++;
                    continue;
                }
                if (kw === 'JOIN' && (clause === 'INNER' || clause === 'LEFT' || clause === 'RIGHT' ||
                    clause === 'FULL' || clause === 'OUTER' || clause === 'CROSS' || clause === 'NATURAL')) {
                    emit();
                    line = '  '.repeat(ibase) + 'JOIN';
                    clause = 'JOIN';
                    i++;
                    continue;
                }
                if (kw === 'INNER' && next() && kwMatch(next(), 'JOIN')) { clauseLine('INNER JOIN'); i += 2; continue; }
                if (kw === 'LEFT' && next() && kwMatch(next(), 'JOIN')) { clauseLine('LEFT JOIN'); i += 2; continue; }
                if (kw === 'LEFT' && next() && next(1) && kwMatch(next(), 'OUTER') && next(2) && kwMatch(next(2), 'JOIN')) { clauseLine('LEFT OUTER JOIN'); i += 3; continue; }
                if (kw === 'RIGHT' && next() && kwMatch(next(), 'JOIN')) { clauseLine('RIGHT JOIN'); i += 2; continue; }
                if (kw === 'RIGHT' && next() && next(1) && kwMatch(next(), 'OUTER') && next(2) && kwMatch(next(2), 'JOIN')) { clauseLine('RIGHT OUTER JOIN'); i += 3; continue; }
                if (kw === 'FULL' && next() && kwMatch(next(), 'JOIN')) { clauseLine('FULL JOIN'); i += 2; continue; }
                if (kw === 'FULL' && next() && next(1) && kwMatch(next(), 'OUTER') && next(2) && kwMatch(next(2), 'JOIN')) { clauseLine('FULL OUTER JOIN'); i += 3; continue; }
                if (kw === 'CROSS' && next() && kwMatch(next(), 'JOIN')) { clauseLine('CROSS JOIN'); i += 2; continue; }
                if (kw === 'NATURAL' && next() && kwMatch(next(), 'JOIN')) { clauseLine('NATURAL JOIN'); i += 2; continue; }
                if (kw === 'OUTER' && next() && kwMatch(next(), 'JOIN')) { clauseLine('OUTER JOIN'); i += 2; continue; }

                // ON clause
                if (kw === 'ON' && (clause === 'JOIN' || clause.indexOf('JOIN') !== -1)) { emit(); contentLine2(1); add('ON'); clause = 'ON'; i++; continue; }
                if (kw === 'ON') { add('ON'); i++; continue; }
                if (kw === 'AS') { add('AS'); i++; continue; }
                if (kw === 'AND' && (clause === 'ON' || clause === 'JOIN')) { emit(); contentLine(); add('AND'); i++; continue; }

                // DML/DDL clause keywords
                if (kw === 'INSERT INTO' || (kw === 'INSERT' && next() && kwMatch(next(), 'INTO'))) {
                    clauseLine('INSERT INTO');
                    if (kw === 'INSERT') i++;
                    i++;
                    continue;
                }
                if (kw === 'INTO' && clause !== 'INSERT') { add('INTO'); i++; continue; }
                if (kw === 'VALUES') { clauseLine('VALUES'); emit(); i++; continue; }
                if (kw === 'UPDATE') { clauseLine('UPDATE'); i++; continue; }
                if (kw === 'SET') { clauseLine('SET'); emit(); i++; continue; }
                if (kw === 'DELETE FROM' || (kw === 'DELETE' && next() && kwMatch(next(), 'FROM'))) {
                    clauseLine('DELETE FROM');
                    if (kw === 'DELETE') i++;
                    i++;
                    continue;
                }
                if (kw === 'CREATE TABLE' || (kw === 'CREATE' && next() && kwMatch(next(), 'TABLE'))) {
                    clauseLine('CREATE TABLE');
                    if (kw === 'CREATE') i++;
                    i++;
                    continue;
                }
                if (kw === 'ALTER TABLE' || (kw === 'ALTER' && next() && kwMatch(next(), 'TABLE'))) {
                    clauseLine('ALTER TABLE');
                    if (kw === 'ALTER') i++;
                    i++;
                    continue;
                }
                if (kw === 'DROP TABLE' || (kw === 'DROP' && next() && kwMatch(next(), 'TABLE'))) {
                    clauseLine('DROP TABLE');
                    if (kw === 'DROP') i++;
                    i++;
                    continue;
                }
                if (kw === 'CREATE INDEX' || (kw === 'CREATE' && next() && kwMatch(next(), 'INDEX'))) {
                    clauseLine('CREATE INDEX');
                    if (kw === 'CREATE') i++;
                    i++;
                    continue;
                }

                // WITH / CTE
                if (kw === 'WITH') {
                    clauseLine('WITH');
                    i++;
                    if (next() && kwMatch(next(), 'RECURSIVE')) { i++; add('RECURSIVE'); }
                    continue;
                }
                if (kw === 'RECURSIVE' && clause === 'WITH') { add('RECURSIVE'); i++; continue; }

                // CASE
                if (kw === 'CASE') { emit(); line = '  '.repeat(ibase + (inContent ? 1 : 0)) + 'CASE'; inContent = false; i++; continue; }
                if (kw === 'WHEN') { emit(); line = '  '.repeat(ibase + 2) + 'WHEN'; i++; continue; }
                if (kw === 'THEN') { add('THEN'); i++; continue; }
                if (kw === 'ELSE') { emit(); line = '  '.repeat(ibase + 2) + 'ELSE'; i++; continue; }
                if (kw === 'END') { emit(); line = '  '.repeat(ibase + 1) + 'END'; inContent = true; i++; continue; }

                // Window functions
                if (kw === 'OVER') { add('OVER'); i++; continue; }
                if (kw === 'PARTITION BY' || (kw === 'PARTITION' && next() && kwMatch(next(), 'BY'))) {
                    contentLine();
                    add('PARTITION BY');
                    if (kw === 'PARTITION') i++;
                    i++;
                    continue;
                }

                // Sort order
                if (kw === 'ASC' || kw === 'DESC') { add(kw); i++; continue; }
                if (kw === 'NULLS') {
                    add('NULLS');
                    i++;
                    if (next() && (kwMatch(next(), 'FIRST') || kwMatch(next(), 'LAST'))) {
                        i++;
                        add(tokens[i].value.toUpperCase());
                    }
                    i++;
                    continue;
                }

                // Other known keywords
                if (kw === 'USING') { clauseLine('USING'); i++; continue; }
                if (kw === 'MATCHED') { clauseLine('WHEN MATCHED'); i++; continue; }
                if (kw === 'NOT MATCHED') { clauseLine('WHEN NOT MATCHED'); i++; continue; }
                if (kw === 'RETURNING') { clauseLine('RETURNING'); i++; continue; }
                if (kw === 'BY') { add('BY'); i++; continue; }
                if (kw === 'IN') { add('IN'); i++; continue; }
                if (kw === 'IS') { add('IS'); i++; continue; }
                if (kw === 'NOT') { add('NOT'); i++; continue; }
                if (kw === 'NULL') { add('NULL'); i++; continue; }
                if (kw === 'LIKE') { add('LIKE'); i++; continue; }
                if (kw === 'BETWEEN') { add('BETWEEN'); i++; continue; }
                // EXISTS subquery block
                if (kw === 'EXISTS') {
                    add('EXISTS');
                    i++;
                    if (tokens[i] && tokens[i].type === 'openParen' && isSubqueryParen(tokens, i)) {
                        var isAtContentLevel = line.length > 0 && /^\s/.test(line);
                        line += ' (';
                        emit();
                        ibase += 2;
                        inContent = true;
                        parenStack.push({ type: 'existsBlock', atContent: isAtContentLevel });
                        i++;
                    }
                    continue;
                }
                if (kw === 'ALL') { add('ALL'); i++; continue; }
                if (kw === 'DISTINCT' && clause !== 'SELECT') { add('DISTINCT'); i++; continue; }

                // Fallback: treat as content
                contentLine();
                add(kw);
                i++;
                continue;
            }

            // Parentheses
            if (tok.type === 'openParen') {
                var prevTok = i > 0 ? tokens[i - 1] : null;
                var isOver = prevTok && prevTok.type === 'keyword' && prevTok.value.toUpperCase() === 'OVER';
                var alreadyInCreate = parenStack.length > 0 && parenStack[parenStack.length - 1].type === 'createBlock';
                var isCreate = !alreadyInCreate && clause === 'CREATE TABLE';
                var isFunc = !isOver && !isCreate && isFuncParen(tokens, i);
                var isSubquery = !isOver && !isCreate && !isFunc && isSubqueryParen(tokens, i);
                // CTE: AS ( — keep ( inline
                var isCTE = prevTok && prevTok.type === 'keyword' && prevTok.value.toUpperCase() === 'AS' && isSubquery;
                // OVER block keeps indented content
                if (isOver) {
                    line += ' (';
                    emit();
                    ibase++;
                    funcParen++;
                    inContent = true;
                    parenStack.push({ type: 'overBlock' });
                    i++;
                    continue;
                }
                // CREATE TABLE columns indented
                if (isCreate) {
                    line += ' (';
                    emit();
                    ibase++;
                    inContent = true;
                    parenStack.push({ type: 'createBlock' });
                    i++;
                    continue;
                }
                if (isFunc) {
                    funcParen++;
                    add('(', true);
                    parenStack.push({ type: 'func' });
                    i++;
                    continue;
                }
                // CTE block: AS ( stays inline
                if (isCTE) {
                    add('(');
                    ibase += 2;
                    inContent = true;
                    parenStack.push({ type: 'cteBlock' });
                    i++;
                    continue;
                }
                // VALUES tuple
                if (clause === 'VALUES' && !isSubquery) {
                    contentLine();
                    add('(', true);
                    parenStack.push({ type: 'valuesTuple' });
                    i++;
                    continue;
                }
                // Subquery: ( on its own line
                if (isSubquery) {
                    emit();
                    line = '  '.repeat(ibase + 1) + '(';
                    ibase += 2;
                    inContent = true;
                    parenStack.push({ type: 'subquery' });
                    i++;
                    continue;
                }
                add('(');
                parenStack.push({ type: 'expr' });
                i++;
                continue;
            }

                if (tok.type === 'closeParen') {
                var ctx = parenStack.pop();
                if (!ctx || ctx.type === 'expr') {
                    add(')', true);
                    i++;
                    continue;
                }
                if (ctx.type === 'func') {
                    funcParen--;
                    add(')', true);
                    i++;
                    continue;
                }
                // CTE block: ) on its own line at base level
                if (ctx.type === 'cteBlock') {
                    ibase = Math.max(0, ibase - 2);
                    emit();
                    line = '  '.repeat(ibase) + ')';
                    i++;
                    continue;
                }
                // VALUES tuple: ) inline
                if (ctx.type === 'valuesTuple') {
                    add(')', true);
                    i++;
                    continue;
                }
                // EXISTS block: ) on its own line matching ( indentation
                if (ctx.type === 'existsBlock') {
                    ibase = Math.max(0, ibase - 2);
                    emit();
                    line = '  '.repeat(ibase + (ctx.atContent ? 1 : 0)) + ')';
                    i++;
                    continue;
                }
                // Subquery: ) on its own line matching ( indentation
                if (ctx.type === 'subquery') {
                    ibase = Math.max(0, ibase - 2);
                    emit();
                    line = '  '.repeat(ibase + 1) + ')';
                    clause = '';
                    inContent = false;
                    i++;
                    continue;
                }
                if (ctx.type === 'overBlock') {
                    funcParen--;
                    ibase = Math.max(0, ibase - 1);
                    emit();
                    line = '  '.repeat(ibase + 1) + ')';
                    i++;
                    continue;
                }
                if (ctx.type === 'createBlock') {
                    ibase = Math.max(0, ibase - 1);
                    emit();
                    line = '  '.repeat(ibase) + ')';
                    clause = '';
                    inContent = false;
                    i++;
                    continue;
                }
                add(')');
                i++;
                continue;
            }

            // Comma handling
            if (tok.type === 'comma') {
                // Inside function calls: comma + space, no line break
                if (funcParen > 0 && parenStack.length > 0 && (parenStack[parenStack.length - 1].type === 'func' || parenStack[parenStack.length - 1].type === 'overBlock')) {
                    add(',', true);
                    line += ' ';
                    i++;
                    continue;
                }
                // Inside createBlock (CREATE TABLE columns): per-line
                var inCreateBlock = parenStack.length > 0 && parenStack[parenStack.length - 1].type === 'createBlock';
                if (inCreateBlock) {
                    line += ',';
                    emit();
                    contentLine();
                    i++;
                    continue;
                }
                // Inside function calls: comma + space, no line break
                if (funcParen > 0) {
                    add(',', true);
                    line += ' ';
                    i++;
                    continue;
                }
                // Inside clause lists: trailing comma + line break
                if (clause === 'SELECT' || clause === 'GROUP BY' || clause === 'ORDER BY' || clause === 'SET') {
                    line += ',';
                    emit();
                    contentLine();
                    i++;
                    continue;
                }
                // FIX 4: VALUES with no paren stack (between tuples): per-line
                if (clause === 'VALUES' && parenStack.length === 0) {
                    line += ',';
                    emit();
                    contentLine();
                    i++;
                    continue;
                }
                // VALUES with paren stack (inside tuple): inline
                if (clause === 'VALUES') {
                    add(',', true);
                    line += ' ';
                    i++;
                    continue;
                }
                // Empty output state: new line
                if (clause === '' && funcParen === 0 && out.length === 0) {
                    emit();
                    contentLine();
                    i++;
                    continue;
                }
                // Fallback
                add(',', true);
                line += ' ';
                i++;
                continue;
            }

            // Operators
            if (tok.type === 'operator') {
                if (funcParen > 0) {
                    line += tok.value;
                } else {
                    if (line.length > 0 && !/[\s(]$/.test(line)) {
                        line += ' ' + tok.value + ' ';
                    } else {
                        line += tok.value + ' ';
                    }
                }
                i++;
                continue;
            }

            // Star (special case for COUNT(*))
            if (tok.type === 'star') {
                if (funcParen > 0 || (line.length > 0 && /\($/.test(line))) {
                    add('*', true);
                } else {
                    contentLine();
                    add('*');
                }
                i++;
                continue;
            }

            // Dot: no spaces
            if (tok.type === 'dot') {
                line += '.';
                i++;
                continue;
            }

            // Names, strings, numbers
            if (tok.type === 'name' || tok.type === 'string' || tok.type === 'number') {
                contentLine();
                add(tok.value);
                i++;
                continue;
            }

            i++;
        }

        emit();
        return out.join('\n');
    }

    /* ===== UTILITIES ===== */

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
