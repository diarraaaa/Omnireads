# OmniReads 📚

> **The sanctuary for the modern reader.**

OmniReads is more than just a book tracker; it's a digital home for your literary journey. Whether you're curating a lifetime collection, seeking your next obsession, or engaging in deep discourse with fellow bibliophiles, OmniReads provides the premium experience your reading life deserves.

[![Frontend CI](https://github.com/USER_OR_ORG/Omnireads/actions/workflows/frontend.yml/badge.svg)](https://github.com/USER_OR_ORG/Omnireads/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/USER_OR_ORG/Omnireads/actions/workflows/backend.yml/badge.svg)](https://github.com/USER_OR_ORG/Omnireads/actions/workflows/backend.yml)

---

## ✨ Core Pillars

### 🏺 Digital Library
Curate your personal collection with ease. Track what you're reading, what you've finished, and what's next on your horizon. Every book is a memory preserved.

### 🔍 Literary Discovery
Explore a vast catalog of stories. Filter by genre, search by ISBN, or let our community recommendations guide you to your next favorite read.

### 🤝 Reading Groups
The heart of OmniReads. Create public or private "Sanctuaries" to discuss books in real-time. Features include:
- **Real-time Chat**: Discourse that feels alive.
- **Polls**: Decide on your next group read democratically.
- **Privacy Controls**: Hardened membership rules to ensure your circles remain as private as you wish.
- **Role Management**: Assign Admins to help moderate the conversation.

### 📬 Social Discourse
Recommend books directly to friends, share reviews, and follow the reading journeys of those you admire.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/), [Framer Motion](https://www.framer.com/motion/), [Tailwind CSS](https://tailwindcss.com/) |
| **Backend** | [Django](https://www.djangoproject.com/), [Django REST Framework](https://www.django-rest-framework.org/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (via [Supabase](https://supabase.com/)) |
| **Testing** | [Vitest](https://vitest.dev/) (Frontend), [Pytest](https://docs.pytest.org/) (Backend) |

---

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/USER_OR_ORG/Omnireads.git
cd Omnireads
```

### 2. Launch Backend
```bash
cd omni-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Launch Frontend
```bash
cd omni-frontend
npm install
npm run dev
```

---

## 🗺️ Roadmap
- [x] **Private Reading Groups**: Secure, invite-only circles.
- [x] **Real-time Polling**: In-chat decision making.
- [ ] **WebSockets Integration**: Transitioning from polling to real-time events.
- [ ] **Mobile App**: Dedicated Flutter or React Native client.
- [ ] **AI Recommendations**: Personalizing discovery based on reading patterns.

---

## 🤝 Contributing

We believe in the power of open-source collaboration. Whether you're fixing a bug, suggesting a feature, or improving documentation, your input is valued.

Please read our [**Contributing Guidelines**](CONTRIBUTING.md) to get started.

## 📄 License

OmniReads is open-source software licensed under the [MIT License](LICENSE).
