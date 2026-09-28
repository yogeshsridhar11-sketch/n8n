/* ===================================================
   Yogesh AI – Chat Interface Logic
   Webhook: https://yogeshsridhar11.app.n8n.cloud/webhook/yogesh
   =================================================== */

const WEBHOOK_URL = 'https://yogeshsridhar11.app.n8n.cloud/webhook/yogesh';

// ── DOM References ──────────────────────────────────
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const messagesList    = document.getElementById('messagesList');
const welcomeScreen   = document.getElementById('welcomeScreen');
const messagesContainer = document.getElementById('messagesContainer');
const charCount       = document.getElementById('charCount');
const historyList     = document.getElementById('historyList');
const newChatBtn      = document.getElementById('newChatBtn');
const clearBtn        = document.getElementById('clearBtn');
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebar         = document.getElementById('sidebar');

// ── State ───────────────────────────────────────────
let isWaiting = false;
let sessions  = JSON.parse(localStorage.getItem('yogesh_sessions') || '[]');
let currentSessionId = null;

// ── Helpers ─────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function now() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Very lightweight markdown → HTML */
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Unordered lists
  html = html.replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Line breaks → paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks.map(b => {
    b = b.trim();
    if (!b) return '';
    if (/^<(pre|ul|ol|h[1-6])/.test(b)) return b;
    return `<p>${b.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function scrollToBottom() {
  messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
}

// ── Sessions ─────────────────────────────────────────
function saveSessions() {
  localStorage.setItem('yogesh_sessions', JSON.stringify(sessions));
}

function getSession(id) {
  return sessions.find(s => s.id === id);
}

function createSession() {
  const session = { id: generateId(), title: 'New Chat', messages: [], createdAt: Date.now() };
  sessions.unshift(session);
  saveSessions();
  return session;
}

function updateSessionTitle(sessionId, firstMessage) {
  const session = getSession(sessionId);
  if (!session) return;
  session.title = firstMessage.length > 36 ? firstMessage.slice(0, 36) + '…' : firstMessage;
  saveSessions();
  renderHistoryList();
}

function addMessageToSession(sessionId, role, content) {
  const session = getSession(sessionId);
  if (!session) return;
  session.messages.push({ role, content, time: now() });
  saveSessions();
}

// ── History Sidebar ───────────────────────────────────
function renderHistoryList() {
  historyList.innerHTML = '';
  if (sessions.length === 0) {
    historyList.innerHTML = '<div class="empty-history">No chats yet</div>';
    return;
  }
  sessions.forEach(s => {
    const item = document.createElement('div');
    item.className = 'history-item' + (s.id === currentSessionId ? ' active' : '');
    item.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>${escapeHtml(s.title)}</span>
    `;
    item.addEventListener('click', () => loadSession(s.id));
    historyList.appendChild(item);
  });
}

function loadSession(sessionId) {
  const session = getSession(sessionId);
  if (!session) return;
  currentSessionId = sessionId;
  messagesList.innerHTML = '';
  welcomeScreen.style.display = 'none';
  session.messages.forEach(m => renderMessage(m.role, m.content, m.time, false));
  scrollToBottom();
  renderHistoryList();
}

// ── Message Rendering ─────────────────────────────────
function renderMessage(role, content, timestamp = now(), animate = true) {
  if (!animate) {
    // Fast path for loading history
  }

  const isUser = role === 'user';
  const wrapper = document.createElement('div');
  wrapper.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;

  const avatarHtml = isUser
    ? `<div class="message-avatar user-avatar">Y</div>`
    : `<div class="message-avatar ai-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
       </div>`;

  const bubbleContent = isUser
    ? `<p>${escapeHtml(content).replace(/\n/g, '<br>')}</p>`
    : renderMarkdown(content);

  const actionsHtml = !isUser ? `
    <div class="message-actions">
      <button class="action-btn copy-btn" title="Copy">📋 Copy</button>
    </div>` : '';

  wrapper.innerHTML = `
    ${avatarHtml}
    <div>
      <div class="message-bubble ${role === 'error' ? 'error-bubble' : ''}">${bubbleContent}</div>
      <div class="message-meta">${timestamp}</div>
      ${actionsHtml}
    </div>
  `;

  // Copy button
  const copyBtn = wrapper.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => showToast('Copied to clipboard!'));
    });
  }

  messagesList.appendChild(wrapper);
  if (animate) scrollToBottom();
  return wrapper;
}

