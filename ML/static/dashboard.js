const labels = ['normal', 'watch', 'warning', 'critical', 'SENSOR_FAULT', 'UNCERTAIN'];
const colors = ['#d7ef64', '#63c8c2', '#ffb454', '#ff6b5f', '#d6a7ff', '#9da8ff'];
const riskChart = new Chart(document.getElementById('risk-chart'), {
  type: 'bar', data: { labels, datasets: [{ data: labels.map(() => 0), backgroundColor: colors, borderRadius: 2, barPercentage: .72 }] },
  options: { animation: false, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8ea09e' }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: '#8ea09e', precision: 0 }, grid: { color: '#263837' } } } }
});
const trendChart = new Chart(document.getElementById('trend-chart'), {
  type: 'line', data: { labels: [], datasets: [{ label: 'Confidence', data: [], borderColor: '#d7ef64', yAxisID: 'confidence', pointRadius: 0, tension: .25 }, { label: 'Latency (ms)', data: [], borderColor: '#63c8c2', yAxisID: 'latency', pointRadius: 0, tension: .25 }] },
  options: { animation: false, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { x: { ticks: { color: '#8ea09e', maxTicksLimit: 6 }, grid: { display: false } }, confidence: { min: 0, max: 1, position: 'left', ticks: { color: '#d7ef64' }, grid: { color: '#263837' } }, latency: { min: 0, position: 'right', ticks: { color: '#63c8c2' }, grid: { display: false } } }, plugins: { legend: { labels: { color: '#eaf1ef' } } } }
});
function riskClass(risk) { return `risk-${risk.toLowerCase()}`; }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character])); }
function render(data) {
  riskChart.data.datasets[0].data = labels.map(label => data.status_counts[label] || 0); riskChart.update();
  const readings = data.readings || [];
  trendChart.data.labels = readings.map((_, i) => i + 1); trendChart.data.datasets[0].data = readings.map(item => item.confidence); trendChart.data.datasets[1].data = readings.map(item => item.latency_ms); trendChart.update();
  document.getElementById('device-count').textContent = data.known_devices.length; document.getElementById('reading-count').textContent = readings.length; document.getElementById('last-update').textContent = new Date().toLocaleTimeString(); document.getElementById('table-note').textContent = `${readings.length} retained`;
  document.getElementById('readings-body').innerHTML = readings.slice().reverse().slice(0, 20).map(item => `<tr><td>${new Date(item.timestamp).toLocaleTimeString()}</td><td>${escapeHtml(item.device)}</td><td class="risk ${riskClass(item.risk)}">${escapeHtml(item.risk)}</td><td>${(item.confidence * 100).toFixed(1)}%</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No readings received yet</td></tr>';
}
async function poll() { try { const response = await fetch('/api/live', { cache: 'no-store' }); if (!response.ok) throw new Error(response.status); render(await response.json()); document.body.classList.add('online'); document.getElementById('connection-text').textContent = 'Live'; } catch (error) { document.body.classList.remove('online'); document.getElementById('connection-text').textContent = 'Disconnected'; } }
poll(); setInterval(poll, 1500);
