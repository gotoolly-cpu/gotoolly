/* ============================================
   GO TOOLLY - JWT DECODER
   ============================================ */
document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('jwt-input');
    var decodeBtn = document.getElementById('decode-btn');
    var clearBtn = document.getElementById('clear-btn');
    var panels = document.getElementById('jwt-panels');
    var headerBody = document.getElementById('jwt-header-body');
    var payloadBody = document.getElementById('jwt-payload-body');
    var signatureBody = document.getElementById('jwt-signature-body');

    decodeBtn.addEventListener('click', decode);
    clearBtn.addEventListener('click', clearAll);

    function decode() {
        var token = input.value.trim();
        if (!token) { panels.style.display = 'none'; return; }

        var parts = token.split('.');
        if (parts.length !== 3) {
            panels.style.display = 'block';
            headerBody.innerHTML = '<div style="color:#f38ba8">Error: Invalid JWT format. Expected 3 parts separated by dots.</div>';
            payloadBody.innerHTML = '';
            signatureBody.innerHTML = '';
            return;
        }

        try {
            var headerStr = base64UrlDecode(parts[0]);
            var payloadStr = base64UrlDecode(parts[1]);
            var signatureStr = parts[2];

            var headerObj = JSON.parse(headerStr);
            var payloadObj = JSON.parse(payloadStr);

            panels.style.display = 'grid';
            headerBody.innerHTML = syntaxHighlight(JSON.stringify(headerObj, null, 2));
            payloadBody.innerHTML = syntaxHighlight(JSON.stringify(payloadObj, null, 2));
            signatureBody.textContent = signatureStr + ' (' + (signatureStr.length * 3 / 4 | 0) + ' bytes)';
        } catch (e) {
            panels.style.display = 'block';
            headerBody.innerHTML = '<div style="color:#f38ba8">Error decoding token: ' + escapeHtml(e.message) + '</div>';
            payloadBody.innerHTML = '';
            signatureBody.innerHTML = '';
        }
    }

    function base64UrlDecode(str) {
        var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) { base64 += '='; }
        try {
            var decoded = atob(base64);
            return decodeURIComponent(escape(decoded));
        } catch (e) {
            return atob(base64);
        }
    }

    function syntaxHighlight(json) {
        json = escapeHtml(json);
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?)/g, function(match) {
            var cls = 'json-number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) { cls = 'json-key'; match = match.replace(/:$/, '') + ':'; }
                else { cls = 'json-string'; }
            } else if (/true|false/.test(match)) { cls = 'json-boolean'; }
            else if (/null/.test(match)) { cls = 'json-null'; }
            return '<span class="' + cls + '">' + match + '</span>';
        });
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function clearAll() {
        input.value = '';
        panels.style.display = 'none';
        headerBody.innerHTML = '';
        payloadBody.innerHTML = '';
        signatureBody.innerHTML = '';
    }
});
