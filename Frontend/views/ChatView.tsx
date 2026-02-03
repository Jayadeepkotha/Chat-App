import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../types';
import Button from '../components/Button';
import { Icons } from '../constants';
import { socketService } from '../services/socketService';

interface ChatViewProps {
  partnerProfile: { nickname: string; bio: string; gender: string };
  roomId: string;
  onLeave: () => void;
  onNext: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ partnerProfile, onLeave, onNext, roomId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPartnerDisconnected, setIsPartnerDisconnected] = useState(false);
  const [disconnectTimer, setDisconnectTimer] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real Socket Listener
  useEffect(() => {
    // Listen for incoming messages
    socketService.onMessage((data) => {
      const newMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'stranger',
        text: data.text,
        timestamp: data.timestamp
      };
      setMessages(prev => [...prev, newMsg]);
    });

    // Listen for partner disconnect
    socketService.onChatEnded(() => {
      setIsPartnerDisconnected(true);
      // Start countdown
      let timeLeft = 5;
      const timer = setInterval(() => {
        timeLeft -= 1;
        setDisconnectTimer(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          onNext(); // Auto-next or leave
        }
      }, 1000);
    });

    return () => {
      socketService.offMessage();
      socketService.offChatEnded();
    };
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPartnerDisconnected) return;

    // 1. Show my message locally
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'me',
      text: input,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);

    // 2. Send to backend
    socketService.sendMessage(roomId, input);
    setInput('');
  };

  // Helper to render name. 
  // We strip the #Discriminator for the UI to keep it clean, 
  // even though it exists in the data for system uniqueness.
  const renderName = (fullName: string) => {
    const cleanName = fullName.split('#')[0];
    return <span className="font-semibold text-white">{cleanName}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          {/* Avatar Removed as per user request */}
          <div>
            <h3 className="text-sm">
              {renderName(partnerProfile.nickname)}
            </h3>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {partnerProfile.gender} • {partnerProfile.bio || "No bio"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Are you sure you want to REPORT this user? Only do this for abuse.")) {
                socketService.reportUser(roomId);
                onLeave(); // Leave after reporting
              }
            }}
            className="!p-2 !rounded-lg"
            title="Report & Leave"
          >
            <Icons.XMark />
          </Button>
          <Button variant="secondary" onClick={onNext} className="!px-3 !py-2 !text-sm" title="Next Match">
            Next
          </Button>
        </div>
      </div>

      {/* Disconnect Banner */}
      {isPartnerDisconnected && (
        <div className="bg-red-500/90 text-white text-center text-sm py-2 px-4 shadow-md backdrop-blur animate-pulse">
          Partner disconnected. Finding next match in {disconnectTimer}s...
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-xs text-slate-600 my-4">
          Chat is end-to-end encrypted. Messages are ephemeral.
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.sender === 'me'
              ? 'bg-teal-600 text-white rounded-tr-none'
              : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPartnerDisconnected}
            placeholder={isPartnerDisconnected ? "Chat ended." : "Type a message..."}
            className={`flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors ${isPartnerDisconnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <Button type="submit" disabled={!input.trim() || isPartnerDisconnected} className="!rounded-xl !px-4">
            <Icons.Send />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;