# ============================================================
# MineSafe AI — Notifications API Routes (/api/v1/notifications)
# ============================================================

import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationOut], summary="List User Notifications")
def list_notifications(
    unread_only: Optional[bool] = Query(False, alias="read", description="If True, return unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve notifications log for the currently logged-in user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only is True:
        query = query.filter(Notification.read == False)

    notifications = query.order_by(desc(Notification.timestamp)).limit(limit).all()
    return notifications


@router.patch("/read-all", summary="Mark All Notifications as Read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications for the current user as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({"read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read."}


@router.patch("/{notification_id}/read", response_model=NotificationOut, summary="Mark Notification as Read")
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif
