from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, courses, lessons, steps, chat, quiz, mvp
from app.config import settings

app = FastAPI(title="ProfoChatBot Web API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MVP роутер (без аутентификации)
app.include_router(mvp.router, prefix="/api/mvp", tags=["mvp"])

# Существующие роутеры (с аутентификацией)
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["courses"])
app.include_router(lessons.router, prefix="/api/v1/lessons", tags=["lessons"])
app.include_router(steps.router, prefix="/api/v1/steps", tags=["steps"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(quiz.router, prefix="/api/v1/steps", tags=["quiz"])

@app.get("/")
def root():
    return {"message": "ProfoChatBot Web API"}
