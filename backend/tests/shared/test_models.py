import pytest
from shared.models import RelationshipType, Member, FamilyTree, Relationship

def test_relationship_type_inverse():
    assert RelationshipType.inverse('PARENT') == 'CHILD'
    assert RelationshipType.inverse('CHILD') == 'PARENT'
    assert RelationshipType.inverse('SIBLING') == 'SIBLING'
    assert RelationshipType.inverse('SPOUSE') == 'SPOUSE'
    assert RelationshipType.inverse('UNKNOWN') == 'UNKNOWN'

def test_member_default():
    m = Member(tree_id='t1')
    assert m.tree_id == 't1'
    assert m.member_id is not None
    assert m.generation == 1

def test_member_to_dynamo():
    m = Member(tree_id='t1', member_id='m1', name='John', gender='MALE', generation=2)
    d = m.to_dynamo()
    assert d['PK'] == 'TREE#t1'
    assert d['SK'] == 'MEMBER#m1'
    assert d['name'] == 'John'
    assert d['generation'] == 2

def test_member_from_dynamo():
    d = {'PK': 'TREE#t1', 'SK': 'MEMBER#m1', 'name': 'John', 'gender': 'MALE', 'generation': 2}
    m = Member.from_dynamo(d)
    assert m.tree_id == 't1'
    assert m.member_id == 'm1'
    assert m.name == 'John'
    assert m.generation == 2

def test_member_to_api():
    m = Member(tree_id='t1', member_id='m1', name='John', gender='MALE')
    api = m.to_api()
    assert api['treeId'] == 't1'
    assert api['memberId'] == 'm1'

def test_family_tree_to_dynamo():
    t = FamilyTree(tree_id='t1', name='Tree', admin_id='admin', description='Desc')
    d = t.to_dynamo()
    assert d['PK'] == 'TREE#t1'
    assert d['SK'] == 'META'
    assert d['description'] == 'Desc'

def test_family_tree_from_dynamo():
    d = {'PK': 'TREE#t1', 'SK': 'META', 'name': 'Tree', 'adminId': 'admin', 'description': 'Desc'}
    t = FamilyTree.from_dynamo(d)
    assert t.tree_id == 't1'
    assert t.name == 'Tree'
    assert t.description == 'Desc'
    assert t.admin_id == 'admin'

def test_family_tree_to_api():
    t = FamilyTree(tree_id='t1', name='Tree')
    api = t.to_api()
    assert api['treeId'] == 't1'
    assert 'description' not in api

def test_relationship_to_dynamo():
    r = Relationship(tree_id='t1', member_id1='m1', member_id2='m2', rel_type='PARENT')
    d = r.to_dynamo()
    assert d['PK'] == 'TREE#t1'
    assert d['SK'] == 'REL#m1#m2'
    assert d['type'] == 'PARENT'

def test_relationship_from_dynamo():
    d = {'treeId': 't1', 'memberId1': 'm1', 'memberId2': 'm2', 'type': 'CHILD'}
    r = Relationship.from_dynamo(d)
    assert r.tree_id == 't1'
    assert r.member_id1 == 'm1'
    assert r.rel_type == 'CHILD'

def test_relationship_to_api():
    r = Relationship(tree_id='t1', member_id1='m1', member_id2='m2', rel_type='SPOUSE')
    api = r.to_api()
    assert api['memberId1'] == 'm1'
    assert api['memberId2'] == 'm2'
    assert api['type'] == 'SPOUSE'
