import json
import os
import psycopg2


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def handler(event: dict, context) -> dict:
    """
    Управление сообщениями и чатами.
    GET /chats?user_id=... — список чатов пользователя с последним сообщением.
    POST /chats — создать чат между двумя пользователями.
    GET /messages?chat_id=...&after_id=... — сообщения чата.
    POST /messages — отправить сообщение.
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
    params = event.get('queryStringParameters') or {}
    conn = get_conn()
    cur = conn.cursor()

    try:
        if path.rstrip('/').endswith('/chats'):
            if method == 'GET':
                user_id = params.get('user_id')
                if not user_id:
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing user_id'})}

                cur.execute("""
                    SELECT
                        c.id,
                        u.id, u.name, u.username, u.avatar_url,
                        (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_msg,
                        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_time,
                        (SELECT id FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_id
                    FROM chats c
                    JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
                    JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s
                    JOIN users u ON u.id = cm2.user_id
                    ORDER BY last_time DESC NULLS LAST
                """, (user_id, user_id))

                rows = cur.fetchall()
                chats = [{
                    'id': r[0],
                    'partner': {'id': r[1], 'name': r[2], 'username': r[3], 'avatar_url': r[4]},
                    'last_message': r[5],
                    'last_time': str(r[6]) if r[6] else None,
                    'last_message_id': r[7]
                } for r in rows]
                return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(chats)}

            elif method == 'POST':
                body = json.loads(event.get('body', '{}'))
                user_a = body.get('user_id')
                user_b = body.get('partner_id')

                if not user_a or not user_b:
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing ids'})}

                # Проверяем что чат уже существует
                cur.execute("""
                    SELECT c.id FROM chats c
                    JOIN chat_members ma ON ma.chat_id = c.id AND ma.user_id = %s
                    JOIN chat_members mb ON mb.chat_id = c.id AND mb.user_id = %s
                """, (user_a, user_b))
                existing = cur.fetchone()
                if existing:
                    return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'chat_id': existing[0]})}

                cur.execute("INSERT INTO chats DEFAULT VALUES RETURNING id")
                chat_id = cur.fetchone()[0]
                cur.execute("INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s), (%s, %s)", (chat_id, user_a, chat_id, user_b))
                conn.commit()
                return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'chat_id': chat_id})}

        elif path.rstrip('/').endswith('/messages'):
            if method == 'GET':
                chat_id = params.get('chat_id')
                after_id = params.get('after_id', '0')
                if not chat_id:
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing chat_id'})}

                cur.execute("""
                    SELECT m.id, m.sender_id, m.text, m.created_at, u.name, u.avatar_url
                    FROM messages m
                    JOIN users u ON u.id = m.sender_id
                    WHERE m.chat_id = %s AND m.id > %s
                    ORDER BY m.created_at ASC
                    LIMIT 100
                """, (chat_id, after_id))

                rows = cur.fetchall()
                msgs = [{
                    'id': r[0], 'sender_id': r[1], 'text': r[2],
                    'created_at': str(r[3]), 'sender_name': r[4], 'sender_avatar': r[5]
                } for r in rows]
                return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps(msgs)}

            elif method == 'POST':
                body = json.loads(event.get('body', '{}'))
                chat_id = body.get('chat_id')
                sender_id = body.get('sender_id')
                text = body.get('text', '').strip()

                if not chat_id or not sender_id or not text:
                    return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'missing fields'})}

                cur.execute(
                    "INSERT INTO messages (chat_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                    (chat_id, sender_id, text)
                )
                row = cur.fetchone()
                conn.commit()
                return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'id': row[0], 'created_at': str(row[1])})}

    finally:
        cur.close()
        conn.close()

    return {'statusCode': 404, 'headers': cors, 'body': ''}
