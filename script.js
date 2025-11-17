function checkURL() {
    let url = document.getElementById("urlInput").value.trim();

    if (url === "") {
        alert("Masukkan link dulu!");
        return;
    }

    if (!url.startsWith("http")) {
        url = "https://" + url;
    }

    let resultBox = document.getElementById("result");
    let analysisBox = document.getElementById("analysis");
    let detailTitle = document.getElementById("detailTitle");

    let domain;
    try {
        domain = new URL(url).hostname;
    } catch {
        resultBox.className = "result danger";
        resultBox.innerText = "❌ Link tidak valid!";
        return;
    }

    const suspiciousWords = ["free", "gift", "hadiah", "reward", "bonus", "claim", "login", "verify", "undian"];
    const httpUsed = url.startsWith("http://");
    const longURL = url.length > 80;
    const manySubdomains = domain.split(".").length >= 4;
    const weirdChars = /[%@#&*!]/.test(url);
    const scamWords = suspiciousWords.some(w => url.toLowerCase().includes(w));
    const fakeGoogle = domain.includes("go0gle") || domain.includes("g00gle");

    let score = 100;

    if (httpUsed) score -= 30;
    if (longURL) score -= 20;
    if (manySubdomains) score -= 20;
    if (weirdChars) score -= 10;
    if (scamWords) score -= 25;
    if (fakeGoogle) score -= 40;

    let status = "";
    let statusClass = "";

    if (score >= 80) {
        status = "✔ Aman • Resiko Rendah";
        statusClass = "safe";
    } else if (score >= 50) {
        status = "⚠ Waspada • Bisa Berpotensi Penipuan";
        statusClass = "warning";
    } else {
        status = "❌ Bahaya Tinggi • Sangat Mirip Link Phishing";
        statusClass = "danger";
    }

    resultBox.className = "result " + statusClass;
    resultBox.innerText = status;

    analysisBox.classList.remove("hide");
    detailTitle.classList.remove("hide");

    analysisBox.innerHTML = `
        <div class="item"><b>Domain:</b> ${domain}</div>
        <div class="item"><b>Menggunakan HTTP:</b> ${httpUsed ? "Ya (Berbahaya)" : "Tidak (Aman)"}</div>
        <div class="item"><b>URL Panjang:</b> ${longURL ? "Ya" : "Tidak"}</div>
        <div class="item"><b>Banyak Subdomain:</b> ${manySubdomains ? "Ya" : "Tidak"}</div>
        <div class="item"><b>Karakter Aneh:</b> ${weirdChars ? "Ya" : "Tidak"}</div>
        <div class="item"><b>Kata-kata Scam:</b> ${scamWords ? "Mengandung kata mencurigakan" : "Tidak ada"}</div>
        <div class="item"><b>Palsu Meniru Google:</b> ${fakeGoogle ? "Ya" : "Tidak"}</div>
        <div class="item"><b>Skor Keamanan:</b> ${score}/100</div>
    `;
}