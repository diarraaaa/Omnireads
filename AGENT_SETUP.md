# OmniReads — Agent Setup Guide

## Project Overview

OmniReads is a social book recommendation app. Users can rate books, add friends, and send book recommendations to each other.

**Phase 1 (this setup):** Build the full app logic — auth, profiles, ratings, friendships, direct recommendations.
**Phase 2 (later):** Plug in an ML model that uses the social ratings data to generate AI-powered recommendations.

The app is designed from the start so that Phase 2 requires **zero restructuring**. The model slot is already wired in as a stub.

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│   Next.js Frontend  │ ──────▶│   Django REST API    │ ──────▶│    Supabase     │
│   (React + SSR)     │        │   (Python backend)   │        │  (DB + Auth)    │
└─────────────────────┘        └──────────────────────┘        └─────────────────┘
                                        │
                                        ▼
                              api/recommender.py
                              (stub now → .pkl later)
```

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React / Next.js |
| Backend | Django + Django REST Framework |
| Auth | Supabase Auth (JWT verified by Django) |
| Database | Supabase (PostgreSQL) |
| Model | Stub now — scikit-learn .pkl file later |

---
---

# PART 1 — DJANGO BACKEND

---

## Step 1 — Create Django Project

```bash
mkdir omni-backend && cd omni-backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

pip install django djangorestframework django-cors-headers \
  psycopg2-binary python-dotenv PyJWT

django-admin startproject core .
python manage.py startapp api
```

---

## Step 2 — Environment Variables

Create `.env` at the root of the Django project:

```env
DEBUG=True
SECRET_KEY=your_django_secret_key

# Supabase
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Database (Supabase PostgreSQL)
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_db_password
DB_HOST=db.your_project_ref.supabase.co
DB_PORT=5432

# Model (not used yet — will be set in Phase 2)
# MODEL_PATH=./models/recommendation.pkl
```

> ℹ️ `SUPABASE_JWT_SECRET` is in Supabase → Settings → API → JWT Secret.

---

## Step 3 — Django Settings

Update `core/settings.py`:

```python
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "api.apps.ApiConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://your-nextjs-domain.com",  # update for production
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
    }
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.SupabaseAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}

ROOT_URLCONF = "core.urls"
STATIC_URL = "/static/"

# Phase 2: uncomment when model is ready
# MODEL_PATH = os.getenv("MODEL_PATH", "./models/recommendation.pkl")
```

---

## Step 4 — App Config

Create `api/apps.py`:

```python
from django.apps import AppConfig


class ApiConfig(AppConfig):
    name = "api"

    def ready(self):
        # Phase 2: uncomment to load the model at server startup
        # from api.recommender import load_model
        # load_model()
        pass
```

---

## Step 5 — Supabase JWT Authentication

Create `api/authentication.py`:

```python
import jwt
import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class SupabaseUser:
    """Minimal user object built from the decoded Supabase JWT."""
    def __init__(self, payload):
        self.id = payload.get("sub")        # Supabase user UUID
        self.email = payload.get("email", "")
        self.is_authenticated = True

    def __str__(self):
        return self.email


class SupabaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None  # Anonymous request — permission classes handle it

        token = auth_header.split(" ")[1]
        secret = os.getenv("SUPABASE_JWT_SECRET")

        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f"Invalid token: {e}")

        return (SupabaseUser(payload), token)
```

---

## Step 6 — Recommender Stub

> ⚠️ This is the most important file to understand.
> It is intentionally empty for now. The entire app is wired to call this file.
> When the ML model is ready (Phase 2), the developer fills in the logic here
> and nothing else in the codebase needs to change.

Create `api/recommender.py`:

```python
"""
OmniReads Recommendation Engine
================================

PHASE 1 (current): Returns an empty list. The app is fully functional
without recommendations — users can still rate books, add friends,
and send direct recommendations to each other.

PHASE 2 (later): The developer will:
  1. Train a model using the ratings data collected in Phase 1
  2. Save it as a .pkl file
  3. Set MODEL_PATH in .env
  4. Uncomment load_model() in api/apps.py
  5. Implement get_recommendations() below

The function signature must not change between phases.
"""

