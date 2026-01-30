"""Middleware for JWT token processing and organization ID context management."""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from .org_context import set_organization_id


class JWTOrgIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # TODO: extract the organization id from the JWT token

        # Hard code the organization id for now.
        # Later we can get it from the JWT token.
        set_organization_id("0198d954-33a8-7939-93eb-fb3ed1317045")

        response = await call_next(request)
        return response
