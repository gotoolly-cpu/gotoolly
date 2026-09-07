/* ============================================
   GO TOOLLY - CSV VIEWER
   Professional CSV viewer with sort, filter, pagination & export
   ============================================ */

(function(){'use strict';var state={results:null,history:[]};var elements={};

function init(){elements={input:document.getElementById('csv-input'),fileInput:document.getElementById('file-input'),loadBtn:document.getElementById('load-btn'),resetBtn:document.getElementById('reset-btn'),downloadBtn:document.getElementById('download-btn'),exportJsonBtn:document.getElementById('export-json-btn'),searchInput:document.getElementById('search-input'),tableContainer:document.getElementById('table-container'),tableHead:document.getElementById('table-head'),tableBody:document.getElementById('table-body'),rowCount:document.getElementById('row-count'),paginationArea:document.getElementById('pagination-area'),pageInfo:document.getElementById('page-info'),prevPageBtn:document.getElementById('prev-page'),nextPageBtn:document.getElementById('next-page'),emptyState:document.getElementById('empty-state'),statusBadge:document.getElementById('status-badge'),exportSection:document.getElementById('export-section'),exportCopy:document.getElementById('export-copy'),exportTxt:document.getElementById('export-txt'),exportJson:document.getElementById('export-json'),exportPrint:document.getElementById('export-print'),comparisonSection:document.getElementById('comparison-section'),comparisonSelect:document.getElementById('comparison-select'),comparisonTable:document.getElementById('comparison-table'),historySection:document.getElementById('history-section'),historyList:document.getElementById('history-list'),statRows:document.getElementById('stat-rows'),statCols:document.getElementById('stat-cols'),statSize:document.getElementById('stat-size'),statFiltered:document.getElementById('stat-filtered'),statPages:document.getElementById('stat-pages'),statTime:document.getElementById('stat-delta')};
elements.loadBtn.addEventListener('click',loadCsv);elements.resetBtn.addEventListener('click',reset);elements.downloadBtn.addEventListener('click',downloadCsv);elements.exportJsonBtn.addEventListener('click',exportJson);elements.searchInput.addEventListener('input',function(){currentPage=1;renderTable();});elements.prevPageBtn.addEventListener('click',function(){if(currentPage>1){currentPage--;renderTable();}});elements.nextPageBtn.addEventListener('click',function(){var tp=Math.ceil(filteredRows.length/pageSize);if(currentPage<tp){currentPage++;renderTable();}});elements.fileInput.addEventListener('change',function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(ev){elements.input.value=ev.target.result;};reader.readAsText(file);});
if(elements.exportCopy)elements.exportCopy.addEventListener('click',exportCopy);if(elements.exportTxt)elements.exportTxt.addEventListener('click',exportTxtReport);if(elements.exportJson)elements.exportJson.addEventListener('click',exportJson);if(elements.exportPrint)elements.exportPrint.addEventListener('click',exportPrint);if(elements.comparisonSelect)elements.comparisonSelect.addEventListener('change',onComparisonChange);showEmptyState();}

var allRows=[],headers=[],currentPage=1,pageSize=50,filteredRows=[],currentDelimiter=',',sortAsc=true,lastSortCol=-1;

function updateStatus(type,text){if(elements.statusBadge){elements.statusBadge.className='status-badge'+(type?' '+type:'');elements.statusBadge.textContent=text;}}

function showEmptyState(){if(elements.emptyState)elements.emptyState.style.display='flex';if(elements.tableContainer)elements.tableContainer.style.display='none';if(elements.exportSection)elements.exportSection.style.display='none';var ra=document.getElementById('result-area');if(ra){ra.style.display='none';ra.classList.remove('show');}}

function showResults(){if(elements.emptyState)elements.emptyState.style.display='none';var ra=document.getElementById('result-area');if(ra){ra.style.display='block';ra.classList.add('show');}if(elements.tableContainer){elements.tableContainer.style.display='block';}}

function detectDelimiter(text){var fl=text.split('\n')[0];var c=(fl.match(/,/g)||[]).length;var t=(fl.match(/\t/g)||[]).length;var s=(fl.match(/;/g)||[]).length;if(t>c&&t>s)return'\t';if(s>c&&s>t)return';';return',';}

function parseCSV(text,delimiter){var rows=[],currentRow=[],currentField='',inQuotes=false;for(var i=0;i<text.length;i++){var ch=text[i];if(inQuotes){if(ch==='"'){if(text[i+1]==='"'){currentField+='"';i++;}else{inQuotes=false;}}else{currentField+=ch;}}else{if(ch==='"'){inQuotes=true;}else if(ch===delimiter){currentRow.push(currentField);currentField='';}else if(ch==='\n'){currentRow.push(currentField);if(currentRow.length>0&&currentRow.some(function(f){return f.trim();}))rows.push(currentRow);currentRow=[];currentField='';}else if(ch==='\r'){}else{currentField+=ch;}}}currentRow.push(currentField);if(currentRow.length>0&&currentRow[0]!=='')rows.push(currentRow);return rows;}

function loadCsv(){var text=elements.input.value.trim();if(!text){showToast('Please paste CSV data or upload a file','error');return;}
updateStatus('processing','Processing...');
setTimeout(function(){var t0=performance.now();
currentDelimiter=detectDelimiter(text);var rows=parseCSV(text,currentDelimiter);if(rows.length<1){showToast('No data found in CSV','error');updateStatus('error','Error');return;}
headers=rows[0];allRows=rows.slice(1);currentPage=1;renderTable();var t1=performance.now();
var originalSize=text.length;var totalPages=Math.ceil(filteredRows.length/pageSize);
var stats={originalSize:originalSize,cols:headers.length,rows:allRows.length,filtered:filteredRows.length,pages:Math.max(1,totalPages),time:t1-t0,input:text.substring(0,80)+(text.length>80?'...':''),delimiter:currentDelimiter};
state.results=stats;if(state.history.length>=5)state.history.shift();state.history.push(stats);
showResults();
elements.statRows.textContent=allRows.length;elements.statCols.textContent=headers.length;
elements.statSize.textContent=formatBytes(originalSize);elements.statFiltered.textContent=filteredRows.length;
elements.statPages.textContent=Math.max(1,totalPages);if(elements.statTime)elements.statTime.textContent=(t1-t0)<1?'<1ms':Math.round(t1-t0)+'ms';
elements.downloadBtn.disabled=false;elements.exportJsonBtn.disabled=false;
updateStatus('done','Completed');
if(elements.exportSection)elements.exportSection.style.display='flex';
renderComparison();renderHistory();},100);}

function renderTable(){var query=elements.searchInput.value.toLowerCase().trim();
if(query){filteredRows=allRows.filter(function(row){return row.some(function(field){return (field||'').toLowerCase().indexOf(query)!==-1;});});}else{filteredRows=allRows.slice();}
var totalPages=Math.ceil(filteredRows.length/pageSize);var start=(currentPage-1)*pageSize;var end=Math.min(start+pageSize,filteredRows.length);var pageRows=filteredRows.slice(start,end);
var theadHtml='<tr>';for(var i=0;i<headers.length;i++){theadHtml+='<th data-col="'+i+'">'+escapeHtml(headers[i])+' <i class="fas fa-sort" style="font-size:10px;opacity:.5"></i></th>';}theadHtml+='</tr>';elements.tableHead.innerHTML=theadHtml;
var tbodyHtml='';for(var r=0;r<pageRows.length;r++){tbodyHtml+='<tr>';for(var c=0;c<headers.length;c++){tbodyHtml+='<td>'+cellContent(pageRows[r][c])+'</td>';}tbodyHtml+='</tr>';}elements.tableBody.innerHTML=tbodyHtml;
elements.pageInfo.textContent='Page '+currentPage+' of '+Math.max(1,totalPages)+' ('+filteredRows.length+' total)';
elements.prevPageBtn.disabled=currentPage<=1;elements.nextPageBtn.disabled=currentPage>=totalPages;
if(query!==''||filteredRows.length!==allRows.length){elements.rowCount.textContent=filteredRows.length+' rows (filtered)';}else{elements.rowCount.textContent=allRows.length+' rows';}
var ths=elements.tableHead.querySelectorAll('th');for(i=0;i<ths.length;i++){(function(col){ths[col].style.cursor='pointer';ths[col].addEventListener('click',function(){sortTable(col);});})(i);}}

function sortTable(col){if(lastSortCol===col){sortAsc=!sortAsc;}else{sortAsc=true;lastSortCol=col;}
allRows.sort(function(a,b){var va=(a[col]||'').toLowerCase();var vb=(b[col]||'').toLowerCase();if(va<vb)return sortAsc?-1:1;if(va>vb)return sortAsc?1:-1;return 0;});currentPage=1;renderTable();}

function downloadCsv(){var csv=headers.join(currentDelimiter)+'\n';for(var i=0;i<filteredRows.length;i++){var row=filteredRows[i].map(function(f){if(f.indexOf('"')!==-1||f.indexOf(currentDelimiter)!==-1||f.indexOf('\n')!==-1){return'"'+f.replace(/"/g,'""')+'"';}return f;});csv+=row.join(currentDelimiter)+'\n';}
var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});var link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='cleaned-data.csv';link.click();setTimeout(function(){URL.revokeObjectURL(link.href);},100);showToast('Downloaded CSV','success');}

function exportJson(){var result=[];for(var i=0;i<filteredRows.length;i++){var obj={};for(var j=0;j<headers.length;j++){obj[headers[j]]=filteredRows[i][j]||'';}result.push(obj);}
var json=JSON.stringify(result,null,2);var blob=new Blob([json],{type:'application/json;charset=utf-8;'});var link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='data.json';link.click();setTimeout(function(){URL.revokeObjectURL(link.href);},100);showToast('Downloaded JSON','success');}

function escapeHtml(str){if(typeof str!=='string')return'';return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function cellContent(text){var escaped=escapeHtml(text||'');var lines=(text||'').split('\n');if(lines.length>4&&(text||'').length>200){return '<span class="cell-text clamped">'+escaped+'</span><button class="cell-expand-btn" type="button">&#9660;</button>';}return '<span class="cell-text">'+escaped+'</span>';}

function renderComparison(){if(!elements.comparisonSelect||!elements.comparisonTable)return;
var available=state.history.filter(function(item){return!state.results||item.input!==state.results.input;});
if(available.length===0){if(elements.comparisonSection)elements.comparisonSection.style.display='none';return;}
if(elements.comparisonSection)elements.comparisonSection.style.display='block';
var html='<option value="">Select previous...</option>';
available.forEach(function(item,i){var idx=state.history.indexOf(item);
html+='<option value="'+idx+'">Data: '+item.input+' ('+item.rows+' rows, '+item.cols+' cols)</option>';});
elements.comparisonSelect.innerHTML=html;}

function onComparisonChange(){var idx=parseInt(elements.comparisonSelect.value);
if(isNaN(idx)||!state.history[idx]||!state.results){elements.comparisonTable.innerHTML='';return;}
var prev=state.history[idx];var curr=state.results;
var metrics=[{label:'Rows',curr:curr.rows,prev:prev.rows},{label:'Columns',curr:curr.cols,prev:prev.cols},{label:'Filtered',curr:curr.filtered,prev:prev.filtered},{label:'Pages',curr:curr.pages,prev:prev.pages},{label:'Size',curr:formatBytes(curr.originalSize),prev:formatBytes(prev.originalSize)}];
var html='<table class="comparison-table"><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>';
metrics.forEach(function(m){var diff=typeof m.curr==='number'?m.curr-m.prev:0;
var arrow=diff>0?'<span class="comp-up">+'+diff+'</span>':diff<0?'<span class="comp-down">'+diff+'</span>':'<span class="comp-same">0</span>';
html+='<tr><td>'+m.label+'</td><td>'+m.curr+'</td><td>'+m.prev+'</td><td>'+arrow+'</td></tr>';});
html+='</tbody></table>';elements.comparisonTable.innerHTML=html;}

function renderHistory(){if(!elements.historyList)return;
if(state.history.length<=1){if(elements.historySection)elements.historySection.style.display='none';return;}
if(elements.historySection)elements.historySection.style.display='block';
var html='';for(var i=state.history.length-1;i>=0;i--){var item=state.history[i];
var active=state.results&&item.input===state.results.input?' style="border-color:var(--color-primary);background:rgba(37,99,235,0.05)"':'';
html+='<div class="history-item"'+active+'><div class="history-meta"><span class="history-time">CSV</span><span class="history-size">'+item.rows+' rows</span></div><div class="history-lines">'+item.cols+' columns</div></div>';}
elements.historyList.innerHTML=html;}

function exportCopy(){if(!state.results)return;var csv=headers.join(currentDelimiter)+'\n';for(var i=0;i<filteredRows.length;i++){csv+=filteredRows[i].join(currentDelimiter)+'\n';}
if(navigator.clipboard){navigator.clipboard.writeText(csv).then(function(){showToast('Copied to clipboard!','success');});}else{fallbackCopy(csv);}}

function exportTxtReport(){if(!state.results)return;var r=state.results;var text='CSV Viewer Report\n==================\n\nRows: '+r.rows+'\nColumns: '+r.cols+'\nFiltered: '+r.filtered+'\nPages: '+r.pages+'\nSize: '+formatBytes(r.originalSize)+'\n\n--- Data ---\n\n'+headers.join('\t')+'\n';for(var i=0;i<Math.min(filteredRows.length,100);i++){text+=filteredRows[i].join('\t')+'\n';}if(filteredRows.length>100)text+='... ('+(filteredRows.length-100)+' more rows)\n';downloadFile('csv-report.txt',text,'text/plain');showToast('Downloaded TXT report','success');}

function exportPrint(){window.print();}
function downloadFile(filename,content,mimeType){var blob=new Blob([content],{type:mimeType});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
function fallbackCopy(text){var ta=document.createElement('textarea');ta.style.cssText='position:fixed;opacity:0';ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('Copied!','success');}catch(e){showToast('Failed to copy','error');}document.body.removeChild(ta);}
function reset(){elements.input.value='';elements.fileInput.value='';elements.searchInput.value='';if(elements.tableContainer)elements.tableContainer.style.display='none';elements.rowCount.textContent='0 rows';var ra=document.getElementById('result-area');if(ra){ra.style.display='none';ra.classList.remove('show');}allRows=[];headers=[];filteredRows=[];currentPage=1;sortAsc=true;lastSortCol=-1;state.results=null;state.history=[];if(elements.comparisonTable)elements.comparisonTable.innerHTML='';updateStatus('','');showEmptyState();if(elements.exportSection)elements.exportSection.style.display='none';if(elements.historySection)elements.historySection.style.display='none';elements.downloadBtn.disabled=true;elements.exportJsonBtn.disabled=true;}
function showCellModal(text){var el=document.getElementById('cell-modal');var body=document.getElementById('cell-modal-body');if(!el||!body)return;body.textContent=text;el.style.display='flex';}
function hideCellModal(){var el=document.getElementById('cell-modal');if(el)el.style.display='none';}
document.addEventListener('click',function(e){var btn=e.target.closest('.cell-expand-btn');if(btn){var span=btn.previousElementSibling;if(span&&span.classList){span.classList.toggle('clamped');btn.innerHTML=span.classList.contains('clamped')?'&#9660;':'&#9650;';e.stopPropagation();return;}}var td=e.target.closest('td');if(td&&!e.target.closest('.cell-expand-btn')&&!e.target.closest('th')){var txt=td.querySelector('.cell-text');if(txt&&txt.textContent.length>0)showCellModal(txt.textContent);}});
document.addEventListener('click',function(e){if(e.target.closest('.cell-modal-backdrop')||e.target.closest('.cell-modal-close'))hideCellModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')hideCellModal();});
function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';return(bytes/1048576).toFixed(1)+' MB';}
function showToast(msg,type){var existing=document.querySelector('.toast');if(existing)existing.remove();var el=document.createElement('div');el.className='toast '+(type||'info');el.textContent=msg;document.body.appendChild(el);setTimeout(function(){el.classList.add('show');},10);setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},300);},3000);}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}})();
