import os

from shared.db import delete_item, get_item, get_table, put_item, query_by_pk, query_gsi, update_item


def test_get_table(dynamodb_table):
    t = get_table()
    assert t.name == 'test-table'

def test_put_and_get_item(dynamodb_table):
    put_item({'PK': 'T1', 'SK': 'M1', 'val': 123})
    item = get_item('T1', 'M1')
    assert item is not None
    assert item['val'] == 123

def test_delete_item(dynamodb_table):
    put_item({'PK': 'T1', 'SK': 'M1'})
    delete_item('T1', 'M1')
    assert get_item('T1', 'M1') is None

def test_query_by_pk(dynamodb_table):
    put_item({'PK': 'T1', 'SK': 'A1'})
    put_item({'PK': 'T1', 'SK': 'B1'})
    put_item({'PK': 'T2', 'SK': 'A1'})
    items = query_by_pk('T1')
    assert len(items) == 2

def test_query_by_pk_with_prefix(dynamodb_table):
    put_item({'PK': 'T1', 'SK': 'A1'})
    put_item({'PK': 'T1', 'SK': 'A2'})
    put_item({'PK': 'T1', 'SK': 'B1'})
    items = query_by_pk('T1', 'A')
    assert len(items) == 2

def test_query_gsi(dynamodb_table):
    put_item({'PK': 'P1', 'SK': 'S1'})
    put_item({'PK': 'P2', 'SK': 'S1'})
    items = query_gsi('S1')
    assert len(items) == 2

def test_query_gsi_with_prefix(dynamodb_table):
    put_item({'PK': 'A1', 'SK': 'S1'})
    put_item({'PK': 'A2', 'SK': 'S1'})
    put_item({'PK': 'B1', 'SK': 'S1'})
    items = query_gsi('S1', 'A')
    assert len(items) == 2

def test_update_item(dynamodb_table):
    put_item({'PK': 'T1', 'SK': 'S1', 'old': 1})
    updated = update_item('T1', 'S1', {'new': 2})
    assert updated['new'] == 2
    item = get_item('T1', 'S1')
    assert item['new'] == 2
    assert item['old'] == 1

def test_transact_write(dynamodb_table):
    # Pre-seed item to delete
    put_item({'PK': 'T2', 'SK': 'S2', 'data': 'to-delete'})

    # db.py transact_write uses boto3 low-level client → requires DynamoDB typed format
    import boto3 as _boto3
    table_name = os.environ['TABLE_NAME']
    _boto3.client('dynamodb', region_name='us-east-1').transact_write_items(TransactItems=[
        {'Put': {'TableName': table_name, 'Item': {
            'PK': {'S': 'T1'}, 'SK': {'S': 'S1'}, 'a': {'N': '1'},
        }}},
        {'Delete': {'TableName': table_name, 'Key': {
            'PK': {'S': 'T2'}, 'SK': {'S': 'S2'},
        }}},
    ])
    assert get_item('T1', 'S1') is not None
    assert get_item('T2', 'S2') is None
