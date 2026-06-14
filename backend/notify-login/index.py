import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


def handler(event: dict, context) -> dict:
    '''
    Принимает данные о входе пользователя через Google и отправляет их на почту администратора по SMTP.
    Args: event с httpMethod, body (name, email, picture, provider); context с request_id
    Returns: HTTP-ответ со статусом отправки письма
    '''
    method = event.get('httpMethod', 'GET')

    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors_headers, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'})
        }

    body_data = json.loads(event.get('body', '{}'))
    user_name = body_data.get('name', 'Неизвестно')
    user_email = body_data.get('email', 'Неизвестно')
    user_picture = body_data.get('picture', '')
    provider = body_data.get('provider', 'Google')

    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    if not smtp_user or not smtp_password:
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'SMTP credentials not configured'})
        }

    recipient = 'kayoshialis@gmail.com'
    now = datetime.now().strftime('%d.%m.%Y %H:%M:%S')

    html = f'''
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
      <div style="background: #000; color: #fff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 22px; letter-spacing: 1px;">ЛСПА — новый вход</h2>
      </div>
      <div style="padding: 24px;">
        <p style="margin: 0 0 16px; color: #555;">В мессенджер вошёл новый пользователь:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #888;">Имя</td><td style="padding: 8px 0; font-weight: 600;">{user_name}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Email</td><td style="padding: 8px 0; font-weight: 600;">{user_email}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Способ входа</td><td style="padding: 8px 0; font-weight: 600;">{provider}</td></tr>
          <tr><td style="padding: 8px 0; color: #888;">Время</td><td style="padding: 8px 0; font-weight: 600;">{now}</td></tr>
        </table>
      </div>
    </div>
    '''

    msg = MIMEMultipart('alternative')
    msg['Subject'] = f'ЛСПА: новый вход — {user_name}'
    msg['From'] = smtp_user
    msg['To'] = recipient
    msg.attach(MIMEText(html, 'html'))

    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, recipient, msg.as_string())

    return {
        'statusCode': 200,
        'headers': {**cors_headers, 'Content-Type': 'application/json'},
        'body': json.dumps({'success': True})
    }
