import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  FileText,
  X
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../../types';
import { omniStore } from '../../services/storageService';
import { SENSITIVE_AUDIT_FIELDS } from '../../utils/securityUtils';

interface AuditLogModalProps {
  userRole: UserRole;
  searchQuery: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ userRole, searchQuery }) => {
  const currentUser = omniStore.getCurrentUser();
  const [logs] = useState<AuditLogEntry[]>(omniStore.getAuditLogs());
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (!omniStore.hasDepartmentAccess(currentUser, l.system)) return false;

      const matchesSearch =
        l.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (actionFilter === 'ALL') return true;
      return l.action === actionFilter;
    });
  }, [logs, searchQuery, actionFilter, currentUser]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Immutable System Ledger
            </span>
            <span className="text-xs text-slate-400">Section 5 Compliance</span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            Audit Trail & Google Sheets Conflict Log
          </h2>
          <p className="text-xs text-slate-400">
            Records all field modifications, post-start budget adjustments, payment approvals, and spreadsheet sync resolutions with before/after diffs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {['ALL', 'CREATE', 'UPDATE', 'APPROVAL', 'STATUS_CHANGE', 'SHEET_SYNC'].map(act => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                actionFilter === act ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="space-y-3">
        {filteredLogs.map(log => {
          const isSync = log.action === 'SHEET_SYNC';
          const isApproval = log.action === 'APPROVAL';

          return (
            <div 
              key={log.id} 
              className={`p-4 rounded-xl border bg-slate-900 shadow-sm ${
                isSync ? 'border-amber-700/60 ring-1 ring-amber-500/20' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-indigo-400 text-xs font-semibold">{log.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    log.action === 'CREATE' ? 'bg-emerald-500/20 text-emerald-300' :
                    log.action === 'APPROVAL' ? 'bg-blue-500/20 text-blue-300' :
                    log.action === 'SHEET_SYNC' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {log.entityType} ({log.entityId})
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {log.reason && (
                <div className="mb-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-200">
                  <span className="font-semibold text-slate-400">Documented Reason: </span>
                  {log.reason}
                </div>
              )}

              {/* Before vs After changes diff */}
              <div className="space-y-1 mt-2">
                {log.changes.map((c, i) => {
                  const canSeeSensitive = omniStore.hasPermission(currentUser, log.system, 'viewSensitiveFields');
                  const isSensitiveField = SENSITIVE_AUDIT_FIELDS.has(c.field.toLowerCase());
                  const beforeVal = isSensitiveField && !canSeeSensitive ? '[REDACTED]' : String(c.before ?? 'null');
                  const afterVal = isSensitiveField && !canSeeSensitive ? '[REDACTED]' : String(c.after ?? 'null');
                  return (
                    <div key={i} className="flex flex-wrap items-center gap-2 text-xs bg-slate-950 px-3 py-1.5 rounded border border-slate-800/80 font-mono">
                      <span className="text-slate-400 font-bold">{c.field}:</span>
                      <span className="text-rose-400 line-through">{beforeVal}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span className="text-emerald-400">{afterVal}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2 text-[11px] text-slate-500">
                <span>User: <strong className="text-slate-300">{log.user}</strong> ({log.userRole})</span>
                <span className="capitalize">System: {log.system}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
