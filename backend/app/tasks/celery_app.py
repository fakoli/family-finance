from __future__ import annotations

from celery import Celery
from celery.signals import worker_init

from app.config import settings

celery_app = Celery(
    "familyfinance",
    broker=settings.REDIS_URL,
    include=["app.tasks.import_tasks"],
)
celery_app.conf.update(
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "scan-import-directory": {
            "task": "app.tasks.import_tasks.scan_import_directory",
            "schedule": settings.IMPORT_SCAN_INTERVAL_SECONDS,
        },
    },
)

celery_app.autodiscover_tasks(["app.tasks"])


@worker_init.connect
def on_worker_init(**kwargs):  # type: ignore[no-untyped-def]
    """Discover plugins when the Celery worker starts."""
    from app.plugins import registry
    registry.discover()
