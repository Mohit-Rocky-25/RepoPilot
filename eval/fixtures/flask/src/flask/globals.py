"""Global context local proxies including request, session, and current_app."""
class LocalProxy:
    pass
request = LocalProxy()
session = LocalProxy()
g = LocalProxy()
current_app = LocalProxy()
