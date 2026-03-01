(function () {
    console.log('OpenMind Widget: Initializing (v1.0.1)...');

    // Configuration - look for currentScript OR standard script tag
    const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');

    if (!scriptTag) {
        console.error('OpenMind Widget: Could not find own script tag.');
        return;
    }

    const apiKey = scriptTag.getAttribute('data-key') || scriptTag.getAttribute('data-api-key');
    const backendUrl = scriptTag.getAttribute('data-backend-url') || 'http://localhost:8000';

    if (!apiKey) {
        console.error('OpenMind Widget: API Key is missing. Add data-key="YOUR_KEY" to the script tag.');
        return;
    }

    // Styles
    const style = document.createElement('style');
    style.innerHTML = `
        #openmind-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 5px 30px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            transition: transform 0.3s ease;
        }
        #openmind-widget.closed {
            transform: translateY(calc(100% + 40px));
        }
        #openmind-header {
            background: #4f46e5;
            color: white;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #openmind-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .om-msg {
            max-width: 80%;
            padding: 10px;
            border-radius: 8px;
            font-size: 14px;
            line-height: 1.4;
        }
        .om-user {
            align-self: flex-end;
            background: #e0e7ff;
            color: #1e1b4b;
        }
        .om-ai {
            align-self: flex-start;
            background: #f3f4f6;
            color: #1f2937;
        }
        #openmind-input-area {
            border-top: 1px solid #e5e7eb;
            padding: 10px;
            display: flex;
            gap: 5px;
        }
        #openmind-input {
            flex: 1;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 8px;
            outline: none;
        }
        #openmind-send {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
        }
        #openmind-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 500; /* Just kidding */
            width: 60px;
            height: 60px;
            border-radius: 30px;
            background: #4f46e5;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            font-size: 24px;
        }
    `;
    document.head.appendChild(style);

    // HTML Structure
    const widget = document.createElement('div');
    widget.id = 'openmind-widget';
    widget.className = 'closed';
    widget.innerHTML = `
        <div id="openmind-header">
            <span>Chat with AI</span>
            <button id="openmind-close" style="background:transparent;border:none;color:white;cursor:pointer;font-size:20px;">×</button>
        </div>
        <div id="openmind-messages"></div>
        <div id="openmind-input-area">
            <input type="text" id="openmind-input" placeholder="Type a message...">
            <button id="openmind-send">Send</button>
        </div>
    `;
    document.body.appendChild(widget);

    const toggle = document.createElement('div');
    toggle.id = 'openmind-toggle';
    toggle.innerHTML = '💬';
    document.body.appendChild(toggle);

    // State
    let visitorId = localStorage.getItem('om_visitor_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('om_visitor_id', visitorId);

    // DOM Elements
    const input = document.getElementById('openmind-input');
    const sendBtn = document.getElementById('openmind-send');
    const messagesContainer = document.getElementById('openmind-messages');
    const closeBtn = document.getElementById('openmind-close');

    // Functions
    function addMessage(text, role) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `om-msg om-${role}`;
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(text, 'user');

        try {
            const response = await fetch(`${backendUrl}/chat/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apiKey
                },
                body: JSON.stringify({
                    message: text,
                    visitor_id: visitorId
                })
            });

            if (!response.ok) throw new Error('Network error');

            const data = await response.json();
            addMessage(data.content, 'ai');
        } catch (err) {
            console.error(err);
            addMessage('Sorry, something went wrong. Please try again.', 'ai');
        }
    }

    // Events
    toggle.onclick = () => {
        widget.classList.toggle('closed');
        toggle.style.display = 'none';
    };

    closeBtn.onclick = () => {
        widget.classList.add('closed');
        toggle.style.display = 'flex';
    };

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };

})();
