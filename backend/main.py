from fastapi import FastAPI, UploadFile, File
import pandas as pd
from typing import List
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from dateutil import parser
from database import engine, SessionLocal
from models import Base, Revenue, Expense
from fastapi import Depends
from sqlalchemy.orm import Session



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Storage
Base.metadata.create_all(bind=engine)


# ----------------------
# Manual Entry Endpoints
# ----------------------
@app.post("/add/revenue")
def add_revenue(entry: dict):
    db = SessionLocal()

    new_revenue = Revenue(
        date=parser.parse(entry["date"]).isoformat(),
        amount=float(entry["amount"]),
        source=entry.get("source", "N/A")
    )
    db.add(new_revenue)
    db.commit()
    db.refresh(new_revenue)
    db.close()

    return {"message": "Revenue added"}


@app.post("/add/expense")
def add_expense(entry: dict):
    db = SessionLocal()

    new_expense = Expense(
        date=parser.parse(entry["date"]).isoformat(),
        amount=float(entry["amount"]),
        category=entry.get("category", "N/A")
    )

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    db.close()

    return {"message": "Expense added"}

@app.get("/api/dashboard/summary")
def get_dashboard_summary(start_date: str = Query(None), end_date: str = Query(None)):
    db = SessionLocal()

    revenues = db.query(Revenue).all()
    expenses = db.query(Expense).all()
    query_rev = db.query(Revenue)
    query_exp = db.query(Expense)

    if start_date:
        query_rev = query_rev.filter(Revenue.date >= start_date)
        query_exp = query_exp.filter(Expense.date >= start_date)
        revenues = query_rev.all()
        expenses = query_exp.all()

    if end_date:
        query_rev = query_rev.filter(Revenue.date <= end_date)
        query_exp = query_exp.filter(Expense.date <= end_date)
        revenues = query_rev.all()
        expenses = query_exp.all()

    db.close()

    # Convert to DataFrames
    rev_df = pd.DataFrame([{"date": r.date, "amount": r.amount} for r in revenues])
    exp_df = pd.DataFrame([{"date": e.date, "amount": e.amount, "category": e.category} for e in expenses])

    # Handle empty state
    if rev_df.empty and exp_df.empty:
        return {
            "kpis": {
                "total_revenue": 0,
                "total_expenses": 0,
                "profit": 0,
                "revenue_change": 0,
                "expenses_change": 0,
                "profit_change": 0
            },
            "chart_data": [],
            "profit_by_month": [],
            "expense_by_category": [],
            "transactions": []
        }

    # Dates
    if not rev_df.empty:
        rev_df["date"] = pd.to_datetime(rev_df["date"])
        rev_df["amount"] = pd.to_numeric(rev_df["amount"])

    if not exp_df.empty:
        exp_df["date"] = pd.to_datetime(exp_df["date"])
        exp_df["amount"] = pd.to_numeric(exp_df["amount"])

    # ================= KPI LOGIC =================
    now = datetime.now()
    start_current = datetime(now.year, now.month, 1)

    current_rev = rev_df[rev_df["date"] >= start_current]["amount"].sum() if not rev_df.empty else 0
    current_exp = exp_df[exp_df["date"] >= start_current]["amount"].sum() if not exp_df.empty else 0

    profit = current_rev - current_exp

    # ================= CHARTS =================
    summary = pd.DataFrame()

    if not rev_df.empty:
        rev_month = rev_df.groupby(rev_df["date"].dt.to_period("M"))["amount"].sum()
    else:
        rev_month = pd.Series(dtype=float)

    if not exp_df.empty:
        exp_month = exp_df.groupby(exp_df["date"].dt.to_period("M"))["amount"].sum()
    else:
        exp_month = pd.Series(dtype=float)

    summary = pd.concat([rev_month, exp_month], axis=1).fillna(0)
    summary.columns = ["revenue", "expenses"]
    summary = summary.reset_index()
    summary["date"] = summary["date"].astype(str)

    chart_data = summary.to_dict(orient="records")

    # ================= EXPENSE BY CATEGORY =================
    expense_by_category = (
        exp_df.groupby("category")["amount"].sum().reset_index().to_dict(orient="records")
        if not exp_df.empty else []
    )

    # ================= PROFIT BY MONTH =================
    summary["profit"] = summary["revenue"] - summary["expenses"]
    profit_by_month = summary[["date", "profit"]].rename(columns={"date": "month"}).to_dict(orient="records")

    return {
        "kpis": {
            "total_revenue": float(current_rev),
            "total_expenses": float(current_exp),
            "profit": float(profit),
        },
        "chart_data": chart_data,
        "expense_by_category": expense_by_category,
        "profit_by_month": profit_by_month
    }