import logging

logger = logging.getLogger(__name__)

_model = None


def load_model():
    """
    Load the .pkl model into memory at server startup.
    Called from api/apps.py → ApiConfig.ready()
    No-op until Phase 2.
    """
    # Phase 2 implementation:
    # import pickle, os
    # global _model
    # path = os.getenv("MODEL_PATH", "./models/recommendation.pkl")
    # with open(path, "rb") as f:
    #     _model = pickle.load(f)
    # logger.info(f"Model loaded from {path}")
    pass


def get_recommendations(user_id: str, user_ratings: list, friend_ratings: list, n: int = 10) -> list:
    """
    Return a list of recommended book UUIDs for a given user.

    Args:
        user_id       — UUID string of the requesting user
        user_ratings  — list of { book_id, score } for this user
        friend_ratings — list of { user_id, book_id, score } for all their friends
        n             — number of recommendations to return

    Returns:
        list of book UUID strings (empty list in Phase 1)

    Phase 2: replace the return statement with actual model logic.
    Example: return _model.predict(user_id, user_ratings, friend_ratings, n)
    """
    if _model is None:
        logger.debug("Model not loaded — returning empty recommendations (Phase 1)")
        return []

    # Phase 2: implement model call here
    return []
```

---

## Step 7 — Database Models

> ⚠️ Do NOT run `python manage.py migrate` for these models.
> The tables already exist in Supabase. `managed = False` tells Django
> to use them without trying to create or alter them.

Create `api/models.py`:

```python
from django.db import models


class Profile(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.TextField(null=True, blank=True)
    avatar_url = models.TextField(null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "profiles"


class Book(models.Model):
    id = models.UUIDField(primary_key=True)
    title = models.TextField()
    author = models.TextField()
    genre = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    cover_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "books"


class Rating(models.Model):
    id = models.UUIDField(primary_key=True)
    user_id = models.UUIDField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    score = models.IntegerField()  # 1 to 5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "ratings"
        unique_together = [("user_id", "book")]


class Friendship(models.Model):
    id = models.UUIDField(primary_key=True)
    initiator_id = models.UUIDField()
    receiver_id = models.UUIDField()
    status = models.TextField(default="pending")  # pending | accepted | rejected
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "friendships"
        unique_together = [("initiator_id", "receiver_id")]


class DirectRecommendation(models.Model):
    """A user manually recommends a book to a friend with an optional message."""
    id = models.UUIDField(primary_key=True)
    from_user_id = models.UUIDField()
    to_user_id = models.UUIDField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "recommendations"
```

---

## Step 8 — Serializers

Create `api/serializers.py`:

```python
from rest_framework import serializers
from .models import Book, Rating, Friendship, DirectRecommendation, Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "name", "avatar_url", "bio", "created_at"]


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = "__all__"


class RatingSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = ["id", "book", "score", "created_at"]
        read_only_fields = ["id", "created_at"]


class FriendshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = "__all__"
        read_only_fields = ["id", "initiator_id", "created_at"]


class DirectRecommendationSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)

    class Meta:
        model = DirectRecommendation
        fields = ["id", "from_user_id", "to_user_id", "book", "message", "created_at"]
        read_only_fields = ["id", "from_user_id", "created_at"]
```

---

## Step 9 — Views

Create `api/views.py`:

```python
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Book, Rating, Friendship, DirectRecommendation, Profile
from .serializers import (
    BookSerializer, RatingSerializer, FriendshipSerializer,
    DirectRecommendationSerializer, ProfileSerializer,
)
from .recommender import get_recommendations


# ─── Profile ──────────────────────────────────────────────────────────────────

