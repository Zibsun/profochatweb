from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from app.database import get_db
from app.schemas.user import UserCreate, UserResponse, LoginRequest
from app.models.user import User
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Регистрация нового пользователя"""
    try:
        # Валидация пароля
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пароль должен содержать минимум 6 символов"
            )
        
        # Проверка существования пользователя
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )
        
        # Создание нового пользователя
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            password_hash=hashed_password,
            # Для email/password авторизации telegram_user_id может быть NULL
            # но если миграция не применена, нужно установить временное значение
            telegram_user_id=None  # Будет NULL после применения миграции 0008
        )
        db.add(db_user)
        try:
            db.commit()
            db.refresh(db_user)
        except Exception as db_error:
            db.rollback()
            # Если ошибка связана с NOT NULL constraint на telegram_user_id
            if 'telegram_user_id' in str(db_error) and 'not-null' in str(db_error).lower():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Миграция базы данных не применена. Необходимо применить миграцию 0008_add_email_password_auth.sql"
                )
            raise
        
        return db_user
    except HTTPException:
        # Пробрасываем HTTPException как есть (CORS middleware обработает)
        raise
    except Exception as e:
        # Обрабатываем все остальные ошибки
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error registering user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при регистрации: {str(e)}"
        )

@router.post("/login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Вход пользователя"""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not user.password_hash or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль"
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": str(user.user_id)}, expires_delta=access_token_expires
    )
    
    # Обновление времени последней активности
    user.last_active_at = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    }

@router.post("/logout")
def logout():
    """Выход пользователя (заглушка)"""
    return {"message": "Выход выполнен"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Получение информации о текущем пользователе"""
    return current_user

