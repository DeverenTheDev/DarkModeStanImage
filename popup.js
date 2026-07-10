function render(enabled) {
  const btn = document.getElementById('toggle');
  btn.textContent = enabled ? 'Disable Dark Mode' : 'Enable Dark Mode';
  btn.className = enabled ? 'on' : 'off';
}

chrome.storage.sync.get(['darkModeEnabled'], (data) => {
  render(!!data.darkModeEnabled);
});

document.getElementById('toggle').addEventListener('click', () => {
  chrome.storage.sync.get(['darkModeEnabled'], (data) => {
    const newValue = !data.darkModeEnabled;
    chrome.storage.sync.set({ darkModeEnabled: newValue }, () => {
      render(newValue);
    });
  });
});