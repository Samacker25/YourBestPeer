"""Google OAuth2 connection flow for Calendar + Gmail scopes."""
import uuid
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user_id
from src.config import settings
from src.database import get_db
from src.models.integration import GoogleIntegration

router = APIRouter()

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]


class IntegrationStatus(BaseModel):
    connected: bool
    email: str | None = None
    scopes: list[str] = []
    connected_at: datetime | None = None


@router.get("/google/connect")
async def connect_google(
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> dict:
    """Return the Google OAuth2 URL the frontend should redirect to."""
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Google OAuth not configured — set GOOGLE_CLIENT_ID")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": " ".join(_SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": str(user_id),  # pass user_id through OAuth state
    }
    url = f"{_GOOGLE_AUTH_URL}?{urlencode(params)}"
    return {"auth_url": url}


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,  # user_id
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Exchange code for tokens, store them, redirect to frontend."""
    try:
        user_id = uuid.UUID(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post(_GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        if not token_resp.is_success:
            return RedirectResponse(f"{settings.frontend_url}/settings?integration=error")
        tokens = token_resp.json()

        # Fetch user email
        userinfo_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        email = userinfo_resp.json().get("email") if userinfo_resp.is_success else None

    # Upsert integration record
    result = await db.execute(select(GoogleIntegration).where(GoogleIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()

    expiry = None
    if tokens.get("expires_in"):
        from datetime import timedelta
        expiry = datetime.now(timezone.utc) + timedelta(seconds=tokens["expires_in"])

    if integration:
        integration.access_token = tokens["access_token"]
        if tokens.get("refresh_token"):
            integration.refresh_token = tokens["refresh_token"]
        integration.token_expiry = expiry
        integration.scopes = tokens.get("scope", "")
        integration.email = email
    else:
        integration = GoogleIntegration(
            user_id=user_id,
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            token_expiry=expiry,
            scopes=tokens.get("scope", ""),
            email=email,
        )
        db.add(integration)

    await db.flush()
    return RedirectResponse(f"{settings.frontend_url}/settings?integration=connected")


@router.delete("/google/disconnect")
async def disconnect_google(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(GoogleIntegration).where(GoogleIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    if integration:
        await db.delete(integration)
    return {"disconnected": True}


@router.get("/status", response_model=IntegrationStatus)
async def integration_status(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> IntegrationStatus:
    result = await db.execute(select(GoogleIntegration).where(GoogleIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    if not integration:
        return IntegrationStatus(connected=False)
    return IntegrationStatus(
        connected=True,
        email=integration.email,
        scopes=integration.scopes.split(),
        connected_at=integration.connected_at,
    )


async def get_google_token(user_id: uuid.UUID, db: AsyncSession) -> str | None:
    """Helper to get a valid access token, refreshing if needed."""
    result = await db.execute(select(GoogleIntegration).where(GoogleIntegration.user_id == user_id))
    integration = result.scalar_one_or_none()
    if not integration:
        return None

    now = datetime.now(timezone.utc)
    if integration.token_expiry and integration.token_expiry <= now:
        if not integration.refresh_token:
            return None
        async with httpx.AsyncClient() as client:
            r = await client.post(_GOOGLE_TOKEN_URL, data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": integration.refresh_token,
                "grant_type": "refresh_token",
            })
            if r.is_success:
                data = r.json()
                integration.access_token = data["access_token"]
                from datetime import timedelta
                integration.token_expiry = now + timedelta(seconds=data.get("expires_in", 3600))
                await db.flush()

    return integration.access_token
