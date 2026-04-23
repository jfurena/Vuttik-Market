import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, CheckCheck, ChevronLeft, MessageSquare, Search, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/firebase';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  p1_name?: string;
  p2_name?: string;
  p1_photo?: string;
  p2_photo?: string;
  last_message?: string;
  last_message_at?: string;
}

export default function Chat() {
  const currentUser = auth.currentUser;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  // Determine the other participant's name in a conversation
  const getOtherName = (conv: Conversation) => {
    if (!currentUser) return 'Usuario';
    return conv.participant_1 === currentUser.uid
      ? (conv.p2_name || 'Usuario')
      : (conv.p1_name || 'Usuario');
  };

  const getOtherInitial = (conv: Conversation) => {
    return getOtherName(conv).charAt(0).toUpperCase();
  };

  const getOtherId = (conv: Conversation) => {
    if (!currentUser) return '';
    return conv.participant_1 === currentUser.uid ? conv.participant_2 : conv.participant_1;
  };

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const convs = await api.getConversations(currentUser.uid);
      setConversations(convs);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, [currentUser]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async () => {
    if (!selectedConvId) return;
    setLoadingMsgs(true);
    try {
      const msgs = await api.getMessages(selectedConvId);
      setMessages(msgs);
      // Mark as read
      if (currentUser) {
        api.markMessagesRead(selectedConvId, currentUser.uid).catch(() => {});
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [selectedConvId, currentUser]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (selectedConvId) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll every 5s
      return () => clearInterval(interval);
    }
  }, [selectedConvId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users to start new chat
  useEffect(() => {
    if (newChatQuery.length > 1) {
      const timer = setTimeout(async () => {
        try {
          const results = await api.searchUsers(newChatQuery);
          setSearchResults(results.filter((u: any) => u.uid !== currentUser?.uid));
        } catch (err) {
          setSearchResults([]);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [newChatQuery, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConvId || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage('');
    try {
      const msg = await api.sendMessage({ conversationId: selectedConvId, senderId: currentUser.uid, content });
      setMessages(prev => [...prev, msg]);
      // Update last_message in conversation list
      setConversations(prev => prev.map(c =>
        c.id === selectedConvId ? { ...c, last_message: content, last_message_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleStartChat = async (otherUser: any) => {
    if (!currentUser) return;
    try {
      const conv = await api.getOrCreateConversation(currentUser.uid, otherUser.uid);
      // Enrich with names if needed
      const enriched: Conversation = {
        ...conv,
        p1_name: conv.participant_1 === currentUser.uid ? (currentUser.displayName || 'Tú') : otherUser.display_name,
        p2_name: conv.participant_2 === currentUser.uid ? (currentUser.displayName || 'Tú') : otherUser.display_name,
      };
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        if (exists) return prev;
        return [enriched, ...prev];
      });
      setSelectedConvId(conv.id);
      setShowNewChat(false);
      setNewChatQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 86400) return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800) return d.toLocaleDateString('es-DO', { weekday: 'short' });
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-120px)] bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
      <div className="flex h-full">
        {/* Conversation List */}
        <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedConvId && 'hidden md:flex'}`}>
          <div className="p-4 border-b border-gray-50 flex items-center justify-between gap-3">
            <h2 className="text-xl font-display font-black text-vuttik-navy">Mensajes</h2>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              title="Nuevo mensaje"
              className={`p-2 rounded-xl transition-all ${showNewChat ? 'bg-vuttik-blue text-white' : 'bg-vuttik-gray text-vuttik-navy hover:bg-vuttik-blue/10'}`}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* New chat search */}
          <AnimatePresence>
            {showNewChat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-b border-gray-50"
              >
                <div className="p-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vuttik-text-muted" />
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={newChatQuery}
                      onChange={(e) => setNewChatQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-vuttik-gray rounded-xl pl-8 pr-3 py-2 text-xs outline-none"
                    />
                  </div>
                  {searchResults.map(u => (
                    <button
                      key={u.uid}
                      onClick={() => handleStartChat(u)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-vuttik-gray rounded-xl transition-colors text-left mt-1"
                    >
                      <div className="w-8 h-8 rounded-xl bg-vuttik-navy text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {u.display_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-vuttik-navy">{u.display_name}</p>
                        <p className="text-[10px] text-vuttik-text-muted uppercase">{u.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {loadingConvs && (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-vuttik-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loadingConvs && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-vuttik-text-muted text-center px-4">
                <MessageSquare size={32} className="mb-3 opacity-30" />
                <p className="text-xs font-bold">No tienes conversaciones aún</p>
                <p className="text-[10px] mt-1">Pulsa + para iniciar un chat</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-vuttik-gray transition-colors border-b border-gray-50 text-left ${selectedConvId === conv.id ? 'bg-vuttik-gray' : ''}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-vuttik-blue/10 flex items-center justify-center text-vuttik-blue font-bold text-lg shrink-0">
                  {getOtherInitial(conv)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="text-sm font-bold text-vuttik-navy truncate">{getOtherName(conv)}</h4>
                    <span className="text-[10px] text-vuttik-text-muted shrink-0 ml-1">{formatTime(conv.last_message_at || '')}</span>
                  </div>
                  <p className="text-xs text-vuttik-text-muted truncate">{conv.last_message || 'Inicia la conversación'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col bg-vuttik-gray/30 ${!selectedConvId && 'hidden md:flex'}`}>
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-3">
                <button onClick={() => setSelectedConvId(null)} className="md:hidden p-2 -ml-2 text-vuttik-navy">
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-vuttik-navy text-white flex items-center justify-center font-bold">
                  {getOtherInitial(selectedConv)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-vuttik-navy">{getOtherName(selectedConv)}</h4>
                  <p className="text-[10px] text-vuttik-text-muted">Conversación privada</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-3">
                {loadingMsgs && messages.length === 0 && (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-vuttik-blue border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!loadingMsgs && messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-vuttik-text-muted py-10">
                    <MessageSquare size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-bold">Aún no hay mensajes</p>
                    <p className="text-xs mt-1">Envía el primer mensaje</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[72%] flex flex-col gap-1 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm ${
                        isMe
                          ? 'bg-vuttik-blue text-white rounded-tr-none shadow-md'
                          : 'bg-white text-vuttik-navy rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-vuttik-text-muted">{formatTime(msg.sent_at)}</span>
                        {isMe && <CheckCheck size={12} className={msg.is_read ? 'text-vuttik-blue' : 'text-vuttik-text-muted'} />}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-gray-100">
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
                    disabled={!newMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-vuttik-blue text-white rounded-xl flex items-center justify-center shadow-lg shadow-vuttik-blue/20 disabled:opacity-40 transition-all"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-vuttik-blue mb-4 shadow-sm">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-xl font-display font-black text-vuttik-navy">Tus Mensajes</h3>
              <p className="text-sm text-vuttik-text-muted max-w-xs mt-2">Selecciona un chat para conversar. Usa + para iniciar una nueva conversación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
