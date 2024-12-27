document.addEventListener('DOMContentLoaded', () => {
  const monitorSwitch = document.getElementById('monitorSwitch');
  const domainListDiv = document.getElementById('domainList');
  const domainListBody = document.getElementById('domainListBody');
  const loadingDiv = document.getElementById('loading');

  // Get the current state from storage
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const domain = new URL(tabs[0].url).hostname;
    chrome.storage.local.get(['domainSettings'], (result) => {
      monitorSwitch.checked = result.domainSettings && result.domainSettings[domain];
    });
  });

  monitorSwitch.addEventListener('change', () => {
    const monitoring = monitorSwitch.checked;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({ message: 'toggleMonitoring', monitoring: monitoring }, () => {
        if (monitoring) {
          domainListBody.innerHTML = '';
          domainListDiv.style.display = 'none';
          loadingDiv.style.display = 'block';
        } else {
          domainListDiv.style.display = 'none';
        }
      });
    });
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === 'domainList') {
      loadingDiv.style.display = 'none';
      domainListDiv.style.display = 'block';
      domainListBody.innerHTML = '';
      request.domains.forEach((item, index) => {
        const row = document.createElement('tr');
        const numberCell = document.createElement('td');
        numberCell.textContent = index + 1;
        const domainCell = document.createElement('td');
        domainCell.textContent = item.domain;
        const ipCell = document.createElement('td');
        ipCell.textContent = item.ip;
        row.appendChild(numberCell);
        row.appendChild(domainCell);
        row.appendChild(ipCell);
        domainListBody.appendChild(row);
      });
    }
  });

  // Request the current domain list when the popup is opened
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ message: 'getDomainList', tabId: tabs[0].id });
  });
});
