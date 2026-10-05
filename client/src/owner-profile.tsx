import { useEffect, useState } from "react";
import { api, uploadAvatar, type User } from "./api.js";

function Avatar({ user, size = "normal" }: { user: Partial<User>; size?: "normal" | "large" }) {
  return (
    <span className={`avatar ${size}`}>
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <b>{user.name?.slice(0, 1).toUpperCase() || "?"}</b>}
    </span>
  );
}

export function OwnerProfilePage({
  token,
  user,
  setUser,
  back,
}: {
  token: string;
  user: User;
  setUser: (value: User) => void;
  back: () => void;
}) {
  const [profile, setProfile] = useState<User | null>(null);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [editingOwner, setEditingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ name: "", email: "", mobile: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [cashierModal, setCashierModal] = useState<{ mode: "add" | "edit"; cashier?: User } | null>(null);
  const [cashierForm, setCashierForm] = useState({ name: "", mobile: "", password: "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [owner, team] = await Promise.all([api("/accounts/profile", {}, token), api("/accounts/cashiers", {}, token)]);
    setProfile(owner);
    setCashiers(team);
    setOwnerForm({ name: owner.name, email: owner.email, mobile: owner.mobile ?? "" });
  };

  useEffect(() => {
    load().catch((err) => setError((err as Error).message));
  }, []);

  function persistUser(next: User) {
    setUser(next);
    localStorage.user = JSON.stringify(next);
  }

  async function saveOwner(event: React.FormEvent) {
    event.preventDefault();
    try {
      const updated = await api("/accounts/profile", { method: "PUT", body: JSON.stringify(ownerForm) }, token);
      setProfile(updated);
      persistUser({ ...user, name: updated.name, email: updated.email, mobile: updated.mobile });
      setEditingOwner(false);
      setMessage("Profile updated.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function ownerPhoto(file: File) {
    try {
      const updated = await uploadAvatar(token, file);
      setProfile(updated);
      persistUser({ ...user, avatarUrl: updated.avatarUrl });
      setMessage("Profile photo updated.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    try {
      await api("/accounts/profile/password", { method: "POST", body: JSON.stringify(passwords) }, token);
      setPasswords({ currentPassword: "", newPassword: "" });
      setShowPassword(false);
      setMessage("Password changed.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openCashier(mode: "add" | "edit", cashier?: User) {
    setCashierModal({ mode, cashier });
    setCashierForm(cashier ? { name: cashier.name, mobile: cashier.mobile ?? "", password: "" } : { name: "", mobile: "", password: "" });
    setPhoto(null);
    setMenuOpen(null);
  }

  async function saveCashier(event: React.FormEvent) {
    event.preventDefault();
    try {
      const body: Record<string, string> = { name: cashierForm.name, mobile: cashierForm.mobile };
      if (cashierForm.password.trim()) body.password = cashierForm.password;
      const saved =
        cashierModal?.mode === "edit" && cashierModal.cashier
          ? await api(`/accounts/cashiers/${cashierModal.cashier.id}`, { method: "PUT", body: JSON.stringify(body) }, token)
          : await api("/accounts/cashiers", { method: "POST", body: JSON.stringify({ ...body, password: cashierForm.password }) }, token);
      const updated = photo ? await uploadAvatar(token, photo, saved.id) : saved;
      setCashiers(
        cashierModal?.mode === "edit"
          ? cashiers.map((current) => (current.id === updated.id ? updated : current))
          : [updated, ...cashiers]
      );
      setCashierModal(null);
      setMessage(cashierModal?.mode === "edit" ? "Cashier updated." : "Cashier added.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleCashier(cashier: User) {
    try {
      const updated = await api(`/accounts/cashiers/${cashier.id}/status`, { method: "PATCH", body: JSON.stringify({ isActive: !cashier.isActive }) }, token);
      setCashiers(cashiers.map((current) => (current.id === updated.id ? updated : current)));
      setMenuOpen(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deleteCashier(cashier: User) {
    if (!window.confirm(`Delete ${cashier.name}?`)) return;
    try {
      await api(`/accounts/cashiers/${cashier.id}`, { method: "DELETE" }, token);
      setCashiers(cashiers.filter((current) => current.id !== cashier.id));
      setMenuOpen(null);
      setMessage("Cashier deleted.");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function changeCashierPassword(cashier: User) {
    const password = window.prompt(`New password for ${cashier.name} (minimum 8 characters)`);
    if (!password) return;
    try {
      await api(`/accounts/cashiers/${cashier.id}/password`, { method: "POST", body: JSON.stringify({ password }) }, token);
      setMenuOpen(null);
      setMessage(`Password updated for ${cashier.name}.`);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!profile) {
    return (
      <main className="profile-page">
        <p>Loading profile…</p>
      </main>
    );
  }

  return (
    <main className="profile-page">
      <header>
        <div>
          <h1>Profile</h1>
          <p>Manage your account and team</p>
        </div>
        <button type="button" onClick={back}>
          ← Back to Billing
        </button>
      </header>

      <div className="profile-layout profile-reference-layout">
        <div className="owner-profile-card owner-reference-card">
          <section className="owner-hero owner-reference-hero">
            <div className="hero-avatar-wrap">
              <Avatar user={profile} size="large" />
              <label className="hero-photo-edit" title="Change photo">
                📷
                <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) ownerPhoto(file); }} />
              </label>
            </div>
            <div className="hero-copy">
              <h2>
                {profile.name} <small className="role-pill">Owner</small>
              </h2>
              <p>Owner · Cafe POS</p>
              <p className="tagline">Good Food · Better Vibes</p>
            </div>
            <button type="button" className="edit-profile-btn" onClick={() => setEditingOwner(true)}>
              ✎ Edit Profile
            </button>
          </section>

          <div className="owner-read-details">
            <p>
              <i>☎</i>
              <span>
                Mobile Number
                <b>{profile.mobile || "Not added"}</b>
              </span>
            </p>
            <p>
              <i>✉</i>
              <span>
                Email Address
                <b>{profile.email}</b>
              </span>
            </p>
          </div>

          <section className="account-details">
            <h2>▣ Account Details</h2>
            <p>
              <span>User ID</span>
              <b>{profile.id.slice(0, 8)}</b>
            </p>
            <p>
              <span>Role</span>
              <b>Owner</b>
            </p>
            <p>
              <span>Account Created</span>
              <b>{profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "—"}</b>
            </p>
          </section>

          <section className="security-row password-card">
            <h2>▣ Security</h2>
            <button type="button" className="security-link" onClick={() => setShowPassword((open) => !open)}>
              Change Password ›
            </button>
            {showPassword && (
              <form onSubmit={savePassword}>
                <label>
                  Current password
                  <input required type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
                </label>
                <label>
                  New password
                  <input required minLength={8} type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
                </label>
                <button type="submit">Save password</button>
              </form>
            )}
          </section>
        </div>

        <section className="cashier-management cashier-reference-card">
          <div className="cashier-title">
            <div>
              <h2>♟ Cashiers Management</h2>
              <p>Add, manage and control your cashier accounts</p>
            </div>
            <button type="button" onClick={() => openCashier("add")}>
              ＋ Add Cashier
            </button>
          </div>

          <div className="cashier-list">
            {cashiers.map((cashier) => (
              <article className="cashier-row cashier-reference-row" key={cashier.id}>
                <Avatar user={cashier} />
                <div>
                  <b>{cashier.name}</b>
                  <small>{cashier.mobile}</small>
                  <small>Cashier</small>
                </div>
                <span className={cashier.isActive !== false ? "account-status active" : "account-status"}>
                  {cashier.isActive !== false ? "Active" : "Blocked"}
                </span>
                <button
                  type="button"
                  className={cashier.isActive !== false ? "switch on" : "switch"}
                  onClick={() => toggleCashier(cashier)}
                  aria-label={cashier.isActive !== false ? `Block ${cashier.name}` : `Activate ${cashier.name}`}
                >
                  <i />
                </button>
                <div className="cashier-menu">
                  <button type="button" className="cashier-menu-trigger" onClick={() => setMenuOpen(menuOpen === cashier.id ? null : cashier.id)} aria-label="Cashier actions">
                    ⋮
                  </button>
                  {menuOpen === cashier.id && (
                    <div className="cashier-menu-panel">
                      <button type="button" onClick={() => openCashier("edit", cashier)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => changeCashierPassword(cashier)}>
                        Change password
                      </button>
                      <button type="button" onClick={() => toggleCashier(cashier)}>
                        {cashier.isActive !== false ? "Block" : "Activate"}
                      </button>
                      <button type="button" className="danger" onClick={() => deleteCashier(cashier)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
            {!cashiers.length && <p className="empty-menu">No cashiers added yet.</p>}
          </div>

          <p className="owner-note">◉ Only the owner can upload photos for cashiers. Cashier photos can be updated from the owner&apos;s account.</p>
        </section>
      </div>

      {editingOwner && (
        <div className="modal-backdrop">
          <form className="bill-editor profile-edit-form" onSubmit={saveOwner}>
            <h2>Edit Profile</h2>
            <label>
              Name
              <input required value={ownerForm.name} onChange={(event) => setOwnerForm({ ...ownerForm, name: event.target.value })} />
            </label>
            <label>
              Email
              <input required type="email" value={ownerForm.email} onChange={(event) => setOwnerForm({ ...ownerForm, email: event.target.value })} />
            </label>
            <label>
              Mobile number
              <input required value={ownerForm.mobile} onChange={(event) => setOwnerForm({ ...ownerForm, mobile: event.target.value })} />
            </label>
            <div className="editor-actions">
              <button type="button" onClick={() => setEditingOwner(false)}>
                Cancel
              </button>
              <button type="submit">Save changes</button>
            </div>
          </form>
        </div>
      )}

      {cashierModal && (
        <div className="modal-backdrop">
          <form className="bill-editor profile-edit-form" onSubmit={saveCashier}>
            <h2>{cashierModal.mode === "edit" ? "Edit Cashier" : "Add Cashier"}</h2>
            <label>
              Name
              <input required value={cashierForm.name} onChange={(event) => setCashierForm({ ...cashierForm, name: event.target.value })} />
            </label>
            <label>
              Mobile number
              <input required value={cashierForm.mobile} onChange={(event) => setCashierForm({ ...cashierForm, mobile: event.target.value })} />
            </label>
            <label>
              Password {cashierModal.mode === "edit" && <small>(leave empty to keep current)</small>}
              <input required={cashierModal.mode === "add"} minLength={8} type="password" value={cashierForm.password} onChange={(event) => setCashierForm({ ...cashierForm, password: event.target.value })} />
            </label>
            <label>
              Profile photo
              <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
            </label>
            <div className="editor-actions">
              <button type="button" onClick={() => setCashierModal(null)}>
                Cancel
              </button>
              <button type="submit">{cashierModal.mode === "edit" ? "Save cashier" : "Create cashier"}</button>
            </div>
          </form>
        </div>
      )}

      {message && <p className="success profile-toast">{message}</p>}
      {error && <p className="error profile-toast">{error}</p>}
    </main>
  );
}

export { Avatar };
