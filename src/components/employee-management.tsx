"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type EmployeeRole = "EMPLOYEE" | "ADMIN" | "OWNER";
type EmploymentType = "FULL_TIME" | "PART_TIME" | "SUPPORT" | "OTHER";

type BranchOption = {
  id: string;
  name: string;
};

export type EmployeeManagementRow = {
  id: string;
  fullName: string;
  email: string;
  employeeCode: string;
  role: EmployeeRole;
  employmentType: EmploymentType;
  defaultBranchId: string;
  defaultBranchName: string;
  phone: string;
  isActive: boolean;
  isCurrentUser: boolean;
};

type EmployeeManagementProps = {
  branches: BranchOption[];
  employees: EmployeeManagementRow[];
};

export function EmployeeManagement({ branches, employees }: EmployeeManagementProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  useEffect(() => {
    if (!selectedEmployee) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEmployeeId(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedEmployee]);

  return (
    <>
      <section>
        <div className="section-title">
          <h2>Daftar Karyawan</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Tipe</th>
                <th>Cabang</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td data-label="Nama">{employee.fullName}</td>
                  <td data-label="Email">{employee.email}</td>
                  <td data-label="Tipe">{titleCaseEnum(employee.employmentType)}</td>
                  <td data-label="Cabang">{employee.defaultBranchName || "-"}</td>
                  <td data-label="Status">
                    <span className={`status ${employee.isActive ? "good" : "bad"}`}>
                      {employee.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td data-label="Aksi">
                    <button className="button secondary action-trigger" type="button" onClick={() => setSelectedEmployeeId(employee.id)}>
                      Kelola
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedEmployee ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedEmployeeId(null)}>
          <section
            className="modal employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-head">
              <div>
                <h2 id="employee-modal-title">Kelola Karyawan</h2>
                <p>{selectedEmployee.fullName}</p>
              </div>
              <button className="button secondary modal-close" type="button" onClick={() => setSelectedEmployeeId(null)} aria-label="Tutup modal">
                <X />
              </button>
            </header>

            <div className="modal-body">
              <form className="form-grid" action="/api/employees" method="post">
                <input type="hidden" name="action" value="update" />
                <input type="hidden" name="employeeId" value={selectedEmployee.id} />
                <section className="grid three">
                  <label className="field">
                    <span>Nama</span>
                    <input name="fullName" defaultValue={selectedEmployee.fullName} required />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input name="email" type="email" defaultValue={selectedEmployee.email} required />
                  </label>
                  <label className="field">
                    <span>Kode</span>
                    <input name="employeeCode" defaultValue={selectedEmployee.employeeCode} required />
                  </label>
                  <label className="field">
                    <span>Role akses</span>
                    <select name="role" defaultValue={selectedEmployee.role}>
                      <option value="EMPLOYEE">Employee</option>
                      <option value="ADMIN">Admin</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Tipe karyawan</span>
                    <select name="employmentType" defaultValue={selectedEmployee.employmentType}>
                      <option value="FULL_TIME">Full time</option>
                      <option value="PART_TIME">Part time</option>
                      <option value="SUPPORT">Support</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Cabang</span>
                    <select name="branchId" defaultValue={selectedEmployee.defaultBranchId}>
                      <option value="">Tanpa cabang</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>No. HP</span>
                    <input name="phone" defaultValue={selectedEmployee.phone} />
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select name="isActive" defaultValue={String(selectedEmployee.isActive)}>
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </label>
                </section>
                <button className="button" type="submit">
                  Simpan Perubahan
                </button>
              </form>

              <section className="modal-split">
                <form className="modal-panel" action="/api/employees" method="post">
                  <h3>Reset Password</h3>
                  <input type="hidden" name="action" value="reset-password" />
                  <input type="hidden" name="employeeId" value={selectedEmployee.id} />
                  <label className="field">
                    <span>Password baru</span>
                    <input name="password" type="text" defaultValue="bimba123" required />
                  </label>
                  <button className="button secondary" type="submit">
                    Reset Password
                  </button>
                </form>

                <form className="modal-panel" action="/api/employees" method="post">
                  <h3>Hapus Karyawan</h3>
                  <input type="hidden" name="action" value="delete" />
                  <input type="hidden" name="employeeId" value={selectedEmployee.id} />
                  <p>
                    Karyawan akan dinonaktifkan agar riwayat absensi dan payroll lama tetap aman.
                  </p>
                  <button className="button danger" type="submit" disabled={selectedEmployee.isCurrentUser}>
                    Hapus / Nonaktifkan
                  </button>
                </form>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function titleCaseEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
