/* ─── Slider sync ─── */
function syncField(fieldId, rangeId) {
  document.getElementById(fieldId).value = document.getElementById(rangeId).value;
}
function syncRange(fieldId, rangeId) {
  document.getElementById(rangeId).value = document.getElementById(fieldId).value;
}

/* ─── Analyze ─── */
function analyze() {
  let study      = +document.getElementById("study").value || 0;
  let sleep      = +document.getElementById("sleep").value || 0;
  let assignment = +document.getElementById("assignment").value || 0;
  let screen     = +document.getElementById("screen").value || 0;
  let stress     = +document.getElementById("stress").value || 0;
  let session    = document.getElementById("session").value;

  let score = 0;
  if (sleep <= 4) score += 30; else if (sleep == 5) score += 20; else if (sleep == 6) score += 10;
  if (study > 10) score += 25; else if (study >= 9) score += 20; else if (study >= 7) score += 10;
  if (assignment >= 4) score += 25; else if (assignment == 3) score += 15; else if (assignment == 2) score += 10;
  if (screen > 10) score += 25; else if (screen >= 8) score += 20; else if (screen >= 5) score += 10;
  if (stress >= 9) score += 30; else if (stress >= 7) score += 20; else if (stress >= 4) score += 10;

  let risk = "Low";
  if (score > 70) risk = "High";
  else if (score > 35) risk = "Moderate";

  let probability = Math.round((score / 120) * 100);
  let csi = (score / 120 * 10).toFixed(1);

  /* Update UI */
  document.getElementById("score").innerText = score;
  document.getElementById("csi").innerText   = csi;
  document.getElementById("percentage").innerText = probability + "%";

  updateRing(probability, risk);
  updateRiskBadge(risk);
  giveRecommendation(risk);

  /* Save */
  let data = JSON.parse(localStorage.getItem("burnoutData")) || [];
  data.push({ datetime: new Date().toISOString(), score, risk, session });
  localStorage.setItem("burnoutData", JSON.stringify(data));

  checkTrend(data);
  updateSummary(data);
  drawChart();

  /* Flash message */
  const msg = document.getElementById("message");
  msg.innerText = "✓ Analysis saved";
  setTimeout(() => { msg.innerText = ""; }, 2000);
}

/* ─── Ring ─── */
function updateRing(percent, risk) {
  const circle = document.querySelector(".ring-progress");
  if (!circle) return;
  const r = 50;
  const circumference = 2 * Math.PI * r;
  circle.style.strokeDasharray  = circumference;
  circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  const colors = { Low: "#22d98a", Moderate: "#f5a623", High: "#f75a5a" };
  circle.style.stroke = colors[risk];
}

/* ─── Risk Badge ─── */
function updateRiskBadge(risk) {
  const badge = document.getElementById("riskBadge");
  if (!badge) return;
  badge.className = "risk-badge " + risk.toLowerCase();
  badge.innerText = "● " + risk;
}

/* ─── Recommendation ─── */
function giveRecommendation(risk) {
  const messages = {
    Low:      "Behavioral metrics indicate stable cognitive load. Keep maintaining healthy study and sleep patterns.",
    Moderate: "Early strain patterns detected. Consider reducing screen time and scheduling short recovery breaks.",
    High:     "Critical overload probability detected. Immediate rest and recovery is strongly recommended."
  };
  const el = document.getElementById("recommendation");
  if (el) {
    el.innerText = messages[risk];
    el.style.borderLeftColor = risk === "Low" ? "var(--low)" : risk === "Moderate" ? "var(--mid)" : "var(--high)";
  }
}

/* ─── Trend ─── */
function checkTrend(data) {
  if (data.length < 2) return;
  let last = data[data.length - 1].score;
  let prev = data[data.length - 2].score;

  let trendText = last > prev ? "↑ Up" : last < prev ? "↓ Down" : "→ Stable";
  const el = document.getElementById("trend");
  if (el) el.innerText = trendText;

  const warn = document.getElementById("warning");
  if (!warn) return;
  if (data.length >= 7) {
    let avg = data.slice(-7).reduce((s,e) => s + e.score, 0) / 7;
    if (last > avg + 15) {
      warn.classList.add("visible");
      return;
    }
  }
  warn.classList.remove("visible");
}

/* ─── Daily Summary ─── */
function updateSummary(data) {
  let today    = new Date().toISOString().split('T')[0];
  let todayData = data.filter(e => e.datetime.startsWith(today));
  let count    = todayData.length;
  let avg      = count > 0 ? Math.round(todayData.reduce((s,e) => s + e.score, 0) / count) : 0;

  const entriesEl     = document.getElementById("entries");
  const avgScoreEl    = document.getElementById("avgScore");
  const entriesCount  = document.getElementById("entriesCount");
  const avgScoreToday = document.getElementById("avgScoreToday");
  if (entriesEl)     entriesEl.innerText     = count;
  if (avgScoreEl)    avgScoreEl.innerText    = "Avg today: " + avg;
  if (entriesCount)  entriesCount.innerText  = count;
  if (avgScoreToday) avgScoreToday.innerText = avg || "—";
}

/* ─── Chart ─── */
let chartInstance = null;

function drawChart() {
  const data  = JSON.parse(localStorage.getItem("burnoutData")) || [];
  const last7 = data.slice(-7);
  const ctx   = document.getElementById("trendChart");
  if (!ctx) return;

  if (chartInstance) { chartInstance.destroy(); }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7.map(e => new Date(e.datetime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})),
      datasets: [{
        label: 'Burnout Score',
        data: last7.map(e => e.score),
        borderColor: '#4f8ef7',
        backgroundColor: 'rgba(79,142,247,0.08)',
        tension: 0.45,
        fill: true,
        pointBackgroundColor: last7.map(e =>
          e.risk === 'High' ? '#f75a5a' : e.risk === 'Moderate' ? '#f5a623' : '#22d98a'
        ),
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0e1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#6b7a99',
          bodyColor: '#e8edf5',
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#3d4f6e', font: { size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#3d4f6e', font: { size: 11 } },
          min: 0,
          max: 120
        }
      }
    }
  });
}

/* ─── History Page ─── */
function loadHistory() {
  const data  = JSON.parse(localStorage.getItem("burnoutData")) || [];
  const table = document.getElementById("historyTable");
  const count = document.getElementById("recordCount");
  if (!table) return;

  if (count) count.innerText = data.length + " entr" + (data.length === 1 ? "y" : "ies");

  if (data.length === 0) {
    table.innerHTML = `
      <tr><td colspan="4">
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>No records yet. Go to Dashboard and analyze your first session.</p>
        </div>
      </td></tr>`;
    return;
  }

  table.innerHTML = [...data].reverse().map(e => {
    const d = new Date(e.datetime);
    const riskColors = { Low: '#22d98a', Moderate: '#f5a623', High: '#f75a5a' };
    const color = riskColors[e.risk] || '#22d98a';
    return `
    <tr>
      <td>${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
      <td>${e.session}</td>
      <td><strong>${e.score}</strong></td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:7px;">
          <span class="risk-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>
          <span style="color:${color};font-weight:600;">${e.risk}</span>
        </span>
      </td>
    </tr>`;
  }).join('');
}

/* ─── Init ─── */
loadHistory();
drawChart();

const savedData = JSON.parse(localStorage.getItem("burnoutData")) || [];
if (savedData.length > 0) {
  checkTrend(savedData);
  updateSummary(savedData);
}
