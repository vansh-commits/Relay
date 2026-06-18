from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    GEMINI_API_KEY: str
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash-lite"
    GEMINI_EMBED_MODEL: str = "models/text-embedding-004"
    DATABASE_URL: str = "postgresql+asyncpg://support_user:password@localhost:5432/support_db"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CONFIDENCE_THRESHOLD: float = 0.4
    LOG_LEVEL: str = "INFO"
    FRONTEND_URL: str = "http://localhost:3000"

    # Auth
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30
    GUEST_QUESTION_LIMIT: int = 4


settings = Settings()
