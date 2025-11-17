/* script.js — Link & QR Safety Checker
   - Uses jsQR (CDN) to decode QR from images/camera
   - Performs conservative scoring: avoid false positives where possible
   - Maps score to ranges and descriptions
*/

(() => {
    // DOM
    const urlInput = document.getElementById('urlInput');
    const scanBtn = document.getElementById('scanBtn');
    const resultCard = document.getElementById('resultCard');
    const statusBadge = document.getElementById('statusBadge');
    const scoreValue = document.getElementById('scoreValue');
    const scoreDesc = document.getElementById('scoreDesc');
    const analysisBox = document.getElementById('analysisBox');
    const analysisList = document.getElementById('analysisList');
  
    // QR
    const qrFile = document.getElementById('qrFile');
    const scanImageBtn = document.getElementById('scanImageBtn');
    const cameraToggle = document.getElementById('cameraToggle');
    const qrCanvas = document.getElementById('qrCanvas');
    const qrImage = document.getElementById('qrImage');
    const qrResult = document.getElementById('qrResult');
    const qrText = document.getElementById('qrText');
    const qrAction = document.getElementById('qrAction');
  
    let videoStream = null;
    let cameraOn = false;
  
    // Utility: safe parse URL
    function safeParseURL(input) {
      try {
        if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
        return new URL(input);
      } catch (e) {
        return null;
      }
    }
  
    // Scoring rules (weights) — conservative approach
    // Each check adds a penalty (lower score). Start 100.
    function analyzeURL(fullUrl) {
      const details = [];
      const urlObj = safeParseURL(fullUrl);
      if (!urlObj) {
        details.push({ label: 'Valid URL', ok: false, info: 'URL tidak valid atau tidak bisa diparsing' });
        return { score: 0, details };
      }
  
      const url = urlObj.href;
      const hostname = urlObj.hostname.toLowerCase();
      let score = 100;
  
      // Rule 1: scheme insecure (http)
      if (urlObj.protocol === 'http:') {
        score -= 25;
        details.push({ label: 'Koneksi HTTPS', ok: false, info: 'Menggunakan HTTP (tidak terenkripsi)' });
      } else {
        details.push({ label: 'Koneksi HTTPS', ok: true, info: 'HTTPS/TLS terpasang' });
      }
  
      // Rule 2: length of URL
      if (url.length > 100) {
        score -= 10;
        details.push({ label: 'Panjang URL', ok: false, info: 'URL sangat panjang (sering dipakai utk menyembunyiakan tujuan)' });
      } else {
        details.push({ label: 'Panjang URL', ok: true, info: 'Panjang wajar' });
      }
  
      // Rule 3: banyak subdomain
      const parts = hostname.split('.');
      if (parts.length >= 4) { // e.g. a.b.c.example.com
        score -= 12;
        details.push({ label: 'Jumlah Subdomain', ok: false, info: Subdomain banyak (${parts.length}) — perlu hati-hati });
      } else {
        details.push({ label: 'Jumlah Subdomain', ok: true, info: 'Jumlah subdomain normal' });
      }
  
      // Rule 4: presence of suspicious words (conservative list)
      const suspicious = ['free','gift','hadiah','reward','bonus','claim','login','verify','secure-login','account-update','confirm','bank','update','scam','undian'];
      const foundSusp = suspicious.filter(s => url.toLowerCase().includes(s));
      if (foundSusp.length) {
        score -= Math.min(35, foundSusp.length * 12);
        details.push({ label: 'Kata mencurigakan', ok: false, info: Menemukan kata: ${foundSusp.join(', ')} });
      } else {
        details.push({ label: 'Kata mencurigakan', ok: true, info: 'Tidak ditemukan kata umum scam' });
      }
  
      // Rule 5: many numeric sequences (often dynamic tracking or obfuscation)
      if (/[0-9]{6,}/.test(url)) {
        score -= 8;
        details.push({ label: 'Deret angka panjang', ok: false, info: 'Terdapat deret angka panjang di URL' });
      } else {
        details.push({ label: 'Deret angka', ok: true, info: 'Tidak ada deret angka panjang' });
      }
  
      // Rule 6: lookalike domains (simple heuristics: repeated characters or 0 for o)
      const lookalikeIndicators = [/go0gle/, /g00gle/, /faceb00k/, /paypa1/, /micr0soft/, /amaz0n/];
      const matchedLook = lookalikeIndicators.find(rx => rx.test(hostname));
      if (matchedLook) {
        score -= 40;
        details.push({ label: 'Domain menyerupai brand', ok: false, info: Domain mirip brand terkenal (${hostname.match(matchedLook)}) });
      } else {
        details.push({ label: 'Brand spoof', ok: true, info: 'Tidak meniru brand populer' });
      }
  
      // Rule 7: unicode punycode / weird characters
      if (/xn--/.test(hostname) || /[^\x00-\x7F]/.test(hostname)) {
        score -= 15;
        details.push({ label: 'Punycode/Unicode', ok: false, info: 'Domain mengandung karakter unicode / punycode' });
      } else {
        details.push({ label: 'Punycode/Unicode', ok: true, info: 'Domain ASCII biasa' });
      }
  
      // Rule 8: top-level domain suspicious (very short rule: .xyz .club .top often used by scam)
      const tld = hostname.split('.').pop();
      const riskyTLDs = ['xyz','top','club','online','pw','site','icu','bid'];
      if (riskyTLDs.includes(tld)) {
        score -= 8;
        details.push({ label: 'TLD', ok: false, info: TLD ${tld} terkadang dipakai scam });
      } else {
        details.push({ label: 'TLD', ok: true, info: TLD ${tld} umum/lebih aman });
      }
  
      // Final clamp
      if (score < 0) score = 0;
      if (score > 100) score = 100;
  
      // Conservative step: if at least two heavy flags (brand spoof, http, suspicious words) then lower further
      const heavyFlags = [
        urlObj.protocol === 'http:',
        foundSusp.length > 0,
        !!matchedLook
      ];
      const heavyCount = heavyFlags.filter(Boolean).length;
      if (heavyCount >= 2) score = Math.min(score, 45);
  
      return { score, details, url: urlObj.href, hostname };
    }
  
    // Map score to status and description
    function mapScore(score) {
      if (score >= 75) return { status: 'Aman', className: 'safe', desc: 'Skor 75–100: Berpotensi aman. Meski aman, selalu cek domain dan jangan masukkan data sensitif kecuali kamu yakin.' };
      if (score >= 50) return { status: 'Waspada', className: 'warning', desc: 'Skor 50–74: Perlu kehati-hatian. Bisa jadi penipuan atau domain baru. Periksa ulang domain dan jangan masukkan informasi pribadi.' };
      return { status: 'Bahaya', className: 'danger', desc: 'Skor 0–49: Potensi penipuan tinggi. Hindari klik atau masukkan data.' };
    }
  
    // Update UI with analysis result
    function showResult(res) {
      resultCard.classList.remove('hidden');
      analysisBox.classList.remove('hidden');
  
      const mapped = mapScore(res.score);
      statusBadge.textContent = mapped.status;
      statusBadge.className = 'badge ' + mapped.className;
      scoreValue.textContent = res.score;
      scoreDesc.textContent = mapped.desc;
  
      // fill analysis list
      analysisList.innerHTML = '';
      res.details.forEach(d => {
        const li = document.createElement('li');
        li.innerHTML = <div class="label">${d.label}</div><div class="value">${d.ok ? 'OK' : '⚠️'}<div class="muted small" style="margin-top:6px;font-weight:400">${d.info}</div></div>;
        analysisList.appendChild(li);
      });
  
      // Also show subtle glow by class
      resultCard.classList.add('pulse-glow');
      setTimeout(()=> resultCard.classList.remove('pulse-glow'), 1200);
    }
  
    // Button handler: analyze input
    scanBtn.addEventListener('click', () => {
      const v = urlInput.value.trim();
      if (!v) {
        alert('Masukkan URL dulu');
        return;
      }
      const res = analyzeURL(v);
      showResult(res);
    });
  
    // quick sample chips
    document.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', e => {
        urlInput.value = e.target.textContent;
      });
    });
  
    // ----- QR: Scan from image -----
    scanImageBtn.addEventListener('click', () => {
      const f = qrFile.files && qrFile.files[0];
      if (!f) {
        alert('Pilih gambar QR dulu');
        return;
      }
      const reader = new FileReader();
      reader.onload = function(ev) {
        const img = new Image();
        img.onload = function() {
          // draw to canvas
          qrCanvas.width = img.width;
          qrCanvas.height = img.height;
          const ctx = qrCanvas.getContext('2d');
          ctx.drawImage(img,0,0);
          const imgData = ctx.getImageData(0,0,qrCanvas.width,qrCanvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code) {
            showQRResult(code.data);
          } else {
            alert('QR tidak terdeteksi, coba gambar lain atau pastikan kualitas cukup baik.');
          }
        };
        img.src = ev.target.result;
        // preview
        qrImage.src = ev.target.result;
        qrImage.classList.remove('hidden');
        qrCanvas.classList.add('hidden');
      };
      reader.readAsDataURL(f);
    });
  
    // show text + analyze if QR contains url
    function showQRResult(text) {
      qrResult.classList.remove('hidden');
      qrText.textContent = text;
      qrAction.innerHTML = '';
      // If looks like URL -> analyze
      const parsed = safeParseURL(text);
      if (parsed) {
        const btn = document.createElement('button');
        btn.textContent = 'Analisis URL dari QR';
        btn.className = 'primary';
        btn.addEventListener('click', () => {
          urlInput.value = parsed.href;
          const res = analyzeURL(parsed.href);
          showResult(res);
        });
        qrAction.appendChild(btn);
      } else {
        const span = document.createElement('div');
        span.textContent = 'QR bukan URL (teks biasa).';
        qrAction.appendChild(span);
      }
    }
  
    // ----- Camera scanning (optional) -----
    cameraToggle.addEventListener('click', async () => {
      if (cameraOn) {
        stopCamera();
        cameraToggle.textContent = 'Gunakan Kamera';
        cameraOn = false;
        return;
      }
      // start camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoStream = stream;
        cameraOn = true;
        cameraToggle.textContent = 'Stop Kamera';
        // create video element (hidden)
        const v = document.createElement('video');
        v.setAttribute('playsinline','true');
        v.srcObject = stream;
        v.play();
        // draw frames and scan
        const ctx = qrCanvas.getContext('2d');
        (function scanLoop(){
          if (!cameraOn) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            // scale canvas to video size (limit to 640 width for perf)
            const w = v.videoWidth;
            const h = v.videoHeight;
            const maxW = 640;
            const scale = w > maxW ? (maxW / w) : 1;
            qrCanvas.width = Math.floor(w * scale);
            qrCanvas.height = Math.floor(h * scale);
            ctx.drawImage(v, 0, 0, qrCanvas.width, qrCanvas.height);
            const imgData = ctx.getImageData(0,0,qrCanvas.width,qrCanvas.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code) {
              // found
              stopCamera();
              qrImage.classList.add('hidden');
              qrCanvas.classList.remove('hidden');
              showQRResult(code.data);
              return;
            }
          }
          requestAnimationFrame(scanLoop);
        })();
      } catch (err) {
        alert('Tidak dapat mengakses kamera: ' + (err.message || err));
        cameraOn = false;
      }
    });
  
    function stopCamera(){
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
        videoStream = null;
      }
      cameraOn = false;
      cameraToggle.textContent = 'Gunakan Kamera';
    }
  
    // Theme toggle (light/dark)
    const themeToggle = document.getElementById('themeToggle');
    let dark = true;
    themeToggle.addEventListener('click', () => {
      dark = !dark;
      if (dark) {
        document.documentElement.style.setProperty('--bg', '#0b1220');
        document.documentElement.style.setProperty('--panel', '#0f1724');
        document.documentElement.style.setProperty('--muted', '#9aa4b2');
        themeToggle.innerHTML = '<i class="fa fa-moon"></i>';
      } else {
        document.documentElement.style.setProperty('--bg', '#ffffff');
        document.documentElement.style.setProperty('--panel', '#f6f8fb');
        document.documentElement.style.setProperty('--muted', '#556275');
        themeToggle.innerHTML = '<i class="fa fa-sun"></i>';
      }
    });
  
    // quick: support enter key
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') scanBtn.click();
    });
  
    // cleanup on page unload
    window.addEventListener('beforeunload', () => stopCamera());
  
  })();