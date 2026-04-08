import { useState } from "react";
import axios from "axios";

function RevenueForm() {
  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    source: ""
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://127.0.0.1:8000/add/revenue", {
        ...formData,
        amount: Number(formData.amount)
      });

      alert("Revenue added!");

      setFormData({
        date: "",
        amount: "",
        source: ""
      });

    } catch (error) {
      console.error(error);
      alert("Error adding revenue");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Añadir Ingreso</h2>

      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
      />

      <input
        type="number"
        name="amount"
        placeholder="Amount"
        value={formData.amount}
        onChange={handleChange}
        required
      />

      <input
        type="text"
        name="source"
        placeholder="Source"
        value={formData.source}
        onChange={handleChange}
      />

      <button type="submit">Add Revenue</button>
    </form>
  );
}

export default RevenueForm;