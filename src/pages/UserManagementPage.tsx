import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { Plus, RotateCcw, Ban } from 'lucide-react';
import { toast } from 'sonner';

const UserManagementPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'advisor' as string,
    department: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      toast.error('Please fill all required fields.');
      return;
    }
    const { error } = await supabase.from('app_users').insert({
      user_id: crypto.randomUUID(),
      username: newUser.username,
      password_hash: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      department: newUser.department || null,
      status: 'active',
      must_change_password: true,
    });
    if (error) {
      toast.error('Failed to create user: ' + error.message);
      return;
    }
    toast.success('User created successfully.');
    setDialogOpen(false);
    setNewUser({ username: '', password: '', full_name: '', role: 'advisor', department: '' });
    loadUsers();
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await supabase.from('app_users').update({ status: newStatus }).eq('user_id', userId);
    toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
    loadUsers();
  };

  const resetPassword = async (userId: string) => {
    await supabase.from('app_users').update({ password_hash: 'Reset@123', must_change_password: true }).eq('user_id', userId);
    toast.success('Password reset to Reset@123. User must change on next login.');
    loadUsers();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage system users</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-xs">{u.role?.replace('_', ' ')}</Badge></TableCell>
                    <TableCell>{u.department || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => resetPassword(u.user_id)} title="Reset Password">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(u.user_id, u.status)} title="Toggle Status">
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="department_chair">Department Chair</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} placeholder="e.g. Marketing, Finance..." />
              </div>
              <Button onClick={createUser} className="w-full">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UserManagementPage;
