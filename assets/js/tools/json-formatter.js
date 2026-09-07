/* ============================================
   GO TOOLLY - JSON FORMATTER & VALIDATOR
   Professional JSON formatter with syntax highlighting, validation & export
   ============================================ */

(function(){'use strict';var state={results:null,history:[]};var elements={};

function init(){elements={input:document.getElementById('json-input'),output:document.getElementById('json-output'),status:document.getElementById('json-status-badge'),formatBtn:document.getElementById('format-btn'),minifyBtn:document.getElementById('minify-btn'),copyBtn:document.getElementById('copy-btn'),clearBtn:document.getElementById('clear-btn'),resultArea:document.getElementById('result-area'),emptyState:document.getElementById('empty-state'),statusBadge:document.getElementById('status-badge'),exportSection:document.getElementById('export-section'),exportCopy:document.getElementById('export-copy'),exportTxt:document.getElementById('export-txt'),exportJson:document.getElementById('export-json'),exportPrint:document.getElementById('export-print'),comparisonSection:document.getElementById('comparison-section'),comparisonSelect:document.getElementById('comparison-select'),comparisonTable:document.getElementById('comparison-table'),historySection:document.getElementById('history-section'),historyList:document.getElementById('history-list'),statKeys:document.getElementById('stat-keys'),statDepth:document.getElementById('stat-depth'),statSize:document.getElementById('stat-size'),statChars:document.getElementById('stat-chars'),statLines:document.getElementById('stat-lines'),statOriginal:document.getElementById('stat-original'),statFormatted:document.getElementById('stat-formatted'),statRatio:document.getElementById('stat-change'),statTime:document.getElementById('stat-delta')};
elements.formatBtn.addEventListener('click',function(){formatJSON(false);});elements.minifyBtn.addEventListener('click',function(){minifyJSON();});elements.clearBtn.addEventListener('click',clearAll);elements.input.addEventListener('input',function(){if(elements.input.value.trim()){updateStatus('ready','Ready');}else{updateStatus('','');}});
if(elements.exportCopy)elements.exportCopy.addEventListener('click',exportCopy);if(elements.exportTxt)elements.exportTxt.addEventListener('click',exportTxt);if(elements.exportJson)elements.exportJson.addEventListener('click',exportJson);if(elements.exportPrint)elements.exportPrint.addEventListener('click',exportPrint);if(elements.comparisonSelect)elements.comparisonSelect.addEventListener('change',onComparisonChange);showEmptyState();}

function updateStatus(type,text){if(elements.statusBadge){elements.statusBadge.className='status-badge'+(type?' '+type:'');elements.statusBadge.textContent=text;}}

function showEmptyState(){if(elements.emptyState)elements.emptyState.style.display='flex';if(elements.resultArea)elements.resultArea.style.display='none';}

function showResults(){if(elements.emptyState)elements.emptyState.style.display='none';if(elements.resultArea){elements.resultArea.style.display='block';elements.resultArea.classList.add('show');}}

function formatJSON(fromMinify,origSizeOverride){var raw=elements.input.value.trim();if(!raw){showToast('Please enter JSON data','error');return;}
updateStatus('processing','Validating...');
setTimeout(function(){var t0=performance.now();
try{var parsed=JSON.parse(raw);var formatted=fromMinify?JSON.stringify(parsed):JSON.stringify(parsed,null,2);var html=syntaxHighlight(formatted);var t1=performance.now();elements.output.innerHTML=html;
var keys=countKeys(parsed);var depth=getDepth(parsed);var formattedSize=new Blob([formatted]).size;var originalSize=(typeof origSizeOverride==='number')?origSizeOverride:raw.length;var diff=formattedSize-originalSize;var pct=originalSize>0?((diff/originalSize)*100):0;var lines=formatted.split('\n').length;
var stats={originalSize:originalSize,formattedSize:formattedSize,diff:diff,pct:pct,keys:keys,depth:depth,lines:lines,chars:formatted.length,size:formattedSize,result:formatted,input:raw.substring(0,80)+(raw.length>80?'...':''),time:t1-t0};
state.results=stats;if(state.history.length>=5)state.history.shift();state.history.push(stats);
elements.statKeys.textContent=keys;elements.statDepth.textContent=depth;elements.statSize.textContent=formatBytes(formattedSize);
elements.statChars.textContent=formatted.length.toLocaleString();elements.statLines.textContent=lines;
elements.statOriginal.textContent=formatBytes(originalSize);elements.statFormatted.textContent=formatBytes(formattedSize);
var iconUp='<span style="color:#16a34a">\u2191</span>',iconDown='<span style="color:#dc2626">\u2193</span>',iconSame='<span style="color:#64748b">\u2713</span>';
if(diff>0)elements.statRatio.innerHTML=iconUp+' +'+diff+' B ('+pct.toFixed(1)+'%)';
else if(diff<0)elements.statRatio.innerHTML=iconDown+' '+diff+' B ('+pct.toFixed(1)+'%)';
else elements.statRatio.innerHTML=iconSame+' No Change';
if(elements.statTime)elements.statTime.textContent=(t1-t0)<1?'<1ms':Math.round(t1-t0)+'ms';
if(elements.status){elements.status.className='json-status valid';elements.status.textContent='Valid JSON';elements.status.style.display='inline-block';}
showResults();updateStatus('done','Valid');
if(elements.exportSection)elements.exportSection.style.display='flex';
renderComparison();renderHistory();}
catch(e){var t1=performance.now();elements.output.innerHTML='<div class="json-error">Error: '+escapeHtml(e.message)+'</div>';
if(elements.status){elements.status.className='json-status invalid';elements.status.textContent='Invalid: '+escapeHtml(e.message.substring(0,60));elements.status.style.display='inline-block';}
if(elements.resultArea)elements.resultArea.style.display='block';
updateStatus('error','Error');
var stats={error:e.message,originalSize:raw.length,formattedSize:0,input:raw.substring(0,80)+(raw.length>80?'...':''),time:t1-t0};
state.results=stats;if(state.history.length>=5)state.history.shift();state.history.push(stats);renderHistory();}},100);}

function minifyJSON(){var raw=elements.input.value.trim();if(!raw){showToast('Please enter JSON data','error');return;}
try{var parsed=JSON.parse(raw);var minified=JSON.stringify(parsed);var origSize=raw.length;elements.input.value=minified;formatJSON(true,origSize);showToast('Minified successfully','success');}catch(e){showToast('Invalid JSON: '+e.message,'error');}}

function syntaxHighlight(json){json=escapeHtml(json);
return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g,function(match){var cls='json-number';
if(/^"/.test(match)){if(/:$/.test(match)){cls='json-key';match=match.replace(/:$/,'')+':';}else{cls='json-string';}}else if(/true|false/.test(match)){cls='json-boolean';}else if(/null/.test(match)){cls='json-null';}
return '<span class="'+cls+'">'+match+'</span>';})
.split('\n').map(function(line,i){return '<div class="json-line">'+line+'</div>';}).join('');}

function escapeHtml(str){if(typeof str!=='string')return'';return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function countKeys(obj){if(typeof obj!=='object'||obj===null)return 0;var c=Array.isArray(obj)?obj.length:Object.keys(obj).length;for(var k in obj){if(obj.hasOwnProperty(k))c+=countKeys(obj[k]);}return c;}

function getDepth(obj){if(typeof obj!=='object'||obj===null)return 0;var d=1;for(var k in obj){if(obj.hasOwnProperty(k))d=Math.max(d,1+getDepth(obj[k]));}return d;}

function renderComparison(){if(!elements.comparisonSelect||!elements.comparisonTable)return;
var available=state.history.filter(function(item){return!state.results||item.input!==state.results.input;});
if(available.length===0){if(elements.comparisonSection)elements.comparisonSection.style.display='none';return;}
if(elements.comparisonSection)elements.comparisonSection.style.display='block';
var html='<option value="">Select previous...</option>';
available.forEach(function(item,i){var idx=state.history.indexOf(item);
html+='<option value="'+idx+'">'+(item.error?'Parse Error: ':'JSON: ')+item.input+' ('+(item.keys||'?')+' keys)</option>';});
elements.comparisonSelect.innerHTML=html;}

function onComparisonChange(){var idx=parseInt(elements.comparisonSelect.value);
if(isNaN(idx)||!state.history[idx]||!state.results){elements.comparisonTable.innerHTML='';return;}
var prev=state.history[idx];var curr=state.results;
var metrics=[{label:'Keys',curr:curr.keys||0,prev:prev.keys||0},{label:'Depth',curr:curr.depth||0,prev:prev.depth||0},{label:'Lines',curr:curr.lines||0,prev:prev.lines||0},{label:'Original Size',curr:formatBytes(curr.originalSize),prev:formatBytes(prev.originalSize)},{label:'Formatted Size',curr:formatBytes(curr.formattedSize||0),prev:formatBytes(prev.formattedSize||0)},{label:'Change',curr:typeof curr.diff==='number'?(curr.diff>=0?'+':'')+curr.diff+' B':'N/A',prev:typeof prev.diff==='number'?(prev.diff>=0?'+':'')+prev.diff+' B':'N/A'}];
if(curr.error&&prev.error){metrics=[{label:'Status',curr:'Invalid',prev:'Invalid'}];}
var html='<table class="comparison-table"><thead><tr><th>Metric</th><th>Current</th><th>Previous</th><th>Change</th></tr></thead><tbody>';
metrics.forEach(function(m){var diff=typeof m.curr==='number'?m.curr-m.prev:0;
var arrow=diff>0?'<span class="comp-up">+'+diff+'</span>':diff<0?'<span class="comp-down">'+diff+'</span>':'<span class="comp-same">0</span>';
html+='<tr><td>'+m.label+'</td><td>'+m.curr+'</td><td>'+m.prev+'</td><td>'+arrow+'</td></tr>';});
html+='</tbody></table>';elements.comparisonTable.innerHTML=html;}

function renderHistory(){if(!elements.historyList)return;
if(state.history.length<=1){if(elements.historySection)elements.historySection.style.display='none';return;}
if(elements.historySection)elements.historySection.style.display='block';
var html='';for(var i=state.history.length-1;i>=0;i--){var item=state.history[i];
var active=state.results&&item.input===state.results.input&&!item.error?' style="border-color:var(--color-primary);background:rgba(37,99,235,0.05)"':'';
var label=item.error?'<span style="color:#ef4444">Parse Error</span>':'<span class="history-time">Formatted</span>';
html+='<div class="history-item"'+active+'><div class="history-meta">'+label+'<span class="history-size">'+(item.keys||'?')+' keys | depth '+(item.depth||'?')+'</span></div><div class="history-lines">'+(item.lines||0)+' lines</div></div>';}
elements.historyList.innerHTML=html;}

function exportCopy(){if(!state.results)return;if(navigator.clipboard){navigator.clipboard.writeText(state.results.result).then(function(){showToast('Copied to clipboard!','success');});}else{fallbackCopy(state.results.result);}}

function exportTxt(){if(!state.results)return;var r=state.results;var text='JSON Formatting Report\n======================\n\nKeys: '+r.keys+'\nDepth: '+r.depth+'\nLines: '+r.lines+'\nOriginal Size: '+formatBytes(r.originalSize)+'\nFormatted Size: '+formatBytes(r.formattedSize)+'\n\n--- Formatted JSON ---\n\n'+(r.result||'');downloadFile('json-formatted.txt',text,'text/plain');showToast('Downloaded TXT report','success');}

function exportJson(){if(!state.results)return;var json=JSON.stringify({originalSize:state.results.originalSize,formattedSize:state.results.formattedSize,keys:state.results.keys,depth:state.results.depth,lines:state.results.lines,output:state.results.result,timestamp:new Date().toISOString()},null,2);downloadFile('json-formatted.json',json,'application/json');showToast('Downloaded JSON report','success');}

function exportPrint(){window.print();}
function downloadFile(filename,content,mimeType){var blob=new Blob([content],{type:mimeType});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}
function fallbackCopy(text){var ta=document.createElement('textarea');ta.style.cssText='position:fixed;opacity:0';ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('Copied!','success');}catch(e){showToast('Failed to copy','error');}document.body.removeChild(ta);}
function clearAll(){elements.input.value='';elements.output.innerHTML='<div style="color:var(--color-text-light);text-align:center;padding:var(--space-8)">Formatted JSON will appear here</div>';if(elements.status){elements.status.textContent='';elements.status.style.display='none';}state.results=null;state.history=[];if(elements.comparisonTable)elements.comparisonTable.innerHTML='';updateStatus('','');showEmptyState();if(elements.exportSection)elements.exportSection.style.display='none';if(elements.historySection)elements.historySection.style.display='none';}
function formatBytes(bytes){if(!bytes)return'0 B';if(bytes<1024)return bytes+' B';if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';return(bytes/1048576).toFixed(1)+' MB';}
function showToast(msg,type){var existing=document.querySelector('.toast');if(existing)existing.remove();var el=document.createElement('div');el.className='toast '+(type||'info');el.textContent=msg;document.body.appendChild(el);setTimeout(function(){el.classList.add('show');},10);setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},300);},3000);}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}})();
