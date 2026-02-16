document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggle');
  const toggleLabel = document.getElementById('toggleLabel');
  const totalEl = document.getElementById('totalCorrections');

  chrome.storage.local.get(['extensionEnabled', 'totalCorrections'], (result) => {
    toggle.checked = result.extensionEnabled !== false;
    totalEl.textContent = result.totalCorrections || 0;
    toggleLabel.textContent = toggle.checked ? 'ON' : 'OFF';
  });

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.local.set({ extensionEnabled: enabled });
    toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  });

  // Refresh stats when popup opens
  chrome.storage.local.get(['totalCorrections'], (r) => {
    totalEl.textContent = r.totalCorrections || 0;
  });
});