class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = Profile.objects.get(id=request.user.id)
            return Response(ProfileSerializer(profile).data)
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=404)

    def patch(self, request):
        try:
            profile = Profile.objects.get(id=request.user.id)
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=404)


class PublicProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        try:
            profile = Profile.objects.get(id=user_id)
            return Response(ProfileSerializer(profile).data)
        except Profile.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ─── Books ────────────────────────────────────────────────────────────────────

class BookListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        genre = request.query_params.get("genre")
        books = Book.objects.filter(genre=genre) if genre else Book.objects.all()
        return Response(BookSerializer(books, many=True).data)


class BookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, book_id):
        try:
            book = Book.objects.get(id=book_id)
            return Response(BookSerializer(book).data)
        except Book.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ─── Ratings ──────────────────────────────────────────────────────────────────

class RatingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Add or update a rating. One rating per user per book (upsert)."""
        book_id = request.data.get("book_id")
        score = request.data.get("score")

        if not book_id or score is None:
            return Response({"error": "book_id and score are required"}, status=400)
        if not (1 <= int(score) <= 5):
            return Response({"error": "score must be between 1 and 5"}, status=400)

        rating, created = Rating.objects.update_or_create(
            user_id=request.user.id,
            book_id=book_id,
            defaults={"id": uuid.uuid4(), "score": score},
        )
        return Response(RatingSerializer(rating).data, status=201 if created else 200)

    def delete(self, request, book_id):
        Rating.objects.filter(user_id=request.user.id, book_id=book_id).delete()
        return Response(status=204)


class UserRatingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        ratings = Rating.objects.filter(user_id=user_id).select_related("book")
        return Response(RatingSerializer(ratings, many=True).data)


# ─── Friendships ──────────────────────────────────────────────────────────────

class FriendListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        friendships = (
            Friendship.objects.filter(status="accepted", initiator_id=user_id) |
            Friendship.objects.filter(status="accepted", receiver_id=user_id)
        )
        return Response(FriendshipSerializer(friendships, many=True).data)


class FriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get("receiver_id")
        if not receiver_id:
            return Response({"error": "receiver_id is required"}, status=400)
        if str(receiver_id) == str(request.user.id):
            return Response({"error": "You cannot add yourself"}, status=400)

        friendship, created = Friendship.objects.get_or_create(
            initiator_id=request.user.id,
            receiver_id=receiver_id,
            defaults={"id": uuid.uuid4(), "status": "pending"},
        )
        return Response(FriendshipSerializer(friendship).data, status=201 if created else 200)


class FriendRequestInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Pending requests received by the current user."""
        pending = Friendship.objects.filter(receiver_id=request.user.id, status="pending")
        return Response(FriendshipSerializer(pending, many=True).data)


class FriendAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friendship_id):
        try:
            friendship = Friendship.objects.get(id=friendship_id, receiver_id=request.user.id)
            friendship.status = "accepted"
            friendship.save()
            return Response(FriendshipSerializer(friendship).data)
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class FriendRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friendship_id):
        try:
            friendship = Friendship.objects.get(id=friendship_id, receiver_id=request.user.id)
            friendship.status = "rejected"
            friendship.save()
            return Response(status=204)
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ─── Direct Recommendations ───────────────────────────────────────────────────

class SendRecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_user_id = request.data.get("to_user_id")
        book_id = request.data.get("book_id")
        message = request.data.get("message", "")

        if not to_user_id or not book_id:
            return Response({"error": "to_user_id and book_id are required"}, status=400)

        rec = DirectRecommendation.objects.create(
            id=uuid.uuid4(),
            from_user_id=request.user.id,
            to_user_id=to_user_id,
            book_id=book_id,
            message=message,
        )
        return Response(DirectRecommendationSerializer(rec).data, status=201)


class RecommendationInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = DirectRecommendation.objects.filter(
            to_user_id=request.user.id
        ).select_related("book").order_by("-created_at")
        return Response(DirectRecommendationSerializer(recs, many=True).data)


class RecommendationSentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = DirectRecommendation.objects.filter(
            from_user_id=request.user.id
        ).select_related("book").order_by("-created_at")
        return Response(DirectRecommendationSerializer(recs, many=True).data)


# ─── AI Recommendations (stub) ────────────────────────────────────────────────

class AIRecommendView(APIView):
    """
    PHASE 1: Returns an empty list.
    PHASE 2: Will return ML-powered recommendations once the model is ready.

    The endpoint exists now so the frontend can already call it.
    When the model is plugged in, the response will automatically
    start returning books — no frontend changes needed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)

        # Fetch the current user's ratings
        user_ratings = list(
            Rating.objects.filter(user_id=user_id).values("book_id", "score")
        )

        # Fetch accepted friends
        friendships = (
            Friendship.objects.filter(status="accepted", initiator_id=user_id) |
            Friendship.objects.filter(status="accepted", receiver_id=user_id)
        )
        friend_ids = [
            str(f.receiver_id) if str(f.initiator_id) == user_id else str(f.initiator_id)
            for f in friendships
        ]

        # Fetch friend ratings — this is the social signal for the future model
        friend_ratings = list(
            Rating.objects.filter(user_id__in=friend_ids).values("user_id", "book_id", "score")
        )

        # Call recommender (returns [] in Phase 1)
        recommended_ids = get_recommendations(
            user_id=user_id,
            user_ratings=user_ratings,
            friend_ratings=friend_ratings,
            n=10,
        )

        books = Book.objects.filter(id__in=recommended_ids)
        return Response({
            "phase": 1,
            "model_ready": False,
            "message": "AI recommendations coming soon. Rate books and add friends to get personalized suggestions.",
            "recommendations": BookSerializer(books, many=True).data,
        })
```

---

## Step 10 — URL Routing

Update `core/urls.py`:

```python
from django.urls import path
from api.views import (
    MyProfileView, PublicProfileView,
    BookListView, BookDetailView,
    RatingView, UserRatingsView,
    FriendListView, FriendRequestView, FriendRequestInboxView,
    FriendAcceptView, FriendRejectView,
    SendRecommendationView, RecommendationInboxView, RecommendationSentView,
    AIRecommendView,
)

urlpatterns = [
    # Profile
    path("api/profile/", MyProfileView.as_view()),
    path("api/profile/<uuid:user_id>/", PublicProfileView.as_view()),

    # Books
    path("api/books/", BookListView.as_view()),
    path("api/books/<uuid:book_id>/", BookDetailView.as_view()),

    # Ratings
    path("api/ratings/", RatingView.as_view()),
    path("api/ratings/<uuid:book_id>/", RatingView.as_view()),  # DELETE
    path("api/ratings/user/<uuid:user_id>/", UserRatingsView.as_view()),

    # Friends
    path("api/friends/", FriendListView.as_view()),
    path("api/friends/request/", FriendRequestView.as_view()),
    path("api/friends/inbox/", FriendRequestInboxView.as_view()),
    path("api/friends/<uuid:friendship_id>/accept/", FriendAcceptView.as_view()),
    path("api/friends/<uuid:friendship_id>/reject/", FriendRejectView.as_view()),

    # Direct recommendations
    path("api/recommendations/", SendRecommendationView.as_view()),
    path("api/recommendations/inbox/", RecommendationInboxView.as_view()),
    path("api/recommendations/sent/", RecommendationSentView.as_view()),

    # AI recommendations (stub — returns [] until Phase 2)
    path("api/recommend/", AIRecommendView.as_view()),
]
```

---

## Step 11 — Supabase Database Schema

Run this in **Supabase → SQL Editor**:

```sql
-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now()
);

-- Books
create table public.books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text not null,
  genre text,
  description text,
  cover_url text,
  created_at timestamp with time zone default now()
);

-- Ratings
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  score integer check (score >= 1 and score <= 5) not null,
  created_at timestamp with time zone default now(),
  unique(user_id, book_id)
);

-- Friendships
create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  initiator_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default now(),
  unique(initiator_id, receiver_id)
);

-- Direct recommendations
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  message text,
  created_at timestamp with time zone default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Then run RLS policies:

```sql
alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.ratings enable row level security;
alter table public.friendships enable row level security;
alter table public.recommendations enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Books are public" on public.books for select using (true);
create policy "Authenticated can add books" on public.books for insert with check (auth.role() = 'authenticated');

create policy "Ratings are public" on public.ratings for select using (true);
create policy "Users manage own ratings" on public.ratings for all using (auth.uid() = user_id);

create policy "Users see own friendships" on public.friendships for select using (
  auth.uid() = initiator_id or auth.uid() = receiver_id
);
create policy "Users send friend requests" on public.friendships for insert with check (auth.uid() = initiator_id);
create policy "Receiver updates status" on public.friendships for update using (auth.uid() = receiver_id);

create policy "Users see own recommendations" on public.recommendations for select using (
  auth.uid() = from_user_id or auth.uid() = to_user_id
);
create policy "Users send recommendations" on public.recommendations for insert with check (auth.uid() = from_user_id);
```

---

## Step 12 — Run and Verify

```bash
python manage.py check
python manage.py runserver

# Test public endpoint
curl http://localhost:8000/api/books/

# Test protected endpoint (replace with real Supabase JWT)
curl -H "Authorization: Bearer <jwt>" http://localhost:8000/api/profile/
curl -H "Authorization: Bearer <jwt>" http://localhost:8000/api/recommend/
# → should return { phase: 1, model_ready: false, recommendations: [] }
```

---
---

# PART 2 — NEXT.JS FRONTEND

---

## Step 13 — Install Supabase

```bash
npm install @supabase/supabase-js @supabase/ssr
```

## Step 14 — Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Step 15 — Supabase Browser Client

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

## Step 16 — API Helper

Create `lib/api.ts`. Every call to Django goes through here and automatically attaches the Supabase JWT:

```typescript
import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail ?? "API error");
  }

  return res.json();
}

export const api = {
  get:    (path: string)               => apiFetch(path),
  post:   (path: string, body: object) => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }),
  patch:  (path: string, body: object) => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }),
  delete: (path: string)               => apiFetch(path, { method: "DELETE" }),
};
```

Usage:
```typescript
// Rate a book
await api.post("/api/ratings/", { book_id: "...", score: 5 });

// Send a recommendation to a friend
await api.post("/api/recommendations/", { to_user_id: "...", book_id: "...", message: "You'll love this!" });

// Get AI recommendations (returns empty in Phase 1, real results in Phase 2)
const data = await api.get("/api/recommend/");
if (!data.model_ready) {
  // show "coming soon" message using data.message
}
```

## Step 17 — Auth Pages

Create `app/auth/signin/page.tsx`:

```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function SignInPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMessage(error ? error.message : "Check your email!");
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <button onClick={handleMagicLink}>Send Magic Link</button>
      <button onClick={handleGoogle}>Sign in with Google</button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

Create `app/auth/callback/route.ts`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
```

---

## Phase 2 Checklist (for when the model is ready)

When the developer is ready to plug in the ML model:

- [ ] Train the model using the `ratings` table data from Supabase
- [ ] Save as `models/recommendation.pkl`
- [ ] Set `MODEL_PATH=./models/recommendation.pkl` in Django `.env`
- [ ] Uncomment `load_model()` in `api/apps.py`
- [ ] Implement `get_recommendations()` in `api/recommender.py`
- [ ] The `/api/recommend/` endpoint will automatically start returning real books
- [ ] Update `model_ready: False` → `True` in the `AIRecommendView` response

**No other files need to change.**
