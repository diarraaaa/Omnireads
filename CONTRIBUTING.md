# Contributing to OmniReads 📚

Thank you for your interest in contributing to OmniReads! We're building a premium sanctuary for readers, and we value your help in making it even better.

---

## 🏛️ Guiding Principles
- **Visual Excellence**: We prioritize premium aesthetics. If you're contributing UI, ensure it feels polished, responsive, and adheres to our "Dark & Gold" aesthetic.
- **Privacy First**: We handle user data and social circles with extreme care. Always verify access controls when touching group or messaging logic.
- **Stable Foundation**: No PR is merged without passing tests.

---

## 🛠️ Development Workflow

### 1. Find an Issue
Check our [Issues](https://github.com/USER_OR_ORG/Omnireads/issues) for "good first issue" or "help wanted" labels.

### 2. Branching Strategy
We use a feature-branch workflow.
- `main`: Production-ready code.
- `dev`: Integration branch.
- `feat/feature-name` or `fix/issue-name`: Your working branch.

```bash
git checkout -b feat/your-exciting-feature
```

### 3. Standards & Validation
Before submitting your PR, ensure the following pass:

#### **Backend (Django)**
- **Linting**: We follow PEP8. Run `flake8` to verify.
- **Testing**: Run `pytest` to ensure all endpoints and models are stable.

#### **Frontend (Next.js)**
- **Linting**: Run `npm run lint`.
- **Testing**: Run `npm run test` (Vitest).
- **Aesthetics**: Verify your changes in both Light and Dark modes.

---

## 📬 Pull Request Process
1. Update the `README.md` or documentation if you've added new features.
2. Link your PR to the relevant issue.
3. Provide screenshots or a video for UI changes.
4. Once your PR is approved and the CI/CD pipeline (GitHub Actions) turns green, an admin will merge it.

---

## 🎨 UI/UX Guidelines
If you are modifying the frontend, please keep these tokens in mind:
- **Primary Color**: `#D4AF37` (Accent Gold)
- **Backgrounds**: Deep, rich dark tones or clean, crisp whites.
- **Typography**: Serif for headings (classic feel), Sans-serif for body (readability).
- **Interactions**: Use Framer Motion for subtle, organic transitions.

---

## 🆘 Need Help?
- Open an Issue with the `question` label.
- Join our community discussions.

Happy reading (and coding)! 📖
