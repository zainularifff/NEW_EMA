function RoleContent({
  roles,
  loading,
  error,
  search,
  onSearchChange,
  onReload,
  onAdd,
  onEdit,
  onDelete
}: {
  roles: AccessRole[];
  loading: boolean;
  error: string;
  search: string;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => getSettingsRolePageSize());

  useEffect(() => {
    const syncPageSize = () => setPageSize(getSettingsRolePageSize());
    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  const filterTerm = String(search || "").toLowerCase();

  const filteredRoles = roles.filter((role) => {
    const haystack = `${role.name} ${role.description} ${role.status} ${role.approvalRequired ? "approval required" : "standard"}`.toLowerCase();
    return !filterTerm || haystack.includes(filterTerm);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRoles = filteredRoles.slice(pageStartIndex, pageStartIndex + pageSize);
  const showingFrom = filteredRoles.length ? pageStartIndex + 1 : 0;
  const showingTo = Math.min(pageStartIndex + paginatedRoles.length, filteredRoles.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roles.length]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getActualIndex = (role: AccessRole) => {
    const roleId = role.id || role.roleID;

    if (roleId !== undefined && roleId !== null) {
      const byId = roles.findIndex((item) => String(item.id || item.roleID) === String(roleId));
      if (byId >= 0) return byId;
    }

    return roles.indexOf(role);
  };

  return (
    <div className="ema-role-content">
      <div className="ema-role-toolbar">
        <div className="ema-role-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search roles by name or description..."
            aria-label="Search roles"
          />
        </div>

        <div className="ema-role-toolbar-actions">
          <button className="ema-role-toolbar-btn" type="button" onClick={onReload} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>

          <button className="ema-role-toolbar-btn primary" type="button" onClick={onAdd}>
            + Add Role
          </button>
        </div>
      </div>

      {error ? (
        <div className="ema-role-error">
          <strong>Role load error</strong>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="ema-role-table-card">
        <div className="ema-role-table-head">
          <div>No</div>
          <div>Role</div>
          <div>Approval</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {loading ? <div className="ema-role-empty">Loading role records from EMA_Roles.</div> : null}
        {!loading && filteredRoles.length === 0 ? <div className="ema-role-empty">No role records found.</div> : null}

        {!loading && paginatedRoles.map((role, index) => {
          const actualIndex = getActualIndex(role);
          const isInactive = role.status === "Inactive";
          const approvalClass = role.approvalRequired ? "required" : "standard";

          return (
            <div className={isInactive ? "ema-role-row is-inactive" : "ema-role-row"} key={`${role.id || role.roleID || role.roleKey}-${actualIndex}`}>
              <div>
                <span className="ema-role-index">{String(pageStartIndex + index + 1).padStart(2, "0")}</span>
              </div>

              <div>
                <div className="ema-role-main">
                  <span className="ema-role-icon">
                    <SettingsRoleIcon role={role} />
                  </span>

                  <div className="ema-role-text">
                    <strong className="ema-role-name">{role.name}</strong>
                    <small className="ema-role-desc">{role.description || "No description set"}</small>
                  </div>
                </div>
              </div>

              <div>
                <span className={`ema-role-chip ${approvalClass}`}>
                  {role.approvalRequired ? "Required" : "Standard"}
                </span>
              </div>

              <div>
                <span className={isInactive ? "ema-role-status is-inactive" : "ema-role-status"}>
                  <span className="ema-role-dot" />
                  {isInactive ? "Inactive" : "Active"}
                </span>
              </div>

              <div>
                <div className="ema-role-actions">
                  <button className="ema-role-action-btn" type="button" title="Edit role" aria-label="Edit role" onClick={() => onEdit(actualIndex)}>
                    <PencilSvg />
                  </button>

                  <button
                    className="ema-role-action-btn danger"
                    type="button"
                    title={isProtectedSuperAdminRole(role) ? "Super Admin is protected and cannot be deleted" : "Delete role"}
                    aria-label={isProtectedSuperAdminRole(role) ? "Super Admin is protected and cannot be deleted" : "Delete role"}
                    onClick={() => onDelete(actualIndex)}
                    disabled={isProtectedSuperAdminRole(role)}
                  >
                    <TrashSvg />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ema-role-pagination">
        <span>Showing {showingFrom} to {showingTo} of {filteredRoles.length} roles</span>

        <div className="ema-role-page-controls">
          <button className="ema-role-page-btn" type="button" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage <= 1} aria-label="First page">
            <EmaPageFirstIcon />
          </button>
          <button className="ema-role-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1} aria-label="Previous page">
            <EmaPagePrevIcon />
          </button>
          <button className="ema-role-page-btn is-active" type="button" aria-label="Current page">
            {safeCurrentPage}
          </button>
          <button className="ema-role-page-btn" type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage >= totalPages} aria-label="Next page">
            <EmaPageNextIcon />
          </button>
          <button className="ema-role-page-btn" type="button" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage >= totalPages} aria-label="Last page">
            <EmaPageLastIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
