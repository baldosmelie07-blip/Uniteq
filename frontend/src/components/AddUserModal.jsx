import { useEffect, useState } from "react";

export default function AddUserModal({
  isOpen,
  onClose,
  onSave,
  editingUser,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Cashier",
    status: "Active",
  });

  useEffect(() => {
    if (editingUser) {
      setForm({
        name: editingUser.name || "",
        email: editingUser.email || "",
        role: editingUser.role || "Cashier",
        status: editingUser.status || "Active",
      });
    } else {
      setForm({
        name: "",
        email: "",
        role: "Cashier",
        status: "Active",
      });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    onSave({
      ...form,
      id: editingUser?.id,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-8">

        <h2 className="text-3xl font-bold text-blue-800 mb-6">
          {editingUser ? "Edit User" : "Add New User"}
        </h2>

        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-2 gap-4">

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="border p-3 rounded-lg col-span-2"
              placeholder="Full Name"
              required
            />

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="border p-3 rounded-lg col-span-2"
              placeholder="Email"
              required
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="border p-3 rounded-lg"
            >
              <option>Administrator</option>
              <option>Cashier</option>
              <option>Auditor</option>
            </select>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="border p-3 rounded-lg"
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>

          </div>

          <div className="flex justify-end gap-3 mt-8">

            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 px-5 py-3 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="bg-blue-700 text-white px-5 py-3 rounded-lg hover:bg-blue-800"
            >
              {editingUser ? "Update User" : "Save User"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}