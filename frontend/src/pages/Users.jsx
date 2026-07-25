import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { UserPlus, Trash2, Shield } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { email:"", name:"", role:"analyst", password:"", designation:"", unit:"", district:"", phone:"" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [creating, setCreating] = useState(false);

  const load = () => api.get("/users").then(({data}) => setUsers(data));
  useEffect(load, []);

  const create = async () => {
    if (!form.email || !form.name || !form.password) return toast.error("Fill required fields");
    setCreating(true);
    try {
      await api.post("/users", form);
      toast.success("User created");
      setForm(EMPTY); load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setCreating(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete this user?")) return;
    try { await api.delete(`/users/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="space-y-5" data-testid="users-page">
      <div>
        <div className="label-eyebrow text-[#00E5FF]">Users & Roles</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Access management</h1>
      </div>

      <div className="glass p-5">
        <div className="label-eyebrow mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-[#00E5FF]"/>Create new user</div>
        <div className="grid md:grid-cols-4 gap-3">
          <input className="input-dark" placeholder="Full name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} data-testid="user-form-name"/>
          <input className="input-dark" placeholder="Email" type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} data-testid="user-form-email"/>
          <input className="input-dark" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} data-testid="user-form-password"/>
          <select className="input-dark" value={form.role} onChange={e=>setForm({...form, role:e.target.value})} data-testid="user-form-role">
            <option value="admin">Administrator</option>
            <option value="analyst">Crime Analyst</option>
            <option value="supervisor">Supervisor</option>
          </select>
          <input className="input-dark" placeholder="Designation" value={form.designation} onChange={e=>setForm({...form, designation:e.target.value})}/>
          <input className="input-dark" placeholder="Unit" value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})}/>
          <input className="input-dark" placeholder="District" value={form.district} onChange={e=>setForm({...form, district:e.target.value})}/>
          <input className="input-dark" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
        </div>
        <div className="mt-3"><button className="btn-primary" onClick={create} disabled={creating} data-testid="user-form-submit">{creating?"Creating…":"Create user"}</button></div>
      </div>

      <div className="glass p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-3 text-left label-eyebrow">User</th>
              <th className="p-3 text-left label-eyebrow">Role</th>
              <th className="p-3 text-left label-eyebrow">Designation · Unit</th>
              <th className="p-3 text-left label-eyebrow">District</th>
              <th className="p-3 text-left label-eyebrow">Last login</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5" data-testid={`user-row-${u.email}`}>
                <td className="p-3">
                  <div className="text-slate-100 font-medium">{u.name}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-[#00E5FF]/30 bg-[#00E5FF]/10 text-[#00E5FF]">
                    <Shield className="w-3 h-3" /> {u.role}
                  </span>
                </td>
                <td className="p-3 text-xs text-slate-300">{u.designation} · {u.unit}</td>
                <td className="p-3 text-xs text-slate-300">{u.district}</td>
                <td className="p-3 text-xs text-slate-400 font-mono">{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</td>
                <td className="p-3 text-right">
                  <button onClick={()=>remove(u.id)} className="text-red-400 hover:text-red-300" data-testid={`delete-user-${u.email}`}><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
