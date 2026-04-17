const STORAGE_KEY = 'sandboxChineseImeEnabled';

async function getEnabled() {
  const data = await chrome.storage.sync.get({ [STORAGE_KEY]: true });
  return Boolean(data[STORAGE_KEY]);
}

async function setEnabled(enabled) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
  await updateBadge(enabled);
}

async function updateBadge(enabled) {
  await chrome.action.setBadgeText({ text: enabled ? '中' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#146c5f' });
}

chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-ime') {
    return;
  }

  const enabled = await getEnabled();
  await setEnabled(!enabled);
});
