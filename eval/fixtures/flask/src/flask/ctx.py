class RequestContext:
    def __init__(self, app, environ):
        self.app = app
        self.request = None
class AppContext:
    def __init__(self, app):
        self.app = app
