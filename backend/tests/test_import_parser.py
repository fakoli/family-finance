from __future__ import annotations

from app.plugins.parsers.rocket_money import RocketMoneyParser


def test_detect_valid_csv(sample_csv: bytes):
    parser = RocketMoneyParser()
    assert parser.detect(sample_csv, "transactions.csv") is True


def test_detect_wrong_extension(sample_csv: bytes):
    parser = RocketMoneyParser()
    assert parser.detect(sample_csv, "data.xlsx") is False


def test_detect_wrong_header():
    parser = RocketMoneyParser()
    bad_csv = b"Name,Amount,Date\nFoo,10,2024-01-01\n"
    assert parser.detect(bad_csv, "data.csv") is False


async def test_parse_returns_correct_count(sample_csv: bytes):
    parser = RocketMoneyParser()
    rows = await parser.parse(sample_csv, "transactions.csv")
    assert len(rows) == 8


async def test_parse_row_structure(sample_csv: bytes):
    parser = RocketMoneyParser()
    rows = await parser.parse(sample_csv, "transactions.csv")

    first = rows[0]
    assert first["date"] == "2024-01-15"
    assert first["original_date"] == "2024-01-14"
    assert first["institution_name"] == "Chase"
    assert first["account_name"] == "Checking"
    assert first["account_type"] == "checking"
    assert first["merchant_name"] == "Starbucks"
    assert first["amount_cents"] == 450
    assert first["description"] == "STARBUCKS #1234"
    assert first["category_name"] == "Dining & Drinks"
    assert first["is_transfer"] is False


async def test_parse_identifies_transfers(sample_csv: bytes):
    parser = RocketMoneyParser()
    rows = await parser.parse(sample_csv, "transactions.csv")

    # Row 5 (index 4) is "Savings Transfer"
    savings_transfer = rows[4]
    assert savings_transfer["is_transfer"] is True
    assert savings_transfer["category_name"] == "Savings Transfer"

    # Row 8 (index 7) is "Credit Card Payment"
    cc_payment = rows[7]
    assert cc_payment["is_transfer"] is True


async def test_parse_negative_amount(sample_csv: bytes):
    parser = RocketMoneyParser()
    rows = await parser.parse(sample_csv, "transactions.csv")

    # Row 7 (index 6) is income with -3500.00
    income = rows[6]
    assert income["amount_cents"] == -350000
    assert income["category_name"] == "Income"


async def test_parse_credit_card_account_type(sample_csv: bytes):
    parser = RocketMoneyParser()
    rows = await parser.parse(sample_csv, "transactions.csv")

    # Row 2 (index 1) is Credit Card
    cc_row = rows[1]
    assert cc_row["account_type"] == "credit_card"
    assert cc_row["institution_name"] == "Citi"
