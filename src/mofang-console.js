import RFB from '@novnc/novnc';

const params = new URLSearchParams(location.search);
const instanceId = params.get('instance_id');
const token = params.get('token');
const statusEl = document.getElementById('status');

if (!instanceId || !token) {
  statusEl.textContent = 'Missing instance_id or token';
} else {
  const wsScheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = wsScheme + '//' + location.host + '/api/v1/portal/instances/' + instanceId + '/console?token=' + encodeURIComponent(token);

  const rfb = new RFB(document.getElementById('screen'), wsUrl);
  rfb.scaleViewport = true;
  rfb.resizeSession = false;

  rfb.addEventListener('connect', () => {
    statusEl.textContent = 'Connected';
    setTimeout(() => { statusEl.style.opacity = '0.3'; }, 2000);
  });
  rfb.addEventListener('disconnect', (e) => {
    statusEl.textContent = e.detail.clean ? 'Disconnected' : 'Connection lost';
    statusEl.style.opacity = '1';
  });

  document.getElementById('sendCtrlAltDel').onclick = () => rfb.sendCtrlAltDel();
  document.getElementById('fullscreenBtn').onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };
}
