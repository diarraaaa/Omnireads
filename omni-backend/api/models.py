from django.db import models
import uuid


class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField(null=True, blank=True)
    full_name = models.TextField(null=True, blank=True)
    username = models.TextField(null=True, blank=True, unique=True)
    avatar_url = models.TextField(null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    website = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "profiles"


class Book(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    title = models.TextField()
    author = models.TextField()
    genre = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    cover_url = models.TextField(null=True, blank=True)
    isbn = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "books"


class Rating(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    score = models.IntegerField()  # 1 to 5
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "ratings"
        unique_together = [("user_id", "book")]


class Friendship(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    initiator = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="sent_friendships", db_column="initiator_id")
    receiver = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="received_friendships", db_column="receiver_id")
    status = models.TextField(default="pending")  # pending | accepted | rejected
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "friendships"
        unique_together = [("initiator", "receiver")]


class DirectRecommendation(models.Model):
    """A user manually recommends a book to a friend with an optional message."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    from_user_id = models.UUIDField()
    to_user_id = models.UUIDField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    message = models.TextField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "recommendations"

class LibraryItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user_id = models.UUIDField()
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    status = models.TextField(default="plan_to_read") # reading | completed | plan_to_read
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "library"
        unique_together = [("user_id", "book")]


class ReadingGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.TextField()
    description = models.TextField(null=True, blank=True)
    creator = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="created_groups", db_column="creator_id")
    is_public = models.BooleanField(default=True)
    avatar_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "reading_groups"


class ReadingGroupMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    group = models.ForeignKey(ReadingGroup, on_delete=models.CASCADE, related_name="memberships", db_column="group_id")
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="group_memberships", db_column="profile_id")
    role = models.TextField(default="member")  # creator | admin | member
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "reading_group_memberships"
        unique_together = [("group", "profile")]


class ReadingGroupBook(models.Model):
    """Books currently being read or discussed by a group."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    group = models.ForeignKey(ReadingGroup, on_delete=models.CASCADE, related_name="books", db_column="group_id")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, db_column="book_id")
    added_by = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, db_column="added_by_id")
    status = models.TextField(default="reading")  # reading | discussed | suggested
    added_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "reading_group_books"
        unique_together = [("group", "book")]

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sender_id = models.UUIDField()
    receiver_id = models.UUIDField()
    content = models.TextField()
    file_url = models.TextField(null=True, blank=True)
    file_type = models.TextField(null=True, blank=True)
    file_name = models.TextField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "messages"


class GroupMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    group = models.ForeignKey(ReadingGroup, on_delete=models.CASCADE, related_name="messages", db_column="group_id")
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column="sender_id")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = False
        db_table = "group_messages"


class GroupPoll(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    group = models.ForeignKey(ReadingGroup, on_delete=models.CASCADE, related_name="polls", db_column="group_id")
    creator = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column="creator_id")
    question = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "group_polls"


class GroupPollOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    poll = models.ForeignKey(GroupPoll, on_delete=models.CASCADE, related_name="options", db_column="poll_id")
    text = models.TextField()
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "group_poll_options"


class GroupPollVote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    poll = models.ForeignKey(GroupPoll, on_delete=models.CASCADE, related_name="votes", db_column="poll_id")
    option = models.ForeignKey(GroupPollOption, on_delete=models.CASCADE, related_name="votes", db_column="option_id")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column="user_id")
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "group_poll_votes"
        unique_together = [("poll", "user")]


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="reviews", db_column="user_id")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reviews", db_column="book_id")
    content = models.TextField()
    rating = models.ForeignKey(Rating, on_delete=models.SET_NULL, null=True, blank=True, db_column="rating_id")
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "reviews"


class ReviewComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="comments", db_column="review_id")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column="user_id")
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "review_comments"


class ReviewVote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="votes", db_column="review_id")
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, db_column="user_id")
    vote_type = models.IntegerField()  # 1 for like, -1 for dislike
    created_at = models.DateTimeField(auto_now_add=True)
    objects = models.Manager()

    class Meta:
        managed = True
        db_table = "review_votes"
        unique_together = [("review", "user")]
