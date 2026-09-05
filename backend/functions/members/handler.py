"""
Lambda handler cho Family Member CRUD operations.
Routes:
  POST   /trees/{treeId}/members                           → add_member
  PUT    /trees/{treeId}/members/{memberId}                → update_member
  DELETE /trees/{treeId}/members/{memberId}                → delete_member
  POST   /trees/{treeId}/members/{memberId}/photo-url      → get_photo_url
"""
import json
import os
import logging
from datetime import datetime, timezone

import boto3

from shared.auth import require_admin, get_current_user
from shared.db import get_item, put_item, delete_item, query_by_pk, update_item
from shared.models import Member, Relationship, RelationshipType
from shared.response import success, error

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3')


def lambda_handler(event: dict, context) -> dict:
    """Main Lambda handler."""
    logger.info(f"Members event: method={event.get('httpMethod')}, path={event.get('path')}")
    try:
        method = event.get('httpMethod', '')
        path_params = event.get('pathParameters') or {}
        tree_id = path_params.get('treeId', '')
        member_id = path_params.get('memberId')
        path = event.get('path', '')

        if method == 'POST' and not member_id:
            return add_member(event, tree_id)
        elif method == 'PUT' and member_id:
            return update_member(event, tree_id, member_id)
        elif method == 'DELETE' and member_id:
            return delete_member(event, tree_id, member_id)
        elif method == 'POST' and member_id and 'photo-url' in path:
            return get_photo_url(event, tree_id, member_id)
        else:
            return error('Route not found', 404)
    except PermissionError as e:
        return error(str(e), 403)
    except ValueError as e:
        return error(str(e), 400)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        return error('Internal server error', 500)


def add_member(event: dict, tree_id: str) -> dict:
    """POST /trees/{treeId}/members — Thêm thành viên mới."""
    require_admin(event)
    
    # Verify tree exists
    tree_item = get_item(f'TREE#{tree_id}', 'META')
    if not tree_item:
        return error('Không tìm thấy gia phả', 404)
    
    body = json.loads(event.get('body') or '{}')
    
    # Validate required fields
    name = body.get('name', '').strip()
    gender = body.get('gender', '').strip()
    if not name:
        return error('Họ và tên không được để trống')
    if gender not in ('MALE', 'FEMALE'):
        return error('Giới tính phải là MALE hoặc FEMALE')
    
    related_member_id = body.get('relatedMemberId')
    relationship_type = body.get('relationshipType')
    
    # Nếu tree đã có members, bắt buộc phải có quan hệ
    existing_members = query_by_pk(f'TREE#{tree_id}', sk_prefix='MEMBER#')
    if existing_members and not (related_member_id and relationship_type):
        return error('Phải chọn thành viên liên quan và loại quan hệ')
    
    if relationship_type and relationship_type not in RelationshipType.ALL:
        return error(f'Loại quan hệ không hợp lệ. Cho phép: {RelationshipType.ALL}')
    
    # Validate related member exists
    if related_member_id:
        related_item = get_item(f'TREE#{tree_id}', f'MEMBER#{related_member_id}')
        if not related_item:
            return error('Không tìm thấy thành viên liên quan trong gia phả này')
        related_member = Member.from_dynamo(related_item)
    
    # Tính generation
    generation = 1
    if related_member_id and relationship_type:
        related_member = Member.from_dynamo(get_item(f'TREE#{tree_id}', f'MEMBER#{related_member_id}'))
        if relationship_type == RelationshipType.PARENT:
            generation = related_member.generation - 1
        elif relationship_type == RelationshipType.CHILD:
            generation = related_member.generation + 1
        else:  # SIBLING, SPOUSE
            generation = related_member.generation
    
    # Tạo Cognito user nếu có username
    cognito_username = body.get('cognitoUsername', '').strip() or None
    temp_password = body.get('tempPassword', '').strip() or None
    
    if cognito_username and temp_password:
        try:
            user_pool_id = os.environ['COGNITO_USER_POOL_ID']
            cognito.admin_create_user(
                UserPoolId=user_pool_id,
                Username=cognito_username,
                TemporaryPassword=temp_password,
                MessageAction='SUPPRESS',  # Không gửi email
                UserAttributes=[
                    {'Name': 'email', 'Value': cognito_username},
                    {'Name': 'name', 'Value': name},
                    {'Name': 'email_verified', 'Value': 'true'},
                ]
            )
            cognito.admin_add_user_to_group(
                UserPoolId=user_pool_id,
                Username=cognito_username,
                GroupName='user'
            )
            logger.info(f"Created Cognito user: {cognito_username}")
        except cognito.exceptions.UsernameExistsException:
            return error(f'Username {cognito_username} đã tồn tại')
        except Exception as e:
            logger.error(f"Cognito error: {str(e)}")
            return error('Lỗi khi tạo tài khoản Cognito')
    
    # Tạo Member
    member = Member(
        tree_id=tree_id,
        name=name,
        gender=gender,
        generation=generation,
        birth_date=body.get('birthDate'),
        death_date=body.get('deathDate'),
        phone=body.get('phone'),
        occupation=body.get('occupation'),
        address=body.get('address'),
        bio=body.get('bio'),
        cognito_username=cognito_username,
    )
    
    # Atomic write: member + relationships + user→tree mapping
    put_items = [member.to_dynamo()]
    
    if related_member_id and relationship_type:
        # Quan hệ từ new_member → related
        rel1 = Relationship(
            tree_id=tree_id,
            member_id1=member.member_id,
            member_id2=related_member_id,
            rel_type=relationship_type,
        )
        # Quan hệ ngược: related → new_member
        rel2 = Relationship(
            tree_id=tree_id,
            member_id1=related_member_id,
            member_id2=member.member_id,
            rel_type=RelationshipType.inverse(relationship_type),
        )
        put_items.extend([rel1.to_dynamo(), rel2.to_dynamo()])
    
    # USER→TREE mapping (nếu có Cognito user)
    if cognito_username:
        put_items.append({
            'PK': f'USER#{cognito_username}',
            'SK': f'TREE#{tree_id}',
            'treeId': tree_id,
            'memberId': member.member_id,
            'role': 'USER',
            'createdAt': member.created_at,
        })
    
    # Batch put tất cả items
    for item in put_items:
        put_item(item)
    
    response_data = member.to_api()
    if cognito_username and temp_password:
        response_data['credentials'] = {
            'username': cognito_username,
            'tempPassword': temp_password,
            'message': 'Hãy chia sẻ thông tin này cho thành viên để đăng nhập lần đầu'
        }
    
    logger.info(f"Added member {member.member_id} to tree {tree_id}")
    return success(response_data, 201)


