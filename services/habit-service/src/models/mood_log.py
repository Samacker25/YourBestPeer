import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    log_date: Mapped[date] = mapped_column(Date, nullable=False)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)          # 1–5
    energy: Mapped[int] = mapped_column(Integer, nullable=False)        # 1–5
    sleep_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji: Mapped[str] = mapped_column(String(10), default="🙂")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
