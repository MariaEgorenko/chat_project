user_sessions = {} 
def create_session(login: str, user_id: str) -> str:
    import hashlib
    salt = hashlib.md5(b'salt').hexdigest()
    session_id = hashlib.md5(f"{login}{salt}".encode()).hexdigest()
    user_sessions[session_id] = {
        "login": login,
        "user_id": user_id
    }
    return session_id

def get_user_from_session(session_id: str) -> str:
    return user_sessions.get(session_id)

def delete_session(session_id: str):
    user_sessions.pop(session_id, None)