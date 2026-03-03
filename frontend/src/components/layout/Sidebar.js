import React from 'react';
import { MessageSquare, Users, Settings, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../../store';

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  const navItems = [
    { icon: MessageSquare, label: 'Conversations', active: true },
    { icon: Users,         label: 'Contacts',      active: false },
    { icon: Zap,           label: 'Automations',   active: false },
    { icon: Settings,      label: 'Settings',      active: false },
  ];

  return (
    <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-1">
      {/* Logo */}
      <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center mb-6 flex-shrink-0">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
          <path d="M5.077 18.347l.892-3.244a8.357 8.357 0 01-1.12-4.232C4.852 6.26 8.113 3 12.124 3c1.948.001 3.778.76 5.151 2.138a7.247 7.247 0 012.124 5.155c-.002 4.012-3.263 7.272-7.272 7.272a7.266 7.266 0 01-3.475-.883l-3.575.865z" stroke="white" strokeWidth="1.5" fill="none"/>
        </svg>
      </div>

      {/* Nav items */}
      {navItems.map(({ icon: Icon, label, active }) => (
        <button
          key={label}
          title={label}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            active
              ? 'bg-emerald-600 text-white'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Icon size={18} />
        </button>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User avatar + logout */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
          {user?.name?.[0]?.toUpperCase() || 'A'}
        </div>
        <button
          onClick={logout}
          title="Logout"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}
