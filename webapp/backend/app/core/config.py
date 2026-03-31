from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    OPENAI_API_KEY: str
    FRONTEND_URL: str = "http://localhost:3002"
    ENVIRONMENT: str = "development"
    TELEGRAM_AUTH_BOT_TOKEN: str = ""  # Token for Telegram authentication bot (enraidrobot)
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Игнорировать дополнительные поля из .env

settings = Settings()
