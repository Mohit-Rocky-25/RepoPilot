import json
from itsdangerous.signer import Signer

class Serializer:
    default_signer = Signer
    default_serializer = json

    def __init__(self, secret_key, salt=b"itsdangerous", serializer=None, signer=None, signer_kwargs=None):
        self.secret_key = secret_key
        self.salt = salt
        self.serializer = serializer or self.default_serializer
        self.signer = signer or self.default_signer
        self.signer_kwargs = signer_kwargs or {}

    def load_payload(self, payload, serializer=None):
        if serializer is None:
            serializer = self.serializer
        return serializer.loads(payload)

    def dump_payload(self, obj):
        return self.serializer.dumps(obj).encode("utf-8")

    def make_signer(self, salt=None):
        if salt is None:
            salt = self.salt
        return self.signer(self.secret_key, salt=salt, **self.signer_kwargs)

    def dumps(self, obj):
        payload = self.dump_payload(obj)
        signer = self.make_signer()
        return signer.sign(payload).decode("utf-8")

    def loads(self, s):
        signer = self.make_signer()
        payload = signer.unsign(s.encode("utf-8"))
        return self.load_payload(payload)
