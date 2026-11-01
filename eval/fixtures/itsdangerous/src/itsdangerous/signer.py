import hashlib
import hmac
from itsdangerous.exc import BadSignature

class SigningAlgorithm:
    def get_signature(self, key: bytes, value: bytes) -> bytes:
        raise NotImplementedError()

    def verify_signature(self, key: bytes, value: bytes, sig: bytes) -> bool:
        return hmac.compare_digest(self.get_signature(key, value), sig)

class HMACAlgorithm(SigningAlgorithm):
    default_digest_method = staticmethod(hashlib.sha1)

    def __init__(self, digest_method=None):
        if digest_method is None:
            digest_method = self.default_digest_method
        self.digest_method = digest_method

    def get_signature(self, key: bytes, value: bytes) -> bytes:
        mac = hmac.new(key, msg=value, digestmod=self.digest_method)
        return mac.digest()

class Signer:
    default_separator = b"."
    default_key_derivation = "django-concat"
    default_digest_method = staticmethod(hashlib.sha1)
    default_algorithm = HMACAlgorithm

    def __init__(self, secret_key, salt=b"itsdangerous.Signer", sep=b".", key_derivation=None, digest_method=None, algorithm=None):
        self.secret_key = secret_key
        self.salt = salt
        self.sep = sep
        self.algorithm = algorithm() if algorithm else self.default_algorithm(digest_method)

    def get_signature(self, value: bytes) -> bytes:
        return self.algorithm.get_signature(self.secret_key, value)

    def sign(self, value: bytes) -> bytes:
        return value + self.sep + self.get_signature(value)

    def verify_signature(self, value: bytes, sig: bytes) -> bool:
        return self.algorithm.verify_signature(self.secret_key, value, sig)

    def unsign(self, signed_value: bytes) -> bytes:
        if self.sep not in signed_value:
            raise BadSignature(f"No {self.sep!r} found in value")
        value, sig = signed_value.rsplit(self.sep, 1)
        if self.verify_signature(value, sig):
            return value
        raise BadSignature(f"Signature {sig!r} does not match", payload=value)
