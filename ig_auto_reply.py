#!/usr/bin/env python3
"""
ig_auto_reply.py - Instagram auto-reply bot using the OFFICIAL Meta Graph API.

No password scraping, no unofficial automation - this uses only the Instagram
Graph API, which requires:
  * an Instagram Business or Creator account,
  * a Facebook Page linked to that account,
  * a Facebook Developer app with the permissions:
      instagram_basic, instagram_manage_comments, instagram_manage_messages,
      pages_show_list, pages_manage_metadata

Run modes:
  poll   - periodically fetch recent comments and reply to them (no public
           URL needed; good starting point).
  serve  - run a webhook server for REAL-TIME comment + DM replies (needs a
           public HTTPS URL, e.g. via ngrok, and webhook config in the app).
  test   - dry-run your keyword triggers locally, no API calls at all.

Setup help is in README.md.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    import requests
except ImportError:  # allow `test` mode without requests installed
    requests = None

DEFAULT_CONFIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
DEFAULT_STATE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".ig_reply_state.json")

GRAPH_BASE = "https://graph.facebook.com"


# --------------------------------------------------------------------------
# Config / state helpers
# --------------------------------------------------------------------------
def load_config(path: str) -> dict:
    if not os.path.exists(path):
        example = os.path.join(os.path.dirname(path) or ".", "config.example.json")
        sys.exit(
            f"Config file not found: {path}\n"
            f"Copy the example and fill in your credentials first:\n"
            f"  cp {example} config.json   # then edit config.json"
        )
    with open(path, "r", encoding="utf-8") as fh:
        cfg = json.load(fh)
    cfg.setdefault("api_version", "v19.0")
    cfg.setdefault("default_comment_reply", "")
    cfg.setdefault("default_dm_reply", "")
    cfg.setdefault("triggers", [])
    return cfg


def load_state(path: str) -> set:
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return set(json.load(fh).get("replied_ids", []))
        except (json.JSONDecodeError, OSError):
            pass
    return set()


def save_state(path: str, state: set) -> None:
    # keep only the most recent 5000 ids so the file doesn't grow forever
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"replied_ids": sorted(state)[-5000:]}, fh)


# --------------------------------------------------------------------------
# Keyword matching
# --------------------------------------------------------------------------
def find_reply(text: str, cfg: dict, channel: str = "comment"):
    """Return the reply text for `text` based on configured triggers.

    channel is "comment" or "dm". A trigger's keywords are matched case
    -insensitively against the text. A trigger can define "dm_reply" which is
    preferred in the DM channel, falling back to "reply".
    Returns None if nothing matches (and no default reply is configured).
    """
    text_l = (text or "").lower()
    for trigger in cfg.get("triggers", []):
        keywords = trigger.get("keywords", [])
        channels = trigger.get("channels", ["comment", "dm"])
        if channel not in channels:
            continue
        if any(kw.lower() in text_l for kw in keywords):
            if channel == "dm":
                return trigger.get("dm_reply") or trigger.get("reply")
            return trigger.get("reply")
    # fall back to the default reply for the channel ("" means stay quiet)
    return cfg.get(f"default_{channel}_reply") or None


# --------------------------------------------------------------------------
# Thin Graph API client
# --------------------------------------------------------------------------
class GraphClient:
    def __init__(self, cfg: dict):
        if requests is None:
            sys.exit("The 'requests' package is required: pip install requests")
        ig = cfg.get("instagram", {})
        self.token = (ig.get("access_token") or "").strip()
        self.ig_user_id = (ig.get("ig_user_id") or "").strip()
        self.version = cfg.get("api_version", "v19.0")
        if not self.token or not self.ig_user_id:
            sys.exit("config.json is missing instagram.access_token or instagram.ig_user_id")
        self.base = f"{GRAPH_BASE}/{self.version}"

    def get(self, path: str, **params) -> dict:
        params["access_token"] = self.token
        resp = requests.get(f"{self.base}/{path.lstrip('/')}", params=params, timeout=30)
        data = resp.json()
        if resp.status_code >= 400:
            raise RuntimeError(f"Graph API error on GET {path}: {data}")
        return data

    def post(self, path: str, **payload) -> dict:
        payload["access_token"] = self.token
        resp = requests.post(f"{self.base}/{path.lstrip('/')}", json=payload, timeout=30)
        data = resp.json()
        if resp.status_code >= 400 or "error" in data:
            raise RuntimeError(f"Graph API error on POST {path}: {data}")
        return data

    # -- Instagram helpers -------------------------------------------------
    def recent_media(self, limit: int = 10) -> list:
        data = self.get(
            f"{self.ig_user_id}/media", fields="id,caption,timestamp,permalink", limit=limit
        )
        return data.get("data", [])

    def comments_on(self, media_id: str) -> list:
        data = self.get(f"{media_id}/comments", fields="id,text,username,timestamp")
        return data.get("data", [])

    def reply_to_comment(self, comment_id: str, message: str) -> dict:
        return self.post(f"{comment_id}/replies", message=message)

    def send_dm(self, recipient_id: str, message: str) -> dict:
        return self.post(
            f"{self.ig_user_id}/messages",
            recipient={"id": recipient_id},
            message={"text": message},
        )


def _stamp() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")


# --------------------------------------------------------------------------
# Mode: poll
# --------------------------------------------------------------------------
def cmd_poll(args, cfg) -> None:
    client = GraphClient(cfg)
    state = load_state(args.state)
    media_limit = cfg.get("poll", {}).get("media_limit", 10)
    own = (cfg.get("instagram", {}).get("self_username") or "").lower()

    def sweep(dry_run: bool) -> int:
        replied = 0
        for media in client.recent_media(limit=media_limit):
            for comment in client.comments_on(media["id"]):
                cid, text, user = comment["id"], comment.get("text", ""), comment.get("username", "")
                if cid in state:
                    continue
                if own and user.lower() == own:
                    continue  # never reply to yourself (infinite loop guard)
                reply = find_reply(text, cfg, channel="comment")
                if not reply:
                    continue
                if dry_run:
                    print(f"[{_stamp()}] DRY RUN  -> @{user}: {reply}")
                else:
                    client.reply_to_comment(cid, reply)
                    print(f"[{_stamp()}] Replied  -> @{user}: {reply}")
                state.add(cid)
                replied += 1
                if not dry_run:
                    time.sleep(2)  # be gentle with rate limits
        save_state(args.state, state)
        return replied

    if args.dry_run:
        sweep(dry_run=True)
        return
    print(f"Polling every {args.interval}s - Ctrl+C to stop.")
    try:
        while True:
            sweep(dry_run=False)
            if args.once:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")


# --------------------------------------------------------------------------
# Mode: serve (webhooks)
# --------------------------------------------------------------------------
def cmd_serve(args, cfg) -> None:
    try:
        from flask import Flask, request
    except ImportError:
        sys.exit("Flask is required for serve mode: pip install flask")

    client = GraphClient(cfg)
    state = load_state(args.state)
    own = (cfg.get("instagram", {}).get("self_username") or "").lower()
    verify_token = (cfg.get("instagram", {}).get("verify_token") or "").strip()
    if not verify_token:
        sys.exit("Set instagram.verify_token in config.json (any secret string you make up).")

    app = Flask(__name__)

    @app.route("/", methods=["GET"])
    def home():
        return "Instagram auto-reply webhook is running."

    @app.route("/webhook", methods=["GET"])
    def verify():  # Meta calls this once when you register the webhook
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge", "")
        if mode == "subscribe" and token == verify_token:
            print(f"[{_stamp()}] Webhook verified.")
            return challenge
        return "Verification token mismatch", 403

    @app.route("/webhook", methods=["POST"])
    def events():
        payload = request.get_json(force=True, silent=True) or {}
        try:
            for entry in payload.get("entry", []):
                # --- comment events -------------------------------------
                for change in entry.get("changes", []):
                    if change.get("field") != "comments":
                        continue
                    value = change.get("value", {})
                    cid = value.get("id")
                    text = value.get("text", "")
                    user = (value.get("from") or {}).get("username", "")
                    if not cid or cid in state:
                        continue
                    if own and user.lower() == own:
                        continue
                    reply = find_reply(text, cfg, channel="comment")
                    if reply:
                        client.reply_to_comment(cid, reply)
                        print(f"[{_stamp()}] Comment reply -> @{user}: {reply}")
                    state.add(cid)

                # --- direct message events ------------------------------
                for msg in entry.get("messaging", []):
                    message = msg.get("message") or {}
                    if msg.get("sender", {}).get("id") == client.ig_user_id:
                        continue  # loop guard
                    if not message.get("text") or message.get("is_echo"):
                        continue
                    sender = msg["sender"]["id"]
                    reply = find_reply(message["text"], cfg, channel="dm")
                    if reply:
                        client.send_dm(sender, reply)
                        print(f"[{_stamp()}] DM reply -> {sender}: {reply}")

            save_state(args.state, state)
        except Exception as exc:  # never crash the webhook; log & 200
            print(f"[{_stamp()}] ERROR handling event: {exc}", file=sys.stderr)
        return "ok"

    print(f"Webhook listening on 0.0.0.0:{args.port}  (path: /webhook)")
    print(f"Verify token: {verify_token}")
    app.run(host="0.0.0.0", port=args.port)


# --------------------------------------------------------------------------
# Mode: test (offline dry-run of the matching rules)
# --------------------------------------------------------------------------
def cmd_test(args, cfg) -> None:
    samples = args.texts or [
        "what is the price of this?",
        "link bhejo na please",
        "Can we do a sponsor collab for my brand?",
        "nice photo!",
    ]
    print("Testing comment triggers:\n" + "-" * 40)
    for sample in samples:
        reply = find_reply(sample, cfg, channel="comment")
        print(f"  IN : {sample}\n  OUT: {reply or '(no reply)'}\n")
    print("Testing DM triggers:\n" + "-" * 40)
    for sample in samples:
        reply = find_reply(sample, cfg, channel="dm")
        print(f"  IN : {sample}\n  OUT: {reply or '(no reply)'}\n")


# --------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-c", "--config", default=DEFAULT_CONFIG, help="path to config.json")
    parser.add_argument("--state", default=DEFAULT_STATE, help="path to the replied-ids state file")
    sub = parser.add_subparsers(dest="command", required=True)

    p_poll = sub.add_parser("poll", help="poll recent comments and reply (no public URL needed)")
    p_poll.add_argument("--interval", type=int, default=300, help="seconds between sweeps (default 300)")
    p_poll.add_argument("--once", action="store_true", help="do one sweep and exit")
    p_poll.add_argument("--dry-run", action="store_true", help="show what would be replied, send nothing")

    p_serve = sub.add_parser("serve", help="run the real-time webhook server (comments + DMs)")
    p_serve.add_argument("--port", type=int, default=5000)

    p_test = sub.add_parser("test", help="offline test of your keyword triggers")
    p_test.add_argument("texts", nargs="*", help="sample texts to test (optional)")

    args = parser.parse_args()
    cfg = load_config(args.config)
    {"poll": cmd_poll, "serve": cmd_serve, "test": cmd_test}[args.command](args, cfg)


if __name__ == "__main__":
    main()
