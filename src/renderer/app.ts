type ClipEntry = {
  id: number;
  content: string | null;
  timestamp: string;
  pinned: number;
  type: 'text' | 'image';
  imagePath: string | null;
};

const searchInput = document.getElementById('search') as HTMLInputElement;
const listContainer = document.getElementById('list') as HTMLDivElement;
const clearAllButton = document.getElementById('clear-all') as HTMLButtonElement;
const togglePauseButton = document.querySelector('button#toggle-pause') as HTMLButtonElement | null;
const maxHistoryInput = document.getElementById('max-history-input') as HTMLInputElement | null;
const uncappedCheckbox = document.getElementById('uncapped-checkbox') as HTMLInputElement | null;

let isPaused = false;

function updatePauseButton() {
  if (!togglePauseButton) return;
  togglePauseButton.textContent = isPaused ? 'Resume' : 'Pause';
  togglePauseButton.title = isPaused ? 'Resume tracking' : 'Pause tracking';
}

async function refreshList() {
  const query = searchInput.value;
  const entries = await window.clipstack.getEntries(query);
  renderEntries(entries);
}

function renderEntries(entries: ClipEntry[]) {
  listContainer.innerHTML = '';
  if (!entries.length) {
    listContainer.innerHTML = '<div class="empty">No entries yet</div>';
    return;
  }

  for (const entry of entries) {
    const item = document.createElement('div');
    item.className = 'entry';

    const content = document.createElement('div');
    content.className = 'content';
    if (entry.type === 'image' && entry.imagePath) {
      const img = document.createElement('img');
      img.src = `file://${entry.imagePath}`;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '120px';
      content.appendChild(img);
    } else if (entry.content) {
      content.textContent = entry.content;
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const date = new Date(entry.timestamp);
    meta.textContent = `${date.toLocaleString()}${entry.pinned ? ' • Pinned' : ''}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = async () => {
      if (entry.type === 'image') {
        await window.clipstack.copyImageEntry(entry.id);
      } else if (entry.content) {
        await window.clipstack.copyEntry(entry.content);
      }
    };

    const pinBtn = document.createElement('button');
    pinBtn.textContent = entry.pinned ? 'Unpin' : 'Pin';
    pinBtn.onclick = async () => {
      await window.clipstack.togglePin(entry.id);
      refreshList();
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = async () => {
      await window.clipstack.deleteEntry(entry.id);
      refreshList();
    };

    actions.appendChild(copyBtn);
    actions.appendChild(pinBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(content);
    item.appendChild(meta);
    item.appendChild(actions);

    listContainer.appendChild(item);
  }
}

searchInput.addEventListener('input', () => {
  refreshList();
});

window.clipstack.onClipboardUpdated(() => {
  refreshList();
});

window.addEventListener('DOMContentLoaded', () => {
  refreshList();
  window.clipstack.getPauseState().then((state) => {
    isPaused = state;
    updatePauseButton();
  });

  // Initialize max history UI
  window.clipstack.getMaxHistory().then((limit) => {
    if (!maxHistoryInput || !uncappedCheckbox) return;
    if (limit === null) {
      uncappedCheckbox.checked = true;
      maxHistoryInput.disabled = true;
      maxHistoryInput.value = '';
    } else {
      uncappedCheckbox.checked = false;
      maxHistoryInput.disabled = false;
      maxHistoryInput.value = String(limit);
    }
  });
});

clearAllButton.addEventListener('click', async () => {
  await window.clipstack.clearAll();
  refreshList();
});

if (togglePauseButton) {
  togglePauseButton.addEventListener('click', async () => {
    await window.clipstack.togglePauseTracking();
    const state = await window.clipstack.getPauseState();
    isPaused = state;
    updatePauseButton();
  });
}

window.clipstack.onPauseStateChanged((state: boolean) => {
  isPaused = state;
  updatePauseButton();
});

if (uncappedCheckbox) {
  uncappedCheckbox.addEventListener('change', async () => {
    if (!maxHistoryInput) return;
    if (uncappedCheckbox.checked) {
      const confirmed = window.confirm(
        'Setting history to uncapped may keep a lot of items. Are you sure?'
      );
      if (!confirmed) {
        uncappedCheckbox.checked = false;
        return;
      }
      maxHistoryInput.disabled = true;
      maxHistoryInput.value = '';
      await window.clipstack.setMaxHistory(null);
    } else {
      maxHistoryInput.disabled = false;
      const value = parseInt(maxHistoryInput.value, 10);
      const limit = Number.isFinite(value) && value > 0 ? value : 200;
      maxHistoryInput.value = String(limit);
      const confirmed = window.confirm(
        'Changing the history size will delete older unpinned items beyond this limit. Are you sure?'
      );
      if (!confirmed) {
        // Revert checkbox state to checked and UI to uncapped
        uncappedCheckbox.checked = true;
        maxHistoryInput.disabled = true;
        maxHistoryInput.value = '';
        await window.clipstack.setMaxHistory(null);
        return;
      }
      await window.clipstack.setMaxHistory(limit);
    }
  });
}

if (maxHistoryInput) {
  maxHistoryInput.addEventListener('change', async () => {
    if (!uncappedCheckbox) return;
    if (uncappedCheckbox.checked) return;
    const value = parseInt(maxHistoryInput.value, 10);
    const limit = Number.isFinite(value) && value > 0 ? value : 200;
    maxHistoryInput.value = String(limit);
    const confirmed = window.confirm(
      'Changing the history size will delete older unpinned items beyond this limit. Are you sure?'
    );
    if (!confirmed) {
      // Reload current value from backend to reflect real setting
      const current = await window.clipstack.getMaxHistory();
      if (current === null) {
        uncappedCheckbox.checked = true;
        maxHistoryInput.disabled = true;
        maxHistoryInput.value = '';
      } else {
        uncappedCheckbox.checked = false;
        maxHistoryInput.disabled = false;
        maxHistoryInput.value = String(current);
      }
      return;
    }
    await window.clipstack.setMaxHistory(limit);
    // Refresh list so the user immediately sees the trimmed history
    await refreshList();
  });
}