// ── Typing Indicator ──────────────────────────────────
function showTyping() {
  const div = document.createElement('div');
  div.className = 'message assistant-message typing-indicator-msg';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="message-avatar ai-avatar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="message-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesList.appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

// ── API Call ──────────────────────────────────────────
async function sendMessage(text) {
  if (isWaiting || !text.trim()) return;
  isWaiting = true;
  sendBtn.disabled = true;

  // Ensure a session exists
  if (!currentSessionId) {
    const session = createSession();
    currentSessionId = session.id;
  }

  // Hide welcome screen on first message
  if (welcomeScreen.style.display !== 'none') {
    welcomeScreen.style.display = 'none';
  }

  // Render user bubble
  renderMessage('user', text);
  addMessageToSession(currentSessionId, 'user', text);

  // Update title on first user message
  const session = getSession(currentSessionId);
  if (session && session.messages.filter(m => m.role === 'user').length === 1) {
    updateSessionTitle(currentSessionId, text);
  }
  renderHistoryList();

  showTyping();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: text })
    });

    hideTyping();

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // Read raw text first — n8n can return plain text OR JSON
    const rawText = await response.text();

    let aiText = '';
    try {
      // Attempt JSON parse
      const data = JSON.parse(rawText);
      if (typeof data === 'string') {
        aiText = data;
      } else if (data.output) {
        aiText = data.output;
      } else if (data.text) {
        aiText = data.text;
      } else if (data.message) {
        aiText = data.message;
      } else if (data.response) {
        aiText = data.response;
      } else if (Array.isArray(data) && data.length > 0) {
        aiText = data[0].output || data[0].text || data[0].message || JSON.stringify(data[0]);
      } else {
        aiText = JSON.stringify(data, null, 2);
      }
    } catch {
      // Not JSON — use the plain text response directly
      aiText = rawText.trim();
    }

    renderMessage('assistant', aiText);
    addMessageToSession(currentSessionId, 'assistant', aiText);

  } catch (err) {
    hideTyping();
    const errMsg = `⚠️ Failed to reach the AI: ${err.message}. Please check your n8n webhook and try again.`;
    renderMessage('error', errMsg);
    console.error('[Yogesh AI] Webhook error:', err);
  }

  isWaiting = false;
  sendBtn.disabled = userInput.value.trim().length === 0;
  userInput.focus();
}

// ── Input Handling ────────────────────────────────────
userInput.addEventListener('input', () => {
  // Auto-resize textarea
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 160) + 'px';

  const len = userInput.value.length;
  charCount.textContent = `${len} / 4000`;
  sendBtn.disabled = len === 0 || isWaiting;
});

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const msg = userInput.value.trim();
    if (msg) {
      userInput.value = '';
      userInput.style.height = 'auto';
      charCount.textContent = '0 / 4000';
      sendBtn.disabled = true;
      sendMessage(msg);
    }
  }
});

sendBtn.addEventListener('click', () => {
  const msg = userInput.value.trim();
  if (msg) {
    userInput.value = '';
    userInput.style.height = 'auto';
    charCount.textContent = '0 / 4000';
    sendBtn.disabled = true;
    sendMessage(msg);
  }
});

// ── Suggestion Cards ──────────────────────────────────
document.querySelectorAll('.suggestion-card').forEach(card => {
  card.addEventListener('click', () => {
    const prompt = card.dataset.prompt;
    sendMessage(prompt);
  });
});

// ── New Chat ──────────────────────────────────────────
function startNewChat() {
  currentSessionId = null;
  messagesList.innerHTML = '';
  welcomeScreen.style.display = '';
  userInput.value = '';
  userInput.style.height = 'auto';
  charCount.textContent = '0 / 4000';
  sendBtn.disabled = true;
  renderHistoryList();
}

newChatBtn.addEventListener('click', startNewChat);

// ── Clear Chat ────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (currentSessionId) {
    const s = getSession(currentSessionId);
    if (s) s.messages = [];
    saveSessions();
    messagesList.innerHTML = '';
    welcomeScreen.style.display = '';
    showToast('Chat cleared');
  }
});

// ── Sidebar Toggle ────────────────────────────────────
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});

// ── Init ──────────────────────────────────────────────
function init() {
  renderHistoryList();
  // Load most recent session if any
  if (sessions.length > 0) {
    // Still start on welcome screen for fresh feel; just show history
  }
  userInput.focus();
}

init();
