import time
from itsdangerous.signer import Signer
from itsdangerous.serializer import Serializer
from itsdangerous.exc import SignatureExpired, BadTimeSignature

class TimestampSigner(Signer):
    def get_timestamp(self) -> int:
        return int(time.time())

    def timestamp_to_datetime(self, ts: int):
        import datetime
        return datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)

    def sign(self, value: bytes) -> bytes:
        timestamp = str(self.get_timestamp()).encode("ascii")
        value = value + self.sep + timestamp
        return value + self.sep + self.get_signature(value)

    def unsign(self, signed_value: bytes, max_age: int = None, return_timestamp: bool = False):
        result = super().unsign(signed_value)
        if self.sep not in result:
            raise BadTimeSignature("Missing timestamp", payload=result)
        value, timestamp_bytes = result.rsplit(self.sep, 1)
        try:
            timestamp = int(timestamp_bytes.decode("ascii"))
        except ValueError:
            raise BadTimeSignature("Malformed timestamp", payload=value)
        if max_age is not None:
            age = self.get_timestamp() - timestamp
            if age > max_age:
                raise SignatureExpired(f"Signature age {age} exceeds {max_age}", payload=value, date_signed=timestamp)
        if return_timestamp:
            return value, timestamp
        return value

class TimedSerializer(Serializer):
    default_signer = TimestampSigner

    def loads(self, s, max_age=None, return_timestamp=False):
        signer = self.make_signer()
        base64d, timestamp = signer.unsign(s.encode("utf-8"), max_age=max_age, return_timestamp=True)
        payload = self.load_payload(base64d)
        if return_timestamp:
            return payload, timestamp
        return payload
