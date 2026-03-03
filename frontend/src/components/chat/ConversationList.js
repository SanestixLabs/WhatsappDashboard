import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useConversationStore } from '../../store';

const statusColors = {
  open:    'bg-emerald-500',
  closed:  'bg-gray-500',
  pending: 'bg-yellow-500',
};

export default function ConversationList({ conversations, activeId, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('open');
  const { fetchConversations, total } = useConversationStore();

  const handleFilterChange = (status) => {
    setFilter(status);
    fetchConversations({ status });
  };

  const filtered = search
    ? conversations.filter((c) =>
        c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone_number?.includes(search)
      )
    : conversations;

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-white font-semibold text-lg">Conversations</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{total}</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-3">
          {['open', 'pending', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`flex-1 py-1 text-xs rounded-md capitalize transition-colors ${
                filter === s
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-600 text-sm py-12">No conversations</div>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              onClick={() => onSelect(conv)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({ conv, active, onClick }) {
  const initials = conv.contact_name
    ? conv.contact_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : conv.phone_number?.slice(-2);

  const timeAgo = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
    : '';

  const preview = conv.last_message
    ? (conv.last_message_direction === 'outgoing' ? '↗ ' : '') + conv.last_message
    : 'No messages yet';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors border-b border-gray-800/50 ${
        active ? 'bg-gray-800' : 'hover:bg-gray-800/50'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xs font-semibold text-white">
          {initials}
        </div>
        {/* Online indicator / automation dot */}
        {conv.automation_enabled && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-gray-900" title="Automation on" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white truncate">
            {conv.contact_name || conv.phone_number}
          </span>
          <span className="text-xs text-gray-600 ml-2 flex-shrink-0">{timeAgo}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 truncate max-w-[160px]">{preview}</p>
          {conv.unread_count > 0 && (
            <span className="ml-2 flex-shrink-0 bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
