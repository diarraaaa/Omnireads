import uuid
from django.utils import timezone
from django.db import models
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import (
    Book, Rating, Friendship, DirectRecommendation, Profile, LibraryItem, 
    ReadingGroup, ReadingGroupMembership, ReadingGroupBook, Message,
    GroupMessage, GroupPoll, GroupPollOption, GroupPollVote
)
from .serializers import (
    BookSerializer, RatingSerializer, FriendshipSerializer,
    DirectRecommendationSerializer, ProfileSerializer, LibraryItemSerializer,
    ReadingGroupSerializer, ReadingGroupMembershipSerializer, ReadingGroupBookSerializer,
    MessageSerializer, GroupMessageSerializer, GroupPollSerializer, GroupPollVoteSerializer
)
from .recommender import get_recommendations


# ─── Profile ──────────────────────────────────────────────────────────────────

from rest_framework.views import exception_handler
from django.utils import timezone
import traceback

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Now add the HTTP status code to the response.
    if response is not None:
        response.data['status_code'] = response.status_code
    
    # Log the exception
    with open("drf_exceptions.log", "a") as f:
        f.write(f"\n--- Exception at {timezone.now()} ---\n")
        f.write(f"Context: {context}\n")
        f.write(f"Exception: {str(exc)}\n")
        f.write(traceback.format_exc())
        f.write("-----------------------------------\n")

    return response

class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = Profile.objects.get(id=request.user.id)
            data = ProfileSerializer(profile).data
            
            # Real stats
            data["stats"] = {
                "average_rating": Rating.objects.filter(user_id=request.user.id).aggregate(models.Avg("score"))["score__avg"] or 0.0,
                "books_count": LibraryItem.objects.filter(user_id=request.user.id).count(),
                "friends_count": Friendship.objects.filter(
                    (models.Q(initiator_id=request.user.id) | models.Q(receiver_id=request.user.id)),
                    status="accepted"
                ).count()
            }
            return Response(data)
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
            data = ProfileSerializer(profile).data
            
            # Real stats
            data["friend_count"] = Friendship.objects.filter(
                models.Q(initiator_id=user_id, status="accepted") | 
                models.Q(receiver_id=user_id, status="accepted")
            ).count()
            data["book_count"] = LibraryItem.objects.filter(user_id=user_id).count()
            
            # Friendship status relative to requesting user
            if request.user.is_authenticated and str(request.user.id) != str(user_id):
                friendship = Friendship.objects.filter(
                    models.Q(initiator_id=request.user.id, receiver_id=user_id) |
                    models.Q(initiator_id=user_id, receiver_id=request.user.id)
                ).first()
                
                status = 'none'
                if friendship:
                    if friendship.status == 'accepted':
                        status = 'accepted'
                    elif friendship.status == 'pending':
                        status = 'sent' if friendship.initiator_id == request.user.id else 'received'
                data["friendship_status"] = status
            
            data["is_self"] = request.user.is_authenticated and str(request.user.id) == str(user_id)
            
            return Response(data)
        except Profile.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ─── Books ────────────────────────────────────────────────────────────────────

