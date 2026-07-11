function render(enabled) {
  const btn = document.getElementById('toggle');
  const status = document.getElementById('status');
  btn.className = enabled ? 'on' : '';
  status.textContent = enabled ? 'Enabled on Google Sheets' : 'Disabled';
}

chrome.storage.sync.get(['darkModeEnabled'], (data) => {
  render(!!data.darkModeEnabled);
});

document.getElementById('toggle').addEventListener('click', () => {
  chrome.storage.sync.get(['darkModeEnabled'], (data) => {
    const newValue = !data.darkModeEnabled;
    chrome.storage.sync.set({ darkModeEnabled: newValue }, () => render(newValue));
  });
});