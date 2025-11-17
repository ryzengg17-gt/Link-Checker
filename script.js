// ===========================
// CEK LINK (Deteksi Sederhana)
// ===========================
document.getElementById("checkBtn").addEventListener("click", () => {
    const url = document.getElementById("linkInput").value.trim();
    const resultBox = document.getElementById("result");
  
    if (!url) {
      showResult("Masukkan link terlebih dahulu.", "yellow");
      return;
    }
  
    // RULE DETEKSI
    let score = 100;
  
    if (url.startsWith("http://")) score -= 30;
    if (url.includes("free") || url.includes("gift") || url.includes("bonus")) score -= 25;
    if (url.length > 70) score -= 20;
    if (url.includes("click") || url.includes("verify")) score -= 20;
  
    let kategori = "";
    if (score >= 85) kategori = "Aman ✔️";
    else if (score >= 60) kategori = "Waspada ⚠️";
    else kategori = "Berbahaya ❌";
  
    showResult(
      `Skor Keamanan: <b>${score}/100</b><br>Kategori: <b>${kategori}</b><br><br>
       <small>75–100 Aman<br>50–75 Waspada<br>0–50 Potensi Phising/berbahaya</small>`
    );
  });
  
  // ===========================
  // QR CODE SCAN CAMERA
  // ===========================
  const video = document.getElementById("camera");
  let scanning = false;
  
  document.getElementById("scanBtn").addEventListener("click", async () => {
    const resultBox = document.getElementById("result");
  
    if (scanning) return; // biar tidak dobel
  
    scanning = true;
    resultBox.style.display = "none";
    video.style.display = "block";
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = stream;
  
      // FRAME CHECK
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
  
      const scanLoop = setInterval(() => {
        if (!video.videoWidth) return;
  
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
  
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, canvas.width, canvas.height);
  
          if (code) {
            clearInterval(scanLoop);
            stopCamera();
            showResult("QR Terdeteksi:<br><b>" + code.data + "</b>");
          }
        } catch {}
      }, 500);
    } catch (err) {
      showResult("Kamera gagal dibuka. Izinkan akses kamera.", "red");
    }
  });
  
  // STOP CAMERA
  function stopCamera() {
    video.style.display = "none";
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    scanning = false;
  }
  
  // ===========================
  // TAMPILKAN HASIL
  // ===========================
  function showResult(msg, color = "#00eaff") {
    const resultBox = document.getElementById("result");
    resultBox.style.display = "block";
    resultBox.style.color = color;
    resultBox.innerHTML = msg;
  }