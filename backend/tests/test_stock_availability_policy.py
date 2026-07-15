from datetime import date, datetime, timezone
import unittest

from app.models.item import Item
from app.models.stock_batch import StockBatch
from app.services.stock_availability_policy import (
    is_stock_batch_usable,
    operational_today,
)


class StockAvailabilityPolicyTests(unittest.TestCase):
    def test_operational_today_uses_sao_paulo_date_boundary(self):
        before_midnight_in_sao_paulo = datetime(
            2026,
            7,
            15,
            2,
            59,
            tzinfo=timezone.utc,
        )
        after_midnight_in_sao_paulo = datetime(
            2026,
            7,
            15,
            3,
            0,
            tzinfo=timezone.utc,
        )

        self.assertEqual(
            operational_today(before_midnight_in_sao_paulo),
            date(2026, 7, 14),
        )
        self.assertEqual(
            operational_today(after_midnight_in_sao_paulo),
            date(2026, 7, 15),
        )

    def test_operational_today_rejects_ambiguous_naive_datetime(self):
        with self.assertRaisesRegex(ValueError, "fuso horario"):
            operational_today(datetime(2026, 7, 15, 0, 0))

    def test_future_entry_is_not_usable_by_instance_policy(self):
        operational_date = date(2026, 7, 14)
        item = Item(is_active=True, tracks_expiration=False)
        batch = StockBatch(
            current_quantity=5,
            entry_date=operational_date.replace(day=15),
            expiration_date=None,
        )

        self.assertFalse(
            is_stock_batch_usable(
                batch=batch,
                item=item,
                operational_date=operational_date,
            )
        )
