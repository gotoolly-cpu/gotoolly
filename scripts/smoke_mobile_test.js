const { JSDOM } = require('jsdom');
const path = require('path');

(async () => {
  // Prefer temp copy with relative script paths when available (tmp_keyword_generator.html)
  const tmpPath = path.resolve(__dirname, 'tmp_keyword_generator.html');
  const filePath = require('fs').existsSync(tmpPath)
    ? tmpPath
    : path.resolve(__dirname, '..', 'tools', 'keyword-generator.html');

  const dom = await JSDOM.fromFile(filePath, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });

  const { window } = dom;
  const { document } = window;

  // Force mobile user agent
  Object.defineProperty(window.navigator, 'userAgent', {
    get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });

  // Wait briefly and report loaded scripts
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout waiting for scripts')), 8000);
    function check() {
      const gen = document.getElementById('generate-btn');
      const scripts = Array.from(document.scripts).map(s => s.src || s.getAttribute('src'));
      console.log('Loaded script srcs (sample):', scripts.slice(0,10));
      if (gen) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 100);
      }
    }
    check();
  });

  // Give scripts a little extra time to execute
  await new Promise(r => setTimeout(r, 250));

  // Additional check: is initKeywordGenerator present and window.keywordGenerator
  console.log('initKeywordGenerator present?', typeof window.initKeywordGenerator);
  console.log('window.keywordGenerator present?', typeof window.keywordGenerator);

  // If initKeywordGenerator exists but keywordGenerator is missing, call it directly
  if (typeof window.initKeywordGenerator === 'function' && !window.keywordGenerator) {
    try {
      console.log('Calling initKeywordGenerator() manually for testing');
      window.initKeywordGenerator();
    } catch (e) {
      console.error('Manual initKeywordGenerator() failed:', e);
    }
  }

  // Set topic input and click generate
  const topic = document.getElementById('topic-input');
  topic.value = 'running shoes';

  const generateBtn = document.getElementById('generate-btn');
  console.log('window.keywordGenerator defined?', !!window.keywordGenerator);
  if (window.keywordGenerator) console.log('keywordGenerator keys:', Object.keys(window.keywordGenerator));
  // Also call the function directly to bypass potential event listener issues
  if (window.keywordGenerator && typeof window.keywordGenerator.generateKeywords === 'function') {
    try {
      window.keywordGenerator.generateKeywords();
      console.log('Called window.keywordGenerator.generateKeywords()');
    } catch (err) { console.error('Direct call failed', err); }
  }
  generateBtn.click();

  // Wait for results (poll)
  const result = await new Promise((resolve, reject) => {
    const deadline = Date.now() + 3000;
    (function poll() {
      const resEl = document.querySelector('#results-area');
      const list = document.querySelector('#keywords-list');

      // Debugging output
      try {
        if (window.lastToolError) console.log('Detected lastToolError:', window.lastToolError);
        if (list) console.log('Keywords list children:', list.children.length);
        if (list) console.log('Keywords list innerHTML snippet:', (list.innerHTML || '').slice(0,200));
      } catch (e) { console.error('Debug trace error', e); }

      if (resEl && window.getComputedStyle(resEl).display !== 'none' && list && list.children.length > 0) {
        resolve({ visible: true, entries: list.children.length, text: list.textContent.trim().slice(0,200) });
        return;
      }
      if (Date.now() > deadline) {
        resolve({ visible: false });
        return;
      }
      setTimeout(poll, 50);
    })();
  });

  console.log('Smoke test result:', result);
  if (result.visible) {
    console.log('✅ Mobile smoke test passed — generated content is visible.');
    process.exit(0);
  } else {
    console.error('❌ Mobile smoke test failed — generated content NOT visible.');
    process.exit(2);
  }
})();