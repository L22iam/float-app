from pydantic import BaseModel
from typing import Optional
from datetime import date


class RegisterSchema(BaseModel):
    username: str
    email: str
    password: str
    monthly_income: Optional[float] = 0


class LoginSchema(BaseModel):
    username: str
    password: str


class ExpenseCreate(BaseModel):
    amount: float
    category: str
    description: Optional[str] = ""
    date: date


class RecurringCreate(BaseModel):
    amount: float
    category: str
    description: str
    frequency: str  # "weekly" or "monthly"
    day_of_week: Optional[int] = None
    day_of_month: Optional[int] = None


class SettingsUpdate(BaseModel):
    monthly_income: Optional[float] = None
    payday: Optional[int] = None
