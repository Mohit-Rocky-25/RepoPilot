class BadData(Exception):
    def __init__(self, message, payload=None):
        super().__init__(message)
        self.payload = payload

class BadSignature(BadData):
    pass

class BadTimeSignature(BadSignature):
    def __init__(self, message, payload=None, date_signed=None):
        super().__init__(message, payload=payload)
        self.date_signed = date_signed

class SignatureExpired(BadTimeSignature):
    pass
