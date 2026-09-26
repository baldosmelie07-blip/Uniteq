export default function UserTable({
  users,
  onDelete,
  onEdit,
}) {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-blue-700 text-white">
          <tr>
            <th className="p-4 text-left">#</th>
            <th className="p-4 text-left">Name</th>
            <th className="p-4 text-left">Email</th>
            <th className="p-4 text-left">Role</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-center">Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan="6"
                className="text-center p-8 text-gray-500"
              >
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user, index) => (
              <tr
                key={user.id}
                className="border-b hover:bg-gray-50"
              >
                {/* Display row number, NOT database ID */}
                <td className="p-4">
                  {index + 1}
                </td>

                <td className="p-4 font-medium">
                  {user.name}
                </td>

                <td className="p-4">
                  {user.email}
                </td>

                <td className="p-4">
                  {user.role}
                </td>

                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      user.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="p-4 text-center">

                  <button
                    onClick={() => onEdit(user)}
                    className="mr-3 text-blue-600 hover:text-blue-800 text-lg"
                    title="Edit"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-red-600 hover:text-red-800 text-lg"
                    title="Delete"
                  >
                    🗑️
                  </button>

                </td>
              </tr>
            ))
          )}
        </tbody>

      </table>

    </div>
  );
}