/* ============================================
   GO TOOLLY v2.0 - TEXT CONVERTER (shared glue)
   ============================================ */
(function(){
'use strict';

var $=function(s,r){return (r||document).querySelector(s);};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};

var ICONS={
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  fail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  braces:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

var SP96=String.fromCharCode(96);
function needsQuote(s){
  return /[:{}\[\],&*?|>!%@#'"\n\r\t]/.test(s)||s.indexOf(SP96)>-1||s==='true'||s==='false'||s==='null'||/^\d/.test(s);
}
function needsQuoteVal(s){
  return needsQuote(s)||s===''||s[0]===' '||s[s.length-1]===' ';
}
function needsQuoteKey(s){
  return needsQuote(s)||s==='';
}

function esc(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function truncate(s,n){
  s=String(s==null?'':s);
  if(s.length<=n)return s;
  return s.slice(0,n-1).replace(/\s+\S*$/,'')+'\u2026';
}
function debounce(fn,wait){
  var t;
  return function(){
    var args=arguments,ctx=this;
    clearTimeout(t);
    t=setTimeout(function(){fn.apply(ctx,args);},wait);
  };
}
function download(filename,content,mime){
  var blob=new Blob([content],{type:(mime||'text/plain')+';charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},120);
}
function copyText(text,successMsg){
  var done=function(){showToast(successMsg||'Copied to clipboard','success');};
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done,function(){fallbackCopy(text,done);});
  }else{
    fallbackCopy(text,done);
  }
}
function fallbackCopy(text,done){
  var ta=document.createElement('textarea');
  ta.value=text;
  ta.style.position='fixed';
  ta.style.top='-9999px';
  document.body.appendChild(ta);
  ta.select();
  try{document.execCommand('copy');done();}catch(e){showToast('Could not copy to clipboard','error');}
  ta.remove();
}
function showToast(msg,type){
  var el=document.getElementById('gt-toast');
  if(!el){
    el=document.createElement('div');
    el.id='gt-toast';
    el.className='gt-toast';
    el.setAttribute('role','status');
    document.body.appendChild(el);
  }
  var icon=type==='success'?ICONS.check:type==='error'?ICONS.fail:ICONS.info;
  el.innerHTML=icon+esc(msg);
  el.className='gt-toast show '+(type||'info');
  clearTimeout(showToast._t);
  showToast._t=setTimeout(function(){el.className='gt-toast';},2600);
}
function exportBtn(key,label){
  return '<button type="button" class="gt-export-btn" data-export="'+key+'">'+(ICONS[key==='copy'?'copy':'download']||'')+label+'</button>';
}
function renderSticky(){
  var bar=document.getElementById('gt-sticky');
  if(!bar){
    bar=document.createElement('div');
    bar.id='gt-sticky';
    bar.className='gt-sticky-actions';
    bar.setAttribute('role','toolbar');
    bar.setAttribute('aria-label','Result actions');
    document.body.appendChild(bar);
  }
  bar.innerHTML=exportBtn('copy','Copy')+exportBtn('download','Download');
  requestAnimationFrame(function(){bar.classList.add('show');});
}
function hideSticky(){
  var bar=document.getElementById('gt-sticky');
  if(bar)bar.classList.remove('show');
}
function delegateExport(root){
  if(!root)return;
  root.addEventListener('click',function(e){
    var btn=e.target.closest('[data-export]');
    if(!btn||e.__exportHandled)return;
    e.__exportHandled=true;
    e.preventDefault();
    handleExport(btn.getAttribute('data-export'));
  });
}
function handleExport(key){
  var out=state.lastOutput;
  if(!out){showToast(CONFIG.emptyMsg,'error');return;}
  if(key==='copy'){copyText(out,CONFIG.copiedMsg);}
  else if(key==='download'){download(CONFIG.filename,out,CONFIG.mime);showToast(CONFIG.downloadMsg,'success');}
}
function stat(iconKey,value,label){
  return '<div class="gt-stat"><div class="gt-stat-icon">'+(ICONS[iconKey]||'')+'</div><div class="gt-stat-value">'+value+'</div><div class="gt-stat-label">'+label+'</div></div>';
}
function setStatus(cls,text){
  DOM.status.className='gt-status '+cls;
  DOM.status.textContent=text;
}
function updateCount(){
  var v=DOM.input.value;
  var chars=v.length;
  var lines=v?v.split('\n').length:0;
  DOM.inputCount.textContent=chars.toLocaleString()+' chars'+(lines>1?' \u00b7 '+lines+' lines':'');
  if(DOM.inputCount.title){DOM.inputCount.title='';}
}
function showError(title,hint){
  DOM.errorTitle.textContent=title;
  DOM.errorHint.textContent=hint;
  DOM.errorState.hidden=false;
  DOM.resultCard.hidden=true;
  DOM.emptyState.hidden=true;
  DOM.statsRow.hidden=true;
  hideSticky();
}
function renderOutput(out){
  DOM.outputText.value=out;
  DOM.outCount.textContent=out.length.toLocaleString()+' chars';
  DOM.resultCard.hidden=false;
  DOM.emptyState.hidden=true;
  DOM.errorState.hidden=true;
}
function renderStats(out){
  var arr=statsFor(out);
  DOM.statsRow.innerHTML=arr.map(function(s){return stat(s[0],s[1],s[2]);}).join('');
  DOM.statsRow.hidden=false;
}
function friendlyError(msg){
  var m=String(msg==null?'':msg).replace(/^Error:\s*/,'');
  return (m||'Something went wrong. Check your input and try again.').slice(0,300);
}
function run(silent){
  var raw=DOM.input.value.trim();
  if(!raw){
    state.lastOutput=null;
    state.meta=null;
    DOM.outputText.value='';
    DOM.emptyState.hidden=false;
    DOM.resultCard.hidden=true;
    DOM.errorState.hidden=true;
    DOM.statsRow.hidden=true;
    hideSticky();
    setStatus('ready','Ready');
    return;
  }
  if(state.busy)return;
  state.busy=true;
  setStatus('processing','Converting');
  DOM.progress.hidden=false;
  setTimeout(function(){
    var out=null,err=null;
    try{ out=convert(); }
    catch(e){ err=(e&&e.message)?e.message:String(e); }
    state.busy=false;
    DOM.progress.hidden=true;
    if(err){
      setStatus('error','Failed');
      state.lastOutput=null;
      state.meta=null;
      showError('Conversion failed',friendlyError(err));
      if(!silent)showToast('Conversion failed','error');
      return;
    }
    setStatus('done','Converted');
    renderOutput(out);
    renderStats(out);
    renderSticky();
    state.lastOutput=out;
    if(!silent)showToast(CONFIG.doneMsg,'success');
  },60);
}
function loadSample(){
  DOM.input.value=CONFIG.sample;
  updateCount();
  run(true);
  showToast('Sample loaded','info');
}
function clearAll(){
  DOM.input.value='';
  updateCount();
  DOM.outputText.value='';
  DOM.emptyState.hidden=false;
  DOM.resultCard.hidden=true;
  DOM.errorState.hidden=true;
  DOM.statsRow.hidden=true;
  state.lastOutput=null;
  state.meta=null;
  hideSticky();
  setStatus('ready','Ready');
  DOM.input.focus();
  showToast('Cleared','info');
}
var state={lastOutput:null,busy:false,meta:null};


/* ============ TOOL CONFIG + BODY ============ */

var CONFIG={
  name:'HTML to Markdown Converter',
  inputNoun:'HTML',
  outputLabel:'Markdown Output',
  filename:'output.md',
  mime:'text/markdown',
  doneMsg:'Markdown conversion complete',
  copiedMsg:'Markdown copied to clipboard',
  downloadMsg:'Markdown file downloaded',
  emptyMsg:'Convert something first.',
  errorIntro:'Paste HTML into the editor above, then press Convert to Markdown.',
  sample: ['<h1>GoToolly</h1>', '<p>Convert <strong>HTML</strong> to Markdown in your browser.</p>', '<h2>Features</h2>', '<ul>', '<li>100% free</li>', '<li>No sign-up</li>', '<li>Runs 100% locally</li>', '</ul>', '<p><a href="https://gotoolly.com">Visit GoToolly</a></p>'].join('\n')
};


var DOM={
  run: $("#gt-run"),
  sample: $("#gt-sample"),
  clear: $("#gt-clear"),
  status: $("#gt-status"),
  progress: $("#gt-progress"),
  input: $("#gt-input"),
  inputCount: $("#gt-input-count"),
  outputText: $("#output-text"),
  outCount: $("#out-count"),
  outputLabel: $("#output-label"),
  results: $("#results"),
  emptyState: $("#empty-state"),
  errorState: $("#error-state"),
  errorTitle: $("#error-title"),
  errorHint: $("#error-hint"),
  resultCard: $("#result-card"),
  statsRow: $("#stats-row")
};

DOM.outputLabel.textContent=CONFIG.outputLabel;


function htmlToMarkdownSimple(html){
  var text=html;
  text=text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi,'# $1\n\n');
  text=text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi,'## $1\n\n');
  text=text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi,'### $1\n\n');
  text=text.replace(/<strong>([\s\S]*?)<\/strong>/gi,'**$1**');
  text=text.replace(/<b>([\s\S]*?)<\/b>/gi,'**$1**');
  text=text.replace(/<em>([\s\S]*?)<\/em>/gi,'*$1*');
  text=text.replace(/<i>([\s\S]*?)<\/i>/gi,'*$1*');
  text=text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,'[$2]($1)');
  text=text.replace(/<code>([\s\S]*?)<\/code>/gi,'\`$1\`');
  text=text.replace(/<li>([\s\S]*?)<\/li>/gi,'- $1\n');
  text=text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi,'$1\n\n');
  text=text.replace(/<br\s*\/?>/gi,'\n');
  text=text.replace(/<[^>]*>/g,'');
  text=text.replace(/\n{3,}/g,'\n\n').trim();
  return text;
}
function convert(){
  var html=DOM.input.value;
  var turndownService=null;
  if(typeof TurndownService!=='undefined'){
    turndownService=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced'});
  }
  if(turndownService){
    try{ return turndownService.turndown(html); }
    catch(e){ return htmlToMarkdownSimple(html); }
  }
  return htmlToMarkdownSimple(html);
}
function statsFor(out){
  var lines=out?out.split('\n').length:0;
  var words=out&&out.trim()?out.trim().split(/\s+/).length:0;
  return [
    ['list',(out?out.length:0).toLocaleString(),'Output chars'],
    ['list',lines.toLocaleString(),'Lines'],
    ['check',words.toLocaleString(),'Words']
  ];
}


var live=debounce(function(){run(true);},300);
DOM.run.addEventListener('click',function(){run(false);});
DOM.sample.addEventListener('click',loadSample);
DOM.clear.addEventListener('click',clearAll);
DOM.input.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(false);}
});
DOM.input.addEventListener('input',function(){
  updateCount();
  if(DOM.status.textContent==='Failed')setStatus('ready','Ready');
  live();
});
delegateExport(DOM.results);
delegateExport(document.body);

})();
