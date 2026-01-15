// BioExpert AI Chatbot - Light Mode Version
const chatbox = document.getElementById("chatbox");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const historyList = document.getElementById("history-list");

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('BioExpert AI Chatbot initialized');
    
    // Set initial textarea height
    adjustTextareaHeight();
    
    // Focus input on load
    setTimeout(() => input.focus(), 300);
    
    // Add initial history placeholder if empty
    if (historyList.children.length === 0 || 
        historyList.innerHTML.includes('No conversations')) {
        historyList.innerHTML = '<li class="history-item"><div class="history-item-preview">No conversations yet</div></li>';
    }
});

// Auto-resize textarea
function adjustTextareaHeight() {
    input.style.height = 'auto';
    const maxHeight = 150; // Maximum height in pixels
    const newHeight = Math.min(input.scrollHeight, maxHeight);
    input.style.height = newHeight + 'px';
}

input.addEventListener('input', adjustTextareaHeight);

// Format timestamp
function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    }).toLowerCase();
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing';
    typingDiv.innerHTML = `
        <div class="message-sender">
            <div class="message-avatar">AI</div>
            <span>BioExpert AI</span>
        </div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
        <div class="message-time">${formatTime()}</div>
    `;
    chatbox.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

// Format message content with markdown - IMPROVED VERSION
function formatMessageContent(content) {
    if (!content) return '';
    
    // First, pre-process the content to fix AI formatting issues
    content = preprocessContent(content);
    
    // Escape HTML to prevent XSS
    let formatted = escapeHtml(content);
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Convert bold (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert italic (*text* or _text_)
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Convert inline code (`code`)
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert code blocks (```code```)
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Convert headings (## Heading, ### Subheading)
    // Do this before lists to avoid conflicts
    formatted = formatted.replace(/^### (.*?)$/gm, '<h3 class="subsection">$1</h3>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2 class="section">$1</h2>');
    formatted = formatted.replace(/^# (.*?)$/gm, '<h1 class="main-heading">$1</h1>');
    
    // Now handle lists properly
    formatted = formatLists(formatted);
    
    return formatted;
}

// Preprocess content to fix AI formatting quirks
function preprocessContent(text) {
    if (!text) return '';
    
    // Fix: "1.DNA Replication" -> "1. DNA Replication" (add space after number if missing)
    text = text.replace(/(\d+)\.([A-Za-z])/g, '$1. $2');
    
    // Fix multiple consecutive "1." items
    const lines = text.split('\n');
    let inNumberedList = false;
    let listNumber = 1;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const trimmed = line.trim();
        
        // Check if this line starts with "1." (with or without space)
        const isNumberedStart = /^1\.\s?/.test(trimmed);
        
        if (isNumberedStart) {
            if (!inNumberedList) {
                // Start of a new numbered list
                inNumberedList = true;
                listNumber = 1;
                // Replace "1." with "1." (keep as is for now)
                processedLines.push(line.replace(/^1\.\s?/, '1. '));
            } else {
                // Continuation of existing list - increment number
                listNumber++;
                // Replace "1." with the correct number
                processedLines.push(line.replace(/^1\.\s?/, listNumber + '. '));
            }
        } else {
            // Check if this line starts with any other number
            const numberedMatch = trimmed.match(/^(\d+)\.\s?/);
            if (numberedMatch && inNumberedList) {
                // Already in a list, keep the number as is
                const num = numberedMatch[1];
                processedLines.push(line);
                listNumber = parseInt(num);
            } else {
                // Not a numbered list item
                inNumberedList = false;
                listNumber = 1;
                processedLines.push(line);
            }
        }
    }
    
    return processedLines.join('\n');
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Improved list formatting function
function formatLists(text) {
    // Split by double line breaks to handle paragraphs separately
    const paragraphs = text.split('<br><br>');
    const formattedParagraphs = [];
    
    for (let paragraph of paragraphs) {
        // Check if this paragraph contains list items
        const lines = paragraph.split('<br>');
        let hasListItems = false;
        
        for (let line of lines) {
            const trimmed = line.trim();
            // Check for numbered or bullet list items
            if (/^(\d+\.|[-*•])\s/.test(trimmed)) {
                hasListItems = true;
                break;
            }
        }
        
        if (hasListItems) {
            // This is a list paragraph - process it
            let result = '';
            let inOrderedList = false;
            let inUnorderedList = false;
            let orderedListNumber = 1;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                // Check for numbered list item (1., 2., 3., etc.)
                const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.*)/);
                // Check for bullet list item (-, *, •)
                const bulletMatch = trimmedLine.match(/^([-*•])\s+(.*)/);
                
                if (numberedMatch) {
                    const [, number, content] = numberedMatch;
                    const listNumber = parseInt(number);
                    
                    if (!inOrderedList) {
                        // Start ordered list
                        if (inUnorderedList) {
                            result += '</ul>';
                            inUnorderedList = false;
                        }
                        result += '<ol>';
                        inOrderedList = true;
                        orderedListNumber = listNumber;
                    }
                    
                    // If the number doesn't match our sequence, start a new list
                    if (listNumber !== orderedListNumber) {
                        result += '</ol><ol>';
                        orderedListNumber = listNumber;
                    }
                    
                    result += `<li>${content}</li>`;
                    orderedListNumber++;
                }
                else if (bulletMatch) {
                    const [, bullet, content] = bulletMatch;
                    
                    if (!inUnorderedList) {
                        // Start unordered list
                        if (inOrderedList) {
                            result += '</ol>';
                            inOrderedList = false;
                        }
                        result += '<ul>';
                        inUnorderedList = true;
                    }
                    
                    result += `<li>${content}</li>`;
                }
                else {
                    // Not a list item
                    if (inOrderedList) {
                        result += '</ol>';
                        inOrderedList = false;
                        orderedListNumber = 1;
                    }
                    if (inUnorderedList) {
                        result += '</ul>';
                        inUnorderedList = false;
                    }
                    
                    // Check if this is a continuation of the previous list item
                    const isContinuation = (inOrderedList || inUnorderedList) && 
                                          trimmedLine !== '' && 
                                          !/^(\d+\.|[-*•])\s/.test(trimmedLine);
                    
                    if (isContinuation) {
                        // This is a continuation line, add it to the current list item
                        result = result.slice(0, -5); // Remove closing </li>
                        result += `<br>${line}</li>`;
                    } else {
                        result += line + (i < lines.length - 1 ? '<br>' : '');
                    }
                }
            }
            
            // Close any open lists
            if (inOrderedList) {
                result += '</ol>';
            }
            if (inUnorderedList) {
                result += '</ul>';
            }
            
            formattedParagraphs.push(result);
        } else {
            // Not a list, keep as-is
            formattedParagraphs.push(paragraph);
        }
    }
    
    return formattedParagraphs.join('<br><br>');
}

// Scroll to bottom of chat
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatbox.scrollTop = chatbox.scrollHeight;
    });
}

