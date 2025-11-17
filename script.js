// =============================
// VALIDASI URL
// =============================
function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// =============================
// CEK LINK MENGGUNAKAN API
// =============================
async function checkLink() {
    const input = document.getElementById("urlInput").value.trim();
    const resultCard = document.getElementById("resultCard");
    const scoreValue = document.getElementById("scoreValue");
    const scoreDesc = document.getElementById("scoreDesc");
    const statusBadge = document.getElementById("statusBadge");
    const analysisList = document.getElementById("analysisList");

    if (!isValidURL(input)) {
        alert("URL tidak valid!");
        return;
    }

    resultCard.classList.remove("hidden");
    scoreDesc.innerHTML = "Sedang mengecek link... 🔍";
    analysisList.innerHTML = "";

    try {
        // Proxy API (tidak perlu API key)
        const res = await fetch("https://api.picasafe.xyz/check?url=" + encodeURIComponent(input));
        const data = await res.json();

        let score = data.safe ? 95 : 20;
        scoreValue.innerText = score;

        if (score >= 85) {
            statusBadge.innerText = "Aman ✔";
            statusBadge.className = "badge safe";
            scoreDesc.innerText = "Link aman digunakan.";
        } else {
            statusBadge.innerText = "Berbahaya ❌";
            statusBadge.className = "badge danger";
            scoreDesc.innerText = "Link terdeteksi berbahaya.";
        }

        // Analisis tambahan
        analysisList.innerHTML = `
            <li>URL: ${input}</li>
            <li>Status: ${data.safe ? "Tidak ditemukan malware" : "Berbahaya / phishing"}</li>
            <li>Confidence: ${score}%</li>
        `;

    } catch {
        scoreDesc.innerText = "Gagal memeriksa link.";
    }
}

// =============================
// SCAN QR DARI GAMBAR
// =============================
document.getElementById("qrFile").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;

    try {
        const qr = new Html5Qrcode("");
        const decoded = await qr.scanFile(file, true);

        document.getElementById("urlInput").value = decoded;
        alert("QR berhasil dibaca!");
    } catch {
        alert("QR tidak dapat dibaca.");
    }
});

// =============================
// SCAN QR MENGGUNAKAN KAMERA
// =============================
let cameraActive = false;
let qrScanner;

document.getElementById("cameraToggle").addEventListener("click", async () => {
    if (cameraActive) {
        qrScanner.stop();
        cameraActive = false;
        document.getElementById("cameraToggle").innerHTML = <i class="fa fa-camera"></i> Gunakan Kamera;
        document.getElementById("qrPreview").classList.add("hidden");
        return;
    }

    const readerBox = document.createElement("div");
    readerBox.id = "qrReader";
    document.getElementById("qrPreview").prepend(readerBox);
    document.getElementById("qrPreview").classList.remove("hidden");

    qrScanner = new Html5Qrcode("qrReader");

    const cameras = await Html5Qrcode.getCameras();
    if (cameras.length === 0) {
        alert("Kamera tidak ditemukan!");
        return;
    }

    cameraActive = true;
    document.getElementById("cameraToggle").innerHTML = <i class="fa fa-stop"></i> Stop Kamera;

    qrScanner.start(
        cameras[0].id,
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            document.getElementById("urlInput").value = decodedText;
            alert("QR Berhasil dipindai ✔");
            qrScanner.stop();
            cameraActive = false;
            document.getElementById("cameraToggle").innerHTML = <i class="fa fa-camera"></i> Gunakan Kamera;
        }
    );
});

// =============================
// CLICK BUTTON LINK CHECK
// =============================
document.getElementById("scanBtn").addEventListener("click", checkLink);