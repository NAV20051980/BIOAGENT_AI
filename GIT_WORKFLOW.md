# Git Workflow — BioAgent AI Team

This is the exact sequence of commands. Whoever is the repo owner (let's assume that's **you**) does Part A once. Everyone else does Part B once. Then everyone repeats Part C every time they work.

---

## Part A — Repo Owner: Create & Push the Repo (do this once)

1. Go to https://github.com/new
   - Repository name: `bioagent-ai` (or whatever you like)
   - Visibility: **Private** (recommended — no reason to make it public before judging, and you can make it public after if you want)
   - Do NOT initialize with a README/gitignore — we already have our own
   - Click **Create repository**

2. Back in your project folder, in VS Code's terminal:
   ```bash
   cd path/to/bioagent
   git init                      # skip if you already ran this
   git add .
   git commit -m "Initial commit: project scaffold, firmware, backend, docs"
   git branch -M main
   git remote add origin https://github.com/<your-username>/bioagent-ai.git
   git push -u origin main
   ```

3. Add your teammates as collaborators:
   - GitHub repo page → **Settings** → **Collaborators** → **Add people**
   - Add each teammate's GitHub username or email
   - They'll get an email invite — they need to accept it before they can push

4. **Protect the main branch (recommended, takes 2 min):**
   - Settings → Branches → Add branch protection rule → branch name `main`
   - Check "Require a pull request before merging"
   - This stops anyone (including you) from accidentally pushing straight to `main` and breaking the demo the night before judging

---

## Part B — Everyone Else: Clone the Repo (do this once)

```bash
git clone https://github.com/<owner-username>/bioagent-ai.git
cd bioagent-ai
```

If you were invited as a collaborator, this just works. If you get a permission error, make sure you accepted the GitHub invite email first.

Open the folder in VS Code: `code .`

---

## Part C — Branching Workflow (everyone, every work session)

**Rule: nobody commits directly to `main`.** Everyone works on their own branch, then opens a Pull Request (PR) to merge into `main`. This is what stops 4 people from overwriting each other's work.

### Branch naming convention
```
<member>/<short-description>
```
Examples:
- `member1/firmware-relay-control`
- `member2a/agent-prompt-tuning`
- `member2b/sqlite-history-endpoint`
- `member3/mock-esp32-tests`
- `member4/dashboard-live-view`

### Every time you start new work:

```bash
git checkout main
git pull origin main              # make sure you have everyone's latest merged work
git checkout -b member2a/agent-prompt-tuning     # create your branch
```

### While working — commit often, in small chunks:

```bash
git add .
git commit -m "Tune agent prompt to weigh watering history more heavily"
```

### When ready to share your work:

```bash
git push -u origin member2a/agent-prompt-tuning
```

Then on GitHub:
1. You'll see a banner "Compare & pull request" — click it
2. Add a short description of what changed
3. Tag a teammate to review if there's time (optional for a hackathon, but good if the change touches shared files like `main.py`)
4. Click **Merge pull request** once it looks good
5. Delete the branch after merging (GitHub will offer a button for this)

### Getting everyone else's latest changes into your branch:

If you've been working a while and want the latest `main` merged into your branch (to avoid a big conflict later):
```bash
git checkout main
git pull origin main
git checkout member2a/agent-prompt-tuning
git merge main
```

---

## Avoiding Merge Conflicts (important given your file split)

Because the backend is already split into `agent.py` (2A) and `main.py` (2B), **you two should almost never touch the same file** — that's the whole point of the split. Stick to it:

- Member 2A edits `agent.py` only
- Member 2B edits `main.py` only
- If 2A needs a new field from 2B's endpoint, or 2B needs 2A to change the return shape — talk first, then whoever owns the file makes the edit

Same logic elsewhere:
- Member 1 only edits `firmware/`
- Member 4 only edits `dashboard/`
- Member 3 mostly adds new test files rather than editing others' files, and coordinates any shared changes verbally first

## Handling a Merge Conflict (if it happens anyway)

```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
```
If Git reports a conflict, it'll mark the conflicting sections in the file like:
```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> main
```
Open the file in VS Code — it shows "Accept Current / Accept Incoming / Accept Both" buttons inline. Pick the right one, save, then:
```bash
git add .
git commit -m "Resolve merge conflict"
git push
```

---

## Quick Reference Cheat Sheet

| Command | What it does |
|---|---|
| `git status` | See what's changed |
| `git checkout -b <branch>` | Create and switch to a new branch |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Save a snapshot |
| `git push -u origin <branch>` | Upload your branch to GitHub (first time) |
| `git push` | Upload subsequent commits |
| `git pull origin main` | Get everyone's latest merged work |
| `git log --oneline -10` | See recent commit history |

---

## Hackathon-Specific Advice

- **Commit early, commit often** — small commits are easier to debug than one giant "final version" commit at hour 23
- **In the last 2–3 hours, freeze `main`** — only merge tested, working code. This is not the time to merge an experimental prompt rewrite.
- **Someone should periodically pull `main` and run the full stack** (Member 3 is a good fit) to catch integration breakage early, not at hour 23
- If GitHub access breaks at the venue (bad Wi-Fi), have someone `git bundle` or zip the repo as a local backup before you lose connectivity
