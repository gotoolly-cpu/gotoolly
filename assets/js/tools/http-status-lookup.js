/* ============================================
   GO TOOLLY - HTTP STATUS CODE LOOKUP v2.0
   Premium reference for HTTP status codes
   ============================================ */

(function () {
    'use strict';

    /* ============ STATE ============ */
    var state = {
        activeCat: 'all',
        query: '',
        lastResults: []
    };

    /* ============ DOM CACHE ============ */
    var elements = {};

    function cacheDom() {
        elements = {
            searchInput: document.getElementById('status-search'),
            catFilters: document.getElementById('cat-filters'),
            statusOutput: document.getElementById('status-output'),
            resultCount: document.getElementById('result-count'),
            toolStats: document.getElementById('tool-stats'),
            emptyState: document.getElementById('empty-state'),
            resultsPanel: document.getElementById('results-panel'),
            statusBadge: document.getElementById('status-badge'),
            lookupBtn: document.getElementById('lookup-btn'),
            clearBtn: document.getElementById('clear-btn'),
            exportSection: document.getElementById('export-section'),
            exportJson: document.getElementById('export-json'),
            exportTxt: document.getElementById('export-txt'),
            exportCsv: document.getElementById('export-csv'),
            exportPrint: document.getElementById('export-print'),
            exportCopy: document.getElementById('export-copy'),
            srAnnounce: document.getElementById('sr-announce')
        };
    }

    var HERO_GRADIENTS = {
        '1xx': 'linear-gradient(135deg,#6366f1,#4f46e5)',
        '2xx': 'linear-gradient(135deg,#10b981,#059669)',
        '3xx': 'linear-gradient(135deg,#f59e0b,#d97706)',
        '4xx': 'linear-gradient(135deg,#ef4444,#dc2626)',
        '5xx': 'linear-gradient(135deg,#f43f5e,#be123c)'
    };

    function setStatus(type, label) {
        var b = elements.statusBadge;
        if (!b) return;
        b.className = 'status-badge' + (type ? ' ' + type : '');
        if (label) b.textContent = label;
    }

    function animateCount(el, target) {
        if (typeof requestAnimationFrame !== 'function') {
            el.textContent = target;
            return;
        }
        var dur = 550;
        var t0 = null;
        function step(ts) {
            if (t0 === null) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ============ UTILS ============ */
    function getById(id) {
        return document.getElementById(id);
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function debounce(fn, wait) {
        var t;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    var toastTimer;
    function showToast(msg, type) {
        var t = document.querySelector('.tool-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'tool-toast';
            t.setAttribute('role', 'status');
            document.body.appendChild(t);
        }
        t.className = 'tool-toast ' + (type || 'success');
        t.textContent = msg;
        requestAnimationFrame(function () {
            t.classList.add('show');
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            t.classList.remove('show');
        }, 2200);
    }

    function announce(msg) {
        if (elements.srAnnounce) {
            elements.srAnnounce.textContent = msg;
        }
    }

    function copyText(text, okMsg) {
        if (!text) return;
        function done() { showToast(okMsg || 'Copied to clipboard'); }
        function fail() { showToast('Copy failed — select manually', 'error'); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fail);
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                done();
            } catch (e) {
                fail();
            }
            document.body.removeChild(ta);
        }
    }

    function downloadFile(filename, content, mime) {
        var blob = new Blob([content], { type: (mime || 'text/plain') + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
        showToast('Downloaded ' + filename);
    }

    /* ============ DATA ============ */
    var STATUSES = [
        {code:100,name:'Continue',cat:'1xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server has received the request headers and the client should proceed to send the request body.',when:'Used with Expect: 100-continue before sending large request bodies.',seo:'Not returned to search engines; internal protocol signal.',rest:'Commonly seen with Expect: 100-continue during large uploads.',browser:'Browsers handle this transparently, then resend the body.',examples:['Large file uploads','Expect: 100-continue requests'],keywords:['continue','expect','upload','body']},
        {code:101,name:'Switching Protocols',cat:'1xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is switching protocols as requested by the client via the Upgrade header.',when:'Upgrade requests, e.g. switching to WebSocket or HTTP/2.',seo:'Not visible to crawlers; protocol handshake only.',rest:'Used for WebSocket and other protocol upgrades.',browser:'Enables WebSocket connections from browsers.',examples:['WebSocket handshake','HTTP to HTTPS protocol upgrade'],keywords:['upgrade','websocket','protocol','switch']},
        {code:102,name:'Processing',cat:'1xx',rfc:'RFC 2518',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The server has received and is processing the request, but no response is available yet.',when:'WebDAV requests that may take a long time to complete.',seo:'Not part of normal web crawling.',rest:'Prevents client timeout during long WebDAV operations.',browser:'Most browsers ignore this interim response.',examples:['Long-running WebDAV operations'],keywords:['processing','webdav','interim']},
        {code:103,name:'Early Hints',cat:'1xx',rfc:'RFC 8297',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/2',desc:'The server sends some response headers ahead of the final response to allow the client to start preloading resources.',when:'Preloading critical CSS, fonts, or scripts before the final response.',seo:'Can improve Largest Contentful Paint (LCP) for crawlers.',rest:'Hints browsers about subresources to fetch early.',browser:'Chrome and Edge use it for preloading (Link headers).',examples:['Preloading stylesheets and fonts','Link: <style.css>; rel=preload'],keywords:['hints','preload','link','performance','lcp']},
        {code:200,name:'OK',cat:'2xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request has succeeded. The meaning of success depends on the HTTP method.',when:'Successful GET, PUT, or POST requests returning content.',seo:'The expected response for indexable pages.',rest:'Standard success response for most API GET requests.',browser:'Normal page load. Content is rendered.',examples:['Rendering a web page','API GET returning JSON','Successful form POST'],keywords:['success','ok','get','found','200']},
        {code:201,name:'Created',cat:'2xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request has been fulfilled and resulted in a new resource being created.',when:'POST requests that create a new resource; should include a Location header.',seo:'Returned for actions, not crawlable page loads.',rest:'Common response to POST/PUT resource creation.',browser:'Browsers may follow the Location header.',examples:['POST /users creating a user','File upload creating a document'],keywords:['created','post','new','resource']},
        {code:202,name:'Accepted',cat:'2xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request has been accepted for processing, but processing has not been completed.',when:'Asynchronous jobs where the result is delivered later via polling or webhooks.',seo:'Not used for normal page rendering.',rest:'Ideal for async queue-based APIs.',browser:'Browsers show the response body normally.',examples:['Job queue submissions','Async data processing'],keywords:['accepted','async','queue','background']},
        {code:203,name:'Non-Authoritative Information',cat:'2xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is a transforming proxy that returned a modified version of the origin response.',when:'Proxy servers that modify response content (headers, payload).',seo:'Rare in practice; treated like 200 by crawlers.',rest:'Indicates a modifying proxy in the chain.',browser:'Handled like a normal 200 response.',examples:['Transforming proxies','Header-stripping CDN edge nodes'],keywords:['proxy','transforming','non-authoritative']},
        {code:204,name:'No Content',cat:'2xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server successfully processed the request and is not returning any content.',when:'DELETE requests or PUT updates where no response body is needed.',seo:'Useful for tracking pixels — no content is rendered.',rest:'Standard for successful DELETE operations.',browser:'Keeps the current page; no visual change.',examples:['DELETE /items/42','Update endpoint with no body','Tracking pixel'],keywords:['no content','empty','delete','tracking']},
        {code:205,name:'Reset Content',cat:'2xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server successfully processed the request, but instructs the user agent to reset the document view.',when:'Form submissions where the form should be cleared after processing.',seo:'Not applicable to crawling.',rest:'Rare in API design.',browser:'Clears/resets the current form view.',examples:['Clear-form-after-submit flows'],keywords:['reset','form','clear']},
        {code:206,name:'Partial Content',cat:'2xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is delivering only part of the resource because of a Range header in the request.',when:'Resuming interrupted downloads or streaming media with byte ranges.',seo:'Used by crawlers when fetching ranges of large files.',rest:'Powerful for range-based file APIs.',browser:'Enables resumable downloads and video seeking.',examples:['Resume a download','Video seeking (Range requests)'],keywords:['partial','range','resume','download','stream']},
        {code:207,name:'Multi-Status',cat:'2xx',rfc:'RFC 4918',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The message body contains XML with multiple separate response codes for a batch operation.',when:'WebDAV batch operations where multiple sub-requests have different results.',seo:'Not used on the open web.',rest:'Mainly relevant to WebDAV clients.',browser:'Browsers render the XML body as text.',examples:['WebDAV PROPPATCH batch'],keywords:['multi-status','webdav','batch','xml']},
        {code:208,name:'Already Reported',cat:'2xx',rfc:'RFC 5842',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'Used inside a DAV-encoded body to avoid enumerating the same member multiple times in a binding.',when:'WebDAV bound-resource listing deduplication.',seo:'Not used on the open web.',rest:'WebDAV protocol detail.',browser:'N/A for standard browsing.',examples:['WebDAV bindings enumeration'],keywords:['already','reported','webdav','binding']},
        {code:226,name:'IM Used',cat:'2xx',rfc:'RFC 3229',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server has fulfilled a GET request and the response is the result of one or more instance manipulations.',when:'Delta encoding where the server applies instance manipulations.',seo:'Rare; treated as a 2xx success.',rest:'Only meaningful with delta encoding support.',browser:'Handled as a generic 2xx response.',examples:['Delta-encoded responses'],keywords:['im','delta','instance','manipulation']},
        {code:300,name:'Multiple Choices',cat:'3xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request has more than one possible response and the user or agent should pick one.',when:'Content negotiation with multiple representations of a resource.',seo:'Can list alternate URLs for crawlers.',rest:'Rarely used; explicit redirects are preferred.',browser:'May present a choice page or pick automatically.',examples:['Language variants of a page'],keywords:['multiple','choices','negotiation','options']},
        {code:301,name:'Moved Permanently',cat:'3xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The requested resource has been permanently moved to a new URL. All future requests should use the new URL.',when:'Domain migration, URL restructuring, canonicalization of http->https.',seo:'Passes link equity permanently; update internal links promptly.',rest:'Browsers may switch the method to GET on redirect.',browser:'Follows the Location header automatically.',examples:['Domain migration','http:// to https://','Removing .html extensions'],keywords:['redirect','moved','permanent','301','canonical']},
        {code:302,name:'Found',cat:'3xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The requested resource temporarily resides under a different URL.',when:'Temporary redirects for maintenance or A/B testing; legacy POST redirects.',seo:'Temporary — link equity is not permanently transferred.',rest:'Historically browsers change POST to GET on 302 (treat like 303).',browser:'Follows Location; method may change to GET.',examples:['Maintenance pages','A/B test variants','Legacy form redirects'],keywords:['redirect','found','temporary','302']},
        {code:303,name:'See Other',cat:'3xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The response to the request can be found under a different URI using a GET method.',when:'Redirecting after a POST, PUT, or DELETE to show the resulting resource (PRG pattern).',seo:'Recommended for redirecting crawlers after form submissions.',rest:'The canonical "redirect after POST" status.',browser:'Always issues a GET to the new location.',examples:['Post/Redirect/Get pattern','Payment success page'],keywords:['see other','redirect','post-redirect-get','prg','303']},
        {code:304,name:'Not Modified',cat:'3xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The resource has not been modified since the last request, so the client should use its cached copy.',when:'Conditional requests with If-Modified-Since or If-None-Match (ETag).',seo:'A normal, expected response that reduces crawl bandwidth.',rest:'Returned when a valid ETag/Last-Modified matches.',browser:'Serves the resource from cache; zero payload.',examples:['ETag validation','If-Modified-Since caching'],keywords:['not modified','cache','etag','conditional','304']},
        {code:305,name:'Use Proxy',cat:'3xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The requested resource must be accessed through the proxy listed in the Location header.',when:'Historically used to mandate proxy access; deprecated by security concerns.',seo:'Ignored by crawlers; effectively unused.',rest:'Deprecated; do not use in new systems.',browser:'Most browsers ignore or reject it.',examples:['Legacy proxy configurations'],keywords:['use proxy','proxy','deprecated']},
        {code:306,name:'(Unused)',cat:'3xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'Formerly Switch Proxy. Reserved and no longer used.',when:'Historical placeholder; must not be used.',seo:'Not applicable.',rest:'Do not use.',browser:'Not handled as a redirect.',examples:[],keywords:['switch proxy','unused','reserved']},
        {code:307,name:'Temporary Redirect',cat:'3xx',rfc:'RFC 9110',cacheable:false,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request should be repeated with another URI, but future requests should still use the original URI. The method and body are preserved.',when:'Temporary redirects where the HTTP method must be preserved (POST -> POST).',seo:'Temporary; less common for SEO than 301/308.',rest:'Use when method preservation matters (e.g. form submissions).',browser:'Repeats the same method and body at the new location.',examples:['Temporary endpoint moves','Method-preserving redirects'],keywords:['redirect','temporary','307','method preserve']},
        {code:308,name:'Permanent Redirect',cat:'3xx',rfc:'RFC 9110',cacheable:true,safe:true,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request and all future requests should be repeated using another URI. The method and body are preserved.',when:'Permanent moves where POST/PUT semantics must be kept intact.',seo:'Modern equivalent of 301 that preserves method; pass link equity.',rest:'Preferred over 301 when method preservation matters.',browser:'Repeats the same method and body permanently.',examples:['Permanent API endpoint relocation'],keywords:['redirect','permanent','308','method preserve']},
        {code:400,name:'Bad Request',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server cannot process the request due to an apparent client error (malformed syntax, invalid framing).',when:'Malformed JSON, bad query parameters, invalid request framing.',seo:'Returned for requests that cannot be fulfilled; not for missing pages.',rest:'Use with a descriptive error body explaining the problem.',browser:'Shows the error content to the user.',examples:['Invalid JSON payload','Malformed query string'],keywords:['bad request','malformed','invalid','400']},
        {code:401,name:'Unauthorized',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'Authentication is required and has failed or has not yet been provided.',when:'Missing or invalid API keys, tokens, or login credentials.',seo:'Login walls can block crawlers; use sparingly on indexable content.',rest:'Include a WWW-Authenticate header; pair with 403 when authenticated but forbidden.',browser:'May prompt for basic auth credentials.',examples:['Missing API token','Expired JWT','HTTP Basic Auth prompt'],keywords:['unauthorized','auth','token','401','login']},
        {code:402,name:'Payment Required',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'Reserved for future use. Originally intended for digital payment systems; now used by some APIs for quota/billing limits.',when:'Paywalled content, exceeded free-tier API quotas.',seo:'Used by some crawlers for paywalls; not widely supported.',rest:'Use for billing/quota enforcement in APIs.',browser:'Generally treated like a generic 4xx.',examples:['Paywall content','API quota exceeded'],keywords:['payment','quota','billing','paywall','402']},
        {code:403,name:'Forbidden',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server understood the request but refuses to authorize it.',when:'Authenticated users lacking permission, IP blocks, hotlink protection.',seo:'Crawlers respect 403; pages hidden this way are not indexed.',rest:'Distinct from 401 (401 = not authenticated, 403 = not allowed).',browser:'Shows an error page; content is not rendered.',examples:['CSRF token failure','Restricted admin endpoint'],keywords:['forbidden','permission','denied','403','access']},
        {code:404,name:'Not Found',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server cannot find the requested resource.',when:'Broken links, removed pages, mistyped URLs.',seo:'Return a soft 404 only when truly nothing exists; keep the page indexable if content moved.',rest:'Use a JSON body describing the missing resource.',browser:'Shows a 404 page to the visitor.',examples:['Typo in URL','Deleted page not yet removed from sitemap'],keywords:['not found','404','missing','broken link','page']},
        {code:405,name:'Method Not Allowed',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request method is not allowed for the requested resource.',when:'POST to a read-only endpoint, DELETE on a GET-only route.',seo:'Crawlers expect GET/HEAD; 405 for other methods is normal.',rest:'Always include the Allow header listing permitted methods.',browser:'Shows the error; some tools display allowed methods.',examples:['POST to /api/items (GET only)','DELETE on public page'],keywords:['method','not allowed','405','allow']},
        {code:406,name:'Not Acceptable',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The resource cannot generate content matching the Accept headers sent by the client.',when:'Client requests a content type or language the server cannot provide.',seo:'Rare; only with aggressive Accept negotiation.',rest:'Return available representations or a clear error.',browser:'Shows an error; often result of unsupported content negotiation.',examples:['Accept: application/vnd.custom.v2+json'],keywords:['not acceptable','accept','content negotiation','406']},
        {code:407,name:'Proxy Authentication Required',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The client must first authenticate itself with the proxy.',when:'Corporate/ISP proxies requiring credentials.',seo:'Not seen by crawlers in normal setups.',rest:'Rare in public APIs.',browser:'May prompt for proxy credentials.',examples:['Corporate proxy login'],keywords:['proxy','authentication','407']},
        {code:408,name:'Request Timeout',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server timed out waiting for the request from the client.',when:'Client took too long to send a request or keep-alive connection timed out.',seo:'Transient; not content related.',rest:'Often caused by slow clients or idle keep-alive.',browser:'Shows error; usually connection-level.',examples:['Idle keep-alive connections','Slow uploads'],keywords:['timeout','408','slow']},
        {code:409,name:'Conflict',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request conflicts with the current state of the resource.',when:'Version conflicts in concurrent editing, duplicate resource creation, state mismatches.',seo:'Not used for page rendering.',rest:'Use to signal write conflicts that need resolution.',browser:'Shows error body.',examples:['Concurrent edits','Creating an already-existing resource'],keywords:['conflict','409','duplicate','version']},
        {code:410,name:'Gone',cat:'4xx',rfc:'RFC 9110',cacheable:true,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The resource is permanently gone and will not be available again.',when:'Intentionally deleted resources that should be removed from caches and indexes.',seo:'Tell crawlers to de-index the URL; stronger than 404.',rest:'Use when deletion is permanent and known.',browser:'Shows an error page.',examples:['Decommissioned product pages','Removed blog posts'],keywords:['gone','410','removed','deleted','deindex']},
        {code:411,name:'Length Required',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server requires a Content-Length header for the request.',when:'Request body present without Content-Length (chunked not supported).',seo:'Rare; protocol-level.',rest:'Rarely used in modern stacks (chunked encoding is standard).',browser:'Re-sends with correct headers typically.',examples:['Old servers requiring Content-Length'],keywords:['length','content-length','411']},
        {code:412,name:'Precondition Failed',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'One or more conditions in the request header fields evaluated to false.',when:'If-Match or If-Unmodified-Since header checks fail.',seo:'Rare; conditional request detail.',rest:'Used for optimistic concurrency control.',browser:'Shows error; retry logic needed.',examples:['If-Match with stale ETag','Optimistic locking'],keywords:['precondition','if-match','etag','412']},
        {code:413,name:'Content Too Large',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request body is larger than the server is willing or able to process.',when:'Uploads exceeding file size limits.',seo:'Not content related.',rest:'Return with Retry-After or size limits in the body.',browser:'Shows upload failure to the user.',examples:['Oversized file upload','Large POST body'],keywords:['content','too large','413','upload','size']},
        {code:414,name:'URI Too Long',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The URI provided was too long for the server to process.',when:'Very long URLs or oversized query strings.',seo:'Keep URLs under a few thousand characters.',rest:'Consider POST for large parameter sets.',browser:'Shows error; often from deep-linking long params.',examples:['Long query strings in GET'],keywords:['uri','too long','414','url']},
        {code:415,name:'Unsupported Media Type',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request entity has a media type the server does not support.',when:'Sending JSON to an endpoint that only accepts XML, or missing Content-Type.',seo:'Not content related.',rest:'Clearly document accepted media types in API docs.',browser:'Shows error body.',examples:['Wrong Content-Type header','Unsupported charset'],keywords:['unsupported','media type','content-type','415']},
        {code:416,name:'Range Not Satisfiable',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The requested byte range is outside the boundaries of the resource.',when:'Range header asks for bytes beyond file size.',seo:'Not content related.',rest:'Return with a Content-Range header.',browser:'Retries without Range or fails gracefully.',examples:['Requesting bytes past EOF'],keywords:['range','not satisfiable','416']},
        {code:417,name:'Expectation Failed',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The Expect header in the request cannot be met by the server.',when:'Expect: 100-continue unsupported or invalid.',seo:'Rare; protocol detail.',rest:'Rare in modern APIs.',browser:'Most browsers do not set Expect.',examples:['Invalid Expect headers'],keywords:['expectation','expect','417']},
        {code:418,name:'I am a teapot',cat:'4xx',rfc:'RFC 2324 / RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'A humorous status defined by the HTCPCP protocol: the server refuses to brew coffee because it is a teapot.',when:'April Fools pranks and easter eggs; also used as a test status.',seo:'Fun easter egg, not used in production SEO.',rest:'Some frameworks use it as an example code.',browser:'Browsers display it as a normal 4xx error.',examples:['Easter egg pages','HTCPCP implementations'],keywords:['teapot','418','coffee','joke','htcpcp']},
        {code:421,name:'Misdirected Request',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request was directed at a server unable to produce a response for it, usually because the connection was reused for a different virtual host.',when:'Connection reuse across misconfigured hosts, TLS SNI mismatches.',seo:'Rare; indicates server configuration issues.',rest:'Indicates the server cannot answer for the Host requested.',browser:'Shows error; connection may be retried.',examples:['HTTP/2 connection coalescing issues'],keywords:['misdirected','421','sni','host']},
        {code:422,name:'Unprocessable Content',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The request was well-formed but contained semantic errors (e.g. validation failures).',when:'Form validation errors, business rule violations in APIs.',seo:'Not content related; a modern 400 for validation.',rest:'The de-facto standard for field-level validation errors.',browser:'Shows error details to the user.',examples:['Missing required field','Invalid email format'],keywords:['unprocessable','validation','422','form']},
        {code:423,name:'Locked',cat:'4xx',rfc:'RFC 4918',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The resource being accessed is locked.',when:'WebDAV resources locked by another user.',seo:'Not used on the open web.',rest:'WebDAV protocol detail.',browser:'N/A for standard browsing.',examples:['WebDAV locked documents'],keywords:['locked','webdav','423']},
        {code:424,name:'Failed Dependency',cat:'4xx',rfc:'RFC 4918',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The request failed because it depended on another request that failed.',when:'WebDAV batch operations where a prerequisite sub-request failed.',seo:'Not used on the open web.',rest:'WebDAV protocol detail.',browser:'N/A for standard browsing.',examples:['WebDAV transaction failures'],keywords:['failed','dependency','webdav','424']},
        {code:425,name:'Too Early',cat:'4xx',rfc:'RFC 8470',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/2',desc:'The server is unwilling to process a request that might be replayed (TLS 1.3 early data).',when:'Protecting against replay attacks on 0-RTT early data.',seo:'Not content related.',rest:'Relevant to HTTP/2 + TLS 1.3 early data.',browser:'Browsers retry without early data.',examples:['TLS 1.3 0-RTT early data'],keywords:['too early','425','0-rtt','replay']},
        {code:426,name:'Upgrade Required',cat:'4xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The client should switch to a different protocol.',when:'Server requires TLS or a newer protocol version.',seo:'Rare; protocol upgrade signal.',rest:'Include an Upgrade header listing acceptable protocols.',browser:'May attempt the upgrade automatically.',examples:['HTTP/1.1 to HTTP/2 upgrade'],keywords:['upgrade','426','protocol']},
        {code:428,name:'Precondition Required',cat:'4xx',rfc:'RFC 6585',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The origin server requires the request to be conditional to prevent lost updates.',when:'Enforcing If-Match/If-Unmodified-Since on state-changing endpoints.',seo:'Not content related.',rest:'Use for write-protection patterns.',browser:'Shows error; client must add preconditions.',examples:['Write without If-Match on protected endpoint'],keywords:['precondition','required','428','lost update']},
        {code:429,name:'Too Many Requests',cat:'4xx',rfc:'RFC 6585',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The client has sent too many requests in a given time (rate limiting).',when:'API rate limits exceeded; brute-force protection.',seo:'Crawlers respect 429 and back off; helps prevent crawl spam.',rest:'Always return a Retry-After header.',browser:'Shows error; may honor Retry-After.',examples:['API rate limiting','Login brute-force protection'],keywords:['too many','429','rate limit','throttle','retry-after']},
        {code:431,name:'Request Header Fields Too Large',cat:'4xx',rfc:'RFC 6585',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is unwilling to process the request because individual or collective header fields are too large.',when:'Huge cookies, oversized headers.',seo:'Not content related; often from giant cookie jars.',rest:'Reduce cookie sizes or header payloads.',browser:'Shows error; clear cookies to recover.',examples:['Oversized cookies','Large authentication headers'],keywords:['header','too large','431','cookies']},
        {code:451,name:'Unavailable For Legal Reasons',cat:'4xx',rfc:'RFC 7725',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is denying access to the resource for legal reasons.',when:'DMCA takedowns, government censorship, regional blocks.',seo:'Crawlers will de-index the URL when it returns 451.',rest:'Use when legal obligations block access.',browser:'Shows error; may display legal notice.',examples:['DMCA takedowns','Region-blocked content'],keywords:['legal','451','dmca','censorship','blocked']},
        {code:500,name:'Internal Server Error',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server encountered an unexpected condition that prevented it from fulfilling the request.',when:'Unhandled exceptions, server-side bugs, configuration errors.',seo:'Prevent search engines from indexing error pages; log and fix quickly.',rest:'Return a generic message; never leak stack traces.',browser:'Shows the server error page.',examples:['Uncaught exception','Database connection failure'],keywords:['internal','server error','500','exception']},
        {code:501,name:'Not Implemented',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server does not support the functionality required to fulfill the request.',when:'Unsupported HTTP method or unimplemented feature.',seo:'Rare; not content related.',rest:'Use when a method is genuinely unsupported (vs 405 for not allowed on this route).',browser:'Shows error.',examples:['Unsupported custom HTTP method'],keywords:['not implemented','501']},
        {code:502,name:'Bad Gateway',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server, acting as a gateway, received an invalid response from the upstream server.',when:'Reverse proxy cannot reach the backend, or backend returns garbage.',seo:'Transient — monitor and resolve; crawlers may retry.',rest:'Common behind Nginx, Cloudflare, load balancers.',browser:'Shows error; often intermittent.',examples:['Backend down behind Nginx','Upstream timeout'],keywords:['bad gateway','502','proxy','upstream']},
        {code:503,name:'Service Unavailable',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server is temporarily unable to handle the request due to overload or maintenance.',when:'Scheduled maintenance, traffic spikes, dependency outages.',seo:'Include Retry-After; crawlers will back off and retry.',rest:'Standard for graceful degradation during maintenance.',browser:'Shows error; honors Retry-After.',examples:['Scheduled maintenance window','Traffic spike overload'],keywords:['service','unavailable','503','maintenance','retry-after']},
        {code:504,name:'Gateway Timeout',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server, acting as a gateway, did not receive a timely response from the upstream server.',when:'Slow backend queries, long-running computations, upstream hangs.',seo:'Transient; optimize slow paths.',rest:'Common when backend exceeds the proxy timeout.',browser:'Shows error; user may retry.',examples:['Slow database query','Upstream timeout beyond threshold'],keywords:['gateway','timeout','504','slow']},
        {code:505,name:'HTTP Version Not Supported',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server does not support the HTTP protocol version used in the request.',when:'Client uses an unsupported protocol version.',seo:'Rare; protocol detail.',rest:'Indicates server/proxy version limitations.',browser:'May retry with an older protocol.',examples:['Unsupported HTTP version headers'],keywords:['version','not supported','505']},
        {code:506,name:'Variant Also Negotiates',cat:'5xx',rfc:'RFC 9110',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The server has a configuration error: transparent content negotiation results in a circular reference.',when:'Misconfigured content negotiation loops.',seo:'Configuration bug; fix server-side.',rest:'Rare; points to config errors.',browser:'Shows error.',examples:['Circular negotiation config'],keywords:['variant','negotiates','506','circular']},
        {code:507,name:'Insufficient Storage',cat:'5xx',rfc:'RFC 4918',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The server cannot store the representation needed to complete the request.',when:'Server storage full (WebDAV context, or generally disk full).',seo:'Rare; not content related.',rest:'Signal storage exhaustion.',browser:'Shows error.',examples:['Disk full during upload'],keywords:['insufficient','storage','507','disk']},
        {code:508,name:'Loop Detected',cat:'5xx',rfc:'RFC 5842',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1 (WebDAV)',desc:'The server detected an infinite loop while processing the request.',when:'Circular references in resource dependencies (WebDAV) or recursive redirects.',seo:'Guard against redirect loops that waste crawl budget.',rest:'Indicates recursive processing cycles.',browser:'Browsers also detect redirect loops client-side.',examples:['Redirect loops','WebDAV circular bindings'],keywords:['loop','detected','508','redirect loop']},
        {code:510,name:'Not Extended',cat:'5xx',rfc:'RFC 2774',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'Further extensions to the request are required for the server to fulfill it.',when:'Experimental HTTP extension mechanisms.',seo:'Rarely used.',rest:'Relates to the HTTP Extension Framework.',browser:'Shows error.',examples:['Extension framework requests'],keywords:['not extended','510']},
        {code:511,name:'Network Authentication Required',cat:'5xx',rfc:'RFC 6585',cacheable:false,safe:false,idempotent:true,httpVersion:'HTTP/1.1',desc:'The client needs to authenticate to gain network access.',when:'Captive portals on public WiFi requiring login.',seo:'Crawlers may see this on public-networked hosts.',rest:'Rare in APIs; used by captive portals.',browser:'Browsers may open the captive portal automatically.',examples:['Airport/coffee-shop WiFi login'],keywords:['network','authentication','511','captive portal']}
    ];

    var CATEGORIES = [
        {id: 'all', label: 'All Codes'},
        {id: '1xx', label: '1xx Informational'},
        {id: '2xx', label: '2xx Success'},
        {id: '3xx', label: '3xx Redirection'},
        {id: '4xx', label: '4xx Client Error'},
        {id: '5xx', label: '5xx Server Error'}
    ];

    var CAT_NAMES = {
        '1xx': 'Informational',
        '2xx': 'Success',
        '3xx': 'Redirection',
        '4xx': 'Client Error',
        '5xx': 'Server Error'
    };

    var CAT_COLORS = {
        '1xx': '#6366f1',
        '2xx': '#10b981',
        '3xx': '#f59e0b',
        '4xx': '#ef4444',
        '5xx': '#dc2626'
    };

    /* ============ ANALYSIS ============ */
    function getCat(code) {
        return Math.floor(code / 100) + 'xx';
    }

    function lookupCode(code) {
        var n = parseInt(code, 10);
        if (isNaN(n) || n < 100 || n > 599) return null;
        for (var i = 0; i < STATUSES.length; i++) {
            if (STATUSES[i].code === n) return STATUSES[i];
        }
        return {
            code: n,
            name: 'Unknown Status Code',
            cat: getCat(n),
            rfc: '—',
            cacheable: null,
            safe: null,
            idempotent: null,
            httpVersion: '—',
            desc: 'This code is not part of the registered HTTP status codes list in this reference.',
            when: 'May be a private/unofficial code used by a specific server.',
            seo: 'Crawlers treat unknown codes according to their category.',
            rest: 'Treat as a server-specific or future code.',
            browser: 'Browsers display it as a generic error of its category.',
            examples: [],
            keywords: [],
            unknown: true
        };
    }

    /* ============ FILTERING ============ */
    function normalizeToken(v) {
        return String(v).toLowerCase().replace(/[^a-z0-9+#.\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function matchesStatus(s, q) {
        if (!q) return true;
        var hay = normalizeToken(s.code + ' ' + s.name + ' ' + s.desc + ' ' + s.when + ' ' + s.rfc + ' ' + s.seo + ' ' + s.rest + ' ' + s.browser + ' ' + s.httpVersion + ' ' + (s.keywords || []).join(' ') + ' ' + (s.examples || []).join(' '));
        var tokens = q.split(/\s+/);
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] && hay.indexOf(tokens[i]) === -1) return false;
        }
        return true;
    }

    function filterStatuses() {
        var q = normalizeToken(state.query);
        var cat = state.activeCat;
        var codeMatch = q.match(/^(\d{3})$/);
        if (codeMatch) {
            var n = parseInt(codeMatch[1], 10);
            if (n >= 100 && n <= 599) {
                var entry = lookupCode(n);
                if (cat === 'all' || cat === entry.cat) return [entry];
                return [];
            }
        }
        var out = STATUSES.filter(function (s) {
            if (cat !== 'all' && s.cat !== cat) return false;
            return matchesStatus(s, q);
        });
        out.sort(function (a, b) { return a.code - b.code; });
        return out;
    }

    /* ============ STATS ============ */
    function renderStats(filtered) {
        if (!elements.toolStats) return;
        var counts = { '1xx': 0, '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
        filtered.forEach(function (s) { counts[s.cat] = (counts[s.cat] || 0) + 1; });
        var html = '';
        html += '<span class="stats-chip"><strong data-count="' + filtered.length + '">0</strong> / ' + STATUSES.length + '</span>';
        ['1xx', '2xx', '3xx', '4xx', '5xx'].forEach(function (cat) {
            if (state.activeCat === 'all' || state.activeCat === cat) {
                html += '<span class="stats-chip" style="cursor:pointer" data-stats-cat="' + cat + '" title="Filter by ' + cat + '"><span class="dot" style="background:' + CAT_COLORS[cat] + '"></span>' + cat + ': <strong data-count="' + (counts[cat] || 0) + '">0</strong></span>';
            }
        });
        elements.toolStats.innerHTML = html;
        var counters = elements.toolStats.querySelectorAll('[data-count]');
        for (var i = 0; i < counters.length; i++) {
            animateCount(counters[i], parseInt(counters[i].getAttribute('data-count'), 10));
        }
    }

    function onStatsClick(e) {
        var chip = e.target.closest('[data-stats-cat]');
        if (!chip) return;
        state.activeCat = chip.getAttribute('data-stats-cat');
        renderFilters();
        render();
    }

    /* ============ RENDERING ============ */
    function renderFilters() {
        if (!elements.catFilters) return;
        elements.catFilters.innerHTML = CATEGORIES.map(function (c) {
            var count = c.id === 'all' ? STATUSES.length : STATUSES.filter(function (s) { return s.cat === c.id; }).length;
            var active = state.activeCat === c.id ? ' active' : '';
            return '<button class="cat-btn' + active + '" data-cat="' + c.id + '" aria-pressed="' + (state.activeCat === c.id) + '">' + c.label + ' <span class="cat-count">' + count + '</span></button>';
        }).join('');
    }

    function badgeHtml(ok, yesText, noText) {
        if (ok === null || ok === undefined) return '<span class="badge-chip badge-neutral">Unknown</span>';
        return ok
            ? '<span class="badge-chip badge-yes"><i class="fas fa-check" aria-hidden="true"></i> ' + (yesText || 'Yes') + '</span>'
            : '<span class="badge-chip badge-no"><i class="fas fa-times" aria-hidden="true"></i> ' + (noText || 'No') + '</span>';
    }

    function fieldRow(label, value, copyValue) {
        if (!value) return '';
        return '<div class="field-row"><span class="field-label">' + label + '</span><span class="field-value">' + escapeHtml(value) +
            (copyValue ? ' <button type="button" class="mini-copy" data-copy="' + escapeHtml(copyValue) + '" aria-label="Copy ' + label + '" title="Copy ' + label + '"><i class="fas fa-copy" aria-hidden="true"></i></button>' : '') +
            '</span></div>';
    }

    function renderEmpty() {
        return '<div class="no-results" role="status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg><h4>No status codes found</h4><p>Try a different code or keyword such as <em>redirect</em>, <em>auth</em>, or <em>rate limit</em>.</p></div>';
    }

    function renderHero(s) {
        var icon;
        switch (s.cat) {
            case '1xx':
                icon = '<path d="M12 2l10 5v5c0 5-3.5 8.5-10 10-6.5-1.5-10-5-10-10V7z"/><path d="M9 12l2 2 4-4"/>';
                break;
            case '2xx':
                icon = '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
                break;
            case '3xx':
                icon = '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>';
                break;
            default:
                icon = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
        }
        var html = '';
        html += '<div class="status-hero" aria-label="' + s.code + ' ' + escapeHtml(s.name) + '" style="background:' + (HERO_GRADIENTS[s.cat] || 'linear-gradient(135deg,#64748b,#334155)') + '">';
        html += '<div class="sh-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icon + '</svg></div>';
        html += '<div class="sh-code">' + s.code + '</div>';
        html += '<div class="sh-info">';
        html += '<p class="sh-name">' + escapeHtml(s.name) + '</p>';
        html += '<p class="sh-desc">' + escapeHtml(s.desc) + '</p>';
        html += '<div class="sh-badges">';
        html += '<span class="sh-badge">' + s.cat + ' &middot; ' + CAT_NAMES[s.cat] + '</span>';
        html += '<span class="sh-badge">' + escapeHtml(s.rfc || 'RFC —') + '</span>';
        html += '<span class="sh-badge">' + (s.cacheable === true ? 'Cacheable' : (s.cacheable === false ? 'Not cacheable' : 'Cache unknown')) + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<button type="button" class="sh-copy" data-copy="' + s.code + '" aria-label="Copy code ' + s.code + '" title="Copy code ' + s.code + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg></button>';
        html += '</div>';
        return html;
    }

    function renderCard(s) {
        var color = CAT_COLORS[s.cat];
        var html = '';
        html += '<div class="status-card" style="--cat-color:' + color + '" tabindex="0" data-code="' + s.code + '" role="button" aria-label="' + s.code + ' ' + escapeHtml(s.name) + '. Press Ctrl+C to copy the code.">';
        html += '<div class="status-code">' + s.code + '</div>';
        html += '<div class="status-info">';
        html += '<div class="status-name">' + escapeHtml(s.name);
        html += ' <span class="status-cat-badge">' + s.cat + ' &middot; ' + CAT_NAMES[s.cat] + '</span>';
        html += ' <button type="button" class="mini-copy card-copy" data-copy="' + s.code + '" aria-label="Copy code ' + s.code + '" title="Copy code"><i class="fas fa-copy" aria-hidden="true"></i></button>';
        html += '</div>';
        html += '<div class="status-desc">' + escapeHtml(s.desc) + '</div>';
        html += fieldRow('When to use', s.when, s.when);
        html += '<div class="meta-badges">';
        html += badgeHtml(s.cacheable, 'Cacheable', 'Not cacheable');
        html += badgeHtml(s.safe, 'Safe', 'Not safe');
        html += badgeHtml(s.idempotent, 'Idempotent', 'Not idempotent');
        html += '</div>';
        html += '<details>';
        html += '<summary>Details &amp; guidance</summary>';
        html += '<div class="detail-grid">';
        html += '<div class="detail-cell"><span class="detail-label">RFC</span><span class="detail-value">' + escapeHtml(s.rfc || '—') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">HTTP</span><span class="detail-value">' + escapeHtml(s.httpVersion || '—') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">SEO</span><span class="detail-value">' + escapeHtml(s.seo || '—') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">REST API</span><span class="detail-value">' + escapeHtml(s.rest || '—') + '</span></div>';
        html += '<div class="detail-cell"><span class="detail-label">Browser</span><span class="detail-value">' + escapeHtml(s.browser || '—') + '</span></div>';
        html += '</div>';
        html += '</details>';
        if (s.examples && s.examples.length) {
            html += '<div class="example-tags">' + s.examples.map(function (ex) {
                return '<span class="example-tag" tabindex="0" data-copy="' + escapeHtml(ex) + '">' + escapeHtml(ex) + '</span>';
            }).join('') + '</div>';
        }
        html += '</div>';
        html += '</div>';
        return html;
    }

    function render() {
        var searching = state.query !== '' || state.activeCat !== 'all';
        if (!searching) {
            if (elements.emptyState) elements.emptyState.style.display = '';
            if (elements.resultsPanel) elements.resultsPanel.classList.remove('show');
            if (elements.statusOutput) elements.statusOutput.innerHTML = '';
            if (elements.resultCount) elements.resultCount.textContent = '';
            if (elements.toolStats) elements.toolStats.innerHTML = '';
            setStatus('ready', 'Ready');
            return;
        }
        if (elements.emptyState) elements.emptyState.style.display = 'none';
        if (elements.resultsPanel) elements.resultsPanel.classList.add('show');

        var filtered = filterStatuses();
        state.lastResults = filtered;
        if (elements.resultCount) {
            elements.resultCount.innerHTML = 'Showing <strong>' + filtered.length + '</strong> of ' + STATUSES.length + ' status codes';
        }
        renderStats(filtered);

        if (!filtered.length) {
            elements.statusOutput.innerHTML = renderEmpty();
            announce('No status codes match your search');
            setStatus('done', 'Done');
            return;
        }

        var html = '';
        if (filtered.length === 1) html += renderHero(filtered[0]);
        var lastCat = '';
        filtered.forEach(function (s) {
            var cat = s.cat;
            if (cat !== lastCat) {
                html += '<div class="status-group-title"><span class="status-cat-badge" style="--cat-color:' + CAT_COLORS[cat] + '">' + cat + '</span> ' + CAT_NAMES[cat] + '</div>';
                lastCat = cat;
            }
            html += renderCard(s);
        });

        elements.statusOutput.innerHTML = html;
        setStatus('done', 'Done');
        announce('Showing ' + filtered.length + ' status codes');
    }

    /* ============ EXPORTS ============ */
    function exportPayload() {
        return state.lastResults.map(function (s) {
            return {
                code: s.code,
                name: s.name,
                category: s.cat,
                rfc: s.rfc,
                httpVersion: s.httpVersion,
                cacheable: s.cacheable,
                safe: s.safe,
                idempotent: s.idempotent,
                description: s.desc,
                whenToUse: s.when,
                seo: s.seo,
                restApi: s.rest,
                browser: s.browser,
                examples: s.examples || []
            };
        });
    }

    function exportJson() {
        downloadFile('http-status-codes.json', JSON.stringify(exportPayload(), null, 2), 'application/json');
    }

    function exportTxt() {
        var lines = [];
        lines.push('HTTP STATUS CODE REFERENCE');
        lines.push('Generated: ' + new Date().toLocaleString());
        lines.push('Codes: ' + state.lastResults.length);
        lines.push('');
        state.lastResults.forEach(function (s) {
            lines.push(s.code + ' ' + s.name + ' [' + s.cat + ']');
            lines.push('  ' + s.desc);
            if (s.when) lines.push('  When: ' + s.when);
            if (s.rfc) lines.push('  RFC: ' + s.rfc);
            lines.push('');
        });
        downloadFile('http-status-codes.txt', lines.join('\n'));
    }

    function exportCsv() {
        var rows = [['Code', 'Name', 'Category', 'RFC', 'HTTP Version', 'Cacheable', 'Safe', 'Idempotent', 'Description', 'When To Use']];
        state.lastResults.forEach(function (s) {
            rows.push([s.code, s.name, s.cat, s.rfc || '', s.httpVersion || '', s.cacheable === null ? '' : (s.cacheable ? 'yes' : 'no'), s.safe === null ? '' : (s.safe ? 'yes' : 'no'), s.idempotent === null ? '' : (s.idempotent ? 'yes' : 'no'), s.desc, s.when || '']);
        });
        var csv = rows.map(function (r) {
            return r.map(function (c) {
                var v = String(c);
                if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
                return v;
            }).join(',');
        }).join('\r\n');
        downloadFile('http-status-codes.csv', csv, 'text/csv');
    }

    function exportPrint() {
        window.print();
    }

    function exportCopyReport() {
        var lines = [];
        state.lastResults.forEach(function (s) {
            lines.push(s.code + ' ' + s.name + ' (' + s.cat + '): ' + s.desc);
        });
        copyText(lines.join('\n'), 'Report copied to clipboard');
    }

    function clearSearch() {
        state.query = '';
        state.activeCat = 'all';
        if (elements.searchInput) elements.searchInput.value = '';
        renderFilters();
        render();
        if (elements.searchInput) elements.searchInput.focus();
    }

    /* ============ EVENTS ============ */
    function onSearchInput() {
        state.query = elements.searchInput.value;
        render();
    }

    function onCatClick(e) {
        var btn = e.target.closest('.cat-btn');
        if (!btn) return;
        state.activeCat = btn.getAttribute('data-cat');
        renderFilters();
        render();
    }

    function onOutputClick(e) {
        var copyBtn = e.target.closest('[data-copy]');
        if (copyBtn) {
            e.stopPropagation();
            copyText(copyBtn.getAttribute('data-copy'));
            return;
        }
        var card = e.target.closest('.status-card');
        if (card) {
            copyText(card.getAttribute('data-code'));
        }
    }

    function onOutputKeydown(e) {
        if (e.key.toLowerCase() === 'c' && (e.ctrlKey || e.metaKey)) {
            var card = e.target.closest('.status-card');
            if (card) {
                e.preventDefault();
                copyText(card.getAttribute('data-code'));
            }
        }
    }

    function onGlobalKeydown(e) {
        if (e.key === 'Escape') {
            var dirty = state.query !== '' || state.activeCat !== 'all' || (elements.searchInput && elements.searchInput.value);
            if (dirty) {
                e.preventDefault();
                clearSearch();
                showToast('Cleared search and filters', 'info');
            }
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (elements.searchInput && document.activeElement === elements.searchInput && state.lastResults.length) {
                e.preventDefault();
                copyText(String(state.lastResults[0].code), 'Copied first result: ' + state.lastResults[0].code);
            }
        }
    }

    function bindEvents() {
        if (elements.searchInput) elements.searchInput.addEventListener('input', onSearchInput);
        if (elements.catFilters) elements.catFilters.addEventListener('click', onCatClick);
        if (elements.statusOutput) {
            elements.statusOutput.addEventListener('click', onOutputClick);
            elements.statusOutput.addEventListener('keydown', onOutputKeydown);
        }
        if (elements.toolStats) elements.toolStats.addEventListener('click', onStatsClick);
        if (elements.exportJson) elements.exportJson.addEventListener('click', exportJson);
        if (elements.exportTxt) elements.exportTxt.addEventListener('click', exportTxt);
        if (elements.exportCsv) elements.exportCsv.addEventListener('click', exportCsv);
        if (elements.exportPrint) elements.exportPrint.addEventListener('click', exportPrint);
        if (elements.exportCopy) elements.exportCopy.addEventListener('click', exportCopyReport);
        if (elements.lookupBtn) elements.lookupBtn.addEventListener('click', function (e) {
            e.preventDefault();
            render();
            if (elements.searchInput) elements.searchInput.focus();
        });
        if (elements.clearBtn) elements.clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            clearSearch();
            showToast('Cleared search and filters', 'info');
        });
        if (elements.emptyState) {
            elements.emptyState.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-example]');
                if (!btn) return;
                var val = btn.getAttribute('data-example');
                if (elements.searchInput) elements.searchInput.value = val;
                state.query = val;
                render();
            });
        }
        document.addEventListener('keydown', onGlobalKeydown);
    }

    /* ============ INIT ============ */
    function init() {
        cacheDom();
        if (!elements.statusOutput || !elements.searchInput) return;
        bindEvents();
        renderFilters();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
