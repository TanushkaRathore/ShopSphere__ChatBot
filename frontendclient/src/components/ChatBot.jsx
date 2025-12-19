import React, { useState, useEffect, useRef } from "react";
import { FaPaperPlane, FaTimes, FaCommentDots } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatBot.css";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [threadId, setThreadId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          text: "👋 Hi! I’m ShopSphere Bot. How can I help you today?",
          isAgent: true,
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);
  const handleInputChange = (e) => setInputValue(e.target.value);

  const formatMessage = (msg) => {
    if (!msg) return "";
    if (typeof msg === "string") return msg;
    if (typeof msg === "object") return JSON.stringify(msg, null, 2);
    return String(msg);
  };

  // Send message to backend
  const sendMessage = async (message) => {
    const userMessage = { text: message, isAgent: false };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    const endpoint = threadId
      ? `http://localhost:5000/chat/${threadId}`
      : "http://localhost:5000/chat";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      const botMessage = {
        text: formatMessage(data.response),
        isAgent: true,
        threadId: data.threadId || threadId,
      };

      setMessages((prev) => [...prev, botMessage]);
      setThreadId(data.threadId || threadId);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { text: "⚠️ Oops! Something went wrong.", isAgent: true },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  return (
    <div className="chat-widget">
      {isOpen ? (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <h3>ShopSphere Bot</h3>
            <button className="close-btn" onClick={toggleChat}>
              <FaTimes />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.isAgent ? "bot" : "user"}`}
              >
                {msg.isAgent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            ))}

            {/* Quick questions */}
            {messages.length === 1 && (
              <div className="quick-questions">
                <button onClick={() => sendMessage("Show me trending products")}>
                  🌟 Show me trending products
                </button>
                <button onClick={() => sendMessage("Search for dresses")}>
                  👗 Search for dresses
                </button>
                <button onClick={() => sendMessage("View accessories")}>
                  👜 View accessories
                </button>
                <button onClick={() => sendMessage("Show current discounts")}>
                  💸 Show current discounts
                </button>
              </div>
            )}

            {isTyping && <div className="chat-message bot">💬 Typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="chat-input" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={handleInputChange}
            />
            <button type="submit">
              <FaPaperPlane />
            </button>
          </form>
        </div>
      ) : (
        <button className="chat-toggle" onClick={toggleChat}>
          <FaCommentDots size={24} />
        </button>
      )}
    </div>
  );
};

export default ChatBot;
