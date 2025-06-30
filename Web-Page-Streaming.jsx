import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Camera, Image as ImageIcon } from 'lucide-react';

const ChatPage = ({ onBack }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      content: 'Hallo! Ich bin Jo, deine persönliche Begleiterin auf deiner Journey. Wie geht es dir heute?',
      sender: 'jo',
      timestamp: new Date(Date.now() - 300000),
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [conversationId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const currentStreamingMessageRef = useRef('');

  // Your Railway webhook URL
  const WEBHOOK_URL = 'https://chatbot-demo-production-6c16.up.railway.app';

  // Function to determine if message should show avatar (first in sequence)
  const shouldShowAvatar = (currentIndex, messages) => {
    if (currentIndex === 0) return true;
    
    const currentMessage = messages[currentIndex];
    const previousMessage = messages[currentIndex - 1];
    
    return currentMessage.sender !== previousMessage.sender;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = 0;
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreamingResponse, currentStreamingMessage]);

  // REAL-TIME Streaming function with UI updates
  const getJoResponseStreaming = async (userMessage) => {
    try {
      const response = await fetch(`${WEBHOOK_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let fullContent = '';
      let thinkingContent = '';
      
      // Start streaming UI
      setIsStreamingResponse(true);
      setCurrentStreamingMessage('');
      currentStreamingMessageRef.current = '';

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'text') {
                    fullContent += data.content;
                    currentStreamingMessageRef.current += data.content;
                    
                    // Update UI in REAL-TIME
                    setCurrentStreamingMessage(currentStreamingMessageRef.current);
                    
                  } else if (data.type === 'thinking') {
                    thinkingContent += data.content;
                    
                  } else if (data.type === 'complete') {
                    // Stream finished
                    break;
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                  console.log('JSON parse error:', e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
      // End streaming UI
      setIsStreamingResponse(false);
      setCurrentStreamingMessage('');
      
      return {
        content: fullContent || 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten.',
        thinking: thinkingContent || undefined
      };
      
    } catch (error) {
      console.error('Streaming request failed:', error);
      setIsStreamingResponse(false);
      setCurrentStreamingMessage('');
      
      return {
        content: 'Es tut mir leid, ich bin momentan nicht erreichbar. Bitte versuche es in einem Moment nochmal.'
      };
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = newMessage;
    setNewMessage('');
    setIsTyping(true);

    try {
      // Use STREAMING (this is the important change!)
      const joResponseData = await getJoResponseStreaming(messageToSend);
      
      // Add the final complete message
      const joResponse = {
        id: (Date.now() + 1).toString(),
        content: joResponseData.content,
        sender: 'jo',
        timestamp: new Date(),
        thinking: joResponseData.thinking,
      };
      
      setMessages(prev => [...prev, joResponse]);
      setIsTyping(false);
      
    } catch (error) {
      console.error('Error getting Jo response:', error);
      
      const fallbackResponse = {
        id: (Date.now() + 1).toString(),
        content: 'Es tut mir leid, ich bin momentan nicht erreichbar. Bitte versuche es in einem Moment nochmal.',
        sender: 'jo',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackResponse]);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Function to toggle thinking display
  const [showThinking, setShowThinking] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 flex flex-col">
      <div className="flex-1 flex items-end justify-center p-4 pb-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="text-center">
                <h2 className="text-lg font-medium text-gray-800">Dein Chat</h2>
                {isStreamingResponse && (
                  <div className="text-xs text-blue-500 animate-pulse">Streaming...</div>
                )}
              </div>
              
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="text-xs px-2 py-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                title="Thinking anzeigen/verstecken"
              >
                🧠
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="https://raw.githubusercontent.com/puddel12345/TEST/main/Jo-Matcha.webp"
                  alt="Jo"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isStreamingResponse ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">JOurney Bestie</h3>
                <p className="text-sm text-gray-500">
                  Jo Wünsche • Claude Opus 4 
                  {isStreamingResponse && ' • Live Streaming'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gray-200 my-2"></div>

          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="h-96 overflow-y-auto bg-gray-50 px-4 py-3 space-y-3"
          >
            {messages.map((message, index) => {
              const showAvatar = shouldShowAvatar(index, messages);
              const isLastInSequence = index === messages.length - 1 || 
                (index < messages.length - 1 && messages[index + 1].sender !== message.sender);

              return (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative w-full max-w-[280px] ${message.sender === 'user' ? 'mr-2' : 'ml-2'}`}>
                      {showAvatar && (
                        <img
                          src={message.sender === 'jo' 
                            ? "https://raw.githubusercontent.com/puddel12345/TEST/main/Jo-Matcha.webp"
                            : "https://raw.githubusercontent.com/puddel12345/TEST/main/User.webp"
                          }
                          alt={message.sender === 'jo' ? 'Jo' : 'User'}
                          className="absolute w-8 h-8 rounded-full object-cover z-10 -top-1 -left-1"
                        />
                      )}
                      
                      <div
                        className={`px-5 py-4 rounded-2xl text-sm leading-relaxed w-full ${
                          message.sender === 'user'
                            ? 'bg-[#36516C] text-white rounded-tr-md'
                            : 'bg-sky-200 text-gray-800 rounded-tl-md'
                        } ${showAvatar ? 'pl-10' : 'pl-5'}`}
                        style={{
                          marginTop: showAvatar ? '4px' : '0px',
                          paddingTop: showAvatar ? '18px' : '16px',
                          paddingLeft: showAvatar ? '20px' : '16px',
                          paddingRight: '16px',
                          paddingBottom: '16px',
                          minHeight: isLastInSequence ? '52px' : '44px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {message.content}
                      </div>

                      {showThinking && message.thinking && message.sender === 'jo' && (
                        <div className="mt-1 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-600 italic">
                          <strong>Thinking:</strong> {message.thinking.substring(0, 150)}
                          {message.thinking.length > 150 && '...'}
                        </div>
                      )}
                    </div>
                  </div>

                  {message.reactions && (
                    <div className={`flex ${message.sender === 'user' ? 'justify-end pr-12' : 'justify-start pl-12'}`}>
                      <div className="bg-sky-200 rounded-full px-4 py-2 flex gap-1">
                        {message.reactions.map((reaction, reactionIndex) => (
                          <span key={reactionIndex} className="text-lg">{reaction}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Real-time streaming message */}
            {isStreamingResponse && currentStreamingMessage && (
              <div className="flex justify-start">
                <div className="relative w-full max-w-[280px] ml-2">
                  <img
                    src="https://raw.githubusercontent.com/puddel12345/TEST/main/Jo-Matcha.webp"
                    alt="Jo"
                    className="absolute w-8 h-8 rounded-full object-cover z-10 -top-1 -left-1"
                  />
                  <div 
                    className="bg-sky-200 px-5 py-4 rounded-2xl rounded-tl-md w-full border-l-4 border-blue-400"
                    style={{
                      marginTop: '4px',
                      paddingTop: '18px',
                      paddingLeft: '20px',
                      paddingBottom: '16px',
                      minHeight: '52px',
                      marginLeft: '12px'
                    }}
                  >
                    <div className="text-sm leading-relaxed">
                      {currentStreamingMessage}
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {isTyping && !isStreamingResponse && (
              <div className="flex justify-start">
                <div className="relative w-full max-w-[280px] ml-2">
                  <img
                    src="https://raw.githubusercontent.com/puddel12345/TEST/main/Jo-Matcha.webp"
                    alt="Jo"
                    className="absolute w-8 h-8 rounded-full object-cover z-10 -top-1 -left-1"
                  />
                  <div 
                    className="bg-sky-200 px-5 py-4 rounded-2xl rounded-tl-md w-full"
                    style={{
                      marginTop: '4px',
                      paddingTop: '18px',
                      paddingLeft: '20px',
                      paddingBottom: '16px',
                      minHeight: '52px',
                      marginLeft: '12px'
                    }}
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-white p-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>

              <div className="flex-1">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Schreib mir gerne!"
                  className="w-full px-4 py-2 bg-gray-100 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  disabled={isTyping || isStreamingResponse}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isTyping || isStreamingResponse}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full transition-colors disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;