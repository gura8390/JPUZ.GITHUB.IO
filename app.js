    // JPUZ v2.0 — Send Side
    // ================================================================
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var sharedEncoder = new TextEncoder();
    var RENDER_CONFIG = { moduleSize: 4, quietZone: 4, foreground: '#000000', background: '#FFFFFF' };
    var HEADER_SIZE_UPPER_BOUND = 25;
    var MAX_CODES = 200;
    var ECC_LEVEL = 'M';

    var QR_CAPACITY = {
        10:{L:271,M:213,Q:151,H:119},11:{L:321,M:251,Q:177,H:137},12:{L:367,M:287,Q:203,H:155},
        13:{L:425,M:331,Q:241,H:177},14:{L:458,M:362,Q:258,H:194},15:{L:520,M:412,Q:292,H:220},
        16:{L:586,M:464,Q:330,H:250},17:{L:644,M:508,Q:365,H:280},18:{L:718,M:566,Q:408,H:310},
        19:{L:792,M:624,Q:452,H:338},20:{L:858,M:666,Q:493,H:382},21:{L:929,M:711,Q:557,H:403},
        22:{L:1003,M:779,Q:587,H:439},23:{L:1091,M:857,Q:640,H:461},24:{L:1171,M:911,Q:709,H:511},
        25:{L:1273,M:997,Q:765,H:535},26:{L:1367,M:1059,Q:845,H:593},27:{L:1465,M:1125,Q:891,H:625},
        28:{L:1528,M:1190,Q:958,H:658},29:{L:1628,M:1264,Q:1016,H:698},30:{L:1732,M:1370,Q:1080,H:742},
        31:{L:1840,M:1452,Q:1150,H:790},32:{L:1952,M:1538,Q:1226,H:842},33:{L:2068,M:1628,Q:1307,H:898},
        34:{L:2188,M:1722,Q:1394,H:958},35:{L:2303,M:1809,Q:1431,H:983},36:{L:2431,M:1911,Q:1530,H:1051},
        37:{L:2563,M:1989,Q:1591,H:1093},38:{L:2699,M:2099,Q:1685,H:1139},39:{L:2809,M:2213,Q:1782,H:1219},
        40:{L:2953,M:2331,Q:1811,H:1273}
    };

    function getQrByteCapacity(v, e) { return QR_CAPACITY[v][e]; }
    function calculatePayloadPerCode(v, e) { return getQrByteCapacity(v, e) - HEADER_SIZE_UPPER_BOUND; }
    function selectVersion(bytes, e) {
        for (var v = 20; v <= 40; v++) {
            var cap = getQrByteCapacity(v, e);
            if (cap <= HEADER_SIZE_UPPER_BOUND) continue;
            if (Math.ceil(bytes / (cap - HEADER_SIZE_UPPER_BOUND)) <= MAX_CODES) return v;
        }
        return null;
    }
    function buildHeader(pn, tp, tc, cb) { return 'v1[' + pn + '/' + tp + ']t:' + tc + '|c:' + cb + '|s:0\n'; }
    function isLowSurrogate(c) { return c >= 0xDC00 && c <= 0xDFFF; }

    function splitText(text, ppc) {
        var chunks = [], cs = 0;
        while (cs < text.length) {
            var ce = cs, bc = 0;
            while (ce < text.length) {
                var code = text.charCodeAt(ce);
                var cl = (code >= 0xD800 && code <= 0xDBFF && ce + 1 < text.length) ? 2 : 1;
                var cb = sharedEncoder.encode(text.substring(ce, ce + cl)).length;
                if (bc + cb > ppc) break;
                bc += cb; ce += cl;
            }
            if (ce === cs) throw new Error('\u65E0\u6CD5\u7F16\u7801\u7684\u5B57\u7B26');
            if (ce < text.length) {
                var bk = {}; bk['\n']=1;bk['\u3002']=1;bk['\uFF01']=1;bk['\uFF1F']=1;bk['\uFF1B']=1;bk['.']=1;bk['!']=1;bk['?']=1;bk[';']=1;bk['\uFF0C']=1;bk[',']=1;bk['\u3001']=1;bk[' ']=1;
                var bb = -1, sl = Math.max(cs, ce - 30);
                for (var i = ce - 1; i >= sl; i--) { if (bk[text[i]]) { bb = i + 1; break; } }
                if (bb > cs) { ce = bb; if (ce < text.length && isLowSurrogate(text.charCodeAt(ce))) ce--; }
            }
            chunks.push(text.substring(cs, ce)); cs = ce;
        }
        return chunks;
    }

    function renderQR(canvas, qr) {
        var mc = qr.getModuleCount();
        var ts = (mc + RENDER_CONFIG.quietZone * 2) * RENDER_CONFIG.moduleSize;
        var dpr = window.devicePixelRatio || 1;
        canvas.style.width = ts + 'px'; canvas.style.height = ts + 'px';
        canvas.width = ts * dpr; canvas.height = ts * dpr;
        var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = RENDER_CONFIG.background; ctx.fillRect(0, 0, ts, ts);
        ctx.fillStyle = RENDER_CONFIG.foreground;
        var off = RENDER_CONFIG.quietZone * RENDER_CONFIG.moduleSize, ms = RENDER_CONFIG.moduleSize;
        for (var r = 0; r < mc; r++) for (var c = 0; c < mc; c++) {
            if (qr.isDark(r, c)) ctx.fillRect(off + c * ms, off + r * ms, ms, ms);
        }
    }

    // ---- Cycling ----
    var qrFrames = [], frameIndex = 0, isPlaying = false, playTimer = null;
    function showToast(m) { var t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(function(){t.classList.remove('show');},2500); }
    function updateFrameIndicator() {
        var el = document.getElementById('frameIndicator');
        if (el && qrFrames.length > 0) el.textContent = (frameIndex + 1) + ' / ' + qrFrames.length;
    }
    function updateStatus(s) { var el = document.getElementById('statusText'); if (el) el.textContent = s; }

    function getFPS() { return parseInt(document.getElementById('fpsSelect').value, 10) || 10; }

    function startPlay() {
        if (qrFrames.length === 0) return;
        isPlaying = true; updateStatus('\u8F6E\u64AD\u4E2D');
        document.getElementById('btnPause').disabled = false;
        document.getElementById('btnStop').disabled = false;
        playTimer = setInterval(function() {
            renderQR(document.getElementById('displayCanvas'), qrFrames[frameIndex]);
            frameIndex = (frameIndex + 1) % qrFrames.length;
            updateFrameIndicator();
        }, 1000 / getFPS());
    }

    function pausePlay() {
        isPlaying = false; clearInterval(playTimer); playTimer = null;
        updateStatus('\u5DF2\u6682\u505C'); document.getElementById('btnPause').disabled = true;
    }

    function stopPlay() {
        pausePlay(); frameIndex = 0; updateStatus('\u5DF2\u505C\u6B62');
        var c = document.getElementById('displayCanvas');
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
        updateFrameIndicator();
    }

    // ---- Text Preprocessing ----
    function preprocessText(raw) {
        var text = raw;
        // HTML entity decode
        var el = document.createElement('textarea');
        el.innerHTML = text;
        text = el.value;
        // Normalize line endings
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        // Remove control chars (keep \n \t)
        text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        // Remove zero-width chars
        text = text.replace(/[\u200B\u200C\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
        // Fullwidth space → halfwidth
        text = text.replace(/\u3000/g, ' ');
        // Tab → space
        text = text.replace(/\t/g, ' ');
        // Collapse spaces
        text = text.replace(/ +/g, ' ');
        // Trim line endings
        text = text.replace(/ +\n/g, '\n');
        // Collapse blank lines
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    }

    function generateAndPlay() {
        if (isPlaying) stopPlay();
        var raw = document.getElementById('inputText').value;
        if (!raw || !raw.trim()) { showToast('\u8BF7\u5148\u8F93\u5165\u6587\u672C'); return; }
        var rawBytes = sharedEncoder.encode(raw).length;
        var text = preprocessText(raw);
        var tb = sharedEncoder.encode(text), totalBytes = tb.length, totalChars = text.length;
        var saved = rawBytes - totalBytes;
        if (saved > 0) showToast('\u9884\u5904\u7406\u8282\u7701\u4E86 ' + saved + ' \u5B57\u8282');
        var vs = document.getElementById('versionSelect');
        var version = vs.value === 'auto' ? selectVersion(totalBytes, ECC_LEVEL) : parseInt(vs.value, 10);
        if (!version) { showToast('\u6587\u672C\u8FC7\u957F'); return; }
        var ppc = calculatePayloadPerCode(version, ECC_LEVEL);
        if (ppc <= 0) { showToast('\u5BB9\u91CF\u4E0D\u8DB3'); return; }
        var est = Math.ceil(totalBytes / ppc);
        if (est > 100 && !confirm('\u5C06\u751F\u6210 ' + est + ' \u5E27\uFF0C\u7EE7\u7EED\uFF1F')) return;
        var chunks; try { chunks = splitText(text, ppc); } catch(e) { showToast(e.message); return; }

        qrFrames = []; frameIndex = 0;
        var total = chunks.length;
        var failed = 0;
        var pc = document.getElementById('progressContainer'), pf = document.getElementById('progressFill');
        var bg = document.getElementById('btnGenerate');
        pc.classList.add('active'); bg.disabled = true; bg.textContent = '\u751F\u6210\u4E2D...';
        var i = 0;
        function next() {
            if (i >= total) {
                pc.classList.remove('active'); bg.disabled = false;
                if (qrFrames.length === 0) {
                    showToast('\u6240\u6709\u5E27\u751F\u6210\u5931\u8D25');
                    bg.textContent = '\u5F00\u59CB\u53D1\u9001';
                    return;
                }
                if (failed > 0) showToast(failed + ' \u5E27\u751F\u6210\u5931\u8D25\uFF0C\u5DF2\u8DF3\u8FC7');
                bg.textContent = '\u5F00\u59CB\u53D1\u9001';
                document.getElementById('displayArea').classList.add('active');
                startPlay(); return;
            }
            var pn = i + 1, ct = chunks[i], cb = sharedEncoder.encode(ct).length;
            var hdr = buildHeader(pn, total, totalChars, cb);
            try { var qr = qrcode(0, ECC_LEVEL); qr.addData(hdr + ct, 'Byte'); qr.make(); qrFrames.push(qr); }
            catch(e) { failed++; showToast('\u7B2C' + pn + '\u5E27\u751F\u6210\u5931\u8D25'); }
            var done = i + 1;
            pf.style.width = Math.round((done / total) * 100) + '%';
            bg.textContent = '\u751F\u6210\u4E2D... (' + done + '/' + total + ')';
            i++; requestAnimationFrame(next);
        }
        requestAnimationFrame(next);
    }

    var statsTimer = null;
    function updateStats() {
        clearTimeout(statsTimer);
        statsTimer = setTimeout(updateStatsNow, 300);
    }
    function updateStatsNow() {
        var raw = document.getElementById('inputText').value;
        var rawCc = raw.length;
        var btn = document.getElementById('btnGenerate');
        if (rawCc === 0) {
            document.getElementById('charCount').textContent = '0';
            document.getElementById('byteCount').textContent = '0';
            document.getElementById('versionDisplay').textContent = '-';
            document.getElementById('codeCount').textContent = '0';
            btn.disabled = true; return;
        }
        var text = preprocessText(raw);
        var cc = text.length, bc = sharedEncoder.encode(text).length;
        document.getElementById('charCount').textContent = cc.toLocaleString();
        document.getElementById('byteCount').textContent = bc.toLocaleString();
        var vs = document.getElementById('versionSelect');
        var v = vs.value === 'auto' ? selectVersion(bc, ECC_LEVEL) : parseInt(vs.value, 10);
        if (!v) { document.getElementById('versionDisplay').textContent = '-'; document.getElementById('codeCount').textContent = '\u8D85\u51FA'; btn.disabled = true; return; }
        var ppc = calculatePayloadPerCode(v, ECC_LEVEL);
        var cnt = Math.ceil(bc / ppc);
        document.getElementById('versionDisplay').textContent = 'V' + v + (vs.value === 'auto' ? '(\u81EA\u52A8)' : '');
        document.getElementById('codeCount').textContent = cnt;
        btn.disabled = false;
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (typeof TextEncoder === 'undefined') { document.body.innerHTML = '<div style="text-align:center;padding:48px;font-size:18px;color:#c00;">\u6D4F\u89C8\u5668\u4E0D\u652F\u6301</div>'; return; }
        document.getElementById('inputText').addEventListener('input', updateStats);
        document.getElementById('versionSelect').addEventListener('change', updateStats);
        document.getElementById('fpsSelect').addEventListener('change', function() { if (isPlaying) { pausePlay(); startPlay(); } });
        document.getElementById('btnGenerate').addEventListener('click', generateAndPlay);
        document.getElementById('btnPause').addEventListener('click', function() { if (isPlaying) pausePlay(); else startPlay(); });
        document.getElementById('btnStop').addEventListener('click', stopPlay);
        updateStats();
    });