class BookListView(APIView):
    permission_classes = [AllowAny] # GET is public

    def get(self, request):
        genre = request.query_params.get("genre")
        query = request.query_params.get("q")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))
        
        books = Book.objects.all()
        
        if genre:
            books = books.filter(genre__icontains=genre)
        if query:
            # Use Q objects for trigram-indexed search
            books = books.filter(
                models.Q(title__icontains=query) | 
                models.Q(author__icontains=query) | 
                models.Q(description__icontains=query)
            )
            
        # Deduplicate by title and author (Postgres specific)
        books = books.order_by("title", "author", "id").distinct("title", "author")
        
        # Performance optimization: Cache the count for the full catalog or common searches
        from django.core.cache import cache
        cache_key = f"book_count_{genre}_{query}"
        total_count = cache.get(cache_key)
        
        if total_count is None:
            # This count is expensive on large distinct querysets (600ms+)
            total_count = books.count()
            # Cache for 1 hour if it's the full catalog, otherwise 10 mins
            timeout = 3600 if not (genre or query) else 600
            cache.set(cache_key, total_count, timeout)
        
        start = (page - 1) * page_size
        end = start + page_size
        
        results = books[start:end]
        
        return Response({
            "count": total_count,
            "page": page,
            "page_size": page_size,
            "results": BookSerializer(results, many=True).data
        })


    def post(self, request):
        # We'll allow authenticated users to add books for now
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=401)
            
        serializer = BookSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class GenreListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.core.cache import cache
        genres = cache.get('genre_list')
        if genres:
            return Response(genres)

        # Get unique genres, clean them up, and deduplicate
        raw_genres = Book.objects.exclude(genre__isnull=True).exclude(genre="").values_list("genre", flat=True).distinct()
        
        cleaned_genres = set()
        for g in raw_genres:
            # Remove " user" suffix if present
            clean = g.replace(" user", "").strip()
            if clean:
                cleaned_genres.add(clean)
        
        genres = sorted(list(cleaned_genres))
        cache.set('genre_list', genres, 86400) # Cache for 24 hours
        return Response(genres)


class LibraryStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get a user's library. If user_id is provided, get that user's library, otherwise the current user's."""
        target_user_id = request.query_params.get("user_id") or request.user.id
        items = LibraryItem.objects.filter(user_id=target_user_id).select_related("book")
        return Response(LibraryItemSerializer(items, many=True).data)

    def post(self, request):
        """Add a book to library or update its status."""
        import logging
        logger = logging.getLogger("django")
        logger.info(f"LibraryStatusView.post accessed by user: {request.user}")
        
        book_id = request.data.get("book_id")
        status = request.data.get("status", "plan_to_read")
        
        if not book_id:
            return Response({"error": "book_id is required"}, status=400)
            
        try:
            # Coerce to UUID to ensure lookup works correctly
            import uuid
            b_id = uuid.UUID(str(book_id))
            u_id = uuid.UUID(str(request.user.id))
            
            # Check if book exists first to avoid IntegrityError
            if not Book.objects.filter(id=b_id).exists():
                logger.warning(f"Book {b_id} not found in database. Cannot add to library.")
                return Response({"error": f"Book {b_id} not found in our catalog. Please add it first."}, status=404)

            # Use update_or_create to handle potential race conditions and simplify logic
            item, created = LibraryItem.objects.update_or_create(
                user_id=u_id,
                book_id=b_id,
                defaults={"status": status}
            )
            return Response(LibraryItemSerializer(item).data, status=201 if created else 200)
        except Exception as e:
            logger.error(f"Error in LibraryStatusView.post: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({"error": str(e)}, status=500)

    def delete(self, request, book_id):
        """Remove a book from library."""
        LibraryItem.objects.filter(user_id=request.user.id, book_id=book_id).delete()
        return Response(status=204)


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

        try:
            rating = Rating.objects.get(user_id=request.user.id, book_id=book_id)
            rating.score = score
            rating.save()
            created = False
        except Rating.DoesNotExist:
            rating = Rating.objects.create(
                id=uuid.uuid4(),
                user_id=request.user.id,
                book_id=book_id,
                score=score
            )
            created = True
        return Response(RatingSerializer(rating).data, status=201 if created else 200)

    def delete(self, request, book_id):
        Rating.objects.filter(user_id=request.user.id, book_id=book_id).delete()
        return Response(status=204)


class UserRatingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        ratings = Rating.objects.filter(user_id=user_id).select_related("book")
        return Response(RatingSerializer(ratings, many=True).data)


class MyRatingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ratings = Rating.objects.filter(user_id=request.user.id).select_related("book")
        return Response(RatingSerializer(ratings, many=True).data)


# ─── Friendships ──────────────────────────────────────────────────────────────

class FriendListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        friendships = (
            Friendship.objects.filter(status="accepted", initiator=user_id) |
            Friendship.objects.filter(status="accepted", receiver=user_id)
        )
        return Response(FriendshipSerializer(friendships, many=True).data)

class TrendingBooksView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        # Optimized: Fetch more than enough recent books and deduplicate in memory
        # This is much faster than a global distinct() on title/author
        books = Book.objects.order_by('-created_at')[:50]
        
        seen = set()
        unique_books = []
        for b in books:
            key = (b.title.lower().strip(), b.author.lower().strip())
            if key not in seen:
                seen.add(key)
                unique_books.append(b)
                if len(unique_books) >= 10:
                    break
                    
        return Response(BookSerializer(unique_books, many=True).data)

class RandomBookView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        # Optimized: Use TABLESAMPLE for near-instant random row on large tables
        from django.db import connection
        with connection.cursor() as cursor:
            # We use a fallback if TABLESAMPLE returns nothing (rare but possible on small samples)
            cursor.execute("SELECT id FROM books TABLESAMPLE SYSTEM (1) LIMIT 1")
            row = cursor.fetchone()
            if not row:
                # Fallback for very small tables or empty samples
                cursor.execute("SELECT id FROM books ORDER BY RANDOM() LIMIT 1")
                row = cursor.fetchone()
                
        if not row:
            return Response({"detail": "No books found"}, status=404)
            
        book = Book.objects.get(id=row[0])
        return Response(BookSerializer(book).data)


class FriendRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import uuid
        receiver_id = request.data.get("receiver_id")
        if not receiver_id:
            return Response({"error": "receiver_id is required"}, status=400)
        if str(receiver_id) == str(request.user.id):
            return Response({"error": "You cannot add yourself"}, status=400)

        # Check if friendship exists in either direction
        existing = Friendship.objects.filter(
            models.Q(initiator_id=request.user.id, receiver_id=receiver_id) |
            models.Q(initiator_id=receiver_id, receiver_id=request.user.id)
        ).first()

        if existing:
            if existing.status == 'accepted':
                return Response({"error": "You are already colleagues"}, status=400)
            return Response(FriendshipSerializer(existing).data, status=200)

        friendship = Friendship.objects.create(
            id=uuid.uuid4(),
            initiator_id=request.user.id,
            receiver_id=receiver_id,
            status="pending"
        )
        return Response(FriendshipSerializer(friendship).data, status=201)


class FriendRequestInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Pending requests received by the current user."""
        pending = Friendship.objects.filter(receiver=request.user.id, status="pending")
        return Response(FriendshipSerializer(pending, many=True).data)


class FriendAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friendship_id):
        try:
            friendship = Friendship.objects.get(id=friendship_id, receiver=request.user.id)
            friendship.status = "accepted"
            friendship.save()
            return Response(FriendshipSerializer(friendship).data)
        except Friendship.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class FriendRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, friendship_id):
        try:
            friendship = Friendship.objects.get(id=friendship_id, receiver=request.user.id)
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

        # Create a special message in the chat
        try:
            book = Book.objects.get(id=book_id)
            Message.objects.create(
                id=uuid.uuid4(),
                sender_id=request.user.id,
                receiver_id=to_user_id,
                content=f"[BOOK_RECOMMENDATION]:{book_id}:{book.title}:{message}"
            )
        except Exception as e:
            print(f"Failed to create recommendation message: {e}")

        return Response(DirectRecommendationSerializer(rec).data, status=201)


class RecommendationInboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = DirectRecommendation.objects.filter(
            to_user_id=request.user.id
        ).select_related("book").order_by("-created_at")
        
        # Mark as read when seen
        DirectRecommendation.objects.filter(to_user_id=request.user.id, is_read=False).update(is_read=True)
        
        return Response(DirectRecommendationSerializer(recs, many=True).data)


class RecommendationSentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recs = DirectRecommendation.objects.filter(
            from_user_id=request.user.id
        ).select_related("book").order_by("-created_at")
        return Response(DirectRecommendationSerializer(recs, many=True).data)


class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "")
        if not query:
            return Response([])
        
        user_id = request.user.id
        profiles = Profile.objects.filter(
            models.Q(username__icontains=query) | 
            models.Q(name__icontains=query) |
            models.Q(full_name__icontains=query)
        ).exclude(id=user_id)[:10]
        
        # Get all relevant friendships at once
        friendship_info = {}
        relevant_friendships = Friendship.objects.filter(
            models.Q(initiator=user_id, receiver__id__in=profiles.values_list("id", flat=True)) |
            models.Q(receiver=user_id, initiator__id__in=profiles.values_list("id", flat=True))
        )
        
        for f in relevant_friendships:
            other_id = f.receiver_id if f.initiator_id == user_id else f.initiator_id
            status = 'none'
            if f.status == 'accepted':
                status = 'accepted'
            elif f.status == 'pending':
                status = 'sent' if f.initiator_id == user_id else 'received'
            
            friendship_info[str(other_id)] = {
                'status': status,
                'id': str(f.id)
            }
        
        data = ProfileSerializer(profiles, many=True).data
        for item in data:
            info = friendship_info.get(item['id'], {'status': 'none', 'id': None})
            item['friendship_status'] = info['status']
            item['friendship_id'] = info['id']
            
        return Response(data)

class DiscoveryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        
        # Exclude friends and current user
        friendships = Friendship.objects.filter(
            models.Q(initiator=user_id) | models.Q(receiver=user_id)
        )
        friend_ids = set()
        for f in friendships:
            friend_ids.add(f.initiator_id)
            friend_ids.add(f.receiver_id)
        friend_ids.add(user_id)
        
        suggested = Profile.objects.exclude(id__in=friend_ids).order_by('?')[:5]
        return Response(ProfileSerializer(suggested, many=True).data)


# ─── AI Recommendations (stub) ────────────────────────────────────────────────

class AIRecommendView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)

        # Fetch the current user's ratings
        user_ratings = list(
            Rating.objects.filter(user_id=user_id).values("book_id", "score")
        )

        # Fetch accepted friends
        friendships = (
            Friendship.objects.filter(status="accepted", initiator=user_id) |
            Friendship.objects.filter(status="accepted", receiver=user_id)
        )
        friend_ids = [
            str(f.receiver.id) if str(f.initiator.id) == user_id else str(f.initiator.id)
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


# ─── Reading Groups ───────────────────────────────────────────────────────────

class ReadingGroupListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all public groups or groups the user belongs to."""
        scope = request.query_params.get("scope", "all") # all | mine
        
        groups = ReadingGroup.objects.all()
        
        if scope == "mine":
            group_ids = ReadingGroupMembership.objects.filter(profile_id=request.user.id).values_list("group_id", flat=True)
            groups = groups.filter(id__in=group_ids)
        else:
            # Public groups or groups I'm in
            group_ids = ReadingGroupMembership.objects.filter(profile_id=request.user.id).values_list("group_id", flat=True)
            groups = groups.filter(models.Q(is_public=True) | models.Q(id__in=group_ids))

        # Annotate with member count
        groups = groups.annotate(
            member_count=models.Count("memberships")
        )
        
        # In-memory check for membership status (could be optimized with Subquery if needed)
        my_group_ids = set(ReadingGroupMembership.objects.filter(profile_id=request.user.id).values_list("group_id", flat=True))
        
        data = ReadingGroupSerializer(groups, many=True).data
        for item in data:
            item['is_member'] = uuid.UUID(item['id']) in my_group_ids
            
        return Response(data)

    def post(self, request):
        """Create a new reading group."""
        # Use serializer for validation (handles string-to-bool conversion etc)
        data = request.data.copy()
        if "id" not in data:
            data["id"] = str(uuid.uuid4())
            
        serializer = ReadingGroupSerializer(data=data)
        if serializer.is_valid():
            group = serializer.save(creator_id=request.user.id)
            
            # Automatically add the creator as the 'creator' member
            ReadingGroupMembership.objects.create(
                id=uuid.uuid4(),
                group=group,
                profile_id=request.user.id,
                role="creator"
            )
            
            return Response(ReadingGroupSerializer(group).data, status=201)
        return Response(serializer.errors, status=400)


class ReadingGroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        try:
            group = ReadingGroup.objects.get(id=group_id)
            
            # Check privacy
            is_member = ReadingGroupMembership.objects.filter(group=group, profile_id=request.user.id).exists()
            if not group.is_public and not is_member:
                return Response({"error": "This is a private sanctum."}, status=403)
            
            # Fetch members and books
            members = ReadingGroupMembership.objects.filter(group=group).select_related("profile")
            books = ReadingGroupBook.objects.filter(group=group).select_related("book", "added_by")
            
            data = ReadingGroupSerializer(group).data
            data["member_count"] = members.count()
            data["is_member"] = is_member
            
            # Identify the user's role if they are a member
            my_membership = members.filter(profile_id=request.user.id).first()
            data["role"] = my_membership.role if my_membership else None
            
            data["members"] = ReadingGroupMembershipSerializer(members, many=True).data
            data["books"] = ReadingGroupBookSerializer(books, many=True).data
            
            return Response(data)
        except ReadingGroup.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

    def delete(self, request, group_id):
        """Delete the group (Creator only)."""
        try:
            group = ReadingGroup.objects.get(id=group_id)
            # Only the creator can delete the group
            if str(group.creator_id) != str(request.user.id):
                return Response({"error": "Only the creator can dissolve the group."}, status=403)
            
            group.delete()
            return Response({"message": "Group dissolved successfully."}, status=204)
        except ReadingGroup.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)


class ReadingGroupJoinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        """Join a group."""
        try:
            group = ReadingGroup.objects.get(id=group_id)
            if not group.is_public:
                return Response({"error": "Private groups require an invitation."}, status=403)
            
            membership, created = ReadingGroupMembership.objects.get_or_create(
                group=group,
                profile_id=request.user.id,
                defaults={"id": uuid.uuid4(), "role": "member"}
            )
            
            if not created:
                return Response({"message": "Already a member"}, status=200)
                
            return Response(ReadingGroupMembershipSerializer(membership).data, status=201)
        except ReadingGroup.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

    def delete(self, request, group_id):
        """Leave a group."""
        membership = ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).first()
        if not membership:
            return Response({"error": "Not a member"}, status=400)
            
        if membership.role == "creator":
            # Check if they are the only member
            member_count = ReadingGroupMembership.objects.filter(group_id=group_id).count()
            if member_count == 1:
                # Last member and creator -> Delete the group
                ReadingGroup.objects.filter(id=group_id).delete()
                return Response({"message": "Group deleted as you were the last member."}, status=204)
            else:
                return Response({"error": "You are the creator. Transfer ownership to another admin before leaving, or delete the group."}, status=400)
        
        membership.delete()
        return Response({"message": "Successfully left the group"}, status=204)


class ReadingGroupMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        """List all members of a group."""
        try:
            group = ReadingGroup.objects.get(id=group_id)
            # Check privacy: if private, must be a member to see the member list
            is_member = ReadingGroupMembership.objects.filter(group=group, profile_id=request.user.id).exists()
            if not group.is_public and not is_member:
                return Response({"error": "Only members of this private group can see the participant list."}, status=403)
                
            memberships = ReadingGroupMembership.objects.filter(group=group).select_related("profile")
            return Response(ReadingGroupMembershipSerializer(memberships, many=True).data)
        except ReadingGroup.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)

    def post(self, request, group_id):
        """Add a friend to the group directly."""
        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return Response({"error": "user_id is required"}, status=400)

        try:
            group = ReadingGroup.objects.get(id=group_id)
            # Check if requester is a member
            requester_membership = ReadingGroupMembership.objects.filter(group=group, profile_id=request.user.id).first()
            if not requester_membership:
                return Response({"error": "Only members can add friends to the group."}, status=403)

            # Check if target is already a member
            if ReadingGroupMembership.objects.filter(group=group, profile_id=target_user_id).exists():
                return Response({"error": "User is already a member of this group."}, status=400)

            # Create membership
            membership = ReadingGroupMembership.objects.create(
                id=uuid.uuid4(),
                group=group,
                profile_id=target_user_id,
                role="member"
            )
            return Response(ReadingGroupMembershipSerializer(membership).data, status=201)
        except ReadingGroup.DoesNotExist:
            return Response({"error": "Group not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class ReadingGroupMemberDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, group_id, user_id):
        """Remove a member from the group (Admin only)."""
        try:
            group = ReadingGroup.objects.get(id=group_id)
            requester = ReadingGroupMembership.objects.get(group=group, profile_id=request.user.id)
            
            if requester.role not in ["admin", "creator"]:
                return Response({"error": "Only admins can remove members."}, status=403)

            target = ReadingGroupMembership.objects.get(group=group, profile_id=user_id)
            
            if target.role == "creator":
                return Response({"error": "The creator cannot be removed."}, status=403)
            
            if requester.role == "admin" and target.role == "admin":
                # Maybe allow admins to remove each other? WhatsApp allows this.
                # But let's check if they are the same person (they can leave via JoinView)
                pass

            target.delete()
            return Response(status=204)
        except (ReadingGroup.DoesNotExist, ReadingGroupMembership.DoesNotExist):
            return Response({"error": "Not found"}, status=404)

    def patch(self, request, group_id, user_id):
        """Update member role (Admin only)."""
        try:
            group = ReadingGroup.objects.get(id=group_id)
            requester = ReadingGroupMembership.objects.get(group=group, profile_id=request.user.id)
            
            if requester.role not in ["admin", "creator"]:
                return Response({"error": "Only admins can manage roles."}, status=403)

            target = ReadingGroupMembership.objects.get(group=group, profile_id=user_id)
            new_role = request.data.get("role")
            
            if new_role not in ["admin", "member"]:
                return Response({"error": "Invalid role. Use 'admin' or 'member'."}, status=400)
            
            if target.role == "creator" and new_role != "creator":
                return Response({"error": "The creator's role cannot be changed directly. They must transfer ownership."}, status=403)

            if new_role == "creator":
                if requester.role != "creator":
                    return Response({"error": "Only the current creator can transfer ownership."}, status=403)
                
                # Transfer ownership
                target.role = "creator"
                target.save()
                
                # Demote self to admin
                requester.role = "admin"
                requester.save()
                
                # Update group creator_id as well
                group.creator_id = target.profile_id
                group.save()
                
                return Response(ReadingGroupMembershipSerializer(target).data)

            target.role = new_role
            target.save()
            
            return Response(ReadingGroupMembershipSerializer(target).data)
        except (ReadingGroup.DoesNotExist, ReadingGroupMembership.DoesNotExist):
            return Response({"error": "Not found"}, status=404)


class ReadingGroupBookView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        """Add a book to the group's collection."""
        book_id = request.data.get("book_id")
        status = request.data.get("status", "reading")
        
        if not book_id:
            return Response({"error": "book_id is required"}, status=400)
            
        # Must be a member
        if not ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).exists():
            return Response({"error": "Only members can contribute to the repository."}, status=403)
            
        item, created = ReadingGroupBook.objects.get_or_create(
            group_id=group_id,
            book_id=book_id,
            defaults={
                "id": uuid.uuid4(),
                "added_by_id": request.user.id,
                "status": status
            }
        )
        
        if not created:
            item.status = status
            item.save()
            
        return Response(ReadingGroupBookSerializer(item).data, status=201 if created else 200)

# ─── Messages ────────────────────────────────────────────────────────────────

class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        other_user_id = request.query_params.get("user_id")
        if not other_user_id:
            # Simplified fallback for old code, but we should use ConversationListView
            messages = Message.objects.filter(
                models.Q(sender_id=request.user.id) | models.Q(receiver_id=request.user.id)
            ).order_by("-created_at")[:100] # Limit to 100 for safety
            return Response(MessageSerializer(messages, many=True).data)
        
        # Get conversation with specific user
        messages = Message.objects.filter(
            (models.Q(sender_id=request.user.id) & models.Q(receiver_id=other_user_id)) |
            (models.Q(sender_id=other_user_id) & models.Q(receiver_id=request.user.id))
        ).order_by("created_at")
        
        # Mark received messages as read
        Message.objects.filter(sender_id=other_user_id, receiver_id=request.user.id, is_read=False).update(is_read=True)
        
        return Response(MessageSerializer(messages, many=True).data)

    def post(self, request):
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender_id=request.user.id)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class MessageUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import logging
        logger = logging.getLogger("django")
        try:
            import uuid
            user_id = uuid.UUID(str(request.user.id))
            
            # 1. Direct Messages
            from .models import Message, GroupMessage, DirectRecommendation, ReadingGroupMembership
            
            messages_unread = Message.objects.filter(
                receiver_id=user_id,
                is_read=False
            ).count()
            
            # 2. Recommendations
            recs_unread = DirectRecommendation.objects.filter(
                to_user_id=user_id, 
                is_read=False
            ).count()
            
            # 3. Group Messages (messages since last_read_at in groups I'm in)
            memberships = ReadingGroupMembership.objects.filter(profile_id=user_id)
            groups_unread = 0
            for m in memberships:
                # Handle null last_read_at (assume all are unread if never read)
                if m.last_read_at:
                    count = GroupMessage.objects.filter(
                        group_id=m.group_id,
                        created_at__gt=m.last_read_at
                    ).exclude(sender_id=user_id).count()
                else:
                    count = GroupMessage.objects.filter(
                        group_id=m.group_id
                    ).exclude(sender_id=user_id).count()
                groups_unread += count
            
            total = messages_unread + recs_unread + groups_unread
            
            logger.info(f"Unread counts for {user_id}: total={total}, msgs={messages_unread}, recs={recs_unread}, groups={groups_unread}")
            
            return Response({
                "unread_count": total,
                "total": total,
                "messages": messages_unread,
                "recommendations": recs_unread,
                "groups": groups_unread
            })
        except Exception as e:
            # Re-raise so the global handler logs it to drf_exceptions.log
            raise e

