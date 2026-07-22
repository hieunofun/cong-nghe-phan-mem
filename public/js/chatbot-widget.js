// public/js/chatbot-widget.js
// Widget chatbot noi xuat hien tren moi trang, khong can dang nhap

(function () {
  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #jl-chat-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 500;
      width: 58px; height: 58px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #0d7a67);
      color: #fff; font-size: 1.5rem; border: none; cursor: pointer;
      box-shadow: 0 6px 20px rgba(11,93,77,0.45);
      transition: transform .18s, box-shadow .18s;
      display: flex; align-items: center; justify-content: center;
    }
    #jl-chat-btn:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(11,93,77,0.55); }

    #jl-chat-box {
      position: fixed; bottom: 100px; right: 28px; z-index: 500;
      width: 340px; max-height: 500px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
      display: flex; flex-direction: column;
      transform: scale(0.92) translateY(12px); opacity: 0;
      pointer-events: none;
      transition: transform .2s ease, opacity .2s ease;
    }
    #jl-chat-box.open {
      transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
    }
    #jl-chat-head {
      background: linear-gradient(135deg, var(--primary), #0d7a67);
      color: #fff; padding: 14px 18px; border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      display: flex; align-items: center; justify-content: space-between;
    }
    #jl-chat-head h4 { margin: 0; font-size: 0.95rem; font-family: var(--font-display); }
    #jl-chat-head p { margin: 2px 0 0; font-size: 0.75rem; opacity: .8; }
    #jl-chat-close { background: none; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; line-height: 1; padding: 4px; }

    #jl-chat-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      min-height: 260px; max-height: 320px;
    }
    .jl-msg { max-width: 85%; }
    .jl-msg.bot { align-self: flex-start; }
    .jl-msg.user { align-self: flex-end; }
    .jl-bubble {
      padding: 10px 14px; border-radius: 16px; font-size: 0.85rem; line-height: 1.5;
    }
    .jl-msg.bot .jl-bubble {
      background: var(--surface-alt); color: var(--ink); border-bottom-left-radius: 4px;
    }
    .jl-msg.user .jl-bubble {
      background: var(--primary); color: #fff; border-bottom-right-radius: 4px;
    }
    .jl-typing { display: flex; gap: 5px; padding: 10px 14px; }
    .jl-typing span {
      width: 7px; height: 7px; border-radius: 50%; background: var(--ink-faint);
      animation: jl-bounce 1.2s ease infinite;
    }
    .jl-typing span:nth-child(2) { animation-delay: .18s; }
    .jl-typing span:nth-child(3) { animation-delay: .36s; }
    @keyframes jl-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

    #jl-chat-input-row {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      display: flex; gap: 8px; align-items: flex-end;
    }
    #jl-chat-input {
      flex: 1; border: 1px solid var(--border); border-radius: 20px;
      padding: 9px 14px; font-size: 0.85rem; resize: none;
      outline: none; font-family: inherit; max-height: 80px; line-height: 1.4;
    }
    #jl-chat-input:focus { border-color: var(--primary); }
    #jl-chat-send {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: var(--primary); color: #fff; cursor: pointer;
      font-size: 1rem; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    #jl-chat-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .jl-quick-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .jl-quick-btn {
      font-size: 0.74rem; padding: 5px 10px; border-radius: 100px;
      border: 1px solid var(--border); background: var(--surface);
      cursor: pointer; color: var(--primary-dark); font-weight: 500;
    }
    .jl-quick-btn:hover { background: var(--primary-light); }
    @media(max-width:480px){
      #jl-chat-box { width: calc(100vw - 32px); right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // Inject HTML
  document.body.insertAdjacentHTML('beforeend', `
    <button id="jl-chat-btn" title="Chatbot tư vấn nghề nghiệp">🤖</button>
    <div id="jl-chat-box">
      <div id="jl-chat-head">
        <div>
          <h4>JobLink AI Assistant</h4>
          <p>Tư vấn nghề nghiệp 24/7</p>
        </div>
        <button id="jl-chat-close">✕</button>
      </div>
      <div id="jl-chat-messages"></div>
      <div id="jl-chat-input-row">
        <textarea id="jl-chat-input" rows="1" placeholder="Hỏi về nghề nghiệp, kỹ năng, mức lương..."></textarea>
        <button id="jl-chat-send">➤</button>
      </div>
    </div>
  `);

  const chatBtn = document.getElementById('jl-chat-btn');
  const chatBox = document.getElementById('jl-chat-box');
  const closeBtn = document.getElementById('jl-chat-close');
  const messages = document.getElementById('jl-chat-messages');
  const input = document.getElementById('jl-chat-input');
  const sendBtn = document.getElementById('jl-chat-send');

  let isOpen = false;
  let isTyping = false;
  let hasGreeted = false;
  const conversationHistory = [];

  const QUICK_QUESTIONS = [
    'Học lập trình bắt đầu từ đâu?',
    'IT fresher lương bao nhiêu?',
    'Viết CV như thế nào?',
    'Phỏng vấn làm sao để pass?'
  ];

  function toggleChat() {
    isOpen = !isOpen;
    chatBox.classList.toggle('open', isOpen);
    chatBtn.textContent = isOpen ? '✕' : '🤖';
    if (isOpen && !hasGreeted) {
      hasGreeted = true;
      addBotMessage(
        'Xin chào! Tôi là AI tư vấn nghề nghiệp của JobLink. ' +
        'Tôi có thể giúp bạn về định hướng nghề nghiệp, kỹ năng cần học, mức lương thị trường và tips tìm việc.',
        QUICK_QUESTIONS
      );
    }
    if (isOpen) setTimeout(() => input.focus(), 200);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function addBotMessage(text, quickReplies = [], saveToHistory = true) {
    const div = document.createElement('div');
    div.className = 'jl-msg bot';
    let html = `<div class="jl-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
    if (quickReplies.length) {
      html += `<div class="jl-quick-btns">${quickReplies.map(q =>
        `<button class="jl-quick-btn">${escapeHtml(q)}</button>`
      ).join('')}</div>`;
    }
    div.innerHTML = html;
    div.querySelectorAll('.jl-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => sendMessage(btn.textContent));
    });
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    if (saveToHistory) {
      conversationHistory.push({ role: 'assistant', content: text });
      if (conversationHistory.length > 12) conversationHistory.splice(0, conversationHistory.length - 12);
    }
  }

  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'jl-msg user';
    div.innerHTML = `<div class="jl-bubble">${escapeHtml(text)}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    conversationHistory.push({ role: 'user', content: text });
    if (conversationHistory.length > 12) conversationHistory.splice(0, conversationHistory.length - 12);
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'jl-msg bot';
    div.id = 'jl-typing-indicator';
    div.innerHTML = `<div class="jl-bubble jl-typing"><span></span><span></span><span></span></div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('jl-typing-indicator');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    const msg = (text || input.value).trim();
    if (!msg || isTyping) return;

    input.value = '';
    input.style.height = 'auto';
    isTyping = true;
    sendBtn.disabled = true;

    addUserMessage(msg);
    showTyping();

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: conversationHistory.slice(0, -1)
        })
      });
      const data = await res.json();
      hideTyping();
      if (data.ai_offline) {
        addBotMessage('AI Service đang offline. Vui lòng chạy: python ai_service/app.py');
      } else {
        addBotMessage(data.reply || 'Xin lỗi, tôi chưa có câu trả lời cho câu hỏi này.');
      }
    } catch (err) {
      hideTyping();
      addBotMessage('Không kết nối được AI Service. Kiểm tra Flask đang chạy chưa?');
    } finally {
      isTyping = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  chatBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  sendBtn.addEventListener('click', () => sendMessage());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

})();
