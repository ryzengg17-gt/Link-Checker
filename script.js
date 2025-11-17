/* script.js FINAL — Cyber Link & QR Safety Checker
   - Improved URL analysis (more accurate scoring)
   - QR scanning (image + camera)
   - Stable QR detection using html5-qrcode
*/

(() => {
    // DOM
    const urlInput = document.getElementById("urlInput");
    const scanBtn = document.getElementById("scanBtn");
    const resultCard = document.getElementById("resultCard");
    const statusBadge = document.getElementById("statusBadge");
    const scoreValue = document.getElementById("scoreValue");
    const scoreDesc = document.getElementById("scoreDesc");
    const analysisBox = document.getElementById("analysisBox");
    const analysisList = document.getElementById("analysisList");
  
    const qrFile = document.getElementById("qrFile");
    const qrImage = document.getElementById("qrImage");
    const qrCanvas = document.getElementById("qrCanvas");
    const qrResult = document.getElementById("qrResult");
    const qrText = document.getElementById("qrText");
    const qrAction = document.getElementById("qrAction");
  
    const cameraToggle = document.getElementById("cameraToggle");
    let cameraActive = false;
    let cameraInstance = null;
  
    // SAFE URL PARSER
    function safeParseURL(input) {
      try {
        if (!/^https?:\/\//i.test(input)) input = "https://" + input;
        return new URL(input);
      } catch {
        return null;
      }
    }
  
    // URL ANALYZER (VERY ACCURATE)
    function analyzeURL(link) {
      const details = [];
      const parsed = safeParseURL(link);
      if (!parsed) {
        return {
          score: 0,
          details: [{ label: "Valid URL", ok: false, info: "URL tidak valid" }],
        };
      }
  
      let score = 100;
      const url = parsed.href;
      const hostname = parsed.hostname.toLowerCase();
  
      // 1. HTTPS check
      if (parsed.protocol === "http:") {
        score -= 20;
        details.push({
          label: "HTTPS",
          ok: false,
          info: "Menggunakan HTTP (tidak aman)",
        });
      } else {
        details.push({ label: "HTTPS", ok: true, info: "Aman" });
      }
  
      // 2. Long URL
      if (url.length > 120) {
        score -= 10;
        details.push({
          label: "Panjang URL",
          ok: false,
          info: "URL terlalu panjang (sering dipakai scam)",
        });
      } else {
        details.push({ label: "Panjang URL", ok: true, info: "Normal" });
      }
  
      // 3. Suspicious keywords
      const badWords = [
        "login",
        "verify",
        "secure",
        "claim",
        "bonus",
        "hadiah",
        "scam",
        "reward",
        "auth",
        "bank",
        "confirm",
      ];
  
      const found = badWords.filter((w) => url.includes(w));
      if (found.length) {
        score -= found.length * 10;
        details.push({
          label: "Kata Mencurigakan",
          ok: false,
          info: "Ditemukan: " + found.join(", "),
        });
      } else {
        details.push({ label: "Kata Mencurigakan", ok: true, info: "Tidak ada" });
      }
  
      // 4. Lookalike brand spoof domains
      const lookalike = [/g00gle/, /go0gle/, /paypa1/, /faceb00k/];
      const match = lookalike.find((x) => x.test(hostname));
  
      if (match) {
        score -= 35;
        details.push({
          label: "Peniruan Brand",
          ok: false,
          info: "Domain meniru brand terkenal",
        });
      } else {
        details.push({
          label: "Peniruan Brand",
          ok: true,
          info: "Tidak ada indikasi",
        });
      }
  
      // 5. Dangerous TLDs
      const tld = hostname.split(".").pop();
      const riskyTLD = ["xyz", "top", "loan", "click", "work", "shop", "buzz"];
      if (riskyTLD.includes(tld)) {
        score -= 10;
        details.push({
          label: "TLD",
          ok: false,
          info: TLD .${tld} sering dipakai phishing,
        });
      } else {
        details.push({ label: "TLD", ok: true, info: .${tld} normal });
      }
  
      // Final clamp
      if (score < 0) score = 0;
      if (score > 100) score = 100;
  
      return { score, details };
    }
  
    // SCORE INTERPRETATION
    function mapScore(score) {
      if (score >= 75)
        return {
          s: "Aman",
          class: "safe",
          desc: "Skor 75–100: Cenderung aman, namun tetap berhati-hati.",
        };
      if (score >= 50)
        return {
          s: "Waspada",
          class: "warning",
          desc: "Skor 50–74: Berpotensi mencurigakan, jangan input data penting.",
        };
      return {
        s: "Bahaya",
        class: "danger",
        desc: "Skor 0–49: Sangat berbahaya, kemungkinan phishing tinggi!",
      };
    }
  
    // DISPLAY RESULT
    function showResult(res) {
      resultCard.classList.remove("hidden");
      analysisBox.classList.remove("hidden");
  
      const m = mapScore(res.score);
  
      statusBadge.className = "badge " + m.class;
      statusBadge.textContent = m.s;
      scoreValue.textContent = res.score;
      scoreDesc.textContent = m.desc;
  
      analysisList.innerHTML = "";
      res.details.forEach((d) => {
        const item = document.createElement("li");
        item.innerHTML = `
          <div><b>${d.label}</b></div>
          <div>${d.ok ? "✔️" : "⚠️"} — ${d.info}</div>
        `;
        analysisList.appendChild(item);
      });
    }
  
    // LINK CHECKER BUTTON
    scanBtn.addEventListener("click", () => {
      const value = urlInput.value.trim();
      if (!value) return alert("Masukkan URL dulu!");
  
      const result = analyzeURL(value);
      showResult(result);
    });
  
    // SCAN QR FROM IMAGE
    qrFile.addEventListener("change", () => {
      const file = qrFile.files[0];
      if (!file) return;
  
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const ctx = qrCanvas.getContext("2d");
          qrCanvas.width = img.width;
          qrCanvas.height = img.height;
          ctx.drawImage(img, 0, 0);
  
          const imageData = ctx.getImageData(
            0,
            0,
            qrCanvas.width,
            qrCanvas.height
          );
  
          // decode using jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          qrImage.src = e.target.result;
          qrImage.classList.remove("hidden");
  
          if (code) {
            displayQRResult(code.data);
          } else {
            alert("QR tidak terdeteksi.");
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  
    // SHOW QR TEXT & ACTION
    function displayQRResult(text) {
      qrResult.classList.remove("hidden");
      qrText.textContent = text;
      qrAction.innerHTML = "";
  
      const parsed = safeParseURL(text);
      if (parsed) {
        const btn = document.createElement("button");
        btn.textContent = "Analisis URL dari QR";
        btn.className = "btn-primary";
        btn.onclick = () => {
          urlInput.value = parsed.href;
          const res = analyzeURL(parsed.href);
          showResult(res);
        };
        qrAction.appendChild(btn);
      }
    }
  
    // CAMERA SCAN
    cameraToggle.addEventListener("click", () => {
      if (!cameraActive) startCamera();
      else stopCamera();
    });
  
    function startCamera() {
      const scannerDiv = document.createElement("div");
      scannerDiv.id = "qr-scanner";
      scannerDiv.style.width = "100%";
      document.body.appendChild(scannerDiv);
  
      cameraInstance = new Html5Qrcode("qr-scanner");
  
      cameraInstance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          stopCamera();
          displayQRResult(decodedText);
        }
      );
  
      cameraToggle.innerHTML = '<i class="fa fa-stop"></i> Stop Kamera';
      cameraActive = true;
    }
  
    function stopCamera() {
      if (cameraInstance) {
        cameraInstance.stop();
        cameraInstance.clear();
        cameraInstance = null;
      }
  
      const s = document.getElementById("qr-scanner");
      if (s) s.remove();
  
      cameraToggle.innerHTML = '<i class="fa fa-camera"></i> Gunakan Kamera';
      cameraActive = false;
    }
  
    window.addEventListener("beforeunload", () => stopCamera());
  })();