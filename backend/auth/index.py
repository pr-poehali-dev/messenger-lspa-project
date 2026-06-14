import json
import os
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """
    Авторизация пользователя через Google.
    POST / — создаёт или обновляет пользователя по google_id, возвращает профиль.
    GET /?google_id=... — возвращает профиль пользователя.
    GET /all — возвращает всех пользователей (для поиска).
    """
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            google_id = body['google_id']
            email = body['email']
            name = body['name']
            avatar_url = body.get('picture', '')

            cur.execute("""
                INSERT INTO users (google_id, email, name, avatar_url)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (google_id) DO UPDATE
                  SET email = EXCLUDED.email,
                      name = CASE WHEN users.name = '' THEN EXCLUDED.name ELSE users.name END,
                      avatar_url = CASE WHEN users.avatar_url = '' THEN EXCLUDED.avatar_url ELSE users.avatar_url END
                RETURNING id, google_id, email, name, username, bio, avatar_url, created_at
            """, (google_id, email, name, avatar_url))
            row = cur.fetchone()
            conn.commit()

            user = {
                'id': row[0], 'google_id': row[1], 'email': row[2],
                'name': row[3], 'username': row[4], 'bio': row[5],
                'avatar_url': row[6], 'created_at': str(row[7])
            }
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(user)}

        elif method == 'GET' and path.rstrip('/').endswith('/all'):
            cur.execute("SELECT id, name, username, avatar_url FROM users ORDER BY name")
            rows = cur.fetchall()
            users = [{'id': r[0], 'name': r[1], 'username': r[2], 'avatar_url': r[3]} for r in rows]
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(users)}

        elif method == 'GET':
            params = event.get('queryStringParameters') or {}
            google_id = params.get('google_id')
            user_id = params.get('user_id')

            if google_id:
                cur.execute("SELECT id, google_id, email, name, username, bio, avatar_url, created_at FROM users WHERE google_id = %s", (google_id,))
            elif user_id:
                cur.execute("SELECT id, google_id, email, name, username, bio, avatar_url, created_at FROM users WHERE id = %s", (user_id,))
            else:
                return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing param'})}

            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'not found'})}

            user = {
                'id': row[0], 'google_id': row[1], 'email': row[2],
                'name': row[3], 'username': row[4], 'bio': row[5],
                'avatar_url': row[6], 'created_at': str(row[7])
            }
            return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(user)}

    finally:
        cur.close()
        conn.close()

    return {'statusCode': 405, 'headers': cors, 'body': ''}
