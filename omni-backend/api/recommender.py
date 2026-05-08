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
    """
    if _model is None:
        logger.debug("Model not loaded — returning empty recommendations (Phase 1)")
        return []

    # Phase 2: implement model call here
    return []
