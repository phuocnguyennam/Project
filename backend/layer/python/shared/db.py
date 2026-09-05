import os, boto3
from boto3.dynamodb.conditions import Key
from typing import Optional

_table = None

def get_table():
    """Get DynamoDB table resource (lazy init, reused across Lambda invocations)."""
    global _table
    if _table is None:
        dynamodb = boto3.resource('dynamodb')
        _table = dynamodb.Table(os.environ['TABLE_NAME'])
    return _table

def put_item(item: dict) -> None:
    get_table().put_item(Item=item)

def get_item(pk: str, sk: str) -> Optional[dict]:
    resp = get_table().get_item(Key={'PK': pk, 'SK': sk})
    return resp.get('Item')

def delete_item(pk: str, sk: str) -> None:
    get_table().delete_item(Key={'PK': pk, 'SK': sk})

def query_by_pk(pk: str, sk_prefix: str = None) -> list:
    """Query tất cả items theo PK, optional filter theo SK prefix."""
    if sk_prefix:
        resp = get_table().query(
            KeyConditionExpression=Key('PK').eq(pk) & Key('SK').begins_with(sk_prefix)
        )
    else:
        resp = get_table().query(
            KeyConditionExpression=Key('PK').eq(pk)
        )
    return resp.get('Items', [])

def query_gsi(sk: str, pk_prefix: str = None) -> list:
    """Query GSI1 theo SK (inverted index), optional filter theo PK prefix."""
    if pk_prefix:
        resp = get_table().query(
            IndexName='GSI1-SK-PK',
            KeyConditionExpression=Key('SK').eq(sk) & Key('PK').begins_with(pk_prefix)
        )
    else:
        resp = get_table().query(
            IndexName='GSI1-SK-PK',
            KeyConditionExpression=Key('SK').eq(sk)
        )
    return resp.get('Items', [])

def transact_write(put_items: list = None, delete_keys: list = None) -> None:
    """Atomic write: put nhiều items và/hoặc delete nhiều items."""
    table_name = os.environ['TABLE_NAME']
    transaction_items = []
    for item in (put_items or []):
        transaction_items.append({'Put': {'TableName': table_name, 'Item': item}})
    for key in (delete_keys or []):
        transaction_items.append({'Delete': {'TableName': table_name, 'Key': key}})
    if transaction_items:
        boto3.client('dynamodb').transact_write_items(TransactItems=transaction_items)

def update_item(pk: str, sk: str, updates: dict) -> dict:
    """Update specific attributes của một item."""
    update_expr_parts = []
    expr_attr_names = {}
    expr_attr_values = {}
    for i, (key, value) in enumerate(updates.items()):
        placeholder = f'#attr{i}'
        value_placeholder = f':val{i}'
        update_expr_parts.append(f'{placeholder} = {value_placeholder}')
        expr_attr_names[placeholder] = key
        expr_attr_values[value_placeholder] = value
    update_expression = 'SET ' + ', '.join(update_expr_parts)
    resp = get_table().update_item(
        Key={'PK': pk, 'SK': sk},
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values,
        ReturnValues='ALL_NEW'
    )
    return resp.get('Attributes', {})