@app.get("/api/transactions")
def get_transactions(
    start_date: str = None,
    end_date: str = None,
    search: str = None,
    sort_by: str = "date",   # date | amount
    order: str = "desc",     # asc | desc
    page: int = 1,
    limit: int = 10
):
    db = SessionLocal()

    revenues = db.query(Revenue).all()
    expenses = db.query(Expense).all()
    db.close()

    data = []

    for r in revenues:
        data.append({
            "id": r.id,
            "type": "Revenue",
            "date": r.date,
            "amount": r.amount,
            "category": r.source
        })

    for e in expenses:
        data.append({
            "id": e.id,
            "type": "Expense",
            "date": e.date,
            "amount": e.amount,
            "category": e.category
        })

    df = pd.DataFrame(data)

    if df.empty:
        return {"data": [], "total": 0}

    df["date"] = pd.to_datetime(df["date"])

    # ✅ FILTERS
    if start_date:
        df = df[df["date"] >= pd.to_datetime(start_date)]
    if end_date:
        df = df[df["date"] <= pd.to_datetime(end_date)]

    # ✅ SEARCH (category OR type)
    if search:
        search = search.lower()
        df = df[
            df["category"].str.lower().str.contains(search) |
            df["type"].str.lower().str.contains(search)
        ]

    # ✅ SORTING
    ascending = True if order == "asc" else False
    df = df.sort_values(by=sort_by, ascending=ascending)

    # ✅ PAGINATION
    total = len(df)
    start = (page - 1) * limit
    end = start + limit
    df = df.iloc[start:end]

    return {
        "data": df.to_dict(orient="records"),
        "total": total
    }

# @app.get("/api/transactions")
# def get_transactions(start_date: str = None, end_date: str = None):
#     db = SessionLocal()

#     revenues = db.query(Revenue).all()
#     expenses = db.query(Expense).all()
#     db.close()

#     data = []

#     for r in revenues:
#         data.append({
#             "id": r.id,
#             "type": "Revenue",
#             "date": r.date,
#             "amount": r.amount,
#             "category": r.source
#         })

#     for e in expenses:
#         data.append({
#             "id": e.id,
#             "type": "Expense",
#             "date": e.date,
#             "amount": e.amount,
#             "category": e.category
#         })

#     df = pd.DataFrame(data)

#     if df.empty:
#         return []

#     df["date"] = pd.to_datetime(df["date"])

#     if start_date:
#         # df = df[df["date"] >= start_date]
#         start_date = pd.to_datetime(start_date)
#         df = df[df["date"] >= start_date]
#     if end_date:
#         # df = df[df["date"] <= end_date]
#         end_date = pd.to_datetime(end_date)
#         df = df[df["date"] <= end_date]

#     return df.sort_values(by="date", ascending=False).to_dict(orient="records")


@app.delete("/transactions/{transaction_id}/{type}")
def delete_transaction(transaction_id: int, type: str):
    db = SessionLocal()

    if type.lower() == "revenue":
        db.query(Revenue).filter(Revenue.id == transaction_id).delete()
    elif type.lower() == "expense":
        db.query(Expense).filter(Expense.id == transaction_id).delete()
    else:
        db.close()
        return {"error": "Invalid type"}

    db.commit()
    db.close()

    return {"message": "Deleted"}

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 🔥 DELETE EVERYTHING
@app.delete("/api/transactions/all")
def delete_all_transactions(db: Session = Depends(get_db)):
    db.query(Revenue).delete()
    db.query(Expense).delete()
    db.commit()

    return {"message": "All transactions deleted"}


