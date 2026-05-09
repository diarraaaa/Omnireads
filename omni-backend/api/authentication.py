import jwt
import os
import base64
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import logging
from jwt import PyJWKClient

logger = logging.getLogger('api')


class SupabaseUser:
    """Minimal user object built from the decoded Supabase JWT."""
    def __init__(self, payload):
        self.id = payload.get("sub")        # Supabase user UUID
        self.email = payload.get("email", "")
        self.is_authenticated = True

    def __str__(self):
        return self.email


class SupabaseAuthentication(BaseAuthentication):
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.jwks_url = f"{self.supabase_url}/auth/v1/.well-known/jwks.json" if self.supabase_url else None
        self.jwks_client = PyJWKClient(self.jwks_url) if self.jwks_url else None

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ")[1]
        
        try:
            # Check token header to determine algorithm
            header = jwt.get_unverified_header(token)
            alg = header.get("alg")
            # print(f"Auth: Token algorithm: {alg}")

            if alg == "ES256" and self.jwks_client:
                # Use JWKS for ES256
                signing_key = self.jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256"],
                    audience="authenticated",
                    leeway=60,
                )
            else:
                # Fallback to HS256/Secret
                raw_secret = os.getenv("SUPABASE_JWT_SECRET")
                if not raw_secret:
                    logger.error("Auth: SUPABASE_JWT_SECRET not set")
                    return None

                try:
                    secret = base64.b64decode(raw_secret)
                except Exception:
                    secret = raw_secret

                try:
                    payload = jwt.decode(
                        token,
                        secret,
                        algorithms=["HS256", "HS384", "HS512"],
                        audience="authenticated",
                        leeway=60,
                    )
                except jwt.InvalidTokenError:
                    # Try raw if base64 failed
                    if secret != raw_secret:
                        payload = jwt.decode(
                            token,
                            raw_secret,
                            algorithms=["HS256", "HS384", "HS512"],
                            audience="authenticated",
                            leeway=60,
                        )
                    else:
                        raise

            return (SupabaseUser(payload), token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError as e:
            # If we're in dev mode, maybe this is a mock token. Let other authenticators try.
            if token == "mock-token" or token.count('.') < 2:
                return None
                
            import time
            current_time = time.time()
            try:
                header = jwt.get_unverified_header(token)
                unverified_payload = jwt.decode(token, options={"verify_signature": False})
                logger.warning(f"Auth: Invalid token: {e}. System time: {current_time}. Token iat: {unverified_payload.get('iat')}. Header: {header}")
            except Exception:
                logger.warning(f"Auth: Could not even decode token header: {e}")
                
            raise AuthenticationFailed(f"Invalid token: {e}")
        except Exception as e:
            with open("auth_error.log", "a") as f:
                f.write(f"\n--- AUTH ERROR at {timezone.now()} ---\n")
                f.write(f"Error: {str(e)}\n")
                import traceback
                f.write(traceback.format_exc())
            logger.exception(f"Auth: Unexpected error: {e}")
            raise AuthenticationFailed(f"Auth error: {e}")


class MockAuthentication(BaseAuthentication):
    """Bypass authentication for local development when Supabase is not configured."""
    def authenticate(self, request):
        # Only allow mock auth if explicitly enabled in settings/env and in DEBUG mode
        if os.getenv("DEBUG") != "True" or os.getenv("ALLOW_MOCK_AUTH") != "True":
            return None
            
        mock_payload = {
            "sub": "00000000-0000-0000-0000-000000000000",
            "email": "dev@omnireads.local"
        }
        return (SupabaseUser(mock_payload), "mock-token")
