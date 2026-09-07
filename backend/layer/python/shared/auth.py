
def get_claims(event: dict) -> dict:
    """Decode JWT claims từ requestContext.authorizer.claims"""
    # API Gateway với Cognito Authorizer tự inject claims vào requestContext
    return event.get('requestContext', {}).get('authorizer', {}).get('claims', {})

def get_current_user(event: dict) -> dict:
    """Trả về {'username': ..., 'sub': ..., 'groups': [...], 'email': ...}"""
    claims = get_claims(event)
    groups_str = claims.get('cognito:groups', '')
    groups = groups_str.split(',') if groups_str else []
    return {
        'username': claims.get('cognito:username') or claims.get('email', ''),
        'sub': claims.get('sub', ''),
        'email': claims.get('email', ''),
        'groups': groups
    }

def require_admin(event: dict) -> str:
    """Raise PermissionError nếu không phải admin. Trả về username nếu ok."""
    user = get_current_user(event)
    if 'admin' not in user['groups']:
        raise PermissionError('Chỉ admin mới có quyền thực hiện thao tác này')
    return user['username']

def is_admin(event: dict) -> bool:
    """Kiểm tra user có phải admin không."""
    user = get_current_user(event)
    return 'admin' in user['groups']
