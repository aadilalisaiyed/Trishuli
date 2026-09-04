# ============================================================
# MineSafe AI — Authentication API Routes (/api/v1/auth)
# ============================================================

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="User Login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user credentials (username & password) and return
    a JWT Bearer access token along with user profile.
    """
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled.",
        )

    # Update last login timestamp
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    # Create JWT access token
    access_token = create_access_token(subject=str(user.id), role=user.role)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )


@router.post("/logout", summary="User Logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Protected logout endpoint. Client discards the token.
    """
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserOut, summary="Get Current User Profile")
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the profile details of the currently authenticated user.
    """
    return current_user
