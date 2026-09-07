import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


class RelationshipType:
    PARENT = 'PARENT'
    CHILD = 'CHILD'
    SIBLING = 'SIBLING'
    SPOUSE = 'SPOUSE'
    ALL = ['PARENT', 'CHILD', 'SIBLING', 'SPOUSE']

    @classmethod
    def inverse(cls, rel_type: str) -> str:
        """Trả về quan hệ ngược: PARENT↔CHILD, SIBLING↔SIBLING, SPOUSE↔SPOUSE"""
        mapping = {
            'PARENT': 'CHILD',
            'CHILD': 'PARENT',
            'SIBLING': 'SIBLING',
            'SPOUSE': 'SPOUSE'
        }
        return mapping.get(rel_type, rel_type)

@dataclass
class Member:
    tree_id: str
    member_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ''
    gender: str = ''  # MALE | FEMALE
    birth_date: Optional[str] = None
    death_date: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None
    bio: Optional[str] = None
    generation: int = 1
    photo_key: Optional[str] = None
    cognito_username: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dynamo(self) -> dict:
        """Convert sang DynamoDB item format với PK/SK."""
        item = {
            'PK': f'TREE#{self.tree_id}',
            'SK': f'MEMBER#{self.member_id}',
            'memberId': self.member_id,
            'treeId': self.tree_id,
            'name': self.name,
            'gender': self.gender,
            'generation': self.generation,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
        }
        # Chỉ thêm optional fields nếu có giá trị
        optional_fields = {
            'birthDate': self.birth_date,
            'deathDate': self.death_date,
            'phone': self.phone,
            'occupation': self.occupation,
            'address': self.address,
            'bio': self.bio,
            'photoKey': self.photo_key,
            'cognitoUsername': self.cognito_username,
        }
        for k, v in optional_fields.items():
            if v is not None:
                item[k] = v
        return item

    @classmethod
    def from_dynamo(cls, item: dict) -> 'Member':
        """Tạo Member từ DynamoDB item."""
        # Extract treeId and memberId from SK
        sk = item.get('SK', '')
        member_id = item.get('memberId') or sk.replace('MEMBER#', '')
        pk = item.get('PK', '')
        tree_id = item.get('treeId') or pk.replace('TREE#', '')
        return cls(
            tree_id=tree_id,
            member_id=member_id,
            name=item.get('name', ''),
            gender=item.get('gender', ''),
            birth_date=item.get('birthDate'),
            death_date=item.get('deathDate'),
            phone=item.get('phone'),
            occupation=item.get('occupation'),
            address=item.get('address'),
            bio=item.get('bio'),
            generation=item.get('generation', 1),
            photo_key=item.get('photoKey'),
            cognito_username=item.get('cognitoUsername'),
            created_at=item.get('createdAt', ''),
            updated_at=item.get('updatedAt', ''),
        )

    def to_api(self) -> dict:
        """Convert sang API response format (camelCase)."""
        data = {
            'memberId': self.member_id,
            'treeId': self.tree_id,
            'name': self.name,
            'gender': self.gender,
            'generation': self.generation,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
        }
        if self.birth_date:
            data['birthDate'] = self.birth_date
        if self.death_date:
            data['deathDate'] = self.death_date
        if self.phone:
            data['phone'] = self.phone
        if self.occupation:
            data['occupation'] = self.occupation
        if self.address:
            data['address'] = self.address
        if self.bio:
            data['bio'] = self.bio
        if self.photo_key:
            data['photoKey'] = self.photo_key
        if self.cognito_username:
            data['cognitoUsername'] = self.cognito_username
        return data

@dataclass
class FamilyTree:
    tree_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ''
    description: Optional[str] = None
    admin_id: str = ''
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dynamo(self) -> dict:
        item = {
            'PK': f'TREE#{self.tree_id}',
            'SK': 'META',
            'treeId': self.tree_id,
            'name': self.name,
            'adminId': self.admin_id,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
        }
        if self.description:
            item['description'] = self.description
        return item

    @classmethod
    def from_dynamo(cls, item: dict) -> 'FamilyTree':
        pk = item.get('PK', '')
        tree_id = item.get('treeId') or pk.replace('TREE#', '')
        return cls(
            tree_id=tree_id,
            name=item.get('name', ''),
            description=item.get('description'),
            admin_id=item.get('adminId', ''),
            created_at=item.get('createdAt', ''),
            updated_at=item.get('updatedAt', ''),
        )

    def to_api(self) -> dict:
        data = {
            'treeId': self.tree_id,
            'name': self.name,
            'adminId': self.admin_id,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
        }
        if self.description:
            data['description'] = self.description
        return data

@dataclass
class Relationship:
    tree_id: str
    member_id1: str
    member_id2: str
    rel_type: str  # PARENT | CHILD | SIBLING | SPOUSE
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dynamo(self) -> dict:
        return {
            'PK': f'TREE#{self.tree_id}',
            'SK': f'REL#{self.member_id1}#{self.member_id2}',
            'treeId': self.tree_id,
            'memberId1': self.member_id1,
            'memberId2': self.member_id2,
            'type': self.rel_type,
            'createdAt': self.created_at,
        }

    @classmethod
    def from_dynamo(cls, item: dict) -> 'Relationship':
        return cls(
            tree_id=item.get('treeId', ''),
            member_id1=item.get('memberId1', ''),
            member_id2=item.get('memberId2', ''),
            rel_type=item.get('type', ''),
            created_at=item.get('createdAt', ''),
        )

    def to_api(self) -> dict:
        return {
            'memberId1': self.member_id1,
            'memberId2': self.member_id2,
            'type': self.rel_type,
        }
