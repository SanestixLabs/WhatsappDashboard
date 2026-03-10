import React, { useEffect, useState } from 'react';
import { useTeamStore } from '../store';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  agent: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-600',
};
const STATUS_COLORS = {
  online: 'bg-green-400',
  away: 'bg-yellow-400',
  offline: 'bg-gray-400',
};

export default function TeamPage() {
  const { team, queue, loading, fetchTeam, fetchQueue, inviteMember, changeRole, deactivateMember, claimConversation, assignConversation } = useTeamStore();
  const { user } = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => { fetchTeam(); fetchQueue(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await inviteMember(inviteEmail, inviteRole);
      setInviteLink(res.inviteUrl);
      toast.success('Invite created!');
      setInviteEmail('');
    } catch (err) { toast.error(err.response?.data?.error || 'Invite failed'); }
    setInviting(false);
  };

  const handleRoleChange = async (userId, role) => {
    try { await changeRole(userId, role); toast.success('Role updated'); }
    catch { toast.error('Failed to update role'); }
  };

  const handleDeactivate = async (userId, name) => {
    if (!window.confirm(`Deactivate ${name}?`)) return;
    try { await deactivateMember(userId); toast.success('User deactivated'); }
    catch { toast.error('Failed'); }
  };

  const handleClaim = async (convId) => {
    try { await claimConversation(convId); toast.success('Conversation claimed!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Already claimed'); }
  };

  const handleAssign = async (convId) => {
    const agents = team.filter(m => ['admin','agent'].includes(m.role) && m.is_active);
    const names = agents.map((a, i) => `${i+1}. ${a.name} (${a.role})`).join('\n');
    const pick = window.prompt(`Assign to agent:\n${names}\n\nEnter number:`);
    if (!pick) return;
    const agent = agents[parseInt(pick) - 1];
    if (!agent) return toast.error('Invalid selection');
    try { await assignConversation(convId, agent.id); toast.success(`Assigned to ${agent.name}`); }
    catch { toast.error('Assignment failed'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm mt-1">{team.length} members</p>
        </div>
        {['super_admin','admin'].includes(user?.role) && (
          <button onClick={() => setShowInvite(!showInvite)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            + Invite Member
          </button>
        )}
      </div>

      {showInvite && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">Send Invite</h3>
          <div className="flex gap-3 flex-wrap">
            <input type="email" placeholder="Email address" value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} disabled={inviting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {inviteLink && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Share this invite link:</p>
              <div className="flex gap-2 items-center">
                <code className="text-xs text-blue-700 flex-1 break-all">{inviteLink}</code>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Copy</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Team Members</h2>
        </div>
        {loading ? <div className="p-8 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                {user?.role === 'super_admin' && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{member.name}</td>
                  <td className="px-4 py-3 text-gray-500">{member.email}</td>
                  <td className="px-4 py-3">
                    {user?.role === 'super_admin' && member.id !== user.id ? (
                      <select value={member.role} onChange={e => handleRoleChange(member.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1">
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={"text-xs px-2 py-1 rounded-full font-medium " + (ROLE_COLORS[member.role] || '')}>
                        {member.role.replace("_"," ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={"w-2 h-2 rounded-full " + (STATUS_COLORS[member.status] || 'bg-gray-400')} />
                      <span className="text-gray-600 capitalize">{member.status}</span>
                    </div>
                  </td>
                  {user?.role === 'super_admin' && (
                    <td className="px-4 py-3">
                      {member.id !== user.id && (
                        <button onClick={() => handleDeactivate(member.id, member.name)}
                          className="text-xs text-red-500 hover:text-red-700">Deactivate</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">Conversation Queue</h2>
          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
            {queue.length} waiting
          </span>
        </div>
        {queue.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Queue is empty</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Waiting Since</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(conv => (
                <tr key={conv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{conv.contact_name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-gray-500">{conv.phone_number}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(conv.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {['super_admin','admin','agent'].includes(user?.role) && (
                        <button onClick={() => handleClaim(conv.id)}
                          className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Claim</button>
                      )}
                      {['super_admin','admin'].includes(user?.role) && (
                        <button onClick={() => handleAssign(conv.id)}
                          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Assign</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
