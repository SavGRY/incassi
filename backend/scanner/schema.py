import enum

from pydantic import BaseModel

__all__ = ["ScannerResponse", "ScannerStatus"]


class ScannerStatus(enum.Enum):
    """
    The eSCL states a scanner reports; only `Idle` can take a scan
    """

    IDLE = "Idle"
    PROCESSING = "Processing"
    TESTING = "Testing"
    STOPPED = "Stopped"
    DOWN = "Down"


class ScannerResponse(BaseModel):
    info: str
    scanner_status: ScannerStatus
