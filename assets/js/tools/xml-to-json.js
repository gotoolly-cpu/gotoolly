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
  name:'XML to JSON Converter',
  inputNoun:'XML',
  outputLabel:'JSON Output',
  filename:'converted.json',
  mime:'application/json',
  doneMsg:'JSON conversion complete',
  copiedMsg:'JSON copied to clipboard',
  downloadMsg:'JSON file downloaded',
  emptyMsg:'Convert something first.',
  errorIntro:'Paste XML into the editor above, then press Convert to JSON.',
  sample: ['<?xml version="1.0" encoding="UTF-8"?>', '<catalog>', '  <book id="bk101" lang="en">', '    <title>GoToolly Guide</title>', '    <price currency="USD">29.99</price>', '    <in-stock>true</in-stock>', '  </book>', '  <book id="bk102" lang="fr">', '    <title>Outils En Ligne</title>', '    <price currency="EUR">24.50</price>', '    <in-stock>false</in-stock>', '  </book>', '</catalog>'].join('\n')
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


function xmlToJson(xml){
  var obj={};
  if(xml.nodeType===1){
    if(xml.attributes.length>0){
      obj['@attributes']={};
      for(var j=0;j<xml.attributes.length;j++){
        var attr=xml.attributes.item(j);
        obj['@attributes'][attr.nodeName]=attr.nodeValue;
      }
    }
  }else if(xml.nodeType===3){return xml.nodeValue.trim();}
  if(xml.hasChildNodes()){
    var hasNonTextChild=false;
    for(var i=0;i<xml.childNodes.length;i++){
      var c=xml.childNodes.item(i);
      if(c.nodeType===1){hasNonTextChild = true; break;}
    }
    if(hasNonTextChild){
      for(var k=0;k<xml.childNodes.length;k++){
        var c2=xml.childNodes.item(k);
        var nodeName=c2.nodeName;
        if(c2.nodeType===1){
          state.meta.elements++;
          if(typeof obj[nodeName]==='undefined'){
            obj[nodeName]=xmlToJson(c2);
          }else{
            if(!Array.isArray(obj[nodeName])){
              var old=obj[nodeName];obj[nodeName]=[old];
            }
            obj[nodeName].push(xmlToJson(c2));
          }
        }
      }
    }else{
      var text='';for(var t=0;t<xml.childNodes.length;t++){text+=xml.childNodes.item(t).nodeValue;}
      return text.trim();
    }
  }
  return obj;
}
function convert(){
  var code=DOM.input.value.trim();
  if(!code)throw new Error('Please enter XML to convert');
  var parser=new DOMParser();
  var xmlDoc=parser.parseFromString(code,'text/xml');
  var parseError=xmlDoc.querySelector('parsererror');
  if(parseError){throw new Error(parseError.textContent.substring(0,200));}
  var root=xmlDoc.documentElement;
  state.meta={elements:1,xmlSize:code.length,jsonSize:0};
  var json=xmlToJson(root);
  var output={};output[root.nodeName]=json;
  var pretty=document.getElementById('gt-pretty').checked;
  var jsonStr=pretty?JSON.stringify(output,null,2):JSON.stringify(output);
  state.meta.jsonSize=jsonStr.length;
  return jsonStr;
}
function statsFor(out){
  return [
    ['check',String((state.meta&&state.meta.elements)||0),'Elements'],
    ['list',String((state.meta&&state.meta.xmlSize)||0),'XML chars'],
    ['list',String((state.meta&&state.meta.jsonSize)||0),'JSON chars']
  ];
}


DOM.run.addEventListener('click',function(){run(false);});
DOM.sample.addEventListener('click',loadSample);
DOM.clear.addEventListener('click',clearAll);
DOM.input.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run(false);}
});
DOM.input.addEventListener('input',function(){
  updateCount();
  if(DOM.status.textContent==='Failed')setStatus('ready','Ready');
});
delegateExport(DOM.results);
delegateExport(document.body);

})();
