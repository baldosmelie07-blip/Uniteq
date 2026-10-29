import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  Edit,
  X,
  RefreshCw,
  Wallet,
  CheckCircle2,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const API = "https://uniteq-production-zsysbh.laravel.cloud/api/collections";

function getToken() {
  for (const key of [
    "uniteq_token",
    "token",
    "access_token",
    "auth_token",
  ]) {
    const value =
      localStorage.getItem(key) || sessionStorage.getItem(key);

    if (value && value !== "undefined" && value !== "null") {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  return "";
}

function headers() {
  const token = getToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  return [];
}

function normalizeCollection(item) {
  const activeValue = item.is_active ?? item.status ?? true;

  const isActive =
    typeof activeValue === "string"
      ? ["active", "1", "true", "yes"].includes(
          activeValue.toLowerCase()
        )
      : Boolean(activeValue);

  return {
    ...item,
    id: item.id,
    name:
      item.name ??
      item.collection_name ??
      item.title ??
      "",
    fixed_fee: Number(
      item.fixed_fee ?? item.fee ?? item.amount ?? 0
    ),
    description: item.description ?? "",
    is_active: isActive,
  };
}

function money(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

const EMPTY = {
  name: "",
  fixed_fee: "",
  description: "",
  is_active: true,
};

export default function Collections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API, {
        headers: headers(),
      });

      setItems(getRows(response.data).map(normalizeCollection));
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to load collections. Check your login, API routes, and Laravel server."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return items.filter((item) =>
      `${item.name} ${item.description}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(item) {
    setEditing(item);

    setForm({
      name: item.name || "",
      fixed_fee: String(item.fixed_fee ?? ""),
      description: item.description || "",
      is_active: item.is_active,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function changeForm(event) {
    const { name, value, type, checked } = event.target;

    setForm((old) => ({
      ...old,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function getErrorMessage(e) {
    const data = e.response?.data;

    if (data?.errors) {
      return Object.values(data.errors).flat().join("\n");
    }

    return (
      data?.message ||
      e.message ||
      "Unable to save collection. Please try again."
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!getToken()) {
      setError("Your login token is missing. Please log in again.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a collection name.");
      return;
    }

    if (
      form.fixed_fee === "" ||
      !Number.isFinite(Number(form.fixed_fee)) ||
      Number(form.fixed_fee) < 0
    ) {
      setError("Enter a valid fixed fee amount.");
      return;
    }

    setSaving(true);

    try {
      const fee = Number(Number(form.fixed_fee).toFixed(2));

      // IMPORTANT:
      // These field names match CollectionController.php.
      const payload = {
        name: form.name.trim(),
        fixed_fee: fee,
        description: form.description.trim() || null,
        status: form.is_active ? "active" : "inactive",
      };

      if (editing) {
        await axios.put(`${API}/${editing.id}`, payload, {
          headers: headers(),
        });

        setSuccess("Collection updated successfully.");
      } else {
        await axios.post(API, payload, {
          headers: headers(),
        });

        setSuccess("Collection created successfully.");
      }

      setShowForm(false);
      setEditing(null);
      setForm({ ...EMPTY });

      await loadItems();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: item.name,
        fixed_fee: Number(item.fixed_fee),
        description: item.description || null,
        status: item.is_active ? "inactive" : "active",
      };

      await axios.put(`${API}/${item.id}`, payload, {
        headers: headers(),
      });

      setSuccess(
        item.is_active
          ? "Collection deactivated successfully."
          : "Collection activated successfully."
      );

      await loadItems();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  const activeCount = items.filter(
    (item) => item.is_active
  ).length;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <header className="bg-[#102d55] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 px-6 py-7 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#102d55]">
              <Wallet size={30} />
            </div>

            <div>
              <p className="text-sm text-blue-100">
                University of Abra | Main Campus | Cashier&apos;s Unit
              </p>

              <h1 className="mt-1 text-3xl font-bold">
                Collections
              </h1>

              <p className="mt-1 text-sm text-blue-100">
                Manage registered collection types and fixed fees.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadItems}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-white px-4 py-3 font-semibold hover:bg-white hover:text-[#102d55] disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-semibold hover:bg-teal-700"
            >
              <Plus size={18} />
              Add Fee Type
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-6 py-8">
        {error && (
          <div className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Registered Fee Types
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#102d55]">
              {items.length}
            </h2>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle2 size={17} />
              Active Fee Types
            </div>

            <h2 className="mt-2 text-3xl font-bold text-green-700">
              {activeCount}
            </h2>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b p-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#102d55]">
                Registered Collections
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                These fee names and prices will appear in Receipts.
              </p>
            </div>

            <div className="relative md:w-96">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fee types..."
                className="w-full rounded-xl border px-4 py-3 pl-10 outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#edf3f8] text-left text-[#102d55]">
                <tr>
                  <th className="px-5 py-4">FEE TYPE</th>
                  <th className="px-5 py-4">DESCRIPTION</th>
                  <th className="px-5 py-4 text-right">FIXED FEE</th>
                  <th className="px-5 py-4">STATUS</th>
                  <th className="px-5 py-4 text-center">ACTIONS</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center">
                      Loading fee types...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-gray-500"
                    >
                      No fee types found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold text-[#102d55]">
                        {item.name}
                      </td>

                      <td className="px-5 py-4">
                        {item.description || "—"}
                      </td>

                      <td className="px-5 py-4 text-right font-bold">
                        {money(item.fixed_fee)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="inline-flex items-center gap-1 text-blue-800"
                          >
                            <Edit size={15} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleActive(item)}
                            className="inline-flex items-center gap-1 text-gray-600"
                          >
                            {item.is_active ? (
                              <ToggleRight size={18} />
                            ) : (
                              <ToggleLeft size={18} />
                            )}

                            {item.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold text-[#102d55]">
                  {editing ? "Edit Fee Type" : "Add Fee Type"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Set the collection name and its fixed price.
                </p>
              </div>

              <button
                type="button"
                onClick={() => !saving && setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Collection Name *
                </span>

                <input
                  name="name"
                  value={form.name}
                  onChange={changeForm}
                  required
                  maxLength={255}
                  placeholder="Certificate of Enrollment"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Fixed Fee (₱) *
                </span>

                <input
                  type="number"
                  name="fixed_fee"
                  value={form.fixed_fee}
                  onChange={changeForm}
                  min="0"
                  step="0.01"
                  required
                  placeholder="25.00"
                  className="w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Description
                </span>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={changeForm}
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </label>

              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={changeForm}
                />
                Active — available when creating receipts
              </label>

              {error && (
                <div className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !saving && setShowForm(false)}
                  disabled={saving}
                  className="rounded-xl border px-5 py-3 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}

                  {saving ? "Saving..." : "Save Fee Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
