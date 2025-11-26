type ClipEntry = {
  id: number;
  content: string;
  timestamp: string;
  pinned: number;
};

const searchInput = document.getElementById('search') as HTMLInputElement;
const listContainer = document.getElementById('list') as HTMLDivElement;
const clearAllButton = document.getElementById('clear-all') as HTMLButtonElement;

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
    content.textContent = entry.content;

    const meta = document.createElement('div');
    meta.className = 'meta';
    const date = new Date(entry.timestamp);
    meta.textContent = `${date.toLocaleString()}${entry.pinned ? ' • Pinned' : ''}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = async () => {
      await window.clipstack.copyEntry(entry.content);
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
});

clearAllButton.addEventListener('click', async () => {
  await window.clipstack.clearAll();
  refreshList();
});