class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.id
        
        # Get all unique users we've chatted with
        # This is a bit complex in standard Django without raw SQL, but we can do it:
        sent_to = Message.objects.filter(sender_id=user_id).values_list('receiver_id', flat=True)
        received_from = Message.objects.filter(receiver_id=user_id).values_list('sender_id', flat=True)
        
        other_user_ids = set(list(sent_to) + list(received_from))
        
        conversations = []
        # Pre-fetch profiles to avoid N+1
        profiles = {str(p.id): p for p in Profile.objects.filter(id__in=other_user_ids)}
        
        for oid in other_user_ids:
            oid_str = str(oid)
            if oid_str not in profiles: continue
            
            last_message = Message.objects.filter(
                (models.Q(sender_id=user_id) & models.Q(receiver_id=oid)) |
                (models.Q(sender_id=oid) & models.Q(receiver_id=user_id))
            ).order_by("-created_at").first()
            
            unread_count = Message.objects.filter(
                sender_id=oid,
                receiver_id=user_id,
                is_read=False
            ).count()
            
            conversations.append({
                "other_user": ProfileSerializer(profiles[oid_str]).data,
                "last_message": MessageSerializer(last_message).data if last_message else None,
                "unread_count": unread_count
            })
            
        # Sort by last message time
        conversations.sort(key=lambda x: x['last_message']['created_at'] if x['last_message'] else '', reverse=True)
        
        return Response(conversations)