def update_member(event: dict, tree_id: str, member_id: str) -> dict:
    """PUT /trees/{treeId}/members/{memberId} — Cập nhật thông tin thành viên."""
    require_admin(event)
    
    member_item = get_item(f'TREE#{tree_id}', f'MEMBER#{member_id}')
    if not member_item:
        return error('Không tìm thấy thành viên', 404)
    
    body = json.loads(event.get('body') or '{}')
    
    updatable_fields = ['name', 'gender', 'birthDate', 'deathDate', 'phone', 'occupation', 'address', 'bio']
    updates = {'updatedAt': datetime.now(timezone.utc).isoformat()}
    
    for field in updatable_fields:
        if field in body:
            if field == 'gender' and body[field] not in ('MALE', 'FEMALE'):
                return error('Giới tính phải là MALE hoặc FEMALE')
            updates[field] = body[field]
    
    updated = update_item(f'TREE#{tree_id}', f'MEMBER#{member_id}', updates)
    member = Member.from_dynamo(updated)
    
    return success(member.to_api())


def delete_member(event: dict, tree_id: str, member_id: str) -> dict:
    """DELETE /trees/{treeId}/members/{memberId} — Xóa thành viên."""
    require_admin(event)
    
    member_item = get_item(f'TREE#{tree_id}', f'MEMBER#{member_id}')
    if not member_item:
        return error('Không tìm thấy thành viên', 404)
    
    member = Member.from_dynamo(member_item)
    
    # Xóa Cognito user nếu có
    if member.cognito_username:
        try:
            cognito.admin_delete_user(
                UserPoolId=os.environ['COGNITO_USER_POOL_ID'],
                Username=member.cognito_username
            )
            # Xóa USER→TREE mapping
            delete_item(f'USER#{member.cognito_username}', f'TREE#{tree_id}')
            logger.info(f"Deleted Cognito user: {member.cognito_username}")
        except cognito.exceptions.UserNotFoundException:
            pass  # User đã bị xóa rồi
        except Exception as e:
            logger.warning(f"Could not delete Cognito user: {str(e)}")
    
    # Xóa member
    delete_item(f'TREE#{tree_id}', f'MEMBER#{member_id}')
    
    # Xóa tất cả relationships liên quan đến member này
    all_items = query_by_pk(f'TREE#{tree_id}', sk_prefix='REL#')
    for item in all_items:
        sk = item.get('SK', '')
        # REL#<id1>#<id2>
        parts = sk.split('#')
        if len(parts) >= 3 and (parts[1] == member_id or parts[2] == member_id):
            delete_item(item['PK'], item['SK'])
    
    # Xóa photo từ S3 nếu có
    if member.photo_key:
        try:
            s3.delete_object(
                Bucket=os.environ['PHOTOS_BUCKET'],
                Key=member.photo_key
            )
        except Exception as e:
            logger.warning(f"Could not delete photo: {str(e)}")
    
    logger.info(f"Deleted member {member_id} from tree {tree_id}")
    return success({'message': 'Thành viên đã được xóa', 'memberId': member_id})


def get_photo_url(event: dict, tree_id: str, member_id: str) -> dict:
    """POST /trees/{treeId}/members/{memberId}/photo-url — Tạo presigned URL upload ảnh."""
    require_admin(event)
    
    member_item = get_item(f'TREE#{tree_id}', f'MEMBER#{member_id}')
    if not member_item:
        return error('Không tìm thấy thành viên', 404)
    
    body = json.loads(event.get('body') or '{}')
    file_type = body.get('fileType', 'image/jpeg')  # MIME type
    
    # Tạo S3 key cho ảnh
    photo_key = f'photos/{tree_id}/{member_id}.jpg'
    
    # Tạo presigned URL (1 giờ)
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': os.environ['PHOTOS_BUCKET'],
            'Key': photo_key,
            'ContentType': file_type,
        },
        ExpiresIn=3600
    )
    
    # Cập nhật photoKey trong DynamoDB
    update_item(
        f'TREE#{tree_id}',
        f'MEMBER#{member_id}',
        {'photoKey': photo_key, 'updatedAt': datetime.now(timezone.utc).isoformat()}
    )
    
    return success({
        'uploadUrl': presigned_url,
        'photoKey': photo_key,
        'expiresIn': 3600,
    })
