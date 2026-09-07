/* ============================================
   GO TOOLLY - XML FORMATTER
   Professional XML formatter with syntax validation
   ============================================ */

(function(){'use strict';var state={results:null,history:[]};var elements={};

function init(){elements={input:document.getElementById('xml-input'),formatBtn:document.getElementById('format-btn'),minifyBtn:document.getElementById('minify-btn'),resetBtn:document.getElementById('reset-btn'),resultArea:document.getElementById('result-area'),emptyState:document.getElementById('empty-state'),statusBadge:document.getElementById('status-badge'),resultText:document.getElementById('result-text'),opBadge:document.getElementById('operation-badge'),statValidation:document.getElementById('stat-validation'),statElements:document.getElementById('stat-elements'),statAttrs:document.getElementById('stat-attrs'),statLines:document.getElementById('stat-lines'),statChars:document.getElementById('stat-chars'),statOriginal:document.getElementById('stat-original'),statFormatted:document.getElementById('stat-formatted'),statRatio:document.getElementById('stat-change'),statTime:document.getElementById('stat-delta'),exportSection:document.getElementById('export-section'),exportCopy:document.getElementById('export-copy'),exportTxt:document.getElementById('export-txt'),exportJson:document.getElementById('export-json'),exportPrint:document.getElementById('export-print'),comparisonSection:document.getElementById('comparison-section'),comparisonList:document.getElementById('comparison-previous-list'),comparisonEmpty:document.getElementById('comparison-empty'),comparisonResult:document.getElementById('comparison-result')};
elements.formatBtn.addEventListener('click',function(){process(false);});elements.minifyBtn.addEventListener('click',function(){process(true);});elements.resetBtn.addEventListener('click',reset);elements.input.addEventListener('input',onInput);
if(elements.exportCopy)elements.exportCopy.addEventListener('click',exportCopy);if(elements.exportTxt)elements.exportTxt.addEventListener('click',exportTxt);if(elements.exportJson)elements.exportJson.addEventListener('click',exportJson);if(elements.exportPrint)elements.exportPrint.addEventListener('click',exportPrint);if(elements.comparisonList)elements.comparisonList.addEventListener('click',function(e){var card=e.target.closest('.comparison-card');if(card){var idx=parseInt(card.getAttribute('data-idx'));if(!isNaN(idx)&&state.history[idx]&&state.results){if(elements.comparisonResult)elements.comparisonResult.scrollIntoView({behavior:'smooth',block:'nearest'});onComparisonChange(idx);}}});showEmptyState();}

function onInput(){updateStatus(elements.input.value.trim().length>0?'ready':'',elements.input.value.trim().length>0?'Ready':'');}

function updateStatus(type,text){if(elements.statusBadge){elements.statusBadge.className='status-badge'+(type?' '+type:'');elements.statusBadge.textContent=text;}}

function showEmptyState(){if(elements.emptyState)elements.emptyState.style.display='flex';if(elements.resultArea)elements.resultArea.style.display='none';}

function showResults(){if(elements.emptyState)elements.emptyState.style.display='none';if(elements.resultArea){elements.resultArea.style.display='block';elements.resultArea.classList.add('show');}}

function process(minify){
 var input=elements.input.value.trim();
 if(!input){showToast('Please enter XML code to format','error');return;}
 updateStatus('processing','Processing...');
 setTimeout(function(){
  try{
   var t0=performance.now();
   var parser=new DOMParser();
   var doc=parser.parseFromString(input,'text/xml');
   var errors=doc.getElementsByTagName('parsererror');
   var valid=true,errorDetails=null;
   if(errors.length>0){
    valid=false;
    var errEl=errors[0];
    var errText=errEl.textContent||errEl.innerText||'Unknown parse error';
    var lineMatch=errText.match(/line\s*(\d+)/i);
    var colMatch=errText.match(/column\s*(\d+)/i);
    var lineNum=lineMatch?lineMatch[1]:'';
    var colNum=colMatch?colMatch[1]:'';
    errorDetails={message:errText.replace(/^error:\s*/i,'').trim(),line:lineNum,column:colNum};
   }
   var serializer=new XMLSerializer();
   var raw=valid?serializer.serializeToString(doc):input;
   var result=minify?raw:prettyPrint(raw);
   var t1=performance.now();
   var originalSize=input.length;
   var formattedSize=result.length;
   var diff=formattedSize-originalSize;
   var pct=originalSize>0?((diff/originalSize)*100):0;
   var lines=result.split('\n').length;
   if(result.charAt(result.length-1)==='\n')lines=Math.max(1,lines-1);
   if(lines===0)lines=1;
   var elementsCount=valid?countElements(doc):0;
   var attrsCount=valid?countAttributes(doc):0;
   var chars=result.length;
   var stats={originalSize:originalSize,formattedSize:formattedSize,diff:diff,pct:pct,lines:lines,elements:elementsCount,attrs:attrsCount,chars:chars,size:formattedSize,result:result,input:input,minify:minify,time:t1-t0,valid:valid,errorDetails:errorDetails};
   state.results=stats;
    var lastIdx=state.history.length-1;if(lastIdx>=0&&state.history[lastIdx].input===stats.input&&state.history[lastIdx].minify===stats.minify){state.history[lastIdx]=stats;}else{if(state.history.length>=5)state.history.shift();state.history.push(stats);}
   elements.resultText.textContent=result;
   var opName=minify?'Minified':'Formatted';
   if(elements.opBadge){elements.opBadge.style.display='flex';elements.opBadge.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> '+opName+' XML';}
   if(elements.statValidation){
    if(valid){
     elements.statValidation.innerHTML='<span style="color:#16a34a;font-weight:700">&#10003; Valid</span>';
    }else{
     var errInfo=errorDetails.message;
     if(errorDetails.line)errInfo+=' (line '+errorDetails.line+(errorDetails.column?', col '+errorDetails.column:'')+')';
     elements.statValidation.innerHTML='<span style="color:#dc2626;font-weight:700">&#10007; Invalid</span><br><span style="font-size:11px;color:#dc2626">'+errInfo+'</span>';
    }
   }
   elements.statElements.textContent=elementsCount;
   elements.statAttrs.textContent=attrsCount;
   elements.statLines.textContent=lines;
   elements.statChars.textContent=chars.toLocaleString();
   elements.statOriginal.textContent=formatBytes(originalSize);
   elements.statFormatted.textContent=formatBytes(formattedSize);
   var iconUp='<span style="color:#16a34a">&#8593;</span>',iconDown='<span style="color:#dc2626">&#8595;</span>',iconSame='<span style="color:#64748b">&#10003;</span>';
    if(diff>0)elements.statRatio.innerHTML=iconUp+' +'+diff+' B ('+pct.toFixed(1)+'%)';
    else if(diff<0)elements.statRatio.innerHTML=iconDown+' '+diff+' B ('+pct.toFixed(1)+'%)';
    else elements.statRatio.innerHTML=iconSame+' No Change';
    if(elements.statTime)elements.statTime.textContent=(t1-t0)<1?'< 1 ms':Math.round(t1-t0)+' ms';
   var printTitle=document.querySelector('.print-report-title');var printDate=document.querySelector('.print-report-date');if(printTitle)printTitle.textContent='XML Formatting Report';if(printDate)printDate.textContent='Generated on '+new Date().toLocaleString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
  showResults();updateStatus('done','Completed');
  if(elements.exportSection)elements.exportSection.style.display='flex';
  renderComparison();
 }catch(e){showToast('Error: '+e.message,'error');updateStatus('error','Error');}
},100);
}

function prettyPrint(xml){
 xml=xml.replace(/>\s*</g,'>\n<');
 var lines=xml.split('\n');
 var indent=0;
 var result=[];
 for(var i=0;i<lines.length;i++){
  var line=lines[i].trim();
  if(!line)continue;
  if(line.startsWith('</'))indent--;
  result.push('  '.repeat(Math.max(0,indent))+line);
  if(line.startsWith('<')&&!line.startsWith('</')&&!line.startsWith('<?')&&!line.startsWith('<!')&&!line.endsWith('/>')&&line.indexOf('</')===-1&&line.indexOf('/>')===-1)indent++;
 }
 return result.join('\n');
}

function countElements(doc){
 return doc.getElementsByTagName('*').length;
}

function countAttributes(doc){
 var all=doc.getElementsByTagName('*');
 var count=0;
 for(var i=0;i<all.length;i++){
  count+=all[i].attributes.length;
 }
 return count;
}

function renderComparison(){
 if(!elements.comparisonList||!elements.comparisonResult||!elements.comparisonEmpty)return;
 var available=state.history.filter(function(item){return!state.results||item.input!==state.results.input||item.minify!==state.results.minify;});
 if(available.length===0){
  if(elements.comparisonSection)elements.comparisonSection.style.display='block';
  elements.comparisonList.innerHTML='';
  elements.comparisonResult.innerHTML='';
  elements.comparisonEmpty.style.display='block';
  return;
 }
 if(elements.comparisonSection)elements.comparisonSection.style.display='block';
 elements.comparisonEmpty.style.display='none';
 var html='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">';
 available.forEach(function(item,i){
  var idx=state.history.indexOf(item);
  var opLabel=item.minify?'Minified':'Formatted';
  var statusIcon=item.valid?'&#10003;':'&#10007;';
  var statusColor=item.valid?'#16a34a':'#dc2626';
  var sizeStr=formatBytes(item.formattedSize);
  html+='<div class="comparison-card" data-idx="'+idx+'" style="flex:1;min-width:180px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;cursor:pointer;transition:border-color .2s,box-shadow .2s">';
  html+='<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px">'+opLabel+'</div>';
  html+='<div style="font-size:12px;color:#64748b;line-height:1.8"><span style="color:'+statusColor+'">'+statusIcon+'</span> <span style="font-weight:500">'+(item.lines||'0')+'</span> lines &middot; <span style="font-weight:500">'+sizeStr+'</span></div>';
   html+='<div style="font-size:11px;color:#94a3b8;margin-top:4px">'+item.elements+' elements &middot; '+item.attrs+' attributes &middot; '+(item.time<1?'< 1 ms':Math.round(item.time)+' ms')+'</div>';
  html+='</div>';
 });
 html+='</div><div style="font-size:12px;color:#94a3b8;margin-top:-4px;margin-bottom:12px">Click a previous result to compare with current</div>';
 elements.comparisonList.innerHTML=html;
 elements.comparisonResult.innerHTML='';
}

function onComparisonChange(idx){
 if(!state.history[idx]||!state.results){if(elements.comparisonResult)elements.comparisonResult.innerHTML='';return;}
 var prev=state.history[idx];var curr=state.results;
 var prevOp=prev.minify?'Minified':'Formatted';
 var currOp=curr.minify?'Minified':'Formatted';
 var iconUp='<span style="color:#16a34a">&#8593;</span>',iconDown='<span style="color:#dc2626">&#8595;</span>',iconSame='<span style="color:#64748b">&#10003;</span>';

  function changeStr(val,old,unit){
   var d=val-old;unit=unit||'';
   if(d>0)return iconUp+' +'+d+unit;
   if(d<0)return iconDown+' '+d+unit;
   return iconSame+' 0'+unit;
  }

 var html='<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px">';
 html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';

 html+='<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px">';
 html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:8px">Current Result</div>';
 html+='<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:4px">'+currOp+' XML</div>';
 html+='<div style="font-size:12px;color:#64748b;line-height:1.7">';
 html+='Lines: <strong>'+curr.lines+'</strong><br>';
 html+='Elements: <strong>'+curr.elements+'</strong><br>';
 html+='Attributes: <strong>'+curr.attrs+'</strong><br>';
 html+='Size: <strong>'+formatBytes(curr.formattedSize)+'</strong><br>';
 html+='Time: <strong>'+(curr.time<1?'< 1 ms':Math.round(curr.time)+' ms')+'</strong>';
  html+='</div></div>';

  html+='<div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px">';
  html+='<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#64748b;margin-bottom:8px">Previous Result</div>';
  html+='<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:4px">'+prevOp+' XML</div>';
  html+='<div style="font-size:12px;color:#64748b;line-height:1.7">';
  html+='Lines: <strong>'+prev.lines+'</strong><br>';
  html+='Elements: <strong>'+prev.elements+'</strong><br>';
  html+='Attributes: <strong>'+prev.attrs+'</strong><br>';
  html+='Size: <strong>'+formatBytes(prev.formattedSize)+'</strong><br>';
  html+='Time: <strong>'+(prev.time<1?'< 1 ms':Math.round(prev.time)+' ms')+'</strong>';
 html+='</div></div>';

 html+='</div>';

 html+='<table style="width:100%;border-collapse:collapse;font-size:13px">';
 html+='<thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Metric</th><th style="padding:8px 12px;text-align:right;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Current</th><th style="padding:8px 12px;text-align:right;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Previous</th><th style="padding:8px 12px;text-align:right;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">Change</th></tr></thead><tbody>';
  var metrics=[
   {label:'Original Size',curr:formatBytes(curr.originalSize),prev:formatBytes(prev.originalSize),val:curr.originalSize,old:prev.originalSize,unit:' B'},
   {label:'Formatted Size',curr:formatBytes(curr.formattedSize),prev:formatBytes(prev.formattedSize),val:curr.formattedSize,old:prev.formattedSize,unit:' B'},
   {label:'Lines',curr:curr.lines,prev:prev.lines,val:curr.lines,old:prev.lines,unit:' lines'},
   {label:'Elements',curr:curr.elements,prev:prev.elements,val:curr.elements,old:prev.elements,unit:' elements'},
   {label:'Attributes',curr:curr.attrs,prev:prev.attrs,val:curr.attrs,old:prev.attrs,unit:' attributes'}
  ];
  metrics.forEach(function(m){
   var ch=changeStr(m.val,m.old,m.unit);
   html+='<tr><td style="padding:6px 12px;border-bottom:1px solid #f1f5f0;color:#475569">'+m.label+'</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f1f5f0;font-weight:500">'+m.curr+'</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f1f5f0;color:#64748b">'+m.prev+'</td><td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f1f5f0;font-weight:500;white-space:nowrap">'+ch+'</td></tr>';
  });
 html+='</tbody></table>';
 html+='</div>';
 if(elements.comparisonResult)elements.comparisonResult.innerHTML=html;
}

function exportCopy(){if(!state.results)return;if(navigator.clipboard){navigator.clipboard.writeText(state.results.result).then(function(){showToast('Copied to clipboard!','success');});}else{fallbackCopy(state.results.result);}}

function exportTxt(){if(!state.results)return;var r=state.results;var op=r.minify?'Minified':'Formatted';var valStatus=r.valid?'Valid':'Invalid'+(r.errorDetails?' ('+r.errorDetails.message+')':'');var text='XML Formatting Report\n=====================\n\nOperation: '+op+'\nValidation: '+valStatus+'\nLines: '+r.lines+'\nElements: '+r.elements+'\nAttributes: '+r.attrs+'\nCharacters: '+r.chars+'\nOriginal Size: '+formatBytes(r.originalSize)+'\nFormatted Size: '+formatBytes(r.formattedSize)+'\nSize Change: '+(r.diff>=0?'+':'')+r.diff+' B\nProcessing Time: '+(r.time<1?'< 1 ms':Math.round(r.time)+' ms')+'\n\n--- Formatted XML ---\n\n'+r.result;downloadFile('xml-formatted.txt',text,'text/plain');showToast('Downloaded TXT report','success');}

function exportJson(){if(!state.results)return;var r=state.results;var xmlStatus=r.valid?'Valid':'Invalid'+(r.errorDetails?' ('+r.errorDetails.message+(r.errorDetails.line?', line '+r.errorDetails.line:'')+')':'');var json=JSON.stringify({operation:r.minify?'Minify':'Format',xmlStatus:xmlStatus,elements:r.elements,attributes:r.attrs,lines:r.lines,characters:r.chars,originalSize:r.originalSize,formattedSize:r.formattedSize,sizeDifference:r.diff,percentageChange:Math.round(r.pct*10)/10,processingTimeMs:Math.round(r.time),timestamp:new Date().toISOString()},null,2);downloadFile('xml-formatted.json',json,'application/json');showToast('Downloaded JSON report','success');}

function exportPrint(){if(!state.results)return;var r=state.results;var op=r.minify?'Minified':'Formatted';var valStatus=r.valid?'Valid':'Invalid';var errInfo=r.valid?'':(' ('+(r.errorDetails?r.errorDetails.message:'')+(r.errorDetails&&r.errorDetails.line?', line '+r.errorDetails.line:'')+')');var dateStr=new Date().toLocaleString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});var w=window.open('','_blank');w.document.write('<!DOCTYPE html><html><head><title>XML Formatter Report</title><style>body{font-family:"Inter","Segoe UI",sans-serif;color:#0f172a;margin:0;padding:40px;line-height:1.6}pre{background:#1e1e2e;color:#cdd6f4;padding:16px 20px;border-radius:8px;font-family:"JetBrains Mono","Consolas",monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;page-break-inside:avoid}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 14px;text-align:left;border-bottom:1px solid #e2e8f0}th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#64748b}td{font-size:14px}.header{text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #e2e8f0}.header h1{font-size:26px;font-weight:800;margin:0 0 4px}.header .sub{font-size:13px;color:#64748b}.section-title{font-size:16px;font-weight:700;margin:24px 0 12px;color:#0f172a}.footer{text-align:center;font-size:11px;color:#94a3b8;margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0}@media print{body{padding:20px}pre{background:#1e1e2e!important;color:#cdd6f4!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="header"><h1>XML Formatting Report</h1><div class="sub">Generated on '+dateStr+' &middot; GoToolly XML Formatter</div></div><div class="section-title">Summary</div><table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody><tr><td>Operation</td><td>'+op+'</td></tr><tr><td>Validation</td><td>'+(r.valid?'&#10003; Valid':'&#10007; Invalid'+errInfo)+'</td></tr><tr><td>Original Size</td><td>'+formatBytes(r.originalSize)+'</td></tr><tr><td>Formatted Size</td><td>'+formatBytes(r.formattedSize)+'</td></tr><tr><td>Size Change</td><td>'+(r.diff>=0?'+':'')+r.diff+' B ('+(r.pct>=0?'+':'')+r.pct.toFixed(1)+'%)</td></tr><tr><td>Lines</td><td>'+r.lines+'</td></tr><tr><td>Elements</td><td>'+r.elements+'</td></tr><tr><td>Attributes</td><td>'+r.attrs+'</td></tr><tr><td>Characters</td><td>'+r.chars.toLocaleString()+'</td></tr><tr><td>Processing Time</td><td>'+(r.time<1?'< 1 ms':Math.round(r.time)+' ms')+'</td></tr></tbody></table><div class="section-title">Formatted XML</div><pre>'+r.result+'</pre><div class="footer">Report generated by GoToolly XML Formatter &middot; https://gotoolly.com/tools/xml-formatter</div></body></html>');w.document.close();w.focus();setTimeout(function(){w.print();},250);}

function downloadFile(filename,content,mimeType){var blob=new Blob([content],{type:mimeType});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}

function fallbackCopy(text){var ta=document.createElement('textarea');ta.style.cssText='position:fixed;opacity:0';ta.value=text;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');showToast('Copied!','success');}catch(e){showToast('Failed to copy','error');}document.body.removeChild(ta);}

function reset(){elements.input.value='';state.results=null;state.history=[];updateStatus('','');showEmptyState();if(elements.exportSection)elements.exportSection.style.display='none';if(elements.comparisonResult)elements.comparisonResult.innerHTML='';if(elements.comparisonList)elements.comparisonList.innerHTML='';if(elements.comparisonEmpty)elements.comparisonEmpty.style.display='none';if(elements.opBadge)elements.opBadge.style.display='none';if(elements.statValidation)elements.statValidation.textContent='\u2014';}

function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';return(bytes/1048576).toFixed(1)+' MB';}

function showToast(msg,type){var existing=document.querySelector('.toast');if(existing)existing.remove();var el=document.createElement('div');el.className='toast '+(type||'info');el.textContent=msg;document.body.appendChild(el);setTimeout(function(){el.classList.add('show');},10);setTimeout(function(){el.classList.remove('show');setTimeout(function(){el.remove();},300);},3000);}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}})();
