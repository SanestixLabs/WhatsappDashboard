import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Check, CheckCheck, Clock, AlertCircle, Phone, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { useMessageStore, useConversationStore } from '../../store';
import toast from 'react-hot-toast';

const statusIcons = {
  pending:   <Clock size={10} className="text-gray-500" />,
  sent:      <Check size={10} className="text-gray-400" />,
  delivered: <CheckCheck size={10} className="text-gray-400" />,
  read:      <CheckCheck size={10} className="text-emerald-400" />,
  failed:    <AlertCircle size={10} className="text-red-400" />,
};

export default function ChatWindow({ conversation }) {
  const [text, setText]     = useState('');
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  const { messagesByConv, sending, sendMessage } = useMessageStore();
  const { toggleAutomation, closeConversation }  = useConversationStore();

  const messages = messagesByConv[conversation.id] || [];

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Focus input on conversation change
  useEffect(() => {
    inputRef.current?.focus();
    setText('');
  }, [conversation.id]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setText('');
    const result = await sendMessage(conversation.id, trimmed);
    if (!result.ok) {
      toast.error(result.error || 'Failed to send message');
      setText(trimmed); // restore text on failure
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSessionExpired = conversation.session_expires_at
    ? new Date(conversation.session_expires_at) <= new Date()
    : true;

  // Group messages by date
  const groupedMessages = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-sm font-semibold text-white">
            {(conversation.contact_name?.[0] || conversation.phone_number?.slice(-1) || '?').toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-medium text-sm">
              {conversation.contact_name || conversation.phone_number}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{conversation.phone_number}</span>
              {isSessionExpired ? (
                <span className="text-xs text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">Session expired</span>
              ) : (
                <span className="text-xs text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded">Active session</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Automation toggle */}
          <button
            onClick={() => toggleAutomation(conversation.id, !conversation.automation_enabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              conversation.automation_enabled
                ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title={conversation.automation_enabled ? 'Disable automation (take over)' : 'Enable automation'}
          >
            <Bot size={13} />
            {conversation.automation_enabled ? 'Auto ON' : 'Manual'}
          </button>

          {/* Close conversation */}
          <button
            onClick={() => closeConversation(conversation.id)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            title="Close conversation"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 text-sm mt-20">No messages yet</div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="text-center text-xs text-gray-600 my-4">
                <span className="bg-gray-800 px-3 py-1 rounded-full">{date}</span>
              </div>
              {msgs.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 bg-gray-900 border-t border-gray-800">
        {isSessionExpired && (
          <div className="mb-2 p-2.5 bg-yellow-900/20 border border-yellow-800/40 rounded-lg flex items-center gap-2 text-xs text-yellow-400">
            <AlertCircle size={13} />
            24-hour session expired. You can only send template messages to this contact.
          </div>
        )}

        {!conversation.automation_enabled && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-blue-400">
            <User size={11} />
            <span>Manual mode — you are handling this conversation</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSessionExpired}
            placeholder={isSessionExpired ? 'Session expired — use templates' : 'Type a message... (Enter to send)'}
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-40 max-h-32"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending || isSessionExpired}
            className="w-10 h-10 flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isOutgoing = message.direction === 'outgoing';

  return (
    <div className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`max-w-xs lg:max-w-md px-3.5 py-2 rounded-2xl text-sm ${
          isOutgoing
            ? 'bg-emerald-700 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs opacity-50">
            {format(new Date(message.timestamp || message.created_at), 'HH:mm')}
          </span>
          {isOutgoing && (
            <span className="opacity-70">{statusIcons[message.status] || statusIcons.sent}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByDate(messages) {
  return messages.reduce((acc, msg) => {
    const date = format(new Date(msg.timestamp || msg.created_at), 'MMMM d, yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});
}
