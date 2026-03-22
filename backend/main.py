from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, timedelta
import calendar as cal

from database import engine, get_db, Base
from models import User, Expense, RecurringExpense, BugReport
from auth import hash_password, verify_password, create_access_token, decode_token, oauth2_scheme
from schemas import RegisterSchema, LoginSchema, ExpenseCreate, RecurringCreate, SettingsUpdate

app = FastAPI(title="Float API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


# ── Dependencies ──────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_token(token)
    user = db.query(User).filter(User.id == int(payload.get("sub"))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Helpers ───────────────────────────────────────────────────

def safe_date(year, month, day):
    last = cal.monthrange(year, month)[1]
    return date(year, month, min(day, last))


def get_pay_period(payday: int, target: date = None):
    today = target or date.today()
    if today.day >= payday:
        period_start = safe_date(today.year, today.month, payday)
        if today.month == 12:
            period_end = safe_date(today.year + 1, 1, payday)
        else:
            period_end = safe_date(today.year, today.month + 1, payday)
    else:
        if today.month == 1:
            period_start = safe_date(today.year - 1, 12, payday)
        else:
            period_start = safe_date(today.year, today.month - 1, payday)
        period_end = safe_date(today.year, today.month, payday)
    return period_start, period_end


def recurring_cost(items, from_date, to_date):
    total = 0.0
    day = from_date
    while day < to_date:
        for r in items:
            if not r.is_active:
                continue
            if r.frequency == "weekly" and r.day_of_week is not None and day.weekday() == r.day_of_week:
                total += r.amount
            elif r.frequency == "monthly" and r.day_of_month is not None and day.day == r.day_of_month:
                total += r.amount
        day += timedelta(days=1)
    return total


def upcoming_recurring(items, from_date, days=7):
    result = []
    for i in range(days):
        day = from_date + timedelta(days=i)
        for r in items:
            if not r.is_active:
                continue
            hit = False
            if r.frequency == "weekly" and r.day_of_week is not None and day.weekday() == r.day_of_week:
                hit = True
            elif r.frequency == "monthly" and r.day_of_month is not None and day.day == r.day_of_month:
                hit = True
            if hit:
                result.append({
                    "recurring_id": r.id,
                    "date": day.isoformat(),
                    "amount": r.amount,
                    "category": r.category,
                    "description": r.description,
                })
    return result


def user_json(u):
    return {
        "id": u.id, "username": u.username, "email": u.email,
        "is_admin": u.is_admin, "monthly_income": u.monthly_income, "payday": u.payday,
    }


def expense_json(e):
    return {
        "id": e.id, "amount": e.amount, "category": e.category,
        "description": e.description, "date": e.date.isoformat(),
    }


def recurring_json(r):
    return {
        "id": r.id, "amount": r.amount, "category": r.category,
        "description": r.description, "frequency": r.frequency,
        "day_of_week": r.day_of_week, "day_of_month": r.day_of_month,
        "is_active": r.is_active,
    }


def build_dashboard(user_obj, db):
    today = date.today()
    ps, pe = get_pay_period(user_obj.payday, today)
    total_days = (pe - ps).days
    days_elapsed = (today - ps).days
    days_remaining = (pe - today).days

    period_exp = db.query(Expense).filter(
        Expense.user_id == user_obj.id, Expense.date >= ps, Expense.date < pe
    ).all()
    total_spent = sum(e.amount for e in period_exp)
    today_exp = [e for e in period_exp if e.date == today]

    recs = db.query(RecurringExpense).filter(RecurringExpense.user_id == user_obj.id).all()
    active = [r for r in recs if r.is_active]

    tomorrow = today + timedelta(days=1)
    future_rec = recurring_cost(active, tomorrow, pe)
    available = user_obj.monthly_income - total_spent - future_rec
    daily_budget = available / max(days_remaining, 1)

    total_rec_cost = recurring_cost(active, ps, pe)
    ideal = (user_obj.monthly_income - total_rec_cost) / max(total_days, 1)
    if daily_budget <= 0:
        status = "over_budget"
    elif daily_budget < ideal * 0.5:
        status = "tight"
    else:
        status = "on_track"

    return {
        "daily_budget": round(daily_budget, 2),
        "available": round(available, 2),
        "total_spent": round(total_spent, 2),
        "future_recurring": round(future_rec, 2),
        "monthly_income": user_obj.monthly_income,
        "days_remaining": days_remaining,
        "days_elapsed": days_elapsed,
        "total_days": total_days,
        "period_start": ps.isoformat(),
        "period_end": pe.isoformat(),
        "budget_status": status,
        "today_expenses": [expense_json(e) for e in today_exp],
        "upcoming_recurring": upcoming_recurring(active, today, 7),
    }


# ── Auth ──────────────────────────────────────────────────────

@app.post("/api/auth/register")
async def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already taken")

    is_first = db.query(User).count() == 0
    user = User(
        username=data.username, email=data.email,
        password_hash=hash_password(data.password),
        is_admin=is_first, monthly_income=data.monthly_income or 0, payday=20,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_access_token({"sub": str(user.id)}), "user": user_json(user)}


@app.post("/api/auth/login")
async def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_access_token({"sub": str(user.id)}), "user": user_json(user)}


@app.get("/api/auth/me")
async def me(user: User = Depends(get_current_user)):
    return user_json(user)


# ── Dashboard ─────────────────────────────────────────────────

@app.get("/api/dashboard")
async def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_dashboard(user, db)


# ── Expenses ──────────────────────────────────────────────────

@app.get("/api/expenses")
async def list_expenses(month: int = None, year: int = None,
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Expense).filter(Expense.user_id == user.id)
    if month and year:
        start = date(year, month, 1)
        end = date(year + (1 if month == 12 else 0), (month % 12) + 1, 1)
        q = q.filter(Expense.date >= start, Expense.date < end)
    return [expense_json(e) for e in q.order_by(Expense.date.desc()).all()]


@app.post("/api/expenses")
async def create_expense(data: ExpenseCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exp = Expense(user_id=user.id, amount=data.amount, category=data.category,
                  description=data.description or "", date=data.date)
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return expense_json(exp)


@app.delete("/api/expenses/{eid}")
async def delete_expense(eid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == eid, Expense.user_id == user.id).first()
    if not exp:
        raise HTTPException(404, "Not found")
    db.delete(exp)
    db.commit()
    return {"ok": True}


# ── Recurring ─────────────────────────────────────────────────

@app.get("/api/recurring")
async def list_recurring(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [recurring_json(r) for r in
            db.query(RecurringExpense).filter(RecurringExpense.user_id == user.id).all()]


@app.post("/api/recurring")
async def create_recurring(data: RecurringCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = RecurringExpense(user_id=user.id, amount=data.amount, category=data.category,
                           description=data.description, frequency=data.frequency,
                           day_of_week=data.day_of_week, day_of_month=data.day_of_month)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return recurring_json(rec)


@app.put("/api/recurring/{rid}")
async def update_recurring(rid: int, data: RecurringCreate,
                           user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(RecurringExpense).filter(RecurringExpense.id == rid, RecurringExpense.user_id == user.id).first()
    if not rec:
        raise HTTPException(404, "Not found")
    rec.amount = data.amount
    rec.category = data.category
    rec.description = data.description
    rec.frequency = data.frequency
    rec.day_of_week = data.day_of_week
    rec.day_of_month = data.day_of_month
    db.commit()
    return recurring_json(rec)


@app.patch("/api/recurring/{rid}/toggle")
async def toggle_recurring(rid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(RecurringExpense).filter(RecurringExpense.id == rid, RecurringExpense.user_id == user.id).first()
    if not rec:
        raise HTTPException(404, "Not found")
    rec.is_active = not rec.is_active
    db.commit()
    return {"id": rec.id, "is_active": rec.is_active}


@app.delete("/api/recurring/{rid}")
async def delete_recurring(rid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rec = db.query(RecurringExpense).filter(RecurringExpense.id == rid, RecurringExpense.user_id == user.id).first()
    if not rec:
        raise HTTPException(404, "Not found")
    db.delete(rec)
    db.commit()
    return {"ok": True}


# ── Settings ──────────────────────────────────────────────────

@app.put("/api/settings")
async def update_settings(data: SettingsUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.monthly_income is not None:
        user.monthly_income = data.monthly_income
    if data.payday is not None:
        if data.payday < 1 or data.payday > 28:
            raise HTTPException(400, "Payday must be between 1 and 28")
        user.payday = data.payday
    db.commit()
    return user_json(user)


# ── Admin ─────────────────────────────────────────────────────

@app.get("/api/admin/users")
async def admin_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        ps, pe = get_pay_period(u.payday)
        today = date.today()
        dr = (pe - today).days
        exps = db.query(Expense).filter(Expense.user_id == u.id, Expense.date >= ps, Expense.date < pe).all()
        spent = sum(e.amount for e in exps)
        recs = db.query(RecurringExpense).filter(
            RecurringExpense.user_id == u.id, RecurringExpense.is_active == True
        ).all()
        future = recurring_cost(recs, today + timedelta(days=1), pe)
        avail = u.monthly_income - spent - future
        db_ = avail / max(dr, 1)
        result.append({
            **user_json(u),
            "daily_budget": round(db_, 2), "available": round(avail, 2), "total_spent": round(spent, 2),
        })
    return result


@app.get("/api/admin/users/{uid}/dashboard")
async def admin_user_dashboard(uid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    target = db.query(User).filter(User.id == uid).first()
    if not target:
        raise HTTPException(404, "User not found")
    data = build_dashboard(target, db)
    data["user"] = user_json(target)
    return data


@app.delete("/api/admin/users/{uid}")
async def admin_delete_user(uid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    if uid == admin.id:
        raise HTTPException(400, "Cannot delete yourself")
    target = db.query(User).filter(User.id == uid).first()
    if not target:
        raise HTTPException(404, "User not found")
    db.query(Expense).filter(Expense.user_id == uid).delete()
    db.query(RecurringExpense).filter(RecurringExpense.user_id == uid).delete()
    db.delete(target)
    db.commit()
    return {"ok": True}


# ── Bug Reports ───────────────────────────────────────────────

@app.get("/api/bugs")
async def list_bugs(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bugs = db.query(BugReport).order_by(BugReport.created_at.desc()).all()
    return [{
        "id": b.id, "message": b.message, "status": b.status,
        "username": b.user.username if b.user else "?",
        "created_at": b.created_at.isoformat() if b.created_at else None,
    } for b in bugs]


@app.post("/api/bugs")
async def create_bug(data: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = (data.get("message") or "").strip()
    if not msg:
        raise HTTPException(400, "Message is required")
    bug = BugReport(user_id=user.id, message=msg)
    db.add(bug)
    db.commit()
    db.refresh(bug)
    return {"id": bug.id, "message": bug.message, "status": bug.status,
            "username": user.username, "created_at": bug.created_at.isoformat()}


@app.patch("/api/bugs/{bid}/resolve")
async def resolve_bug(bid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    bug = db.query(BugReport).filter(BugReport.id == bid).first()
    if not bug:
        raise HTTPException(404, "Not found")
    bug.status = "resolved" if bug.status == "open" else "open"
    db.commit()
    return {"id": bug.id, "status": bug.status}


@app.delete("/api/bugs/{bid}")
async def delete_bug(bid: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    bug = db.query(BugReport).filter(BugReport.id == bid).first()
    if not bug:
        raise HTTPException(404, "Not found")
    db.delete(bug)
    db.commit()
    return {"ok": True}
