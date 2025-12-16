// Get Docker Desktop client
const dd = window.ddClient;

// DOM elements
const log = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logsBtn = document.getElementById('logsBtn');
const logsModal = document.getElementById('logsModal');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const indicator = document.getElementById('indicator');
const statusText = document.getElementById('statusText');
const temporalFrame = document.getElementById('temporalFrame');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');

// State
let iframeLoading = false;

// Modal handlers
logsBtn.onclick = () => logsModal.classList.add('show');
closeLogsBtn.onclick = () => logsModal.classList.remove('show');
logsModal.onclick = (e) => {
  if (e.target === logsModal) logsModal.classList.remove('show');
};

// Iframe load handler
temporalFrame.onload = () => {
  if (temporalFrame.src !== 'about:blank') {
    setTimeout(() => {
      loadingOverlay.classList.remove('show');
    }, 500);
  }
};

// Logging function
function addLog(msg, type = 'info') {
  const div = document.createElement('div');
  div.className = 'log-entry ' + type;
  div.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// Status check function
async function checkStatus() {
  try {
    const result = await dd.docker.cli.exec('ps', [
      '--filter', 'name=temporal-dev',
      '--format', '{{.Status}}'
    ]);
    const running = result.stdout && result.stdout.includes('Up');
    updateUI(running);
  } catch (e) {
    updateUI(false);
  }
}

// Update UI based on status
function updateUI(running) {
  if (running) {
    indicator.classList.add('running');
    statusText.textContent = 'Running';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';

    // Load iframe only if not already loaded or loading
    if (!iframeLoading && temporalFrame.src !== 'http://localhost:8234/') {
      iframeLoading = true;
      loadingText.textContent = 'Loading Temporal UI...';
      loadingOverlay.classList.add('show');
      setTimeout(() => {
        temporalFrame.src = 'http://localhost:8234';
        addLog('Loading Temporal UI...', 'info');
      }, 3000);
    }
  } else {
    indicator.classList.remove('running');
    statusText.textContent = 'Stopped';
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    temporalFrame.src = 'about:blank';
    loadingOverlay.classList.remove('show');
    iframeLoading = false;
  }
}

// Start button handler
startBtn.onclick = async function() {
  addLog('Starting Temporal server...', 'info');
  startBtn.disabled = true;
  loadingText.textContent = 'Starting Temporal server...';
  loadingOverlay.classList.add('show');

  try {
    // Clean up any existing containers first
    try {
      await dd.docker.cli.exec('rm', ['-f', 'temporal-dev', 'temporal-nginx']);
      addLog('Cleaned up existing containers', 'info');
    } catch (e) {
      // Containers don't exist, which is fine
    }

    // Create volume for data persistence (ignore if exists)
    try {
      await dd.docker.cli.exec('volume', ['create', 'temporal-dev-data']);
      addLog('Volume created', 'success');
    } catch (e) {
      addLog('Using existing volume', 'info');
    }

    // Create network for Temporal and nginx (ignore if exists)
    try {
      await dd.docker.cli.exec('network', ['create', 'temporal-network']);
      addLog('Network created', 'success');
    } catch (e) {
      addLog('Using existing network', 'info');
    }

    // Start Temporal server
    await dd.docker.cli.exec('run', [
      '-d',
      '--name', 'temporal-dev',
      '--network', 'temporal-network',
      '-p', '7233:7233',
      '-p', '8233:8233',
      '-v', 'temporal-dev-data:/data',
      'temporalio/temporal:latest',
      'server', 'start-dev',
      '--ip', '0.0.0.0',
      '--ui-ip', '0.0.0.0'
    ]);
    addLog('Temporal container started', 'success');
    addLog('Ports: 7233 (gRPC), 8233 (Web UI), 8234 (Proxy)', 'info');

    // Start nginx proxy to strip X-Frame-Options
    await dd.docker.cli.exec('run', [
      '-d',
      '--name', 'temporal-nginx',
      '--network', 'temporal-network',
      '-p', '8234:8234',
      'temporal-nginx-proxy:latest'
    ]);
    addLog('Nginx proxy started', 'success');

    // Check status immediately, then interval will continue checking
    checkStatus();
    startBtn.disabled = false;
  } catch (error) {
    addLog('Error: ' + error.message, 'error');
    loadingOverlay.classList.remove('show');
    startBtn.disabled = false;
  }
};

// Stop button handler
stopBtn.onclick = async function() {
  addLog('Stopping Temporal server...', 'info');
  stopBtn.disabled = true;

  try {
    // Stop and remove both containers
    await dd.docker.cli.exec('rm', ['-f', 'temporal-dev', 'temporal-nginx']);
    addLog('Containers stopped and removed', 'success');

    // Clean up network (optional - will fail if still in use)
    try {
      await dd.docker.cli.exec('network', ['rm', 'temporal-network']);
      addLog('Network removed', 'success');
    } catch (e) {
      // Network might be in use or already removed, ignore
    }

    checkStatus();
    stopBtn.disabled = false;
  } catch (error) {
    addLog('Error: ' + error.message, 'error');
    checkStatus();
    stopBtn.disabled = false;
  }
};

// Initialize
addLog('Extension loaded', 'success');
checkStatus();
setInterval(checkStatus, 5000);
