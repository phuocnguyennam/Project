import json
from decimal import Decimal

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
}


class _DecimalEncoder(json.JSONEncoder):
    """DynamoDB trả về Decimal cho số nguyên — convert sang int/float khi JSON serialize."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj == int(obj) else float(obj)
        return super().default(obj)


def success(data: any, status_code: int = 200) -> dict:
    """Tạo API response thành công với CORS headers."""
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(data, cls=_DecimalEncoder)
    }

def error(message: str, status_code: int = 400, details: dict = None) -> dict:
    """Tạo API response lỗi với CORS headers."""
    error_body = {'message': message}
    if details is not None:
        error_body['details'] = details
    return {
        'statusCode': status_code,
        'headers': CORS_HEADERS,
        'body': json.dumps(error_body, cls=_DecimalEncoder)
    }
