#!/usr/bin/env python3
"""
sponsor_manager.py - track ALL your sponsors / brand deals in one place.

Data is stored locally in sponsors.json (git-ignored so your deals stay
private). No external packages needed - pure standard library.

Quick start:
    python3 sponsor_manager.py add "Nike India" \
        --contact priya@nike.in --amount 25000 --currency INR \
        --deliverables "1 reel, 1 story set" --deadline 2026-08-10

    python3 sponsor_manager.py list
    python3 sponsor_manager.py list --status active
    python3 sponsor_manager.py set-status f3a9c1 paid
    python3 sponsor_manager.py summary
    python3 sponsor_manager.py export sponsors.csv

Status flow:  lead -> negotiating -> active -> delivered -> paid
              (or "cancelled" if things fall through)
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import uuid
from datetime import datetime, timezone, date

DEFAULT_DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sponsors.json")
STATUSES = ["lead", "negotiating", "active", "delivered", "paid", "cancelled"]
UPCOMING_DAYS = 14  # deadlines this close get flagged in `summary`


# --------------------------------------------------------------------------
# storage
# --------------------------------------------------------------------------
def load_db(path: str) -> list:
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return []


def save_db(path: str, deals: list) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(deals, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, path)  # atomic write - never leave a half-written file


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def find_deal(deals: list, deal_id: str) -> dict:
    """Find a deal by unique id prefix (like git short shas)."""
    matches = [d for d in deals if d["id"].startswith(deal_id.lower())]
    if not matches:
        sys.exit(f"No sponsor found with id starting '{deal_id}'. Try `list` to see ids.")
    if len(matches) > 1:
        sys.exit(f"'{deal_id}' is ambiguous - it matches: {', '.join(m['id'] for m in matches)}")
    return matches[0]


# --------------------------------------------------------------------------
# formatting
# --------------------------------------------------------------------------
def row(deal: dict) -> list:
    money = f"{deal['currency']} {deal['amount']:,.0f}" if deal.get("amount") else "-"
    dl = deal.get("deadline") or "-"
    if dl != "-":
        try:
            days = (date.fromisoformat(dl) - date.today()).days
            if days < 0:
                dl += " ⚠ overdue"
            elif days <= UPCOMING_DAYS:
                dl += f" ⏰ {days}d"
        except ValueError:
            pass
    return [deal["id"][:6], deal["name"], deal["status"], money, dl]


def print_table(deals: list) -> None:
    if not deals:
        print("No sponsors to show.")
        return
    head = ["ID", "SPONSOR", "STATUS", "AMOUNT", "DEADLINE"]
    rows = [row(d) for d in deals]
    widths = [max(len(head[i]), max(len(r[i]) for r in rows)) for i in range(len(head))]
    line = "  ".join(h.ljust(w) for h, w in zip(head, widths))
    print(line)
    print("-" * len(line))
    for r in rows:
        print("  ".join(c.ljust(w) for c, w in zip(r, widths)))


# --------------------------------------------------------------------------
# commands
# --------------------------------------------------------------------------
def cmd_add(args) -> None:
    deals = load_db(args.db)
    amount = args.amount or 0.0
    deal = {
        "id": uuid.uuid4().hex[:6],
        "name": args.name,
        "contact": args.contact or "",
        "amount": amount,
        "currency": (args.currency or "INR").upper(),
        "status": args.status or "lead",
        "deliverables": [d.strip() for d in (args.deliverables or "").split(",") if d.strip()],
        "deadline": args.deadline or "",
        "notes": args.notes or "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    deals.append(deal)
    save_db(args.db, deals)
    print(f"Added sponsor '{deal['name']}' (id: {deal['id']}, status: {deal['status']}).")


def cmd_list(args) -> None:
    deals = load_db(args.db)
    deals.sort(key=lambda d: (d.get("deadline") or "9999", d["name"].lower()))
    if args.status:
        deals = [d for d in deals if d["status"] == args.status]
    print_table(deals)


def cmd_show(args) -> None:
    deal = find_deal(load_db(args.db), args.deal_id)
    print(f"{deal['name']}  [{deal['id']}]")
    print(f"  status       : {deal['status']}")
    print(f"  value        : {deal['currency']} {deal['amount']:,.0f}")
    print(f"  contact      : {deal.get('contact') or '-'}")
    print(f"  deliverables : {', '.join(deal.get('deliverables', [])) or '-'}")
    print(f"  deadline     : {deal.get('deadline') or '-'}")
    print(f"  notes        : {deal.get('notes') or '-'}")
    print(f"  created      : {deal['created_at']}")
    print(f"  last update  : {deal['updated_at']}")


def cmd_update(args) -> None:
    deals = load_db(args.db)
    deal = find_deal(deals, args.deal_id)
    for key in ("name", "contact", "deadline", "notes", "currency"):
        val = getattr(args, key, None)
        if val is not None:
            deal[key] = val.upper() if key == "currency" else val
    if args.amount is not None:
        deal["amount"] = args.amount
    if args.deliverables is not None:
        deal["deliverables"] = [d.strip() for d in args.deliverables.split(",") if d.strip()]
    deal["updated_at"] = now_iso()
    save_db(args.db, deals)
    print(f"Updated '{deal['name']}' [{deal['id']}].")


def cmd_set_status(args) -> None:
    deals = load_db(args.db)
    deal = find_deal(deals, args.deal_id)
    deal["status"] = args.status
    deal["updated_at"] = now_iso()
    save_db(args.db, deals)
    print(f"'{deal['name']}' is now: {args.status}")


def cmd_remove(args) -> None:
    deals = load_db(args.db)
    deal = find_deal(deals, args.deal_id)
    deals.remove(deal)
    save_db(args.db, deals)
    print(f"Removed '{deal['name']}'.")


def cmd_export(args) -> None:
    deals = load_db(args.db)
    fields = ["id", "name", "contact", "amount", "currency", "status", "deadline",
              "deliverables", "notes", "created_at", "updated_at"]
    with open(args.file, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for d in deals:
            d = dict(d)
            d["deliverables"] = "; ".join(d.get("deliverables", []))
            writer.writerow(d)
    print(f"Exported {len(deals)} sponsors to {args.file}")


def cmd_summary(args) -> None:
    deals = load_db(args.db)
    if not deals:
        print("No sponsors yet. Add one with: python3 sponsor_manager.py add \"Brand\" --amount 10000")
        return

    def total(statuses) -> float:
        return sum(d.get("amount", 0) for d in deals if d["status"] in statuses)

    currency = deals[0].get("currency", "INR")
    print("📊 Sponsor summary")
    print("-" * 42)
    for status in STATUSES:
        deals_in = [d for d in deals if d["status"] == status]
        if deals_in:
            label = status.capitalize().ljust(12)
            print(f"  {label} {len(deals_in):>2} deal(s)   {currency} {sum(d.get('amount',0) for d in deals_in):>12,.0f}")
    print("-" * 42)
    print(f"  💰 Earned (paid)   : {currency} {total(('paid',)):,.0f}")
    print(f"  ⌛ Pending         : {currency} {total(('active','delivered')):,.0f}  (work done / to be paid)")
    print(f"  🤝 In pipeline     : {currency} {total(('lead','negotiating')):,.0f}")

    # upcoming deadlines
    coming = []
    for d in deals:
        if d["status"] in ("paid", "cancelled") or not d.get("deadline"):
            continue
        try:
            days = (date.fromisoformat(d["deadline"]) - date.today()).days
        except ValueError:
            continue
        if days <= UPCOMING_DAYS:
            coming.append((days, d))
    if coming:
        print(f"\n⏰ Deadlines in the next {UPCOMING_DAYS} days:")
        for days, d in sorted(coming):
            when = "OVERDUE!" if days < 0 else f"in {days} day(s)"
            print(f"  - {d['name']} [{d['id']}] - {d['deadline']} ({when})")


# --------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default=DEFAULT_DB, help="path to sponsors.json")
    sub = parser.add_subparsers(dest="command", required=True)

    def deal_fields(p):
        p.add_argument("--contact", help="email / phone / IG handle")
        p.add_argument("--amount", type=float, help="deal value")
        p.add_argument("--currency", help="default INR")
        p.add_argument("--deadline", help="YYYY-MM-DD")
        p.add_argument("--deliverables", help="comma separated, e.g. '1 reel, 2 stories'")
        p.add_argument("--notes")

    p_add = sub.add_parser("add", help="add a new sponsor / deal")
    p_add.add_argument("name", help="sponsor name, e.g. 'Nike India'")
    p_add.add_argument("--status", choices=STATUSES, default="lead")
    deal_fields(p_add)
    p_add.set_defaults(func=cmd_add)

    p_list = sub.add_parser("list", help="list sponsors (sorted by deadline)")
    p_list.add_argument("--status", choices=STATUSES)
    p_list.set_defaults(func=cmd_list)

    p_show = sub.add_parser("show", help="show full details of one deal")
    p_show.add_argument("deal_id")
    p_show.set_defaults(func=cmd_show)

    p_update = sub.add_parser("update", help="edit fields of a deal")
    p_update.add_argument("deal_id")
    p_update.add_argument("--name")
    deal_fields(p_update)
    p_update.set_defaults(func=cmd_update)

    p_stat = sub.add_parser("set-status", help="move a deal through the pipeline")
    p_stat.add_argument("deal_id")
    p_stat.add_argument("status", choices=STATUSES)
    p_stat.set_defaults(func=cmd_set_status)

    p_rm = sub.add_parser("remove", help="delete a deal")
    p_rm.add_argument("deal_id")
    p_rm.set_defaults(func=cmd_remove)

    p_exp = sub.add_parser("export", help="export everything to CSV")
    p_exp.add_argument("file", help="output file, e.g. sponsors.csv")
    p_exp.set_defaults(func=cmd_export)

    p_sum = sub.add_parser("summary", help="revenue totals + upcoming deadlines")
    p_sum.set_defaults(func=cmd_summary)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
