from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_admin = Column(Boolean, default=False)
    monthly_income = Column(Float, default=0)
    payday = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.utcnow)

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    recurring_expenses = relationship("RecurringExpense", back_populates="user", cascade="all, delete-orphan")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    category = Column(String)
    description = Column(String, nullable=True, default="")
    date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="expenses")


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    category = Column(String)
    description = Column(String)
    frequency = Column(String)  # "weekly" or "monthly"
    day_of_week = Column(Integer, nullable=True)  # 0=Monday .. 6=Sunday (Python convention)
    day_of_month = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="recurring_expenses")


class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text)
    status = Column(String, default="open")  # open, resolved
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
