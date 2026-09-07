"""
Lambda handler cho Family Tree CRUD operations.
Routes:
  POST   /trees                → create_tree
  GET    /trees                → list_trees
  GET    /trees/{treeId}       → get_tree
  PUT    /trees/{treeId}       → update_tree
  DELETE /trees/{treeId}       → delete_tree
"""
import json
import logging
from datetime import datetime, timezone

from shared.auth import get_current_user, is_admin, require_admin
from shared.db import delete_item, get_item, put_item, query_by_pk, query_gsi
from shared.models import FamilyTree
from shared.response import error, success

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event: dict, context) -> dict:
    """Main Lambda handler — route to appropriate function."""
    logger.info(f"Event: method={event.get('httpMethod')}, path={event.get('path')}")
    try:
        method = event.get('httpMethod', '')
        path_params = event.get('pathParameters') or {}
        tree_id = path_params.get('treeId')

        if method == 'POST' and not tree_id:
            return create_tree(event)
        elif method == 'GET' and not tree_id:
            return list_trees(event)
        elif method == 'GET' and tree_id:
            return get_tree(event, tree_id)
        elif method == 'PUT' and tree_id:
            return update_tree(event, tree_id)
        elif method == 'DELETE' and tree_id:
            return delete_tree(event, tree_id)
        else:
            return error('Route not found', 404)
    except PermissionError as e:
        return error(str(e), 403)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error('Internal server error', 500)


def create_tree(event: dict) -> dict:
    """POST /trees — Tạo family tree mới. Chỉ admin."""
    admin_username = require_admin(event)
    body = json.loads(event.get('body') or '{}')

    name = body.get('name', '').strip()
    if not name:
        return error('Tên gia phả không được để trống')

    tree = FamilyTree(
        name=name,
        description=body.get('description'),
        admin_id=admin_username,
    )

    # Lưu tree metadata
    put_item(tree.to_dynamo())

    # Lưu USER→TREE mapping
    put_item({
        'PK': f'USER#{admin_username}',
        'SK': f'TREE#{tree.tree_id}',
        'treeId': tree.tree_id,
        'role': 'ADMIN',
        'createdAt': tree.created_at,
    })

    logger.info(f"Created tree {tree.tree_id} by {admin_username}")
    return success(tree.to_api(), 201)


def list_trees(event: dict) -> dict:
    """GET /trees — Danh sách trees của current user."""
    user = get_current_user(event)

    # Tìm tất cả TREE# items của user này
    user_trees = query_by_pk(f'USER#{user["username"]}', sk_prefix='TREE#')

    trees = []
    for mapping in user_trees:
        tree_id = mapping.get('treeId') or mapping['SK'].replace('TREE#', '')
        tree_item = get_item(f'TREE#{tree_id}', 'META')
        if tree_item:
            tree = FamilyTree.from_dynamo(tree_item)
            tree_data = tree.to_api()
            tree_data['role'] = mapping.get('role', 'USER')
            trees.append(tree_data)

    return success({'trees': trees, 'count': len(trees)})


def get_tree(event: dict, tree_id: str) -> dict:
    """GET /trees/{treeId} — Chi tiết tree + members + relationships."""
    user = get_current_user(event)

    # Verify user có quyền xem tree này
    user_mapping = get_item(f'USER#{user["username"]}', f'TREE#{tree_id}')
    if not user_mapping and not is_admin(event):
        return error('Bạn không có quyền xem gia phả này', 403)

    # Lấy tree metadata
    tree_item = get_item(f'TREE#{tree_id}', 'META')
    if not tree_item:
        return error('Không tìm thấy gia phả', 404)

    tree = FamilyTree.from_dynamo(tree_item)

    # Lấy tất cả items trong tree (MEMBER# và REL#)
    all_items = query_by_pk(f'TREE#{tree_id}')

    members = []
    relationships = []
    for item in all_items:
        sk = item.get('SK', '')
        if sk.startswith('MEMBER#'):
            from shared.models import Member
            members.append(Member.from_dynamo(item).to_api())
        elif sk.startswith('REL#'):
            from shared.models import Relationship
            relationships.append(Relationship.from_dynamo(item).to_api())

    result = tree.to_api()
    result['members'] = members
    result['relationships'] = relationships

    return success(result)


def update_tree(event: dict, tree_id: str) -> dict:
    """PUT /trees/{treeId} — Cập nhật tree info. Chỉ admin."""
    require_admin(event)

    tree_item = get_item(f'TREE#{tree_id}', 'META')
    if not tree_item:
        return error('Không tìm thấy gia phả', 404)

    body = json.loads(event.get('body') or '{}')

    updates = {'updatedAt': datetime.now(timezone.utc).isoformat()}
    if 'name' in body and body['name'].strip():
        updates['name'] = body['name'].strip()
    if 'description' in body:
        updates['description'] = body['description']

    if len(updates) <= 1:  # Chỉ có updatedAt
        return error('Không có thông tin nào để cập nhật')

    from shared.db import update_item
    updated = update_item(f'TREE#{tree_id}', 'META', updates)
    tree = FamilyTree.from_dynamo(updated)

    return success(tree.to_api())


def delete_tree(event: dict, tree_id: str) -> dict:
    """DELETE /trees/{treeId} — Xóa tree + cascade delete members + relationships."""
    require_admin(event)

    tree_item = get_item(f'TREE#{tree_id}', 'META')
    if not tree_item:
        return error('Không tìm thấy gia phả', 404)

    # Lấy tất cả items trong tree
    all_items = query_by_pk(f'TREE#{tree_id}')

    # Xóa tất cả items (batch delete)
    for item in all_items:
        delete_item(item['PK'], item['SK'])

    # Xóa USER→TREE mappings (cần query GSI)
    user_mappings = query_gsi(f'TREE#{tree_id}')
    for mapping in user_mappings:
        delete_item(mapping['PK'], mapping['SK'])

    logger.info(f"Deleted tree {tree_id} with {len(all_items)} items")
    return success({'message': 'Gia phả đã được xóa thành công', 'treeId': tree_id})
