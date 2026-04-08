import { useState } from "react";
import axios from "axios";

function ExpenseForm() {
  const [formData, setFormData] = useState({
    date: "",
    amount: "",
    category: ""
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
      await axios.post("http://127.0.0.1:8000/add/expense", {
        ...formData,
        amount: Number(formData.amount)
      });

      alert("Expense added!");

      setFormData({
        date: "",
        amount: "",
        category: ""
      });

    } catch (error) {
      console.error(error);
      alert("Error adding expense");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Añadir Gasto</h2>

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

    <select
    name="category"
    value={formData.category}
    onChange={handleChange}
    required
    >
    <option value="">Select Category</option>
     <option value="Bank Fee">Tarifa ATH</option>
     <option value="Bank Fee">Tarifa Loto</option>
    <option value="Rent">Renta Panaderia</option>
    <option value="Rent">Renta de Cafetera</option>
    <option value="Salaries">Nomina de Empleados</option>
    <option value="Salaries">Nomina Kevin</option>
    <option value="Salaries">Nomina Liz</option>
    <option value="Salaries">Nomina Martina</option>
    <option value="Salaries">Nomina Roberto</option>
    <option value="Marketing">Mercadeo -Social Media Manager"</option>
    <option value="Marketing">Mercadeo</option>
    <option value="Utilities">Luz</option>
    <option value="Utilities">Fianza de Luz</option>
    <option value="Utilities">Agua</option>
    <option value="Utilities">Gas</option>
    <option value="Utilities">Telefono Panderia</option>
    <option value="Utilities">Internet Panaderia</option>
    <option value="Supplies & Materials">Harina</option>
    <option value="Supplies & Materials">Suministros y Materiales</option>
     <option value="Business Taxes">IVU Municipal - 1%</option>
     <option value="Business Taxes">IVU Estatal - 10.5%</option>
     <option value="Property Taxes">CRIM Muebles</option>
     <option value="Property Taxes">CRIM Inmuebles</option>
      <option value="Repairs and Maintenance Expenses"> Bio Pest Control</option>
      <option value="Repairs and Maintenance Expenses"> Mantenimiento y Reparos</option>
      <option value="Legal & Professional Services"> Contable</option>
      <option value="License and Permits">Patenta</option>
      <option value="Business Insurance ">Seguro de la Panaderia</option>
       <option value="Business Loans">Prestamo</option>
       <option value="Business Loans">Titi Miriam</option>
     <option value="Employee Benefits">Seguro Social</option>
    <option value="Software">Software</option>
    </select>

      <button type="submit">Add Expense</button>
    </form>
  );
}

export default ExpenseForm;