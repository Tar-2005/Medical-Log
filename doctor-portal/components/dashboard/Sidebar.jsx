import { Activity, ClipboardList, AlertTriangle, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';

export default function Sidebar() {
  const { logout } = useAuth();

  const navItems = [
    { icon: Activity, label: 'Overview', href: '/doctor/dashboard', active: true },
    { icon: ClipboardList, label: 'Labs & Vitals', href: '#', active: false },
    { icon: AlertTriangle, label: 'Break-Glass', href: '/dashboard/emergency', active: false, color: 'text-danger' },
  ];

  return (
    <div className="w-64 bg-surface border-r border-border flex flex-col hidden md:flex">
      <div className="p-6 border-b border-border">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          Antigravity
        </h2>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              item.active 
                ? 'bg-primary/10 text-primary' 
                : 'text-text-secondary hover:bg-border/50 hover:text-white'
            }`}
          >
            <item.icon size={18} className={item.color || ''} />
            <span className={item.color || ''}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-border/50 hover:text-white transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-danger/10 hover:text-danger transition-colors"
        >
          <LogOut size={18} />
          <span>End Session</span>
        </button>
      </div>
    </div>
  );
}
