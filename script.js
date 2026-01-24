// --- 1. FIREBASE CONFIGURATION (Yahan apni details dalein) ---

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDQ0USXawKchus3EDwUi3EnKGqU1Z0GO3A",
    authDomain: "zeegpt-pro.firebaseapp.com",
    projectId: "zeegpt-pro",
    storageBucket: "zeegpt-pro.firebasestorage.app",
    messagingSenderId: "780459700670",
    appId: "1:780459700670:web:fabfb2a5af986e933ec9ef"
  };

    // --- Initialize Firebase ---
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

// --- DOM ELEMENTS ---
const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = fileUploadWrapper.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

// Google Apps Script ka URL yahan dalein
const PROXY_URL = "https://script.google.com/macros/s/AKfycbyhoCZkwrhfC4hSE30UT3pLg7wgbvrui0CwTd8MLeVVplSfYF4FrjeKhxGX2_O2wpJS/exec";

const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    try {
        // Ab hum direct Gemini ko nahi balki Google Script ko call kar rahe hain
        const response = await fetch(PROXY_URL, requestOptions);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        const apiResponseText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, "$1").trim();
        messageElement.innerText = apiResponseText;

        saveToFirestore("bot", apiResponseText);

    } catch (error) {
        console.log(error);
        messageElement.innerText = "Error: API Key Hidden & Secure!";
    } finally {
        userData.file = {};
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

        // Thinking wala temporary div remove kar dete hain
        setTimeout(() => incomingMessageDiv.remove(), 100);
    }
}; // <--- Yeh bracket lagana zaroori hai

// Initialize user message and file data
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

// Store chat history (Internal & Firestore)
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// --- 2. HELPER FUNCTION: MESSAGE ELEMENT CREATE KARNA ---
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// --- 3. FIREBASE FUNCTIONS ---

// Function: Message ko Firestore mein save karna
const saveToFirestore = (sender, text, fileData = null) => {
  db.collection("chats").add({
    sender: sender,          // "user" ya "bot"
    text: text,
    file: fileData || null,  // Agar image hai to save karega
    timestamp: firebase.firestore.FieldValue.serverTimestamp() // Sahi waqt save karega
  }).catch((error) => {
    console.error("Error saving message: ", error);
  });
};

// Function: Page load hone par aur naye message aane par chalega
const loadMessagesFromFirestore = () => {
  // Real-time listener (onSnapshot)
  db.collection("chats").orderBy("timestamp", "asc").onSnapshot((snapshot) => {
    
    // Pehle chat clear karein taake duplicate na ho (Lekin Thinking indicator bachana hai)
    // Behtar tareeka: Hum purani chat clear karke reload karenge
    chatBody.innerHTML = ""; 
    chatHistory.length = 0; // History reset karein

    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // 1. Gemini ke liye history update karein
      chatHistory.push({
        role: data.sender === "user" ? "user" : "model",
        parts: [{ text: data.text }]
      });

      // 2. Screen par message dikhayein
      if (data.sender === "user") {
        // User Message HTML
        const messageContent = `<div class="message-text"></div>
                                ${data.file ? `<img src="data:${data.file.mime_type};base64,${data.file.data}" class="attachment" />` : ""}`;
        const div = createMessageElement(messageContent, "user-message");
        div.querySelector(".message-text").innerText = data.text;
        chatBody.appendChild(div);
      } else {
        // Bot Message HTML
        const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024"><path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/></svg>
                                <div class="message-text">${data.text}</div>`;
        const div = createMessageElement(messageContent, "bot-message");
        chatBody.appendChild(div);
      }
    });
    // Auto scroll to bottom
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  });
};

// App start hone par messages load karein
loadMessagesFromFirestore();


// --- 4. MAIN CHAT LOGIC---

// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");
  
  if(!userData.message && !userData.file.data) return;

  // === CHANGE: User message seedha Firestore mein save karein ===
  // (Hum yahan UI par append NAHI kar rahe, kyunki `loadMessagesFromFirestore` khud kar dega)
  saveToFirestore("user", userData.message, userData.file.data ? userData.file : null);

  // Simulate bot response (Thinking Indicator)
  // Hum thinking indicator locally dikhayenge, jab tak Bot reply save na ho jaye
  setTimeout(() => {
    const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
            <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"/></svg>
          <div class="message-text">
            <div class="thinking-indicator">
              <div class="dot"></div><div class="dot"></div><div class="dot"></div>
            </div>
          </div>`;
    const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    
    // Bot ko trigger karein
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Adjust input field height dynamically
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

// Handle Enter key press
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && !e.shiftKey && userMessage && window.innerWidth > 768) {
    handleOutgoingMessage(e);
  }
});

// Handle file input change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const base64String = e.target.result.split(",")[1];
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };
  };
  reader.readAsDataURL(file);
});

// Cancel file upload
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
});

// Initialize emoji picker
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});

document.querySelector(".chat-form").appendChild(picker);
sendMessage.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