# ─── Group Chat & Polls ────────────────────────────────────────────────────────

class GroupMessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        # Must be a member to see messages
        try:
            membership = ReadingGroupMembership.objects.get(group_id=group_id, profile_id=request.user.id)
            messages = GroupMessage.objects.filter(group_id=group_id).select_related("sender").order_by("created_at")
            
            # Update last_read_at
            membership.last_read_at = timezone.now()
            membership.save()
            
            return Response(GroupMessageSerializer(messages, many=True).data)
        except ReadingGroupMembership.DoesNotExist:
            return Response({"error": "Only members can view the group chat."}, status=403)
        except Exception as e:
            with open("group_messages_error.log", "a") as f:
                f.write(f"\n--- ERROR at {timezone.now()} ---\n")
                f.write(f"Group: {group_id}, User: {request.user.id}\n")
                f.write(f"Error: {str(e)}\n")
                import traceback
                f.write(traceback.format_exc())
            return Response({"error": str(e)}, status=500)

    def post(self, request, group_id):
        # Must be a member to send messages
        if not ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).exists():
            return Response({"error": "Only members can participate in the discourse."}, status=403)
            
        content = request.data.get("content")
        if not content:
            return Response({"error": "Message content is required"}, status=400)
            
        message = GroupMessage.objects.create(
            id=uuid.uuid4(),
            group_id=group_id,
            sender_id=request.user.id,
            content=content
        )
        return Response(GroupMessageSerializer(message).data, status=201)


class GroupPollListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        # Must be a member
        if not ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).exists():
            return Response({"error": "Only members can see group polls."}, status=403)
            
        polls = GroupPoll.objects.filter(group_id=group_id).prefetch_related("options").select_related("creator").order_by("-created_at")
        
        data = GroupPollSerializer(polls, many=True).data
        for i, poll_obj in enumerate(polls):
            # Annotate with counts
            total_votes = GroupPollVote.objects.filter(poll=poll_obj).count()
            data[i]["total_votes"] = total_votes
            
            # Annotate options with counts
            for j, option in enumerate(data[i]["options"]):
                opt_id = option["id"]
                data[i]["options"][j]["vote_count"] = GroupPollVote.objects.filter(option_id=opt_id).count()
            
            # Check if current user voted
            my_vote = GroupPollVote.objects.filter(poll=poll_obj, user_id=request.user.id).first()
            data[i]["user_vote"] = my_vote.option_id if my_vote else None
            
        return Response(data)

    def post(self, request, group_id):
        # Must be a member
        if not ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).exists():
            return Response({"error": "Only members can create polls."}, status=403)
            
        question = request.data.get("question")
        options_text = request.data.get("options", [])
        
        if not question or not options_text:
            return Response({"error": "Question and options are required"}, status=400)
            
        poll = GroupPoll.objects.create(
            id=uuid.uuid4(),
            group_id=group_id,
            creator_id=request.user.id,
            question=question
        )
        
        for text in options_text:
            GroupPollOption.objects.create(
                id=uuid.uuid4(),
                poll=poll,
                text=text
            )
            
        return Response(GroupPollSerializer(poll).data, status=201)


class GroupPollVoteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id, poll_id):
        # Must be a member
        if not ReadingGroupMembership.objects.filter(group_id=group_id, profile_id=request.user.id).exists():
            return Response({"error": "Only members can vote."}, status=403)
            
        option_id = request.data.get("option_id")
        if not option_id:
            return Response({"error": "option_id is required"}, status=400)
            
        # Upsert vote
        vote, created = GroupPollVote.objects.get_or_create(
            poll_id=poll_id,
            user_id=request.user.id,
            defaults={"id": uuid.uuid4(), "option_id": option_id}
        )
        
        if not created:
            vote.option_id = option_id
            vote.save()
            
        return Response(GroupPollVoteSerializer(vote).data, status=201 if created else 200)
