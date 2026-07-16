/* ============================================
   GO TOOLLY - CSV VIEWER
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var csvInput = document.getElementById('csv-input');
    var fileInput = document.getElementById('file-input');
    var loadBtn = document.getElementById('load-btn');
    var resetBtn = document.getElementById('reset-btn');
    var downloadBtn = document.getElementById('download-btn');
    var exportJsonBtn = document.getElementById('export-json-btn');
    var searchInput = document.getElementById('search-input');
    var tableContainer = document.getElementById('table-container');
    var tableHead = document.getElementById('table-head');
    var tableBody = document.getElementById('table-body');
    var rowCount = document.getElementById('row-count');
    var paginationArea = document.getElementById('pagination-area');
    var pageInfo = document.getElementById('page-info');
    var prevPageBtn = document.getElementById('prev-page');
    var nextPageBtn = document.getElementById('next-page');

    var allRows = [];
    var headers = [];
    var currentPage = 1;
    var pageSize = 50;
    var filteredRows = [];
    var currentDelimiter = ',';

    loadBtn.addEventListener('click', loadCsv);
    resetBtn.addEventListener('click', resetTool);
    downloadBtn.addEventListener('click', downloadCsv);
    exportJsonBtn.addEventListener('click', exportJson);
    searchInput.addEventListener('input', function() { currentPage = 1; renderTable(); });
    prevPageBtn.addEventListener('click', function() { if (currentPage > 1) { currentPage--; renderTable(); } });
    nextPageBtn.addEventListener('click', function() { var totalPages = Math.ceil(filteredRows.length / pageSize); if (currentPage < totalPages) { currentPage++; renderTable(); } });

    fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            csvInput.value = ev.target.result;
        };
        reader.readAsText(file);
    });

    function detectDelimiter(text) {
        var firstLine = text.split('\n')[0];
        var commas = (firstLine.match(/,/g) || []).length;
        var tabs = (firstLine.match(/\t/g) || []).length;
        var semicolons = (firstLine.match(/;/g) || []).length;
        if (tabs > commas && tabs > semicolons) return '\t';
        if (semicolons > commas && semicolons > tabs) return ';';
        return ',';
    }

    function parseCSV(text, delimiter) {
        var rows = [];
        var currentRow = [];
        var currentField = '';
        var inQuotes = false;
        for (var i = 0; i < text.length; i++) {
            var ch = text[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (text[i+1] === '"') { currentField += '"'; i++; }
                    else { inQuotes = false; }
                } else { currentField += ch; }
            } else {
                if (ch === '"') { inQuotes = true; }
                else if (ch === delimiter) { currentRow.push(currentField); currentField = ''; }
                else if (ch === '\n') { currentRow.push(currentField); if (currentRow.length > 0 && currentRow.some(function(f) { return f.trim(); })) rows.push(currentRow); currentRow = []; currentField = ''; }
                else if (ch === '\r') { }
                else { currentField += ch; }
            }
        }
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow[0] !== '') rows.push(currentRow);
        return rows;
    }

    function loadCsv() {
        var text = csvInput.value;
        if (!text.trim()) {
            showNotification('Please paste CSV text or upload a file', true);
            return;
        }

        currentDelimiter = detectDelimiter(text);
        var rows = parseCSV(text, currentDelimiter);
        if (rows.length < 1) {
            showNotification('No data found in CSV', true);
            return;
        }

        headers = rows[0];
        allRows = rows.slice(1);
        currentPage = 1;
        renderTable();
        tableContainer.style.display = 'block';
        rowCount.textContent = allRows.length + ' rows';
        downloadBtn.disabled = false;
        exportJsonBtn.disabled = false;
    }

    function renderTable() {
        var query = searchInput.value.toLowerCase().trim();

        if (query) {
            filteredRows = allRows.filter(function(row) {
                return row.some(function(field) {
                    return field.toLowerCase().indexOf(query) !== -1;
                });
            });
        } else {
            filteredRows = allRows.slice();
        }

        var totalPages = Math.ceil(filteredRows.length / pageSize);
        var start = (currentPage - 1) * pageSize;
        var end = Math.min(start + pageSize, filteredRows.length);
        var pageRows = filteredRows.slice(start, end);

        var theadHtml = '<tr>';
        for (var i = 0; i < headers.length; i++) {
            theadHtml += '<th data-col="' + i + '">' + escapeHtml(headers[i]) + ' <i class="fas fa-sort" style="font-size:10px;opacity:.5"></i></th>';
        }
        theadHtml += '</tr>';
        tableHead.innerHTML = theadHtml;

        var tbodyHtml = '';
        for (var r = 0; r < pageRows.length; r++) {
            tbodyHtml += '<tr>';
            for (var c = 0; c < headers.length; c++) {
                tbodyHtml += '<td>' + escapeHtml(pageRows[r][c] || '') + '</td>';
            }
            tbodyHtml += '</tr>';
        }
        tableBody.innerHTML = tbodyHtml;

        pageInfo.textContent = 'Page ' + currentPage + ' of ' + Math.max(1, totalPages) + ' (' + filteredRows.length + ' total)';
        prevPageBtn.disabled = currentPage <= 1;
        nextPageBtn.disabled = currentPage >= totalPages;
        rowCount.textContent = filteredRows.length + ' rows (filtered)';

        // Sort on click
        var ths = tableHead.querySelectorAll('th');
        for (var i = 0; i < ths.length; i++) {
            (function(col) {
                ths[col].style.cursor = 'pointer';
                ths[col].addEventListener('click', function() {
                    sortTable(col);
                });
            })(i);
        }
    }

    var sortAsc = true;
    var lastSortCol = -1;

    function sortTable(col) {
        if (lastSortCol === col) {
            sortAsc = !sortAsc;
        } else {
            sortAsc = true;
            lastSortCol = col;
        }

        allRows.sort(function(a, b) {
            var va = (a[col] || '').toLowerCase();
            var vb = (b[col] || '').toLowerCase();
            if (va < vb) return sortAsc ? -1 : 1;
            if (va > vb) return sortAsc ? 1 : -1;
            return 0;
        });

        currentPage = 1;
        renderTable();
    }

    function downloadCsv() {
        var csv = headers.join(currentDelimiter) + '\n';
        for (var i = 0; i < filteredRows.length; i++) {
            var row = filteredRows[i].map(function(f) {
                if (f.indexOf('"') !== -1 || f.indexOf(currentDelimiter) !== -1 || f.indexOf('\n') !== -1) {
                    return '"' + f.replace(/"/g, '""') + '"';
                }
                return f;
            });
            csv += row.join(currentDelimiter) + '\n';
        }

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cleaned-data.csv';
        link.click();
        setTimeout(function() { URL.revokeObjectURL(link.href); }, 100);
    }

    function exportJson() {
        var result = [];
        for (var i = 0; i < filteredRows.length; i++) {
            var obj = {};
            for (var j = 0; j < headers.length; j++) {
                obj[headers[j]] = filteredRows[i][j] || '';
            }
            result.push(obj);
        }

        var json = JSON.stringify(result, null, 2);
        var blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.json';
        link.click();
        setTimeout(function() { URL.revokeObjectURL(link.href); }, 100);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function resetTool() {
        csvInput.value = '';
        fileInput.value = '';
        searchInput.value = '';
        tableContainer.style.display = 'none';
        rowCount.textContent = '0 rows';
        allRows = [];
        headers = [];
        filteredRows = [];
        currentPage = 1;
        downloadBtn.disabled = true;
        exportJsonBtn.disabled = true;
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
