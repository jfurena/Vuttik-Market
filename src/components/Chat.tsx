import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, CheckCheck, ChevronLeft } from 'lucide-react';

const MOCK_CHATS = [
  { 
    id: '1', 
    name: 'Supermercado Bravo', 
    lastMsg: 'Sí, tenemos stock disponible de leche.', 
    time: '10:30 AM', 
    unread: 2, 
    isOfficial: true,
    messages: [
      { id: '1', text: 'Hola, ¿tienen stock de la leche que publicaron hace 1 hora?', sender: 'me' },
      { id: '2', text: 'Sí, tenemos stock disponible de leche. Acabamos de reponer el pasillo 4.', sender: 'them' },
      { id: '3', text: '¡Genial! Voy para allá. ¿El precio de 1.20 USD se mantiene?', sender: 'me' },
    ]
  },
  { 
    id: '2', 
    name: 'Ana Martínez', 
    lastMsg: '¿A qué hora viste ese precio?', 
    time: 'Ayer', 
    unread: 0, 
    isOfficial: false,
    messages: [
      { id: '1', text: 'Hola Ana, vi tu publicación sobre el arroz.', sender: 'me' },
      { id: '2', text: '¿A qué hora viste ese precio?', sender: 'them' },
    ]
  },
  { 
    id: '3', 
    name: 'Soporte Vuttik', 
    lastMsg: 'Tu reporte ha sido verificado.', 
    time: 'Lun', 
    unread: 0, 
    isOfficial: true,
    messages: [
      { id: '1', text: 'Tu reporte ha sido verificado.', sender: 'them' },
    ]
  },
];

export default function Chat() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(MOCK_CHATS[0].id);
  const [chats, setChats] = useState(MOCK_CHATS);
  const [newMessage, setNewMessage] = useState('');

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChatId) return;

    setChats(prev => prev.map(chat => {
      if (chat.id === selectedChatId) {
        return {
          ...chat,
          lastMsg: newMessage,
          messages: [...chat.messages, { id: Date.now().toString(), text: newMessage, sender: 'me' }]
        };
      }
      return chat;
    }));
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
      <div className="flex h-full">
        {/* Chat List */}
        <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedChatId && 'hidden md:flex'}`}>
          <div className="p-6 border-b border-gray-50">
            <h2 className="text-xl font-display font-black text-vuttik-navy">Mensajes</h2>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {chats.map((chat) => (
              <button 
                key={chat.id} 
                onClick={() => setSelectedChatId(chat.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-vuttik-gray transition-colors border-b border-gray-50 text-left ${selectedChatId === chat.id ? 'bg-vuttik-gray' : ''}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-vuttik-blue/10 flex items-center justify-center text-vuttik-blue">
                    <User size={24} />
                  </div>
                  {chat.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-vuttik-blue text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {chat.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-sm font-bold text-vuttik-navy truncate flex items-center gap-1">
                      {chat.name}
                      {chat.isOfficial && <CheckCheck size={14} className="text-vuttik-blue" />}
                    </h4>
                    <span className="text-[10px] text-vuttik-text-muted">{chat.time}</span>
                  </div>
                  <p className="text-xs text-vuttik-text-muted truncate">{chat.lastMsg}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-vuttik-gray/30 ${!selectedChatId && 'hidden md:flex'}`}>
          {selectedChat ? (
            <>
              <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 -ml-2 text-vuttik-navy">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-vuttik-navy text-white flex items-center justify-center">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-vuttik-navy">{selectedChat.name}</h4>
                    <p className="text-[10px] text-green-500 font-bold">En línea ahora</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                {selectedChat.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`max-w-[70%] p-4 rounded-2xl text-sm shadow-sm ${
                      msg.sender === 'me' 
                        ? 'self-end bg-vuttik-blue text-white rounded-tr-none shadow-md' 
                        : 'self-start bg-white text-vuttik-navy rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white border-t border-gray-100">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Escribe un mensaje..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="w-full bg-vuttik-gray border-none rounded-2xl px-6 py-4 pr-14 outline-none text-sm"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-vuttik-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-vuttik-blue/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-vuttik-blue mb-4 shadow-sm">
                <Send size={40} />
              </div>
              <h3 className="text-xl font-display font-black text-vuttik-navy">Tus Mensajes</h3>
              <p className="text-sm text-vuttik-text-muted max-w-xs">Selecciona un chat para comenzar a conversar con vendedores y compradores.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

