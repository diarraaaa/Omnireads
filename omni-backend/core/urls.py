from django.urls import path
from api.views import (
    MyProfileView, PublicProfileView,
    BookListView, BookDetailView,
    RatingView, UserRatingsView, MyRatingsView,
    FriendListView, FriendRequestView, FriendRequestInboxView,
    FriendAcceptView, FriendRejectView,
    UserSearchView, TrendingBooksView, RandomBookView,
    SendRecommendationView, RecommendationInboxView, RecommendationSentView,
    AIRecommendView, LibraryStatusView, GenreListView, DiscoveryView,
    ReadingGroupListView, ReadingGroupDetailView, ReadingGroupJoinView, ReadingGroupBookView,
    ReadingGroupMemberListView, ReadingGroupMemberDetailView,
    GroupMessageListView, GroupPollListView, GroupPollVoteView,
    MessageListView, ConversationListView, MessageUnreadCountView,
    ReviewListView, ReviewDetailView, ReviewCommentView, ReviewVoteView
)

urlpatterns = [
    # Profile
    path("api/profile/", MyProfileView.as_view()),
    path("api/profile/<uuid:user_id>/", PublicProfileView.as_view()),

    # Messages
    path("api/messages/", MessageListView.as_view()),
    path("api/messages/conversations/", ConversationListView.as_view()),
    path("api/messages/unread_count/", MessageUnreadCountView.as_view()),

    # Group Discourse (Chat & Polls)
    path("api/groups/<uuid:group_id>/messages/", GroupMessageListView.as_view()),
    path("api/groups/<uuid:group_id>/polls/", GroupPollListView.as_view()),
    path("api/groups/<uuid:group_id>/polls/<uuid:poll_id>/vote/", GroupPollVoteView.as_view()),

    # Books
    path("api/books/", BookListView.as_view()),
    path("api/books/<uuid:book_id>/", BookDetailView.as_view()),
    path("api/library/", LibraryStatusView.as_view()),
    path("api/library/<uuid:book_id>/", LibraryStatusView.as_view()), # DELETE
    path("api/genres/", GenreListView.as_view()),

    # Ratings
    path("api/ratings/", RatingView.as_view()),
    path("api/ratings/<uuid:book_id>/", RatingView.as_view()),  # DELETE
    path("api/ratings/user/me/", MyRatingsView.as_view()),
    path("api/ratings/user/<uuid:user_id>/", UserRatingsView.as_view()),

    # Friends
    path("api/friends/", FriendListView.as_view()),
    path("api/friends/request/", FriendRequestView.as_view()),
    path("api/friends/inbox/", FriendRequestInboxView.as_view()),
    path("api/friends/<uuid:friendship_id>/accept/", FriendAcceptView.as_view()),
    path("api/friends/<uuid:friendship_id>/reject/", FriendRejectView.as_view()),
    path("api/users/search/", UserSearchView.as_view()),
    path("api/users/discovery/", DiscoveryView.as_view()),
    path("api/books/trending/", TrendingBooksView.as_view()),
    path("api/books/random/", RandomBookView.as_view()),

    # Direct recommendations
    path("api/recommendations/send/", SendRecommendationView.as_view()),
    path("api/recommendations/inbox/", RecommendationInboxView.as_view()),
    path("api/recommendations/sent/", RecommendationSentView.as_view()),

    # Reading Groups
    path("api/groups/", ReadingGroupListView.as_view()),
    path("api/groups/<uuid:group_id>/", ReadingGroupDetailView.as_view()),
    path("api/groups/<uuid:group_id>/join/", ReadingGroupJoinView.as_view()),
    path("api/groups/<uuid:group_id>/books/", ReadingGroupBookView.as_view()),
    path("api/groups/<uuid:group_id>/members/", ReadingGroupMemberListView.as_view()),
    path("api/groups/<uuid:group_id>/members/<uuid:user_id>/", ReadingGroupMemberDetailView.as_view()),

    # AI recommendations (stub — returns [] until Phase 2)
    path("api/recommend/", AIRecommendView.as_view()),

    # Reviews
    path("api/reviews/", ReviewListView.as_view()),
    path("api/reviews/<uuid:review_id>/", ReviewDetailView.as_view()),
    path("api/reviews/<uuid:review_id>/comments/", ReviewCommentView.as_view()),
    path("api/reviews/<uuid:review_id>/vote/", ReviewVoteView.as_view()),
]
