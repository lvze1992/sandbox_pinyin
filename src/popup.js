const STORAGE_KEY = 'sandboxChineseImeEnabled';

const checkbox = document.getElementById('enabled');
const stateText = document.getElementById('state-text');

async function readEnabled() {
  const data = await chrome.storage.sync.get({ [STORAGE_KEY]: true });
  return Boolean(data[STORAGE_KEY]);
}

async function writeEnabled(enabled) {
  await chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
  await chrome.action.setBadgeText({ text: enabled ? '中' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#146c5f' });
}

function render(enabled) {
  checkbox.checked = enabled;
  stateText.textContent = enabled ? '已开启，点击网页输入框后直接打拼音' : '已关闭，网页保持英文输入';
}

checkbox.addEventListener('change', async () => {
  const enabled = checkbox.checked;
  render(enabled);
  await writeEnabled(enabled);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync' || !changes[STORAGE_KEY]) {
    return;
  }
  render(Boolean(changes[STORAGE_KEY].newValue));
});

readEnabled().then(render);
