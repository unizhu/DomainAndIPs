let requestDomains = {};
const domainSettings = {}; // To store monitoring settings per domain

chrome.runtime.onInstalled.addListener(() => {
  // Initialize any necessary data on installation
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === 'toggleMonitoring') {
    const monitoring = request.monitoring;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) { // Check if tabs is valid and has elements
        if (monitoring) {
          const tabId = tabs[0].id;
          const domain = new URL(tabs[0].url).hostname;
          domainSettings[domain] = true;
          chrome.storage.local.set({ domainSettings: domainSettings });
          requestDomains[tabId] = [];
          chrome.tabs.reload(tabId);
        } else if (sender.tab) {
          const domain = new URL(sender.tab.url).hostname;
          domainSettings[domain] = false;
          chrome.storage.local.set({ domainSettings: domainSettings });
          if (requestDomains[sender.tab.id]) {
            delete requestDomains[sender.tab.id];
          }
        }
      }
      sendResponse(); // Send a response to acknowledge the message
    });
  } else if (request.message === 'getDomainList' && request.tabId) {
    const tabId = request.tabId;
    if (requestDomains[tabId]) {
      const domainsWithIps = [];
      Promise.all(requestDomains[tabId].map(domain => {
        return new Promise(resolve => {
          chrome.dns.resolve(domain, (result) => {
            console.log(result);
            const ip = result && result.address ? result.address : 'N/A';
            domainsWithIps.push({ domain: domain, ip: ip });
            resolve();
          });
        });
      })).then(() => {
        chrome.runtime.sendMessage({ message: 'domainList', domains: domainsWithIps });
      });
    }
  }
});

chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, tab => {
    if (tab.url) {
      const domain = new URL(tab.url).hostname;
      chrome.storage.local.get(['domainSettings'], (result) => {
        const settings = result.domainSettings || {};
        if (settings[domain]) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              chrome.runtime.sendMessage({ message: 'toggleMonitoring', monitoring: true });
            }
          });
        }
      });
    }
  });
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId in requestDomains) {
      const url = new URL(details.url);
      const domain = url.hostname;
      if (!requestDomains[details.tabId].includes(domain)) {
        requestDomains[details.tabId].push(domain);
      }
    }
  },
  { urls: ["<all_urls>"] }
);
