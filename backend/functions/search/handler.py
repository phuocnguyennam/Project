"""
Lambda handler cho Member Search.
Route: GET /trees/{treeId}/members/search?q=<query>
"""
import os
import logging

from shared.auth import get_current_user, is_admin
from shared.db import get_item, query_by_pk
from shared.models import Member
from shared.response import success, error

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Search members by name within a tree."""
    try:
        user = get_current_user(event)
        path_params = event.get('pathParameters') or {}
        tree_id = path_params.get('treeId', '')
        query_params = event.get('queryStringParameters') or {}
        query = query_params.get('q', '').strip().lower()
        
        if not query:
            return error('Tham số tìm kiếm `q` không được để trống')
        
        if len(query) < 2:
            return error('Từ khóa tìm kiếm phải có ít nhất 2 ký tự')
        
        # Verify user có quyền xem tree này
        user_mapping = get_item(f'USER#{user["username"]}', f'TREE#{tree_id}')
        if not user_mapping and not is_admin(event):
            return error('Bạn không có quyền tìm kiếm trong gia phả này', 403)
        
        # Verify tree exists
        tree_item = get_item(f'TREE#{tree_id}', 'META')
        if not tree_item:
            return error('Không tìm thấy gia phả', 404)
        
        # Lấy tất cả members trong tree
        member_items = query_by_pk(f'TREE#{tree_id}', sk_prefix='MEMBER#')
        
        # Filter theo tên (case-insensitive contains search)
        results = []
        for item in member_items:
            member = Member.from_dynamo(item)
            if query in member.name.lower():
                results.append(member.to_api())
        
        # Sort theo relevance: starts with > contains
        results.sort(
            key=lambda m: (0 if m['name'].lower().startswith(query) else 1, m['name'])
        )
        
        logger.info(f"Search '{query}' in tree {tree_id}: found {len(results)} results")
        return success({
            'query': query,
            'results': results,
            'count': len(results)
        })
    
    except PermissionError as e:
        return error(str(e), 403)
    except Exception as e:
        logger.error(f"Search error: {str(e)}", exc_info=True)
        return error('Internal server error', 500)