// Send message
async function sendMessage() {
    const message = input.value.trim();
    
    if (!message) {
        showToast('Please enter a message', 'warning');
        input.focus();
        return;
    }

    // Clear input immediately
    input.value = '';
    adjustTextareaHeight();
    
    // Add user message
    appendMessage(message, 'user');
    
    // Show typing indicator
    const typingElem = showTypingIndicator();
    
    // Disable send button
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing';

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                message: message,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Remove typing indicator
        if (typingElem && typingElem.parentNode) {
            typingElem.remove();
        }
        
        // Add bot response
        if (data.reply) {
            appendMessage(data.reply, 'bot');
            
            // Update history
            updateHistory(message, data.reply);
        } else {
            appendMessage("Sorry, I didn't receive a proper response.", 'bot');
        }
        
    } catch (error) {
        console.error('Error:', error);
        
        // Remove typing indicator
        if (typingElem && typingElem.parentNode) {
            typingElem.remove();
        }
        
        // Show error message
        appendMessage("I apologize, but I encountered an error. Please check your connection and try again.", 'bot');
        showToast('Connection error. Please try again.', 'error');
        
    } finally {
        // Re-enable send button
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<span>Send</span>';
        
        // Focus input
        input.focus();
    }
}

// Append message to chat
function appendMessage(content, sender) {
    // Remove welcome screen if it exists
    const welcomeScreen = document.querySelector('.welcome-screen');
    if (welcomeScreen) {
        welcomeScreen.remove();
        // Clear any existing messages (just in case)
        const existingMessages = chatbox.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const senderName = sender === 'user' ? 'You' : 'BioExpert AI';
    const avatarText = sender === 'user' ? 'Y' : 'AI';
    
    messageDiv.innerHTML = `
        <div class="message-sender">
            <div class="message-avatar">${avatarText}</div>
            <span>${senderName}</span>
        </div>
        <div class="message-content">
            ${formatMessageContent(content)}
        </div>
        <div class="message-time">${formatTime()}</div>
    `;
    
    chatbox.appendChild(messageDiv);
    scrollToBottom();
}

// Update history sidebar
function updateHistory(userMessage, botMessage) {
    // Remove placeholder if present
    const placeholder = historyList.querySelector('.history-item-preview');
    if (placeholder && placeholder.textContent === 'No conversations yet') {
        historyList.innerHTML = '';
    }
    
    const historyItem = document.createElement('li');
    historyItem.className = 'history-item';
    historyItem.onclick = () => loadHistory(historyList.children.length);
    
    const preview = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
    
    historyItem.innerHTML = `
        <div class="history-item-title">
            <span>${formatTime()}</span>
        </div>
        <div class="history-item-preview">${preview}</div>
    `;
    
    historyList.insertBefore(historyItem, historyList.firstChild);
    
    // Limit history to 10 items
    if (historyList.children.length > 10) {
        historyList.removeChild(historyList.lastChild);
    }
}

// New Chat button
newChatBtn.onclick = async () => {
    if (chatbox.children.length <= 1 && !chatbox.querySelector('.welcome-screen')) {
        // Already in new chat state
        return;
    }
    
    try {
        const response = await fetch("/new-chat", { 
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (response.ok) {
            // Clear chat and show welcome screen
            chatbox.innerHTML = `
                <div class="welcome-screen">
                    <div class="welcome-icon">🧬</div>
                    <h1 class="welcome-title">New Chat Started</h1>
                    <p class="welcome-subtitle">
                        Ask me anything about biology, biotechnology, bioinformatics, or pharmacology.
                        I'm here to help with your scientific questions!
                    </p>
                </div>
            `;
            
            // Clear history list
            historyList.innerHTML = '<li class="history-item"><div class="history-item-preview">No conversations yet</div></li>';
            
            // Clear input
            input.value = '';
            adjustTextareaHeight();
            
            showToast('New chat started', 'success');
        }
    } catch (error) {
        console.error('Error starting new chat:', error);
        showToast('Failed to start new chat', 'error');
    }
};

// Quick suggestion buttons
function suggestQuestion(question) {
    input.value = question;
    adjustTextareaHeight();
    input.focus();
    showToast('Question added to input', 'info');
}

// Voice input
function voiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.maxAlternatives = 1;
        
        showToast('Listening... Speak now', 'info');
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value = transcript;
            adjustTextareaHeight();
            showToast('Speech recognized', 'success');
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showToast('Speech recognition failed', 'error');
        };
        
        recognition.onend = () => {
            console.log('Speech recognition ended');
        };
        
        recognition.start();
    } else {
        showToast('Speech recognition not supported in your browser', 'error');
    }
}

