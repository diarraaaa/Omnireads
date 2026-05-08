from rest_framework import serializers
from .models import (
    Book, Rating, Friendship, DirectRecommendation, Profile, LibraryItem, 
    ReadingGroup, ReadingGroupMembership, ReadingGroupBook, Message,
    GroupMessage, GroupPoll, GroupPollOption, GroupPollVote
)


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["id", "username", "name", "full_name", "avatar_url", "bio", "website", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "sender_id", "receiver_id", "content", "file_url", "file_type", "file_name", "is_read", "created_at"]
        read_only_fields = ["id", "sender_id", "created_at"]


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = "__all__"

class LibraryItemSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    class Meta:
        model = LibraryItem
        fields = "__all__"


class RatingSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = ["id", "book", "score", "created_at"]
        read_only_fields = ["id", "created_at"]


class FriendshipSerializer(serializers.ModelSerializer):
    initiator = ProfileSerializer(read_only=True)
    receiver = ProfileSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ["id", "initiator", "receiver", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class DirectRecommendationSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    from_user_username = serializers.SerializerMethodField()
    to_user_username = serializers.SerializerMethodField()

    class Meta:
        model = DirectRecommendation
        fields = ["id", "from_user_id", "to_user_id", "from_user_username", "to_user_username", "book", "message", "created_at"]
        read_only_fields = ["id", "from_user_id", "created_at"]

    def get_from_user_username(self, obj):
        try:
            return Profile.objects.get(id=obj.from_user_id).username
        except:
            return "Unknown"

    def get_to_user_username(self, obj):
        try:
            return Profile.objects.get(id=obj.to_user_id).username
        except:
            return "Unknown"


class ReadingGroupSerializer(serializers.ModelSerializer):
    creator = ProfileSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.BooleanField(read_only=True)
    current_book = serializers.SerializerMethodField()

    class Meta:
        model = ReadingGroup
        fields = ["id", "name", "description", "creator", "is_public", "avatar_url", "created_at", "member_count", "is_member", "current_book"]

    def get_current_book(self, obj):
        # Get the first book with status 'reading'
        gb = ReadingGroupBook.objects.filter(group=obj, status="reading").select_related("book").first()
        if gb:
            return BookSerializer(gb.book).data
        return None


class ReadingGroupMembershipSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = ReadingGroupMembership
        fields = ["id", "group", "profile", "role", "joined_at"]


class ReadingGroupBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(read_only=True)
    added_by = ProfileSerializer(read_only=True)

    class Meta:
        model = ReadingGroupBook
        fields = ["id", "group", "book", "added_by", "status", "added_at"]


class GroupMessageSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer(read_only=True)

    class Meta:
        model = GroupMessage
        fields = ["id", "group", "sender", "content", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]


class GroupPollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = GroupPollOption
        fields = ["id", "poll", "text", "vote_count"]


class GroupPollSerializer(serializers.ModelSerializer):
    creator = ProfileSerializer(read_only=True)
    options = GroupPollOptionSerializer(many=True, read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    user_vote = serializers.UUIDField(read_only=True) # ID of the option the user voted for

    class Meta:
        model = GroupPoll
        fields = ["id", "group", "creator", "question", "is_active", "created_at", "options", "total_votes", "user_vote"]


class GroupPollVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupPollVote
        fields = ["id", "poll", "option", "user"]
        read_only_fields = ["id", "user"]
