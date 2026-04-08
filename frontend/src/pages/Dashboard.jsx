import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  BarChart, Bar
} from "recharts";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedChart, setSelectedChart] = useState("trend");
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    category: "",
    date: ""
  });


  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [order, setOrder] = useState("desc");
  const [total, setTotal] = useState(0);

  // ================= FETCH =================
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        "http://127.0.0.1:8000/api/dashboard/summary",
        {
          params: {
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          },
        }
      );

      setSummary(res.data);
    } catch (err) {
      console.error("Dashboard API error:", err);
    } finally {
      setLoading(false);
    }
  };


  // const fetchTransactions = async () => {
  //   try {
  //     const res = await axios.get("http://127.0.0.1:8000/api/transactions", {
  //       params: {
  //         start_date: startDate || undefined,
  //         end_date: endDate || undefined,
  //       },
  //     });

  //     setTransactions(res.data);
  //   } catch (err) {
  //     console.error("Transactions API error:", err);
  //   }
  // };

  // useEffect(() => {
  //   fetchDashboard();
  //   fetchTransactions();
  // }, [startDate, endDate]);

  const fetchTransactions = async () => {
  try {
    const res = await axios.get("http://127.0.0.1:8000/api/transactions", {
      params: {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
        sort_by: sortBy,
        order: order,
        page: page,
        limit: limit,
      },
    });

    setTransactions(res.data.data);
    setTotal(res.data.total);
  } catch (err) {
    console.error("Transactions API error:", err);
  }
};

  useEffect(() => {
  fetchDashboard();
  fetchTransactions();
}, [startDate, endDate, page, search, sortBy, order]);

  // ================= ADD =================
  const handleSubmit = async () => {
    if (!form.amount || !form.date) return;

    if (modalType === "revenue") {
      await axios.post("http://127.0.0.1:8000/add/revenue", {
        date: form.date,
        amount: Number(form.amount),
        source: form.category
      });
    } else {
      await axios.post("http://127.0.0.1:8000/add/expense", {
        date: form.date,
        amount: Number(form.amount),
        category: form.category
      });
    }

    setShowModal(false);
    setForm({ amount: "", category: "", date: "" });

    fetchDashboard();
    fetchTransactions();
  };

  // ================= DELETE =================
  const handleDelete = async (t) => {
    await axios.delete(
      `http://127.0.0.1:8000/transactions/${t.id}/${t.type}`
    );
    await Promise.all([
      fetchDashboard(),
      fetchTransactions()
    ]);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL data?")) return;

    await axios.delete("http://127.0.0.1:8000/api/transactions/all");

    await Promise.all([
      fetchDashboard(),
      fetchTransactions()
    ]);
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchDashboard();
    fetchTransactions();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!summary) return <div className="p-10 text-center">No data</div>;

  // ================= CHARTS =================
  const charts = {
    trend: (
      <LineChart width={700} height={300} data={summary.chart_data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line dataKey="revenue" stroke="#4f46e5" />
        <Line dataKey="expenses" stroke="#ef4444" />
      </LineChart>
    ),
    profit: (
      <BarChart width={700} height={300} data={summary.profit_by_month}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="profit" fill="#10b981" />
      </BarChart>
    ),
    expenses: (
      <BarChart width={700} height={300} data={summary.expense_by_category}>
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="amount" fill="#ef4444" />
      </BarChart>
    )
  };

  // ================= UI =================
  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <div className="w-60 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white p-5">
        <h2 className="text-xl font-bold mb-6">📊 SaaS Dashboard</h2>
        <p className="mb-2">Overview</p>
        <p className="mb-2">Analytics</p>
        <p>Reports</p>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        <h1 className="text-3xl font-bold mb-4">Business Overview</h1>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mb-4">
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
            onClick={() => {
              setModalType("revenue");
              setShowModal(true);
            }}
          >
            + Add Revenue
          </button>

          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            onClick={() => {
              setModalType("expense");
              setShowModal(true);
            }}
          >
            + Add Expense
          </button>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow">
            <h4>Revenue</h4>
            <p className="text-green-600 text-xl font-bold">
              ${summary.kpis.total_revenue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <h4>Expenses</h4>
            <p className="text-red-600 text-xl font-bold">
              ${summary.kpis.total_expenses.toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl shadow">
            <h4>Profit</h4>
            <p className={`text-xl font-bold ${summary.kpis.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${summary.kpis.profit.toLocaleString()}
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex gap-2 mb-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded" />

          <button className="bg-indigo-500 text-white px-3 rounded" onClick={fetchDashboard}>Apply</button>
          <button className="bg-gray-300 px-3 rounded" onClick={resetFilters}>Reset</button>
          <button className="bg-black text-white px-3 rounded" onClick={handleDeleteAll}>
            Delete All
          </button>
        </div>

        {/* CHART */}

        <div className="flex gap-2 mb-4">
        <button
          className={`px-3 py-1 rounded ${
            selectedChart === "trend" ? "bg-indigo-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setSelectedChart("trend")}
        >
          Trend
        </button>

        <button
          className={`px-3 py-1 rounded ${
            selectedChart === "profit" ? "bg-green-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setSelectedChart("profit")}
        >
          Profit
        </button>

        <button
          className={`px-3 py-1 rounded ${
            selectedChart === "expenses" ? "bg-red-600 text-white" : "bg-gray-200"
          }`}
          onClick={() => setSelectedChart("expenses")}
        >
          Expenses
        </button>
      </div>
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          {charts[selectedChart]}
        </div>

        <input
          type="text"
          placeholder="Search category or type..."
          className="border p-2 rounded mb-3"
          value={search}
          onChange={(e) => {
            setPage(1); // reset page
            setSearch(e.target.value);
          }}
        />
        {/* TABLE */}

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="mb-3 font-bold">Transactions ({transactions.length})</h3>

          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th onClick={() => setSortBy("date")}>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th onClick={() => setSortBy("amount")}>Amount</th>

              </tr>
            </thead>

            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b">
                  <td>{t.date.split("T")[0]}</td>
                  <td>{t.type}</td>
                  <td>{t.category}</td>
                  <td>${t.amount}</td>
                  <td>
                    <button
                      className="text-red-500"
                      onClick={() => handleDelete(t)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-4">
  <button
    disabled={page === 1}
    onClick={() => setPage(page - 1)}
    className="px-3 py-1 bg-gray-300 rounded"
  >
    Prev
  </button>

  <span>Page {page}</span>

  <button
    disabled={page * limit >= total}
    onClick={() => setPage(page + 1)}
    className="px-3 py-1 bg-gray-300 rounded"
  >
    Next
  </button>
</div>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-xl w-80">
              <h3 className="mb-4 font-bold">
                Add {modalType === "revenue" ? "Revenue" : "Expense"}
              </h3>

              <input
                type="date"
                className="w-full border p-2 mb-2"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />

              <input
                type="number"
                placeholder="Amount"
                className="w-full border p-2 mb-2"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />

              <input
                type="text"
                placeholder="Category"
                className="w-full border p-2 mb-4"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />

              <div className="flex justify-between">
                <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={handleSubmit}>
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;