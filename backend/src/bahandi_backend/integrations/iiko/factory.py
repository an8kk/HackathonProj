from __future__ import annotations

from ...settings import Settings
from .server_sink import IikoServerWriteOffSink, NotConfiguredWriteOffSink, SimulatedWriteOffSink
from .types import WriteOffSink


def build_write_off_sink(settings: Settings) -> WriteOffSink:
    if settings.iiko_server_configured:
        return IikoServerWriteOffSink(settings)
    if settings.iiko_simulate:
        return SimulatedWriteOffSink()
    return NotConfiguredWriteOffSink()
