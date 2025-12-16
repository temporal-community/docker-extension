// Get Docker Desktop client
const dd = window.ddClient;

// DOM elements
const log = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logsBtn = document.getElementById('logsBtn');
const logsModal = document.getElementById('logsModal');
const closeLogsBtn = document.getElementById('closeLogsBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const clearDataModal = document.getElementById('clearDataModal');
const closeClearDataBtn = document.getElementById('closeClearDataBtn');
const cancelClearBtn = document.getElementById('cancelClearBtn');
const confirmClearBtn = document.getElementById('confirmClearBtn');
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

clearDataBtn.onclick = () => clearDataModal.classList.add('show');
closeClearDataBtn.onclick = () => clearDataModal.classList.remove('show');
cancelClearBtn.onclick = () => clearDataModal.classList.remove('show');
clearDataModal.onclick = (e) => {
  if (e.target === clearDataModal) clearDataModal.classList.remove('show');
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

// Wait for Temporal to be ready
async function waitForTemporalReady(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch('http://localhost:8234');
      if (response.ok || response.status === 405) {
        // 200 OK or 405 Method Not Allowed means server is responding
        return true;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
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
    // Check both with and without trailing slash due to browser URL normalization
    const currentSrc = temporalFrame.src;
    const targetUrl = 'http://localhost:8234';
    const isAlreadyLoaded = currentSrc === targetUrl || currentSrc === targetUrl + '/';

    if (!iframeLoading && !isAlreadyLoaded) {
      iframeLoading = true;
      loadingText.textContent = 'Loading Temporal UI...';
      loadingOverlay.classList.add('show');
      // Load immediately - the iframe onload handler will hide the loading overlay
      temporalFrame.src = targetUrl;
      addLog('Loading Temporal UI...', 'info');
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
  loadingText.textContent = 'Preparing to start...';
  loadingOverlay.classList.add('show');

  // Reset iframe to ensure it reloads
  temporalFrame.src = 'about:blank';
  iframeLoading = false;

  try {
    // Clean up any existing containers first
    try {
      loadingText.textContent = 'Cleaning up existing containers...';
      await dd.docker.cli.exec('rm', ['-f', 'temporal-dev', 'temporal-nginx']);
      addLog('Cleaned up existing containers', 'info');
    } catch (e) {
      // Containers don't exist, which is fine
    }

    // Create volume for data persistence (ignore if exists)
    loadingText.textContent = 'Creating data volume...';
    try {
      await dd.docker.cli.exec('volume', ['create', 'temporal-dev-data']);
      addLog('Volume created', 'success');
    } catch (e) {
      addLog('Using existing volume', 'info');
    }

    // Set volume permissions to allow Temporal to write
    loadingText.textContent = 'Setting volume permissions...';
    try {
      await dd.docker.cli.exec('run', [
        '--rm',
        '-v', 'temporal-dev-data:/data',
        'alpine',
        'chmod', '777', '/data'
      ]);
      addLog('Volume permissions set', 'success');
    } catch (e) {
      addLog('Failed to set permissions, continuing...', 'info');
    }

    // Create network for Temporal and nginx (ignore if exists)
    loadingText.textContent = 'Creating network...';
    try {
      await dd.docker.cli.exec('network', ['create', 'temporal-network']);
      addLog('Network created', 'success');
    } catch (e) {
      addLog('Using existing network', 'info');
    }

    // Start Temporal server
    loadingText.textContent = 'Starting Temporal server...';
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
      '--ui-ip', '0.0.0.0',
      '--db-filename', '/data/temporal.db'
    ]);
    addLog('Temporal container started', 'success');
    addLog('Ports: 7233 (gRPC), 8233 (Web UI), 8234 (Proxy)', 'info');

    // Start nginx proxy to strip X-Frame-Options
    loadingText.textContent = 'Starting proxy...';
    await dd.docker.cli.exec('run', [
      '-d',
      '--name', 'temporal-nginx',
      '--network', 'temporal-network',
      '-p', '8234:8234',
      'temporal-nginx-proxy:latest'
    ]);
    addLog('Nginx proxy started', 'success');

    loadingText.textContent = 'Waiting for Temporal to be ready...';
    // Wait for Temporal to be ready
    const isReady = await waitForTemporalReady();
    if (isReady) {
      addLog('Temporal is ready', 'success');
      checkStatus();
    } else {
      addLog('Temporal failed to start within 30 seconds', 'error');
      loadingOverlay.classList.remove('show');
      startBtn.disabled = false;
    }
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

// Clear data button handler
confirmClearBtn.onclick = async function() {
  addLog('Clearing Temporal history...', 'info');
  confirmClearBtn.disabled = true;
  stopBtn.disabled = true;
  startBtn.disabled = true;
  clearDataModal.classList.remove('show');
  loadingText.textContent = 'Clearing history...';
  loadingOverlay.classList.add('show');

  try {
    // Stop and remove both containers
    try {
      loadingText.textContent = 'Stopping containers...';
      await dd.docker.cli.exec('rm', ['-f', 'temporal-dev', 'temporal-nginx']);
      addLog('Containers stopped and removed', 'success');
    } catch (e) {
      addLog('No containers to remove', 'info');
    }

    // Remove the data volume
    try {
      loadingText.textContent = 'Removing data volume...';
      await dd.docker.cli.exec('volume', ['rm', 'temporal-dev-data']);
      addLog('Data volume removed - all workflow data deleted', 'success');
    } catch (e) {
      addLog('Volume already removed or does not exist', 'info');
    }

    // Remove the network
    try {
      loadingText.textContent = 'Removing network...';
      await dd.docker.cli.exec('network', ['rm', 'temporal-network']);
      addLog('Network removed', 'success');
    } catch (e) {
      addLog('Network already removed or does not exist', 'info');
    }

    addLog('History cleared successfully', 'success');
    loadingText.textContent = 'Restarting server...';

    // Reset iframe to ensure it reloads
    temporalFrame.src = 'about:blank';
    iframeLoading = false;

    // Restart the server
    try {
      // Create volume for data persistence
      loadingText.textContent = 'Creating data volume...';
      try {
        await dd.docker.cli.exec('volume', ['create', 'temporal-dev-data']);
        addLog('Volume created', 'success');
      } catch (e) {
        addLog('Using existing volume', 'info');
      }

      // Set volume permissions to allow Temporal to write
      loadingText.textContent = 'Setting volume permissions...';
      try {
        await dd.docker.cli.exec('run', [
          '--rm',
          '-v', 'temporal-dev-data:/data',
          'alpine',
          'chmod', '777', '/data'
        ]);
        addLog('Volume permissions set', 'success');
      } catch (e) {
        addLog('Failed to set permissions, continuing...', 'info');
      }

      // Create network
      loadingText.textContent = 'Creating network...';
      try {
        await dd.docker.cli.exec('network', ['create', 'temporal-network']);
        addLog('Network created', 'success');
      } catch (e) {
        addLog('Using existing network', 'info');
      }

      // Start Temporal server
      loadingText.textContent = 'Starting Temporal server...';
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
        '--ui-ip', '0.0.0.0',
        '--db-filename', '/data/temporal.db'
      ]);
      addLog('Temporal container started', 'success');

      // Start nginx proxy
      loadingText.textContent = 'Starting proxy...';
      await dd.docker.cli.exec('run', [
        '-d',
        '--name', 'temporal-nginx',
        '--network', 'temporal-network',
        '-p', '8234:8234',
        'temporal-nginx-proxy:latest'
      ]);
      addLog('Nginx proxy started', 'success');

      addLog('Server restarted with fresh database', 'success');
      loadingText.textContent = 'Waiting for Temporal to be ready...';
      // Wait for Temporal to be ready
      const isReady = await waitForTemporalReady();
      if (isReady) {
        addLog('Temporal is ready', 'success');
        checkStatus();
      } else {
        addLog('Temporal failed to start within 30 seconds', 'error');
        loadingOverlay.classList.remove('show');
      }
      confirmClearBtn.disabled = false;
    } catch (error) {
      addLog('Error restarting server: ' + error.message, 'error');
      loadingOverlay.classList.remove('show');
      confirmClearBtn.disabled = false;
      checkStatus(); // Update button states
    }
  } catch (error) {
    addLog('Error clearing history: ' + error.message, 'error');
    loadingOverlay.classList.remove('show');
    confirmClearBtn.disabled = false;
    checkStatus(); // Update button states
  }
};

// Initialize
addLog('Extension loaded', 'success');
checkStatus();
setInterval(checkStatus, 5000);
