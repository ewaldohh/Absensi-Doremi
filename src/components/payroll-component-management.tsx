"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatRupiah, titleCaseEnum } from "@/lib/format";

type PayrollComponentType = "EARNING" | "DEDUCTION";
type PayrollCalculationType = "FIXED" | "PER_DAY" | "PER_HOUR" | "PER_SESSION" | "FORMULA";

export type PayrollComponentManagementRow = {
  id: string;
  name: string;
  componentType: PayrollComponentType;
  calculationType: PayrollCalculationType;
  defaultAmount: number;
  isTaxable: boolean;
  isActive: boolean;
};

type PayrollComponentManagementProps = {
  components: PayrollComponentManagementRow[];
};

export function PayrollComponentManagement({ components }: PayrollComponentManagementProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const selectedComponent = useMemo(
    () => components.find((component) => component.id === selectedComponentId) ?? null,
    [components, selectedComponentId]
  );

  useEffect(() => {
    if (!selectedComponent) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedComponentId(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedComponent]);

  return (
    <>
      <section>
        <div className="section-title">
          <h2>Master Komponen</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tipe</th>
                <th>Kalkulasi</th>
                <th>Default</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {components.map((component) => (
                <tr key={component.id}>
                  <td data-label="Nama">{component.name}</td>
                  <td data-label="Tipe">{titleCaseEnum(component.componentType)}</td>
                  <td data-label="Kalkulasi">{titleCaseEnum(component.calculationType)}</td>
                  <td data-label="Default">{formatRupiah(component.defaultAmount)}</td>
                  <td data-label="Status">
                    <span className={`status ${component.isActive ? "good" : "bad"}`}>
                      {component.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td data-label="Aksi">
                    <button className="button secondary action-trigger" type="button" onClick={() => setSelectedComponentId(component.id)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {components.length === 0 ? (
                <tr>
                  <td colSpan={6}>Belum ada komponen payroll.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {selectedComponent ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedComponentId(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="component-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-head">
              <div>
                <h2 id="component-modal-title">Edit Komponen</h2>
                <p>{selectedComponent.name}</p>
              </div>
              <button className="button secondary modal-close" type="button" onClick={() => setSelectedComponentId(null)} aria-label="Tutup modal">
                <X />
              </button>
            </header>

            <div className="modal-body">
              <form className="form-grid" action="/api/payroll-components" method="post">
                <input type="hidden" name="action" value="update-component" />
                <input type="hidden" name="componentId" value={selectedComponent.id} />
                <section className="grid three">
                  <label className="field">
                    <span>Nama</span>
                    <input name="name" defaultValue={selectedComponent.name} required />
                  </label>
                  <label className="field">
                    <span>Tipe</span>
                    <select name="componentType" defaultValue={selectedComponent.componentType}>
                      <option value="EARNING">Earning</option>
                      <option value="DEDUCTION">Deduction</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Kalkulasi</span>
                    <select name="calculationType" defaultValue={selectedComponent.calculationType}>
                      <option value="FIXED">Fixed</option>
                      <option value="PER_DAY">Per day</option>
                      <option value="PER_HOUR">Per hour</option>
                      <option value="PER_SESSION">Per session</option>
                      <option value="FORMULA">Formula</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Nominal default</span>
                    <input name="defaultAmount" type="number" defaultValue={selectedComponent.defaultAmount} required />
                  </label>
                  <label className="field">
                    <span>Pajak</span>
                    <select name="isTaxable" defaultValue={String(selectedComponent.isTaxable)}>
                      <option value="false">Tidak kena pajak</option>
                      <option value="true">Kena pajak</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select name="isActive" defaultValue={String(selectedComponent.isActive)}>
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </label>
                </section>
                <button className="button" type="submit">
                  Simpan Perubahan
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
