import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Camera, Image as ImageIcon } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'jo';
  timestamp: Date;
  reactions?: string[];
}

interface ChatPageProps {
  onBack: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hallo! Ich bin Jo, deine persönliche Begleiterin auf deiner Journey. Wie geht es dir heute?',
      sender: 'jo',
      timestamp: new Date(Date.now() - 300000),
    },
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Function to determine if message should show avatar (first in sequence)
  const shouldShowAvatar = (currentIndex: number, messages: Message[]) => {
    if (currentIndex === 0) return true;
    
    const currentMessage = messages[currentIndex];
    const previousMessage = messages[currentIndex - 1];
    
    return currentMessage.sender !== previousMessage.sender;
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll chat container to top initially, then to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      // First scroll to top
      chatContainerRef.current.scrollTop = 0;
      
      // Then scroll to bottom after a brief delay
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to send message to webhook and get Jo's response
  const getJoResponse = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch('https://n8n.per-sales.de/webhook/test-fe77-4410-b82f-bdeeff9fe583', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the response message from the webhook response
      // Adjust this based on the actual structure of your webhook response
      return data.message || data.response || data.reply || 'Entschuldigung, ich konnte deine Nachricht nicht verarbeiten. Kannst du es nochmal versuchen?';
      
    } catch (error) {
      console.error('Webhook request failed:', error);
      return 'Es tut mir leid, ich bin momentan nicht erreichbar. Bitte versuche es in einem Moment nochmal.';
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
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
      // Wait approximately 10 seconds for the webhook response
      const joResponseText = await getJoResponse(messageToSend);
      
      // Add a small delay to make the conversation feel more natural
      setTimeout(() => {
        const joResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: joResponseText,
          sender: 'jo',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, joResponse]);
        setIsTyping(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error getting Jo response:', error);
      
      // Fallback response if webhook fails
      setTimeout(() => {
        const fallbackResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Es tut mir leid, ich bin momentan nicht erreichbar. Bitte versuche es in einem Moment nochmal.',
          sender: 'jo',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallbackResponse]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400 flex flex-col">
      {/* Chat Container - positioned at bottom of screen */}
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
              </div>
              
              <div className="w-9"></div>
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
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">JOurney Bestie</h3>
                <p className="text-sm text-gray-500">Jo Wünsche</p>
              </div>
            </div>
          </div>

          {/* Header Separator */}
          <div className="w-full h-px bg-gray-200 my-2"></div>

          {/* Messages - scrolled to top initially, then to bottom */}
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
                      {/* Profile image - only show for first message in sequence */}
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
                      
                      {/* Message bubble with dynamic sizing */}
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
                          minHeight: isLastInSequence ? '52px' : '44px', // Primary vs secondary sizing
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {message.content}
                      </div>
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

            {isTyping && (
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
                  disabled={isTyping}
                />
              </div>

              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isTyping}
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