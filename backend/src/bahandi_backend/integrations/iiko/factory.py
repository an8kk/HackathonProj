from __future__ import annotations

from ...settings import Settings
from .server_sink import IikoServerWriteOffSink, NotConfiguredWriteOffSink
from .types import WriteOffSink
from .web_client import IikoWebClient


def build_write_off_sink(settings: Settings) -> WriteOffSink:
    if settings.iiko_server_configured:
        return IikoServerWriteOffSink(settings)
    return NotConfiguredWriteOffSink()


def build_web_client(settings: Settings) -> IikoWebClient:
    return IikoWebClient(settings)
