"""
Система проверки прав доступа
"""
from typing import List
from fastapi import HTTPException, status
from app.models.user import User as UserTelegram  # Алиас для обратной совместимости
from app.models.account_member import AccountMember

# Роли в порядке убывания привилегий
ROLE_HIERARCHY = {
    'owner': 4,
    'admin': 3,
    'instructional_designer': 2,
    'teacher': 2,
    'member': 1
}

def check_permission(
    user: UserTelegram,
    account_member: AccountMember,
    required_roles: List[str],
    allow_super_admin: bool = True
) -> bool:
    """
    Проверка прав доступа
    
    Args:
        user: Пользователь
        account_member: Членство в аккаунте
        required_roles: Список ролей, которые имеют доступ
        allow_super_admin: Разрешить доступ super_admin без проверки роли
    
    Returns:
        True если доступ разрешен
    """
    # Super admin имеет доступ ко всему
    if allow_super_admin and user.is_super_admin:
        return True
    
    # Проверка роли
    return account_member.role in required_roles

def require_role(
    required_roles: List[str],
    allow_super_admin: bool = True
):
    """
    Dependency для проверки роли в endpoint
    
    Usage:
        @router.get("/admin-only")
        def admin_endpoint(
            user_and_account: tuple = Depends(require_role(['admin', 'owner']))
        ):
            ...
    """
    def check(user_and_account: tuple):
        user, account_member = user_and_account
        if not check_permission(user, account_member, required_roles, allow_super_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Требуется роль: {', '.join(required_roles)}"
            )
        return user_and_account
    return check

# Конкретные проверки для разных разделов
def can_manage_account(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять настройками аккаунта"""
    return check_permission(user, account_member, ['owner'])

def can_manage_members(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять участниками аккаунта"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_manage_bots(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять ботами"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_manage_courses(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять курсами"""
    return check_permission(
        user, account_member, 
        ['owner', 'admin', 'instructional_designer']
    )

def can_manage_groups(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может управлять группами"""
    return check_permission(user, account_member, ['owner', 'admin'])

def can_view_groups(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может просматривать группы"""
    return check_permission(
        user, account_member, 
        ['owner', 'admin', 'teacher']
    )

def can_view_analytics(user: UserTelegram, account_member: AccountMember) -> bool:
    """Может просматривать аналитику"""
    return check_permission(
        user, account_member,
        ['owner', 'admin', 'teacher', 'instructional_designer']
    )
