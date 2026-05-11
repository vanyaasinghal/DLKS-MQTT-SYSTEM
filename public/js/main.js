// ─── DLKS-MQTT Frontend Logic ─────────────────────────────────────────────────

let currentDevice = '';

async function runHandshake() {
  const deviceId = document.getElementById('deviceId').value.trim();
  if (!deviceId) {
    alert('Please enter a Device ID first.');
    return;
  }

  currentDevice = deviceId;

  // Reset UI
  ['step1','step2','step3'].forEach(id => {
    const el = document.getElementById(id);
    el.style.display = 'none';
  });

  // Step 1 — Initiate
  await delay(200);
  await runStep1(deviceId);

  // Step 2 — Verify
  await delay(900);
  await runStep2(deviceId);

  // Step 3 — Establish
  await delay(900);
  await runStep3(deviceId);

  // Refresh sessions
  await delay(400);
  loadSessions();
}

async function runStep1(deviceId) {
  const el = document.getElementById('step1');
  el.style.display = 'block';
  document.getElementById('s1status').textContent = '⏳ Sending…';
  document.getElementById('s1status').className = 'step-status';
  document.getElementById('s1output').textContent = 'Generating K_sess and Nonce…';

  try {
    const res = await fetch('/api/handshake/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    const data = await res.json();

    document.getElementById('s1status').textContent = '✅ Sent';
    document.getElementById('s1status').className = 'step-status ok';
    document.getElementById('s1output').textContent = formatJson(data);
  } catch (e) {
    document.getElementById('s1status').textContent = '❌ Error';
    document.getElementById('s1status').className = 'step-status err';
    document.getElementById('s1output').textContent = String(e);
  }
}

async function runStep2(deviceId) {
  const el = document.getElementById('step2');
  el.style.display = 'block';
  document.getElementById('s2status').textContent = '⏳ Verifying…';
  document.getElementById('s2status').className = 'step-status';
  document.getElementById('s2output').textContent = 'Broker validating nonce and hash…';

  try {
    const res = await fetch('/api/handshake/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    const data = await res.json();

    const ok = data.authenticated;
    document.getElementById('s2status').textContent = ok ? '✅ Authenticated' : '❌ Failed';
    document.getElementById('s2status').className = 'step-status ' + (ok ? 'ok' : 'err');
    document.getElementById('s2output').textContent = formatJson(data);
  } catch (e) {
    document.getElementById('s2status').textContent = '❌ Error';
    document.getElementById('s2status').className = 'step-status err';
    document.getElementById('s2output').textContent = String(e);
  }
}

async function runStep3(deviceId) {
  const el = document.getElementById('step3');
  el.style.display = 'block';
  document.getElementById('s3status').textContent = '⏳ Establishing…';
  document.getElementById('s3status').className = 'step-status';
  document.getElementById('s3output').textContent = 'Sending CONNACK…';

  try {
    const res = await fetch('/api/handshake/establish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    const data = await res.json();

    document.getElementById('s3status').textContent = '✅ Session Active';
    document.getElementById('s3status').className = 'step-status ok';
    document.getElementById('s3output').textContent = formatJson(data);
  } catch (e) {
    document.getElementById('s3status').textContent = '❌ Error';
    document.getElementById('s3status').className = 'step-status err';
    document.getElementById('s3output').textContent = String(e);
  }
}

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    const sessions = await res.json();
    const container = document.getElementById('sessionsTable');

    if (!sessions.length) {
      container.innerHTML = '<p class="empty-msg">No active sessions yet.</p>';
      return;
    }

    const rows = sessions.map(s => `
      <tr>
        <td>${s.deviceId}</td>
        <td>${s.kSess ? s.kSess.slice(0,12) + '…' : '—'}</td>
        <td>${s.nonce || '—'}</td>
        <td><span class="badge-status badge-${s.status}">${s.status.toUpperCase()}</span></td>
        <td>${s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : '—'}</td>
        <td>
          <button class="btn-ghost btn-sm" onclick="deleteSession('${s.deviceId}')">✕</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="session-table">
        <thead>
          <tr>
            <th>Device ID</th>
            <th>K_sess (preview)</th>
            <th>Nonce</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (e) {
    console.error(e);
  }
}

async function deleteSession(deviceId) {
  await fetch(`/api/sessions/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
  loadSessions();
}

function clearDemo() {
  ['step1','step2','step3'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('deviceId').value = '';
}

function formatJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Load sessions on page load
window.addEventListener('DOMContentLoaded', () => {
  loadSessions();

  // Animate stat bars on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.glass-card').forEach(el => observer.observe(el));
});