// Attach file
function attachFile() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.txt,.doc,.docx,.csv,.xlsx,.fasta,.gb,.pdb,.jpg,.png';
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showToast('File size should be less than 10MB', 'error');
                return;
            }
            
            const fileName = file.name;
            const fileSize = (file.size / 1024).toFixed(1);
            const fileType = fileName.split('.').pop().toUpperCase();
            
            appendMessage(`📎 Attached file: ${fileName} (${fileSize} KB, ${fileType})`, 'user');
            
            // Simulate file processing
            setTimeout(() => {
                appendMessage(
                    `I see you've attached a ${fileType} file. While I can't process files directly in this version, ` +
                    `you can describe its contents or ask specific questions about ${fileType} files, and I'll help you analyze the information.`,
                    'bot'
                );
            }, 1000);
            
            showToast(`File ${fileName} attached`, 'success');
        }
    };
    
    // Trigger file dialog
    fileInput.click();
}

// Toast notification system
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add toast styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                animation: slideIn 0.3s ease;
                border-left: 4px solid #2e7d32;
                max-width: 300px;
            }
            .toast-success { border-color: #4caf50; }
            .toast-error { border-color: #f44336; }
            .toast-warning { border-color: #ff9800; }
            .toast-info { border-color: #2196f3; }
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
            }
            .toast i { font-size: 16px; }
            .toast-success i { color: #4caf50; }
            .toast-error i { color: #f44336; }
            .toast-warning i { color: #ff9800; }
            .toast-info i { color: #2196f3; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Load history item
function loadHistory(index) {
    showToast('History loading feature is coming soon!', 'info');
}

// Event listeners
sendBtn.onclick = sendMessage;

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Handle paste event to auto-resize
input.addEventListener('paste', (e) => {
    setTimeout(adjustTextareaHeight, 0);
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
    
    // Ctrl/Cmd + N for new chat
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        newChatBtn.click();
    }
    
    // Escape to clear input
    if (e.key === 'Escape' && document.activeElement === input) {
        input.value = '';
        adjustTextareaHeight();
    }
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(adjustTextareaHeight, 100);
});

