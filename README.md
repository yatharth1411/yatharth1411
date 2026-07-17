# yatharth1411

## 📲 Instagram Auto-Reply + Sponsor Manager Toolkit

Two tools that together handle the boring parts of running a creator/influencer
Instagram account:

| Tool | What it does |
|------|--------------|
| `ig_auto_reply.py` | Auto-replies to Instagram **comments and DMs** based on your keywords — price enquiries, "link?", sponsorship requests — using the **official Meta Graph API** |
| `sponsor_manager.py` | Tracks **all your sponsors/brand deals** in one place: value, contact, deliverables, deadlines, payment status, revenue summary |

> ⚠️ This intentionally uses only Meta's official API (no password-based bots,
> no scraping) so your account stays safe. You need an Instagram
> **Business/Creator** account — it's a free switch in the app settings.

---

### 1 · Instagram auto-reply

#### Setup (one time, ~15 min)
1. Convert your Instagram to a **Business or Creator** account and link it to a **Facebook Page** you own.
2. Create an app at [developers.facebook.com](https://developers.facebook.com/) → add the **Instagram** product.
3. Generate an access token with these permissions and exchange it for a **long-lived token**:
   `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_manage_metadata`
4. Get your Instagram Business account id (`ig_user_id`) from the Graph API Explorer.
5. Configure the bot:
   ```bash
   cp config.example.json config.json   # then edit config.json
   pip install -r requirements.txt
   ```
6. Edit `config.json` → set your **keywords → replies** under `triggers`.
   (Sponsor/collab keywords are pre-wired so brand enquiries always get your
   business email instantly.)

#### Test offline (no API needed)
```bash
python3 ig_auto_reply.py test
python3 ig_auto_reply.py test "price kitna hai" "mujhe sponsor karna hai"
```

#### Run it

**Option A — polling** (simplest, no public URL):
```bash
python3 ig_auto_reply.py poll --dry-run      # see what it WOULD reply
python3 ig_auto_reply.py poll --interval 300 # reply every 5 minutes
```

**Option B — webhook** (real-time comments **and DMs**):
```bash
python3 ig_auto_reply.py serve --port 5000
ngrok http 5000      # gives you a public https URL
# then in your Meta app dashboard → Webhooks → subscribe to:
#   instagram → comments, messaging
# callback: https://<your-ngrok-url>/webhook  (same verify_token as config.json)
```

The bot keeps a local `.ig_reply_state.json` so it never replies twice to the
same comment, and it never replies to itself (no loops).

---

### 2 · Sponsor / brand-deal manager

```bash
# add a deal
python3 sponsor_manager.py add "Nike India" --contact priya@nike.in \
    --amount 25000 --deliverables "1 reel, 1 story set" --deadline 2026-08-10

# see everything
python3 sponsor_manager.py list                 # sorted by deadline
python3 sponsor_manager.py list --status active

# move it forward as it progresses
python3 sponsor_manager.py set-status f3a9c1 active
python3 sponsor_manager.py set-status f3a9c1 delivered
python3 sponsor_manager.py set-status f3a9c1 paid

# details / edit / delete
python3 sponsor_manager.py show f3a9c1
python3 sponsor_manager.py update f3a9c1 --amount 30000
python3 sponsor_manager.py remove f3a9c1

# money overview + upcoming deadlines
python3 sponsor_manager.py summary

# export for Excel
python3 sponsor_manager.py export sponsors.csv
```

Pipeline: `lead → negotiating → active → delivered → paid` (or `cancelled`).

`summary` shows: 💰 earned (paid), ⌛ pending (active/delivered),
🤝 pipeline (lead/negotiating) and flags deadlines within 14 days.

**Privacy:** `config.json` (tokens) and `sponsors.json` (your deals) are
git-ignored — they stay on your machine, never on GitHub.

---

### Files
```
ig_auto_reply.py      auto-reply bot (poll / webhook serve / offline test)
sponsor_manager.py    sponsor & deal tracker (pure standard library)
config.example.json   bot configuration template (keywords -> replies)
requirements.txt      requests (+ flask for webhook mode)
```
