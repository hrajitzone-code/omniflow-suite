import React, { useState, useEffect } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { AppNotification, SystemType } from '../../types';
import { omniStore } from '../../services/storageService';

const GOVERNANCE_TABS = new Set(['users', 'sync', 'audit', 'quarantine']);

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (system: SystemType, tab: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const loadAuthorizedNotifications = () => {
    const activeUser = omniStore.getCurrentUser();
    const visible = omniStore.getNotifications().filter(n => {
      if (n.system === 'influencer') return omniStore.hasDepartmentAccess(activeUser, 'influencer');
      if (n.system === 'digital') return omniStore.hasDepartmentAccess(activeUser, 'digital');
      return activeUser.role === 'Super Admin' || Boolean(activeUser.governanceTabs?.length);
    });
    setNotifications(visible);
  };

  useEffect(() => {
    if (isOpen) {
      loadAuthorizedNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUser = omniStore.getCurrentUser();

  const canFollowLink = (n: AppNotification) => {
    if (!n.linkAction) return false;
    if (GOVERNANCE_TABS.has(n.linkAction.tab)) {
      return omniStore.hasGovernanceAccess(currentUser, n.linkAction.tab);
    }
    return omniStore.hasTabAccess(currentUser, n.linkAction.system, n.linkAction.tab);
  };

  const handleMarkAsRead = (id: string) => {
    omniStore.markNotificationAsRead(id);
    loadAuthorizedNotifications();
  };

  const handleMarkAllAsRead = () => {
    notifications.forEach(n => omniStore.markNotificationAsRead(n.id));
    loadAuthorizedNotifications();
  };

  const handleNotificationClick = (n: AppNotification) => {
    handleMarkAsRead(n.id);
    if (n.linkAction && canFollowLink(n)) {
      onNavigateTab(n.linkAction.system, n.linkAction.tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">In-App Notification Center</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Mark all read
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No notifications for your approved workspaces.</p>
            ) : (
              notifications.map(n => {
                const isUrgent = n.type === 'urgent';
                const isWarning = n.type === 'warning';
                const linkAllowed = canFollowLink(n);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      !n.isRead
                        ? 'bg-slate-950 border-indigo-500/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${!n.isRead ? 'bg-indigo-400' : 'bg-transparent'}`} />
                        <h4 className="font-bold text-xs text-white">{n.title}</h4>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        isUrgent ? 'bg-rose-500/20 text-rose-300' :
                        isWarning ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {n.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-2 leading-relaxed">{n.message}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {linkAllowed && (
                        <span className="text-indigo-400 font-medium flex items-center gap-0.5">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-500">
          Filtered strictly to your approved departments
        </div>
      </div>
    </div>
  );
};
