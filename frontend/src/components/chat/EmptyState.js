import React from 'react';
import { MessageSquare } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-center px-8">
      <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
        <MessageSquare size={28} className="text-gray-600" />
      </div>
      <h3 className="text-white font-medium mb-2">No conversation selected</h3>
      <p className="text-gray-500 text-sm max-w-xs">
        Select a conversation from the list to start chatting, or wait for new incoming messages.
      </p>
    </div>
  );
}
