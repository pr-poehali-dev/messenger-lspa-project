import json
import os
import psycopg2
import re
import base64
import boto3


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """
    Управление профилем пользователя.
    POST /check-username — проверить уникальность username.
    POST /update — обновить профиль (name, username, bio, avatar base64).
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    path = event.get('path', '/')
    conn = get_conn()
    cur = conn.cursor()

    try:
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body if raw_body.strip() else '{}')

        if path.rstrip('/').endswith('/check-username'):
            username = body.get('username', '').strip().lower()
            if not re.match(r'^[a-z0-9_]{3,20}$', username):
                return {
                    'statusCode': 200,
                    'headers': {**cors, 'Content-Type': 'application/json'},
                    'body': json.dumps({'available': False, 'error': 'Только буквы a-z, цифры и _, от 3 до 20 символов'})
                }
            cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
            taken = cur.fetchone() is not None
            return {
                'statusCode': 200,
                'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'available': not taken})
            }

        elif path.rstrip('/').endswith('/update'):
            user_id = body.get('user_id')
            name = body.get('name', '').strip()
            username = body.get('username', '').strip().lower()
            bio = body.get('bio', '').strip()
            avatar_b64 = body.get('avatar_b64')

            if not user_id:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing user_id'})}

            if not re.match(r'^[a-z0-9_]{3,20}$', username):
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'invalid username'})}

            cur.execute("SELECT 1 FROM users WHERE username = %s AND id != %s", (username, user_id))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'username taken'})}

            avatar_url = None
            if avatar_b64:
                img_data = base64.b64decode(avatar_b64)
                s3 = boto3.client(
                    's3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                key = f'avatars/{user_id}.jpg'
                s3.put_object(Bucket='files', Key=key, Body=img_data, ContentType='image/jpeg')
                avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            if avatar_url:
                cur.execute(
                    "UPDATE users SET name=%s, username=%s, bio=%s, avatar_url=%s WHERE id=%s RETURNING id, name, username, bio, avatar_url",
                    (name, username, bio, avatar_url, user_id)
                )
            else:
                cur.execute(
                    "UPDATE users SET name=%s, username=%s, bio=%s WHERE id=%s RETURNING id, name, username, bio, avatar_url",
                    (name, username, bio, user_id)
                )

            row = cur.fetchone()
            conn.commit()

            if not row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'user not found'})}

            user = {'id': row[0], 'name': row[1], 'username': row[2], 'bio': row[3], 'avatar_url': row[4]}
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(user)}

    finally:
        cur.close()
        conn.close()

    return {'statusCode': 405, 'headers': cors, 'body': ''}