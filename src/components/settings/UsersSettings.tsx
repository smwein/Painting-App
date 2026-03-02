import { useState, useEffect } from 'react';
import { useAuthStore, type UserRecord, type UserRole } from '../../store/authStore';

export function UsersSettings() {
  const { user: currentUser, fetchAllUsers, updateUserRole } = useAuthStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // uid being saved
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, [fetchAllUsers]);

  async function handleRoleChange(uid: string, newRole: UserRole) {
    setSaving(uid);
    setError(null);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
    } catch {
      setError('Failed to update role. Make sure you have admin permissions.');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 py-4">Loading users...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage roles for everyone who has signed in. Admins have full access including Settings.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => {
              const isYou = u.uid === currentUser?.uid;
              return (
                <tr key={u.uid} className="bg-white">
                  <td className="px-4 py-3 text-gray-800">
                    {u.email}
                    {isYou && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isYou ? (
                      // Prevent self-demotion — can't lock yourself out
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                        {u.role}
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        disabled={saving === u.uid}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {saving === u.uid && (
                      <span className="ml-2 text-xs text-gray-400">Saving...</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-sm text-gray-400">
                  No users found. Users appear here after their first sign-in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
