"""
SQLAlchemy модель для таблицы account_member
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class AccountMember(Base):
    __tablename__ = "account_member"
    
    account_member_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("account.account_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True))
    
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'admin', 'teacher', 'instructional_designer', 'member')",
            name="account_member_role_check"
        ),
    )
    
    # Relationships
    user = relationship("User", backref="account_memberships")
    account = relationship("Account", backref="members")
