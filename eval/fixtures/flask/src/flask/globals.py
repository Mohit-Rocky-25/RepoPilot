"""Global context local proxies including request, session, and current_app."""
class LocalProxy:
    pass

def request() -> LocalProxy:
    return LocalProxy()

def session() -> LocalProxy:
    return LocalProxy()

def current_app() -> LocalProxy:
    return LocalProxy()

def g() -> LocalProxy:
    return LocalProxy()
