import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit3,
  X,
  Key,
  FolderKanban,
  Building,
  UserCheck,
  UserX,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Wand2
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { generateStrongPassword } from '../../utils/securityUtils';
import {
  UserProfile,
  UserRole,
  SystemType,
  DepartmentPermissions,
  INFLUENCER_MODULES,
  DIGITAL_MODULES,
  GOVERNANCE_MODULES
} from '../../types';
import {
  omniStore,
  DEFAULT_PERMISSIONS,
  DEFAULT_GOVERNANCE_TABS,
  DENIED_DEPT_PERMS,
  ALL_INFLUENCER_TABS,
  ALL_DIGITAL_TABS
} from '../../services/storageService';

interface UserAdminViewProps {
  currentUserRole: UserRole;
  searchQuery: string;
}

export const UserAdminView: React.FC<UserAdminViewProps> = ({ currentUserRole, searchQuery }) => {
  const isSuperAdmin = currentUserRole === 'Super Admin';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [users, setUsers] = useState<UserProfile[]>(omniStore.getUsers());
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [hasDeployZip, setHasDeployZip] = useState<boolean>(false);
  const currentUser = omniStore.getCurrentUser();

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    fetch('/omniflow-vercel-deploy.zip', { method: 'HEAD' })
      .then((res) => {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (active && res.ok && (ct.includes('zip') || ct.includes('octet-stream'))) {
          setHasDeployZip(true);
        }
      })
      .catch(() => {
        // Archive not hosted on this environment (e.g. production Vercel)
      });
    return () => {
      active = false;
    };
  }, [isSuperAdmin]);

  const handleConfirmDeleteUser = () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      omniStore.deleteUser(deleteTarget.id);
      setUsers(omniStore.getUsers());
      setBanner({ type: 'success', text: `Deleted user account "${deleteTarget.name}" (${deleteTarget.email}).` });
      setDeleteTarget(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Unable to delete user account.');
    }
  };

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    role: 'Content Coordinator',
    status: 'Active',
    departments: ['influencer'],
    governanceTabs: [],
    permissions: {
      influencer: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS['Content Coordinator'].influencer)),
      digital: { ...DENIED_DEPT_PERMS, allowedTabs: [] },
    },
  });

  const editorProfiles = omniStore.getEditorProfiles();
  const anchorProfiles = omniStore.getAnchorProfiles();

  const refreshList = () => {
    setUsers(omniStore.getUsers());
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setBanner(null);
    setModalError(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setShowPassword(false);
    setFormData({
      name: '',
      email: '',
      role: 'Campaign Manager',
      status: 'Active',
      departments: ['influencer'],
      governanceTabs: [],
      permissions: {
        influencer: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS['Campaign Manager'].influencer)),
        digital: { ...DENIED_DEPT_PERMS, allowedTabs: [] },
      },
      editorId: '',
      anchorId: '',
    });
    setSelectedUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setBanner(null);
    setModalError(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setShowPassword(false);
    setSelectedUser(user);
    setFormData(JSON.parse(JSON.stringify(user)));
    setIsModalOpen(true);
  };

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword(12);
    setPasswordInput(generated);
    setConfirmPasswordInput(generated);
    setShowPassword(true);
  };

  const handleRolePresetChange = (role: UserRole) => {
    const preset = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS['Content Coordinator']));

    if (role === 'Super Admin') {
      setFormData({
        ...formData,
        role,
        departments: ['influencer', 'digital'],
        governanceTabs: [...DEFAULT_GOVERNANCE_TABS['Super Admin']],
        permissions: preset,
      });
      return;
    }

    // Preserve currently checked departments when editing an existing user; otherwise use least-privilege preset
    const currentDepts: SystemType[] = selectedUser
      ? (formData.departments || [])
      : (role === 'Video Editor' || role === 'Anchor & Presenter' ? ['digital'] : ['influencer']);

    const nextPerms = {
      influencer: currentDepts.includes('influencer')
        ? {
            ...preset.influencer,
            canAccess: true,
            canView: true,
            allowedTabs: preset.influencer.allowedTabs?.length ? preset.influencer.allowedTabs : [...ALL_INFLUENCER_TABS],
          }
        : { ...DENIED_DEPT_PERMS, allowedTabs: [] },
      digital: currentDepts.includes('digital')
        ? {
            ...preset.digital,
            canAccess: true,
            canView: true,
            allowedTabs: preset.digital.allowedTabs?.length ? preset.digital.allowedTabs : [...ALL_DIGITAL_TABS],
          }
        : { ...DENIED_DEPT_PERMS, allowedTabs: [] },
    };

    setFormData({
      ...formData,
      role,
      departments: currentDepts,
      governanceTabs: selectedUser ? (formData.governanceTabs || []) : [...(DEFAULT_GOVERNANCE_TABS[role] || [])],
      permissions: nextPerms,
    });
  };

  const handleToggleDepartment = (dept: SystemType) => {
    if (formData.role === 'Super Admin') return;
    const currentDepts = formData.departments || [];
    const enabling = !currentDepts.includes(dept);
    const updatedDepts: SystemType[] = enabling
      ? [...currentDepts, dept]
      : currentDepts.filter(d => d !== dept);

    const role = (formData.role || 'Content Coordinator') as UserRole;
    const preset = DEFAULT_PERMISSIONS[role]?.[dept];
    const allTabs = dept === 'influencer' ? ALL_INFLUENCER_TABS : ALL_DIGITAL_TABS;

    const perms = JSON.parse(JSON.stringify(formData.permissions || DEFAULT_PERMISSIONS['Content Coordinator']));
    if (enabling) {
      perms[dept] = {
        ...(preset?.canAccess ? preset : {
          canAccess: true,
          canView: true,
          canCreate: false,
          canEdit: false,
          canApprove: false,
          canDelete: false,
          canExport: false,
          viewSensitiveFields: false,
        }),
        canAccess: true,
        canView: true,
        allowedTabs: preset?.allowedTabs?.length ? [...preset.allowedTabs] : [...allTabs],
      };
    } else {
      perms[dept] = { ...DENIED_DEPT_PERMS, allowedTabs: [] };
    }

    setFormData({
      ...formData,
      departments: updatedDepts,
      permissions: perms,
    });
  };

  const handleTogglePerm = (dept: SystemType, field: keyof DepartmentPermissions) => {
    if (formData.role === 'Super Admin') return;
    const perms = JSON.parse(JSON.stringify(formData.permissions || DEFAULT_PERMISSIONS['Content Coordinator']));
    perms[dept][field] = !perms[dept][field];
    setFormData({
      ...formData,
      permissions: perms,
    });
  };

  const handleToggleModuleTab = (dept: SystemType, tabId: string) => {
    if (formData.role === 'Super Admin') return;
    const perms = JSON.parse(JSON.stringify(formData.permissions || DEFAULT_PERMISSIONS['Content Coordinator']));
    const existingTabs: string[] = Array.isArray(perms[dept].allowedTabs) ? perms[dept].allowedTabs : [];
    perms[dept].allowedTabs = existingTabs.includes(tabId)
      ? existingTabs.filter(t => t !== tabId)
      : [...existingTabs, tabId];
    setFormData({
      ...formData,
      permissions: perms,
    });
  };

  const handleToggleGovernanceTab = (tabId: string) => {
    if (formData.role === 'Super Admin') return;
    const currentGov = formData.governanceTabs || [];
    const nextGov = currentGov.includes(tabId)
      ? currentGov.filter(t => t !== tabId)
      : [...currentGov, tabId];
    setFormData({
      ...formData,
      governanceTabs: nextGov,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!isSuperAdmin) {
      setBanner({ type: 'error', text: 'Only Super Administrators can create or modify user permissions.' });
      return;
    }

    const isCreating = !selectedUser;
    const trimmedPassword = passwordInput.trim();

    if (isCreating && trimmedPassword.length < 8) {
      setModalError('A login password of at least 8 characters is required when creating a new user account.');
      return;
    }

    if (trimmedPassword.length > 0) {
      if (trimmedPassword.length < 8) {
        setModalError('Password must be at least 8 characters long.');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setModalError('Password and Confirm Password do not match.');
        return;
      }
    }

    setIsSavingUser(true);
    try {
      const saved = omniStore.saveUser(formData);
      if (trimmedPassword.length > 0) {
        await omniStore.setUserPassword(saved.id, passwordInput);
      }
      refreshList();
      setIsModalOpen(false);
      setPasswordInput('');
      setConfirmPasswordInput('');
      setBanner({
        type: 'success',
        text: trimmedPassword.length > 0
          ? `Saved account, password, and access policy for ${saved.name} (${saved.email}).`
          : `Saved access policy for ${saved.name} (${saved.email}).`,
      });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save user account.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleStatus = (u: UserProfile) => {
    if (!isSuperAdmin) {
      setBanner({ type: 'error', text: 'Only Super Administrators can suspend or activate user accounts.' });
      return;
    }
    try {
      omniStore.toggleUserStatus(u.id);
      refreshList();
      setBanner({ type: 'success', text: `Updated account status for ${u.name}.` });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Could not toggle user status.' });
    }
  };

  const handleExportPolicy = () => {
    try {
      const json = omniStore.exportUsersPolicyJson();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omniflow-access-policy-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBanner({ type: 'success', text: 'Exported approved user access policy JSON.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Export failed.' });
    }
  };

  const handleImportPolicyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = omniStore.importUsersPolicyJson(String(reader.result || ''));
      if (result.error) {
        setBanner({ type: 'error', text: result.error });
      } else {
        refreshList();
        setBanner({ type: 'success', text: `Imported ${result.importedCount} user accounts and permissions.` });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto my-8 space-y-3">
        <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <Lock className="w-5 h-5" />
        </div>
        <h3 className="text-base font-bold text-white">Super Administrator Access Only</h3>
        <p className="text-xs text-slate-400">
          Only Super Administrators can view or manage all software accounts. You can manage your own password from your account badge in the top bar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Approved-Only Access Control
            </span>
            <span className="text-xs text-slate-400">Deny-by-Default RBAC</span>
          </div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Separate Departmental RBAC & User Administration
          </h2>
          <p className="text-xs text-slate-400">
            Users only see and access the exact departments, modules, actions, and governance tools approved for their account.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportPolicyFile}
              className="hidden"
            />
            {hasDeployZip && (
              <a
                href="/omniflow-vercel-deploy.zip"
                download="omniflow-vercel-deploy.zip"
                className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/40 transition flex items-center gap-1.5"
                title="Download complete Vercel-ready project folder (.zip)"
              >
                <Download className="w-3.5 h-3.5" />
                Download Vercel ZIP
              </a>
            )}
            <button
              onClick={handleExportPolicy}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              title="Export user access policy JSON"
            >
              <Download className="w-3.5 h-3.5" />
              Export Policy
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              title="Import user access policy JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Policy
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add New User Account
            </button>
          </div>
        )}
      </div>

      {banner && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            banner.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{banner.text}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-3.5 pl-4">User & Role</th>
                <th className="py-3.5">Approved Departments</th>
                <th className="py-3.5">Influencer Access</th>
                <th className="py-3.5">Digital Access</th>
                <th className="py-3.5">Governance</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map(u => {
                const isSuspended = u.status === 'Suspended';
                const infPerms = u.permissions?.influencer;
                const digPerms = u.permissions?.digital;
                const govTabs = u.governanceTabs || [];

                return (
                  <tr key={u.id} className={`hover:bg-slate-800/40 transition ${isSuspended ? 'opacity-60 bg-slate-950/40' : ''}`}>
                    <td className="py-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-200 shrink-0">
                          {(u.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-xs">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                              {u.role}
                            </span>
                            {u.hasPassword ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Lock className="w-2.5 h-2.5" /> Password Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                No Password
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="space-y-1">
                        {u.departments?.includes('influencer') && infPerms?.canAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 w-max">
                            <FolderKanban className="w-2.5 h-2.5" /> Influencer Campaigns
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic block">No Influencer Access</span>
                        )}

                        {u.departments?.includes('digital') && digPerms?.canAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 w-max">
                            <Building className="w-2.5 h-2.5" /> Digital Data Management
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic block">No Digital Access</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      {infPerms?.canAccess ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1 max-w-xs text-[10px]">
                            {infPerms.canView && <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">View</span>}
                            {infPerms.canCreate && <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded">Create</span>}
                            {infPerms.canEdit && <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded">Edit</span>}
                            {infPerms.canApprove && <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded">Approve</span>}
                            {infPerms.canDelete && <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 rounded">Delete</span>}
                            {infPerms.canExport && <span className="px-1.5 py-0.2 bg-sky-950 text-sky-300 rounded">Export</span>}
                            {infPerms.viewSensitiveFields && <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded font-bold">Sensitive</span>}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {infPerms.allowedTabs?.length || 0}/{INFLUENCER_MODULES.length} modules
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Denied</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {digPerms?.canAccess ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1 max-w-xs text-[10px]">
                            {digPerms.canView && <span className="px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">View</span>}
                            {digPerms.canCreate && <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 rounded">Create</span>}
                            {digPerms.canEdit && <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded">Edit</span>}
                            {digPerms.canApprove && <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 rounded">Approve</span>}
                            {digPerms.canDelete && <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 rounded">Delete</span>}
                            {digPerms.canExport && <span className="px-1.5 py-0.2 bg-sky-950 text-sky-300 rounded">Export</span>}
                            {digPerms.viewSensitiveFields && <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 rounded font-bold">Sensitive</span>}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {digPerms.allowedTabs?.length || 0}/{DIGITAL_MODULES.length} modules
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Denied</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {govTabs.length > 0 ? (
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {govTabs.map(gt => (
                            <span key={gt} className="px-1.5 py-0.2 bg-indigo-950/70 text-indigo-300 rounded capitalize">
                              {gt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        !isSuspended ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      {isSuperAdmin && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="Configure Department Access & Permissions"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                              isSuspended ? 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50' : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                            }`}
                            title={isSuspended ? 'Activate Login Access' : 'Suspend Login Access'}
                          >
                            {isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(u);
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 transition"
                              title="Permanently Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure User & Granular RBAC Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    {selectedUser ? `Configure RBAC: ${selectedUser.name}` : 'Create New Software User Account'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Approve specific departments, individual modules, actions, and governance tabs.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">User Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Login Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              {/* Password Configuration */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-indigo-900/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      {selectedUser ? 'Set / Reset Account Password' : 'Account Login Password *'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {selectedUser
                        ? selectedUser.hasPassword
                          ? 'Password is already configured. Leave blank to keep existing password, or enter a new one to reset it.'
                          : 'No password set yet. Enter a password below so this user can log in with their email & password.'
                        : 'Required (min. 8 characters). This user will sign in privately to their own account using this email & password.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-[11px] font-semibold flex items-center gap-1 transition"
                  >
                    <Wand2 className="w-3 h-3" />
                    Generate Strong Password
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {selectedUser ? 'New Password (optional)' : 'Password * (min 8 chars)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!selectedUser}
                        minLength={selectedUser && !passwordInput ? undefined : 8}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={selectedUser ? 'Leave blank to keep current' : 'Enter login password'}
                        autoComplete="new-password"
                        className="w-full px-3 py-2 pr-9 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {selectedUser ? 'Confirm New Password' : 'Confirm Password *'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!selectedUser || passwordInput.length > 0}
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Role & Permission Preset *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="Super Admin">Super Admin (Full Access)</option>
                    <option value="Campaign Manager">Campaign Manager</option>
                    <option value="Finance & Approver">Finance & Approver</option>
                    <option value="Content Coordinator">Content Coordinator</option>
                    <option value="Video Editor">Video Editor</option>
                    <option value="Anchor & Presenter">Anchor & Presenter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Login Access Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="Active">Active Login Access</option>
                    <option value="Suspended">Suspended / Revoked Access</option>
                  </select>
                </div>
              </div>

              {formData.role === 'Super Admin' && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/50 text-xs text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    <strong>Super Admin</strong> automatically receives full access to both departments and all governance tools. To restrict a user to only one department, choose another role.
                  </span>
                </div>
              )}

              {/* Roster Profile Linkage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Link to Operational Editor Profile</label>
                  <select
                    value={formData.editorId || ''}
                    onChange={(e) => setFormData({ ...formData, editorId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">-- None (Not an Editor) --</option>
                    {editorProfiles.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.name} ({ep.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Link to Operational Anchor Profile</label>
                  <select
                    value={formData.anchorId || ''}
                    onChange={(e) => setFormData({ ...formData, anchorId: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="">-- None (Not an Anchor) --</option>
                    {anchorProfiles.map(ap => (
                      <option key={ap.id} value={ap.id}>{ap.name} ({ap.id})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Access Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Authorized Department Access Toggles
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    formData.departments?.includes('influencer')
                      ? 'bg-violet-950/40 border-violet-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={formData.role === 'Super Admin'}
                      checked={Boolean(formData.departments?.includes('influencer'))}
                      onChange={() => handleToggleDepartment('influencer')}
                      className="rounded border-slate-700 text-violet-600 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-bold">Influencer Campaigns</p>
                      <p className="text-[10px] text-slate-400">Workbook 1 & Modules</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    formData.departments?.includes('digital')
                      ? 'bg-teal-950/40 border-teal-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="checkbox"
                      disabled={formData.role === 'Super Admin'}
                      checked={Boolean(formData.departments?.includes('digital'))}
                      onChange={() => handleToggleDepartment('digital')}
                      className="rounded border-slate-700 text-teal-600 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-bold">Digital Data Management</p>
                      <p className="text-[10px] text-slate-400">Workbook 2 & Modules</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Granular Feature & Module Permissions Matrix */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Approved Modules, Actions & Sensitive-Field Permissions
                </h4>

                {/* Influencer Granular Matrix */}
                {formData.departments?.includes('influencer') && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-violet-900/50 space-y-3">
                    <h5 className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                      <FolderKanban className="w-4 h-4" /> Influencer Campaign Management
                    </h5>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Approved Sidebar Modules</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {INFLUENCER_MODULES.map(mod => (
                          <label key={mod.id} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={formData.role === 'Super Admin'}
                              checked={Boolean(formData.permissions?.influencer?.allowedTabs?.includes(mod.id))}
                              onChange={() => handleToggleModuleTab('influencer', mod.id)}
                              className="rounded border-slate-700 text-violet-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-200">{mod.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Action Permissions</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {[
                          { key: 'canView', label: 'View Records' },
                          { key: 'canCreate', label: 'Create New' },
                          { key: 'canEdit', label: 'Edit Records' },
                          { key: 'canApprove', label: 'Financial Approvals' },
                          { key: 'canDelete', label: 'Delete / Archive' },
                          { key: 'canExport', label: 'Export Data' },
                          { key: 'viewSensitiveFields', label: 'View Banking/PAN' },
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={formData.role === 'Super Admin'}
                              checked={Boolean(formData.permissions?.influencer?.[item.key as keyof DepartmentPermissions])}
                              onChange={() => handleTogglePerm('influencer', item.key as keyof DepartmentPermissions)}
                              className="rounded border-slate-700 text-violet-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-200">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Digital Data Granular Matrix */}
                {formData.departments?.includes('digital') && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-teal-900/50 space-y-3">
                    <h5 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <Building className="w-4 h-4" /> Digital Data Management
                    </h5>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Approved Sidebar Modules</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {DIGITAL_MODULES.map(mod => (
                          <label key={mod.id} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={formData.role === 'Super Admin'}
                              checked={Boolean(formData.permissions?.digital?.allowedTabs?.includes(mod.id))}
                              onChange={() => handleToggleModuleTab('digital', mod.id)}
                              className="rounded border-slate-700 text-teal-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-200">{mod.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Action Permissions</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {[
                          { key: 'canView', label: 'View Studio Data' },
                          { key: 'canCreate', label: 'Create Content/Tasks' },
                          { key: 'canEdit', label: 'Edit Content/Schedules' },
                          { key: 'canApprove', label: 'Manager Approvals' },
                          { key: 'canDelete', label: 'Delete / Archive' },
                          { key: 'canExport', label: 'Export Data' },
                          { key: 'viewSensitiveFields', label: 'View Sensitive Metrics' },
                        ].map(item => (
                          <label key={item.key} className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={formData.role === 'Super Admin'}
                              checked={Boolean(formData.permissions?.digital?.[item.key as keyof DepartmentPermissions])}
                              onChange={() => handleTogglePerm('digital', item.key as keyof DepartmentPermissions)}
                              className="rounded border-slate-700 text-teal-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-200">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Governance Modules (Denied by Default) */}
                <div className="p-4 bg-slate-950 rounded-xl border border-indigo-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Data Governance & Sync Tools
                    </h5>
                    <span className="text-[10px] text-slate-500">Denied by default</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {GOVERNANCE_MODULES.map(mod => {
                      const isUsersModule = mod.id === 'users';
                      const disabled = formData.role === 'Super Admin' || isUsersModule;
                      const checked = formData.role === 'Super Admin'
                        ? true
                        : (!isUsersModule && Boolean(formData.governanceTabs?.includes(mod.id)));
                      return (
                        <label
                          key={mod.id}
                          className={`flex items-center justify-between gap-2 p-2 bg-slate-900 rounded-lg border border-slate-800 ${
                            disabled && formData.role !== 'Super Admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={() => !isUsersModule && handleToggleGovernanceTab(mod.id)}
                              className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                            />
                            <span className="text-[11px] text-slate-200">{mod.label}</span>
                          </div>
                          {isUsersModule && formData.role !== 'Super Admin' && (
                            <span className="text-[9px] uppercase font-bold text-amber-400">Admin Only</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition disabled:opacity-50"
                >
                  {isSavingUser ? 'Saving...' : 'Save Account & Enforce Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User Account"
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.email})` : ''}
        sheetNote="This permanently revokes login access and removes this user account from RBAC User Administration."
        errorMessage={deleteError}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteUser}
      />
    </div>
  );
};
