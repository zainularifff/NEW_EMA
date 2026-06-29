function AccessRoleModal({ open, mode, form, setForm, onClose, onSave }: { open: boolean; mode: string; form: AccessRole; setForm: (form: AccessRole) => void; onClose: () => void; onSave: () => void }) {
  if (!open) return null;

  const isAddMode = mode === "ADD ROLE";

  const modalNode = (
    <div className="ema-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ema-role-modal" role="dialog" aria-modal="true" aria-labelledby="roleModalTitle">
        <header className="ema-role-modal-header">
          <div>
            <span className="ema-role-modal-kicker">{mode}</span>
            <h3 id="roleModalTitle">{isAddMode ? "Add New Role" : "Update Role"}</h3>
            <p>Create or update role name, status and approval requirement for EMA_Roles.</p>
          </div>

          <button className="ema-role-modal-close" type="button" onClick={onClose} aria-label="Close role modal">
            ×
          </button>
        </header>

        <div className="ema-role-modal-body">
          <div className="ema-role-form-grid">
            <label className="ema-role-field">
              <span>Role Name</span>
              <input
                placeholder="Example: L1 Support"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>

            <label className="ema-role-field">
              <span>Status</span>
              <select
                value={form.status === "Inactive" ? "Inactive" : "Active"}
                onChange={(event) => setForm({ ...form, status: event.target.value as RoleStatus })}
                aria-label="Role status"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            <label className="ema-role-field ema-role-field-full">
              <span>Description</span>
              <input
                placeholder="Describe this role"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>

            <label className="ema-role-check ema-role-field-full">
              <input
                type="checkbox"
                checked={Boolean(form.approvalRequired)}
                onChange={(event) => setForm({ ...form, approvalRequired: event.target.checked })}
              />
              <span>
                <strong>Require approval</strong>
                <small>For sensitive actions</small>
              </span>
            </label>
          </div>
        </div>

        <footer className="ema-role-modal-footer">
          <button className="ema-role-toolbar-btn" type="button" onClick={onClose}>Cancel</button>
          <button className="ema-role-toolbar-btn primary" type="button" onClick={onSave}>Save Role</button>
        </footer>
      </section>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}
