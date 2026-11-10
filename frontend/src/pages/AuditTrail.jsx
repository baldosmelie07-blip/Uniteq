
import { useState } from "react";
import { History, Search, RefreshCw } from "lucide-react";

export default function AuditTrail() {
    const [search, setSearch] = useState("");

    // Temporary sample data for the page layout.
    // We will connect this to the Laravel API next.
    const activities = [
        {
            id: 1,
            user: "System Administrator",
            action: "Created User",
            description: "Created a new cashier account",
            date: "2026-11-04 08:00 AM",
        },
        {
            id: 2,
            user: "Cashier",
            action: "Created Receipt",
            description: "Created a payment receipt",
            date: "2026-11-04 08:15 AM",
        },
        {
            id: 3,
            user: "Reviewer",
            action: "Approved Voucher",
            description: "Approved a disbursement voucher",
            date: "2026-11-04 08:30 AM",
        },
    ];

    const filteredActivities = activities.filter((activity) =>
        `${activity.user} ${activity.action} ${activity.description}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                    <History className="text-blue-600" size={28} />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Audit Trail
                    </h1>
                    <p className="text-gray-500">
                        Monitor and review activities performed in UniTeq.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-5">
                    <p className="text-sm text-gray-500">
                        Total Activities
                    </p>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {activities.length}
                    </h2>
                </div>

                <div className="bg-white border rounded-xl p-5">
                    <p className="text-sm text-gray-500">
                        Today's Activities
                    </p>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {activities.length}
                    </h2>
                </div>

                <div className="bg-white border rounded-xl p-5">
                    <p className="text-sm text-gray-500">
                        Activity Types
                    </p>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {new Set(activities.map((a) => a.action)).size}
                    </h2>
                </div>
            </div>

            <div className="bg-white border rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Activity Records
                        </h2>
                        <p className="text-sm text-gray-500">
                            Review user activities and transaction history.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="relative">
                    <Search
                        className="absolute left-3 top-3 text-gray-400"
                        size={18}
                    />

                    <input
                        type="text"
                        placeholder="Search user, activity, or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full border rounded-lg pl-10 pr-4 py-2.5"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Activity</th>
                                <th className="p-4">Description</th>
                                <th className="p-4">Date & Time</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredActivities.length > 0 ? (
                                filteredActivities.map((activity) => (
                                    <tr
                                        key={activity.id}
                                        className="border-t hover:bg-gray-50"
                                    >
                                        <td className="p-4 font-medium">
                                            {activity.user}
                                        </td>

                                        <td className="p-4">
                                            {activity.action}
                                        </td>

                                        <td className="p-4 text-gray-600">
                                            {activity.description}
                                        </td>

                                        <td className="p-4 text-gray-500">
                                            {activity.date}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="4"
                                        className="p-8 text-center text-gray-500"
                                    >
                                        No activities found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
